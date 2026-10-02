import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  ENTITLEMENT_ID,
  PROVIDER,
  isUuid,
  json,
  mapStore,
  msToIso,
  reconcileSubscriber,
  timingSafeEqual,
  upsertSubscription,
  type SubscriptionRow,
  type SubscriptionStatus,
} from "../_shared/billing.ts";

// RevenueCat → public.subscriptions.
//
// This is the only writer of entitlement truth for paying users. It runs with
// the service role, so it must be paranoid about who is calling: verify_jwt is
// off (RevenueCat can't mint our JWTs) and the Authorization header is checked
// against REVENUECAT_WEBHOOK_SECRET before the body is even parsed.
//
// One-time setup (secrets are never committed):
//   1. Generate a value:            openssl rand -hex 32
//   2. supabase secrets set REVENUECAT_WEBHOOK_SECRET=<value>
//   3. RevenueCat dashboard → Project → Integrations → Webhooks → add:
//        URL:                  https://<project-ref>.supabase.co/functions/v1/revenuecat-webhook
//        Authorization header: Bearer <value>
//      (Send only the "pro" entitlement's events if the option is offered.)
//   Optionally also set REVENUECAT_SECRET_API_KEY so TRANSFER / REFUND_REVERSED
//   can reconcile against the REST API instead of being logged and skipped.
//
// Idempotency: every event is inserted into `billing_events` first. The PK on
// event_id turns a retried delivery into a unique violation, which we treat as
// "already handled" and answer 200 — RevenueCat retries on anything else.

interface RcEvent {
  id: string;
  type: string;
  event_timestamp_ms: number;
  app_user_id: string;
  original_app_user_id?: string;
  aliases?: string[];
  product_id?: string;
  new_product_id?: string;
  entitlement_ids?: string[] | null;
  period_type?: "TRIAL" | "INTRO" | "NORMAL" | "PREPAID";
  purchased_at_ms?: number;
  expiration_at_ms?: number | null;
  grace_period_expiration_at_ms?: number | null;
  environment?: "SANDBOX" | "PRODUCTION";
  store?: string;
  cancel_reason?: string;
  transferred_from?: string[];
  transferred_to?: string[];
}

interface RcWebhookBody {
  api_version: string;
  event: RcEvent;
}

/** Event types that carry no entitlement change for us. Ledgered, then acked. */
const IGNORED_TYPES = new Set([
  "TEST",
  "SUBSCRIBER_ALIAS",
  "INVOICE_ISSUANCE",
  "VIRTUAL_CURRENCY_TRANSACTION",
]);

/**
 * The event → status table. The ones that are easy to get wrong:
 *   CANCELLATION  keeps access (auto-renew off, paid through period end) —
 *                 unless it's a refund (CUSTOMER_SUPPORT), which revokes.
 *   BILLING_ISSUE keeps access through the grace period; a large share of
 *                 Play cancellations are involuntary and recover.
 *   EXPIRATION    is the only ordinary event that revokes.
 */
function statusFor(ev: RcEvent): { status: SubscriptionStatus; willRenew: boolean; periodEnd: string | null } | null {
  const periodEnd = msToIso(ev.expiration_at_ms);
  switch (ev.type) {
    case "INITIAL_PURCHASE":
    case "RENEWAL":
    case "UNCANCELLATION":
    case "PRODUCT_CHANGE":
    case "SUBSCRIPTION_EXTENDED":
    case "TEMPORARY_ENTITLEMENT_GRANT":
      return { status: ev.period_type === "TRIAL" ? "trialing" : "active", willRenew: true, periodEnd };
    case "NON_RENEWING_PURCHASE":
      return { status: "active", willRenew: false, periodEnd };
    case "CANCELLATION":
      if (ev.cancel_reason === "CUSTOMER_SUPPORT") {
        return { status: "expired", willRenew: false, periodEnd };
      }
      return { status: "cancelled", willRenew: false, periodEnd };
    case "SUBSCRIPTION_PAUSED":
      return { status: "cancelled", willRenew: false, periodEnd };
    case "BILLING_ISSUE":
      return {
        status: "billing_issue",
        willRenew: true,
        periodEnd: msToIso(ev.grace_period_expiration_at_ms) ?? periodEnd,
      };
    case "EXPIRATION":
      return { status: "expired", willRenew: false, periodEnd };
    default:
      return null;
  }
}

/**
 * We call Purchases.logIn(<supabase uuid>) on sign-in, so `app_user_id` is
 * normally our uuid outright. The alias scan covers a purchase made while the
 * SDK was still anonymous and merged later.
 */
function resolveUserId(ev: RcEvent): string | null {
  if (isUuid(ev.app_user_id)) return ev.app_user_id;
  if (isUuid(ev.original_app_user_id)) return ev.original_app_user_id;
  return ev.aliases?.find(isUuid) ?? null;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  const expected = Deno.env.get("REVENUECAT_WEBHOOK_SECRET");
  const provided = req.headers.get("authorization") ?? "";
  // Accept the bare value or "Bearer <value>" so the dashboard field can be
  // filled either way.
  const token = provided.startsWith("Bearer ") ? provided.slice(7) : provided;
  if (!expected || !token || !timingSafeEqual(token, expected)) {
    return json(401, { error: "unauthorized" });
  }

  let body: RcWebhookBody;
  try {
    body = (await req.json()) as RcWebhookBody;
  } catch {
    return json(400, { error: "invalid_json" });
  }
  const ev = body?.event;
  if (!ev?.id || !ev?.type) return json(400, { error: "missing_event" });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let userId = resolveUserId(ev);

  // ── Ledger first. A duplicate delivery stops here with a 200. ────────────
  let { error: ledgerErr } = await supabase.from("billing_events").insert({
    event_id: ev.id,
    provider: PROVIDER,
    type: ev.type,
    user_id: userId,
    payload: body,
  });
  // 23503 = user_id isn't in auth.users (RevenueCat's dashboard test event, or
  // a deleted account). Not retryable, so ledger it unmapped and ack it rather
  // than 500-ing RevenueCat into repeated retries.
  if (ledgerErr?.code === "23503") {
    userId = null;
    ({ error: ledgerErr } = await supabase.from("billing_events").insert({
      event_id: ev.id,
      provider: PROVIDER,
      type: ev.type,
      user_id: null,
      payload: body,
    }));
  }
  if (ledgerErr) {
    if (ledgerErr.code === "23505") return json(200, { ok: true, duplicate: true });
    console.error("billing_events insert failed", ledgerErr);
    return json(500, { error: "ledger_failed" });
  }

  try {
    if (IGNORED_TYPES.has(ev.type)) return json(200, { ok: true, ignored: ev.type });

    // Events for products that don't grant `pro` are none of our business.
    if (Array.isArray(ev.entitlement_ids) && !ev.entitlement_ids.includes(ENTITLEMENT_ID)) {
      return json(200, { ok: true, ignored: "other_entitlement" });
    }

    const secretKey = Deno.env.get("REVENUECAT_SECRET_API_KEY") ?? null;

    // ── TRANSFER: access moves between accounts (device restore, re-login) ──
    if (ev.type === "TRANSFER") {
      const eventAt = msToIso(ev.event_timestamp_ms);
      for (const from of ev.transferred_from ?? []) {
        if (!isUuid(from)) continue;
        await supabase
          .from("subscriptions")
          .update({ status: "expired", will_renew: false, last_event_at: eventAt })
          .eq("user_id", from)
          .eq("provider", PROVIDER);
      }
      const targets = (ev.transferred_to ?? []).filter(isUuid);
      if (secretKey) {
        for (const to of targets) await reconcileSubscriber(supabase, to, secretKey);
        return json(200, { ok: true, transferred_to: targets });
      }
      console.warn("TRANSFER received without REVENUECAT_SECRET_API_KEY; recipients not reconciled", targets);
      return json(200, { ok: true, transferred_to: targets, reconciled: false });
    }

    if (!userId) {
      console.warn(`event ${ev.id} (${ev.type}) has no resolvable Supabase user`, ev.app_user_id);
      return json(200, { ok: true, ignored: "unmapped_user" });
    }

    // ── REFUND_REVERSED: the store un-refunded; only the REST API knows the state ──
    if (ev.type === "REFUND_REVERSED") {
      if (!secretKey) return json(200, { ok: true, ignored: "refund_reversed_no_api_key" });
      await reconcileSubscriber(supabase, userId, secretKey);
      return json(200, { ok: true, reconciled: true });
    }

    const mapped = statusFor(ev);
    if (!mapped) {
      console.warn(`unhandled RevenueCat event type ${ev.type}`);
      return json(200, { ok: true, ignored: "unhandled_type" });
    }

    const row: SubscriptionRow = {
      user_id: userId,
      provider: PROVIDER,
      provider_customer_id: ev.original_app_user_id ?? ev.app_user_id,
      entitlement: ENTITLEMENT_ID,
      product_id: ev.product_id ?? null,
      store: mapStore(ev.store),
      status: mapped.status,
      current_period_end: mapped.periodEnd,
      will_renew: mapped.willRenew,
      is_sandbox: ev.environment === "SANDBOX",
      last_event_at: msToIso(ev.event_timestamp_ms),
    };

    const result = await upsertSubscription(supabase, row);
    return json(200, { ok: true, ...result });
  } catch (e) {
    // A 5xx makes RevenueCat retry — and the ledger row already exists, so the
    // retry would be treated as a duplicate and never re-applied. Remove the
    // ledger entry so the retry gets a real second attempt.
    console.error(`event ${ev.id} failed`, e);
    await supabase.from("billing_events").delete().eq("event_id", ev.id);
    return json(500, { error: e instanceof Error ? e.message : "apply_failed" });
  }
});
