// app/admin/utilisateurs/page.tsx
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { Carte } from "@/components/ui/carte";
import { Badge } from "@/components/ui/badge";
import { Bouton } from "@/components/ui/bouton";
import { basculerRoleFormulaire } from "@/app/actions/admin";
import { formatteDate } from "@/lib/dates";

export const metadata: Metadata = { title: "Utilisateurs — Administration" };
export const dynamic = "force-dynamic";

export default async function PageUtilisateursAdmin() {
  const utilisateurs = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { favorites: true, avis: true, lists: true, votes: true, conversations: true } },
    },
  });

  const nbAdmins = utilisateurs.filter((u) => u.role === "ADMIN").length;

  return (
    <div>
      <div>
        <h2 className="text-h3 font-semibold">Utilisateurs ({utilisateurs.length})</h2>
        <p className="mt-1 text-[14px] leading-5 text-encre">
          {nbAdmins} admin{nbAdmins > 1 ? "s" : ""} · Attribue le rôle « Admin » pour donner accès à cet espace.
          Tu ne peux pas modifier ton propre rôle (sécurité).
        </p>
      </div>

      <Carte className="mt-6 overflow-x-auto p-2">
        <table className="w-full min-w-200 text-[14px] leading-5">
          <thead className="text-left text-legende text-encre">
            <tr>
              <th className="p-3">Utilisateur</th>
              <th className="p-3">Rôle</th>
              <th className="p-3">Inscrit le</th>
              <th className="p-3">Activité</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {utilisateurs.map((u) => (
              <tr key={u.id} className="border-t border-bordure">
                <td className="p-3">
                  <p className="font-semibold text-bleu">{u.name || "Sans nom"}</p>
                  <p className="text-[13px] text-encre">{u.email}</p>
                </td>
                <td className="p-3">
                  {u.role === "ADMIN" ? <Badge variante="source">Admin</Badge> : <Badge>Utilisateur</Badge>}
                </td>
                <td className="p-3 text-encre">{formatteDate(u.createdAt)}</td>
                <td className="p-3 text-[13px] text-encre">
                  {u._count.favorites} favoris · {u._count.avis} avis · {u._count.lists} listes · {u._count.votes} votes · {u._count.conversations} conv.
                </td>
                <td className="p-3">
                  {u.role === "ADMIN" ? (
                    <p className="text-[13px] font-semibold text-violet">C'est ton compte 👋</p>
                  ) : (
                    <form action={basculerRoleFormulaire}>
                      <input type="hidden" name="utilisateurId" value={u.id} />
                      <Bouton taille="sm" variante="secondaire" type="submit">Rendre admin</Bouton>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {utilisateurs.length === 0 && <p className="p-6 text-[14px] text-encre">Aucun utilisateur inscrit.</p>}
      </Carte>
    </div>
  );
}