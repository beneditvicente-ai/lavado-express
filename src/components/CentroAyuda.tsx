"use client";

import { useState } from "react";

const PREGUNTAS = [
  {
    q: "¿Cuándo y cómo cobro?",
    a: "El pago lo hace el cliente dentro de la app. Vos te quedás con tu precio menos la comisión de la plataforma (que baja cuanto más antigüedad y rating tengas).",
  },
  {
    q: "¿Qué hago si el cliente no está cuando llego?",
    a: "Escribile por el chat del pedido para coordinar. Si no aparece, contactá al soporte desde acá para que decidamos cómo proceder.",
  },
  {
    q: "¿Puedo rechazar un pedido express?",
    a: "Sí, en el panel de Express podés elegir qué pedidos aceptar. No estás obligado a tomar todos los que aparezcan.",
  },
  {
    q: "¿Cómo bloqueo un horario puntual?",
    a: "En la pestaña Turnos podés cargar un bloqueo para un día y horario específico, además de tu disponibilidad semanal.",
  },
  {
    q: "¿Por qué bajó mi rating?",
    a: "El rating baja con reseñas bajas de clientes, y también automáticamente si cancelás un turno ya confirmado.",
  },
];

export function CentroAyuda() {
  const [abierta, setAbierta] = useState<number | null>(null);

  return (
    <div className="border rounded-md p-4 space-y-2">
      <h2 className="font-medium">Centro de ayuda</h2>
      {PREGUNTAS.map((p, i) => (
        <div key={i} className="border-t pt-2">
          <button
            onClick={() => setAbierta(abierta === i ? null : i)}
            className="w-full text-left text-sm font-medium"
          >
            {p.q}
          </button>
          {abierta === i && <p className="text-sm text-neutral-600 pt-1">{p.a}</p>}
        </div>
      ))}
    </div>
  );
}
