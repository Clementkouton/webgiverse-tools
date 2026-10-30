// components/prompts/bloc-contenu-prompt.tsx
// Lot 17 — bloc du contenu d'un prompt avec contrôle d'accès intégré.
// · Abonné Premium actif (Pro / Entreprise) : le prompt complet est
//   affiché (police mono, comme un éditeur de code) + bouton « Copier ».
// · Visiteur non connecté ou plan Découverte : les premières lignes
//   restent visibles mais FLOUTÉES et non sélectionnables, avec un
//   écran de déverrouillage au dégradé de marque (même vocabulaire que
//   le lecteur de tutoriels). Le prompt n'est JAMAIS envoyé en clair :
//   côté serveur, la page ne rend le contenu réel que si premium.
import Link from "next/link";
import { Lock, LogIn, Sparkles } from "lucide-react";
import { Bouton } from "@/components/ui/bouton";
import { BoutonCopier } from "@/components/commun/bouton-copier";

const EXTRAIT_LIGNES = 14; // lignes floutées visibles en aperçu

export function BlocContenuPrompt({
  contenu,
  premium,
  connecte,
  slug,
}: {
  contenu: string;
  premium: boolean;
  connecte: boolean;
  slug: string;
}) {
  // Aperçu : on tronque CÔTÉ SERVEUR pour les non-abonnés — même si le
  // texte est flouté, on n'expédie au navigateur qu'un extrait court.
  const apercu = premium ? contenu : contenu.split("\n").slice(0, EXTRAIT_LIGNES).join("\n");

  return (
    <div className="relative overflow-hidden rounded-carte border border-bordure bg-bleu shadow-carte">
      <pre
        aria-hidden={!premium}
        className={
          "overflow-x-auto p-5 font-mono text-[13px] leading-6 whitespace-pre-wrap text-white/90 sm:p-6" +
          (premium ? "" : " select-none blur-[5px]")
        }
      >
        {apercu}
      </pre>

      {!premium && (
        <div className="absolute inset-0 grid place-items-center bg-bleu/80">
          <div className="max-w-md px-6 py-8 text-center text-white">
            <Lock className="mx-auto size-10" aria-hidden />
            <h2 className="mt-4 font-titre text-[20px] leading-7 font-bold">
              {connecte ? "Réservé aux abonnés Premium" : "Connecte-toi pour lire ce prompt"}
            </h2>
            <p className="mx-auto mt-2 text-[14px] leading-6 opacity-90">
              {connecte
                ? "La lecture et la copie des prompts complets sont incluses dans les plans Pro et Entreprise. Passe Premium pour débloquer « tout le catalogue »."
                : "La bibliothèque se parcours librement, mais la lecture et la copie des prompts sont réservées aux abonnés Premium (Pro ou Entreprise)."}
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              {connecte ? (
                <Bouton asChild variante="secondaire">
                  <Link href="/tarifs">
                    <Sparkles aria-hidden /> Passer Premium
                  </Link>
                </Bouton>
              ) : (
                <>
                  <Bouton asChild variante="secondaire">
                    <Link href={`/connexion?suite=/prompts/${slug}`}>
                      <LogIn aria-hidden /> Me connecter
                    </Link>
                  </Bouton>
                  <Bouton asChild>
                    <Link href="/inscription">Créer un compte gratuit</Link>
                  </Bouton>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Barre d'actions de la fiche : copier (Premium) ou pastille verrouillée. */
export function ActionsPrompt({
  contenu,
  premium,
}: {
  contenu: string;
  premium: boolean;
}) {
  if (!premium) {
    return (
      <span className="inline-flex min-h-11 items-center gap-2 self-start rounded-full border border-bordure bg-white px-4 text-[14px] leading-5 font-medium text-encre/70">
        <Lock className="size-4" aria-hidden /> Copie réservée aux Premium
      </span>
    );
  }
  return <BoutonCopier texte={contenu} libelle="Copier le prompt" />;
}