import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function sendEmail(input: {
  to: string[];
  subject: string;
  text: string;
  html: string;
  idempotencyKey: string;
}) {
  const host = Deno.env.get("SMTP_HOST") || "smtp.hostinger.com";
  const port = Number(Deno.env.get("SMTP_PORT") || 465);
  const user = Deno.env.get("SMTP_USER");
  const password = Deno.env.get("SMTP_PASSWORD");
  const from = Deno.env.get("EMAIL_FROM") || "Inventa <inventa@bayecode.com>";

  if (!user || !password) return { sent: false, reason: "smtp_not_configured" };

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass: password,
      },
    });

    await transporter.sendMail({
      from,
      to: input.to,
      replyTo: user,
      subject: input.subject,
      text: input.text,
      html: input.html,
      envelope: {
        from: user,
        to: input.to,
      },
      headers: {
        "X-Inventa-Message-ID": input.idempotencyKey,
      },
    });

    return { sent: true };
  } catch (error) {
    console.error("SMTP send failed:", error);
    return {
      sent: false,
      reason: error instanceof Error ? error.message : "smtp_send_failed",
    };
  }
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Méthode non autorisée." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Service indisponible." }, 503);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Données invalides." }, 400);
  }

  const action = String(payload.action ?? "");

  if (action === "notify") {
    const email = String(payload.email ?? "").trim().toLowerCase();
    if (!email.includes("@")) return json({ error: "Email invalide." }, 400);

    const payloadFullName = String(payload.fullName ?? payload.full_name ?? "").trim();
    const payloadCompanyName = String(payload.companyName ?? payload.company_name ?? "").trim();

    const { data: accessRequest, error: accessRequestError } = await admin
      .from("access_requests")
      .select("id, email, full_name, company_name, status, notified_at")
      .eq("email", email)
      .maybeSingle();

    if (accessRequestError) {
      console.error("Access request lookup failed:", accessRequestError);
    }

    // Éviter le spam si déjà notifié dans les 12 dernières heures
    if (accessRequest?.notified_at) {
      const lastNotified = new Date(accessRequest.notified_at).getTime();
      if (Date.now() - lastNotified < 12 * 60 * 60 * 1000) {
        return json({ received: true, already_notified: true });
      }
    }

    let fullName = payloadFullName || accessRequest?.full_name || "";
    let companyName = payloadCompanyName || accessRequest?.company_name || "";

    if (!fullName || !companyName) {
      const { data: profile } = await admin
        .from("profiles")
        .select("full_name, company_id")
        .eq("email", email)
        .maybeSingle();
      if (profile) {
        fullName = fullName || profile.full_name || "";
        if (profile.company_id) {
          const { data: company } = await admin
            .from("companies")
            .select("name")
            .eq("id", profile.company_id)
            .maybeSingle();
          companyName = companyName || company?.name || "";
        }
      }
    }

    const configuredAdmin = Deno.env.get("ADMIN_NOTIFICATION_EMAIL") || "bayecode4@gmail.com";
    const { data: admins } = await admin
      .from("profiles")
      .select("email")
      .eq("role", "super_admin")
      .eq("is_active", true);
    const recipients = [
      ...(configuredAdmin ? configuredAdmin.split(",") : []),
      ...(admins ?? []).map((profile) => profile.email),
    ].map((item) => item.trim().toLowerCase()).filter(Boolean);
    const uniqueRecipients = [...new Set(recipients)];

    const mail = uniqueRecipients.length
      ? await sendEmail({
          to: uniqueRecipients,
          subject: `Nouvelle demande Inventa - ${companyName || email}`,
          text: [
            "Nouvelle demande d'accès / inscription Inventa",
            `Nom : ${fullName || "Non renseigné"}`,
            `Bijouterie : ${companyName || "Non renseignée"}`,
            `Email : ${email}`,
            "Examiner la demande : https://inventa.bayecode.com/users",
          ].join("\n"),
          idempotencyKey: `access-request-${email}-${Date.now()}`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#0A1628">
              <h1 style="font-size:24px">Nouvelle demande d'accès</h1>
              <p><strong>Nom :</strong> ${escapeHtml(fullName || "Non renseigné")}</p>
              <p><strong>Bijouterie :</strong> ${escapeHtml(companyName || "Non renseignée")}</p>
              <p><strong>Email :</strong> ${escapeHtml(email)}</p>
              <p style="margin-top:24px">
                <a href="https://inventa.bayecode.com/users" style="background:#C9972A;color:#0A1628;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:bold">
                  Examiner la demande
                </a>
              </p>
            </div>`,
        })
      : { sent: false, reason: "no_admin_recipient" };

    if (mail.sent && accessRequest?.id) {
      await admin
        .from("access_requests")
        .update({ notified_at: new Date().toISOString() })
        .eq("id", accessRequest.id);
    }

    return json({ received: true, email_sent: mail.sent, email_reason: mail.reason ?? null });
  }

  const authorization = request.headers.get("Authorization");
  if (!authorization) return json({ error: "Accès non autorisé." }, 401);

  const jwt = authorization.replace(/^Bearer\s+/i, "");
  const { data: authData, error: authError } = await admin.auth.getUser(jwt);
  if (authError || !authData.user) return json({ error: "Session invalide." }, 401);

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("role, is_active")
    .eq("id", authData.user.id)
    .single();
  if (profileError) {
    console.error("Admin profile lookup failed:", profileError);
    return json({ error: "Impossible de vérifier les droits administrateur." }, 500);
  }
  if (profile?.role !== "super_admin" || !profile.is_active) {
    return json({ error: "Action réservée au super-administrateur." }, 403);
  }

  if (!["approve", "reject"].includes(action)) {
    return json({ error: "Action invalide." }, 400);
  }

  const requestId = String(payload.request_id ?? "");
  const { data: accessRequest, error: requestError } = await admin
    .from("access_requests")
    .select("id, user_id, email, full_name, company_name, status")
    .eq("id", requestId)
    .single();

  if (requestError || !accessRequest) return json({ error: "Demande introuvable." }, 404);
  if (accessRequest.status !== "pending") return json({ error: "Cette demande a déjà été traitée." }, 409);

  const approved = action === "approve";
  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);

  const { error: subscriptionError } = await admin
    .from("subscriptions")
    .update({
      status: approved ? "active" : "canceled",
      starts_at: new Date().toISOString(),
      expires_at: approved ? expiresAt.toISOString() : null,
    })
    .eq("user_id", accessRequest.user_id);
  if (subscriptionError) return json({ error: "Mise à jour du compte impossible." }, 500);

  const { error: reviewError } = await admin
    .from("access_requests")
    .update({
      status: approved ? "approved" : "rejected",
      reviewed_at: new Date().toISOString(),
      reviewed_by: authData.user.id,
    })
    .eq("id", accessRequest.id);
  if (reviewError) return json({ error: "Mise à jour de la demande impossible." }, 500);

  const appUrl = "https://inventa.bayecode.com/login";
  const mail = await sendEmail({
    to: [accessRequest.email],
    subject: approved ? "Votre accès Inventa est activé" : "Réponse à votre demande Inventa",
    text: approved
      ? [
          `Bonjour ${accessRequest.full_name || ""},`,
          "",
          `Votre demande pour ${accessRequest.company_name || "votre bijouterie"} a été acceptée.`,
          "Vous pouvez accéder directement à la page de connexion :",
          appUrl,
          "",
          "Utilisez l'adresse email et le mot de passe que vous avez saisis lors de votre demande d'accès.",
          "Pour votre sécurité, Inventa ne vous renverra jamais votre mot de passe par email.",
        ].join("\n")
      : [
          `Bonjour ${accessRequest.full_name || ""},`,
          "",
          "Votre demande d'accès Inventa n'a pas été retenue pour le moment.",
          "Vous pouvez répondre à cet email pour obtenir plus d'informations.",
        ].join("\n"),
    idempotencyKey: `access-review-${accessRequest.id}-${action}`,
    html: approved
      ? `
        <div style="background:#f4f6f8;padding:32px 16px;font-family:Arial,sans-serif;color:#0A1628">
          <div style="max-width:600px;margin:auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;padding:32px">
            <p style="margin:0 0 20px;color:#C9972A;font-weight:700">INVENTA</p>
            <h1 style="margin:0 0 20px;font-size:25px">Votre accès est activé</h1>
            <p>Bonjour ${escapeHtml(accessRequest.full_name || "")},</p>
            <p>Votre demande pour <strong>${escapeHtml(accessRequest.company_name || "votre bijouterie")}</strong> a été acceptée.</p>
            <p style="margin:28px 0">
              <a href="${appUrl}" style="display:inline-block;background:#C9972A;color:#0A1628;text-decoration:none;padding:13px 20px;border-radius:8px;font-weight:bold">
                Accéder à la page de connexion
              </a>
            </p>
            <p><strong>Identifiants :</strong> utilisez votre adresse email et le mot de passe que vous avez saisis lors de votre demande d’accès.</p>
            <p style="font-size:13px;color:#64748b">Pour votre sécurité, Inventa ne vous renverra jamais votre mot de passe par email.</p>
            <p style="margin-top:28px;font-size:13px;color:#64748b">Lien direct : <a href="${appUrl}" style="color:#0A1628">${appUrl}</a></p>
          </div>
        </div>`
      : `
        <div style="background:#f4f6f8;padding:32px 16px;font-family:Arial,sans-serif;color:#0A1628">
          <div style="max-width:600px;margin:auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;padding:32px">
            <p style="margin:0 0 20px;color:#C9972A;font-weight:700">INVENTA</p>
            <h1 style="font-size:24px">Votre demande Inventa</h1>
            <p>Bonjour ${escapeHtml(accessRequest.full_name || "")},</p>
            <p>Votre demande d'accès n'a pas été retenue pour le moment.</p>
            <p>Vous pouvez répondre à cet email pour obtenir plus d'informations.</p>
          </div>
        </div>`,
  });

  return json({ success: true, email_sent: mail.sent, email_reason: mail.reason ?? null });
});
