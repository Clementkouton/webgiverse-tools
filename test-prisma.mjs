// test-prisma.mjs — Diagnostic du client Prisma
// Lancer avec :  node test-prisma.mjs

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

console.log("");
console.log("=== DIAGNOSTIC PRISMA — Webgiverse Outils IA ===");
console.log("");

let toutOk = true;
const modeles = ["avis", "vote", "tool", "user", "favorite"];

for (const nom of modeles) {
    const present = prisma[nom] !== undefined;
    if (present) {
        console.log(`[OK]       prisma.${nom} : disponible`);
    } else {
        console.log(`[MANQUANT] prisma.${nom} : ABSENT — client Prisma pas (re)généré`);
        toutOk = false;
    }
}

if (!toutOk) {
    console.log("");
    console.log(">>> CORRECTION À APPLIQUER (dans l'ordre) :");
    console.log("1) Ctrl+C : arrêtez le serveur");
    console.log("2) prisma/schema.prisma : Ctrl+F « model Vote » — il ne doit apparaître QU'UNE FOIS");
    console.log("3) npx prisma validate");
    console.log("4) npx prisma generate");
    console.log("5) npx prisma db push");
    console.log("6) npm run dev");
    await prisma.$disconnect();
    process.exit(1);
}

try {
    const outils = await prisma.tool.count();
    console.log(`[OK]       Base connectée — ${outils} outil(s)`);

    const votes = await prisma.vote.count();
    console.log(`[OK]       Table Vote — ${votes} vote(s)`);

    const avis = await prisma.avis.count();
    console.log(`[OK]       Table Avis — ${avis} avis`);

    console.log("");
    console.log(">>> TOUT EST BON : redémarrez le serveur (npm run dev) puis testez les pages.");
} catch (e) {
    console.log("");
    console.log("[ECHEC] La base refuse la requête :", e.message);
    console.log(">>> Lancez : npx prisma db push   puis redémarrez le serveur.");
    await prisma.$disconnect();
    process.exit(1);
}

await prisma.$disconnect();