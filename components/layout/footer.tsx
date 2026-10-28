import Link from "next/link";
import { LogoWebgiverse } from "@/components/commun/logo";
import { auth } from "@/auth";

const COLONNES = [
  {
    titre: "Annuaire",
    liens: [
      ["Outils IA", "/outils"],
      ["Agents", "/agents"],
      ["Gratuits", "/gratuits"],
      ["Open source", "/open-source"],
      ["Comparer", "/comparer"],
      ["Catégories", "/categories"],
    ],
  },
  {
    titre: "Ressources",
    liens: [
      ["Assistant", "/assistant"],
      ["Blog", "/blog"],
      ["Actualités", "/actualites"],
      ["FAQ", "/faq"],
      ["Proposer un outil", "/proposer"],
    ],
  },
  {
    titre: "Légal",
    liens: [
      ["Mentions légales", "/mentions-legales"],
      ["Politique de confidentialité", "/confidentialite"],
      ["CGU", "/cgu"],
    ],
  },
];

export async function Footer() {
  const session = await auth();
  const connecte = Boolean(session?.user?.id);

  const colonneEntreprise = {
    titre: "Entreprise",
    liens: connecte
      ? [
          ["Mon espace", "/dashboard"],
          ["À propos", "/a-propos"],
          ["Contact", "/contact"],
          ["Tarifs", "/tarifs"],
        ]
      : [
          ["À propos", "/a-propos"],
          ["Contact", "/contact"],
          ["Tarifs", "/tarifs"],
          ["Connexion", "/connexion"],
          ["Inscription", "/inscription"],
        ],
  };

  const colonnes = [COLONNES[0], COLONNES[1], colonneEntreprise, COLONNES[2]];

  return (
    <footer className="bg-bleu text-white">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <Link href="/" aria-label="Webgiverse — accueil">
            <LogoWebgiverse />
          </Link>
          <p className="font-titre text-[15px] leading-5 font-medium text-white/70">
            Apprendre · Créer · Réussir
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {colonnes.map((c) => (
            <nav key={c.titre} aria-label={c.titre}>
              <h2 className="mb-3 font-titre text-[15px] leading-5 font-semibold">
                {c.titre}
              </h2>
              <ul className="grid gap-2">
                {c.liens.map(([label, href]) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-[14px] leading-5 text-white/70 transition hover:text-white"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <p className="mt-10 border-t border-white/10 pt-6 text-[13px] leading-5 text-white/60">
          © {new Date().getFullYear()} Webgiverse. Certains liens sont des liens
          d&apos;affiliation : ils financent le projet sans changer ton prix.
        </p>
      </div>
    </footer>
  );
}