import Link from "next/link";

export const metadata = { title: "Términos y condiciones — Lavado Express" };

export default function TerminosPage() {
  return (
    <main className="flex-1 max-w-2xl mx-auto w-full p-6 space-y-6">
      <Link href="/cliente" className="text-sm text-foreground-muted hover:text-foreground underline transition-colors duration-200">
        ← Volver
      </Link>

      <h1 className="text-2xl font-semibold text-foreground">Términos y condiciones</h1>

      <div className="space-y-4 text-sm text-foreground-muted leading-relaxed">
        <p>
          Lavado Express conecta a clientes con lavadores independientes de la zona. El lavador es
          quien presta el servicio de lavado; nosotros facilitamos el matching, la coordinación
          del turno y el cobro.
        </p>
        <p>
          No se te cobra nada hasta que un lavador acepta tu pedido y confirmás el pago. El precio
          mostrado antes de pagar es el precio final — no hay cargos ocultos.
        </p>
        <p>
          Podés cancelar un pedido mientras esté en búsqueda sin costo. Una vez que un lavador está
          en camino, las cancelaciones se evalúan caso por caso.
        </p>
        <p>
          Si el servicio no se presta como se acordó, contactanos desde la sección de ayuda de tu
          cuenta para resolverlo.
        </p>
      </div>
    </main>
  );
}
