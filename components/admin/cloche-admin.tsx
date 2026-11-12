// components/admin/cloche-admin.tsx
"use client";
// ─────────────────────────────────────────────────────────────────
// Lot 25 — CLOCHE DES NOTIFICATIONS ADMIN, branchée sur les vrais
// événements calculés côté serveur (app/admin/layout.tsx) :
// propositions en attente, messages de contact, nouveaux avis,
// nouvelles inscriptions, paiements réussis.
// Remplace le simple lien vers /admin/propositions du Lot 22 :
//   • badge corail = nombre total d'événements à traiter ;
//   • menu déroulant : chaque ligne est cliquable (lien direct) ;
//   • fermeture au clic extérieur, à Échap, ou après navigation ;
//   • état vide « tout est à jour ».
// Aucune dépendance, palette TailwindAdmin.
// ─────────────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CreditCard,
  Inbox,
  MessageSquareQuote,
  UserPlus,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type NotificationAdmin = {
  id: string;
  /** proposition | contact | avis | paiement | inscription */
  type: string;
  titre: string;
  message: string;
  lien: string;
};

const ICONES: Record<string, LucideIcon> = {
  proposition: Inbox,
  contact: Wrench,
  avis: MessageSquareQuote,
  paiement: CreditCard,
  inscription: UserPlus,
};

const PASTILLES: Record<string, string> = {
  proposition: "bg-adm-alerte-doux text-[#b26f00]",
  contact: "bg-adm-info-doux text-[#2b6be0]",
  avis: "bg-adm-succes-doux text-[#0f9b85]",
  paiement: "bg-adm-succes-doux text-[#0b8a78]",
  inscription: "bg-primaire/10 text-primaire-texte",
};

export function ClocheAdmin({ notifications }: { notifications: NotificationAdmin[] }) {
  const [ouvert, setOuvert] = useState(false);
  const boiteRef = useRef<HTMLDivElement>(null);
  const chemin = usePathname();
  const total = notifications.length;

  // Ferme après navigation + au clic extérieur + avec Échap
  useEffect(() => setOuvert(false), [chemin]);
  useEffect(() => {
    if (!ouvert) return;
    const clic = (e: MouseEvent) => {
      if (boiteRef.current && !boiteRef.current.contains(e.target as Node)) setOuvert(false);
    };
    const echap = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOuvert(false);
    };
    document.addEventListener("mousedown", clic);
    document.addEventListener("keydown", echap);
    return () => {
      document.removeEventListener("mousedown", clic);
      document.removeEventListener("keydown", echap);
    };
  }, [ouvert]);

  return (
    <div ref={boiteRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        aria-expanded={ouvert}
        aria-label={total > 0 ? `${total} notification(s) admin : ${notifications.map((n) => n.titre).join(", ")}` : "Notifications admin (aucune)"}
        className={cn(
          "relative grid size-10 place-items-center rounded-[7px] -skew-x-[18deg] border border-adm-bordure bg-white transition active:scale-95",
          ouvert ? "border-primaire text-primaire-texte" : "text-adm-sombre hover:bg-adm-fond",
        )}
      >
        <Bell className="size-[18px]" aria-hidden />
        {total > 0 && (
          <span className="absolute -top-1 -right-1 grid min-w-4.5 place-items-center rounded-[7px] -skew-x-[18deg] bg-adm-erreur px-1 py-0.5 text-[10px] leading-3 font-bold text-white ring-2 ring-white">
            {total > 9 ? "9+" : total}
          </span>
        )}
      </button>

      {/* ── Menu déroulant ─────────────────────────────────────────── */}
      <div
        className={cn(
          "absolute right-0 top-12 z-50 w-[340px] max-w-[86vw] origin-top-right overflow-hidden rounded-carte border border-adm-bordure bg-white shadow-[0_18px_50px_rgba(15,23,42,0.16)] transition-all duration-200",
          ouvert ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0",
        )}
        role="menu"
        aria-label="Notifications admin"
      >
        <div className="flex items-center justify-between border-b border-adm-bordure bg-adm-fond/70 px-4 py-2.5">
          <p className="text-[13px] font-bold text-adm-sombre">Notifications</p>
          {total > 0 && (
            <span className="rounded-[7px] -skew-x-[18deg] bg-adm-erreur px-2 py-0.5 text-[10px] font-bold text-white">{total}</span>
          )}
        </div>

        {total === 0 ? (
          <p className="px-4 py-6 text-center text-[13px] leading-5 text-encre">
            Tout est à jour 🎉<br />
            <span className="text-[12px] text-adm-gris">Aucun événement à traiter pour le moment.</span>
          </p>
        ) : (
          <ul className="max-h-[380px] overflow-y-auto">
            {notifications.map((n) => {
              const Icone = ICONES[n.type] ?? Bell;
              return (
                <li key={n.id} className="border-b border-adm-bordure last:border-0">
                  <Link
                    href={n.lien}
                    onClick={() => setOuvert(false)}
                    className="flex items-start gap-3 px-4 py-3 transition hover:bg-adm-fond/80"
                  >
                    <span className={cn("mt-0.5 grid size-8 shrink-0 place-items-center rounded-champ", PASTILLES[n.type] ?? "bg-adm-fond text-adm-gris")}>
                      <Icone className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13.5px] leading-5 font-semibold text-adm-sombre">{n.titre}</span>
                      <span className="mt-0.5 block truncate text-[12.5px] leading-5 text-encre">{n.message}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <div className="border-t border-adm-bordure bg-adm-fond/70 px-4 py-2.5 text-center">
          <Link href="/admin/moderation" onClick={() => setOuvert(false)} className="text-[12.5px] font-semibold text-primaire-texte hover:underline">
            Ouvrir la page de modération →
          </Link>
        </div>
      </div>
    </div>
  );
}
