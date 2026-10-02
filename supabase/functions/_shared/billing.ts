// Shared by `revenuecat-webhook` and `billing-reconcile`. Both end up writing
// the same provider-agnostic row in `public.subscriptions`; this is the one
// place RevenueCat's vocabulary is translated into ours on the server side.
//
// Mirrors the client-side translation in lib/billing/revenuecat.ts. The two
// must agree on what each status means — see the CHECK constraint in
// migration 044 for the authoritative list.

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

export const PROVIDER = "revenuecat";
/** Must match the entitlement identifier in the RevenueCat dashboard. */
export const ENTITLEMENT_ID = "pro";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "grace"
  | "billing_issue"
  | "cancelled"
  | "expired";

export type PurchaseStore = "app_store" | "play_store" | "promo" | "manual";

export interface SubscriptionRow {
  user_id: string;
  provider: string;
  provider_customer_id: string | null;
  entitlement: string;
  product_id: string | null;
  store: PurchaseStore | null;
  status: SubscriptionStatus;
  current_period_end: string | null;
  will_renew: boolean;
  is_sandbox: boolean;
  last_event_at: string | null;
}

export function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

// Timing-safe compare, same as send-notification: a plain `!==` returns on the
// first differing byte and leaks prefix length through response timing.
export function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const aBytes = enc.encode(a);
  const bBytes = enc.encode(b);
  const len = Math.max(aBytes.length, bBytes.length, 32);
  let diff = aBytes.length ^ bBytes.length;
  for (let i = 0; i < len; i++) diff |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0);
  return diff === 0;
}

/** RevenueCat's store names (webhook UPPER_CASE, REST lower_case) → ours. */
export function mapStore(store: string | null | undefined): PurchaseStore | null {
  switch ((store ?? "").toUpperCase()) {
    case "APP_STORE":
    case "MAC_APP_STORE":
      return "app_store";
    case "PLAY_STORE":
      return "play_store";
    case "PROMOTIONAL":
      return "promo";
    default:
      return null;
  }
}

export function msToIso(ms: number | null | undefined): string | null {
  return typeof ms === "number" && Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

/**
 * Writes a row, respecting two invariants:
 *   - A `manual` row (comped / grandfathered access) is ours, not the
 *     provider's. Provider-driven writes never touch it.
 *   - Nothing here decides `profiles.is_pro` — the database trigger does.
 */
export async function upsertSubscription(
  supabase: SupabaseClient,
  row: SubscriptionRow,
): Promise<{ applied: boolean; reason?: string }> {
  const { data: existing, error: readErr } = await supabase
    .from("subscriptions")
    .select("provider, last_event_at")
    .eq("user_id", row.user_id)
    .maybeSingle();
  if (readErr) throw new Error(`read subscriptions: ${readErr.message}`);

  if (existing?.provider === "manual") {
    return { applied: false, reason: "manual_grant_present" };
  }

  // Out-of-order guard (migration 046). Reconcile passes `now()`, so it always
  // wins over a late-arriving webhook — which is the point of reconciling.
  if (
    existing?.last_event_at && row.last_event_at &&
    new Date(row.last_event_at).getTime() < new Date(existing.last_event_at).getTime()
  ) {
    return { applied: false, reason: "stale_event" };
  }

  const { error } = await supabase
    .from("subscriptions")
    .upsert(row, { onConflict: "user_id" });
  if (error) throw new Error(`upsert subscriptions: ${error.message}`);
  return { applied: true };
}

// ── Reconcile against RevenueCat's REST API ──────────────────────────────────
// Shape of GET /v1/subscribers/{app_user_id}. Only the fields we read.
interface RcSubscriber {
  subscriber: {
    original_app_user_id?: string;
    entitlements?: Record<string, {
      expires_date: string | null;
      grace_period_expires_date?: string | null;
      product_identifier: string;
      purchase_date: string;
    }>;
    subscriptions?: Record<string, {
      expires_date: string | null;
      purchase_date: string;
      store: string;
      period_type: "normal" | "trial" | "intro" | "prepaid";
      unsubscribe_detected_at: string | null;
      billing_issues_detected_at: string | null;
      refunded_at: string | null;
      is_sandbox: boolean;
    }>;
  };
}

/**
 * Pulls the subscriber from RevenueCat and rewrites our row from that truth.
 * Used after a purchase (to close the webhook gap), on TRANSFER events, and
 * whenever the client and server disagree. Self-heals a dropped webhook.
 */
export async function reconcileSubscriber(
  supabase: SupabaseClient,
  userId: string,
  secretApiKey: string,
): Promise<SubscriptionRow | null> {
  const res = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`,
    {
      headers: {
        Authorization: `Bearer ${secretApiKey}`,
        "Content-Type": "application/json",
      },
    },
  );
  if (!res.ok) {
    throw new Error(`RevenueCat GET subscriber ${res.status}: ${await res.text()}`);
  }
  const { subscriber } = (await res.json()) as RcSubscriber;

  const ent = subscriber.entitlements?.[ENTITLEMENT_ID];
  const nowIso = new Date().toISOString();

  if (!ent) {
    // No entitlement at all. Only expire a row this provider owns.
    const { data: existing } = await supabase
      .from("subscriptions")
      .select("provider")
      .eq("user_id", userId)
      .maybeSingle();
    if (existing?.provider === PROVIDER) {
      await supabase
        .from("subscriptions")
        .update({ status: "expired", will_renew: false, last_event_at: nowIso })
        .eq("user_id", userId);
    }
    return null;
  }

  const sub = subscriber.subscriptions?.[ent.product_identifier];
  const expires = ent.expires_date;
  const expired = !!expires && new Date(expires).getTime() <= Date.now();

  let status: SubscriptionStatus;
  let periodEnd = expires;
  if (sub?.refunded_at || expired) status = "expired";
  else if (sub?.billing_issues_detected_at) {
    status = "billing_issue";
    periodEnd = ent.grace_period_expires_date ?? expires;
  } else if (sub?.period_type === "trial") status = "trialing";
  else if (sub?.unsubscribe_detected_at) status = "cancelled";
  else status = "active";

  const row: SubscriptionRow = {
    user_id: userId,
    provider: PROVIDER,
    provider_customer_id: subscriber.original_app_user_id ?? userId,
    entitlement: ENTITLEMENT_ID,
    product_id: ent.product_identifier,
    store: mapStore(sub?.store),
    status,
    current_period_end: periodEnd,
    will_renew: status === "active" || status === "trialing" || status === "billing_issue",
    is_sandbox: sub?.is_sandbox ?? false,
    last_event_at: nowIso,
  };
  await upsertSubscription(supabase, row);
  return row;
}
