// scripts/test-description-csv.ts
// ─────────────────────────────────────────────────────────────────
// Lot 29 — Tests unitaires de parserDescriptionRaffineeCsv (import
// CSV des tutoriels). Sans base de données ni dépendance :
//   npx tsx scripts/test-description-csv.ts
// ─────────────────────────────────────────────────────────────────
import {
  parserDescriptionRaffineeCsv,
  parserDescriptionRaffinee,
  type ResultatDescriptionCsv,
} from "../lib/description-youtube";
import { parserCsv, lit } from "../lib/csv";

let reussis = 0;
let echoues = 0;

function verifie(nom: string, condition: boolean, detail?: string): void {
  if (condition) {
    reussis++;
    console.log(`  ✅ ${nom}`);
  } else {
    echoues++;
    console.error(`  ❌ ${nom}${detail ? ` — ${detail}` : ""}`);
  }
}

function ok(r: ResultatDescriptionCsv): Extract<ResultatDescriptionCsv, { ok: true }> {
  if (!r.ok) throw new Error(`attendu ok, obtenu erreur : ${r.erreur}`);
  return r;
}

function ko(r: ResultatDescriptionCsv): string {
  if (r.ok) throw new Error("attendu erreur, obtenu ok");
  return r.erreur;
}

const VIDE = { json: "", chapitres: "", ressources: "", paragraphes: "" };

console.log("\n── JSON complet (structure du scraper) ──────────────────");
{
  const json = JSON.stringify({
    chapitres: [{ temps: "00:00", titre: "Intro" }, { temps: "02:35", titre: "Installation" }],
    ressources: [{ label: null, url: "https://example.com/a" }, { label: "Guide", url: "https://docs.fr/x" }],
    paragraphes: ["Bienvenue !", "Deuxième paragraphe."],
  });
  const r = ok(parserDescriptionRaffineeCsv({ ...VIDE, json }));
  const v = r.valeur!;
  verifie("JSON accepté tel quel", !("vide" in v) && v.chapitres.length === 2 && v.ressources.length === 2 && v.paragraphes.length === 2);
}
{
  const r = ok(parserDescriptionRaffineeCsv({ ...VIDE, json: JSON.stringify({ vide: true }) }));
  verifie("{« vide »: true} conservé", r.valeur !== null && "vide" in r.valeur);
}
{
  const json = JSON.stringify({ chapitres: [{ temps: "00:00" }], ressources: [{ label: null }], paragraphes: ["   "] });
  const r = ok(parserDescriptionRaffineeCsv({ ...VIDE, json }));
  verifie("JSON tout vide → {vide: true}", r.valeur !== null && "vide" in r.valeur);
}
{
  const json = JSON.stringify({
    chapitres: [{ temps: "00:00", titre: "Bon" }, { pasDeTemps: true }],
    ressources: [{ label: null, url: "https://ok.fr" }, 42],
    paragraphes: ["Texte", 99],
  });
  const r = ok(parserDescriptionRaffineeCsv({ ...VIDE, json }));
  const v = r.valeur!;
  verifie(
    "Entrées JSON invalides filtrées",
    !("vide" in v) && v.chapitres.length === 1 && v.ressources.length === 1 && v.paragraphes.length === 1,
  );
}
verifie("JSON cassé rejeté", ko(parserDescriptionRaffineeCsv({ ...VIDE, json: '{"chapitres":' })).includes("JSON invalide"));
verifie("JSON tableau rejeté", ko(parserDescriptionRaffineeCsv({ ...VIDE, json: "[1,2]" })).includes("objet JSON"));

console.log("\n── Mot-clé « vide » ─────────────────────────────────────");
for (const mot of ["vide", "VIDE", "-", "rien"]) {
  const r = ok(parserDescriptionRaffineeCsv({ ...VIDE, json: mot }));
  verifie(`« ${mot} » → {vide: true}`, r.valeur !== null && "vide" in r.valeur);
}

console.log("\n── Syntaxe lisible : chapitres ──────────────────────────");
{
  const r = ok(parserDescriptionRaffineeCsv({ ...VIDE, chapitres: "00:00 Intro | 1:02:30 Grand chapitre | 12:05   Astuces" }));
  const v = r.valeur!;
  verifie("mm:ss et hh:mm:ss acceptés", !("vide" in v) && v.chapitres.length === 3);
  verifie("Temps et titre découpés", !("vide" in v) && v.chapitres[1]!.temps === "1:02:30" && v.chapitres[1]!.titre === "Grand chapitre");
}
{
  const e = ko(parserDescriptionRaffineeCsv({ ...VIDE, chapitres: "00:00 Intro | Introduction sans temps" }));
  verifie("Chapitre sans temps rejeté", e.includes("chapitre illisible") && e.includes("Introduction sans temps"));
}

console.log("\n── Syntaxe lisible : ressources ─────────────────────────");
{
  const r = ok(
    parserDescriptionRaffineeCsv({
      ...VIDE,
      ressources: "https://example.com | Guide officiel : https://docs.fr/page | Doc API - https://api.ex.org/v1",
    }),
  );
  const v = r.valeur!;
  verifie("3 ressources acceptées", !("vide" in v) && v.ressources.length === 3);
  verifie("URL nue → label null", !("vide" in v) && v.ressources[0]!.label === null);
  verifie("Label « : » nettoyé", !("vide" in v) && v.ressources[1]!.label === "Guide officiel");
  verifie("Label « - » nettoyé", !("vide" in v) && v.ressources[2]!.label === "Doc API");
}
{
  verifie("Ressource sans URL rejetée", ko(parserDescriptionRaffineeCsv({ ...VIDE, ressources: "Juste un texte" })).includes("sans URL"));
  verifie("URL invalide rejetée", ko(parserDescriptionRaffineeCsv({ ...VIDE, ressources: "https://" })).includes("invalide"));
  verifie("ftp:// rejeté (seuls http/https passent)", ko(parserDescriptionRaffineeCsv({ ...VIDE, ressources: "ftp://files.fr/x" })).length > 0);
}

console.log("\n── Syntaxe lisible : paragraphes ────────────────────────");
{
  const r = ok(parserDescriptionRaffineeCsv({ ...VIDE, paragraphes: "Premier paragraphe || Second |||  Troisième | avec un seul pipe" }));
  const v = r.valeur!;
  verifie("« || » sépare, « | » simple préservé", !("vide" in v) && v.paragraphes.length === 3 && v.paragraphes[2]!.includes("|"));
}

console.log("\n── Cellules vides = inchangé ────────────────────────────");
verifie("Tout vide → valeur null", ok(parserDescriptionRaffineeCsv(VIDE)).valeur === null);
verifie(
  "Colonnes vides avec description existante → inchangée (null)",
  ok(parserDescriptionRaffineeCsv(VIDE, { chapitres: [{ temps: "00:00", titre: "Ancien" }], ressources: [], paragraphes: [] })).valeur === null,
);

console.log("\n── Fusion partielle (mode mise à jour) ──────────────────");
{
  const existante = {
    chapitres: [{ temps: "00:00", titre: "Ancien chapitre" }],
    ressources: [{ label: null, url: "https://ancien.fr" }],
    paragraphes: ["Ancien paragraphe"],
  };
  const r = ok(parserDescriptionRaffineeCsv({ ...VIDE, ressources: "https://nouveau.fr" }, existante));
  const v = r.valeur!;
  verifie("Ressources remplacées", !("vide" in v) && v.ressources.length === 1 && v.ressources[0]!.url === "https://nouveau.fr/");
  verifie("Chapitres conservés", !("vide" in v) && v.chapitres[0]!.titre === "Ancien chapitre");
  verifie("Paragraphes conservés", !("vide" in v) && v.paragraphes[0] === "Ancien paragraphe");
}
{
  const r = ok(parserDescriptionRaffineeCsv({ ...VIDE, chapitres: "05:00 Nouveau" }, { vide: true }));
  const v = r.valeur!;
  verifie("Base {vide:true} = base vide", !("vide" in v) && v.chapitres.length === 1 && v.ressources.length === 0);
}

console.log("\n── Priorité du JSON sur les colonnes lisibles ───────────");
{
  const r = ok(
    parserDescriptionRaffineeCsv({
      json: JSON.stringify({ chapitres: [{ temps: "00:00", titre: "Depuis JSON" }], ressources: [], paragraphes: [] }),
      chapitres: "09:99 Depuis colonne",
      ressources: "",
      paragraphes: "",
    }),
  );
  const v = r.valeur!;
  verifie("JSON gagne", !("vide" in v) && v.chapitres.length === 1 && v.chapitres[0]!.titre === "Depuis JSON");
}

console.log("\n── Allers-retours avec l'affichage ──────────────────────");
{
  const r = ok(
    parserDescriptionRaffineeCsv({
      ...VIDE,
      chapitres: "00:00 Intro",
      ressources: "https://exemple.fr/ressource",
      paragraphes: "Un texte.",
    }),
  );
  verifie("Valeur produite relisible par parserDescriptionRaffinee", parserDescriptionRaffinee(r.valeur) !== null);
}
{
  verifie("{vide:true} relu → null (rien à afficher)", parserDescriptionRaffinee({ vide: true }) === null);
}

console.log("\n── Bout en bout : fichier CSV réel ──────────────────────");
{
  const json = JSON.stringify({
    chapitres: [{ temps: "00:00", titre: "Intro ; avec point-virgule" }],
    ressources: [],
    paragraphes: ["Un, deux, trois."],
  });
  // Cellule JSON entre guillemets (guillemets intérieurs doublés), 
  // comme la produirait Excel / Google Sheets.
  const csv =
    "titre;youtubeId;chapitres;ressources;paragraphes;descriptionRaffinee\n" +
    `Tuto A;abc12345678;00:00 Début|01:10 Suite;https://ex.fr;;\n` +
    `Tuto B;def67890123;;;"";"${json.replace(/"/g, '""')}";\n` +
    "Tuto C;ghi90123456;;;;\n";
  const parse = parserCsv(csv);
  verifie("CSV 3 lignes + séparateur ; détecté", parse !== null && parse.total === 3);
  if (parse) {
    const [a, b, c] = parse.lignes;

    const ra = ok(
      parserDescriptionRaffineeCsv(
        { json: lit(a!, "descriptionRaffinee"), chapitres: lit(a!, "chapitres"), ressources: lit(a!, "ressources"), paragraphes: lit(a!, "paragraphes") },
        null,
      ),
    );
    const va = ra.valeur!;
    verifie(
      "Ligne A (syntaxe lisible) → 2 chapitres + 1 ressource",
      !("vide" in va) && va.chapitres.length === 2 && va.ressources.length === 1,
    );

    const rb = ok(
      parserDescriptionRaffineeCsv(
        { json: lit(b!, "descriptionRaffinee"), chapitres: lit(b!, "chapitres"), ressources: lit(b!, "ressources"), paragraphes: lit(b!, "paragraphes") },
        null,
      ),
    );
    const vb = rb.valeur!;
    verifie(
      "Ligne B (JSON quoté) → chapitre avec « ; » intact",
      !("vide" in vb) && vb.chapitres[0]!.titre === "Intro ; avec point-virgule" && vb.paragraphes[0] === "Un, deux, trois.",
    );

    verifie("Ligne C (tout vide) → inchangé (null)", ok(parserDescriptionRaffineeCsv({ json: lit(c!, "descriptionRaffinee"), chapitres: lit(c!, "chapitres"), ressources: lit(c!, "ressources"), paragraphes: lit(c!, "paragraphes") }, null)).valeur === null);
  }
}

console.log(`\n═══ Résultat : ${reussis} réussis, ${echoues} échoués ═══\n`);
process.exit(echoues > 0 ? 1 : 0);
