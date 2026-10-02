import { createClient } from "jsr:@supabase/supabase-js@2";
import { json, reconcileSubscriber } from "../_shared/billing.ts";

// On-demand reconcile: "what does RevenueCat say about ME right now?"
//
// Called by the app right after a purchase completes (so the user doesn't sit
// in a free-tier UI for the seconds a webhook takes) and whenever the device
// and the server disagree. It pulls the subscriber from RevenueCat's REST API
// and rewrites the caller's own `subscriptions` row from that truth, which
// also self-heals a webhook that never arrived.
//
// Auth: verify_jwt is ON. The caller's JWT identifies them; they can only
// ever reconcile their own row — the user id comes from the token, never
// from the request body.
//
// Requires the secret REVENUECAT_SECRET_API_KEY (Project → API keys →
// "Secret API key"). Without it this returns 503 and the app falls back to
// waiting for the webhook.

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  const secretKey = Deno.env.get("REVENUECAT_SECRET_API_KEY");
  if (!secretKey) return json(503, { error: "not_configured" });

  const authHeader = req.headers.get("Authorization") ?? "";
  const anonClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user }, error: userErr } = await anonClient.auth.getUser();
  if (userErr || !user) return json(401, { error: "unauthorized" });

  const service = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const row = await reconcileSubscriber(service, user.id, secretKey);
    return json(200, {
      ok: true,
      subscription: row
        ? {
          status: row.status,
          current_period_end: row.current_period_end,
          product_id: row.product_id,
          will_renew: row.will_renew,
        }
        : null,
    });
  } catch (e) {
    console.error("reconcile failed", e);
    return json(502, { error: e instanceof Error ? e.message : "reconcile_failed" });
  }
});
