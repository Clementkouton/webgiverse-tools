// app/admin/utilisateurs/page.tsx
// ─────────────────────────────────────────────────────────────────
// Lot 23 — Liste des membres, style « TailwindAdmin » : tableau sur
// carte blanche arrondie (en-tête discret, lignes qui s'illuminent
// au survol), badge « Admin » en pastille indigo douce, bouton
// « Rendre admin » en indigo doux, noms cliquables vers la fiche
// détaillée (/admin/utilisateurs/[id]) et état vide illustré.
// ─────────────────────────────────────────────────────────────────
import type { Metadata } from "next";
import Link from "next/link";
import { UsersRound } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Carte } from "@/components/ui/carte";
import { Bouton } from "@/components/ui/bouton";
import { EtatVideAdmin } from "@/components/admin/etat-vide-admin";
import { basculerRoleFormulaire } from "@/app/actions/admin";
import { formatteDate } from "@/lib/dates";

export const metadata: Metadata = { title: "Utilisateurs — Administration" };
export const dynamic = "force-dynamic";

export default async function PageUtilisateursAdmin() {
  const [utilisateurs, session] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { favorites: true, avis: true, lists: true, votes: true, conversations: true } },
      },
    }),
    auth(),
  ]);

  const nbAdmins = utilisateurs.filter((u) => u.role === "ADMIN").length;
  const monId = session?.user?.id;

  return (
    <div>
      <div className="animate-apparition-haut">
        <h1 className="text-h3 font-semibold">Utilisateurs ({utilisateurs.length})</h1>
        <p className="mt-1 text-[14px] leading-6 text-encre">
          {nbAdmins} admin{nbAdmins > 1 ? "s" : ""} · Attribue le rôle « Admin » pour donner accès à cet espace.
          Tu ne peux pas modifier ton propre rôle (sécurité).
        </p>
      </div>

      <Carte className="animate-apparition-haut mt-6 overflow-x-auto p-0">
        {utilisateurs.length === 0 ? (
          <EtatVideAdmin
            icone={UsersRound}
            ton="info"
            titre="Aucun utilisateur inscrit"
            description="Les membres apparaîtront ici dès la première inscription."
          />
        ) : (
        <table className="w-full min-w-200 text-[14px] leading-5">
          <thead className="text-left text-legende text-encre">
            <tr>
              <th className="px-5 py-3">Utilisateur</th>
              <th className="px-3 py-3">Rôle</th>
              <th className="px-3 py-3">Inscrit le</th>
              <th className="px-3 py-3">Activité</th>
              <th className="px-5 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {utilisateurs.map((u) => (
              <tr key={u.id} className="border-t border-bordure transition hover:bg-adm-fond/70">
                <td className="px-5 py-3.5">
                  <Link href={`/admin/utilisateurs/${u.id}`} className="font-semibold text-adm-sombre transition hover:text-primaire-texte">
                    {u.name || "Sans nom"}
                  </Link>
                  <p className="text-[13px] text-encre">{u.email}</p>
                </td>
                <td className="px-3 py-3.5">
                  {u.role === "ADMIN" ? (
                    <span className="inline-flex rounded-full bg-primaire/10 px-2.5 py-0.5 text-[12px] leading-4 font-semibold text-primaire-texte">
                      Admin
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full bg-gris px-2.5 py-0.5 text-[12px] leading-4 font-semibold text-encre">
                      Utilisateur
                    </span>
                  )}
                </td>
                <td className="px-3 py-3.5 text-encre">{formatteDate(u.createdAt)}</td>
                <td className="px-3 py-3.5 text-[13px] text-encre">
                  {u._count.favorites} favoris · {u._count.avis} avis · {u._count.lists} listes · {u._count.votes} votes · {u._count.conversations} conv.
                </td>
                <td className="px-5 py-3.5 text-right">
                  {u.id === monId ? (
                    <p className="text-[13px] font-semibold text-primaire-texte">C'est ton compte 👋</p>
                  ) : u.role === "ADMIN" ? (
                    <p className="text-[13px] text-encre">Rôle déjà attribué</p>
                  ) : (
                    <form action={basculerRoleFormulaire}>
                      <input type="hidden" name="utilisateurId" value={u.id} />
                      <Bouton taille="sm" variante="indigoDoux" type="submit">Rendre admin</Bouton>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </Carte>
    </div>
  );
}
