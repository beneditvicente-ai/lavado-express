import Link from "next/link";

const TABS = [
  { href: "/lavador", label: "Perfil" },
  { href: "/lavador/pedidos", label: "Turnos" },
  { href: "/lavador/express", label: "Express" },
];

export function LavadorNav({ activo }: { activo: "/lavador" | "/lavador/pedidos" | "/lavador/express" }) {
  return (
    <div className="flex border-b">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${
            activo === t.href ? "border-neutral-900" : "border-transparent text-neutral-500"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
