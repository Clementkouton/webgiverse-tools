// scripts/extraire-aixploria.js
// Lot 12 — script à exécuter DANS LA CONSOLE DE TON NAVIGATEUR (F12 → Console)
// sur la page https://www.aixploria.com/tutoriels-video-ia-formations-gratuites/
// (ton navigateur passe Cloudflare, contrairement aux scripts serveur).
//
// Il fait 3 choses automatiquement :
//   1. Clique sur « Voir plus de tutoriels » jusqu'à épuisement (pour tout charger),
//   2. Clique sur chaque miniature pour déclencher le lecteur et capturer l'ID YouTube,
//   3. Télécharge un fichier tutos-aixploria.json prêt pour scripts/migrer-tutos.ts.
//
// Durée estimée : 1 à 3 minutes pour ~300 tutoriels. Laisse l'onglet ouvert.
// Tu peux relancer le script plusieurs fois : le JSON est toujours complet.

(async() => {
    const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
    const log = (...a) => console.log("%c[AIXPLORIA]", "color:#6a3bff;font-weight:bold", ...a);

    // ── 1. Charger TOUTE la liste (bouton « Voir plus de tutoriels ») ──
    let clics = 0;
    while (clics < 40) {
        const bouton = [...document.querySelectorAll("button, a, div")]
            .filter((b) => b.offsetParent !== null && /^(voir (plus|tout)|load more|voir les)/i.test((b.textContent || "").trim()))
            .find((b) => (b.textContent || "").length < 60);
        if (!bouton) break;
        bouton.click();
        clics++;
        log(`Chargement des tutoriels… (clic ${clics})`);
        await attendre(900);
    }

    // ── 2. Détecter les cartes par heuristique (durée + niveau) ────────
    const RE_DUREE = /(\d+\s*h)?\s*\d+\s*min/i;
    const RE_NIVEAU = /(beginner|intermediate|advanced|débutant|intermédiaire|avancé)/i;
    const ID_DEPUIS_CHAINE = (s) => {
        const m = String(s || "").match(/(?:youtube(?:-nocookie)?\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([\w-]{11})/);
        return m ? m[1] : null;
    };

    const candidats = [...document.querySelectorAll("div, article, li")].filter((el) => {
        const t = (el.textContent || "").trim();
        if (!el.offsetParent) return false;
        if (!RE_DUREE.test(t) || !RE_NIVEAU.test(t)) return false;
        return t.length < 700; // une carte, pas toute la page
    });
    // On garde les conteneurs les plus petits (les cartes réelles).
    const cartes = candidats.filter((el) => !candidats.some((a) => a !== el && a.contains(el)));
    log(`${cartes.length} cartes détectées. Capture des vidéos en cours…`);

    // ── 3. Clic carte par carte pour révéler les iframes paresseuses ───
    const idParCarte = new Map();
    const miniParCarte = new Map();
    for (let i = 0; i < cartes.length; i++) {
        const carte = cartes[i];

        // Miniature : image du conteneur, ou fond CSS, ou attribut data.
        let miniature = null;
        const img = carte.querySelector("img");
        if (img) miniature = img.currentSrc || img.src || img.dataset.src || null;
        if (!miniature) {
            const fond = getComputedStyle(carte).backgroundImage.match(/url\("?([^")]+)"?\)/);
            if (fond) miniature = fond[1];
        }
        miniParCarte.set(carte, miniature);

        // ID déjà présent dans le conteneur (attributs data, iframes, liens) ?
        let id = null;
        for (const attr of Object.values(carte.dataset ? ? {})) {
            id = ID_DEPUIS_CHAINE(attr);
            if (id) break;
        }
        if (!id) id = ID_DEPUIS_CHAINE(carte.querySelector("iframe") ? .src);
        if (!id) {
            // Sinon : clic pour ouvrir le lecteur, capture, puis fermeture (Escape).
            const avant = [...document.querySelectorAll("iframe")].map((f) => f.src);
            carte.click();
            await attendre(350);
            const apres = [...document.querySelectorAll("iframe")].map((f) => f.src);
            const nouvelle = apres.find((s) => !avant.includes(s) && ID_DEPUIS_CHAINE(s));
            if (nouvelle) id = ID_DEPUIS_CHAINE(nouvelle);
            if (id) document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", keyCode: 27 }));
            window.dispatchEvent(new Event("keydown", { key: "Escape" }));
            const croix = document.querySelector("[class*='close' i], [aria-label*='close' i], .fancybox-close, .mfp-close");
            if (croix instanceof HTMLElement) croix.click();
            await attendre(120);
        }
        idParCarte.set(carte, id);
        if (i % 25 === 0) log(`Progression : ${i + 1}/${cartes.length}…`);
    }

    // ── 4. Analyser le texte de chaque carte ───────────────────────────
    const resultats = [];
    for (const carte of cartes) {
        const brut = (carte.textContent || "").replace(/\s+/g, " ").trim();
        const duree = brut.match(/(\d+\s*h\s*)?(\d+)\s*min/i) ? .[0] ? ? null;
        const niveau = brut.match(/beginner|intermediate|advanced|débutant|intermédiaire|avancé/i) ? .[0] ? ? null;
        const tags = brut.match(/#[^\s#]{2,30}/g) ? ? [];
        const vues = Number((brut.replace(/#/g, " ").match(/(\d{3,5})\s*$/) ? .[1] ? ? "0"));
        // Titre : texte entre le niveau et le premier # (nettoyé des métadonnées).
        const sansTags = brut.split("#")[0] ? ? "";
        const titre = (sansTags.split(/beginner|intermediate|advanced|débutant|intermédiaire|avancé/i).pop() ? ? "")
            .replace(RE_DUREE, "")
            .replace(/^[^\p{L}\d«"'(\[]+/u, "")
            .trim();
        if (!titre) continue;
        resultats.push({
            titre,
            duree,
            niveau,
            tags: tags.map((t) => t.slice(1).trim()),
            vues,
            youtubeId: idParCarte.get(carte) ? ? null,
            miniature: miniParCarte.get(carte) ? ? null,
        });
    }

    // ── 5. Télécharger le JSON + copier dans le presse-papiers ─────────
    const json = JSON.stringify({ extraitLe: new Date().toISOString(), tutos: resultats }, null, 2);
    try {
        await navigator.clipboard.writeText(json);
        log("JSON copié dans le presse-papiers ✅");
    } catch {}
    const blob = new Blob([json], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "tutos-aixploria.json";
    a.click();
    log(`${resultats.length} tutoriels extraits → tutos-aixploria.json téléchargé ✅`);
    log(`Avec ID YouTube : ${resultats.filter((r) => r.youtubeId).length}/${resultats.length}`);
    log("Place ensuite le fichier à la racine du projet et lance : npx tsx scripts/migrer-tutos.ts tutos-aixploria.json");
})();