// components/admin/formulaire-outil.tsx
"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Bouton } from "@/components/ui/bouton";
import { Carte } from "@/components/ui/carte";
import { Champ, Etiquette, ZoneTexte } from "@/components/ui/champ";
import { cn } from "@/lib/utils";
import type { EtatOutil } from "@/app/actions/admin";

export type OutilForme = {
  id: string;
  nom: string;
  slug: string;
  url: string;
  logo: string | null;
  description: string;
  type: "OUTIL" | "AGENT";
  tarif: string;
  tarifMin: number | null;
  gratuit: boolean;
  openSource: boolean;
  misEnAvant: boolean;
  niveau: string;
  langues: string[];
  objectifs: string[];
  fonctions: string[];
  casUsage: string[];
  statut: "BROUILLON" | "PUBLIE" | "ARCHIVE";
  verifie: boolean;
  categories: string[];
};

type Categorie = { id: string; nom: string };
type ActionOutil = (etat: EtatOutil, donnees: FormData) => Promise<EtatOutil>;

/** Même logique que slugifier() côté serveur (lib/utils). */
function slugifierLocal(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function FormulaireOutil({
  action,
  categories,
  outil,
}: {
  action: ActionOutil;
  categories: Categorie[];
  outil?: OutilForme;
}) {
  const [etat, actionFormulaire, enCours] = useActionState(action, null);

  const [nom, setNom] = useState(outil?.nom ?? "");
  const [slug, setSlug] = useState(outil?.slug ?? "");
  const [slugModifie, setSlugModifie] = useState(Boolean(outil));

  const styleErreur = "mt-1 text-[13px] leading-4 text-red-600";
  const boiteCoche =
    "flex items-center gap-3 rounded-champ border border-bordure bg-white px-4 py-3 text-[14px] leading-5 text-bleu cursor-pointer hover:border-violet";

  return (
    <form action={actionFormulaire} noValidate className="grid gap-6">
      {outil && <input type="hidden" name="outilId" value={outil.id} />}

      {etat && !etat.ok && (
        <p role="alert" className="flex items-start gap-2 rounded-carte border border-red-300 bg-red-50 px-4 py-3 text-[14px] font-semibold text-red-700">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {etat.message}
        </p>
      )}

      {/* ── Identité ─────────────────────────────────────────────────── */}
      <Carte className="grid gap-5 p-6">
        <h3 className="text-[16px] font-titre font-semibold">Identité de l'outil</h3>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Etiquette htmlFor="nom">Nom *</Etiquette>
            <Champ
              id="nom"
              name="nom"
              value={nom}
              onChange={(e) => {
                setNom(e.target.value);
                if (!slugModifie) setSlug(slugifierLocal(e.target.value));
              }}
              placeholder="Ex : ChatGPT"
              aria-invalid={Boolean(etat?.erreurs?.nom)}
            />
            {etat?.erreurs?.nom && <p className={styleErreur}>{etat.erreurs.nom}</p>}
          </div>
          <div>
            <Etiquette htmlFor="slug">Slug (adresse) *</Etiquette>
            <Champ
              id="slug"
              name="slug"
              value={slug}
              onChange={(e) => {
                setSlugModifie(true);
                setSlug(e.target.value.toLowerCase());
              }}
              placeholder="ex : chatgpt"
              aria-invalid={Boolean(etat?.erreurs?.slug)}
            />
            <p className="mt-1 text-[12px] leading-4 text-encre">Sert à l'adresse publique : /outil/{slug || "…"}</p>
            {etat?.erreurs?.slug && <p className={styleErreur}>{etat.erreurs.slug}</p>}
          </div>
        </div>

        <div>
          <Etiquette htmlFor="url">URL officielle *</Etiquette>
          <Champ id="url" name="url" type="url" defaultValue={outil?.url} placeholder="https://…" aria-invalid={Boolean(etat?.erreurs?.url)} />
          {etat?.erreurs?.url && <p className={styleErreur}>{etat.erreurs.url}</p>}
        </div>

        <div>
          <Etiquette htmlFor="logo">URL du logo (optionnel)</Etiquette>
          <Champ id="logo" name="logo" type="url" defaultValue={outil?.logo ?? ""} placeholder="Laisser vide = favicon du site officiel" aria-invalid={Boolean(etat?.erreurs?.logo)} />
          {etat?.erreurs?.logo && <p className={styleErreur}>{etat.erreurs.logo}</p>}
        </div>

        <div>
          <Etiquette htmlFor="description">Description * (30 à 600 caractères)</Etiquette>
          <ZoneTexte id="description" name="description" rows={4} defaultValue={outil?.description} placeholder="En deux phrases, à quoi sert cet outil ?" aria-invalid={Boolean(etat?.erreurs?.description)} />
          {etat?.erreurs?.description && <p className={styleErreur}>{etat.erreurs.description}</p>}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Etiquette htmlFor="type">Type *</Etiquette>
            <select
              id="type"
              name="type"
              defaultValue={outil?.type ?? "OUTIL"}
              className="min-h-11 w-full rounded-champ border border-bordure bg-white px-3 focus:border-violet focus:outline-none"
            >
              <option value="OUTIL">Outil</option>
              <option value="AGENT">Agent IA</option>
            </select>
          </div>
          <div>
            <Etiquette htmlFor="niveau">Niveau conseillé</Etiquette>
            <select
              id="niveau"
              name="niveau"
              defaultValue={outil?.niveau ?? "Débutant"}
              className="min-h-11 w-full rounded-champ border border-bordure bg-white px-3 focus:border-violet focus:outline-none"
            >
              <option value="Débutant">Débutant</option>
              <option value="Intermédiaire">Intermédiaire</option>
              <option value="Avancé">Avancé</option>
            </select>
          </div>
        </div>
      </Carte>

      {/* ── Tarif ────────────────────────────────────────────────────── */}
      <Carte className="grid gap-5 p-6">
        <h3 className="text-[16px] font-titre font-semibold">Tarif</h3>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Etiquette htmlFor="tarif">Affichage du tarif *</Etiquette>
            <Champ id="tarif" name="tarif" defaultValue={outil?.tarif} placeholder="Ex : Freemium — Pro à 20 $/mois" aria-invalid={Boolean(etat?.erreurs?.tarif)} />
            {etat?.erreurs?.tarif && <p className={styleErreur}>{etat.erreurs.tarif}</p>}
          </div>
          <div>
            <Etiquette htmlFor="tarifMin">Prix de départ (€/$ par mois, optionnel)</Etiquette>
            <Champ id="tarifMin" name="tarifMin" type="number" min={0} step="0.01" defaultValue={outil?.tarifMin ?? ""} placeholder="Ex : 20" />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className={boiteCoche}>
            <input type="checkbox" name="gratuit" defaultChecked={outil?.gratuit ?? false} className="size-4 accent-[#6a3bff]" />
            Version gratuite utilisable
          </label>
          <label className={boiteCoche}>
            <input type="checkbox" name="openSource" defaultChecked={outil?.openSource ?? false} className="size-4 accent-[#6a3bff]" />
            Open source
          </label>
          <label className={boiteCoche}>
            <input type="checkbox" name="misEnAvant" defaultChecked={outil?.misEnAvant ?? false} className="size-4 accent-[#6a3bff]" />
            Mettre en avant (à la une)
          </label>
        </div>
      </Carte>

      {/* ── Contenu détaillé ─────────────────────────────────────────── */}
      <Carte className="grid gap-5 p-6">
        <h3 className="text-[16px] font-titre font-semibold">Contenu détaillé</h3>
        <p className="-mt-3 text-[13px] leading-5 text-encre">
          Pour les listes ci-dessous : <strong>une ligne = un élément</strong>.
        </p>

        <div>
          <Etiquette htmlFor="fonctions">Fonctions principales</Etiquette>
          <ZoneTexte id="fonctions" name="fonctions" rows={4} defaultValue={outil?.fonctions.join("\n")} placeholder={"Chat multimodal\nGPT personnalisés\nGénération d'images"} />
        </div>

        <div>
          <Etiquette htmlFor="casUsage">Exemples d'usage</Etiquette>
          <ZoneTexte id="casUsage" name="casUsage" rows={3} defaultValue={outil?.casUsage.join("\n")} placeholder={"Rédiger un plan d'affaires\nRésumer un rapport"} />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Etiquette htmlFor="objectifs">Objectifs (mots-clés du diagnostic)</Etiquette>
            <ZoneTexte id="objectifs" name="objectifs" rows={3} defaultValue={outil?.objectifs.join("\n")} placeholder={"Apprendre\nCréer du contenu\nCoder\nCommuniquer\nVendre\nGérer"} />
            <p className="mt-1 text-[12px] leading-4 text-encre">Utilise les mêmes mots-clés que le diagnostic : Apprendre, Créer du contenu, Coder, Communiquer, Vendre, Gérer.</p>
          </div>
          <div>
            <Etiquette htmlFor="langues">Langues disponibles</Etiquette>
            <ZoneTexte id="langues" name="langues" rows={3} defaultValue={(outil?.langues ?? ["Français", "Anglais"]).join("\n")} placeholder={"Français\nAnglais"} />
          </div>
        </div>

        <div>
          <Etiquette>Catégories</Etiquette>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c) => (
              <label key={c.id} className={boiteCoche}>
                <input
                  type="checkbox"
                  name="categories"
                  value={c.id}
                  defaultChecked={outil?.categories.includes(c.id) ?? false}
                  className="size-4 accent-[#6a3bff]"
                />
                {c.nom}
              </label>
            ))}
            {categories.length === 0 && <p className="text-[13px] text-encre">Aucune catégorie en base.</p>}
          </div>
        </div>
      </Carte>

      {/* ── Publication ──────────────────────────────────────────────── */}
      <Carte className="grid gap-5 p-6">
        <h3 className="text-[16px] font-titre font-semibold">Publication</h3>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Etiquette htmlFor="statut">Statut *</Etiquette>
            <select
              id="statut"
              name="statut"
              defaultValue={outil?.statut ?? "PUBLIE"}
              className="min-h-11 w-full rounded-champ border border-bordure bg-white px-3 focus:border-violet focus:outline-none"
            >
              <option value="PUBLIE">Publié (visible sur le site)</option>
              <option value="BROUILLON">Brouillon (invisible)</option>
              <option value="ARCHIVE">Archivé (retiré)</option>
            </select>
          </div>
          <label className={cn(boiteCoche, "self-end")}>
            <input type="checkbox" name="verifie" defaultChecked={outil?.verifie ?? true} className="size-4 accent-[#6a3bff]" />
            Marquer comme vérifié (badge « Vérifié »)
          </label>
        </div>
      </Carte>

      {/* ── Boutons ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <Bouton type="submit" disabled={enCours}>
          {enCours ? "Enregistrement…" : outil ? "Enregistrer les modifications" : "Créer l'outil"}
        </Bouton>
        <Bouton asChild variante="secondaire">
          <Link href="/admin/outils">Annuler</Link>
        </Bouton>
      </div>
    </form>
  );
}