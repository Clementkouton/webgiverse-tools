// app/admin/sauvegarde/page.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 25 — SAUVEGARDE DE LA BASE en 1 clic :
//   • « Sauvegarde complète » : un JSON unique avec toutes les tables ;
//   • export CSV par table (Excel : séparateur « ; », BOM UTF-8) ;
//   • compteurs en direct pour voir la taille de chaque table.
// Les fichiers sont générés par app/api/admin/export/route.ts et
// chaque téléchargement est tracé dans le journal d'audit.
// ─────────────────────────────────────────────────────────────────
import type { Metadata } from "next";
import { Database, Download, FileJson, FileSpreadsheet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Carte } from "@/components/ui/carte";
import { formatteDate } from "@/lib/dates";

export const metadata: Metadata = { title: "Sauvegarde — Administration" };
export const dynamic = "force-dynamic";

export default async function PageSauvegardeAdmin() {
  const aujourdhui = new Date().toISOString().slice(0, 10);

  const [
    nbUsers, nbOutils, nbPrompts, nbTutos, nbArticles,
    nbAvis, nbAbonnements, nbPaiements, nbParrainages,
    nbPropositions, nbContacts,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.tool.count(),
    prisma.prompt.count(),
    prisma.tuto.count(),
    prisma.article.count(),
    prisma.avis.count(),
    prisma.abonnement.count(),
    prisma.paiement.count(),
    prisma.parrainage.count(),
    prisma.toolSubmission.count(),
    prisma.messageContact.count(),
  ]);

  const tables = [
    { type: "outils", libelle: "Outils", nb: nbOutils },
    { type: "prompts", libelle: "Prompts", nb: nbPrompts },
    { type: "tutoriels", libelle: "Tutoriels", nb: nbTutos },
    { type: "articles", libelle: "Articles", nb: nbArticles },
    { type: "utilisateurs", libelle: "Utilisateurs", nb: nbUsers },
    { type: "avis", libelle: "Avis", nb: nbAvis },
    { type: "abonnements", libelle: "Abonnements", nb: nbAbonnements },
    { type: "paiements", libelle: "Paiements", nb: nbPaiements },
    { type: "parrainages", libelle: "Parrainages", nb: nbParrainages },
    { type: "propositions", libelle: "Propositions", nb: nbPropositions },
    { type: "contacts", libelle: "Messages de contact", nb: nbContacts },
  ];

  return (
    <div>
      <div className="animate-apparition-haut">
        <h1 className="text-h3 font-semibold">Sauvegarde</h1>
        <p className="mt-1 text-[14px] leading-6 text-encre">
          Téléchargez vos données en un clic. Conseil : une sauvegarde complète par semaine, conservée hors ligne.
        </p>
      </div>

      {/* ── Sauvegarde complète ─────────────────────────────────────── */}
      <Carte className="animate-apparition-haut mt-6 flex flex-wrap items-center justify-between gap-4 p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-champ bg-primaire/10 text-primaire-texte">
            <FileJson className="size-5" aria-hidden />
          </span>
          <div>
            <h2 className="font-titre text-[16px] leading-6 font-semibold">Sauvegarde complète (JSON)</h2>
            <p className="mt-0.5 max-w-xl text-[13.5px] leading-5 text-encre">
              Les 14 tables de la base dans un seul fichier lisible par machine — idéal pour restaurer ou migrer.
            </p>
          </div>
        </div>
        <a
          href="/api/admin/export?type=complet"
          download
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-champ bg-primaire px-5 text-[14px] font-semibold text-white shadow-[0_2px_10px_rgba(93,135,255,0.35)] transition hover:bg-primaire-fonce active:scale-[0.98]"
        >
          <Download className="size-4" aria-hidden /> Exporter tout ({aujourdhui})
        </a>
      </Carte>

      {/* ── Exports par table ───────────────────────────────────────── */}
      <h2 className="animate-apparition-haut mt-8 flex items-center gap-2 font-titre text-[17px] leading-6 font-semibold text-adm-sombre">
        <FileSpreadsheet className="size-4.5 text-primaire" aria-hidden /> Export par table (CSV)
      </h2>
      <div className="animate-apparition-haut mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {tables.map((t) => (
          <Carte key={t.type} className="flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold text-adm-sombre">{t.libelle}</p>
              <p className="text-[12px] text-adm-gris">{t.nb.toLocaleString("fr-FR")} ligne{t.nb > 1 ? "s" : ""}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <a
                href={`/api/admin/export?type=${t.type}&format=csv`}
                download
                title="Télécharger en CSV (Excel)"
                className="inline-flex size-9 items-center justify-center rounded-champ border border-bordure bg-white text-adm-gris transition hover:border-primaire hover:text-primaire-texte active:scale-95"
              >
                <FileSpreadsheet className="size-4" aria-hidden />
                <span className="sr-only">CSV {t.libelle}</span>
              </a>
              <a
                href={`/api/admin/export?type=${t.type}&format=json`}
                download
                title="Télécharger en JSON"
                className="inline-flex size-9 items-center justify-center rounded-champ border border-bordure bg-white text-adm-gris transition hover:border-primaire hover:text-primaire-texte active:scale-95"
              >
                <FileJson className="size-4" aria-hidden />
                <span className="sr-only">JSON {t.libelle}</span>
              </a>
            </div>
          </Carte>
        ))}
      </div>

      <p className="animate-apparition-haut mt-6 flex items-start gap-2 text-[13px] leading-5 text-encre">
        <Database className="mt-0.5 size-4 shrink-0 text-primaire" aria-hidden />
        Chaque téléchargement est consigné dans le journal d'audit (action EXPORT_COMPLET ou EXPORT_TABLE, avec la date et votre compte).
        Dernière page vue : {formatteDate(new Date())}.
      </p>
    </div>
  );
}
