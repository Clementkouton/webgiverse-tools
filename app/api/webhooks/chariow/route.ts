// app/api/webhooks/chariow/route.ts
// Webhook Chariow (« Pulses ») — VERSION 3 : diagnostic complet + mode tolérant.
// Alignée sur la documentation officielle : https://chariow.dev/en/guides/pulses
//
// Nouveautés V3 :
//   - GET  : répond un petit JSON (test de connectivité dans le navigateur).
//   - En cas d'échec de signature : on affiche TOUS les en-têtes reçus dans les
//     logs [chariow], pour voir exactement ce que Chariow envoie.
//   - CHARIOW_WEBHOOK_TOLERANT=1 : accepte les pulsations SANS signature
//     valide (débogage LOCAL uniquement — ne JAMAIS l'ajouter sur Netlify).
//
// Ce que Chariow envoie réellement :
//   En-têtes : x-chariow-signature = "sha256=<hex>" (HMAC-SHA256 du corps BRUT)
//              x-pulse-event = nom de l'événement (successful.sale, license.issued…)
//   Payload  : { event, sale: { id, amount: { value, currency }, status, … },
//                product: { id, name, … }, customer: { email, … }, store, checkout }
//            (pour les licences : license: { id, key, status, … } à la place de sale)
//
// Événements gérés :
//   successful.sale, license.issued → activation / prolongation de l'abonnement
//   failed.sale                     → paiement marqué ÉCHOUÉ
//   license.revoked, *cancel*       → renouvellement arrêté (accès jusqu'à l'échéance)
//   abandoned.sale, license.activated, license.expired, license.nearing_expiry,
//   affiliate.joined                → simplement accusés de réception (HTTP 200)
//
// Tout est loggué dans Netlify (Fonctions) avec le préfixe [chariow].

import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { activerAbonnement } from "@/lib/abonnements";
import { PLANS, type ClePlan } from "@/lib/plans";
import { envoyerEmail, emailPaiementConfirme } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Prix catalogue en centimes de dollar (lib/plans.ts) : utilisés quand la
// vente n'est pas en USD (ex. 1800 FCFA) — on enregistre alors le prix
// officiel du plan plutôt qu'un montant dans une devise non convertie.
const PRIX_CATALOGUE: Record<ClePlan, number> = { PRO: 299, ENTREPRISE: 799 };

// ── Outils de lecture des payloads ───────────────────────────────────

type Inconnu = Record<string, unknown>;

function estObjet(valeur: unknown): valeur is Inconnu {
  return typeof valeur === "object" && valeur !== null && !Array.isArray(valeur);
}

/** Le « cœur » de l'événement : sale (vente) ou license (licence). */
function coeurEvenement(evenement: Inconnu): Inconnu {
  if (estObjet(evenement.sale)) return evenement.sale;
  if (estObjet(evenement.license)) return evenement.license;
  return evenement;
}

/** E-mail du client : customer.email d'abord, puis recherche en profondeur. */
function chercherEmail(valeur: unknown, profondeur = 0): string | null {
  if (profondeur > 4) return null;
  if (Array.isArray(valeur)) {
    for (const item of valeur) {
      const trouve = chercherEmail(item, profondeur + 1);
      if (trouve) return trouve;
    }
    return null;
  }
  if (!estObjet(valeur)) {
    if (typeof valeur === "string") {
      const propre = valeur.trim().toLowerCase();
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(propre)) return propre;
    }
    return null;
  }
  if (estObjet(valeur.customer) && typeof valeur.customer.email === "string") {
    return valeur.customer.email.trim().toLowerCase();
  }
  if (typeof valeur.email === "string" && valeur.email.includes("@")) {
    return valeur.email.trim().toLowerCase();
  }
  for (const v of Object.values(valeur)) {
    const trouve = chercherEmail(v, profondeur + 1);
    if (trouve) return trouve;
  }
  return null;
}

/** Identifiant utilisateur Webgiverse transmis via sale.custom_metadata (si présent). */
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

/** Montant en centimes USD — uniquement si la devise est USD (2,99 → 299).
 * FCFA / XOF / EUR : renvoie null (pas de conversion au vol). */
function centimesUSD(evenement: Inconnu): number | null {
  const sale = estObjet(evenement.sale) ? evenement.sale : null;
  const amount = sale && estObjet(sale.amount) ? sale.amount : null;
  if (!amount || typeof amount.value !== "number" || Number.isNaN(amount.value) || amount.value <= 0) {
    return null;
  }
  const devise = typeof amount.currency === "string" ? amount.currency.toUpperCase() : "USD";
  if (devise !== "USD") return null;
  return Math.round(amount.value * 100);
}

/** PRO ou ENTREPRISE : par le nom du produit, sinon par le montant USD. */
function detecterPlan(evenement: Inconnu): ClePlan {
  const produit = evenement.product;
  if (estObjet(produit) && typeof produit.name === "string") {
    const nom = produit.name.toLowerCase();
    if (nom.includes("entreprise")) return "ENTREPRISE";
    if (nom.includes("pro")) return "PRO";
  }
  const centimes = centimesUSD(evenement);
  if (centimes !== null) {
    if (centimes >= 700 && centimes <= 900) return "ENTREPRISE";
    if (centimes < 500) return "PRO";
  }
  return "PRO";
}

/** Référence unique de la transaction : sale.id (ex. sal_…) ou license.id.
 * C'est la clé d'idempotence : un « Replay » Chariow renvoie le MÊME id,
 * donc la même vente n'est jamais comptée deux fois. */
function referenceTransaction(evenement: Inconnu): string {
  const coeur = coeurEvenement(evenement);
  const brut = coeur.id ?? evenement.id;
  const suffixe = typeof brut === "string" || typeof brut === "number" ? String(brut) : Date.now().toString(36);
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
    // Format officiel : "sha256=<hex>" — on tolère aussi "<hex>" et "t=…,v1=<hex>".
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

// GET : test de connectivité. Ouvre l'URL du webhook dans un navigateur :
// si tu vois ce JSON, le tunnel et l'application sont bien accessibles.
export async function GET() {
  return NextResponse.json({
    message: "Webhook Chariow opérationnel — en attente de pulsations.",
  });
}

export async function POST(requete: Request) {
  const secret = (process.env.CHARIOW_WEBHOOK_SECRET ?? "").trim();
  const tolerant = (process.env.CHARIOW_WEBHOOK_TOLERANT ?? "").trim() === "1";

  if (!secret && !tolerant) {
    console.error(
      "[chariow] CHARIOW_WEBHOOK_SECRET est ABSENT des variables → webhook inactif (503).",
    );
    return NextResponse.json(
      { message: "Webhook Chariow inactif (CHARIOW_WEBHOOK_SECRET manquant)." },
      { status: 503 },
    );
  }

  // Le corps BRUT est indispensable : la signature porte dessus.
  const corpsBrut = await requete.text();

  const entetePresent = ENTETES_SIGNATURE.some((nom) => requete.headers.get(nom));

  if (!secret && tolerant) {
    console.warn("[chariow] MODE TOLÉRANT sans secret : aucune vérification de signature.");
  }

  if (secret && !signatureValide(corpsBrut, requete.headers, secret)) {
    // Diagnostic : on affiche TOUS les en-têtes reçus pour voir ce que
    // Chariow (ou le tunnel VS Code) envoie vraiment.
    const entetesRecus = [...requete.headers.entries()]
      .map(([nom, valeur]) => `${nom}: ${valeur.slice(0, 100)}`)
      .join(" | ");
    console.warn(`[chariow] signature KO — en-têtes reçus : ${entetesRecus}`);
    console.warn(`[chariow] corps brut : ${corpsBrut.slice(0, 500)}`);

    if (!tolerant) {
      if (entetePresent) {
        console.error(
          "[chariow] signature INVALIDE — secret différent ou format non reconnu (403).",
        );
        return NextResponse.json({ message: "Signature invalide." }, { status: 403 });
      }
      console.error(
        "[chariow] signature ABSENTE — en-tête x-chariow-signature introuvable (401).",
      );
      return NextResponse.json({ message: "Signature absente." }, { status: 401 });
    }
    console.warn(
      "[chariow] MODE TOLÉRANT : pulsation acceptée SANS signature valide (débogage local).",
    );
  }

  let evenement: Inconnu;
  try {
    evenement = JSON.parse(corpsBrut) as Inconnu;
  } catch {
    return NextResponse.json({ message: "Corps invalide." }, { status: 400 });
  }
  if (!estObjet(evenement)) {
    return NextResponse.json({ message: "Corps inattendu." }, { status: 400 });
  }

  const nomEvenement = String(evenement.event ?? "").toLowerCase();
  console.log(`[chariow] événement reçu : « ${nomEvenement || "(non nommé)"} »`);
  console.log(`[chariow] payload : ${corpsBrut.slice(0, 1200)}`);

  // ── 1. ÉCHEC de paiement (failed.sale) : on note l'échec, sans toucher à l'accès.
  if (/(fail|declin|refus|echec)/.test(nomEvenement)) {
    const reference = referenceTransaction(evenement);
    const existant = await prisma.paiement.findUnique({ where: { reference } }).catch(() => null);
    if (existant) {
      await prisma.paiement.update({ where: { id: existant.id }, data: { statut: "ECHOUE" } });
      console.log(`[chariow] paiement ${reference} marqué ÉCHOUÉ.`);
    }
    return NextResponse.json({ recu: true });
  }

  // ── 2. ARRÊT / RÉVOCATION (license.revoked, subscription.cancelled…) :
  //       l'accès reste actif jusqu'à l'échéance déjà payée, mais sans renouvellement.
  if (/(cancel|unsubscrib|annul|arret|revok)/.test(nomEvenement)) {
    const email = chercherEmail(evenement);
    const idUtilisateur = chercherIdUtilisateur(evenement);
    const utilisateur = await trouverUtilisateur(idUtilisateur, email);
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
    } else {
      console.log(
        `[chariow] « ${nomEvenement} » : aucun compte Webgiverse pour email=${email ?? "-"} — rien à faire.`,
      );
    }
    return NextResponse.json({ recu: true });
  }

  // ── 3. SUCCÈS : successful.sale, license.issued (ou statut completed/paid).
  const statutVente =
    estObjet(evenement.sale) && typeof evenement.sale.status === "string"
      ? evenement.sale.status.toLowerCase()
      : "";
  const estSucces =
    /(success|complet|paid|paye|renew|issued)/.test(nomEvenement) ||
    /(complet|paid|success)/.test(statutVente);

  if (estSucces) {
    const email = chercherEmail(evenement);
    const idUtilisateur = chercherIdUtilisateur(evenement);
    const utilisateur = await trouverUtilisateur(idUtilisateur, email);

    if (!utilisateur) {
      console.error(
        `[chariow] ⚠️ PAIEMENT SANS COMPTE CORRESPONDANT — id=${idUtilisateur ?? "-"} ` +
          `email=${email ?? "-"}. Le client doit payer avec l'e-mail de son compte ` +
          "Webgiverse (le bouton Premium le pré-remplit désormais).",
      );
      return NextResponse.json({ recu: true, message: "Aucun compte correspondant." });
    }

    const plan = detecterPlan(evenement);
    const centimes = centimesUSD(evenement) ?? PRIX_CATALOGUE[plan];
    const reference = referenceTransaction(evenement);

    // Idempotence 1 : la même vente (même sale.id) n'est jamais comptée deux fois,
    // même si Chariow rejoue la livraison.
    const paiementExistant = await prisma.paiement.findUnique({ where: { reference } });
    if (paiementExistant?.statut === "PAYE") {
      console.log(`[chariow] transaction ${reference} déjà traitée — ignorée.`);
      return NextResponse.json({ recu: true });
    }

    // Idempotence 2 : un même achat déclenche DEUX événements (successful.sale
    // puis license.issued) avec des identifiants différents. On refuse donc de
    // compter deux paiements Chariow du même plan pour le même compte à moins
    // de 5 minutes d'écart (un vrai renouvellement arrive 30 jours plus tard).
    const ilYa5Minutes = new Date(Date.now() - 5 * 60 * 1000);
    const doublon = await prisma.paiement.findFirst({
      where: {
        utilisateurId: utilisateur.id,
        plan,
        statut: "PAYE",
        simulation: false,
        canal: "Chariow",
        creeLe: { gte: ilYa5Minutes },
      },
    });
    if (doublon) {
      console.log(
        `[chariow] double événement « ${nomEvenement} » déjà compté via ${doublon.reference} — ignoré.`,
      );
      return NextResponse.json({ recu: true });
    }

    const paiement = paiementExistant
      ? await prisma.paiement.update({
          where: { id: paiementExistant.id },
          data: { statut: "PAYE" },
        })
      : await prisma.paiement.create({
          data: {
            utilisateurId: utilisateur.id,
            plan,
            montant: centimes,
            devise: "USD",
            statut: "PAYE",
            reference,
            canal: "Chariow",
            simulation: false,
          },
        });

    // Active ou prolonge l'abonnement (prolonge depuis l'échéance déjà payée).
    await activerAbonnement({ utilisateurId: utilisateur.id, plan, paiementId: paiement.id });
    // Email de confirmation : récapitulatif plan + montant. Envoyé une seule
    // fois (les contrôles d'idempotence ci-dessus ont déjà filtré les replays
    // Chariow et les doubles événements successful.sale / license.issued).
    // envoyerEmail ne lève jamais d'exception : même en cas de problème SMTP,
    // le webhook répond correctement { recu: true } à Chariow.
    await envoyerEmail({
      a: utilisateur.email,
      sujet: "Paiement confirmé — ton abonnement Premium est actif",
      html: emailPaiementConfirme({
        plan: PLANS[plan]?.nom ?? plan,
        montant: `${(centimes / 100).toFixed(2)} USD`,
      }),
    });
    console.log(
      `[chariow] ✔ ${utilisateur.email} → plan ${plan} activé ` +
        `(${reference}, ${(centimes / 100).toFixed(2)} USD).`,
    );
    return NextResponse.json({ recu: true });
  }

  // ── 4. Tout le reste (abandoned.sale, license.activated, license.expired,
  //       license.nearing_expiry, affiliate.joined) : simple accusé de réception.
  console.log(`[chariow] événement ignoré : « ${nomEvenement} »`);
  return NextResponse.json({ recu: true });
}