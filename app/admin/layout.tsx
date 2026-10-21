// app/admin/layout.tsx
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion?suite=/admin");
  if (session.user.role !== "ADMIN") redirect("/dashboard");
  return <>{children}</>;
}