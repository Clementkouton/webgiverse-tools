"use client";

// Lot 55 — bloc de partage enrichi des privilèges Entreprise :
//   • bascule de partage public + lien + boutons réseaux sociaux (existant) ;
//   • QR code téléchargeable du lien public (idée 18) ;
//   • compteur de vues de la liste (idée 14) ;
//   • lien personnalisé /listes/mon-agence (idée 13, Entreprise) ;
//   • personnalisation de la page publique : logo + description
//     (idée 16, Entreprise).
// La signature du composant ne change pas : <BoutonPartageListe listeId=… />
import { useCallback, useEffect, useState } from "react";

const stylePill =
  "inline-flex items-center rounded-full border border-bordure bg-white px-3 py-1.5 text-xs font-medium text-encre transition hover:border-sky-500 hover:text-sky-500";

const styleAction =
  "inline-flex items-center rounded-full bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-500-700 disabled:opacity-60";

const styleChamp =
  "w-full rounded-champ border border-bordure bg-white px-3 py-2 text-sm text-encre placeholder:text-encre/40 focus:border-sky-500 focus:outline-none";

export function LienPartage({ url, texte }: { url: string; texte: string }) {
  const [copie, setCopie] = useState(false);

  const urlX = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    texte
  )}&url=${encodeURIComponent(url)}`;
  const urlWa = `https://wa.me/?text=${encodeURIComponent(`${texte} ${url}`)}`;
  const urlLi = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
    url
  )}`;

  async function copier() {
    try {
      await navigator.clipboard.writeText(url);
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    } catch {
      // clipboard indisponible
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => window.open(urlX, "_blank")}
        className={stylePill}
      >
        Partager sur X
      </button>
      <button
        type="button"
        onClick={() => window.open(urlWa, "_blank")}
        className={stylePill}
      >
        WhatsApp
      </button>
      <button
        type="button"
        onClick={() => window.open(urlLi, "_blank")}
        className={stylePill}
      >
        LinkedIn
      </button>
      <button
        type="button"
        onClick={copier}
        className={styleAction}
      >
        {copie ? "Lien copié !" : "Copier le lien"}
      </button>
    </div>
  );
}

export default function BoutonPartageListe({ listeId }: { listeId: string }) {
  const [charge, setCharge] = useState(false);
  const [publique, setPublique] = useState<boolean | null>(null);
  const [slug, setSlug] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  // Lot 55 — état enrichi
  const [vues, setVues] = useState(0);
  const [entreprise, setEntreprise] = useState(false);
  const [qr, setQr] = useState<string | null>(null);

  // (Entreprise) lien personnalisé
  const [slugPerso, setSlugPerso] = useState("");
  const [messageSlug, setMessageSlug] = useState<string | null>(null);
  const [slugEnCours, setSlugEnCours] = useState(false);

  // (Entreprise) page en-marque
  const [marqueOuvert, setMarqueOuvert] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [descriptionPartage, setDescriptionPartage] = useState("");
  const [messageMarque, setMessageMarque] = useState<string | null>(null);
  const [marqueEnCours, setMarqueEnCours] = useState(false);

  // QR code du lien public, régénéré dès que le lien change.
  const chargerQr = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/listes/qr?listeId=${encodeURIComponent(listeId)}`
      );
      const d = await res.json();
      if (res.ok && d?.qrDataUrl) {
        setQr(d.qrDataUrl);
      } else {
        setQr(null);
      }
    } catch {
      // QR indisponible : on l'ignore silencieusement.
      setQr(null);
    }
  }, [listeId]);

  // État du partage au montage (vues + privilèges Entreprise inclus).
  useEffect(() => {
    let vivant = true;
    (async () => {
      try {
        const res = await fetch(
          `/api/listes/etat?listeId=${encodeURIComponent(listeId)}`
        );
        const d = await res.json();
        if (!vivant || !res.ok) return;
        setPublique(Boolean(d.publique));
        setSlug(d.slug ?? null);
        setVues(Number(d.vues ?? 0));
        setEntreprise(Boolean(d.entreprise));
        setSlugPerso(d.slug ?? "");
        setLogoUrl(d.logoUrl ?? "");
        setDescriptionPartage(d.descriptionPartage ?? "");
      } catch {
        // État indisponible : le bouton de bascule reste fonctionnel.
      }
    })();
    return () => {
      vivant = false;
    };
  }, [listeId]);

  useEffect(() => {
    if (publique && slug) {
      chargerQr();
    } else {
      setQr(null);
    }
  }, [publique, slug, chargerQr]);

  async function basculer() {
    if (charge) return;
    setCharge(true);
    setErreur(null);

    try {
      const res = await fetch("/api/listes/partage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listeId }),
      });

      const d = await res.json();
      if (!res.ok) {
        setErreur(d?.erreur ?? "Une erreur est survenue.");
        return;
      }

      setPublique(Boolean(d.publique));
      setSlug(d.slug ?? null);
      if (d.slug) setSlugPerso(String(d.slug));
    } catch {
      setErreur("Impossible de contacter le serveur.");
    } finally {
      setCharge(false);
    }
  }

  async function enregistrerSlug() {
    if (slugEnCours) return;
    setSlugEnCours(true);
    setMessageSlug(null);

    try {
      const res = await fetch("/api/listes/slug", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listeId, slug: slugPerso }),
      });
      const d = await res.json();
      if (!res.ok) {
        setMessageSlug(d?.erreur ?? "Impossible d'enregistrer le lien.");
        return;
      }
      setSlug(d.slug ?? null);
      setMessageSlug("Lien personnalisé enregistré !");
    } catch {
      setMessageSlug("Impossible de contacter le serveur.");
    } finally {
      setSlugEnCours(false);
    }
  }

  async function enregistrerMarque() {
    if (marqueEnCours) return;
    setMarqueEnCours(true);
    setMessageMarque(null);

    try {
      const res = await fetch("/api/listes/marque", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listeId, logoUrl, descriptionPartage }),
      });
      const d = await res.json();
      if (!res.ok) {
        setMessageMarque(d?.erreur ?? "Impossible d'enregistrer.");
        return;
      }
      setMessageMarque("Page personnalisée enregistrée !");
    } catch {
      setMessageMarque("Impossible de contacter le serveur.");
    } finally {
      setMarqueEnCours(false);
    }
  }

  const lienPublic =
    publique && slug && typeof window !== "undefined"
      ? `${window.location.origin}/listes/${slug}`
      : null;

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={basculer}
        disabled={charge}
        className={`text-xs font-medium transition disabled:opacity-60 ${
          publique ? "text-red-600 hover:underline" : "text-sky-500 hover:underline"
        }`}
      >
        {charge
          ? "Chargement..."
          : publique
            ? "Arrêter le partage public"
            : "Partager cette liste publiquement"}
      </button>

      {publique && slug && lienPublic && (
        <>
          <div className="mt-2 rounded-champ border border-bordure bg-gris p-3">
            <p className="mb-2 break-all text-xs text-encre/60">
              Lien public : {lienPublic}
            </p>
            <LienPartage
              url={lienPublic}
              texte="Découvrez ma sélection d'outils IA sur Webgiverse"
            />
          </div>

          {qr && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <img
                src={qr}
                alt="QR code du lien de partage"
                className="h-20 w-20 rounded-champ border border-bordure bg-white"
              />
              <a href={qr} download={`qr-liste-${slug}.png`} className={stylePill}>
                Télécharger le QR code
              </a>
            </div>
          )}

          <p className="mt-2 text-xs text-encre/60">
            Cette liste a été vue {vues} fois.
          </p>
        </>
      )}

      {entreprise && publique && slug && (
        <div className="mt-4 rounded-carte border border-bordure bg-white p-3">
          <p className="mb-2 text-xs font-semibold text-encre">
            Lien personnalisé <span aria-hidden>👑</span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-encre/50">/listes/</span>
            <input
              type="text"
              value={slugPerso}
              onChange={(e) => setSlugPerso(e.target.value)}
              placeholder="mon-agence"
              maxLength={40}
              className={`${styleChamp} max-w-48 flex-1`}
              aria-label="Lien personnalisé de la liste"
            />
            <button
              type="button"
              onClick={enregistrerSlug}
              disabled={slugEnCours}
              className={styleAction}
            >
              {slugEnCours ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
          <p className="mt-1 text-[11px] text-encre/50">
            3 à 40 caractères : minuscules, chiffres et tirets.
          </p>
          {messageSlug && (
            <p className="mt-1 text-xs text-sky-500">{messageSlug}</p>
          )}
        </div>
      )}

      {entreprise && publique && slug && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setMarqueOuvert((ouvert) => !ouvert)}
            className="text-xs font-medium text-sky-500 transition hover:underline"
          >
            {marqueOuvert
              ? "Masquer la personnalisation"
              : "Personnaliser ma page (logo, description)"}
          </button>

          {marqueOuvert && (
            <div className="mt-2 space-y-2 rounded-carte border border-bordure bg-white p-3">
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="Lien du logo (https://exemple.com/logo.png)"
                className={styleChamp}
                aria-label="Lien du logo de la page publique"
              />
              <textarea
                value={descriptionPartage}
                onChange={(e) => setDescriptionPartage(e.target.value)}
                rows={3}
                maxLength={300}
                placeholder="Description affichée sous le titre de ta liste (300 caractères max)…"
                className={styleChamp}
                aria-label="Description de la page publique"
              />
              <button
                type="button"
                onClick={enregistrerMarque}
                disabled={marqueEnCours}
                className={styleAction}
              >
                {marqueEnCours ? "Enregistrement…" : "Enregistrer"}
              </button>
              {messageMarque && (
                <p className="text-xs text-sky-500">{messageMarque}</p>
              )}
            </div>
          )}
        </div>
      )}

      {erreur && <p className="mt-1 text-xs text-red-600">{erreur}</p>}
    </div>
  );
}