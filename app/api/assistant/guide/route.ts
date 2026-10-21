// app/api/assistant/guide/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { selectionnerOutils } from "@/lib/assistant/scoring";

const schemaDiagnostic = z.object({
  objectif: z.enum(["Vendre", "Créer du contenu", "Automatiser", "Coder", "Communiquer", "Apprendre", "Gérer"]),
  niveau: z.enum(["Débutant", "Intermédiaire", "Avancé"]),
  budget: z.enum(["gratuit", "petit", "confort"]),
});

export async function POST(requete: Request) {
  const corps = await requete.json().catch(() => null);
  const analyse = schemaDiagnostic.safeParse(corps);
  if (!analyse.success) {
    return NextResponse.json({ erreur: "Réponses du diagnostic invalides." }, { status: 400 });
  }
  const diagnostic = analyse.data;

  const outilsSql = await prisma.tool.findMany({
    where: { statut: "PUBLIE" },
    include: { categories: { select: { categorie: { select: { nom: true, slug: true } } } } },
  });
  const catalogue = outilsSql.map((o) => ({
    id: o.id, slug: o.slug, nom: o.nom, description: o.description, tarif: o.tarif,
    tarifMin: o.tarifMin, gratuit: o.gratuit, openSource: o.openSource, niveau: o.niveau,
    objectifs: o.objectifs, categories: o.categories.map((c) => c.categorie.nom), type: o.type,
  }));

  const recommandations = selectionnerOutils(catalogue, diagnostic);

  const session = await auth();
  if (session?.user?.id) {
    await prisma.recommendation.create({
      data: {
        userId: session.user.id, mode: "guide",
        question: JSON.stringify(diagnostic),
        reponse: JSON.stringify(recommandations.map((r) => ({ slug: r.outil.slug, nom: r.outil.nom, explication: r.explication }))),
      },
    });
  }

  return NextResponse.json({
    recommandations,
    message: recommandations.length === 0
      ? "Aucun outil de l'annuaire ne colle à ce combo pour l'instant. Essaie d'élargir ton budget ou change d'objectif."
      : null,
  });
}