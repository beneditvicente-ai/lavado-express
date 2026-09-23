import Link from "next/link";
import { Home } from "lucide-react";

export function InicioLink() {
  return (
    <Link href="/" aria-label="Ir al inicio" className="text-neutral-700 hover:text-neutral-900">
      <Home size={20} strokeWidth={1.75} />
    </Link>
  );
}
