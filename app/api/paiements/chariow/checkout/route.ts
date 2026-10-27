import { NextResponse } from "next/server";
import { auth } from "@/auth";

const PREFIXE = "[chariow-checkout]";

// Correspondance indicatif international -> code pays ISO (secours)
const INDICATIFS_VERS_PAYS: Record<string, string> = {
  "+229": "BJ", "+225": "CI", "+221": "SN", "+237": "CM", "+234": "NG",
  "+233": "GH", "+223": "ML", "+226": "BF", "+228": "TG", "+227": "NE",
  "+220": "GM", "+224": "GN", "+241": "GA", "+242": "CG", "+243": "CD",
  "+236": "CF", "+235": "TD", "+250": "RW", "+254": "KE", "+256": "UG",
  "+255": "TZ", "+258": "MZ", "+230": "MU", "+261": "MG", "+260": "ZM",
  "+263": "ZW", "+27": "ZA", "+212": "MA", "+213": "DZ", "+216": "TN",
  "+218": "LY", "+249": "SD", "+33": "FR", "+1": "US",
};

/**
 * Valide une origine selon la règle Chariow : https:// + hôte en minuscules,
 * port non-par-défaut autorisé, pas de chemin / requête / fragment / identifiants.
 * Renvoie l'origine nettoyée, ou null si elle doit être écartée.
 */
function origineSecurisee(brute: string | null | undefined): string | null {
  if (!brute) return null;
  let valeur = brute.trim().toLowerCase();
  if (valeur.endsWith("/")) valeur = valeur.slice(0, -1);
  if (!valeur.startsWith("https://")) return null;

  const reste = valeur.slice("https://".length);
  if (!reste) return null;
  if (reste.includes("@") || reste.includes("/") || reste.includes("?") || reste.includes("#")) return null;

  const morceaux = reste.split(":");
  if (morceaux.length > 2) return null;

  const hote = morceaux[0];
  if (!hote || !/^[a-z0-9.-]+$/.test(hote)) return null;

  if (morceaux.length === 2) {
    const port = morceaux[1];
    if (!/^\d{1,5}$/.test(port)) return null;
    const numeroPort = Number(port);
    if (numeroPort < 1 || numeroPort > 65535) return null;
    // Le port par défaut (443) est interdit par Chariow -> on le retire
    if (numeroPort === 443) return `https://${hote}`;
  }

  return `https://${hote}${morceaux.length === 2 ? `:${morceaux[1]}` : ""}`;
}

export async function POST(requete: Request) {
  try {
    // 1) L'utilisateur doit être connecté
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { ok: false, error: "Tu dois être connecté pour t'abonner." },
        { status: 401 }
      );
    }
    const utilisateur = session.user as unknown as {
      id?: string;
      email?: string | null;
      name?: string | null;
    };
    const email = utilisateur.email ?? "";
    if (!email) {
      return NextResponse.json(
        { ok: false, error: "Ton compte n'a pas d'adresse e-mail utilisable." },
        { status: 400 }
      );
    }

    // 2) Lecture du corps de la requête (avec plusieurs noms de champs acceptés)
    const corps = (await requete.json().catch(() => ({}))) as Record<string, unknown>;
    const texte = (cles: string[]): string | undefined => {
      for (const cle of cles) {
        const valeur = corps[cle];
        if (typeof valeur === "string" && valeur.trim()) return valeur.trim();
      }
      return undefined;
    };

    const clePlan = (texte(["plan", "clePlan", "offre"]) ?? "").toUpperCase();
    const plan = clePlan === "PRO" ? "PRO" : clePlan === "ENTREPRISE" ? "ENTREPRISE" : null;
    if (!plan) {
      return NextResponse.json(
        { ok: false, error: "Plan inconnu : attends PRO ou ENTREPRISE." },
        { status: 400 }
      );
    }

    // 3) Vérification de la configuration
    const cleApi = process.env.CHARIOW_API_KEY;
    if (!cleApi) {
      return NextResponse.json(
        { ok: false, error: "Configuration incomplète : ajoute CHARIOW_API_KEY dans les variables d'environnement." },
        { status: 500 }
      );
    }
    const idProduit = plan === "PRO" ? process.env.CHARIOW_PRODUCT_PRO : process.env.CHARIOW_PRODUCT_ENTREPRISE;
    if (!idProduit) {
      return NextResponse.json(
        { ok: false, error: `Configuration incomplète : ajoute CHARIOW_PRODUCT_${plan} dans les variables d'environnement.` },
        { status: 500 }
      );
    }

    // 4) Construction de la liste des origines autorisées (embed_origins)
    //    -> seules les origines HTTPS canoniques sont gardées, les autres sont écartées
    const origineBrute = requete.headers.get("origin");
    const origineRequete = origineSecurisee(origineBrute);
    if (origineBrute && !origineRequete) {
      console.log(`${PREFIXE} origine écartée (pas HTTPS canonique) : ${origineBrute}`);
    }

    let origineReferer: string | null = null;
    const referer = requete.headers.get("referer");
    if (referer) {
      try {
        origineReferer = origineSecurisee(new URL(referer).origin);
      } catch {
        origineReferer = null;
      }
    }

    const originesEnv = (process.env.CHARIOW_EMBED_ORIGINS ?? "")
      .split(",")
      .map((valeur) => origineSecurisee(valeur))
      .filter((valeur): valeur is string => Boolean(valeur));

    const origineApp = origineSecurisee(process.env.NEXT_PUBLIC_APP_URL);

    const origines: string[] = [];
    for (const candidate of [origineRequete, origineReferer, ...originesEnv, origineApp]) {
      if (candidate && !origines.includes(candidate)) origines.push(candidate);
      if (origines.length >= 4) break; // Chariow : 4 origines maximum
    }
    const encadrable = Boolean(origineRequete) && origines.includes(origineRequete as string);

    // 5) Téléphone et pays
    const numeroBrut = texte(["telephone", "numeroTelephone", "numero", "phone", "phoneNumber"]) ?? "";
    let numero = numeroBrut.replace(/\D/g, "");

    let codePays = (texte(["pays", "paysCode", "codePays", "country_code", "countryCode"]) ?? "").toUpperCase();
    if (!/^[A-Z]{2}$/.test(codePays)) {
      // Secours : on a peut-être reçu un indicatif (+229, 229...) au lieu du code ISO
      const indicatifBrut = texte(["indicatif"]) ?? codePays;
      const normalise = indicatifBrut.startsWith("+")
        ? indicatifBrut
        : indicatifBrut
          ? `+${indicatifBrut.replace(/\D/g, "")}`
          : "";
      codePays = INDICATIFS_VERS_PAYS[normalise] ?? "";
    }
    if (!numero || !/^[A-Z]{2}$/.test(codePays)) {
      return NextResponse.json(
        { ok: false, error: "Numéro de téléphone ou pays invalide. Vérifie le pays du numéro et le numéro saisi." },
        { status: 400 }
      );
    }

    // Si le numéro a été envoyé avec l'indicatif collé devant (ex : 2290169405198), on le retire
    const indicatifPays =
      Object.entries(INDICATIFS_VERS_PAYS).find(([, code]) => code === codePays)?.[0]?.replace("+", "") ?? "";
    if (indicatifPays && !numero.startsWith("0") && numero.startsWith(indicatifPays) && numero.length >= indicatifPays.length + 8) {
      numero = numero.slice(indicatifPays.length);
    }

    // 6) Prénom / nom depuis la session, IP du client pour de meilleurs moyens de paiement
    const morceauxNom = (utilisateur.name ?? "").trim().split(/\s+/).filter(Boolean);
    const prenom = (morceauxNom[0] || email.split("@")[0] || "Client").slice(0, 50);
    const nomFamille = (morceauxNom.slice(1).join(" ") || "-").slice(0, 50);

    const ipBrute =
      requete.headers.get("x-nf-client-connection-ip") ??
      requete.headers.get("x-forwarded-for")?.split(",")[0] ??
      "";
    const ip = ipBrute.trim();

    // 7) Préparation de la requête vers l'API Chariow
    const corpsChariow: Record<string, unknown> = {
      product_id: idProduit,
      email,
      first_name: prenom,
      last_name: nomFamille,
      phone: { number: numero, country_code: codePays },
      custom_metadata: { userId: utilisateur.id ?? "", plan, plateforme: "webgiverse" },
    };
        if (ip) corpsChariow.customer_ip = ip;
    if (origines.length > 0) corpsChariow.embed_origins = origines;
    if (origineRequete) {
      // Après paiement : Chariow renvoie la fenêtre vers NOTRE page de
      // retour ?embed=1 — la version compacte conçue pour l'iframe du
      // modal. BoutonPaiement détecte /tarifs/retour et referme la
      // fenêtre tout seul, puis emmène le client au tableau de bord.
      corpsChariow.redirect_url = `${origineRequete}/tarifs/retour?embed=1`;
    }

    console.log(
      `${PREFIXE} plan=${plan} produit=${idProduit} origines_autorisees=${JSON.stringify(origines)} encadrable=${encadrable}`
    );

    // 8) Appel à l'API Chariow
    const reponseChariow = await fetch("https://api.chariow.com/v1/checkout", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cleApi}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(corpsChariow),
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });

    const donnees = (await reponseChariow.json().catch(() => null)) as {
      message?: string;
      errors?: Record<string, string[]>;
      data?: {
        step?: string;
        message?: string | null;
        purchase?: { id?: string } | null;
        payment?: { checkout_url?: string | null } | null;
      } | null;
    } | null;

    // 9) Gestion des erreurs Chariow avec des messages clairs en français
    if (!reponseChariow.ok) {
      let message = donnees?.message ?? `Erreur Chariow ${reponseChariow.status}`;
      if (donnees?.errors) {
        const details = Object.entries(donnees.errors)
          .map(([champ, messages]) => `${champ} : ${messages.join(", ")}`)
          .join(" | ");
        if (details) message += ` (${details})`;
      }
      if (reponseChariow.status === 401) message = "Clé API Chariow invalide (vérifie CHARIOW_API_KEY).";
      if (reponseChariow.status === 403) {
        message =
          "Ta clé API Chariow n'a pas la permission checkout.write. Régénère la clé dans app.chariow.com/settings/api en cochant la portée Checkout (checkout.write).";
      }
      if (reponseChariow.status === 404) {
        message = "Produit Chariow introuvable ou non publié (vérifie CHARIOW_PRODUCT_PRO / CHARIOW_PRODUCT_ENTREPRISE).";
      }
      if (reponseChariow.status === 429) message = "Trop de tentatives de paiement à la minute. Réessaie dans un instant.";
      console.error(`${PREFIXE} échec : ${message}`);
      return NextResponse.json(
        {
          ok: false,
          error: message,
          message,
          urlSecours: plan === "PRO" ? process.env.CHARIOW_URL_PRO : process.env.CHARIOW_URL_ENTREPRISE,
        },
        { status: reponseChariow.status }
      );
    }

    // 10) Analyse de la réponse
    const etape = donnees?.data?.step;

    if (etape === "already_purchased") {
      const message =
        "Cet e-mail possède déjà ce produit chez Chariow. Gère ton abonnement depuis ton espace client Chariow.";
      console.log(`${PREFIXE} déjà acheté pour ${email}`);
      return NextResponse.json({ ok: false, error: message, message }, { status: 409 });
    }

    if (etape !== "payment" || !donnees?.data?.payment?.checkout_url) {
      // Cas théorique : produit terminé immédiatement (prix zéro)
      console.log(`${PREFIXE} étape inattendue : ${etape}`);
      const destination = "/dashboard/abonnement?paiement=reussi";
      return NextResponse.json({
        ok: true,
        url: destination,
        checkoutUrl: destination,
        checkout_url: destination,
        id: donnees?.data?.purchase?.id ?? null,
        embeddable: false,
        mode: "redirect",
      });
    }

    // 11) Succès : on renvoie le lien de paiement (plusieurs clés pour compatibilité)
    const lienPaiement = donnees.data.payment.checkout_url as string;
    console.log(`${PREFIXE} succès : vente=${donnees?.data?.purchase?.id ?? "?"} mode=${encadrable ? "embed" : "redirect"}`);
    return NextResponse.json({
      ok: true,
      url: lienPaiement,
      checkoutUrl: lienPaiement,
      checkout_url: lienPaiement,
      id: donnees?.data?.purchase?.id ?? null,
      embeddable: encadrable,
      mode: encadrable ? "embed" : "redirect",
    });
  } catch (erreur) {
    const message = erreur instanceof Error ? erreur.message : "Erreur inconnue";
    console.error(`${PREFIXE} exception :`, erreur);
    return NextResponse.json(
      { ok: false, error: `Impossible de contacter Chariow : ${message}`, message: `Impossible de contacter Chariow : ${message}` },
      { status: 502 }
    );
  }
}