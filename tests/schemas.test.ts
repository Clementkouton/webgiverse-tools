// tests/schemas.test.ts
import { describe, expect, it } from "vitest";
import { schemaProposition, schemaMessages } from "@/lib/schemas";
import { slugifier, deaccentuer } from "@/lib/utils";

describe("Schémas Zod", () => {
  it("valide une proposition correcte", () => {
    expect(schemaProposition.safeParse({
      nom: "Super outil", url: "https://super-outil.com",
      description: "Un outil qui fait des choses très utiles au quotidien.",
      tarif: "Freemium", categorieId: "abc", contact: "",
    }).success).toBe(true);
  });
  it("rejette une URL invalide", () => {
    expect(schemaProposition.safeParse({
      nom: "X", url: "pas-une-url", description: "x".repeat(40), tarif: "Payant", categorieId: "a",
    }).success).toBe(false);
  });
  it("plafonne le nombre de messages de l'assistant", () => {
    const messages = Array.from({ length: 31 }, () => ({ role: "user" as const, contenu: "a" }));
    expect(schemaMessages.safeParse({ messages }).success).toBe(false);
  });
});

describe("Utilitaires", () => {
  it("slugifie avec accents", () => {
    expect(slugifier("Le Chat (Mistral)")).toBe("le-chat-mistral");
  });
  it("deaccentue", () => {
    expect(deaccentuer("réédité")).toBe("reedite");
  });
});