// app/api/embed/listes/[slug]/route.ts
// ─────────────────────────────────────────────────────────────────
// Lot 57 — Niveau 3 Entreprise : idée 20 (widget d'intégration).
// Renvoie une page HTML autonome (aucun header/footer du site)
// représentant une liste PUBLIQUE : à coller dans une <iframe>.
// Pourquoi une route API et pas une page Next : le layout racine
// du site ajoute le header et le footer partout ; une route API
// renvoie du HTML brut, 100 % maîtrisé, idéal pour un widget.
// ─────────────────────────────────────────────────────────────────

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Échappe les caractères sensibles du HTML (noms de listes/outils). */
function echapper(texte: string): string {
  return texte
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function GET(
  _requete: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Seules les listes partagées publiquement sont intégrables
  // (le slug OU l'identifiant, comme la page publique).
  let donnees: {
    nom: string;
    slug: string | null;
    outils: {
      nom: string;
      slug: string;
      description: string;
      tarif: string;
      gratuit: boolean;
      logo: string | null;
    }[];
  } | null = null;

  try {
    const liste = await prisma.list.findFirst({
      where: {
        OR: [{ slug }, { id: slug }],
        estPublique: true,
      },
      select: {
        nom: true,
        slug: true,
        items: {
          orderBy: { createdAt: "asc" },
          select: {
            tool: {
              select: {
                nom: true,
                slug: true,
                description: true,
                tarif: true,
                gratuit: true,
                logo: true,
                statut: true,
              },
            },
          },
        },
      },
    });
    if (liste) {
      donnees = {
        nom: liste.nom,
        slug: liste.slug,
        outils: liste.items
          .filter((item) => item.tool.statut === "PUBLIE")
          .map((item) => ({
            nom: item.tool.nom,
            slug: item.tool.slug,
            description: item.tool.description,
            tarif: item.tool.tarif,
            gratuit: item.tool.gratuit,
            logo: item.tool.logo,
          })),
      };
    }
  } catch (erreur) {
    console.error("Widget embed (base) :", erreur);
    // on renvoie le widget « indisponible » plutôt qu'un 500
  }

  // ── Rendu HTML autonome ─────────────────────────────────────
  const corpsOutils = donnees?.outils.length
    ? donnees.outils
        .map(
          (outil) => `
      <li>
        ${outil.logo ? `<img src="${echapper(outil.logo)}" alt="" loading="lazy" />` : ""}
        <div class="infos">
          <p class="nom">${echapper(outil.nom)}${outil.gratuit ? ' <span class="gratuit">gratuit</span>' : ""}</p>
          <p class="desc">${echapper(outil.description)}</p>
          <p class="tarif">${echapper(outil.tarif)}</p>
        </div>
        <a href="${base}/outil/${echapper(outil.slug)}" target="_blank" rel="noopener">Voir</a>
      </li>`
        )
        .join("")
    : `<li class="vide">Aucun outil dans cette liste pour le moment.</li>`;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${echapper(donnees?.nom ?? "Liste Webgiverse")}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
         background: #ffffff; color: #1f2937; padding: 16px; }
  h1 { font-size: 17px; font-weight: 700; color: #111827;
       display: flex; align-items: center; gap: 8px; }
  .compte { font-size: 12px; font-weight: 600; color: #7c3aed;
            background: #f5f3ff; border-radius: 999px; padding: 2px 10px; }
  ul { list-style: none; margin-top: 12px; }
  li { display: flex; align-items: center; gap: 12px;
       border: 1px solid #e5e7eb; border-radius: 12px;
       padding: 10px 12px; margin-bottom: 8px; background: #f9fafb; }
  img { width: 32px; height: 32px; border-radius: 8px; object-fit: contain;
        background: #fff; flex-shrink: 0; }
  .infos { min-width: 0; flex: 1; }
  .nom { font-size: 14px; font-weight: 600; }
  .gratuit { font-size: 10px; font-weight: 700; color: #047857;
             background: #d1fae5; border-radius: 999px; padding: 1px 6px;
             vertical-align: middle; }
  .desc { font-size: 12px; color: #6b7280; overflow: hidden;
          text-overflow: ellipsis; white-space: nowrap; margin-top: 2px; }
  .tarif { font-size: 11px; color: #9ca3af; margin-top: 2px; }
  a { font-size: 12px; font-weight: 600; color: #7c3aed; text-decoration: none;
      border: 1px solid #ddd6fe; border-radius: 999px; padding: 6px 12px;
      flex-shrink: 0; }
  a:hover { background: #f5f3ff; }
  .vide { justify-content: center; color: #6b7280; font-size: 13px; }
  .pied { margin-top: 10px; text-align: center; font-size: 11px; color: #9ca3af; }
  .pied a { border: none; padding: 0; font-weight: 700; }
</style>
</head>
<body>
  <h1>${echapper(donnees?.nom ?? "Liste indisponible")}
    ${donnees ? `<span class="compte">${donnees.outils.length} outil${donnees.outils.length > 1 ? "s" : ""}</span>` : ""}
  </h1>
  <ul>${corpsOutils}</ul>
  ${donnees?.slug ? `<p class="pied">Propulsé par <a href="${base}/listes/${echapper(donnees.slug)}" target="_blank" rel="noopener">Webgiverse</a></p>` : `<p class="pied">Propulsé par Webgiverse</p>`}
</body>
</html>`;

  return new Response(html, {
    status: donnees ? 200 : 404,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      "X-Frame-Options": "ALLOWALL",
    },
  });
}
