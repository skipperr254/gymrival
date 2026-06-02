import { createClient } from "jsr:@supabase/supabase-js@2";

interface NotificationRequest {
  user_id: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

Deno.serve(async (req: Request) => {
  try {
    const payload = (await req.json()) as NotificationRequest;
    const { user_id, title, body, data } = payload;

    if (!user_id || !title || !body) {
      return new Response(
        JSON.stringify({ error: "user_id, title, and body are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("expo_push_token")
      .eq("id", user_id)
      .single();

    if (error || !profile?.expo_push_token) {
      return new Response(
        JSON.stringify({ sent: false, reason: "no_token" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const token: string = profile.expo_push_token;

    const isValidToken =
      /^ExponentPushToken\[.+\]$/.test(token) ||
      /^[a-zA-Z0-9_\-]{20,}$/.test(token);

    if (!isValidToken) {
      return new Response(
        JSON.stringify({ sent: false, reason: "invalid_token" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const pushResponse = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: token,
        sound: "default",
        title,
        body,
        data: data ?? {},
      }),
    });

    const result = await pushResponse.json();

    return new Response(JSON.stringify({ sent: true, result }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
