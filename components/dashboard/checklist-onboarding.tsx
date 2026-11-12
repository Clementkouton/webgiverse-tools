// components/dashboard/checklist-onboarding.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 20 — ✅ Checklist d'onboarding : jauge « Profil complété à X % »
// avec les 6 étapes du parcours membre. Chaque ligne cochée compte
// pour 1/6 ; les lignes non faites mènent DIRECTEMENT à la page où
// agir (profil, assistant/diagnostic, annuaire, listes, tutoriels).
// Composant serveur : aucun JS client, rendu depuis le dashboard.
// ─────────────────────────────────────────────────────────────────
import Link from "next/link";
import { CheckCircle2, ChevronRight, CircleDashed } from "lucide-react";
import type { ResultatOnboarding } from "@/lib/engagement";
import { Carte } from "@/components/ui/carte";

export function ChecklistOnboarding({ onboarding }: { onboarding: ResultatOnboarding }) {
  const { items, faites, total, pourcentage } = onboarding;
  const toutFait = faites === total;

  return (
    <Carte className="animate-apparition-haut p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-titre text-[17px] leading-6 font-semibold text-bleu">
            Bienvenue à bord 🚀
          </h2>
          <p className="mt-0.5 text-[13px] leading-4 text-encre">
            {toutFait
              ? "Checklist terminée — tu maîtrises ton espace Webgiverse ! 🎉"
              : "6 petites étapes pour tirer le meilleur de ton espace."}
          </p>
        </div>
        {/* Jauge circulaire (SVG statique) */}
        <div className="flex items-center gap-3">
          <svg viewBox="0 0 44 44" className="size-12" role="img" aria-label={`Profil complété à ${pourcentage} %`}>
            <circle cx="22" cy="22" r="18" fill="none" stroke="#e5e9f2" strokeWidth="6" />
            <circle
              cx="22" cy="22" r="18" fill="none"
              stroke="url(#wgv-onb)"
              strokeWidth="6" strokeLinecap="round"
              strokeDasharray={`${(pourcentage / 100) * 113} 113`}
              transform="rotate(-90 22 22)"
            />
            <defs>
              <linearGradient id="wgv-onb" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#00d1ff" />
                <stop offset="100%" stopColor="#6a3bff" />
              </linearGradient>
            </defs>
            <text x="22" y="26" textAnchor="middle" fontSize="11" fontWeight="700" fill="#0b1b3f">
              {pourcentage}%
            </text>
          </svg>
          <p className="text-[13px] leading-4 font-semibold text-bleu">
            Profil complété<br />
            <span className="text-[12px] font-normal text-encre">
              {faites} étape{faites > 1 ? "s" : ""} sur {total}
            </span>
          </p>
        </div>
      </div>

      {/* Barre de progression pleine largeur */}
      <div className="mt-4 h-2 overflow-hidden rounded-[7px] -skew-x-[18deg] not-italic bg-gris">
        <div
          className="barre-progression h-full rounded-[7px] -skew-x-[18deg] not-italic bg-[linear-gradient(90deg,#00d1ff,#6a3bff)]"
          style={{ width: `${pourcentage}%` }}
        />
      </div>

      {/* Étapes */}
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.libelle}>
            <Link
              href={item.href}
              className={`flex items-center gap-2.5 rounded-champ border px-3 py-2.5 transition ${
                item.fait
                  ? "border-emerald-200 bg-emerald-50/60"
                  : "border-bordure bg-white hover:border-violet"
              }`}
            >
              {item.fait ? (
                <CheckCircle2 className="size-4.5 shrink-0 text-emerald-600" aria-hidden />
              ) : (
                <CircleDashed className="size-4.5 shrink-0 text-encre/50" aria-hidden />
              )}
              <span
                className={`min-w-0 flex-1 text-[13px] leading-4 ${
                  item.fait ? "text-encre/70 line-through decoration-emerald-600/40" : "font-medium text-bleu"
                }`}
              >
                {item.libelle}
              </span>
              <span
                className={`inline-flex shrink-0 items-center gap-0.5 text-[11px] leading-4 font-bold ${
                  item.fait ? "text-emerald-600" : "text-violet"
                }`}
              >
                {item.action}
                {!item.fait && <ChevronRight className="size-3.5" aria-hidden />}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Carte>
  );
}
