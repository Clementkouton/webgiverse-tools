import { NextRequest, NextResponse } from "next/server";
import * as authModule from "@/auth";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------
// Récupération de la session — next-auth v5 (Auth.js)
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

type ParamsRoute = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------
// GET /api/conversations/[id] → UNE conversation + ses messages
// ---------------------------------------------------------------
export async function GET(request: NextRequest, { params }: ParamsRoute) {
  try {
    const session = await obtenirSession();
    const utilisateurId = session?.user?.id;
    if (!utilisateurId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Id manquant" }, { status: 400 });
    }

    const conversation = await prisma.conversation.findFirst({
      where: { id, utilisateurId },
      include: { messages: true },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });
    }

    // Tri des messages du plus ancien au plus récent
    const messages: any[] = conversation.messages as any[];
    messages.sort((a, b) => {
      const da = new Date(a.createdAt ?? a.creeLe ?? 0).getTime();
      const db = new Date(b.createdAt ?? b.creeLe ?? 0).getTime();
      return da - db;
    });

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error("Erreur GET /api/conversations/[id] :", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// ---------------------------------------------------------------
// PATCH /api/conversations/[id] → renommer
// ---------------------------------------------------------------
export async function PATCH(request: NextRequest, { params }: ParamsRoute) {
  try {
    const session = await obtenirSession();
    const utilisateurId = session?.user?.id;
    if (!utilisateurId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const titre = typeof body?.titre === "string" ? body.titre.trim() : "";
    if (!titre) {
      return NextResponse.json({ error: "Titre manquant" }, { status: 400 });
    }

    const existante = await prisma.conversation.findFirst({
      where: { id, utilisateurId },
    });
    if (!existante) {
      return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });
    }

    const conversation = await prisma.conversation.update({
      where: { id },
      data: { titre },
    });

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error("Erreur PATCH /api/conversations/[id] :", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// ---------------------------------------------------------------
// DELETE /api/conversations/[id] → supprimer (messages en cascade)
// ---------------------------------------------------------------
export async function DELETE(request: NextRequest, { params }: ParamsRoute) {
  try {
    const session = await obtenirSession();
    const utilisateurId = session?.user?.id;
    if (!utilisateurId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { id } = await params;

    const existante = await prisma.conversation.findFirst({
      where: { id, utilisateurId },
    });
    if (!existante) {
      return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 });
    }

    await prisma.conversation.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erreur DELETE /api/conversations/[id] :", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}