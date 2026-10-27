"use client";

// components/tarifs/bouton-paiement.tsx
// ─────────────────────────────────────────────────────────────────
// Bouton « Choisir Pro / Entreprise » + fenêtre de paiement INTÉGRÉE :
//   1. Le clic ouvre une petite fenêtre : numéro de téléphone
//      (requis par Chariow pour Mobile Money) + pays.
//   2. Appel de NOTRE route serveur /api/paiements/chariow/checkout
//      → renvoie l'URL de paiement Chariow.
//   3. L'URL s'affiche dans une IFRAME de notre site (embed_origins) :
//      le client ne quitte JAMAIS Webgiverse.
//   4. Après paiement, Chariow redirige l'iframe vers notre page
//      /tarifs/retour → on ferme la fenêtre et on emmène le client
//      au tableau de bord (le webhook a déjà activé le Premium).
// ─────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ExternalLink, Loader2, ShieldCheck, X } from "lucide-react";

const PAYS = [
  { code: "BJ", nom: "Bénin (+229)" },
  { code: "CI", nom: "Côte d'Ivoire (+225)" },
  { code: "SN", nom: "Sénégal (+221)" },
  { code: "BF", nom: "Burkina Faso (+226)" },
  { code: "ML", nom: "Mali (+223)" },
  { code: "TG", nom: "Togo (+228)" },
  { code: "NE", nom: "Niger (+227)" },
  { code: "GN", nom: "Guinée (+224)" },
  { code: "CM", nom: "Cameroun (+237)" },
  { code: "GA", nom: "Gabon (+241)" },
  { code: "CG", nom: "Congo (+242)" },
  { code: "CD", nom: "RD Congo (+243)" },
  { code: "MA", nom: "Maroc (+212)" },
  { code: "DZ", nom: "Algérie (+213)" },
  { code: "TN", nom: "Tunisie (+216)" },
  { code: "FR", nom: "France (+33)" },
  { code: "US", nom: "États-Unis (+1)" },
  { code: "GB", nom: "Royaume-Uni (+44)" },
];

type Etape = "ferme" | "telephone" | "paiement" | "fini";

export function BoutonPaiement({
  clePlan,
  libelle,
  className,
}: {
  clePlan: "PRO" | "ENTREPRISE";
  libelle: string;
  className: string;
}) {
  const routeur = useRouter();
  const [etape, setEtape] = useState<Etape>("ferme");
  const [numero, setNumero] = useState("");
  const [codePays, setCodePays] = useState("BJ");
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  const refIframe = useRef<HTMLIFrameElement | null>(null);

  // Détection du retour : toutes les 0,8 s on tente de lire l'URL de
  // l'iframe. Chez Chariow (autre origine) la lecture est interdite →
  // exception silencieuse. Dès que Chariow redirige vers NOTRE page
  // /tarifs/retour (même origine), la lecture réussit → paiement fini.
  useEffect(() => {
    if (etape !== "paiement") return;
    const minuteur = setInterval(() => {
      try {
        const href = refIframe.current?.contentWindow?.location.href;
        if (href && href.includes("/tarifs/retour")) {
          setEtape("fini");
        }
      } catch {
        /* iframe encore chez Chariow : comportement normal */
      }
    }, 800);
    return () => clearInterval(minuteur);
  }, [etape]);

  // Étape « fini » : petit temps de célébration puis tableau de bord.
  useEffect(() => {
    if (etape !== "fini") return;
    const minuteur = setTimeout(() => {
      routeur.push("/dashboard/abonnement?paiement=1");
    }, 1600);
    return () => clearTimeout(minuteur);
  }, [etape, routeur]);

  async function lancerPaiement() {
    setErreur(null);
    setOccupe(true);
    try {
      const reponse = await fetch("/api/paiements/chariow/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: clePlan,
          telephone: numero,
          codePays,
          origine: window.location.origin,
        }),
      });
      const donnees = (await reponse.json().catch(() => null)) as
        | { checkoutUrl?: string; message?: string }
        | null;
      if (!reponse.ok || !donnees?.checkoutUrl) {
        throw new Error(donnees?.message ?? "Impossible de démarrer le paiement.");
      }
      setCheckoutUrl(donnees.checkoutUrl);
      setEtape("paiement");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur inconnue.");
    } finally {
      setOccupe(false);
    }
  }

  function fermer() {
    setEtape("ferme");
    setCheckoutUrl(null);
    setErreur(null);
    setOccupe(false);
  }

  return (
    <>
      <button type="button" onClick={() => setEtape("telephone")} className={className}>
        {libelle}
      </button>

      {etape !== "ferme" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-bleu/60 p-3 backdrop-blur-sm sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Paiement sécurisé"
        >
          <div className="relative max-h-[94vh] w-full max-w-lg overflow-auto rounded-2xl bg-white p-5 shadow-2xl sm:max-w-2xl sm:p-6">
            <button
              type="button"
              onClick={fermer}
              aria-label="Fermer"
              className="absolute top-3 right-3 grid size-9 place-items-center rounded-full text-encre transition hover:bg-gris"
            >
              <X className="size-5" aria-hidden />
            </button>

            {etape === "telephone" && (
              <div>
                <p className="inline-flex items-center gap-1.5 rounded-full border border-violet/30 bg-violet/5 px-3 py-1 text-[12px] leading-4 font-semibold text-violet">
                  <ShieldCheck className="size-3.5" aria-hidden /> Paiement sécurisé — Chariow
                </p>
                <h2 className="mt-3 text-h3 font-semibold">Dernière étape avant le paiement</h2>
                <p className="mt-1.5 text-[14px] leading-5 text-encre">
                  Entre le numéro que tu utiliseras pour payer (Mobile Money ou carte). Il reste
                  sur ton appareil : la suite se passe dans une fenêtre sécurisée, sans quitter
                  Webgiverse.
                </p>

                <label className="mt-5 block text-[13px] leading-4 font-semibold text-bleu">
                  Pays du numéro
                  <select
                    value={codePays}
                    onChange={(e) => setCodePays(e.target.value)}
                    className="mt-1.5 w-full rounded-champ border border-bordure bg-white px-3 py-2.5 text-[15px] text-bleu outline-none focus:border-violet"
                  >
                    {PAYS.map((p) => (
                      <option key={p.code} value={p.code}>
                        {p.nom}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="mt-3 block text-[13px] leading-4 font-semibold text-bleu">
                  Numéro de téléphone (sans l&apos;indicatif)
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={numero}
                    onChange={(e) => setNumero(e.target.value.replace(/[^0-9\s]/g, ""))}
                    placeholder="ex. 97000000"
                    className="mt-1.5 w-full rounded-champ border border-bordure bg-white px-3 py-2.5 text-[15px] text-bleu outline-none focus:border-violet"
                  />
                </label>

                {erreur && (
                  <p className="mt-3 rounded-champ border border-rouge/30 bg-rouge/10 px-3 py-2 text-[13px] leading-4 font-medium text-rouge">
                    {erreur}
                  </p>
                )}

                <button
                  type="button"
                  onClick={lancerPaiement}
                  disabled={occupe || numero.replace(/\s/g, "").length < 6}
                  className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(100deg,#00d1ff,#6a3bff_62%)] px-6 text-[16px] leading-5 font-semibold text-white shadow-[0_2px_12px_rgba(106,59,255,0.28)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {occupe ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden /> Préparation…
                    </>
                  ) : (
                    "Continuer vers le paiement"
                  )}
                </button>
              </div>
            )}

            {etape === "paiement" && checkoutUrl && (
              <div>
                <div className="flex items-center justify-between gap-2 pr-10">
                  <p className="text-[14px] leading-5 font-semibold text-bleu">
                    Finalise ton paiement ci-dessous
                  </p>
                  {/* Secours si la banque bloque l'affichage intégré. */}
                  <a
                    href={checkoutUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[13px] leading-4 font-semibold text-violet hover:underline"
                  >
                    Ouvrir ailleurs <ExternalLink className="size-3.5" aria-hidden />
                  </a>
                </div>
                <iframe
                  ref={refIframe}
                  src={checkoutUrl}
                  title="Paiement sécurisé Chariow"
                  className="mt-3 h-[68vh] w-full rounded-champ border border-bordure bg-white"
                  allow="payment"
                />
                <p className="mt-2 text-center text-[12px] leading-4 text-encre">
                  Ne ferme pas cette fenêtre : elle se refermera toute seule après le paiement.
                </p>
              </div>
            )}

            {etape === "fini" && (
              <div className="flex flex-col items-center py-8 text-center">
                <CheckCircle2 className="size-14 text-violet" aria-hidden />
                <h2 className="mt-4 text-h3 font-semibold">Paiement reçu, merci !</h2>
                <p className="mt-2 flex items-center gap-2 text-[14px] leading-5 text-encre">
                  <Loader2 className="size-4 animate-spin text-violet" aria-hidden />
                  Activation de ton Premium en cours…
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}