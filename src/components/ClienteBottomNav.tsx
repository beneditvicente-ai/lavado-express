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
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4">
      <nav className="max-w-2xl mx-auto flex justify-around gap-1 bg-surface border border-border rounded-3xl px-2 py-2 shadow-lg shadow-black/40">
        {ITEMS.map(({ href, label, Icon }) => {
          const activo = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-2xl text-xs transition-colors duration-200 active:scale-95 ${
                activo ? "text-accent font-semibold" : "text-foreground-muted"
              }`}
            >
              <Icon size={20} strokeWidth={activo ? 2.25 : 1.75} />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
