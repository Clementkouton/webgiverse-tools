// app/admin/newsletter/page.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 35 — Newsletter : composer un e-mail depuis l'admin, le
// préremplir avec les nouveaux outils de la semaine, l'enregistrer en
// brouillon, l'envoyer aux inscrits (NewsletterSubscriber) ou à un
// segment de membres (Gratuits / Premium / Tous), suivre les envois.
// ─────────────────────────────────────────────────────────────────
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import EditeurNewsletter from "@/components/admin/editeur-newsletter";

export const metadata: Metadata = { title: "Newsletter — Administration" };
export const dynamic = "force-dynamic";

export default async function PageNewsletterAdmin() {
  const campagnes = await prisma.campagneNewsletter.findMany({
    orderBy: { creeLe: "desc" },
    take: 50,
  });

  const [nbAbonnes, nbUtilisateurs] = await Promise.all([
    prisma.newsletterSubscriber.count(),
    prisma.user.count({ where: { statut: "ACTIF" } }),
  ]);

  return (
    <div className="grid gap-6">
      <div>
        <h2 className="text-h3 font-semibold">Newsletter</h2>
        <p className="mt-1 text-[14px] leading-5 text-encre">
          {nbAbonnes} inscrit(s) au bulletin · {nbUtilisateurs} compte(s) actif(s). Envois via le
          transporteur SMTP configuré (EMAIL_USER / EMAIL_PASS) — mêmes variables que les autres e-mails.
        </p>
      </div>

      <EditeurNewsletter
        campagnes={campagnes.map((c) => ({
          id: c.id,
          sujet: c.sujet,
          segment: c.segment,
          statut: c.statut,
          destinataires: c.destinataires,
          echecs: c.echecs,
          envoyeLe: c.envoyeLe ? c.envoyeLe.toISOString() : null,
          creeLe: c.creeLe.toISOString(),
        }))}
      />
    </div>
  );
}
