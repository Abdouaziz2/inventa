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

    const cleanIdempotencyKey = input.idempotencyKey.replace(/[^a-zA-Z0-9_-]/g, "");
    const messageId = `<${cleanIdempotencyKey || Date.now()}@bayecode.com>`;

    await transporter.sendMail({
      from,
      to: input.to,
      replyTo: user,
      subject: input.subject,
      text: input.text,
      html: input.html,
      messageId,
      envelope: {
        from: user,
        to: input.to,
      },
      headers: {
        "X-Inventa-Message-ID": input.idempotencyKey,
        "X-Entity-Ref-ID": input.idempotencyKey,
        "Auto-Submitted": "auto-generated",
        "X-Auto-Response-Suppress": "All",
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

  if (action === "payment-reminder") {
    const targetUserId = String(payload.user_id ?? "").trim();
    if (!targetUserId) {
      return json({ error: "Identifiant utilisateur requis." }, 400);
    }

    const { data: targetProfile, error: targetError } = await admin
      .from("profiles")
      .select("id, email, full_name, phone, company_id")
      .eq("id", targetUserId)
      .single();

    if (targetError || !targetProfile) {
      return json({ error: "Utilisateur introuvable." }, 404);
    }

    let companyName = "";
    if (targetProfile.company_id) {
      const { data: company } = await admin
        .from("companies")
        .select("name")
        .eq("id", targetProfile.company_id)
        .maybeSingle();
      companyName = company?.name ?? "";
    }

    const { data: targetSub } = await admin
      .from("subscriptions")
      .select("status, expires_at, starts_at, amount, plan_code, frequency")
      .eq("user_id", targetUserId)
      .maybeSingle();

    const expiresAt = targetSub?.expires_at ?? null;
    let daysRemaining = 0;
    let isExpired = false;
    if (expiresAt) {
      const diff = new Date(expiresAt).getTime() - Date.now();
      daysRemaining = Math.ceil(diff / (24 * 60 * 60 * 1000));
      isExpired = daysRemaining <= 0;
    } else if (targetSub?.status === "expired" || targetSub?.status === "past_due") {
      isExpired = true;
    }

    const planAmount = Number(payload.amount || targetSub?.amount || 11500);
    const waveUrl = `https://pay.wave.com/m/M_sn_rcEoxhsoOgeM/c/sn/?amount=${Math.round(planAmount)}`;
    const formattedAmount = `${new Intl.NumberFormat("fr-FR").format(planAmount)} FCFA`;
    const formattedDate = expiresAt
      ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date(expiresAt))
      : "bientôt";

    const subject = isExpired
      ? `Renouvellement de votre compte Inventa · ${companyName || targetProfile.full_name}`
      : `Échéance de votre abonnement Inventa (${daysRemaining} j restant${daysRemaining > 1 ? "s" : ""}) · ${companyName || targetProfile.full_name}`;

    const mail = await sendEmail({
      to: [targetProfile.email],
      subject,
      text: [
        `Bonjour ${targetProfile.full_name || ""},`,
        "",
        isExpired
          ? `Votre abonnement Inventa pour ${companyName || "votre bijouterie"} a expiré le ${formattedDate}.`
          : `Votre abonnement Inventa pour ${companyName || "votre bijouterie"} arrive à expiration le ${formattedDate} (${daysRemaining} jour${daysRemaining > 1 ? "s" : ""} restant${daysRemaining > 1 ? "s" : ""}).`,
        "",
        `Montant à régler : ${formattedAmount}`,
        "",
        "Pour renouveler immédiatement votre accès et éviter toute interruption de service, effectuez votre paiement Wave en un clic :",
        waveUrl,
        "",
        "Ou connectez-vous directement sur votre espace Inventa :",
        "https://inventa.bayecode.com/subscription",
        "",
        "L'équipe Inventa reste à votre entière disposition.",
        "Besoin d'aide ? Contactez notre support au +221 77 240 68 74 (Appel / WhatsApp).",
        "",
        "---",
        "Inventa · Bayecode Tech (Dakar, Sénégal)",
        "Solution professionnelle de gestion pour bijouteries",
      ].join("\n"),
      idempotencyKey: `payment-reminder-${targetProfile.id}-${Date.now()}`,
      html: `
        <div style="background:#f4f6f8;padding:32px 16px;font-family:Arial,sans-serif;color:#0A1628">
          <div style="max-width:600px;margin:auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;padding:32px">
            <p style="margin:0 0 16px;color:#C9972A;font-weight:700;letter-spacing:1px">INVENTA</p>
            <h1 style="margin:0 0 20px;font-size:24px;color:#0A1628">
              ${isExpired ? "Votre abonnement Inventa a expiré" : "Rappel : expiration imminente de votre abonnement"}
            </h1>
            <p>Bonjour <strong>${escapeHtml(targetProfile.full_name || "")}</strong>,</p>
            <p>
              ${
                isExpired
                  ? `Votre abonnement Inventa pour <strong>${escapeHtml(companyName || "votre bijouterie")}</strong> est arrivé à échéance le <strong>${formattedDate}</strong>.`
                  : `Votre abonnement pour <strong>${escapeHtml(companyName || "votre bijouterie")}</strong> arrive à expiration le <strong>${formattedDate}</strong> (plus que <strong>${daysRemaining} jour${daysRemaining > 1 ? "s" : ""}</strong>).`
              }
            </p>
            <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:18px;margin:24px 0">
              <p style="margin:0 0 8px;font-size:13px;color:#64748B;text-transform:uppercase;font-weight:600">Montant du renouvellement</p>
              <p style="margin:0;font-size:26px;font-weight:bold;color:#0A1628">${formattedAmount}</p>
            </div>
            <p style="margin:28px 0;text-align:center">
              <a href="${waveUrl}" style="display:inline-block;background:#1DA1F2;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:bold;font-size:16px;box-shadow:0 2px 4px rgba(0,0,0,0.1)">
                Payer avec Wave (${formattedAmount})
              </a>
            </p>
            <p style="font-size:13px;color:#64748B;text-align:center">
              Lien sécurisé Wave direct : <a href="${waveUrl}" style="color:#1DA1F2;word-break:break-all">${waveUrl}</a>
            </p>
            <hr style="border:none;border-top:1px solid #E2E8F0;margin:28px 0" />
            <p style="font-size:13px;color:#64748B">
              Vous pouvez également gérer votre abonnement directement depuis l'application : <a href="https://inventa.bayecode.com/subscription" style="color:#0A1628">Gérer mon abonnement</a>.
            </p>
            <div style="margin-top:32px;padding-top:20px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;line-height:1.6">
              <p style="margin:0 0 4px"><strong>Inventa</strong> · Système de gestion pour bijouteries</p>
              <p style="margin:0 0 4px">Bayecode Tech · Dakar, Sénégal · Support client : +221 77 240 68 74 (Appel / WhatsApp)</p>
              <p style="margin:0">Cet email automatique concerne la gestion de votre compte sur la plateforme <a href="https://inventa.bayecode.com" style="color:#64748b">inventa.bayecode.com</a>.</p>
            </div>
          </div>
        </div>
      `,
    });

    return json({
      success: true,
      email_sent: mail.sent,
      email_reason: mail.reason ?? null,
      wave_url: waveUrl,
    });
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
