// components/admin/editeur-newsletter.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 35 — Éditeur de campagne de newsletter (client) :
//   • bouton « Préremplir avec les nouveaux outils de la semaine » ;
//   • enregistrement du brouillon (server action) ;
//   • envoi au segment choisi avec compte rendu (envoyés / échecs) ;
//   • historique des campagnes.
// ─────────────────────────────────────────────────────────────────
"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2, Mail, Sparkles } from "lucide-react";
import { Carte } from "@/components/ui/carte";
import { Badge } from "@/components/ui/badge";
import { Bouton } from "@/components/ui/bouton";
import {
  creerCampagneFormulaire,
  envoyerCampagneFormulaire,
  preRemplirSemaineAction,
  supprimerCampagneFormulaire,
  type EtatCampagne,
} from "@/app/actions/newsletter-admin";
import { formatteDate } from "@/lib/dates";

type CampagneResume = {
  id: string;
  sujet: string;
  segment: string;
  statut: string;
  destinataires: number;
  echecs: number;
  envoyeLe: string | null;
  creeLe: string;
};

const CLASSE_CHAMP =
  "w-full rounded-champ border border-bordure bg-white px-3 py-2 text-[14px] leading-5 text-bleu outline-none focus:border-violet";

export default function EditeurNewsletter({ campagnes }: { campagnes: CampagneResume[] }) {
  const [sujet, setSujet] = useState("");
  const [segment, setSegment] = useState("ABONNES");
  const [contenuHtml, setContenuHtml] = useState("");

  // Bouton « Préremplir » : renvoie le HTML des outils de la semaine.
  const [etatPreRemplissage, actionPreRemplir, enCoursPreRemplissage] = useActionState<
    EtatCampagne,
    FormData
  >(preRemplirSemaineAction, null);

  useEffect(() => {
    if (etatPreRemplissage?.ok && etatPreRemplissage.html) {
      setSujet(etatPreRemplissage.sujet ?? "");
      setContenuHtml(etatPreRemplissage.html);
    }
  }, [etatPreRemplissage]);

  // Envoi d'une campagne (choisie dans l'historique).
  const [etatEnvoi, actionEnvoyer, enCoursEnvoi] = useActionState<EtatCampagne, FormData>(
    envoyerCampagneFormulaire,
    null
  );

  return (
    <>
      {/* ── Composition ──────────────────────────────────────────── */}
      <Carte className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-titre text-[16px] font-semibold">✍️ Composer un e-mail</h3>
          <form action={actionPreRemplir}>
            <Bouton taille="sm" variante="secondaire" type="submit" disabled={enCoursPreRemplissage}>
              {enCoursPreRemplissage ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden /> Génération…
                </>
              ) : (
                <>
                  <Sparkles className="size-4" aria-hidden /> Préremplir avec les nouveaux outils de la semaine
                </>
              )}
            </Bouton>
          </form>
        </div>
        {etatPreRemplissage && (
          <p
            role="status"
            className={`mt-3 rounded-champ border px-3 py-2 text-[13px] ${
              etatPreRemplissage.ok
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {etatPreRemplissage.message}
          </p>
        )}

        <form action={creerCampagneFormulaire} className="mt-4 grid gap-3">
          <label className="grid gap-1 text-[13px] font-semibold text-bleu">
            Sujet de l&apos;e-mail
            <input
              name="sujet"
              required
              minLength={3}
              maxLength={150}
              value={sujet}
              onChange={(e) => setSujet(e.target.value)}
              placeholder="Ex. : Les nouveaux outils IA de la semaine — Webgiverse"
              className={CLASSE_CHAMP}
            />
          </label>
          <label className="grid gap-1 text-[13px] font-semibold text-bleu sm:max-w-xs">
            Destinataires
            <select name="segment" value={segment} onChange={(e) => setSegment(e.target.value)} className={CLASSE_CHAMP}>
              <option value="ABONNES">Inscrits à la newsletter (formulaire du site)</option>
              <option value="GRATUITS">Membres gratuits (comptes sans Premium)</option>
              <option value="PREMIUM">Membres Premium actifs</option>
              <option value="TOUS">Tous (membres + inscrits newsletter)</option>
            </select>
          </label>
          <label className="grid gap-1 text-[13px] font-semibold text-bleu">
            Contenu (HTML — le gabarit violet Webgiverse est ajouté autour)
            <textarea
              name="contenuHtml"
              required
              rows={12}
              value={contenuHtml}
              onChange={(e) => setContenuHtml(e.target.value)}
              placeholder="<h2>Bonjour,</h2><p>Voici les nouveautés de la semaine…</p>"
              className={`${CLASSE_CHAMP} font-mono text-[13px]`}
            />
          </label>
          <div>
            <Bouton type="submit">💾 Enregistrer le brouillon</Bouton>
          </div>
        </form>
        <p className="mt-2 text-[12px] leading-4 text-encre">
          Le bouton d&apos;envoi se trouve sur chaque brouillon ci-dessous (un clic = envoi réel).
        </p>
      </Carte>

      {/* ── Résultat du dernier envoi ────────────────────────────── */}
      {etatEnvoi && (
        <p
          role="status"
          className={`rounded-champ border px-4 py-3 text-[14px] ${
            etatEnvoi.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {etatEnvoi.message}
        </p>
      )}

      {/* ── Historique ───────────────────────────────────────────── */}
      <Carte className="overflow-x-auto p-2">
        <h3 className="p-3 font-titre text-[16px] font-semibold">📬 Campagnes</h3>
        <table className="w-full min-w-160 text-[14px] leading-5">
          <thead className="text-left text-legende text-encre">
            <tr>
              <th className="px-3 py-2">Sujet</th>
              <th className="px-3 py-2">Segment</th>
              <th className="px-3 py-2">Statut</th>
              <th className="px-3 py-2">Créée le</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {campagnes.map((c) => (
              <tr key={c.id} className="border-t border-bordure align-middle">
                <td className="px-3 py-2 font-semibold text-bleu">{c.sujet}</td>
                <td className="px-3 py-2 text-encre">
                  {c.segment === "ABONNES"
                    ? "Inscrits newsletter"
                    : c.segment === "GRATUITS"
                      ? "Membres gratuits"
                      : c.segment === "PREMIUM"
                        ? "Membres Premium"
                        : "Tous"}
                </td>
                <td className="px-3 py-2">
                  {c.statut === "ENVOYEE" ? (
                    <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
                      Envoyée le {formatteDate(c.envoyeLe)} — {c.destinataires} délivré(s)
                      {c.echecs ? `, ${c.echecs} échec(s)` : ""}
                    </Badge>
                  ) : (
                    <Badge>Brouillon</Badge>
                  )}
                </td>
                <td className="px-3 py-2 text-encre">{formatteDate(c.creeLe)}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    {c.statut === "BROUILLON" && (
                      <form action={actionEnvoyer}>
                        <input type="hidden" name="campagneId" value={c.id} />
                        <Bouton taille="sm" type="submit" disabled={enCoursEnvoi}>
                          {enCoursEnvoi ? (
                            <>
                              <Loader2 className="size-4 animate-spin" aria-hidden /> Envoi…
                            </>
                          ) : (
                            <>
                              <Mail className="size-4" aria-hidden /> Envoyer maintenant
                            </>
                          )}
                        </Bouton>
                      </form>
                    )}
                    <form action={supprimerCampagneFormulaire}>
                      <input type="hidden" name="campagneId" value={c.id} />
                      <Bouton taille="sm" variante="danger" type="submit">Supprimer</Bouton>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {campagnes.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-encre">
                  Aucune campagne — compose la première ci-dessus.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Carte>
    </>
  );
}
