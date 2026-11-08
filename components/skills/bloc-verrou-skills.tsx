// components/skills/bloc-verrou-skills.tsx
// Lot 38 — bloc « Réservé aux abonnés ». Variantes : "page" (liste) et
// "detail" (fiche). N'est rendu que si accesSkills() refuse l'accès.
import Link from "next/link";
import { Check, Lock, Sparkles } from "lucide-react";
import { Bouton } from "@/components/ui/bouton";

const AVANTAGES = [
  "29 skills analysées et traduites en français",
  "Commande d'installation prête à copier",
  "Reviews complètes avec images et dépôt GitHub",
  "Inclus dans les plans Pro et Entreprise",
];

export function BlocVerrouSkills({
  variante = "page",
  connecte,
}: {
  variante?: "page" | "detail";
  connecte: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-carte border border-violet/30 bg-white shadow-carte">
      {/* Voile décoratif au dégradé de marque, discret */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-1.5 bg-[linear-gradient(100deg,#00d1ff,#6a3bff_62%)]"
      />
      <div
        className={
          variante === "detail"
            ? "flex flex-col items-center gap-4 p-8 text-center sm:p-12"
            : "flex flex-col items-start gap-5 p-6 sm:flex-row sm:items-center sm:gap-8 sm:p-8"
        }
      >
        <span className="grid size-14 shrink-0 place-items-center rounded-carte bg-violet/10">
          <Lock className="size-6 text-violet" aria-hidden />
        </span>
        <div className={variante === "detail" ? "max-w-lg" : "flex-1"}>
          <h2 className="font-titre text-[20px] leading-7 font-bold text-bleu">
            {variante === "detail"
              ? "Cette skill est réservée aux abonnés"
              : "La bibliothèque de Skills est réservée aux abonnés"}
          </h2>
          <p className="mt-2 text-[14px] leading-6 text-encre">
            {connecte
              ? "Passe Premium pour débloquer les 29 skills IA traduites en français : reviews complètes, images, commande d'installation et dépôt GitHub pour chaque skill."
              : "Connecte-toi avec un abonnement Premium (Pro ou Entreprise) pour débloquer les 29 skills IA traduites en français : reviews complètes, images, commande d'installation et dépôt GitHub."}
          </p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {AVANTAGES.map((a) => (
              <li key={a} className="flex items-start gap-2 text-[13px] leading-5 text-encre">
                <Check className="mt-0.5 size-4 shrink-0 text-violet" aria-hidden />
                {a}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
          {!connecte && (
            <Bouton asChild variante="secondaire">
              <Link href="/connexion">Se connecter</Link>
            </Bouton>
          )}
          <Bouton asChild>
            <Link href="/tarifs">
              <Sparkles aria-hidden /> Passer Premium
            </Link>
          </Bouton>
        </div>
      </div>
    </div>
  );
}