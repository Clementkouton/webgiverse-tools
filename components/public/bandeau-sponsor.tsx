// components/public/bandeau-sponsor.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 35 — Bandeau « À la une » sponsorisé (accueil ou catégorie).
// Client : va chercher le sponsor actif via /api/sponsors/actif — la
// requête compte l'impression. Aucun rendu si aucun sponsor : zéro
// impact visuel. Fonctionne aussi dans les pages ISR (catégories).
// ─────────────────────────────────────────────────────────────────
"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Megaphone } from "lucide-react";

type SponsorPublic = {
  id: string;
  titre: string;
  description: string;
  urlTracking: string;
  imageUrl: string | null;
};

export function BandeauSponsor({
  emplacement,
  categorieSlug,
}: {
  emplacement: "ACCUEIL" | "CATEGORIE";
  categorieSlug?: string;
}) {
  const [sponsor, setSponsor] = useState<SponsorPublic | null>(null);
  const [charge, setCharge] = useState(false);

  useEffect(() => {
    let annule = false;
    const parametres = new URLSearchParams({ emplacement });
    if (categorieSlug) parametres.set("categorie", categorieSlug);
    fetch(`/api/sponsors/actif?${parametres.toString()}`)
      .then((r) => r.json())
      .then((d: { sponsor: SponsorPublic | null }) => {
        if (!annule) {
          setSponsor(d.sponsor);
          setCharge(true);
        }
      })
      .catch(() => setCharge(true));
    return () => {
      annule = true;
    };
  }, [emplacement, categorieSlug]);

  if (!charge || !sponsor) return null;

  return (
    <section aria-label="Espace sponsorisé" className="bg-white py-6">
      <div className="mx-auto max-w-7xl px-4">
        <a
          href={sponsor.urlTracking}
          rel="nofollow sponsored"
          className="group flex flex-col gap-3 rounded-carte border border-violet/25 bg-[linear-gradient(110deg,#f7f5ff,#ffffff_55%)] p-5 shadow-carte transition hover:border-violet sm:flex-row sm:items-center"
        >
          {sponsor.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={sponsor.imageUrl}
              alt=""
              className="h-14 w-14 shrink-0 rounded-champ object-cover"
              loading="lazy"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="inline-flex items-center gap-1.5 rounded-[7px] -skew-x-[18deg] border border-violet/30 bg-violet/5 px-3 py-0.5 text-[11px] leading-4 font-bold uppercase tracking-wide text-violet">
              <Megaphone className="size-3" aria-hidden /> À la une — sponsorisé
            </p>
            <h2 className="mt-1.5 truncate font-titre text-[17px] leading-6 font-semibold text-bleu group-hover:text-violet">
              {sponsor.titre}
            </h2>
            {sponsor.description && (
              <p className="mt-0.5 line-clamp-2 text-[14px] leading-5 text-encre">
                {sponsor.description}
              </p>
            )}
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-[7px] -skew-x-[18deg] bg-violet px-4 py-2 text-[14px] leading-4 font-semibold text-white transition group-hover:bg-violet-clair sm:self-center">
            Découvrir <ExternalLink className="size-4" aria-hidden />
          </span>
        </a>
      </div>
    </section>
  );
}
