import { createClient } from "jsr:@supabase/supabase-js@2";

// Webhook target for the `tr_notifications_push` trigger (see migration
// 028_push_notification_webhook.sql). Composes push title/body server-side
// using the RECIPIENT's stored language — this is what makes push copy
// locale-correct regardless of which language the actor's device was in
// when the notification-causing action happened.
//
// Auth: verify_jwt is disabled for this function (it's called from a
// Postgres trigger via pg_net, not from the app), so it checks a shared
// secret header instead. See AGENTS.md "Internationalization Rules" for the
// one-time manual setup this requires.

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const APP_NAME = "GymRival";

type NotificationType =
  | "new_message"
  | "friend_request"
  | "friend_request_accepted"
  | "pr_liked"
  | "friend_pr";

type SupportedLocale = "en" | "nl" | "es" | "de" | "pt" | "ar";

interface WebhookPayload {
  user_id: string;
  type: NotificationType;
  actor_id: string | null;
  data: {
    exercise_key?: string;
    value?: number;
    unit?: string;
    [key: string]: unknown;
  };
}

// Mirrors locales/*/notifications.json — keep these in sync by hand when
// that file changes (Deno edge functions can't import the RN app's JSON
// resources directly, since they're separate deployment units).
const TEMPLATES: Record<SupportedLocale, Record<NotificationType, string>> = {
  en: {
    new_message: "{{name}} sent you a message",
    friend_request: "{{name}} sent you a friend request",
    friend_request_accepted: "{{name}} accepted your friend request",
    pr_liked: "{{name}} liked your {{exercise}}{{value}} PR",
    friend_pr: "{{name}} just hit a new {{exercise}}{{value}} PR",
  },
  nl: {
    new_message: "{{name}} heeft je een bericht gestuurd",
    friend_request: "{{name}} heeft je een vriendschapsverzoek gestuurd",
    friend_request_accepted: "{{name}} heeft je vriendschapsverzoek geaccepteerd",
    pr_liked: "{{name}} vond je {{exercise}}{{value}} PR leuk",
    friend_pr: "{{name}} heeft zojuist een nieuwe {{exercise}}{{value}} PR neergezet",
  },
  es: {
    new_message: "{{name}} te envió un mensaje",
    friend_request: "{{name}} te envió una solicitud de amistad",
    friend_request_accepted: "{{name}} aceptó tu solicitud de amistad",
    pr_liked: "A {{name}} le gustó tu PR de {{exercise}}{{value}}",
    friend_pr: "{{name}} acaba de lograr un nuevo PR de {{exercise}}{{value}}",
  },
  de: {
    new_message: "{{name}} hat dir eine Nachricht geschickt",
    friend_request: "{{name}} hat dir eine Freundschaftsanfrage geschickt",
    friend_request_accepted: "{{name}} hat deine Freundschaftsanfrage angenommen",
    pr_liked: "{{name}} gefällt dein {{exercise}}{{value}} PR",
    friend_pr: "{{name}} hat gerade einen neuen {{exercise}}{{value}} PR aufgestellt",
  },
  pt: {
    new_message: "{{name}} enviou-te uma mensagem",
    friend_request: "{{name}} enviou-te um pedido de amizade",
    friend_request_accepted: "{{name}} aceitou o teu pedido de amizade",
    pr_liked: "{{name}} gostou do teu PR de {{exercise}}{{value}}",
    friend_pr: "{{name}} acabou de alcançar um novo PR de {{exercise}}{{value}}",
  },
  ar: {
    new_message: "أرسل لك {{name}} رسالة",
    friend_request: "أرسل لك {{name}} طلب صداقة",
    friend_request_accepted: "قبل {{name}} طلب صداقتك",
    pr_liked: "أعجب {{name}} بـ {{exercise}}{{value}} الخاص بك",
    friend_pr: "حقق {{name}} للتو رقماً قياسياً جديداً في {{exercise}}{{value}}",
  },
};

const SOMEONE: Record<SupportedLocale, string> = {
  en: "Someone",
  nl: "Iemand",
  es: "Alguien",
  de: "Jemand",
  pt: "Alguém",
  ar: "شخص ما",
};

// Mirrors locales/*/exercises.json — keep in sync by hand.
const EXERCISE_NAMES: Record<SupportedLocale, Record<string, string>> = {
  en: { bench: "Bench Press", squat: "Squat", deadlift: "Deadlift", pullups: "Pull-ups", overhead: "Overhead Press", bulgarian: "Bulgarian Split Squat", rdl: "Romanian Deadlift", incline: "Incline Bench", dips: "Dips", row: "Barbell Row", curl: "Bicep Curl", legpress: "Leg Press", lunge: "Lunges", facepull: "Face Pull", hipthrust: "Hip Thrust", plank: "Plank", muscle_up: "Muscle Up" },
  nl: { bench: "Bankdrukken", squat: "Squat", deadlift: "Deadlift", pullups: "Optrekken", overhead: "Overhead Press", bulgarian: "Bulgaarse Split Squat", rdl: "Roemeense Deadlift", incline: "Schuine Bankdrukken", dips: "Dips", row: "Barbell Roeien", curl: "Biceps Curl", legpress: "Beenpers", lunge: "Uitvalspassen", facepull: "Face Pull", hipthrust: "Heupheffen", plank: "Plank", muscle_up: "Muscle Up" },
  es: { bench: "Press de Banca", squat: "Sentadilla", deadlift: "Peso Muerto", pullups: "Dominadas", overhead: "Press Militar", bulgarian: "Sentadilla Búlgara", rdl: "Peso Muerto Rumano", incline: "Press Inclinado", dips: "Fondos", row: "Remo con Barra", curl: "Curl de Bíceps", legpress: "Prensa de Piernas", lunge: "Zancadas", facepull: "Jalón de Cara", hipthrust: "Empuje de Cadera", plank: "Plancha", muscle_up: "Muscle Up" },
  de: { bench: "Bankdrücken", squat: "Kniebeuge", deadlift: "Kreuzheben", pullups: "Klimmzüge", overhead: "Schulterdrücken", bulgarian: "Bulgarische Split-Kniebeuge", rdl: "Rumänisches Kreuzheben", incline: "Schrägbankdrücken", dips: "Dips", row: "Langhantelrudern", curl: "Bizepscurl", legpress: "Beinpresse", lunge: "Ausfallschritte", facepull: "Face Pull", hipthrust: "Hüftstoßen", plank: "Unterarmstütz", muscle_up: "Muscle Up" },
  pt: { bench: "Supino", squat: "Agachamento", deadlift: "Levantamento Terra", pullups: "Barra Fixa", overhead: "Desenvolvimento Militar", bulgarian: "Agachamento Búlgaro", rdl: "Levantamento Terra Romeno", incline: "Supino Inclinado", dips: "Mergulho (Dips)", row: "Remada com Barra", curl: "Rosca Bíceps", legpress: "Leg Press", lunge: "Afundo", facepull: "Face Pull", hipthrust: "Elevação Pélvica", plank: "Prancha", muscle_up: "Muscle Up" },
  ar: { bench: "بنش برس", squat: "سكوات", deadlift: "الرفعة الميتة", pullups: "العقلة", overhead: "الضغط العلوي", bulgarian: "سكوات بلغاري", rdl: "الرفعة الميتة الرومانية", incline: "بنش مائل", dips: "متوازي", row: "التجديف بالبار", curl: "تمرين البايسبس", legpress: "ضغط الأرجل", lunge: "الاندفاع", facepull: "فيس بول", hipthrust: "دفع الورك", plank: "بلانك", muscle_up: "ماسل أب" },
};

function isSupportedLocale(l: string | null | undefined): l is SupportedLocale {
  return !!l && l in TEMPLATES;
}

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}

function composeBody(
  locale: SupportedLocale,
  type: NotificationType,
  actorName: string,
  data: WebhookPayload["data"],
): string {
  let exercise = "";
  let value = "";
  if (type === "pr_liked" || type === "friend_pr") {
    exercise = data.exercise_key
      ? EXERCISE_NAMES[locale][data.exercise_key] ?? data.exercise_key
      : "";
    if (data.value != null) {
      const suffix = `${data.value}${data.unit ?? ""}`;
      value = type === "pr_liked" ? ` (${suffix})` : ` ${suffix}`;
    }
  }
  return interpolate(TEMPLATES[locale][type], { name: actorName, exercise, value });
}

Deno.serve(async (req: Request) => {
  try {
    const expectedSecret = Deno.env.get("PUSH_WEBHOOK_SECRET");
    const providedSecret = req.headers.get("x-webhook-secret");
    if (!expectedSecret || providedSecret !== expectedSecret) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const payload = (await req.json()) as WebhookPayload;
    const { user_id, type, actor_id, data } = payload;

    if (!user_id || !type) {
      return new Response(
        JSON.stringify({ error: "user_id and type are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: recipient, error: recipientErr } = await supabase
      .from("profiles")
      .select("expo_push_token, language")
      .eq("id", user_id)
      .single();

    if (recipientErr || !recipient?.expo_push_token) {
      return new Response(JSON.stringify({ sent: false, reason: "no_token" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const token: string = recipient.expo_push_token;
    const isValidToken =
      /^ExponentPushToken\[.+\]$/.test(token) ||
      /^[a-zA-Z0-9_\-]{20,}$/.test(token);

    if (!isValidToken) {
      return new Response(
        JSON.stringify({ sent: false, reason: "invalid_token" }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    // profiles.language is NULL until a user explicitly picks one in
    // Settings (NULL means "follow device locale," which only the client
    // knows) — fall back to English here, same as the client's fallbackLng.
    const locale: SupportedLocale = isSupportedLocale(recipient.language)
      ? recipient.language
      : "en";

    let actorName = SOMEONE[locale];
    if (actor_id) {
      const { data: actor } = await supabase
        .from("profiles")
        .select("full_name, username")
        .eq("id", actor_id)
        .single();
      actorName = actor?.full_name ?? actor?.username ?? SOMEONE[locale];
    }

    const body = composeBody(locale, type, actorName, data ?? {});

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
        title: APP_NAME,
        body,
        data: { type, ...data },
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
