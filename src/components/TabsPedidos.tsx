"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AccionesLavadorTurno } from "@/components/AccionesLavadorTurno";
import { MapPin, Car, Clock } from "lucide-react";

export type PedidoResumen = {
  id: string;
  tipo: string;
  estado: string;
  precio_total: number;
  fecha_hora_turno: string | null;
  creado_en: string;
  contraparteNombre: string;
  direccionTexto?: string;
  detallesVehiculo?: string | null;
  lat?: number;
  lng?: number;
  fechaLimiteExpress?: string | null;
  fotosResultado?: string[];
};

const ESTADOS_ACTIVOS = ["buscando", "pendiente_pago", "confirmado", "en_camino", "en_curso"];
const ESTADOS_CANCELABLES = ["confirmado", "en_camino"];

const ETIQUETAS_ESTADO: Record<string, string> = {
  buscando: "Buscando lavador",
  pendiente_pago: "Esperando pago",
  confirmado: "Turno confirmado",
  en_camino: "En camino",
  en_curso: "En curso",
  completado: "Completado",
  calificado: "Completado",
  sin_disponibilidad: "Sin disponibilidad",
  cancelado_sin_cargo: "Cancelado",
  cancelado_con_cargo: "Cancelado (con cargo)",
  cancelado_lavador: "Cancelado por el lavador",
};

function tiempoRestante(fechaLimite: string, ahora: number) {
  const diffMs = new Date(fechaLimite).getTime() - ahora;
  if (diffMs <= 0) return "Plazo vencido";
  const horas = Math.floor(diffMs / (1000 * 60 * 60));
  const minutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  if (horas > 0) return `Te quedan ${horas}h ${minutos}m`;
  return `Te quedan ${minutos}m`;
}

export function TabsPedidos({
  pedidos,
  etiquetaContraparte,
  rol,
  usuarioId,
}: {
  pedidos: PedidoResumen[];
  etiquetaContraparte: string;
  rol: "cliente" | "lavador";
  usuarioId?: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"activos" | "historial">("activos");
  const [ahora, setAhora] = useState(() => Date.now());
  const [cancelando, setCancelando] = useState<string | null>(null);
  const [cancelandoAceptacion, setCancelandoAceptacion] = useState<string | null>(null);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [eliminados, setEliminados] = useState<Set<string>>(new Set());
  const [mensaje, setMensaje] = useState<string | null>(null);

  useEffect(() => {
    const intervalo = setInterval(() => setAhora(Date.now()), 30000);
    return () => clearInterval(intervalo);
  }, []);

  async function cancelar(id: string) {
    const confirmar = window.confirm(
      rol === "cliente"
        ? "¿Seguro que querés cancelar? Según cuánto falte, puede aplicarse una penalidad sobre el reembolso."
        : "¿Seguro que querés cancelar? Esto le baja tu rating y el cliente recibe el reembolso completo."
    );
    if (!confirmar) return;

    setMensaje(null);
    setCancelando(id);
    const res = await fetch(`/api/pedidos/${id}/cancelar-${rol}`, { method: "POST" });
    const data = await res.json();
    setCancelando(null);

    if (!res.ok) {
      setMensaje(data.error ?? "No se pudo cancelar");
      return;
    }

    if (rol === "cliente") {
      setMensaje(
        data.penalidadPct > 0
          ? `Cancelado. Te reembolsamos $${data.montoReembolso.toLocaleString("es-AR")} (se descontó una penalidad de ${data.penalidadPct}%).`
          : `Cancelado. Te reembolsamos el total: $${data.montoReembolso.toLocaleString("es-AR")}.`
      );
    } else {
      setMensaje("Cancelado. El cliente recibe el reembolso completo.");
    }

    router.refresh();
  }

  async function cancelarAceptacion(id: string) {
    const confirmar = window.confirm(
      "¿Seguro que querés cancelar? Todavía no te pagaron, así que no hay ninguna penalidad ni reembolso — el pedido vuelve a quedar disponible."
    );
    if (!confirmar) return;

    setMensaje(null);
    setCancelandoAceptacion(id);
    const res = await fetch(`/api/pedidos/${id}/cancelar-aceptacion`, { method: "POST" });
    const data = await res.json();
    setCancelandoAceptacion(null);

    if (!res.ok) {
      setMensaje(data.error ?? "No se pudo cancelar");
      return;
    }

    setMensaje("Cancelado sin costo. El pedido vuelve a estar disponible para otro lavador.");
    router.refresh();
  }

  async function eliminar(id: string) {
    const confirmar = window.confirm("¿Eliminar este pedido de tu historial? No se puede deshacer.");
    if (!confirmar) return;

    setMensaje(null);
    setEliminando(id);
    const res = await fetch(`/api/pedidos/${id}/ocultar`, { method: "POST" });
    setEliminando(null);

    if (!res.ok) {
      const data = await res.json();
      setMensaje(data.error ?? "No se pudo eliminar");
      return;
    }

    setEliminados((prev) => new Set(prev).add(id));
    router.refresh();
  }

  const pedidosVisibles = pedidos.filter((p) => !eliminados.has(p.id));
  const activos = pedidosVisibles.filter((p) => ESTADOS_ACTIVOS.includes(p.estado));
  const historial = pedidosVisibles.filter((p) => !ESTADOS_ACTIVOS.includes(p.estado));
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

      {mensaje && <p className="text-sm text-neutral-700 bg-neutral-50 border rounded-md p-2">{mensaje}</p>}

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
                  {p.direccionTexto && (
                    <p className="text-xs text-neutral-500 flex items-center gap-1">
                      <MapPin size={12} className="flex-shrink-0" />
                      {p.direccionTexto}
                      {p.lat && p.lng ? (
                        <>
                          ·{" "}
                          <a
                            href={`https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=16/${p.lat}/${p.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            Ver en el mapa
                          </a>
                        </>
                      ) : null}
                    </p>
                  )}
                  {p.detallesVehiculo && (
                    <p className="text-xs text-neutral-500 flex items-center gap-1">
                      <Car size={12} className="flex-shrink-0" />
                      {p.detallesVehiculo}
                    </p>
                  )}
                  {p.fechaLimiteExpress && ESTADOS_ACTIVOS.includes(p.estado) && (
                    <p
                      className={`text-xs font-medium mt-0.5 flex items-center gap-1 ${
                        new Date(p.fechaLimiteExpress).getTime() - ahora <= 0
                          ? "text-red-600"
                          : "text-amber-600"
                      }`}
                    >
                      <Clock size={12} className="flex-shrink-0" />
                      {tiempoRestante(p.fechaLimiteExpress, ahora)}
                    </p>
                  )}
                  {ESTADOS_CANCELABLES.includes(p.estado) && (
                    <button
                      onClick={() => cancelar(p.id)}
                      disabled={cancelando === p.id}
                      className="text-xs text-red-600 underline mt-1 disabled:opacity-50"
                    >
                      {cancelando === p.id ? "Cancelando..." : "Cancelar turno"}
                    </button>
                  )}
                  {rol === "lavador" && p.estado === "pendiente_pago" && (
                    <button
                      onClick={() => cancelarAceptacion(p.id)}
                      disabled={cancelandoAceptacion === p.id}
                      className="text-xs text-red-600 underline mt-1 disabled:opacity-50"
                    >
                      {cancelandoAceptacion === p.id ? "Cancelando..." : "Cancelar (sin cargo, todavía no te pagaron)"}
                    </button>
                  )}
                  {rol === "lavador" && usuarioId && ["confirmado", "en_curso"].includes(p.estado) && (
                    <AccionesLavadorTurno
                      pedidoId={p.id}
                      lavadorId={usuarioId}
                      estado={p.estado}
                      fotosIniciales={p.fotosResultado ?? []}
                    />
                  )}
                  {p.fotosResultado && p.fotosResultado.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {p.fotosResultado.map((url, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={i}
                          src={url}
                          alt="Resultado del lavado"
                          className="w-12 h-12 object-cover rounded-md border"
                        />
                      ))}
                    </div>
                  )}
                  {!ESTADOS_ACTIVOS.includes(p.estado) && (
                    <button
                      onClick={() => eliminar(p.id)}
                      disabled={eliminando === p.id}
                      className="text-xs text-neutral-400 underline mt-1 disabled:opacity-50 block"
                    >
                      {eliminando === p.id ? "Eliminando..." : "Eliminar de mi historial"}
                    </button>
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
