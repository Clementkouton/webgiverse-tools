// app/actions/annonceur.ts
"use server";
// ─────────────────────────────────────────────────────────────────
// Action serveur du formulaire de la page Annonceurs :
//   1. Validation stricte des champs (zod).
//   2. La demande est TOUJOURS enregistrée en base (table
//      MessageContact, sujet préfixé « Demande mise en avant »).
//   3. Une notification e-mail part vers EMAIL_USER (toi) —
//      échec silencieux si l'envoi d'e-mails n'est pas configuré.
//   Tu traites ensuite la demande : lien de paiement, puis bouton
//   « Mettre en avant » dans l'admin (app/admin/outils).
// ─────────────────────────────────────────────────────────────────
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { envoyerEmail } from "@/lib/email";

export type EtatAnnonceur = { ok: boolean; message: string };

const SCHEMA = z.object({
  nom: z.string().trim().min(2, "Ton nom doit contenir au moins 2 caractères.").max(80),
  email: z.string().trim().email("Cette adresse e-mail n'est pas valide."),
  outil: z.string().trim().min(2, "Indique le nom de ton outil (2 caractères minimum).").max(160),
  formule: z.enum(["semaine", "mois"], { message: "Choisis une formule." }),
  message: z.string().trim().min(10, "Décris ta demande en quelques mots (10 caractères minimum).").max(2000),
});

/** Échappe les caractères HTML avant insertion dans l'e-mail de notification. */
function echapper(texte: string): string {
  return texte
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function envoyerDemandeAnnonceur(
  _avant: EtatAnnonceur,
  donnees: FormData
): Promise<EtatAnnonceur> {
  const analyse = SCHEMA.safeParse({
    nom: donnees.get("nom"),
    email: donnees.get("email"),
    outil: donnees.get("outil"),
    formule: donnees.get("formule"),
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

  const { nom, email, outil, formule, message } = analyse.data;
  const libelleFormule = formule === "semaine" ? "À la une — 1 semaine ($19)" : "À la une — 1 mois ($49)";

  try {
    // 1) Enregistrement en base — la demande est conservée même si
    //    l'e-mail n'est pas configuré.
    await prisma.messageContact.create({
      data: {
        nom,
        email,
        sujet: `Demande mise en avant — ${outil}`,
        message: `Formule souhaitée : ${libelleFormule}\n\n${message}`,
      },
    });

    // 2) Notification e-mail vers l'équipe (toi) — optionnelle.
    const destinataire = process.env.EMAIL_USER;
    if (destinataire) {
      await envoyerEmail({
        a: destinataire,
        sujet: `[Webgiverse — Annonceur] ${libelleFormule} — ${outil}`,
        html: `
          <h2 style="margin:0 0 16px; font-size:18px; color:#111827;">
            Nouvelle demande de mise en avant
          </h2>
          <p style="margin:0 0 8px;"><strong>Nom :</strong> ${echapper(nom)}</p>
          <p style="margin:0 0 8px;"><strong>E-mail :</strong> ${echapper(email)}</p>
          <p style="margin:0 0 8px;"><strong>Outil :</strong> ${echapper(outil)}</p>
          <p style="margin:0 0 8px;"><strong>Formule :</strong> ${echapper(libelleFormule)}</p>
          <p style="margin:16px 0 0;"><strong>Message :</strong></p>
          <p style="margin:8px 0 0; white-space:pre-wrap;">${echapper(message)}</p>
          <p style="margin:16px 0 0; color:#6b7280; font-size:13px;">
            Après paiement : Admin → Outils → « Mettre en avant » sur la fiche concernée.
          </p>
        `,
      });
    }

    return {
      ok: true,
      message:
        "Demande bien reçue ! On vérifie que ton outil correspond aux critères, puis tu reçois le lien de paiement par e-mail sous 24 h ouvrées.",
    };
  } catch {
    return {
      ok: false,
      message:
        "Impossible d'envoyer la demande pour l'instant. Réessaie dans un instant.",
    };
  }
}