"use client";

// components/dashboard/cloche-notifications.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 20 — cloche des notifications in-app (topbar Metis).
//   • Pastille violette avec le nombre de notifications non lues.
//   • Clic : menu déroulant avec les 20 dernières notifications
//     (point violet = non lue). Clic sur une notification :
//     marquée comme lue + redirection vers son lien.
//   • « Tout marquer comme lu » + fermeture au clic extérieur / Échap.
//   • Rafraîchissement léger : à l'ouverture + toutes les 60 s.
// ─────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";

type ItemNotification = {
  id: string;
  type: string;
  titre: string;
  message: string;
  lien: string | null;
  lue: boolean;
  creeLe: string;
};

/** Temps écoulé en français : « à l'instant », « il y a 5 min », « il y a 3 j ». */
function tempsEcoule(iso: string): string {
  const date = new Date(iso).getTime();
  if (Number.isNaN(date)) return "";
  const minutes = Math.max(0, Math.floor((Date.now() - date) / 60000));
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const heures = Math.floor(minutes / 60);
  if (heures < 24) return `il y a ${heures} h`;
  const jours = Math.floor(heures / 24);
  if (jours < 30) return `il y a ${jours} j`;
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(
    new Date(iso)
  );
}

export default function ClocheNotifications() {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [items, setItems] = useState<ItemNotification[]>([]);
  const [nonLues, setNonLues] = useState(0);
  const [premierChargement, setPremierChargement] = useState(true);
  const conteneur = useRef<HTMLDivElement | null>(null);

  const charger = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as {
        nonLues?: number;
        items?: ItemNotification[];
      };
      setItems(Array.isArray(data.items) ? data.items : []);
      setNonLues(Number(data.nonLues) || 0);
    } catch {
      // Erreur réseau ignorée : la cloche reste silencieuse.
    } finally {
      setPremierChargement(false);
    }
  }, []);

  // Premier chargement + rafraîchissement toutes les 60 secondes.
  useEffect(() => {
    charger();
    const interval = setInterval(charger, 60_000);
    return () => clearInterval(interval);
  }, [charger]);

  // Fermeture : clic extérieur ou Échap.
  useEffect(() => {
    if (!ouvert) return;
    const clicDehors = (e: MouseEvent) => {
      if (conteneur.current && !conteneur.current.contains(e.target as Node)) {
        setOuvert(false);
      }
    };
    const echap = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOuvert(false);
    };
    document.addEventListener("mousedown", clicDehors);
    document.addEventListener("keydown", echap);
    return () => {
      document.removeEventListener("mousedown", clicDehors);
      document.removeEventListener("keydown", echap);
    };
  }, [ouvert]);

  // Rouvrir = recharger (pour voir les nouveautés tout de suite).
  function basculer() {
    const prochain = !ouvert;
    setOuvert(prochain);
    if (prochain) charger();
  }

  /** Marque une notification comme lue puis navigue vers son lien. */
  async function ouvrirNotification(item: ItemNotification) {
    setOuvert(false);
    if (!item.lue) {
      setNonLues((n) => Math.max(0, n - 1));
      setItems((liste) =>
        liste.map((i) => (i.id === item.id ? { ...i, lue: true } : i))
      );
      try {
        await fetch("/api/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: item.id }),
        });
      } catch {
        // Non bloquant : l'optimiste suffit.
      }
    }
    if (item.lien) router.push(item.lien);
  }

  async function toutMarquerLu() {
    setNonLues(0);
    setItems((liste) => liste.map((i) => ({ ...i, lue: true })));
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toutes: true }),
      });
    } catch {
      // Non bloquant.
    }
  }

  return (
    <div ref={conteneur} className="relative">
      <button
        type="button"
        onClick={basculer}
        aria-label={
          nonLues > 0
            ? `Notifications : ${nonLues} non lue${nonLues > 1 ? "s" : ""}`
            : "Notifications"
        }
        aria-expanded={ouvert}
        className="relative grid size-11 shrink-0 place-items-center rounded-[7px]  not-italic border border-bordure bg-white/70 text-bleu transition hover:bg-white active:scale-95"
      >
        <Bell className="size-5" aria-hidden />
        {nonLues > 0 && (
          <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-[7px]  not-italic bg-violet px-1 text-[10px] leading-none font-bold text-white shadow-sm">
            {nonLues > 9 ? "9+" : nonLues}
          </span>
        )}
      </button>

      {/* Menu déroulant des notifications */}
      {ouvert && (
        <div
          role="dialog"
          aria-label="Mes notifications"
          className="absolute right-0 top-[calc(100%+10px)] z-50 w-[min(360px,calc(100vw-32px))] overflow-hidden rounded-carte border border-bordure bg-white shadow-carte"
        >
          <div className="flex items-center justify-between border-b border-bordure px-4 py-3">
            <p className="font-titre text-[14px] leading-5 font-bold text-bleu">
              Notifications
            </p>
            {nonLues > 0 && (
              <button
                type="button"
                onClick={toutMarquerLu}
                className="text-[12px] leading-4 font-semibold text-sky-500 transition hover:underline"
              >
                Tout marquer comme lu
              </button>
            )}
          </div>

          <div className="max-h-[min(420px,60vh)] overflow-y-auto">
            {premierChargement ? (
              <p className="px-4 py-6 text-center text-[13px] text-encre/60">
                Chargement…
              </p>
            ) : items.length === 0 ? (
              <p className="px-4 py-6 text-center text-[13px] text-encre/60">
                Aucune notification pour l'instant — reviens vite, il se passe
                toujours quelque chose sur Webgiverse ! 🎉
              </p>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => ouvrirNotification(item)}
                  className="flex w-full items-start gap-3 border-b border-bordure/60 px-4 py-3 text-left transition last:border-b-0 hover:bg-gris/60"
                >
                  <span
                    aria-hidden
                    className={`mt-1.5 size-2 shrink-0 rounded-[7px]  not-italic ${
                      item.lue ? "bg-bordure" : "bg-violet"
                    }`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span
                        className={`text-[13px] leading-5 ${
                          item.lue ? "font-semibold text-encre/80" : "font-bold text-bleu"
                        }`}
                      >
                        {item.titre}
                      </span>
                      <span className="shrink-0 text-[11px] leading-4 text-encre/50">
                        {tempsEcoule(item.creeLe)}
                      </span>
                    </span>
                    <span className="mt-0.5 block text-[12px] leading-4 text-encre/70">
                      {item.message}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}