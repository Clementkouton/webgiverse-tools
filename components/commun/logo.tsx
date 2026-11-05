// components/commun/logo.tsx — identité « W + Webgiverse + Hub »
import Link from "next/link";

export function LogoWebgiverse({ compacte = false }: { compacte?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <img src="/Logo-Webgiverse-Tools.png" className=" lg:w-52 md:w-44 w-44" alt="Webgiverse Tools" />
    </span>
  );
}

export function LienLogo() {
  return (
    <Link href="/" aria-label="Webgiverse — accueil" className="shrink-0">
      <LogoWebgiverse />
    </Link>
  );
}