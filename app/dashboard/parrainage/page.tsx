// app/dashboard/parrainage/page.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 35 — « Parrainage » (espace membre) : code d'invitation
// personnel + lien à partager, explication de la récompense
// (14 jours Premium par filleul Premium), suivi des filleuls et
// rattachement tardif via un code.
// ─────────────────────────────────────────────────────────────────
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Gift, Users } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Carte } from "@/components/ui/carte";
import { Badge } from "@/components/ui/badge";
import { Bouton } from "@/components/ui/bouton";
import { BoutonCopier } from "@/components/commun/bouton-copier";
import { assurerCodeParrain } from "@/lib/parrainages";
import { formatteDate } from "@/lib/dates";
import { FormulaireRattachement } from "@/components/dashboard/parrainage-client";

export const metadata: Metadata = {
  title: "Parrainage — Webgiverse Outils IA",
};
export const dynamic = "force-dynamic";

export default async function PageParrainage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion?suite=/dashboard/parrainage");

  // Garde douce : si la migration n'a pas encore été appliquée,
  // la page s'affiche sans crash.
  let code: string | null = null;
  let filleuls: {
    id: string;
    statut: string;
    joursOfferts: number;
    creeLe: Date;
    filleul: { id: string; name: string | null; email: string };
  }[] = [];
  try {
    code = await assurerCodeParrain(session.user.id);
    filleuls = await prisma.parrainage.findMany({
      where: { parrainId: session.user.id },
      include: { filleul: { select: { id: true, name: true, email: true } } },
      orderBy: { creeLe: "desc" },
    });
  } catch {
    code = null;
  }

  const base = process.env.NEXT_PUBLIC_APP_URL || "https://webgiverse-tools.vercel.app";
  const lien = code ? `${base}/inscription?ref=${code}` : "";
  const recompenses = filleuls.filter((f) => f.statut === "RECOMPENSE");

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      {/* ── Héros parrainage ─────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-carte bg-[linear-gradient(110deg,#0b1b3f_0%,#4326a8_55%,#6a3bff_100%)] p-6 text-white sm:p-10">
        <div
          aria-hidden
          className="animate-flottant-lent pointer-events-none absolute -right-10 -top-10 size-40 rounded-[7px] -skew-x-[18deg] bg-ciel/25 blur-3xl"
        />
        <p className="relative inline-flex items-center gap-2 rounded-[7px] -skew-x-[18deg] border border-white/25 bg-white/10 px-4 py-1.5 text-[13px] leading-4 font-semibold">
          <Gift className="size-4 text-ciel" aria-hidden /> Parrainage Webgiverse
        </p>
        <h1 className="relative mt-4 font-titre text-[26px] leading-8 font-bold sm:text-h2">
          Gagne <span className="text-ciel">14 jours Premium</span> par filleul
        </h1>
        <p className="relative mt-2 max-w-2xl text-[15px] leading-6 text-white/75">
          Partage ton lien : quand ton filleul passe Premium, ses 14 jours de récompense sont
          crédités automatiquement sur ton compte (prolongés après ton abonnement actuel si tu
          es déjà Premium). Ton filleul ne perd rien.
        </p>
      </div>

      {code ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {/* Code + lien */}
          <Carte className="p-5">
            <h2 className="font-titre text-[16px] font-semibold">Ton code d&apos;invitation</h2>
            <p className="mt-3 rounded-champ border border-violet/30 bg-violet/5 px-4 py-3 text-center font-mono text-[24px] font-bold tracking-wider text-violet">
              {code}
            </p>
            <div className="mt-4">
              <p className="mb-2 text-[13px] font-semibold text-bleu">Ton lien à partager</p>
              <BoutonCopier texte={lien} libelle="Copier mon lien d'invitation" />
              <p className="mt-2 break-all text-[12px] leading-4 text-encre">{lien}</p>
            </div>
          </Carte>

          {/* Comment ça marche */}
          <Carte className="p-5">
            <h2 className="font-titre text-[16px] font-semibold">Comment ça marche ?</h2>
            <ol className="mt-3 grid gap-3 text-[14px] leading-6 text-encre">
              <li>
                <strong>1.</strong> Tu partages ton lien (WhatsApp, e-mail, réseaux…).
              </li>
              <li>
                <strong>2.</strong> Ton filleul crée son compte gratuitement via ton lien — il
                apparaît ci-dessous.
              </li>
              <li>
                <strong>3.</strong> Dès qu&apos;il souscrit un plan Premium, +14 jours Premium
                sont crédités automatiquement sur ton compte et tu reçois un e-mail.{" "}
                <Link href="/tarifs" className="font-semibold text-violet hover:underline">
                  Voir les plans →
                </Link>
              </li>
            </ol>
          </Carte>
        </div>
      ) : (
        <Carte className="mt-6 p-5 text-[14px] text-encre">
          La fonctionnalité parrainage n&apos;est pas encore active : la mise à jour de la base
          (db push) doit d&apos;abord être appliquée. Reviens dans un instant.
        </Carte>
      )}

      {/* ── Mes filleuls ─────────────────────────────────────────── */}
      {code && (
        <Carte className="mt-4 p-5">
          <h2 className="flex items-center gap-2 font-titre text-[16px] font-semibold">
            <Users className="size-4 text-violet" aria-hidden /> Mes filleuls ({filleuls.length})
          </h2>
          <ul className="mt-3 grid gap-2">
            {filleuls.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 rounded-champ bg-gris px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-bleu">
                    {f.filleul.name || "Sans nom"}
                  </p>
                  <p className="truncate text-[13px] text-encre">
                    Inscrit le {formatteDate(f.creeLe)}
                  </p>
                </div>
                {f.statut === "RECOMPENSE" ? (
                  <Badge variante="nouveau">
                    🎉 Premium — +{f.joursOfferts} jours crédités
                  </Badge>
                ) : (
                  <Badge>En attente de Premium</Badge>
                )}
              </li>
            ))}
            {filleuls.length === 0 && (
              <li className="text-[14px] text-encre">
                Personne encore — partage ton lien pour lancer ton premier parrainage !
              </li>
            )}
          </ul>
          {recompenses.length > 0 && (
            <p className="mt-3 text-[13px] leading-5 text-encre">
              🎁 {recompenses.length} filleul(s) Premium = {recompenses.reduce((s, r) => s + r.joursOfferts, 0)}{" "}
              jours de Premium offerts au total.
            </p>
          )}
        </Carte>
      )}

      {/* ── Rattachement tardif ──────────────────────────────────── */}
      {code && (
        <FormulaireRattachement />
      )}
    </div>
  );
}
