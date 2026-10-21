// Valide la syntaxe de tous les fichiers livrés (TSX + TS)
const ts = require("typescript");
const fs = require("fs");
const path = require("path");

const BASE = "/home/z/my-project/download/admin";

function listerFichiers(dossier) {
    let resultats = [];
    for (const entree of fs.readdirSync(dossier, { withFileTypes: true })) {
        const chemin = path.join(dossier, entree.name);
        if (entree.isDirectory()) resultats = resultats.concat(listerFichiers(chemin));
        else if (/\.(tsx?|ts)$/.test(entree.name)) resultats.push(chemin);
    }
    return resultats;
}

const fichiers = listerFichiers(BASE);
let echecs = 0;

for (const fichier of fichiers) {
    const source = fs.readFileSync(fichier, "utf8");
    const jsx = fichier.endsWith(".tsx");
    const resultat = ts.transpileModule(source, {
        compilerOptions: {
            jsx: jsx ? ts.JsxEmit.ReactJSX : ts.JsxEmit.None,
            target: ts.ScriptTarget.ES2022,
            module: ts.ModuleKind.ESNext,
            moduleResolution: ts.ModuleResolutionKind.Bundler,
            strict: true,
        },
        reportDiagnostics: true,
    });
    const problemes = (resultat.diagnostics || []).filter((d) => d.category === ts.DiagnosticCategory.Error);
    if (problemes.length > 0) {
        echecs++;
        console.log(`✗ ${path.relative(BASE, fichier)}`);
        for (const p of problemes.slice(0, 5)) {
            const { line, character } = p.file ? p.file.getLineAndCharacterOfPosition(p.start) : { line: 0, character: 0 };
            console.log(`   ligne ${line + 1}:${character + 1} — ${ts.flattenDiagnosticMessageText(p.messageText, " ")}`);
        }
    } else {
        console.log(`✓ ${path.relative(BASE, fichier)} (${source.split("\n").length} lignes)`);
    }
}

console.log(echecs === 0 ? "\n=== SYNTAXE OK POUR LES " + fichiers.length + " FICHIERS ===" : `\n=== ${echecs} FICHIER(S) EN ERREUR ===`);
process.exit(echecs === 0 ? 0 : 1);