// components/assistant/mode-guide.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, RotateCcw, Star } from "lucide-react";
import { Bouton } from "@/components/ui/bouton";
import { Carte } from "@/components/ui/carte";
import { Badge } from "@/components/ui/badge";
import { LogoOutil } from "@/components/commun/logo-outil";
import { basculerFavori } from "@/app/actions/favoris";
import { enregistrerProfil } from "@/app/actions/profil";
import type { Diagnostic, Reco } from "@/lib/assistant/scoring";

const OBJECTIFS = ["Vendre", "Créer du contenu", "Automatiser", "Coder", "Communiquer", "Apprendre", "Gérer"];
const NIVEAUX = ["Débutant", "Intermédiaire", "Avancé"] as const;
const BUDGETS = [
  { valeur: "gratuit", libelle: "Gratuit", aide: "0 € — versions gratuites" },
  { valeur: "petit", libelle: "Petit budget", aide: "jusqu'à 20 €/mois" },
  { valeur: "confort", libelle: "Confort", aide: "sans limite" },
] as const;

const CarteChoix = ({ selectionne, children, ...props }: React.ComponentProps<"button"> & { selectionne: boolean }) => (
  <button {...props} aria-pressed={selectionne}
    className={`min-h-11 rounded-carte border p-4 text-left transition ${
      selectionne ? "border-violet bg-violet/5 shadow-carte" : "border-bordure bg-white hover:border-violet"}`}>
    {children}
  </button>
);

export function ModeGuide() {
  const router = useRouter();
  const [etape, setEtape] = useState(0);
  const [diagnostic, setDiagnostic] = useState<Partial<Diagnostic>>({});
  const [recos, setRecos] = useState<Reco[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [profilsEnregistre, setProfilsEnregistre] = useState(false);

  async function lancer() {
    setEnCours(true); setMessage(null);
    const reponse = await fetch("/api/assistant/guide", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(diagnostic),
    });
    setEnCours(false);
    if (!reponse.ok) { setMessage("Le diagnostic a échoué. Réessaie dans un instant."); return; }
    const donnees = await reponse.json();
    setRecos(donnees.recommandations);
    setMessage(donnees.message);
  }

  function reinitialiser() {
    setEtape(0); setDiagnostic({}); setRecos(null); setMessage(null); setProfilsEnregistre(false);
  }

  if (recos) {
    return (
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-h3 font-semibold">Tes recommandations</h2>
          <Bouton variante="secondaire" taille="sm" onClick={reinitialiser}><RotateCcw aria-hidden /> Refaire le diagnostic</Bouton>
        </div>
        {message && <Carte className="mt-4 p-5 text-encre">{message}</Carte>}
        <div className="mt-4 grid gap-4">
          {recos.map(({ outil, explication }) => (
            <Carte key={outil.slug} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
              <LogoOutil nom={outil.nom} logo={null} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-titre text-[18px] leading-6 font-semibold">{outil.nom}</h3>
                  {outil.gratuit && <Badge variante="gratuit">Gratuit</Badge>}
                  {outil.openSource && <Badge variante="source">Open source</Badge>}
                </div>
                <p className="mesure mt-2 text-[15px] leading-6 text-encre">{explication}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Bouton taille="sm" asChild>
                    <a href={`/outil/${outil.slug}`}>Voir la fiche <ArrowRight aria-hidden /></a>
                  </Bouton>
                  <Bouton taille="sm" variante="secondaire"
                    onClick={async () => {
                      if (!outil.id) return;
                      const r = await basculerFavori(outil.id);
                      if (!r.ok && r.raison === "non-connecte") router.push("/connexion?suite=/assistant");
                    }}>
                    <Star aria-hidden /> Ajouter aux favoris
                  </Bouton>
                </div>
              </div>
            </Carte>
          ))}
        </div>
        <Bouton variante="fantome" className="mt-6"
          onClick={async () => {
            const r = await enregistrerProfil(diagnostic.objectif!, diagnostic.niveau!, diagnostic.budget!);
            if (!r.succes && r.erreur === "non-connecte") router.push("/connexion?suite=/assistant");
            else setProfilsEnregistre(true);
          }}>
          {profilsEnregistre ? "Profil enregistré dans ton espace ✔" : "Enregistrer ce diagnostic dans mon profil"}
        </Bouton>
      </div>
    );
  }

  return (
    <div>
      <p className="text-legende text-encre">Étape {etape + 1} sur 3</p>
      {etape === 0 && (
        <fieldset className="mt-2">
          <legend className="text-h3 font-semibold">Quel est ton objectif principal ?</legend>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {OBJECTIFS.map((o) => (
              <CarteChoix key={o} selectionne={diagnostic.objectif === o}
                onClick={() => { setDiagnostic((d) => ({ ...d, objectif: o })); setEtape(1); }}>
                <span className="font-titre text-[16px] leading-6 font-semibold">{o}</span>
              </CarteChoix>
            ))}
          </div>
        </fieldset>
      )}
      {etape === 1 && (
        <fieldset className="mt-2">
          <legend className="text-h3 font-semibold">Ton niveau technique ?</legend>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {NIVEAUX.map((n) => (
              <CarteChoix key={n} selectionne={diagnostic.niveau === n}
                onClick={() => { setDiagnostic((d) => ({ ...d, niveau: n })); setEtape(2); }}>
                <span className="font-titre text-[16px] leading-6 font-semibold">{n}</span>
              </CarteChoix>
            ))}
          </div>
        </fieldset>
      )}
      {etape === 2 && (
        <fieldset className="mt-2">
          <legend className="text-h3 font-semibold">Ton budget mensuel ?</legend>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {BUDGETS.map((b) => (
              <CarteChoix key={b.valeur} selectionne={diagnostic.budget === b.valeur}
                onClick={() => setDiagnostic((d) => ({ ...d, budget: b.valeur }))}>
                <span className="block font-titre text-[16px] leading-6 font-semibold">{b.libelle}</span>
                <span className="text-legende text-encre">{b.aide}</span>
              </CarteChoix>
            ))}
          </div>
          <Bouton className="mt-6" disabled={!diagnostic.budget || enCours} onClick={lancer}>
            {enCours ? "Analyse…" : "Obtenir mes recommandations"} <ArrowRight aria-hidden />
          </Bouton>
        </fieldset>
      )}
      {message && <p className="mt-4 text-red-600">{message}</p>}
    </div>
  );
}