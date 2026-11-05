// components/commun/logo-footer.tsx — identité « W + Webgiverse + Hub »
import Link from "next/link";

export function LogoWebgiverseFooter({ compacte = false }: { compacte?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <img src="/Logo-footer.png" className="w-60 lg:w-52 md:w-44 sm:w-44 " alt="Webgiverse Tools" />
    </span>
  );
}

export function LienLogoFooter() {
  return (
    <Link href="/" aria-label="Webgiverse — accueil" className="shrink-0">
      <LogoWebgiverseFooter />
    </Link>
  );
}