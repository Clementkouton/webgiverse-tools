// app/actions/contact.ts
"use server";
// ─────────────────────────────────────────────────────────────────
// Action serveur du formulaire de contact :
//   1. Validation stricte des champs (zod).
//   2. Le message est TOUJOURS enregistré en base (table
//      MessageContact) — rien n'est jamais perdu.
//   3. Une notification e-mail part vers EMAIL_USER (toi) si
//      l'envoi d'e-mails est configuré — échec silencieux sinon.
// ─────────────────────────────────────────────────────────────────
import { z } from "zod";
import { headers } from "next/headers"; // Lot 83 — IP pour l'anti spam
import { prisma } from "@/lib/prisma";
import { envoyerEmail } from "@/lib/email";
import { autoriserRequete, ipClient } from "@/lib/limitation-debit"; // Lot 83

export type EtatContact = { ok: boolean; message: string };

const SCHEMA = z.object({
  nom: z.string().trim().min(2, "Ton nom doit contenir au moins 2 caractères.").max(80),
  email: z.string().trim().email("Cette adresse e-mail n'est pas valide."),
  sujet: z.string().trim().min(3, "Précise un sujet (3 caractères minimum).").max(120),
  message: z.string().trim().min(10, "Ton message doit contenir au moins 10 caractères.").max(3000),
});

/** Échappe les caractères HTML avant insertion dans l'e-mail de notification. */
function echapper(texte: string): string {
  return texte
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function envoyerMessageAction(
  _avant: EtatContact,
  donnees: FormData
): Promise<EtatContact> {
  const analyse = SCHEMA.safeParse({
    nom: donnees.get("nom"),
    email: donnees.get("email"),
    sujet: donnees.get("sujet"),
    message: donnees.get("message"),
  });

  if (!analyse.success) {
    return {
      ok: false,
      message:
        analyse.error.issues[0]?.message ??
        "Vérifie les champs du formulaire puis réessaie.",
    };
  }

  const { nom, email, sujet, message } = analyse.data;

  // Lot 83 — Anti spam : 5 messages par IP et par heure, 3 par adresse
  // e-mail et par heure. Sans cela, un script pouvait noyer ta boîte
  // (chaque message déclenche un e-mail vers EMAIL_USER) et polluer la
  // table MessageContact.
  const ip = ipClient(await headers());
  if (
    !autoriserRequete(`contact-ip:${ip}`, 5, 60 * 60_000) ||
    !autoriserRequete(`contact-email:${email.toLowerCase()}`, 3, 60 * 60_000)
  ) {
    return {
      ok: false,
      message:
        "Trop de messages envoyés récemment. Réessaie dans une heure — merci de ta patience !",
    };
  }

  try {
    // 1) Enregistrement en base — le message est conservé même si
    //    l'e-mail n'est pas configuré.
    await prisma.messageContact.create({
      data: { nom, email, sujet, message },
    });

    // 2) Notification e-mail vers l'équipe (toi) — optionnelle.
    const destinataire = process.env.EMAIL_USER;
    if (destinataire) {
      await envoyerEmail({
        a: destinataire,
        sujet: `[Webgiverse Tools — Contact] ${sujet}`,
        html: `
          <h2 style="margin:0 0 16px; font-size:18px; color:#111827;">
            Nouveau message reçu sur la page Contact
          </h2>
          <p style="margin:0 0 8px;"><strong>Nom :</strong> ${echapper(nom)}</p>
          <p style="margin:0 0 8px;"><strong>E-mail :</strong> ${echapper(email)}</p>
          <p style="margin:0 0 8px;"><strong>Sujet :</strong> ${echapper(sujet)}</p>
          <p style="margin:16px 0 0;"><strong>Message :</strong></p>
          <p style="margin:8px 0 0; white-space:pre-wrap;">${echapper(message)}</p>
          <p style="margin:16px 0 0; color:#6b7280; font-size:13px;">
            Réponds directement à l'adresse e-mail indiquée ci-dessus.
          </p>
        `,
      });
    }

    return {
      ok: true,
      message:
        "Message bien reçu ! L'équipe Webgiverse te répond au plus vite (24 à 48 h ouvrées).",
    };
  } catch {
    return {
      ok: false,
      message:
        "Impossible d'envoyer le message pour l'instant. Réessaie dans un instant.",
    };
  }
}