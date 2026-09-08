"use client";

import { useState } from "react";

export type PedidoResumen = {
  id: string;
  tipo: string;
  estado: string;
  precio_total: number;
  fecha_hora_turno: string | null;
  creado_en: string;
  contraparteNombre: string;
};

const ESTADOS_ACTIVOS = ["buscando", "pendiente_pago", "confirmado", "en_camino", "en_curso"];

const ETIQUETAS_ESTADO: Record<string, string> = {
  buscando: "Buscando lavador",
  pendiente_pago: "Esperando pago",
  confirmado: "Confirmado",
  en_camino: "En camino",
  en_curso: "En curso",
  completado: "Completado",
  calificado: "Completado",
  sin_disponibilidad: "Sin disponibilidad",
  cancelado_sin_cargo: "Cancelado",
  cancelado_con_cargo: "Cancelado (con cargo)",
  cancelado_lavador: "Cancelado por el lavador",
};

export function TabsPedidos({
  pedidos,
  etiquetaContraparte,
}: {
  pedidos: PedidoResumen[];
  etiquetaContraparte: string;
}) {
  const [tab, setTab] = useState<"activos" | "historial">("activos");

  const activos = pedidos.filter((p) => ESTADOS_ACTIVOS.includes(p.estado));
  const historial = pedidos.filter((p) => !ESTADOS_ACTIVOS.includes(p.estado));
  const lista = tab === "activos" ? activos : historial;

  return (
    <div className="space-y-3">
      <div className="flex border-b">
        <button
          onClick={() => setTab("activos")}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${
            tab === "activos" ? "border-neutral-900" : "border-transparent text-neutral-500"
          }`}
        >
          Activos ({activos.length})
        </button>
        <button
          onClick={() => setTab("historial")}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${
            tab === "historial" ? "border-neutral-900" : "border-transparent text-neutral-500"
          }`}
        >
          Historial ({historial.length})
        </button>
      </div>

      {lista.length === 0 ? (
        <p className="text-sm text-neutral-500">No hay pedidos acá todavía.</p>
      ) : (
        <div className="space-y-2">
          {lista.map((p) => (
            <div key={p.id} className="border rounded-md p-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-sm">
                    {etiquetaContraparte}: {p.contraparteNombre}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {p.tipo === "express" ? "Express" : "Programado"} ·{" "}
                    {ETIQUETAS_ESTADO[p.estado] ?? p.estado}
                  </p>
                  {p.fecha_hora_turno && (
                    <p className="text-xs text-neutral-500">
                      {new Date(p.fecha_hora_turno).toLocaleString("es-AR")}
                    </p>
                  )}
                </div>
                <p className="font-medium text-sm">${p.precio_total.toLocaleString("es-AR")}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
