import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, ChevronRight, ListChecks, Loader, Plus, Star, Trash2 } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Carte } from "@/components/ui/carte";
import { Bouton } from "@/components/ui/bouton";
import { Badge } from "@/components/ui/badge";
import { Champ } from "@/components/ui/champ";
import { LogoOutil } from "@/components/commun/logo-outil";
import { SelecteurStatut } from "@/components/dashboard/selecteur-statut";
import { EditeurNote } from "@/components/dashboard/editeur-note";
import { BoutonConfirmer } from "@/components/commun/bouton-confirmer";
import { ajouterDansListeFormulaire, creerListeFormulaire, renommerListeFormulaire,
  retirerDeListeFormulaire, supprimerListeFormulaire } from "@/app/actions/listes";
import { enregistrerProfil } from "@/app/actions/profil";
import { supprimerFavoriFormulaire } from "@/app/actions/favoris";
import { BoutonDeconnexion } from "@/components/auth/bouton-deconnexion";
export const metadata: Metadata = { title: "Mon espace" };
import { PortailConnexion } from "@/components/auth/portail-connexion";
import BoutonPartageListe from "@/components/partage/bouton-partage-liste";
import VuRecemment from "@/components/visites/vu-recemment";

const STYLE_SELECT = "min-h-11 rounded-champ border border-bordure bg-white px-3 text-[15px] leading-5 focus:border-violet focus:outline-none";

const enregistrerProfilDashboard = async (formData: FormData) => {
  "use server";
  await enregistrerProfil(
    String(formData.get("objectif") ?? ""),
    String(formData.get("niveau") ?? ""),
    String(formData.get("budget") ?? ""),
  );
};

export default async function PageDashboard() {
  const session = await auth();
  if (!session?.user?.id) return <PortailConnexion />;
  
  const userId = session.user.id;

  const [favoris, listes, compteurs, recommandations, utilisateur] = await Promise.all([
    prisma.favorite.findMany({
      where: { userId },
      include: { tool: { include: { categories: { select: { categorie: { select: { nom: true, slug: true } } } } } } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.list.findMany({ where: { userId }, include: { items: { include: { tool: true } } }, orderBy: { createdAt: "asc" } }),
    Promise.all([
      prisma.favorite.count({ where: { userId } }),
      prisma.favorite.count({ where: { userId, statut: "EN_COURS" } }),
      prisma.favorite.count({ where: { userId, statut: "ADOPTE" } }),
    ]),
    prisma.recommendation.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.user.findUnique({ where: { id: userId } }),
  ]);

  const stats = [
    { icone: Star, valeur: compteurs[0], libelle: "favoris" },
    { icone: Loader, valeur: compteurs[1], libelle: "outils en cours" },
    { icone: CheckCircle2, valeur: compteurs[2], libelle: "outils adoptés" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 lg:py-14">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h2 font-semibold">Mon espace</h1>
        <BoutonDeconnexion />
      </div>

      <VuRecemment />
      <p className="mt-2 text-encre">Ton tableau de bord Webgiverse : favoris, listes et recommandations.</p>
      {/* Cartes de synthèse */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Carte key={s.libelle} className="flex items-center gap-4 p-5">
            <s.icone className="size-8 shrink-0 text-violet" aria-hidden />
            <div>
              <p className="font-titre text-[28px] leading-9 font-bold">{s.valeur}</p>
              <p className="text-legende text-encre">{s.libelle}</p>
            </div>
          </Carte>
        ))}
      </div>

      {/* Profil */}
      <Carte className="mt-8 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-h3 font-semibold">Mon profil</h2>
          <Bouton variante="secondaire" taille="sm" asChild>
            <Link href="/assistant">Refaire le diagnostic</Link>
          </Bouton>
        </div>
        <form action={enregistrerProfilDashboard} className="mt-4 grid gap-4 sm:grid-cols-4">
          <div>
            <label htmlFor="p-objectif" className="mb-1.5 block text-[14px] leading-5 font-medium">Objectif</label>
            <select id="p-objectif" name="objectif" defaultValue={utilisateur?.objectif ?? ""} className={`${STYLE_SELECT} w-full`}>
              <option value="">—</option>
              {["Vendre", "Créer du contenu", "Automatiser", "Coder", "Communiquer", "Apprendre", "Gérer"].map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="p-niveau" className="mb-1.5 block text-[14px] leading-5 font-medium">Niveau</label>
            <select id="p-niveau" name="niveau" defaultValue={utilisateur?.niveau ?? ""} className={`${STYLE_SELECT} w-full`}>
              <option value="">—</option>
              {["Débutant", "Intermédiaire", "Avancé"].map((n) => <option key={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="p-budget" className="mb-1.5 block text-[14px] leading-5 font-medium">Budget</label>
            <select id="p-budget" name="budget" defaultValue={utilisateur?.budget ?? ""} className={`${STYLE_SELECT} w-full`}>
              <option value="">—</option>
              <option value="gratuit">Gratuit (0 €)</option>
              <option value="petit">Petit (≤ 20 €/mois)</option>
              <option value="confort">Confort (&gt; 20 €/mois)</option>
            </select>
          </div>
          <div className="flex items-end"><Bouton type="submit">Enregistrer</Bouton></div>
        </form>
      </Carte>

      {/* Listes personnalisées */}
      <section className="mt-10">
        <h2 className="text-h3 font-semibold">Mes listes</h2>
        <form action={creerListeFormulaire} className="mt-4 flex flex-wrap gap-2">
          <Champ name="nom" placeholder="Nom de la liste (ex. « Boîte à outils client X »)" aria-label="Nom de la nouvelle liste"
            className="max-w-sm flex-1" required minLength={2} />
          <Bouton variante="secondaire" type="submit"><Plus aria-hidden /> Créer la liste</Bouton>
        </form>
        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {listes.map((liste) => (
            <Carte key={liste.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-titre text-[17px] leading-6 font-semibold"><ListChecks className="mr-1 inline size-4 text-violet" aria-hidden />{liste.nom}</h3>
                <form action={supprimerListeFormulaire}>
                  <input type="hidden" name="listeId" value={liste.id} />
                  <BoutonConfirmer type="submit" message={`Supprimer la liste « ${liste.nom} » ?`}
                    aria-label={`Supprimer la liste ${liste.nom}`}
                    className="grid size-9 place-items-center rounded-full text-encre hover:bg-gris hover:text-red-600">
                    <Trash2 className="size-4" aria-hidden />
                  </BoutonConfirmer>
                </form>
              </div>
              <ul className="mt-3 grid gap-1.5">
                {liste.items.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-2 text-[15px] leading-5">
                    <Link href={`/outil/${item.tool.slug}`} className="min-h-9 py-1.5 font-medium text-violet hover:underline">{item.tool.nom}</Link>
                    <form action={retirerDeListeFormulaire}>
                      <input type="hidden" name="itemId" value={item.id} />
                      <button type="submit" aria-label={`Retirer ${item.tool.nom} de la liste`}
                        className="grid size-9 place-items-center rounded-full text-encre hover:text-red-600">×</button>
                    </form>
                  </li>
                ))}
                {liste.items.length === 0 && <li className="text-[14px] leading-5 text-encre">Liste vide — ajoute des outils depuis tes favoris.</li>}
              </ul>
              <form action={renommerListeFormulaire} className="mt-4 flex gap-2 border-t border-bordure pt-4">
                <input type="hidden" name="listeId" value={liste.id} />
                <input name="nom" defaultValue={liste.nom} aria-label={`Renommer ${liste.nom}`}
                  className="min-h-11 flex-1 rounded-champ border border-bordure px-3 text-[14px] leading-5 focus:border-violet focus:outline-none" />
                <Bouton variante="fantome" taille="sm" type="submit">Renommer</Bouton>
              </form>
              <div className="mt-4 flex items-center justify-between gap-2 border-t border-bordure pt-4">
                <BoutonPartageListe listeId={liste.id} />
                <form action={supprimerListeFormulaire}>
                  <Bouton variante="fantome" taille="sm" type="submit">Supprimer</Bouton>
                </form>
              </div>
            </Carte>
          ))}
        </div>
      </section>

      {/* Favoris */}
      <section className="mt-10">
        <h2 className="text-h3 font-semibold">Mes favoris ({favoris.length})</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {favoris.map((f) => (
            <Carte key={f.id} className="p-5">
              <div className="flex items-start gap-3">
                <LogoOutil nom={f.tool.nom} logo={f.tool.logo} />
                <div className="min-w-0 flex-1">
                  <Link href={`/outil/${f.tool.slug}`} className="font-titre text-[17px] leading-6 font-semibold hover:text-violet">{f.tool.nom}</Link>
                  <p className="text-legende text-encre">
                    {f.tool.categories[0]?.categorie.nom ?? "Outil"}{f.tool.gratuit ? " · version gratuite" : ` · ${f.tool.tarif}`}
                  </p>
                </div>
                <form action={supprimerFavoriFormulaire}>
                  <input type="hidden" name="favoriId" value={f.id} />
                  <BoutonConfirmer type="submit" message={`Retirer ${f.tool.nom} des favoris ?`}
                    aria-label={`Retirer ${f.tool.nom} des favoris`}
                    className="grid size-9 place-items-center rounded-full text-encre hover:text-red-600">
                    <Trash2 className="size-4" aria-hidden />
                  </BoutonConfirmer>
                </form>
              </div>
              <div className="mt-4"><SelecteurStatut favoriId={f.id} statut={f.statut} /></div>
              <div className="mt-4"><EditeurNote favoriId={f.id} note={f.note} /></div>
              <form action={ajouterDansListeFormulaire} className="mt-4 flex items-center gap-2 border-t border-bordure pt-4">
                <input type="hidden" name="toolId" value={f.tool.id} />
                <select name="listeId" aria-label={`Ajouter ${f.tool.nom} à une liste`} defaultValue="" className={`${STYLE_SELECT} flex-1`}>
                  <option value="">Ajouter à une liste…</option>
                  {listes.map((l) => <option key={l.id} value={l.id}>{l.nom}</option>)}
                </select>
                <Bouton variante="fantome" taille="sm" type="submit">OK</Bouton>
              </form>
            </Carte>
          ))}
          {favoris.length === 0 && (
            <Carte className="p-8 text-center lg:col-span-2">
              <p className="text-encre">Aucun favori pour l'instant. Explore l'annuaire et garde tes découvertes sous la main.</p>
              <Bouton className="mt-4" asChild><Link href="/outils">Explorer l'annuaire <ChevronRight aria-hidden /></Link></Bouton>
            </Carte>
          )}
        </div>
      </section>

      {/* Historique des recommandations */}
      <section className="mt-10">
        <h2 className="text-h3 font-semibold">Historique des recommandations</h2>
        <div className="mt-4 grid gap-3">
          {recommandations.map((r) => {
            let outilsReco: { slug: string; nom: string }[] = [];
            try {
              outilsReco = r.mode === "guide" ? JSON.parse(r.reponse) : [];
            } catch { /* réponse texte */ }
            return (
              <Carte key={r.id} className="p-5">
                <p className="flex flex-wrap items-center gap-2 text-legende text-encre">
                  {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(r.createdAt)}
                  <Badge>{r.mode === "guide" ? "Diagnostic guidé" : "Conversation"}</Badge>
                </p>
                {outilsReco.length > 0 ? (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {outilsReco.map((o) => (
                      <li key={o.slug}>
                        <Link href={`/outil/${o.slug}`} className="inline-flex rounded-full border border-violet bg-violet/5 px-3 py-1 text-[13px] leading-4 font-medium text-violet hover:bg-violet/10">{o.nom}</Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mesure mt-2 line-clamp-3 text-[14px] leading-5 text-encre">{r.reponse}</p>
                )}
              </Carte>
            );
          })}
          {recommandations.length === 0 && (
            <Carte className="p-6 text-encre">L'assistant ne t'a encore rien recommandé. <Link href="/assistant" className="font-semibold text-violet hover:underline">Lance-le ici</Link>.</Carte>
          )}
        </div>
      </section>
    </div>
  );
}