import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function MenuItemLink({
  href,
  label,
  resumen,
}: {
  href: string;
  label: string;
  resumen: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between border rounded-md px-4 py-3 hover:bg-neutral-50"
    >
      <div>
        <p className="font-medium text-sm">{label}</p>
        <p className="text-xs text-neutral-500">{resumen}</p>
      </div>
      <ChevronRight size={18} className="text-neutral-400" />
    </Link>
  );
}
