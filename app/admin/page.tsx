// app/admin/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Carte } from "@/components/ui/carte";
import { Badge } from "@/components/ui/badge";
import { Bouton } from "@/components/ui/bouton";
import { approuverPropositionFormulaire, refuserPropositionFormulaire } from "@/app/actions/admin";
import { formatteDate } from "@/lib/dates";

export const metadata: Metadata = { title: "Administration" };
export const dynamic = "force-dynamic";

const RACCOURCIS = [
  { href: "/admin/outils/nouveau", libelle: "Ajouter un outil", detail: "Créer une fiche complète", emoji: "➕" },
  { href: "/admin/outils", libelle: "Gérer les outils", detail: "Modifier, publier, supprimer", emoji: "🧰" },
  { href: "/admin/avis", libelle: "Modérer les avis", detail: "Retirer un avis hors-sujet", emoji: "💬" },
  { href: "/admin/utilisateurs", libelle: "Utilisateurs", detail: "Rôles et inscriptions", emoji: "👥" },
];

export default async function PageAdmin() {
  const [
    nbUtilisateurs, nbOutilsPublies, nbOutilsTotal, nbPropositions,
    nbAvis, nbVotes, nbFavoris, nbAbonnes,
    propositions, derniersInscrits, derniersAvis,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.tool.count({ where: { statut: "PUBLIE" } }),
    prisma.tool.count(),
    prisma.toolSubmission.count({ where: { statut: "EN_ATTENTE" } }),
    prisma.avis.count(),
    prisma.vote.count(),
    prisma.favorite.count(),
    prisma.newsletterSubscriber.count(),
    prisma.toolSubmission.findMany({
      orderBy: { createdAt: "desc" }, take: 30, include: { category: true },
    }),
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 5, select: { id: true, name: true, email: true, role: true, createdAt: true } }),
    prisma.avis.findMany({
      orderBy: { majLe: "desc" }, take: 5,
      include: { outil: { select: { nom: true, slug: true } }, utilisateur: { select: { name: true, email: true } } },
    }),
  ]);

  const enAttente = propositions.filter((p) => p.statut === "EN_ATTENTE");

  const STATS = [
    ["Utilisateurs", nbUtilisateurs],
    ["Outils publiés", `${nbOutilsPublies}/${nbOutilsTotal}`],
    ["Propositions en attente", nbPropositions],
    ["Avis publiés", nbAvis],
    ["Votes", nbVotes],
    ["Favoris enregistrés", nbFavoris],
    ["Abonnés newsletter", nbAbonnes],
    ["Conversations IA", await prisma.conversation.count().catch(() => 0)],
  ];

  return (
    <div>
      {/* ── Statistiques ─────────────────────────────────────────────── */}
      <section aria-label="Statistiques du site">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map(([libelle, valeur]) => (
            <Carte key={String(libelle)} className="p-5">
              <p className="text-[28px] leading-9 font-titre font-bold">{valeur}</p>
              <p className="text-legende text-encre">{libelle}</p>
            </Carte>
          ))}
        </div>
      </section>

      {/* ── Raccourcis ───────────────────────────────────────────────── */}
      <section className="mt-10">
        <h2 className="text-h3 font-semibold">Raccourcis</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {RACCOURCIS.map((r) => (
            <Link key={r.href} href={r.href} className="group">
              <Carte className="h-full p-5 transition group-hover:border-violet group-hover:shadow-[0_4px_18px_rgba(106,59,255,0.15)]">
                <p className="text-[22px]" aria-hidden>{r.emoji}</p>
                <p className="mt-2 text-[15px] leading-6 font-semibold text-bleu">{r.libelle}</p>
                <p className="text-[13px] leading-5 text-encre">{r.detail}</p>
              </Carte>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Propositions ─────────────────────────────────────────────── */}
      <section className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-h3 font-semibold">Propositions d'outils</h2>
          {enAttente.length > 0 && <Badge variante="nouveau">{enAttente.length} en attente</Badge>}
        </div>
        <div className="mt-4 grid gap-3">
          {enAttente.map((p) => (
            <Carte key={p.id} className="p-5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-[17px] leading-6 font-titre font-semibold">{p.nom}</h3>
                {p.category && <Badge variante="source">{p.category.nom}</Badge>}
                <span className="text-[13px] text-encre">propose le {formatteDate(p.createdAt)}</span>
              </div>
              <p className="mt-2 text-[14px] leading-5 text-encre">{p.description}</p>
              <p className="mt-1 text-[13px] leading-5 text-encre">
                <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-violet hover:underline">{p.url}</a>
                {p.tarif ? ` · ${p.tarif}` : ""}{p.contact ? ` · ${p.contact}` : ""}
              </p>
              <div className="mt-4 flex gap-2">
                <form action={approuverPropositionFormulaire}>
                  <input type="hidden" name="propositionId" value={p.id} />
                  <Bouton taille="sm" type="submit">Approuver et publier</Bouton>
                </form>
                <form action={refuserPropositionFormulaire}>
                  <input type="hidden" name="propositionId" value={p.id} />
                  <Bouton taille="sm" variante="danger" type="submit">Refuser</Bouton>
                </form>
              </div>
            </Carte>
          ))}
          {enAttente.length === 0 && (
            <Carte className="p-6 text-encre">Aucune proposition en attente. Tout est traité 🎉</Carte>
          )}
        </div>
      </section>

      {/* ── Derniers inscrits + derniers avis ────────────────────────── */}
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-h3 font-semibold">Derniers inscrits</h2>
            <Link href="/admin/utilisateurs" className="text-[14px] font-semibold text-violet hover:underline">Tout voir</Link>
          </div>
          <Carte className="mt-4 divide-y divide-bordure">
            {derniersInscrits.map((u) => (
              <div key={u.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
                <div className="min-w-0">
                  <p className="truncate text-[14px] leading-5 font-semibold text-bleu">{u.name || "Sans nom"}</p>
                  <p className="truncate text-[13px] leading-5 text-encre">{u.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {u.role === "ADMIN" && <Badge variante="source">Admin</Badge>}
                  <span className="text-[13px] text-encre">{formatteDate(u.createdAt)}</span>
                </div>
              </div>
            ))}
            {derniersInscrits.length === 0 && <p className="p-4 text-[14px] text-encre">Aucun inscrit pour l'instant.</p>}
          </Carte>
        </section>

        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-h3 font-semibold">Derniers avis</h2>
            <Link href="/admin/avis" className="text-[14px] font-semibold text-violet hover:underline">Tout voir</Link>
          </div>
          <Carte className="mt-4 divide-y divide-bordure">
            {derniersAvis.map((a) => (
              <div key={a.id} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link href={`/outil/${a.outil.slug}`} className="text-[14px] font-semibold text-violet hover:underline">{a.outil.nom}</Link>
                  <span className="text-[13px] font-semibold text-amber-500">{"★".repeat(a.note)}{"☆".repeat(5 - a.note)}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-encre">{a.contenu}</p>
                <p className="mt-1 text-[12px] text-encre">
                  Par {a.utilisateur.name || a.utilisateur.email} · {formatteDate(a.majLe)}
                </p>
              </div>
            ))}
            {derniersAvis.length === 0 && <p className="p-4 text-[14px] text-encre">Aucun avis publié pour l'instant.</p>}
          </Carte>
        </section>
      </div>
    </div>
  );
}