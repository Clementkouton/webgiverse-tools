// lib/chariow.ts
// ─────────────────────────────────────────────────────────────────
// Client minimal pour l'API publique Chariow (côté SERVEUR uniquement :
// la clé API ne doit JAMAIS arriver dans le navigateur).
//
// Doc : https://chariow.dev/api-reference/checkout
//   POST https://api.chariow.com/v1/checkout
//   Authorization: Bearer <CHARIOW_API_KEY>
//
// Réponse attendue (produit payant) :
//   { data: { step: "payment", payment: { checkout_url: "https://…" } } }
// On renvoie checkout_url : la fenêtre de paiement s'affiche ensuite
// dans une iframe DE NOTRE SITE (grâce à embed_origins) — le client ne
// quitte jamais Webgiverse.
// ─────────────────────────────────────────────────────────────────

const API_CHARIOW = "https://api.chariow.com/v1";

export type SessionPaiement = {
  checkoutUrl: string;
  venteId: string | null;
};

export async function initierCheckoutChariow(parametres: {
  productId: string;
  email: string;
  prenom: string;
  nom: string;
  telephone: { numero: string; codePays: string };
  redirectUrl: string;
  /** Origines HTTPS de NOTRE site autorisées à afficher le checkout en iframe. */
  originesIframe: string[];
  /** Sera renvoyé dans le webhook : custom_metadata → rattachement fiable du compte. */
  metadata: Record<string, string>;
}): Promise<SessionPaiement> {
  const cle = (process.env.CHARIOW_API_KEY ?? "").trim();
  if (!cle) {
    throw new Error("CHARIOW_API_KEY est absente des variables d'environnement.");
  }

  const reponse = await fetch(`${API_CHARIOW}/checkout`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cle}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      product_id: parametres.productId,
      email: parametres.email,
      first_name: parametres.prenom,
      last_name: parametres.nom,
      phone: {
        number: parametres.telephone.numero,
        country_code: parametres.telephone.codePays,
      },
      redirect_url: parametres.redirectUrl,
      embed_origins: parametres.originesIframe,
      custom_metadata: parametres.metadata,
    }),
    // Un checkout doit démarrer vite ; on évite de bloquer la requête 30 s.
    signal: AbortSignal.timeout(20_000),
  });

  const corps = (await reponse.json().catch(() => null)) as
    | { data?: { step?: string; message?: string | null; purchase?: { id?: string }; payment?: { checkout_url?: string | null } }; message?: string }
    | null;

  if (!reponse.ok || !corps) {
    const message = corps?.message ?? `Erreur API Chariow (HTTP ${reponse.status}).`;
    throw new Error(message);
  }

  const donnees = corps.data;
  if (donnees?.step === "payment" && typeof donnees.payment?.checkout_url === "string") {
    return {
      checkoutUrl: donnees.payment.checkout_url,
      venteId: donnees.purchase?.id ?? null,
    };
  }
  if (donnees?.step === "already_purchased") {
    throw new Error("Ce produit a déjà été acheté avec cet e-mail chez Chariow.");
  }
  if (donnees?.step === "completed") {
    throw new Error("Ce produit est gratuit — aucun paiement nécessaire.");
  }
  throw new Error(corps.message ?? "Réponse inattendue de l'API Chariow.");
}