import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function VolverAPerfil() {
  return (
    <Link
      href="/lavador"
      className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900"
    >
      <ChevronLeft size={16} strokeWidth={2} />
      Volver a mi perfil
    </Link>
  );
}
