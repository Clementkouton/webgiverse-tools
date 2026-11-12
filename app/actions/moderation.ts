// app/actions/moderation.ts
"use server";
// ─────────────────────────────────────────────────────────────────
// Lot 25 — Actions de la page « Modération » centralisée.
// Les propositions d'outils et les avis réutilisent directement les
// actions existantes de app/actions/admin.ts ; ce fichier ajoute
// uniquement la gestion des MESSAGES DE CONTACT (marquer traité /
// supprimer), absente jusqu'ici, avec trace d'audit.
//
// LOT 71 — RÉPONDRE DIRECTEMENT AUX MESSAGES DE CONTACT :
//   repondreMessageContactFormulaire envoie la réponse par e-mail
//   (nodemailer, lib/email.ts) à l'expéditeur, marque le message
//   comme traité et trace l'action dans le journal admin.
//   Si l'envoi échoue (SMTP non configuré ou indisponible), le
//   message n'est PAS marqué traité : la réponse tapée reste dans
//   le formulaire et l'admin peut réessayer après correction.
// ─────────────────────────────────────────────────────────────────
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { tracerActionAdmin } from "@/lib/journal-admin";
import { envoyerEmail } from "@/lib/email";

async function exigerAdmin(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Accès réservé aux administrateurs.");
  const moi = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (moi?.role !== "ADMIN") throw new Error("Accès réservé aux administrateurs.");
  return session.user.id;
}

/** Marque un message de contact comme traité (bouton « Traité »). */
export async function marquerMessageTraiteFormulaire(donnees: FormData) {
  await exigerAdmin();
  const id = String(donnees.get("messageId") ?? "");
  if (!id) return;
  const message = await prisma.messageContact.findUnique({ where: { id } });
  if (!message) return;
  await prisma.messageContact.update({ where: { id }, data: { traite: true } });
  await tracerActionAdmin({
    action: "CONTACT_TRAITE",
    cible: `Contact : ${message.sujet} (${message.email})`,
  });
  revalidatePath("/admin/moderation");
  revalidatePath("/admin");
}

/** Supprime définitivement un message de contact. */
export async function supprimerMessageContactFormulaire(donnees: FormData) {
  await exigerAdmin();
  const id = String(donnees.get("messageId") ?? "");
  if (!id) return;
  const message = await prisma.messageContact.findUnique({ where: { id } });
  if (!message) return;
  await prisma.messageContact.delete({ where: { id } });
  await tracerActionAdmin({
    action: "CONTACT_SUPPRIME",
    cible: `Contact : ${message.sujet} (${message.email})`,
    details: message.message.slice(0, 300),
  });
  revalidatePath("/admin/moderation");
  revalidatePath("/admin");
}

/* ═══════════════════════════════════════════════════════════════════
   LOT 71 — RÉPONDRE PAR E-MAIL À UN MESSAGE DE CONTACT
   ═══════════════════════════════════════════════════════════════════ */

export type EtatReponseMessage = { ok: boolean; message: string };

/** Échappe les caractères HTML dans le corps de la réponse. */
function echapperTexte(texte: string): string {
  return texte
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Transforme les URL en liens cliquables (à appeler APRÈS échappement). */
function lienifier(texte: string): string {
  return texte.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" style="color:#7c3aed; word-break:break-all;">$1</a>'
  );
}

/**
 * Gabarit HTML de la réponse : même charte que gabaritBase
 * (lib/email.ts), avec un pied adapté à une VRAIE réponse humaine
 * (l'expéditeur peut répondre directement à l'e-mail).
 */
function htmlReponse(texte: string): string {
  const corps = lienifier(echapperTexte(texte))
    .split(/\n{2,}/)
    .map(
      (paragraphe) =>
        `<p style="margin:0 0 14px; white-space:pre-wrap;">${paragraphe}</p>`
    )
    .join("");

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
                ${corps}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px; background-color:#f9fafb; color:#6b7280;
                font-size:12px; text-align:center; line-height:1.6;">
                Webgiverse Tools — L'annuaire des meilleurs outils IA<br/>
                Tu reçois cet e-mail car tu nous as écrit via le formulaire de
                contact. Tu peux répondre directement à cet e-mail.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/**
 * LOT 71 — Envoie la réponse de l'admin à l'expéditeur d'un message de
 * contact, puis marque le message comme traité. Conçu pour
 * useActionState dans components/admin/panneau-reponse-message.tsx.
 */
export async function repondreMessageContactFormulaire(
  _avant: EtatReponseMessage,
  donnees: FormData
): Promise<EtatReponseMessage> {
  try {
    await exigerAdmin();
  } catch {
    return { ok: false, message: "Accès réservé aux administrateurs." };
  }

  const id = String(donnees.get("messageId") ?? "");
  const sujet = String(donnees.get("sujet") ?? "").trim().slice(0, 200);
  const corps = String(donnees.get("corps") ?? "").trim().slice(0, 5000);

  if (!id) return { ok: false, message: "Message introuvable." };
  if (!sujet) return { ok: false, message: "Indique un objet pour ta réponse." };
  if (corps.length < 2) {
    return { ok: false, message: "Écris ta réponse avant d'envoyer (ou génère un brouillon avec l'assistant)." };
  }

  const message = await prisma.messageContact.findUnique({ where: { id } });
  if (!message) {
    return {
      ok: false,
      message: "Ce message n'existe plus (déjà traité ou supprimé). Actualise la page.",
    };
  }

  // 1) Envoi du e-mail — envoyerEmail renvoie false sans jamais lever
  //    d'exception (SMTP absent, identifiants invalides…).
  const parti = await envoyerEmail({
    a: message.email,
    sujet,
    html: htmlReponse(corps),
  });
  if (!parti) {
    return {
      ok: false,
      message:
        "L'e-mail n'est pas parti : SMTP non configuré ou indisponible. Vérifie EMAIL_USER, EMAIL_PASS, EMAIL_HOST et EMAIL_PORT dans Vercel → Settings → Environment Variables, puis réessaie. Ta réponse est conservée dans le formulaire.",
    };
  }

  // 2) Le message est répondu → traité (il quitte la liste de modération).
  await prisma.messageContact.update({ where: { id }, data: { traite: true } });
  await tracerActionAdmin({
    action: "CONTACT_REPONDU",
    cible: `Contact : ${message.sujet} (${message.email})`,
    details: `Réponse envoyée — objet : ${sujet}`,
  });
  revalidatePath("/admin/moderation");
  revalidatePath("/admin");

  return { ok: true, message: `Réponse envoyée à ${message.email}.` };
}