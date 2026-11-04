// app/actions/newsletter-admin.ts
// ─────────────────────────────────────────────────────────────────
// Lot 35 — Newsletter depuis l'admin : composer un e-mail, le
// préremplir avec les nouveaux outils de la semaine, l'envoyer à un
// segment (inscrits newsletter / gratuits / Premium / tous), suivre
// les envois. L'envoi utilise le transporteur SMTP de lib/email.ts.
// ─────────────────────────────────────────────────────────────────
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { envoyerEmail, gabaritCampagneNewsletter, echapperHtml } from "@/lib/email";

export type EtatCampagne = { ok: boolean; message: string; html?: string; sujet?: string } | null;

async function exigerAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Accès réservé aux administrateurs.");
  const moi = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (moi?.role !== "ADMIN") throw new Error("Accès réservé aux administrateurs.");
}

const schemaCampagne = z.object({
  sujet: z.string().trim().min(3, "Sujet trop court.").max(150),
  contenuHtml: z.string().min(10, "Le contenu est vide.").max(100_000),
  segment: z.enum(["ABONNES", "GRATUITS", "PREMIUM", "TOUS"]),
});

/** Crée un brouillon de campagne (formulaire /admin/newsletter). */
export async function creerCampagneFormulaire(donnees: FormData) {
  await exigerAdmin();
  const analyse = schemaCampagne.safeParse({
    sujet: donnees.get("sujet"),
    contenuHtml: donnees.get("contenuHtml"),
    segment: donnees.get("segment"),
  });
  if (!analyse.success) return;
  await prisma.campagneNewsletter.create({ data: analyse.data });
  revalidatePath("/admin/newsletter");
}

/** Supprime une campagne (brouillon ou envoyée). */
export async function supprimerCampagneFormulaire(donnees: FormData) {
  await exigerAdmin();
  const id = z.string().min(1).parse(donnees.get("campagneId"));
  await prisma.campagneNewsletter.delete({ where: { id } });
  revalidatePath("/admin/newsletter");
}

/** Envoie la campagne au segment choisi et archive le résultat. */
export async function envoyerCampagneFormulaire(
  _precedent: EtatCampagne,
  donnees: FormData
): Promise<EtatCampagne> {
  await exigerAdmin();

  const id = String(donnees.get("campagneId") ?? "");
  if (!id) return { ok: false, message: "Campagne introuvable." };

  const campagne = await prisma.campagneNewsletter.findUnique({ where: { id } });
  if (!campagne) return { ok: false, message: "Campagne introuvable." };

  // 1) Destinataires selon le segment (comptes suspendus/bannis épargnés).
  const maintenant = new Date();
  let emails: string[] = [];

  if (campagne.segment === "ABONNES" || campagne.segment === "TOUS") {
    const abonnes = await prisma.newsletterSubscriber.findMany({ select: { email: true } });
    emails.push(...abonnes.map((a) => a.email));
  }
  if (campagne.segment !== "ABONNES") {
    const utilisateurs = await prisma.user.findMany({
      where: { statut: "ACTIF" },
      select: {
        email: true,
        abonnement: {
          select: { statut: true, expireLe: true },
        },
      },
    });
    const premium = utilisateurs.filter(
      (u) =>
        u.abonnement?.statut === "ACTIF" && u.abonnement.expireLe > maintenant
    );
    if (campagne.segment === "PREMIUM") emails.push(...premium.map((u) => u.email));
    if (campagne.segment === "GRATUITS") {
      emails.push(...utilisateurs.filter((u) => !premium.includes(u)).map((u) => u.email));
    }
    if (campagne.segment === "TOUS") emails.push(...utilisateurs.map((u) => u.email));
  }
  emails = [...new Set(emails.map((e) => e.toLowerCase().trim()))].filter(Boolean);

  if (emails.length === 0) {
    return { ok: false, message: "Aucun destinataire dans ce segment." };
  }

  // 2) Envoi par lots de 25 (SMTP tolérant), échecs comptés.
  const html = gabaritCampagneNewsletter(campagne.sujet, campagne.contenuHtml);
  let echecs = 0;
  const TAILLE_LOT = 25;
  for (let debut = 0; debut < emails.length; debut += TAILLE_LOT) {
    const lot = emails.slice(debut, debut + TAILLE_LOT);
    const resultats = await Promise.allSettled(
      lot.map((email) =>
        envoyerEmail({ a: email, sujet: campagne.sujet, html })
      )
    );
    echecs += resultats.filter((r) => r.status !== "fulfilled" || r.value !== true).length;
  }

  await prisma.campagneNewsletter.update({
    where: { id: campagne.id },
    data: {
      statut: "ENVOYEE",
      destinataires: emails.length - echecs,
      echecs,
      envoyeLe: new Date(),
    },
  });
  revalidatePath("/admin/newsletter");

  return {
    ok: true,
    message: `Campagne envoyée : ${emails.length - echecs}/${emails.length} e-mails délivrés${echecs ? ` (${echecs} échec(s))` : ""}.`,
  };
}

/**
 * Bouton « Préremplir avec les nouveaux outils de la semaine » :
 * renvoie le sujet + le HTML (au client, pour remplir l'éditeur).
 */
export async function preRemplirSemaineAction(): Promise<EtatCampagne> {
  await exigerAdmin();

  const ilYA7Jours = new Date(Date.now() - 7 * 86_400_000);
  let outils = await prisma.tool.findMany({
    where: { statut: "PUBLIE", createdAt: { gte: ilYA7Jours } },
    orderBy: { createdAt: "desc" },
    take: 8,
    select: { nom: true, slug: true, description: true, tarif: true, gratuit: true },
  });
  let titreSection = "Les nouveaux outils de la semaine";
  if (outils.length === 0) {
    outils = await prisma.tool.findMany({
      where: { statut: "PUBLIE" },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { nom: true, slug: true, description: true, tarif: true, gratuit: true },
    });
    titreSection = "Les derniers outils ajoutés à l'annuaire";
  }
  if (outils.length === 0) {
    return { ok: false, message: "Aucun outil à annoncer — ajoute d'abord des outils." };
  }

  const base = process.env.NEXT_PUBLIC_APP_URL || "https://webgiverse-tools.vercel.app";
  const lignes = outils
    .map(
      (o) => `
      <p style="margin:0 0 16px;">
        <a href="${base}/outil/${o.slug}" style="color:#6a3bff; font-weight:bold; text-decoration:none; font-size:15px;">
          ${echapperHtml(o.nom)}
        </a>${o.gratuit ? ' <span style="background:#d1fae5; color:#065f46; border-radius:999px; padding:2px 8px; font-size:11px; font-weight:bold;">Gratuit</span>' : ""}
        <br/>
        <span style="color:#43507a; font-size:13px;">${echapperHtml(o.description.slice(0, 140))}${o.description.length > 140 ? "…" : ""}</span>
        <br/>
        <span style="color:#6b7280; font-size:12px;">${echapperHtml(o.tarif)}</span>
      </p>`
    )
    .join("");

  const html = `
    <h2 style="margin:0 0 16px; font-size:18px; color:#111827;">${titreSection}</h2>
    <p style="margin:0 0 16px;">Bonjour, voici la sélection de la semaine sur Webgiverse.</p>
    ${lignes}
    <p style="margin:24px 0; text-align:center;">
      <a href="${base}/outils?tri=recente"
        style="display:inline-block; background-color:#6a3bff; color:#ffffff;
        text-decoration:none; padding:12px 28px; border-radius:8px; font-weight:bold;">
        Voir tous les nouveaux outils
      </a>
    </p>`;

  return {
    ok: true,
    message: `${outils.length} outil(s) ajouté(s) à l'e-mail — ajuste le texte puis enregistre ou envoie.`,
    sujet: "Les nouveaux outils IA de la semaine — Webgiverse",
    html,
  };
}
