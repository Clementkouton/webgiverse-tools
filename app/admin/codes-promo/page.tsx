// app/admin/codes-promo/page.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 35 — Codes promo Chariow : créer / suivre des codes -X% et
// leurs conversions. Le code crée la réduction RÉELLE dans Chariow ;
// ici on l'enregistre, on diffuse le lien /tarifs?promo=CODE, et le
// webhook Chariow incrémente les conversions + le chiffre d'affaires.
// ─────────────────────────────────────────────────────────────────
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { Carte } from "@/components/ui/carte";
import { Badge } from "@/components/ui/badge";
import { Bouton } from "@/components/ui/bouton";
import {
  creerCodePromoFormulaire,
  majCodePromoFormulaire,
  basculerCodePromoFormulaire,
  supprimerCodePromoFormulaire,
  remettreStatsCodePromoFormulaire,
} from "@/app/actions/codes-promo";
import { formatteDate } from "@/lib/dates";
import { formatePrix } from "@/lib/plans";

export const metadata: Metadata = { title: "Codes promo — Administration" };
export const dynamic = "force-dynamic";

const CLASSE_CHAMP =
  "w-full rounded-champ border border-bordure bg-white px-3 py-2 text-[14px] leading-5 text-bleu outline-none focus:border-violet";

function FormulaireCode({
  action,
  promo,
}: {
  action: (donnees: FormData) => void | Promise<void>;
  promo?: {
    id: string;
    code: string;
    pourcentage: number;
    note: string | null;
    maxUtilisations: number | null;
    debutLe: Date | null;
    finLe: Date | null;
  };
}) {
  return (
    <form action={action} className="grid gap-3">
      {promo && <input type="hidden" name="codePromoId" value={promo.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-[13px] font-semibold text-bleu">
          Code (majuscules, ex. LANCEMENT20)
          <input
            name="code"
            required
            minLength={3}
            maxLength={40}
            defaultValue={promo?.code}
            className={`${CLASSE_CHAMP} font-mono uppercase`}
          />
        </label>
        <label className="grid gap-1 text-[13px] font-semibold text-bleu">
          Réduction (%) — même valeur que dans Chariow
          <input
            name="pourcentage"
            required
            type="number"
            min={1}
            max={100}
            defaultValue={promo?.pourcentage ?? 20}
            className={CLASSE_CHAMP}
          />
        </label>
      </div>
      <label className="grid gap-1 text-[13px] font-semibold text-bleu">
        Note (campagne, canal…)
        <input name="note" maxLength={300} defaultValue={promo?.note ?? ""} className={CLASSE_CHAMP} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-[13px] font-semibold text-bleu">
          Début (facultatif)
          <input
            name="debutLe"
            type="datetime-local"
            defaultValue={promo?.debutLe ? new Date(promo.debutLe).toISOString().slice(0, 16) : ""}
            className={CLASSE_CHAMP}
          />
        </label>
        <label className="grid gap-1 text-[13px] font-semibold text-bleu">
          Fin (facultatif)
          <input
            name="finLe"
            type="datetime-local"
            defaultValue={promo?.finLe ? new Date(promo.finLe).toISOString().slice(0, 16) : ""}
            className={CLASSE_CHAMP}
          />
        </label>
      </div>
      <label className="grid gap-1 text-[13px] font-semibold text-bleu sm:max-w-xs">
        Utilisations maximum (vide = illimité)
        <input
          name="maxUtilisations"
          type="number"
          min={0}
          max={100000}
          placeholder="100"
          defaultValue={promo?.maxUtilisations ?? ""}
          className={CLASSE_CHAMP}
        />
      </label>
      <div>
        <Bouton taille="sm" type="submit">
          {promo ? "Enregistrer" : "Créer le code"}
        </Bouton>
      </div>
    </form>
  );
}

export default async function PageCodesPromoAdmin() {
  const promos = await prisma.codePromo.findMany({ orderBy: { creeLe: "desc" } });
  const maintenant = new Date();

  const totalUtilisations = promos.reduce((s, p) => s + p.utilisations, 0);
  const totalCA = promos.reduce((s, p) => s + p.chiffreAffaires, 0);

  return (
    <div className="grid gap-6">
      <div>
        <h2 className="text-h3 font-semibold">Codes promo Chariow</h2>
        <p className="mt-1 max-w-3xl text-[14px] leading-5 text-encre">
          1. Crée d&apos;abord le code dans Chariow (réduction réelle appliquée au paiement).{" "}
          2. Enregistre-le ici pour le suivre : le lien{" "}
          <code className="rounded bg-gris px-1.5 py-0.5 font-mono text-[13px]">/tarifs?promo=CODE</code>{" "}
          transmet automatiquement le code au checkout, et le webhook Chariow compte les
          conversions et le chiffre d&apos;affaires de chaque code.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Carte className="p-5 text-center">
          <p className="font-titre text-h2 font-bold text-violet">{promos.length}</p>
          <p className="text-[13px] text-encre">codes enregistrés</p>
        </Carte>
        <Carte className="p-5 text-center">
          <p className="font-titre text-h2 font-bold text-violet">{totalUtilisations}</p>
          <p className="text-[13px] text-encre">conversions comptées</p>
        </Carte>
        <Carte className="p-5 text-center">
          <p className="font-titre text-h2 font-bold text-violet">{formatePrix(totalCA)}</p>
          <p className="text-[13px] text-encre">chiffre d&apos;affaires via les codes</p>
        </Carte>
      </div>

      {/* ── Nouveau code ──────────────────────────────────────────── */}
      <Carte className="p-5">
        <h3 className="font-titre text-[16px] font-semibold">Créer un code</h3>
        <div className="mt-4">
          <FormulaireCode action={creerCodePromoFormulaire} />
        </div>
      </Carte>

      {/* ── Liste ─────────────────────────────────────────────────── */}
      <div className="grid gap-4">
        {promos.map((p) => {
          const enPeriode =
            (!p.debutLe || p.debutLe <= maintenant) && (!p.finLe || p.finLe >= maintenant);
          const quotaAtteint = p.maxUtilisations !== null && p.utilisations >= p.maxUtilisations;
          const actif = p.actif && enPeriode && !quotaAtteint;
          return (
            <Carte key={p.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-mono text-[18px] font-bold text-bleu">{p.code}</h3>
                    <Badge variante="source">-{p.pourcentage} %</Badge>
                    {actif ? (
                      <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">Actif</Badge>
                    ) : (
                      <Badge className="border-red-200 bg-red-50 text-red-700">
                        {!p.actif ? "Désactivé" : quotaAtteint ? "Quota atteint" : "Hors période"}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-[13px] text-encre">
                    {p.note ?? "Sans note"} ·{" "}
                    {p.debutLe ? `du ${formatteDate(p.debutLe)} ` : ""}
                    {p.finLe ? `au ${formatteDate(p.finLe)}` : p.debutLe ? "" : "sans limite de dates"} ·
                    quota : {p.maxUtilisations ?? "illimité"}
                  </p>
                  <p className="mt-1 text-[13px] text-encre">
                    Lien à diffuser :{" "}
                    <code className="rounded bg-gris px-1.5 py-0.5 font-mono text-[12px]">
                      /tarifs?promo={p.code}
                    </code>
                  </p>
                </div>
                <dl className="grid grid-cols-2 gap-3 text-center">
                  <div className="rounded-champ bg-gris px-4 py-2">
                    <dt className="text-[11px] font-semibold uppercase text-encre">Conversions</dt>
                    <dd className="font-titre text-[18px] font-bold text-violet">{p.utilisations}</dd>
                  </div>
                  <div className="rounded-champ bg-gris px-4 py-2">
                    <dt className="text-[11px] font-semibold uppercase text-encre">CA généré</dt>
                    <dd className="font-titre text-[18px] font-bold text-violet">{formatePrix(p.chiffreAffaires)}</dd>
                  </div>
                </dl>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <form action={basculerCodePromoFormulaire}>
                  <input type="hidden" name="codePromoId" value={p.id} />
                  <Bouton taille="sm" variante="secondaire" type="submit">
                    {p.actif ? "Désactiver" : "Activer"}
                  </Bouton>
                </form>
                <form action={remettreStatsCodePromoFormulaire}>
                  <input type="hidden" name="codePromoId" value={p.id} />
                  <Bouton taille="sm" variante="secondaire" type="submit">Remettre les stats à zéro</Bouton>
                </form>
                <form action={supprimerCodePromoFormulaire}>
                  <input type="hidden" name="codePromoId" value={p.id} />
                  <Bouton taille="sm" variante="danger" type="submit">Supprimer</Bouton>
                </form>
              </div>

              <details className="mt-3 rounded-champ border border-bordure p-4">
                <summary className="cursor-pointer select-none text-[13px] font-semibold text-violet">
                  Modifier ce code
                </summary>
                <div className="mt-4">
                  <FormulaireCode
                    action={majCodePromoFormulaire}
                    promo={{
                      id: p.id,
                      code: p.code,
                      pourcentage: p.pourcentage,
                      note: p.note,
                      maxUtilisations: p.maxUtilisations,
                      debutLe: p.debutLe,
                      finLe: p.finLe,
                    }}
                  />
                </div>
              </details>
            </Carte>
          );
        })}
        {promos.length === 0 && (
          <Carte className="p-6 text-[14px] text-encre">
            Aucun code pour l&apos;instant — crée le premier ci-dessus, puis partage le lien
            /tarifs?promo=CODE pour suivre ses conversions.
          </Carte>
        )}
      </div>
    </div>
  );
}
