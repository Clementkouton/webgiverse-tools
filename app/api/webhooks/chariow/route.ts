// app/api/webhooks/chariow/route.ts
// Webhook Chariow (« Pulses ») — Approche A : Chariow est la caisse,
// la table Prisma Abonnement reste la source de vérité.
//
// À configurer côté Chariow :
//   URL du webhook : https://ton-site.netlify.app/api/webhooks/chariow
//   Secret         : le MÊME que CHARIOW_WEBHOOK_SECRET dans Netlify
//
// Événements gérés (les noms exacts varient selon le compte Chariow ;
// on regarde le texte, et tout est loggué dans Netlify avec [chariow]) :
//   succès     : payment.success / order.completed / subscription.renewed…
//   échec      : payment.failed / payment.declined…
//   annulation : subscription.cancelled / unsubscribed…

import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { activerAbonnement } from "@/lib/abonnements";
import type { ClePlan } from "@/lib/plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ── Outils de lecture des payloads (le format varie selon Chariow) ──

type Inconnu = Record<string, unknown>;

function estObjet(valeur: unknown): valeur is Inconnu {
  return typeof valeur === "object" && valeur !== null && !Array.isArray(valeur);
}

/** Cherche en profondeur (max 4 niveaux) la première chaîne ressemblant à un e-mail. */
function chercherEmail(valeur: unknown, profondeur = 0): string | null {
  if (profondeur > 4 || valeur == null) return null;
  if (typeof valeur === "string") {
    const propre = valeur.trim().toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(propre) ? propre : null;
  }
  if (Array.isArray(valeur)) {
    for (const item of valeur) {
      const trouve = chercherEmail(item, profondeur + 1);
      if (trouve) return trouve;
    }
    return null;
  }
  if (estObjet(valeur)) {
    for (const cle of ["email", "customer_email", "client_email", "payer_email"]) {
      const v = valeur[cle];
      if (typeof v === "string" && v.includes("@")) return v.trim().toLowerCase();
    }
    for (const v of Object.values(valeur)) {
      const trouve = chercherEmail(v, profondeur + 1);
      if (trouve) return trouve;
    }
  }
  return null;
}

/** Cherche l'identifiant utilisateur Webgiverse transmis au checkout (metadata…). */
function chercherIdUtilisateur(valeur: unknown, profondeur = 0): string | null {
  if (profondeur > 4 || !estObjet(valeur)) return null;
  for (const cle of ["userId", "utilisateurId", "user_id", "client_reference_id"]) {
    const v = valeur[cle];
    if (typeof v === "string" && v.length >= 10 && v.length <= 64) return v;
  }
  for (const v of Object.values(valeur)) {
    const trouve = chercherIdUtilisateur(v, profondeur + 1);
    if (trouve) return trouve;
  }
  return null;
}

/** Montant en centimes (299 = 2,99 USD). Tolère 2,99 comme 299. */
function centimesDe(donnees: Inconnu): number | null {
  const brut = donnees.amount ?? donnees.total ?? donnees.total_amount ?? donnees.price ?? donnees.montant;
  if (typeof brut !== "number" || Number.isNaN(brut) || brut <= 0) return null;
  return brut < 100 ? Math.round(brut * 100) : Math.round(brut);
}

/** PRO (≈ $2,99) ou ENTREPRISE (≈ $7,99) : par le montant, sinon par le nom du produit. */
function detecterPlan(donnees: Inconnu): ClePlan {
  const centimes = centimesDe(donnees);
  if (centimes !== null) {
    if (centimes >= 700 && centimes <= 900) return "ENTREPRISE";
    if (centimes > 0 && centimes < 500) return "PRO";
  }
  const libelles: string[] = [];
  for (const cle of ["product", "variant", "item", "plan", "offer"]) {
    const v = donnees[cle];
    if (estObjet(v) && typeof v.name === "string") libelles.push(v.name);
    if (typeof v === "string") libelles.push(v);
  }
  for (const cle of ["product_name", "variant_name", "item_name", "name", "title", "description"]) {
    const v = donnees[cle];
    if (typeof v === "string") libelles.push(v);
  }
  return libelles.some((t) => t.toLowerCase().includes("entreprise"))
    ? "ENTREPRISE"
    : "PRO";
}

/** Référence unique de la transaction (sert d'idempotence dans Paiement.reference). */
function referenceTransaction(donnees: Inconnu, evenement: Inconnu): string {
  const brut =
    donnees.id ?? donnees.transaction_id ?? donnees.transactionId ??
    donnees.reference ?? donnees.order_id ?? evenement.id;
  const suffixe =
    typeof brut === "string" || typeof brut === "number" ? String(brut) : Date.now().toString(36);
  return `CHW-${suffixe}`.slice(0, 190);
}

/** Retrouve le compte Webgiverse : par identifiant transmis, sinon par e-mail. */
async function trouverUtilisateur(idUtilisateur: string | null, email: string | null) {
  if (idUtilisateur) {
    const parId = await prisma.user.findUnique({ where: { id: idUtilisateur } }).catch(() => null);
    if (parId) return parId;
  }
  if (email) {
    const parEmail = await prisma.user.findUnique({ where: { email } }).catch(() => null);
    if (parEmail) return parEmail;
  }
  return null;
}

// ── Vérification de la signature (HMAC-SHA256 du corps BRUT) ────────

const ENTETES_SIGNATURE = [
  "x-chariow-signature",
  "x-chariow-signature-256",
  "x-webhook-signature",
  "x-signature",
];

function signatureValide(corpsBrut: string, entetes: Headers, secret: string): boolean {
  for (const nom of ENTETES_SIGNATURE) {
    const brute = entetes.get(nom);
    if (!brute) continue;
    // Formats tolérés : "<hex>", "sha256=<hex>", "t=…,v1=<hex>"
    const hex =
      brute
        .split(",")
        .map((m) => m.trim())
        .map((m) => (m.startsWith("sha256=") ? m.slice(7) : m.startsWith("v1=") ? m.slice(3) : m))
        .find((m) => /^[0-9a-f]{64}$/i.test(m)) ?? "";
    if (!hex) return false;
    const empreinte = crypto.createHmac("sha256", secret).update(corpsBrut).digest("hex");
    try {
      return crypto.timingSafeEqual(Buffer.from(empreinte), Buffer.from(hex.toLowerCase()));
    } catch {
      return false;
    }
  }
  return false; // aucun en-tête de signature connu n'a été trouvé
}

// ── La route ─────────────────────────────────────────────────────────

export async function POST(requete: Request) {
  const secret = (process.env.CHALIOW_WEBHOOK_SECRET ?? "").trim();
  if (!secret) {
    return NextResponse.json(
      { message: "Webhook Chariow inactif (CHARIOW_WEBHOOK_SECRET manquant)." },
      { status: 503 },
    );
  }

  // Le corps BRUT est indispensable : la signature porte dessus.
  const corpsBrut = await requete.text();

  const tolerant = (process.env.CHALIOW_WEBHOOK_TOLERANT ?? "").trim() === "1";
  const entetePresent = ENTETES_SIGNATURE.some((nom) => requete.headers.get(nom));

  if (!signatureValide(corpsBrut, requete.headers, secret)) {
    if (entetePresent) {
      console.error("[chariow] signature INVALIDE — vérifie CHARIOW_WEBHOOK_SECRET.");
      return NextResponse.json({ message: "Signature invalide." }, { status: 403 });
    }
    if (!tolerant) {
      console.error(
        "[chariow] signature ABSENTE — en-tête inconnu ? Envoie-moi les en-têtes," +
          " ou mets CHARIOW_WEBHOOK_TOLERANT=1 temporairement pour déboguer.",
      );
      return NextResponse.json({ message: "Signature absente." }, { status: 401 });
    }
    console.warn("[chariow] MODE TOLÉRANT : requête acceptée SANS signature (débogage).");
  }

  let evenement: Inconnu;
  try {
    evenement = JSON.parse(corpsBrut) as Inconnu;
  } catch {
    return NextResponse.json({ message: "Corps invalide." }, { status: 400 });
  }

  const nomEvenement = String(
    evenement.event ?? evenement.type ?? evenement.event_type ?? evenement.action ?? "",
  ).toLowerCase();
  const donnees = (estObjet(evenement.data)
    ? evenement.data
    : estObjet(evenement.payload)
      ? evenement.payload
      : evenement) as Inconnu;
  const statutBrut = String(donnees.status ?? donnees.payment_status ?? donnees.state ?? "")
    .toLowerCase();
  const texte = `${nomEvenement} ${statutBrut}`;

  console.log(`[chariow] événement reçu : « ${nomEvenement || "(non nommé)"} » statut=« ${statutBrut} »`);
  console.log(`[chariow] payload : ${corpsBrut.slice(0, 1200)}`);

  // ── 1. ÉCHEC de paiement : on note juste l'échec, sans toucher à l'accès.
  if (/(fail|declin|refus|echec)/.test(texte)) {
    const reference = referenceTransaction(donnees, evenement);
    const existant = await prisma.paiement.findUnique({ where: { reference } }).catch(() => null);
    if (existant) {
      await prisma.paiement.update({ where: { id: existant.id }, data: { statut: "ECHOUE" } });
      console.log(`[chariow] paiement ${reference} marqué ÉCHOUÉ.`);
    }
    return NextResponse.json({ recu: true });
  }

  // ── 2. ANNULATION : l'accès reste actif jusqu'à l'échéance déjà payée.
  if (/(cancel|unsubscrib|annul|arret)/.test(texte)) {
    const utilisateur = await trouverUtilisateur(
      chercherIdUtilisateur(donnees),
      chercherEmail(donnees),
    );
    if (utilisateur) {
      const abonnement = await prisma.abonnement.findUnique({
        where: { utilisateurId: utilisateur.id },
      });
      if (abonnement && !abonnement.annuleLe) {
        await prisma.abonnement.update({
          where: { id: abonnement.id },
          data: { annuleLe: new Date() },
        });
        console.log(
          `[chariow] ${utilisateur.email} : renouvellement arrêté (accès jusqu'à l'échéance).`,
        );
      }
    }
    return NextResponse.json({ recu: true });
  }

  // ── 3. SUCCÈS : paiement réussi, renouvellement, nouvelle souscription.
  if (
    /(success|succeed|complet|paid|paye|renew|activat)/.test(texte) ||
    /(subscription.*creat|creat.*subscription)/.test(texte)
  ) {
    const idUtilisateur = chercherIdUtilisateur(donnees);
    const email = chercherEmail(donnees);
    const utilisateur = await trouverUtilisateur(idUtilisateur, email);

    if (!utilisateur) {
      console.error(
        `[chariow] ⚠️ PAIEMENT SANS COMPTE CORRESPONDANT — id=${idUtilisateur ?? "-"} ` +
          `email=${email ?? "-"}. Le client doit payer avec l'e-mail de son compte Webgiverse.`,
      );
      return NextResponse.json({ recu: true, message: "Aucun compte correspondant." });
    }

    const plan = detecterPlan(donnees);
    const centimes = centimesDe(donnees) ?? (plan === "PRO" ? 299 : 799);
    const reference = referenceTransaction(donnees, evenement);
    const canal =
      typeof donnees.channel === "string"
        ? donnees.channel
        : typeof donnees.method === "string"
          ? donnees.method
          : typeof donnees.payment_method === "string"
            ? donnees.payment_method
            : "Chariow";

    // Idempotence : la même transaction ne doit jamais être traitée deux fois.
    const paiementExistant = await prisma.paiement.findUnique({ where: { reference } });
    if (paiementExistant?.statut === "PAYE") {
      console.log(`[chariow] transaction ${reference} déjà traitée — ignorée.`);
      return NextResponse.json({ recu: true });
    }

    const paiement = paiementExistant
      ? await prisma.paiement.update({
          where: { id: paiementExistant.id },
          data: { statut: "PAYE", canal },
        })
      : await prisma.paiement.create({
          data: {
            utilisateurId: utilisateur.id,
            plan,
            montant: centimes,
            devise: "USD",
            statut: "PAYE",
            reference,
            canal,
            simulation: false,
          },
        });

    // Active ou prolonge l'abonnement (prolonge depuis l'échéance déjà payée).
    await activerAbonnement({ utilisateurId: utilisateur.id, plan, paiementId: paiement.id });

    console.log(
      `[chariow] ✔ ${utilisateur.email} → plan ${plan} activé ` +
        `(${reference}, ${(centimes / 100).toFixed(2)} USD, via ${canal}).`,
    );
    return NextResponse.json({ recu: true });
  }

  // ── Autre événement : simple accusé de réception (Chariow ne relance pas).
  console.log(`[chariow] événement ignoré : « ${nomEvenement} »`);
  return NextResponse.json({ recu: true });
}