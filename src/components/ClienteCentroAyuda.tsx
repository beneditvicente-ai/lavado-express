"use client";

import { useState } from "react";

const PREGUNTAS = [
  {
    q: "¿Cómo pido un lavado?",
    a: "Desde el inicio, tocá \"Pedir un lavado\". Elegís vehículo, servicio y ubicación, y después Programado (para más adelante) o Express (para ahora).",
  },
  {
    q: "¿Qué diferencia hay entre Programado y Express?",
    a: "Programado: elegís día y hora, y ves una lista de lavadores para elegir. Express: pedís para ahora, con tu ubicación exacta, y un lavador cercano te acepta.",
  },
  {
    q: "¿Qué pasa si nadie acepta mi pedido express?",
    a: "No se te cobra nada hasta que un lavador acepta y vos confirmás. Podés cancelar la búsqueda en cualquier momento sin costo.",
  },
  {
    q: "¿Puedo cancelar un turno ya confirmado?",
    a: "Sí, desde \"Mis pedidos\". Si es programado y faltan más de 24hs, el reembolso es completo. Si falta menos, o es express, se aplica una penalidad sobre el reembolso.",
  },
  {
    q: "¿Cómo hablo con el lavador?",
    a: "Por ahora coordiná los detalles en el campo de dirección al pedir. El chat dentro de la app está en camino.",
  },
];

export function ClienteCentroAyuda() {
  const [abierta, setAbierta] = useState<number | null>(null);

  return (
    <div className="border border-border rounded-2xl p-4 space-y-1 bg-surface">
      <h2 className="font-semibold text-foreground mb-1">Centro de ayuda</h2>
      {PREGUNTAS.map((p, i) => (
        <div key={i} className="border-t border-border pt-2 first:border-t-0 first:pt-0">
          <button
            onClick={() => setAbierta(abierta === i ? null : i)}
            className="w-full text-left text-sm font-medium text-foreground py-1 transition-colors duration-200"
          >
            {p.q}
          </button>
          {abierta === i && <p className="text-sm text-foreground-muted pb-2">{p.a}</p>}
        </div>
      ))}
    </div>
  );
}
