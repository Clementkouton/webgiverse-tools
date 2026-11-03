// app/actions/import-csv.ts
"use server";
// ─────────────────────────────────────────────────────────────────
// Lot 23 — Import en masse depuis un fichier CSV (ou un collage) :
//   • OUTILS   : /admin/import?onglet=outils    → modèle public/imports/modele-outils.csv
//   • TUTORIELS: /admin/import?onglet=tutoriels → modèle public/imports/modele-tutoriels.csv
//   • PROMPTS  : /admin/import?onglet=prompts   → modèle public/imports/modele-prompts.csv
// Chaque ligne est validée indépendamment : une ligne invalide ne
// bloque PAS les autres (le rapport cite le numéro de ligne).
// Déduplication par slug : sans l'option « mettre à jour », une ligne
// déjà existante est ignorée ; avec l'option, elle est mise à jour —
// et seules les COLONNES présentes dans le fichier écrasent l'ancien
// contenu (une colonne absente conserve sa valeur).
// Lot 23c — lecture des fichiers : UTF-8 strict puis repli
// Windows-1252 (les CSV d'Excel FR ne sont presque jamais en UTF-8,
// les accents arrivaient en « DÃ©butant ») + erreursTotal dans le
// rapport quand plus de 30 lignes sont rejetées.
// ─────────────────────────────────────────────────────────────────
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { slugifier } from "@/lib/utils";
import { parserDescriptionRaffineeCsv } from "@/lib/description-youtube";
import {
  parserCsv,
  lit,
  booleen,
  entier,
  decouper,
  normaliserEntete,
  Sluggeur,
} from "@/lib/csv";

export type EtatImport = {
  ok: boolean;
  message: string;
  crees?: number;
  majes?: number;
  ignores?: number;
  /** Catégories de prompts créées à la volée. */
  categoriesCreees?: number;
  /** Erreurs ligne par ligne (30 affichées max). */
  erreurs?: string[];
  /** Nombre RÉEL de lignes rejetées (quand > 30, le rapport le dit). */
  erreursTotal?: number;
} | null;

const MAX_LIGNES = 500;
const MAX_OCTETS = 2_000_000; // 2 Mo

async function exigerAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Accès réservé aux administrateurs.");
  const moi = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (moi?.role !== "ADMIN") throw new Error("Accès réservé aux administrateurs.");
}

/** Récupère le texte CSV : fichier envoyé, sinon zone « coller ». */
async function lireSource(donnees: FormData): Promise<string | null> {
  const fichier = donnees.get("fichier");
  if (fichier instanceof File && fichier.size > 0) {
    if (fichier.size > MAX_OCTETS) return null;
    // Excel FR exporte souvent en Windows-1252 (ANSI), pas en UTF-8 :
    // sans ce repli, « Débutant » devenait « DÃ©butant » et les
    // catégories/slugs arrivaient tout moisis. On tente l'UTF-8 strict
    // (fatal: true échoue au 1er octet invalide) puis on retombe sur
    // Windows-1252, qui couvre tous les caractères français.
    const tampon = await fichier.arrayBuffer();
    try {
      return new TextDecoder("utf-8", { fatal: true }).decode(tampon);
    } catch {
      return new TextDecoder("windows-1252").decode(tampon);
    }
  }
  const colle = donnees.get("csvTexte");
  if (typeof colle === "string" && colle.trim()) return colle;
  return null;
}

/** Clamp une description outil aux règles du site (30 à 600). */
function descriptionValide(texte: string): string | null {
  const v = texte.trim();
  if (v.length < 30) return null;
  return v.slice(0, 600);
}

function urlValide(texte: string): string | null {
  try {
    const u = new URL(texte.trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** Nombre décimal depuis une cellule CSV ; vide / invalide → null. */
function nombreOuNull(valeur: string): number | null {
  const v = valeur.trim();
  if (!v) return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) && n >= 0 && n <= 100000 ? n : null;
}

/** « Débutant » / DEBUTANT / intermediaire… → enum NiveauTuto. */
function niveauTuto(texte: string): "DEBUTANT" | "INTERMEDIAIRE" | "AVANCE" {
  const c = texte
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  if (c.startsWith("inter")) return "INTERMEDIAIRE";
  if (c.startsWith("avan")) return "AVANCE";
  return "DEBUTANT";
}

/** « image » / « code »… → enum TypePrompt. */
function typePrompt(texte: string): "TEXTE" | "IMAGE" | "CODE" {
  const c = texte
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  if (c.startsWith("imag")) return "IMAGE";
  if (c.startsWith("cod")) return "CODE";
  return "TEXTE";
}

/** « publié / brouillon / archive » → enum ToolStatus. */
function statutOutil(texte: string): "BROUILLON" | "PUBLIE" | "ARCHIVE" {
  const c = texte
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  if (c.startsWith("brouill")) return "BROUILLON";
  if (c.startsWith("archiv")) return "ARCHIVE";
  return "PUBLIE";
}

/** « outil » / « agent » → enum ToolType. */
function typeOutil(texte: string): "OUTIL" | "AGENT" {
  return texte.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().startsWith("agent")
    ? "AGENT"
    : "OUTIL";
}

function etatErreur(message: string): EtatImport {
  return { ok: false, message };
}

/** Contrôles communs aux 3 imports (auth faite avant). Renvoie soit le CSV, soit une erreur. */
function verifierCsv(source: string | null): ReturnType<typeof parserCsv> | EtatImport {
  if (source === null)
    return etatErreur(
      "Aucun contenu à importer : fichier absent, trop volumineux (2 Mo max) ou zone « coller » vide."
    );
  const csv = parserCsv(source);
  if (!csv) return etatErreur("Fichier illisible : vérifie que la 1re ligne contient bien les en-têtes séparés par « ; » ou « , ».");
  if (csv.total === 0) return etatErreur("Aucune ligne de données trouvée (il n'y a que les en-têtes).");
  if (csv.total > MAX_LIGNES) return etatErreur(`Trop de lignes (${csv.total}) : 500 maximum par import. Découpe ton fichier.`);
  return csv;
}

// ─────────────────────────────────────────────────────────────────────
//  Import des OUTILS
// ─────────────────────────────────────────────────────────────────────

export async function importerOutilsAction(_etat: EtatImport, donnees: FormData): Promise<EtatImport> {
  await exigerAdmin();

  const analyse = verifierCsv(await lireSource(donnees));
  if (!analyse || !("lignes" in analyse)) return analyse;
  const csv = analyse;
  const col = (champ: string) => csv.colonnes.has(normaliserEntete(champ));
  const maj = donnees.get("maj") === "on";

  // Correspondance des catégories par slug OU par nom (insensible à la casse)
  const categories = await prisma.category.findMany({ select: { id: true, slug: true, nom: true } });
  const indexCategorie = new Map<string, string>();
  for (const c of categories) {
    indexCategorie.set(c.slug.toLowerCase(), c.id);
    indexCategorie.set(c.nom.trim().toLowerCase(), c.id);
  }

  // Slugs déjà pris en base (pour l'option « ignorer les existants »)
  const existants = await prisma.tool.findMany({ select: { slug: true } });
  const slugsPris = new Set(existants.map((t) => t.slug));
  const slugeur = new Sluggeur(slugifier, slugsPris);

  let crees = 0;
  let majes = 0;
  let ignores = 0;
  const erreurs: string[] = [];

  for (let i = 0; i < csv.lignes.length; i++) {
    const l = csv.lignes[i];
    const numero = i + 2; // +2 : en-tête + index 0

    try {
      const nom = lit(l, "nom").trim();
      const url = urlValide(lit(l, "url"));
      const description = descriptionValide(lit(l, "description"));

      if (nom.length < 2) {
        erreurs.push(`Ligne ${numero} : nom trop court ou manquant.`);
        continue;
      }
      if (!url) {
        erreurs.push(`Ligne ${numero} : URL invalide ou manquante (${nom}).`);
        continue;
      }
      if (!description) {
        erreurs.push(`Ligne ${numero} : description absente ou trop courte (30 caractères minimum) — ${nom}.`);
        continue;
      }

      const slugDemande = lit(l, "slug").trim();
      const slug = slugDemande ? slugifier(slugDemande) : slugeur.de(nom);
      const existant = slugsPris.has(slug) ? await prisma.tool.findUnique({ where: { slug } }) : null;

      if (existant && !maj) {
        ignores++;
        continue;
      }

      const hostname = new URL(url).hostname;
      const logo = lit(l, "logo").trim() || `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`;
      const statut = col("statut") ? statutOutil(lit(l, "statut")) : "PUBLIE";
      const ids = decouper(lit(l, "categories"), 6)
        .map((v) => indexCategorie.get(v.trim().toLowerCase()))
        .filter((id): id is string => Boolean(id));

      if (existant) {
        // MISE À JOUR : seules les colonnes présentes dans le CSV écrasent
        const champs: Partial<{
          logo: string; tarif: string; tarifMin: number | null; gratuit: boolean;
          openSource: boolean; niveau: string; langues: string[]; objectifs: string[];
          fonctions: string[]; casUsage: string[]; misEnAvant: boolean;
          statut: "BROUILLON" | "PUBLIE" | "ARCHIVE"; verifieLe: Date | null;
        }> = {};
        if (col("logo")) champs.logo = logo;
        if (col("tarif")) champs.tarif = lit(l, "tarif").trim() || "À vérifier";
        if (col("tarifmin")) champs.tarifMin = nombreOuNull(lit(l, "tarifmin"));
        if (col("gratuit")) champs.gratuit = booleen(lit(l, "gratuit"));
        if (col("opensource")) champs.openSource = booleen(lit(l, "opensource"));
        if (col("niveau")) champs.niveau = lit(l, "niveau").trim() || "Débutant";
        if (col("langues")) champs.langues = decouper(lit(l, "langues")).length ? decouper(lit(l, "langues")) : ["Français", "Anglais"];
        if (col("objectifs")) champs.objectifs = decouper(lit(l, "objectifs"));
        if (col("fonctions")) champs.fonctions = decouper(lit(l, "fonctions"));
        if (col("casusage")) champs.casUsage = decouper(lit(l, "casusage"));
        if (col("misenavant")) champs.misEnAvant = booleen(lit(l, "misenavant"));
        if (col("statut")) {
          champs.statut = statut;
          champs.verifieLe = statut === "PUBLIE" ? new Date() : null;
        }

        await prisma.tool.update({
          where: { id: existant.id },
          data: {
            nom: nom.slice(0, 80),
            url,
            description,
            ...champs,
            // Colonne « categories » présente = remplacement (même vide)
            ...(col("categories")
              ? { categories: { deleteMany: {}, create: ids.map((categorieId) => ({ categorieId })) } }
              : {}),
          },
        });
        majes++;
      } else {
        // CRÉATION : colonnes absentes → valeurs par défaut
        await prisma.tool.create({
          data: {
            nom: nom.slice(0, 80),
            slug,
            url,
            description,
            type: typeOutil(lit(l, "type")),
            logo,
            tarif: lit(l, "tarif").trim() || "À vérifier",
            tarifMin: nombreOuNull(lit(l, "tarifmin")),
            gratuit: booleen(lit(l, "gratuit")),
            openSource: booleen(lit(l, "opensource")),
            niveau: lit(l, "niveau").trim() || "Débutant",
            langues: decouper(lit(l, "langues")).length ? decouper(lit(l, "langues")) : ["Français", "Anglais"],
            objectifs: decouper(lit(l, "objectifs")),
            fonctions: decouper(lit(l, "fonctions")),
            casUsage: decouper(lit(l, "casusage")),
            misEnAvant: booleen(lit(l, "misenavant")),
            statut,
            verifieLe: statut === "PUBLIE" ? new Date() : null,
            categories: ids.length > 0 ? { create: ids.map((categorieId) => ({ categorieId })) } : undefined,
          },
        });
        slugsPris.add(slug);
        crees++;
      }
    } catch (e) {
      erreurs.push(`Ligne ${numero} : erreur inattendue (${e instanceof Error ? e.message : "inconnue"}).`);
    }
  }

  revalidatePath("/admin"); revalidatePath("/admin/outils"); revalidatePath("/outils"); revalidatePath("/");

  return {
    ok: true,
    message: `Import des outils terminé : ${crees} créé(s), ${majes} mis à jour, ${ignores} ignoré(s).`,
    crees,
    majes,
    ignores,
    erreurs: erreurs.slice(0, 30),
    erreursTotal: erreurs.length,
  };
}

// ─────────────────────────────────────────────────────────────────────
//  Import des TUTORIELS
// ─────────────────────────────────────────────────────────────────────
// Lot 29 — 4 colonnes de description YouTube raffinée acceptées :
//   • descriptionRaffinee : JSON complet (structure du scraper) ou le
//     mot-clé « vide » → remplace TOUTE la description ;
//   • chapitres / ressources / paragraphes : syntaxe lisible, chaque
//     colonne fournie ne remplace que SA partie (le reste est conservé
//     depuis la description déjà en base).
//   Cellules vides = description existante conservée : une colonne
//   oubliée ne peut JAMAIS effacer des données.

export async function importerTutorielsAction(_etat: EtatImport, donnees: FormData): Promise<EtatImport> {
  await exigerAdmin();

  const analyse = verifierCsv(await lireSource(donnees));
  if (!analyse || !("lignes" in analyse)) return analyse;
  const csv = analyse;
  const col = (champ: string) => csv.colonnes.has(normaliserEntete(champ));
  const maj = donnees.get("maj") === "on";

  const existants = await prisma.tuto.findMany({ select: { slug: true } });
  const slugsPris = new Set(existants.map((t) => t.slug));
  const slugeur = new Sluggeur(slugifier, slugsPris);

  let crees = 0;
  let majes = 0;
  let ignores = 0;
  const erreurs: string[] = [];

  for (let i = 0; i < csv.lignes.length; i++) {
    const l = csv.lignes[i];
    const numero = i + 2;

    try {
      const titre = lit(l, "titre").trim();
      if (titre.length < 4) {
        erreurs.push(`Ligne ${numero} : titre trop court ou manquant.`);
        continue;
      }

      const youtubeId = lit(l, "youtubeid").trim();
      if (youtubeId && !/^[\w-]{6,20}$/.test(youtubeId)) {
        erreurs.push(`Ligne ${numero} : identifiant YouTube invalide (« ${youtubeId} ») — ${titre}.`);
        continue;
      }

      const slugDemande = lit(l, "slug").trim();
      const slug = slugDemande ? slugifier(slugDemande) : slugeur.de(titre);
      const existant = slugsPris.has(slug) ? await prisma.tuto.findUnique({ where: { slug } }) : null;
      if (existant && !maj) {
        ignores++;
        continue;
      }

      // Lot 29 — description raffinée : JSON (« descriptionRaffinee »)
      // ou 3 colonnes lisibles. En mise à jour, la ligne déjà en base
      // fournit la base de fusion (parties non fournies conservées).
      const desc = parserDescriptionRaffineeCsv(
        {
          json: lit(l, "descriptionRaffinee"),
          chapitres: lit(l, "chapitres"),
          ressources: lit(l, "ressources"),
          paragraphes: lit(l, "paragraphes"),
        },
      );
      if (!desc.ok) {
        erreurs.push(`Ligne ${numero} : ${desc.erreur} — ${titre}.`);
        continue;
      }

      if (existant) {
        const champs: Partial<{
          youtubeId: string | null; miniature: string | null; dureeMin: number;
          niveau: "DEBUTANT" | "INTERMEDIAIRE" | "AVANCE"; outils: string[];
          ordre: number; vues: number; nouveau: boolean;
          descriptionRaffinee: Prisma.InputJsonValue;
        }> = {};
        if (col("youtubeid")) champs.youtubeId = youtubeId || null;
        if (col("miniature")) champs.miniature = lit(l, "miniature").trim() || null;
        if (col("dureemin")) champs.dureeMin = entier(lit(l, "dureemin"), 10);
        if (col("niveau")) champs.niveau = niveauTuto(lit(l, "niveau"));
        if (col("outils")) champs.outils = decouper(lit(l, "outils"));
        if (col("ordre")) champs.ordre = entier(lit(l, "ordre"), 0);
        if (col("vues")) champs.vues = entier(lit(l, "vues"), 0);
        if (col("nouveau")) champs.nouveau = booleen(lit(l, "nouveau"));
        if (desc) {
          champs.descriptionRaffinee = desc as unknown as Prisma.InputJsonValue;
        }

        await prisma.tuto.update({
          where: { id: existant.id },
          data: { titre: titre.slice(0, 160), ...champs },
        });
        majes++;
      } else {
        await prisma.tuto.create({
          data: {
            titre: titre.slice(0, 160),
            slug,
            youtubeId: youtubeId || null,
            miniature: lit(l, "miniature").trim() || null,
            dureeMin: entier(lit(l, "dureemin"), 10),
            niveau: niveauTuto(lit(l, "niveau")),
            outils: decouper(lit(l, "outils")),
            ordre: entier(lit(l, "ordre"), 0),
            vues: entier(lit(l, "vues"), 0),
            nouveau: booleen(lit(l, "nouveau")),
            ...(desc
              ? { descriptionRaffinee: desc as unknown as Prisma.InputJsonValue }
              : {}),
          },
        });
        slugsPris.add(slug);
        crees++;
      }
    } catch (e) {
      erreurs.push(`Ligne ${numero} : erreur inattendue (${e instanceof Error ? e.message : "inconnue"}).`);
    }
  }

  revalidatePath("/admin"); revalidatePath("/admin/tutoriels"); revalidatePath("/tutoriels");

  return {
    ok: true,
    message: `Import des tutoriels terminé : ${crees} créé(s), ${majes} mis à jour, ${ignores} ignoré(s).`,
    crees,
    majes,
    ignores,
    erreurs: erreurs.slice(0, 30),
    erreursTotal: erreurs.length,
  };
}

// ─────────────────────────────────────────────────────────────────────
//  Import des PROMPTS
// ─────────────────────────────────────────────────────────────────────

export async function importerPromptsAction(_etat: EtatImport, donnees: FormData): Promise<EtatImport> {
  await exigerAdmin();

  const analyse = verifierCsv(await lireSource(donnees));
  if (!analyse || !("lignes" in analyse)) return analyse;
  const csv = analyse;
  const col = (champ: string) => csv.colonnes.has(normaliserEntete(champ));
  const maj = donnees.get("maj") === "on";

  // Index des catégories existantes (slug et nom)
  const cats = await prisma.promptCategorie.findMany();
  const indexCategorie = new Map<string, { id: string; slug: string }>();
  for (const c of cats) {
    indexCategorie.set(c.slug.toLowerCase(), { id: c.id, slug: c.slug });
    indexCategorie.set(c.nom.trim().toLowerCase(), { id: c.id, slug: c.slug });
  }
  const slugsCategoriesPris = new Set(cats.map((c) => c.slug));

  const existants = await prisma.prompt.findMany({ select: { slug: true } });
  const slugsPris = new Set(existants.map((p) => p.slug));
  const slugeur = new Sluggeur(slugifier, slugsPris);

  let crees = 0;
  let majes = 0;
  let ignores = 0;
  let categoriesCreees = 0;
  const erreurs: string[] = [];

  /** Trouve la catégorie (slug ou nom) ou la CRÉE à la volée. */
  async function trouverOuCreerCategorie(valeur: string, numero: number): Promise<{ id: string } | null> {
    const nom = valeur.trim();
    if (!nom) return null;
    const trouvee =
      indexCategorie.get(nom.toLowerCase()) ?? indexCategorie.get(slugifier(nom).toLowerCase()) ?? null;
    if (trouvee) return { id: trouvee.id };

    let slug = slugifier(nom);
    if (slugsCategoriesPris.has(slug)) {
      let n = 2;
      while (slugsCategoriesPris.has(`${slug}-${n}`)) n++;
      slug = `${slug}-${n}`;
    }
    try {
      const nouvelle = await prisma.promptCategorie.create({ data: { nom: nom.slice(0, 60), slug, ordre: 99 } });
      slugsCategoriesPris.add(slug);
      indexCategorie.set(nom.toLowerCase(), { id: nouvelle.id, slug });
      indexCategorie.set(slug, { id: nouvelle.id, slug });
      categoriesCreees++;
      return { id: nouvelle.id };
    } catch {
      erreurs.push(`Ligne ${numero} : impossible de créer la catégorie « ${nom} ».`);
      return null;
    }
  }

  for (let i = 0; i < csv.lignes.length; i++) {
    const l = csv.lignes[i];
    const numero = i + 2;

    try {
      const titre = lit(l, "titre").trim();
      const contenu = lit(l, "contenu").trim();
      if (titre.length < 4) {
        erreurs.push(`Ligne ${numero} : titre trop court ou manquant.`);
        continue;
      }
      if (contenu.length < 10) {
        erreurs.push(`Ligne ${numero} : contenu du prompt absent ou trop court — ${titre}.`);
        continue;
      }

      const slugDemande = lit(l, "slug").trim();
      const slug = slugDemande ? slugifier(slugDemande) : slugeur.de(titre);
      const existant = slugsPris.has(slug) ? await prisma.prompt.findUnique({ where: { slug } }) : null;
      if (existant && !maj) {
        ignores++;
        continue;
      }

      const categorieValeur = lit(l, "categorie").trim();
      let categorieId: string | null = null;
      if (categorieValeur) {
        const categorie = await trouverOuCreerCategorie(categorieValeur, numero);
        if (!categorie) continue;
        categorieId = categorie.id;
      } else if (!existant) {
        // À la création, la catégorie est obligatoire (schéma Prisma)
        erreurs.push(`Ligne ${numero} : colonne « categorie » obligatoire — ${titre}.`);
        continue;
      }

      // Description : fournie, sinon déduite du début du contenu
      const descriptionFournie = lit(l, "description").trim();
      const deduite =
        contenu.length > 160 ? `${contenu.slice(0, contenu.slice(0, 160).lastIndexOf(" "))}…` : contenu;

      if (existant) {
        const champs: Partial<{
          description: string; emoji: string; type: "TEXTE" | "IMAGE" | "CODE";
          modeles: string[]; sousCategorie: string; roles: string[];
          conseils: string; utilisation: string; ordre: number; vues: number;
          nouveau: boolean; categorieId: string;
        }> = {};
        if (col("description")) champs.description = (descriptionFournie || deduite).slice(0, 300);
        if (col("emoji")) champs.emoji = lit(l, "emoji").trim() || "✨";
        if (col("type")) champs.type = typePrompt(lit(l, "type"));
        if (col("modeles")) champs.modeles = decouper(lit(l, "modeles"));
        if (col("souscategorie")) champs.sousCategorie = lit(l, "souscategorie").trim().slice(0, 60);
        if (col("roles")) champs.roles = decouper(lit(l, "roles"), 10).map((r) => slugifier(r));
        if (col("conseils")) champs.conseils = lit(l, "conseils").trim().slice(0, 600);
        if (col("utilisation")) champs.utilisation = lit(l, "utilisation").trim().slice(0, 600);
        if (col("ordre")) champs.ordre = entier(lit(l, "ordre"), 0);
        if (col("vues")) champs.vues = entier(lit(l, "vues"), 0);
        if (col("nouveau")) champs.nouveau = booleen(lit(l, "nouveau"));
        if (categorieId) champs.categorieId = categorieId;

        await prisma.prompt.update({
          where: { id: existant.id },
          data: { titre: titre.slice(0, 120), contenu, ...champs },
        });
        majes++;
      } else {
        await prisma.prompt.create({
          data: {
            titre: titre.slice(0, 120),
            slug,
            contenu,
            description: (descriptionFournie || deduite).slice(0, 300),
            emoji: lit(l, "emoji").trim() || "✨",
            type: typePrompt(lit(l, "type")),
            modeles: decouper(lit(l, "modeles")),
            sousCategorie: lit(l, "souscategorie").trim().slice(0, 60),
            roles: decouper(lit(l, "roles"), 10).map((r) => slugifier(r)),
            conseils: lit(l, "conseils").trim().slice(0, 600),
            utilisation: lit(l, "utilisation").trim().slice(0, 600),
            ordre: entier(lit(l, "ordre"), 0),
            vues: entier(lit(l, "vues"), 0),
            nouveau: booleen(lit(l, "nouveau")),
            categorieId: categorieId!,
          },
        });
        slugsPris.add(slug);
        crees++;
      }
    } catch (e) {
      erreurs.push(`Ligne ${numero} : erreur inattendue (${e instanceof Error ? e.message : "inconnue"}).`);
    }
  }

  revalidatePath("/admin"); revalidatePath("/admin/prompts"); revalidatePath("/prompts");

  return {
    ok: true,
    message: `Import des prompts terminé : ${crees} créé(s), ${majes} mis à jour, ${ignores} ignoré(s).`,
    crees,
    majes,
    ignores,
    categoriesCreees,
    erreurs: erreurs.slice(0, 30),
    erreursTotal: erreurs.length,
  };
}