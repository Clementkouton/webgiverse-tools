// tests/scoring.test.ts
import { describe, expect, it } from "vitest";
import { selectionnerOutils, type OutilSimple } from "@/lib/assistant/scoring";

const outil = (o: Partial<OutilSimple>): OutilSimple => ({
  slug: "x", nom: "X", description: "", tarif: "Freemium", tarifMin: 0,
  gratuit: true, openSource: false, niveau: "Débutant",
  objectifs: [], categories: [], type: "OUTIL", ...o,
});

const catalogue = [
  outil({ slug: "canva", nom: "Canva", description: "design et présentations marketing",
    objectifs: ["Créer du contenu"], categories: ["Image & design"] }),
  outil({ slug: "surfer", nom: "Surfer SEO", description: "rédaction optimisée seo",
    tarif: "Payant dès 89 $/mois", tarifMin: 89, gratuit: false,
    objectifs: ["Vendre"], categories: ["SEO"], niveau: "Intermédiaire" }),
  outil({ slug: "ollama", nom: "Ollama", description: "modèles en local",
    openSource: true, objectifs: ["Coder"], categories: ["Assistants"] }),
];

describe("selectionnerOutils (assistant guidé)", () => {
  it("filtre les outils payants quand le budget est gratuit", () => {
    const recos = selectionnerOutils(catalogue, { objectif: "Vendre", niveau: "Débutant", budget: "gratuit" });
    expect(recos.every((r) => r.outil.gratuit)).toBe(true);
    expect(recos.find((r) => r.outil.slug === "surfer")).toBeUndefined();
  });

  it("classe en tête l'outil aligné avec l'objectif", () => {
    const recos = selectionnerOutils(catalogue, { objectif: "Vendre", niveau: "Débutant", budget: "confort" });
    expect(recos[0]?.outil.slug).toBe("surfer");
    expect(recos[0]?.explication).toContain("Vendre");
  });

  it("pénalise les outils avancés pour un débutant", () => {
    const duo = [
      outil({ slug: "a", nom: "A", objectifs: ["Coder"], niveau: "Avancé", categories: ["Code"] }),
      outil({ slug: "b", nom: "B", objectifs: ["Coder"], niveau: "Débutant", categories: ["Code"] }),
    ];
    const recos = selectionnerOutils(duo, { objectif: "Coder", niveau: "Débutant", budget: "confort" });
    expect(recos[0]?.outil.slug).toBe("b");
  });

  it("retourne au maximum trois recommandations", () => {
    const nombreux = Array.from({ length: 10 }, (_, i) =>
      outil({ slug: `o${i}`, nom: `Outil ${i}`, objectifs: ["Gérer"], categories: ["Productivité"] }));
    expect(selectionnerOutils(nombreux, { objectif: "Gérer", niveau: "Débutant", budget: "confort" })).toHaveLength(3);
  });

  it("retourne vide quand rien ne correspond", () => {
    expect(selectionnerOutils([], { objectif: "Coder", niveau: "Avancé", budget: "gratuit" })).toEqual([]);
  });
});