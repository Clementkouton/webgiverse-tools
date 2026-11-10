// app/api/listes/marque/route.ts
// Lot 55 — idée 16 : page publique « en-marque » pour le plan Entreprise.
// Le propriétaire définit un logo et une description affichés sur
// /listes/[slug] à la place des textes automatiques.
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { journaliser } from "@/lib/journal";
import { entrepriseActif } from "@/lib/premium";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ erreur: "Non autorisé." }, { status: 401 });
  }

  const { listeId, logoUrl, descriptionPartage } = await req.json();
  if (!listeId) {
    return NextResponse.json({ erreur: "Liste requise." }, { status: 400 });
  }

  const liste = await prisma.list.findUnique({ where: { id: String(listeId) } });
  if (!liste || liste.userId !== session.user.id) {
    return NextResponse.json({ erreur: "Liste introuvable." }, { status: 404 });
  }

  if (!(await entrepriseActif(session.user.id))) {
    return NextResponse.json(
      { erreur: "La personnalisation de la page est réservée au plan Entreprise." },
      { status: 403 }
    );
  }

  // Logo : lien http(s) facultatif, 500 caractères max.
  let logo: string | null = null;
  if (typeof logoUrl === "string" && logoUrl.trim()) {
    const valeur = logoUrl.trim();
    if (!/^https?:\/\//i.test(valeur) || valeur.length > 500) {
      return NextResponse.json(
        { erreur: "Le logo doit être un lien http(s) valide (500 caractères max)." },
        { status: 400 }
      );
    }
    logo = valeur;
  }

  // Description : texte facultatif, 300 caractères max.
  let description: string | null = null;
  if (typeof descriptionPartage === "string" && descriptionPartage.trim()) {
    const valeur = descriptionPartage.trim();
    if (valeur.length > 300) {
      return NextResponse.json(
        { erreur: "La description est limitée à 300 caractères." },
        { status: 400 }
      );
    }
    description = valeur;
  }

  const maj = (await prisma.list.update({
    where: { id: liste.id },
    data: { logoUrl: logo, descriptionPartage: description } as never,
  })) as typeof liste & {
    logoUrl: string | null;
    descriptionPartage: string | null;
  };

  await journaliser(
    session.user.id,
    "liste_marque_maj",
    JSON.stringify({ liste: maj.id })
  );

  return NextResponse.json({
    ok: true,
    logoUrl: maj.logoUrl,
    descriptionPartage: maj.descriptionPartage,
  });
}