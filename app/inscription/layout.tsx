import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function LayoutInscription({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (session?.user?.id) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}