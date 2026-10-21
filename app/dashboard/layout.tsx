import { auth } from "@/auth";
import ExigeConnexion from "@/components/auth/exige-connexion";

export default async function LayoutDashboard({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    return <ExigeConnexion suite="/dashboard" />;
  }

  return <>{children}</>;
}