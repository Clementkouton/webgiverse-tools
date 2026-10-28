// app/api/newsletter/hebdo/route.ts
// ─────────────────────────────────────────────────────────────────
// Alerte hebdomadaire des nouveaux outils — réservée au plan
// Entreprise (promesse affichée sur la page Tarifs).
//
// Déclenchement : cron Vercel, tous les lundis à 08:00 UTC
// (voir vercel.json à la racine du projet). Vercel appelle
// automatiquement cette route en GET avec l'en-tête
// « Authorization: Bearer CRON_SECRET ».
//
// Tu peux aussi la déclencher à la main pour tester :
//   curl -H "Authorization: Bearer TON_SECRET" https://ton-site/api/newsletter/hebdo
//
// Sécurité : sans le bon secret, la route répond 401 — impossible
// de déclencher un envoi en masse sans autorisation.
// ─────────────────────────────────────────────────────────────────
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { envoyerEmail } from "@/lib/email";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(requete: Request) {
  // 1) Vérification du secret
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, erreur: "CRON_SECRET n'est pas défini dans les variables d'environnement." },
      { status: 500 }
    );
  }
  const autorisation = requete.headers.get("authorization");
  if (autorisation !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, erreur: "Non autorisé." }, { status: 401 });
  }

  // 2) Destinataires : tous les abonnés Entreprise actifs
  const abonnements = await prisma.abonnement.findMany({
    where: { plan: "ENTREPRISE", statut: "ACTIF", expireLe: { gt: new Date() } },
    include: { utilisateur: { select: { email: true } } },
  });

  if (abonnements.length === 0) {
    return NextResponse.json({ ok: true, envoyes: 0, message: "Aucun abonné Entreprise actif." });
  }

  // 3) Les outils publiés au cours des 7 derniers jours (5 maximum)
  const ilYA7Jours = new Date(Date.now() - 7 * 86_400_000);
  let outils = await prisma.tool.findMany({
    where: { statut: "PUBLIE", createdAt: { gte: ilYA7Jours } },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { nom: true, slug: true, description: true, tarif: true, gratuit: true },
  });

  let titreSection = "Les nouveaux outils de la semaine";
  if (outils.length === 0) {
    // Semaine sans ajout : on reprend les derniers outils référencés
    // pour ne jamais envoyer un e-mail vide.
    outils = await prisma.tool.findMany({
      where: { statut: "PUBLIE" },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { nom: true, slug: true, description: true, tarif: true, gratuit: true },
    });
    titreSection = "Les derniers outils ajoutés à l'annuaire";
  }

  if (outils.length === 0) {
    return NextResponse.json({ ok: true, envoyes: 0, message: "Aucun outil à annoncer." });
  }

  // 4) Construction de l'e-mail (HTML simple, compatible partout)
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://webgiverse-tools.vercel.app";

  const lignesOutils = outils
    .map(
      (o) => `
      <tr>
        <td style="padding:14px 16px; border-bottom:1px solid #e5e7eb;">
          <a href="${base}/outil/${o.slug}"
            style="color:#6a3bff; font-weight:bold; text-decoration:none; font-size:15px;">
            ${echapper(o.nom)}
          </a>${o.gratuit ? ' <span style="background:#d1fae5; color:#065f46; border-radius:999px; padding:2px 8px; font-size:11px; font-weight:bold;">Gratuit</span>' : ""}
          <p style="margin:6px 0 4px; color:#43507a; font-size:13px; line-height:1.5;">
            ${echapper(o.description.slice(0, 140))}${o.description.length > 140 ? "…" : ""}
          </p>
          <span style="color:#6b7280; font-size:12px;">${echapper(o.tarif)}</span>
        </td>
      </tr>`
    )
    .join("");

  const html = `
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
              <td style="background-color:#6a3bff; padding:24px 32px; text-align:center;">
                <span style="color:#ffffff; font-size:20px; font-weight:bold; letter-spacing:1px;">
                  Webgiverse
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px; color:#1f2937; font-size:15px; line-height:1.6;">
                <h2 style="margin:0 0 16px; font-size:18px; color:#111827;">
                  ${titreSection}
                </h2>
                <p style="margin:0 0 16px;">
                  Bonjour, voici la sélection hebdomadaire de l'annuaire —
                  réservée aux membres du plan Entreprise.
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                  style="background-color:#f9fafb; border-radius:8px; margin:0 0 24px;">
                  ${lignesOutils}
                </table>
                <p style="margin:0 0 24px; text-align:center;">
                  <a href="${base}/outils?tri=recente"
                    style="display:inline-block; background-color:#6a3bff; color:#ffffff;
                    text-decoration:none; padding:12px 28px; border-radius:8px; font-weight:bold;">
                    Voir tous les nouveaux outils
                  </a>
                </p>
                <p style="margin:0; color:#6b7280; font-size:13px;">
                  Tu reçois cet e-mail car ton abonnement Entreprise est actif.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px; background-color:#f9fafb; color:#6b7280;
                font-size:12px; text-align:center; line-height:1.6;">
                Webgiverse — L'annuaire des meilleurs outils IA<br/>
                Apprendre · Créer · Réussir
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  // 5) Envoi en parallèle (rapide) — on compte les succès
  const resultats = await Promise.allSettled(
    abonnements.map((a) =>
      envoyerEmail({
        a: a.utilisateur.email,
        sujet: "Les nouveaux outils IA de la semaine — Webgiverse",
        html,
      })
    )
  );
  const envoyes = resultats.filter(
    (r) => r.status === "fulfilled" && r.value === true
  ).length;

  return NextResponse.json({
    ok: true,
    destinataires: abonnements.length,
    envoyes,
    outils: outils.length,
  });
}

/** Échappe les caractères HTML dans les contenus dynamiques de l'e-mail. */
function echapper(texte: string): string {
  return texte
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}