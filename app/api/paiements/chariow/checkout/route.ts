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
 * Valide une origine selon la rÃ¨gle Chariow : https:// + hÃ´te en minuscules,
 * port non-par-dÃ©faut autorisÃ©, pas de chemin / requÃªte / fragment / identifiants.
 * Renvoie l'origine nettoyÃ©e, ou null si elle doit Ãªtre Ã©cartÃ©e.
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
    // Le port par dÃ©faut (443) est interdit par Chariow -> on le retire
    if (numeroPort === 443) return `https://${hote}`;
  }

  return `https://${hote}${morceaux.length === 2 ? `:${morceaux[1]}` : ""}`;
}

export async function POST(requete: Request) {
  try {
    // 1) L'utilisateur doit Ãªtre connectÃ©
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { ok: false, error: "Tu dois Ãªtre connectÃ© pour t'abonner." },
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

    // 2) Lecture du corps de la requÃªte (avec plusieurs noms de champs acceptÃ©s)
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

    // 3) VÃ©rification de la configuration
    const cleApi = process.env.CHARIOW_API_KEY;
    if (!cleApi) {
      return NextResponse.json(
        { ok: false, error: "Configuration incomplÃ¨te : ajoute CHARIOW_API_KEY dans les variables d'environnement." },
        { status: 500 }
      );
    }
    const idProduit = plan === "PRO" ? process.env.CHARIOW_PRODUCT_PRO : process.env.CHARIOW_PRODUCT_ENTREPRISE;
    if (!idProduit) {
      return NextResponse.json(
        { ok: false, error: `Configuration incomplÃ¨te : ajoute CHARIOW_PRODUCT_${plan} dans les variables d'environnement.` },
        { status: 500 }
      );
    }

    // 4) Construction de la liste des origines autorisÃ©es (embed_origins)
    //    -> seules les origines HTTPS canoniques sont gardÃ©es, les autres sont Ã©cartÃ©es
    const origineBrute = requete.headers.get("origin");
    const origineRequete = origineSecurisee(origineBrute);
    if (origineBrute && !origineRequete) {
      console.log(`${PREFIXE} origine Ã©cartÃ©e (pas HTTPS canonique) : ${origineBrute}`);
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

    // 5) TÃ©lÃ©phone et pays
    const numeroBrut = texte(["telephone", "numeroTelephone", "numero", "phone", "phoneNumber"]) ?? "";
    let numero = numeroBrut.replace(/\D/g, "");

    let codePays = (texte(["pays", "paysCode", "codePays", "country_code", "countryCode"]) ?? "").toUpperCase();
    if (!/^[A-Z]{2}$/.test(codePays)) {
      // Secours : on a peut-Ãªtre reÃ§u un indicatif (+229, 229...) au lieu du code ISO
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
        { ok: false, error: "NumÃ©ro de tÃ©lÃ©phone ou pays invalide. VÃ©rifie le pays du numÃ©ro et le numÃ©ro saisi." },
        { status: 400 }
      );
    }

    // Si le numÃ©ro a Ã©tÃ© envoyÃ© avec l'indicatif collÃ© devant (ex : 2290169405198), on le retire
    const indicatifPays =
      Object.entries(INDICATIFS_VERS_PAYS).find(([, code]) => code === codePays)?.[0]?.replace("+", "") ?? "";
    if (indicatifPays && !numero.startsWith("0") && numero.startsWith(indicatifPays) && numero.length >= indicatifPays.length + 8) {
      numero = numero.slice(indicatifPays.length);
    }

    // 6) PrÃ©nom / nom depuis la session, IP du client pour de meilleurs moyens de paiement
    const morceauxNom = (utilisateur.name ?? "").trim().split(/\s+/).filter(Boolean);
    const prenom = (morceauxNom[0] || email.split("@")[0] || "Client").slice(0, 50);
    const nomFamille = (morceauxNom.slice(1).join(" ") || "-").slice(0, 50);

    const ipBrute =
      requete.headers.get("x-nf-client-connection-ip") ??
      requete.headers.get("x-forwarded-for")?.split(",")[0] ??
      "";
    const ip = ipBrute.trim();

    // 7) PrÃ©paration de la requÃªte vers l'API Chariow
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
      // AprÃ¨s paiement : Chariow renvoie la fenÃªtre vers NOTRE page de
      // retour ?embed=1 â€” la version compacte conÃ§ue pour l'iframe du
      // modal. BoutonPaiement dÃ©tecte /tarifs/retour et referme la
      // fenÃªtre tout seul, puis emmÃ¨ne le client au tableau de bord.
      corpsChariow.redirect_url = `${origineRequete}/tarifs/retour`;
    }

    console.log(
      `${PREFIXE} plan=${plan} produit=${idProduit} origines_autorisees=${JSON.stringify(origines)} encadrable=${encadrable}`
    );

    // 8) Appel Ã  l'API Chariow
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

    // 9) Gestion des erreurs Chariow avec des messages clairs en franÃ§ais
    if (!reponseChariow.ok) {
      let message = donnees?.message ?? `Erreur Chariow ${reponseChariow.status}`;
      if (donnees?.errors) {
        const details = Object.entries(donnees.errors)
          .map(([champ, messages]) => `${champ} : ${messages.join(", ")}`)
          .join(" | ");
        if (details) message += ` (${details})`;
      }
      if (reponseChariow.status === 401) message = "ClÃ© API Chariow invalide (vÃ©rifie CHARIOW_API_KEY).";
      if (reponseChariow.status === 403) {
        message =
          "Ta clÃ© API Chariow n'a pas la permission checkout.write. RÃ©gÃ©nÃ¨re la clÃ© dans app.chariow.com/settings/api en cochant la portÃ©e Checkout (checkout.write).";
      }
      if (reponseChariow.status === 404) {
        message = "Produit Chariow introuvable ou non publiÃ© (vÃ©rifie CHARIOW_PRODUCT_PRO / CHARIOW_PRODUCT_ENTREPRISE).";
      }
      if (reponseChariow.status === 429) message = "Trop de tentatives de paiement Ã  la minute. RÃ©essaie dans un instant.";
      console.error(`${PREFIXE} Ã©chec : ${message}`);
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

    // 10) Analyse de la rÃ©ponse
    const etape = donnees?.data?.step;

    if (etape === "already_purchased") {
      const message =
        "Cet e-mail possÃ¨de dÃ©jÃ  ce produit chez Chariow. GÃ¨re ton abonnement depuis ton espace client Chariow.";
      console.log(`${PREFIXE} dÃ©jÃ  achetÃ© pour ${email}`);
      return NextResponse.json({ ok: false, error: message, message }, { status: 409 });
    }

    if (etape !== "payment" || !donnees?.data?.payment?.checkout_url) {
      // Cas thÃ©orique : produit terminÃ© immÃ©diatement (prix zÃ©ro)
      console.log(`${PREFIXE} Ã©tape inattendue : ${etape}`);
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

    // 11) SuccÃ¨s : on renvoie le lien de paiement (plusieurs clÃ©s pour compatibilitÃ©)
    const lienPaiement = donnees.data.payment.checkout_url as string;
    console.log(`${PREFIXE} succÃ¨s : vente=${donnees?.data?.purchase?.id ?? "?"} mode=${encadrable ? "embed" : "redirect"}`);
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
