import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { json } from "../_shared/billing.ts";

// Permanently deletes the caller's account (App Store guideline 5.1.1(v)).
//
// Auth: verify_jwt is ON. The user id comes from the caller's JWT, never from
// the request body, so nobody can delete anyone else.
//
// Order matters, and every step before the last can be retried:
//   1. Storage: the user's files in `avatars` and `pr-videos` (all under
//      `<userId>/`). Storage rows aren't tied to auth.users, so they would
//      otherwise be orphaned.
//   2. RevenueCat: delete the customer record (best effort). This does NOT
//      cancel an App Store / Play subscription; only the user can, which is
//      why the app warns Pro users before calling this.
//   3. auth.users: deleting the user cascades through every table (profiles →
//      PRs, friendships, messages, check-ins, nutrition, challenges,
//      subscriptions…). billing_events and paywall_events keep their rows with
//      user_id set to NULL. Verified against the live schema before shipping.
//
// If anything fails before step 3, the account still exists and the user can
// retry from the app.

const BUCKETS = ["avatars", "pr-videos"];
const PAGE = 1000;

async function removeUserFolder(service: SupabaseClient, bucket: string, userId: string) {
  for (;;) {
    const { data, error } = await service.storage.from(bucket).list(userId, { limit: PAGE });
    if (error) throw new Error(`list ${bucket}: ${error.message}`);
    if (!data || data.length === 0) return;
    const { error: rmErr } = await service.storage
      .from(bucket)
      .remove(data.map((f) => `${userId}/${f.name}`));
    if (rmErr) throw new Error(`remove ${bucket}: ${rmErr.message}`);
    if (data.length < PAGE) return;
  }
}

async function deleteRevenueCatCustomer(userId: string) {
  const secretKey = Deno.env.get("REVENUECAT_SECRET_API_KEY");
  if (!secretKey) return;
  try {
    const res = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${secretKey}` } },
    );
    // 404 = never purchased anything; nothing to delete.
    if (!res.ok && res.status !== 404) {
      console.error("revenuecat delete failed", res.status, await res.text());
    }
  } catch (e) {
    console.error("revenuecat delete failed", e);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

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
    for (const bucket of BUCKETS) await removeUserFolder(service, bucket, user.id);
  } catch (e) {
    console.error("storage cleanup failed", user.id, e);
    return json(500, { error: "storage_cleanup_failed" });
  }

  await deleteRevenueCatCustomer(user.id);

  const { error: delErr } = await service.auth.admin.deleteUser(user.id);
  if (delErr) {
    console.error("deleteUser failed", user.id, delErr);
    return json(500, { error: "delete_failed" });
  }

  return json(200, { ok: true });
});
