"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ClipboardList, User } from "lucide-react";

const ITEMS = [
  { href: "/cliente", label: "Inicio", Icon: Home },
  { href: "/cliente/pedidos", label: "Actividad", Icon: ClipboardList },
  { href: "/cliente/perfil", label: "Cuenta", Icon: User },
];

export function ClienteBottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t z-50">
      <nav className="max-w-2xl mx-auto flex justify-around py-2">
        {ITEMS.map(({ href, label, Icon }) => {
          const activo = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center px-3 py-1 rounded-lg text-xs ${
                activo ? "text-neutral-900 font-medium bg-neutral-100" : "text-neutral-400"
              }`}
            >
              <Icon size={20} strokeWidth={activo ? 2.25 : 1.75} className="mb-0.5" />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
