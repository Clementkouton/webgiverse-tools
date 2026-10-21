import { NextRequest, NextResponse } from "next/server";
import * as authModule from "@/auth";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------
// Récupération de la session — next-auth v5 (Auth.js)
// Votre fichier auth.ts (racine du projet) exporte la fonction "auth"
// ---------------------------------------------------------------
async function obtenirSession(): Promise<any> {
  const mod: any = authModule;
  const fn = mod.auth ?? mod.default?.auth;
  if (typeof fn !== "function") {
    throw new Error(
      "Fonction \"auth\" introuvable dans auth.ts. Vérifiez qu'il contient : export const { handlers, auth, signIn, signOut } = NextAuth(...)"
    );
  }
  return fn();
}

// ---------------------------------------------------------------
// GET /api/conversations → liste des conversations de l'utilisateur
// ⚠️ Cette route n'a PAS de paramètre "id"
// ---------------------------------------------------------------
export async function GET() {
  try {
    const session = await obtenirSession();
    const utilisateurId = session?.user?.id;
    if (!utilisateurId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const conversations = await prisma.conversation.findMany({
      where: { utilisateurId },
      include: { _count: { select: { messages: true } } },
    });

    // Tri du plus récent au plus ancien (fonctionne quel que soit
    // le nom du champ de date dans votre schéma Prisma)
    conversations.sort((a: any, b: any) => {
      const da = new Date(a.updatedAt ?? a.majLe ?? a.createdAt ?? a.creeLe ?? 0).getTime();
      const db = new Date(b.updatedAt ?? b.majLe ?? b.createdAt ?? b.creeLe ?? 0).getTime();
      return db - da;
    });

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error("Erreur GET /api/conversations :", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// ---------------------------------------------------------------
// POST /api/conversations → créer une nouvelle conversation
// ---------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const session = await obtenirSession();
    const utilisateurId = session?.user?.id;
    if (!utilisateurId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const titre =
      typeof body?.titre === "string" && body.titre.trim().length > 0
        ? body.titre.trim()
        : "Nouvelle conversation";

    const conversation = await prisma.conversation.create({
      data: { titre, utilisateurId },
    });

    return NextResponse.json({ conversation }, { status: 201 });
  } catch (error) {
    console.error("Erreur POST /api/conversations :", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}