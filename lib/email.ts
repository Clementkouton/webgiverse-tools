import nodemailer from "nodemailer";

/* =========================================================
   LIB/EMAIL.TS — Envoi réel des emails (nodemailer + Gmail)
   ---------------------------------------------------------
   Variables requises dans .env.local ET sur Netlify :
     EMAIL_HOST = smtp.gmail.com
     EMAIL_PORT = 587
     EMAIL_USER = votre.email@gmail.com
     EMAIL_PASS = mot de passe d'application Gmail (16 caractères)
     EMAIL_FROM = Webgiverse <votre.email@gmail.com>
   ========================================================= */

/* ---------------------------------------------------------
   1. Création du transporteur SMTP
   --------------------------------------------------------- */
function creerTransporteur() {
  const utilisateur = process.env.EMAIL_USER;
  const motDePasse = process.env.EMAIL_PASS;

  // Si les identifiants ne sont pas configurés, pas de transporteur
  if (!utilisateur || !motDePasse) {
    return null;
  }

  const port = Number(process.env.EMAIL_PORT || 587);

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: port,
    secure: port === 465, // 465 = SSL direct / 587 = STARTTLS
    auth: {
      user: utilisateur,
      pass: motDePasse,
    },
  });
}

/* ---------------------------------------------------------
   2. Fonction générique d'envoi d'un email
   Renvoie true si l'email est parti, false sinon.
   Ne lève jamais d'exception pour ne pas faire planter les API.
   --------------------------------------------------------- */
export async function envoyerEmail(options: {
  a: string; // adresse du destinataire
  sujet: string; // objet de l'email
  html: string; // contenu HTML de l'email
}) {
  const transporteur = creerTransporteur();

  if (!transporteur) {
    console.warn(
      "EMAIL non configuré (EMAIL_USER / EMAIL_PASS manquants). Email non envoyé à :",
      options.a
    );
    return false;
  }

  try {
    await transporteur.sendMail({
      from:
        process.env.EMAIL_FROM || `Webgiverse <${process.env.EMAIL_USER}>`,
      to: options.a,
      subject: options.sujet,
      html: options.html,
    });
    console.log("EMAIL envoyé avec succès à :", options.a);
    return true;
  } catch (erreur) {
    console.error("Échec d'envoi de l'email à", options.a, ":", erreur);
    return false;
  }
}

/* ---------------------------------------------------------
   3. Gabarit HTML commun à tous les emails
   --------------------------------------------------------- */
function gabaritBase(contenu: string) {
  return `
<!DOCTYPE html>
<html lang="fr">
  <body style="margin:0; padding:0; background-color:#f4f4f7;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
      style="background-color:#f4f4f7; padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
            style="max-width:560px; background-color:#ffffff; border-radius:12px;
            overflow:hidden; font-family:Arial, Helvetica, sans-serif;">
            <tr>
              <td style="background-color:#7c3aed; padding:24px 32px; text-align:center;">
                <span style="color:#ffffff; font-size:20px; font-weight:bold;
                  letter-spacing:1px;">Webgiverse</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px; color:#1f2937; font-size:15px; line-height:1.6;">
                ${contenu}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px; background-color:#f9fafb; color:#6b7280;
                font-size:12px; text-align:center; line-height:1.6;">
                Webgiverse — L'annuaire des meilleurs outils IA<br/>
                Cet email a été envoyé automatiquement, merci de ne pas y répondre.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/* ---------------------------------------------------------
   4. Email : réinitialisation de mot de passe
   --------------------------------------------------------- */
export function emailMotDePasseOublie(lien: string) {
  const contenu = `
    <h2 style="margin:0 0 16px; font-size:18px; color:#111827;">
      Mot de passe oublié ?
    </h2>
    <p style="margin:0 0 16px;">Bonjour,</p>
    <p style="margin:0 0 16px;">
      Vous avez demandé la réinitialisation de votre mot de passe sur Webgiverse.
      Cliquez sur le bouton ci-dessous pour en choisir un nouveau :
    </p>
    <p style="margin:0 0 24px; text-align:center;">
      <a href="${lien}"
        style="display:inline-block; background-color:#7c3aed; color:#ffffff;
        text-decoration:none; padding:12px 28px; border-radius:8px; font-weight:bold;">
        Réinitialiser mon mot de passe
      </a>
    </p>
    <p style="margin:0 0 8px;">
      Ce lien est valable <strong>1 heure</strong> et ne peut être utilisé qu'une seule fois.
    </p>
    <p style="margin:0 0 16px;">
      Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email :
      votre mot de passe actuel restera inchangé.
    </p>
    <p style="margin:0; color:#6b7280; font-size:13px;">
      Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :<br/>
      <a href="${lien}" style="color:#7c3aed; word-break:break-all;">${lien}</a>
    </p>
  `;
  return gabaritBase(contenu);
}

/* ---------------------------------------------------------
   5. Email : bienvenue après inscription (prêt pour plus tard)
   --------------------------------------------------------- */
export function emailBienvenue(nom?: string | null) {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const contenu = `
    <h2 style="margin:0 0 16px; font-size:18px; color:#111827;">
      Bienvenue sur Webgiverse${nom ? `, ${nom}` : ""} !
    </h2>
    <p style="margin:0 0 16px;">Bonjour,</p>
    <p style="margin:0 0 16px;">
      Votre compte a été créé avec succès. Découvrez plus de 200 outils et
      agents IA sélectionnés pour vous aider au quotidien.
    </p>
    <p style="margin:0 0 24px; text-align:center;">
      <a href="${base}/outils"
        style="display:inline-block; background-color:#7c3aed; color:#ffffff;
        text-decoration:none; padding:12px 28px; border-radius:8px; font-weight:bold;">
        Explorer les outils IA
      </a>
    </p>
    <p style="margin:0;">
      À très vite sur Webgiverse !
    </p>
  `;
  return gabaritBase(contenu);
}

/* ---------------------------------------------------------
   6. Email : confirmation de paiement (prêt pour plus tard)
   --------------------------------------------------------- */
export function emailPaiementConfirme(details: {
  plan: string;
  montant: string;
}) {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const contenu = `
    <h2 style="margin:0 0 16px; font-size:18px; color:#111827;">
      Paiement confirmé, merci !
    </h2>
    <p style="margin:0 0 16px;">Bonjour,</p>
    <p style="margin:0 0 16px;">
      Nous avons bien reçu votre paiement. Voici le récapitulatif :
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
      style="background-color:#f9fafb; border-radius:8px; margin:0 0 24px;">
      <tr>
        <td style="padding:12px 16px; border-bottom:1px solid #e5e7eb;">
          <strong>Abonnement :</strong> ${details.plan}
        </td>
      </tr>
      <tr>
        <td style="padding:12px 16px;">
          <strong>Montant payé :</strong> ${details.montant}
        </td>
      </tr>
    </table>
    <p style="margin:0 0 24px; text-align:center;">
      <a href="${base}/dashboard"
        style="display:inline-block; background-color:#7c3aed; color:#ffffff;
        text-decoration:none; padding:12px 28px; border-radius:8px; font-weight:bold;">
        Accéder à mon tableau de bord
      </a>
    </p>
    <p style="margin:0;">
      Merci de votre confiance,<br/>L'équipe Webgiverse
    </p>
  `;
  return gabaritBase(contenu);
}