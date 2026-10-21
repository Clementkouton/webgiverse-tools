// components/proposer/formulaire-proposition.tsx
"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import { Bouton } from "@/components/ui/bouton";
import { Carte } from "@/components/ui/carte";
import { Champ, Etiquette, ZoneTexte } from "@/components/ui/champ";
import { proposerOutil } from "@/app/actions/propositions";
import { schemaProposition, type DonneesProposition } from "@/lib/schemas";

export function FormulaireProposition({ categories }: { categories: { id: string; nom: string }[] }) {
  const [resultat, setResultat] = useState<{ ok: boolean; message: string } | null>(null);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<DonneesProposition>({
    resolver: zodResolver(schemaProposition),
    defaultValues: { tarif: "Freemium" },
  });

  if (resultat?.ok) {
    return (
      <Carte className="p-8 text-center">
        <CheckCircle2 className="mx-auto size-10 text-[#00845c]" aria-hidden />
        <p className="mt-4 text-[16px] leading-6 text-encre">{resultat.message}</p>
        <Bouton variante="secondaire" className="mt-6" onClick={() => { setResultat(null); reset(); }}>
          Proposer un autre outil
        </Bouton>
      </Carte>
    );
  }

  const champErreur = "mt-1 text-[13px] leading-4 text-red-600";

  return (
    <form onSubmit={handleSubmit(async (d) => { setResultat(await proposerOutil(d)); })} noValidate className="grid gap-5">
      <div>
        <Etiquette htmlFor="nom">Nom de l'outil *</Etiquette>
        <Champ id="nom" {...register("nom")} aria-invalid={Boolean(errors.nom)} />
        {errors.nom && <p className={champErreur}>{errors.nom.message}</p>}
      </div>
      <div>
        <Etiquette htmlFor="url">URL officielle *</Etiquette>
        <Champ id="url" type="url" placeholder="https://…" {...register("url")} />
        {errors.url && <p className={champErreur}>{errors.url.message}</p>}
      </div>
      <div>
        <Etiquette htmlFor="description">En deux phrases, à quoi sert-il ? *</Etiquette>
        <ZoneTexte id="description" rows={4} {...register("description")} />
        {errors.description && <p className={champErreur}>{errors.description.message}</p>}
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Etiquette htmlFor="tarif">Tarif *</Etiquette>
          <select id="tarif" {...register("tarif")}
            className="min-h-11 w-full rounded-champ border border-bordure bg-white px-3 focus:border-violet focus:outline-none">
            <option value="Gratuit">Gratuit</option><option value="Freemium">Freemium</option><option value="Payant">Payant</option>
          </select>
        </div>
        <div>
          <Etiquette htmlFor="categorieId">Catégorie *</Etiquette>
          <select id="categorieId" {...register("categorieId")}
            className="min-h-11 w-full rounded-champ border border-bordure bg-white px-3 focus:border-violet focus:outline-none">
            <option value="">Choisir…</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
          {errors.categorieId && <p className={champErreur}>{errors.categorieId.message}</p>}
        </div>
      </div>
      <div>
        <Etiquette htmlFor="contact">Ton e-mail (pour te prévenir de la publication)</Etiquette>
        <Champ id="contact" type="email" {...register("contact")} />
        {errors.contact && <p className={champErreur}>{errors.contact.message}</p>}
      </div>
      {resultat && !resultat.ok && <p role="alert" className={champErreur}>{resultat.message}</p>}
      <Bouton type="submit" disabled={isSubmitting} className="justify-self-start">
        {isSubmitting ? "Envoi…" : "Envoyer la proposition"}
      </Bouton>
    </form>
  );
}