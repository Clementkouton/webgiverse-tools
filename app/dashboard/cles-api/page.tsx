// app/dashboard/cles-api/page.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 57 — idée 21 : « Clés d'API » (page du titulaire ou du membre
// avec l'avantage Entreprise). Créer une clé (elle s'affiche une
// seule fois), voir son usage (préfixe + dernière utilisation),
// révoquer une clé. La documentation d'usage de la route
// GET /api/v1/listes est en bas de page.
// Style identique au reste du dashboard (convention ③).
// Défensif : si la table CleApi n'existe pas encore (migration du
// lot 58 pas passée), une carte rouge l'explique — jamais de crash.
// ─────────────────────────────────────────────────────────────────
import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound, ShieldCheck } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PortailConnexion } from "@/components/auth/portail-connexion";
import { Carte } from "@/components/ui/carte";
import { Bouton } from "@/components/ui/bouton";
import { Badge } from "@/components/ui/badge";
import { BoutonConfirmer } from "@/components/commun/bouton-confirmer";
import FormulaireCleApi from "@/components/dashboard/formulaire-cle-api";
import { revoquerCleFormulaire } from "@/app/actions/cles-api";

export const metadata: Metadata = { title: "Clés d'API" };

const formateurDate = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
});

const MESSAGES: Record<string, { texte: string; type: "succes" | "erreur" }> = {
  revoquee: { texte: "Clé révoquée : elle est refusée immédiatement par l'API.", type: "succes" },
  introuvable: { texte: "Clé introuvable (elle a peut-être déjà été révoquée).", type: "erreur" },
  base: {
    texte: "La base n'est pas à jour : la table CleApi doit être créée (migration du lot 58, voir le LISEZ-MOI).",
    type: "erreur",
  },
};

export default async function ClesApiPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) return <PortailConnexion />;
  const { message } = await searchParams;
  const messageActif = message ? MESSAGES[message] : undefined;
  const userId = session.user.id;

  // Avantage Entreprise = titulaire ENTREPRISE actif OU membre d'équipe.
  let avantage = false;
  try {
    const abonnement = await prisma.abonnement.findUnique({
      where: { utilisateurId: userId },
      select: { plan: true, statut: true, expireLe: true },
    });
    if (
      abonnement &&
      abonnement.plan === "ENTREPRISE" &&
      abonnement.statut === "ACTIF" &&
      abonnement.expireLe > new Date()
    ) {
      avantage = true;
    } else {
      const siege = await prisma.membreEntreprise.findFirst({
        where: { membreId: userId },
        select: { id: true },
      });
      avantage = Boolean(siege);
    }
  } catch {
    avantage = false;
  }

  // ── Vue non-Entreprise : porte vers le plan ──
  if (!avantage) {
    return (
      <div className="mx-auto max-w-3xl py-10">
        <Carte className="p-8 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-gris">
            <KeyRound className="size-7 text-sky-500" aria-hidden />
          </div>
          <h1 className="text-h3 mt-4 font-semibold">Les clés d&apos;API sont réservées au plan Entreprise</h1>
          <p className="mesure mx-auto mt-2 max-w-md text-[14px] leading-6 text-encre">
            Avec le plan Entreprise, tu génères des clés de lecture pour
            récupérer tes listes Webgiverse dans un script, un tableur ou un
            outil d&apos;automatisation — en lecture seule, sans exposer ton
            mot de passe.
          </p>
          <div className="mt-5">
            <Bouton asChild>
              <Link href="/tarifs">Découvrir le plan Entreprise</Link>
            </Bouton>
          </div>
        </Carte>
      </div>
    );
  }

  // ── Vue autorisée : chargement défensif ──
  let accesBase = true;
  let cles: {
    id: string;
    nom: string;
    prefixe: string;
    derniereUtilisation: Date | null;
    creeLe: Date;
    revoqueeLe: Date | null;
  }[] = [];
  try {
    cles = await prisma.cleApi.findMany({
      where: { userId },
      orderBy: { creeLe: "desc" },
      select: {
        id: true,
        nom: true,
        prefixe: true,
        derniereUtilisation: true,
        creeLe: true,
        revoqueeLe: true,
      },
    });
  } catch (erreur) {
    console.error("Clés d'API (chargement) :", erreur);
    accesBase = false;
  }

  const nbActives = cles.filter((c) => !c.revoqueeLe).length;

  return (
    <div className="mx-auto max-w-3xl py-10">
      {/* ── En-tête ──────────────────────────────────────────────── */}
      <header>
        <h1 className="text-h2 font-semibold">Clés d&apos;API</h1>
        <p className="mesure mt-2 text-[14px] leading-6 text-encre">
          Une clé permet de lire tes listes depuis un script :
          <code className="mx-1 rounded bg-gris px-1.5 py-0.5 font-mono text-[13px]">
            GET /api/v1/listes
          </code>
          avec l&apos;en-tête
          <code className="mx-1 rounded bg-gris px-1.5 py-0.5 font-mono text-[13px]">
            Authorization: Bearer wg_…
          </code>
          Lecture seule : rien ne peut être modifié via l&apos;API.
        </p>
      </header>

      {/* ── Carte de message ─────────────────────────────────────── */}
      {messageActif && (
        <Carte
          className={`mt-6 p-4 ${
            messageActif.type === "succes"
              ? "border-emerald-300 bg-emerald-50"
              : "border-red-300 bg-red-50"
          }`}
        >
          <p
            className={`text-[14px] leading-6 ${
              messageActif.type === "succes" ? "text-emerald-800" : "text-red-700"
            }`}
          >
            {messageActif.texte}
          </p>
        </Carte>
      )}

      {accesBase ? (
        <>
          {/* ── Créer une clé ────────────────────────────────────── */}
          <Carte className="mt-6 p-6">
            <div className="flex items-center gap-2">
              <KeyRound className="size-5 text-sky-500" aria-hidden />
              <h2 className="text-h3 font-semibold">
                Créer une clé ({nbActives} active{nbActives > 1 ? "s" : ""} sur 5)
              </h2>
            </div>
            <p className="mesure mt-2 text-[14px] leading-6 text-encre">
              La clé complète s&apos;affiche une seule fois à sa création : copie-la
              immédiatement, seul son préfixe restera visible ensuite.
            </p>
            <div className="mt-4">
              <FormulaireCleApi />
            </div>
          </Carte>

          {/* ── Mes clés ─────────────────────────────────────────── */}
          <Carte className="mt-6 p-6">
            <h2 className="text-h3 font-semibold">Mes clés ({cles.length})</h2>
            {cles.length === 0 ? (
              <p className="mt-4 text-[14px] leading-6 text-encre">
                Aucune clé pour le moment. Crée ta première clé ci-dessus pour
                commencer à brancher tes scripts.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-bordure">
                {cles.map((cle) => (
                  <li key={cle.id} className="flex flex-wrap items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-titre text-[15px] leading-5 font-semibold">
                          {cle.nom}
                        </span>
                        <Badge variante={cle.revoqueeLe ? "defaut" : "source"}>
                          {cle.revoqueeLe ? "Révoquée" : "Active"}
                        </Badge>
                      </div>
                      <p className="text-legende mt-0.5 text-encre">
                        Préfixe{" "}
                        <code className="rounded bg-gris px-1.5 py-0.5 font-mono text-[12px]">
                          {cle.prefixe}…
                        </code>{" "}
                        · créée le {formateurDate.format(cle.creeLe)}
                        {cle.derniereUtilisation
                          ? ` · dernière utilisation le ${formateurDate.format(cle.derniereUtilisation)}`
                          : " · jamais utilisée"}
                      </p>
                    </div>
                    {!cle.revoqueeLe && (
                      <form action={revoquerCleFormulaire}>
                        <input type="hidden" name="cleId" value={cle.id} />
                        <BoutonConfirmer
                          type="submit"
                          message={`Révoquer la clé « ${cle.nom} » ? Les scripts qui l'utilisent seront refusés immédiatement.`}
                          aria-label={`Révoquer la clé ${cle.nom}`}
                          className="rounded-full px-3 py-1.5 text-[13px] font-semibold text-encre hover:bg-gris hover:text-red-600"
                        >
                          Révoquer
                        </BoutonConfirmer>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Carte>

          {/* ── Documentation d'usage ────────────────────────────── */}
          <Carte className="mt-6 p-6">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-sky-500" aria-hidden />
              <h2 className="text-h3 font-semibold">Utiliser ta clé</h2>
            </div>
            <p className="mesure mt-2 text-[14px] leading-6 text-encre">
              Exemple de requête (remplace{" "}
              <code className="rounded bg-gris px-1.5 py-0.5 font-mono text-[13px]">
                wg_LA_CLE
              </code>{" "}
              par la clé copiée à sa création) :
            </p>
            <pre className="mt-3 overflow-x-auto rounded-champ border border-bordure bg-gris/40 p-4 font-mono text-[13px] leading-5 text-encre">
{`curl "https://webgiverse.com/api/v1/listes" \\
  -H "Authorization: Bearer wg_LA_CLE"`}
            </pre>
            <p className="mesure mt-3 text-[14px] leading-6 text-encre">
              La réponse est du JSON :{" "}
              <code className="rounded bg-gris px-1.5 py-0.5 font-mono text-[13px]">
                nbListes
              </code>
              , puis pour chaque liste son nom, son nombre d&apos;outils et le détail
              des outils (nom, slug, url, tarif). En local, remplace le domaine
              par{" "}
              <code className="rounded bg-gris px-1.5 py-0.5 font-mono text-[13px]">
                http://localhost:3000
              </code>
              .
            </p>
          </Carte>
        </>
      ) : (
        // ── Table absente : carte rouge (même patron que « Mon équipe ») ──
        <Carte className="mt-6 border-red-300 bg-red-50 p-6">
          <div className="flex items-start gap-3">
            <KeyRound className="mt-0.5 size-5 shrink-0 text-red-600" aria-hidden />
            <div>
              <p className="text-[15px] leading-6 font-semibold text-red-800">
                La base n&apos;est pas encore à jour
              </p>
              <p className="mt-1 text-[14px] leading-6 text-red-700">
                La table « CleApi » n&apos;existe pas encore : ouvre le SQL Editor
                de Neon et exécute le fichier
                prisma/migration-sieges-equipe.sql du lot 58 (100 % idempotent,
                aucune donnée n&apos;est touchée). Cette carte disparaîtra d&apos;elle-même.
              </p>
            </div>
          </div>
        </Carte>
      )}
    </div>
  );
}