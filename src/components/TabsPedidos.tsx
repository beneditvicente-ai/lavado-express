"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
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

function urlGoogleMaps(p: PedidoResumen) {
  const destino =
    p.lat != null && p.lng != null ? `${p.lat},${p.lng}` : encodeURIComponent(p.direccionTexto ?? "");
  return `https://www.google.com/maps/dir/?api=1&destination=${destino}`;
}

const ESTILO_ESTADO: Record<string, string> = {
  buscando: "bg-surface-raised text-foreground-muted",
  pendiente_pago: "bg-accent/15 text-accent",
  confirmado: "bg-emerald-500/15 text-emerald-400",
  en_camino: "bg-emerald-500/15 text-emerald-400",
  en_curso: "bg-emerald-500/15 text-emerald-400",
  completado: "bg-surface-raised text-foreground-muted",
  calificado: "bg-surface-raised text-foreground-muted",
  sin_disponibilidad: "bg-red-500/15 text-red-400",
  cancelado_sin_cargo: "bg-red-500/15 text-red-400",
  cancelado_con_cargo: "bg-red-500/15 text-red-400",
  cancelado_lavador: "bg-red-500/15 text-red-400",
};

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
    <div className="space-y-4">
      <div className="flex gap-1 bg-surface border border-border rounded-full p-1 w-fit">
        <button
          onClick={() => setTab("activos")}
          className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-200 active:scale-95 ${
            tab === "activos" ? "bg-surface-raised text-accent" : "text-foreground-muted"
          }`}
        >
          Activos ({activos.length})
        </button>
        <button
          onClick={() => setTab("historial")}
          className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all duration-200 active:scale-95 ${
            tab === "historial" ? "bg-surface-raised text-accent" : "text-foreground-muted"
          }`}
        >
          Historial ({historial.length})
        </button>
      </div>

      {mensaje && (
        <p className="text-sm text-foreground bg-surface border border-border rounded-2xl p-3">{mensaje}</p>
      )}

      {lista.length === 0 ? (
        <div className="text-center py-10 space-y-1.5">
          <p className="text-sm font-medium text-foreground">
            {tab === "activos" ? "No tenés pedidos activos" : "Todavía no hay historial"}
          </p>
          <p className="text-xs text-foreground-muted">
            {tab === "activos" ? "Cuando pidas un lavado, lo vas a ver acá." : "Tus lavados completados van a aparecer acá."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {lista.map((p) => (
            <div key={p.id} className="border border-border rounded-2xl p-4 bg-surface space-y-2.5">
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-base text-foreground truncate">
                    {etiquetaContraparte}: {p.contraparteNombre}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-foreground-muted">
                      {p.tipo === "express" ? "Express" : "Programado"}
                    </span>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        ESTILO_ESTADO[p.estado] ?? "bg-surface-raised text-foreground-muted"
                      }`}
                    >
                      {ETIQUETAS_ESTADO[p.estado] ?? p.estado}
                    </span>
                  </div>
                </div>
                <p className="font-bold text-lg text-foreground flex-shrink-0">
                  ${p.precio_total.toLocaleString("es-AR")}
                </p>
              </div>

              <div className="space-y-1.5 text-sm text-foreground-muted">
                {p.fecha_hora_turno && <p>{new Date(p.fecha_hora_turno).toLocaleString("es-AR")}</p>}
                {p.direccionTexto && (
                  <p className="flex items-center gap-1.5">
                    <MapPin size={15} className="flex-shrink-0 text-foreground-muted" />
                    <span className="truncate">{p.direccionTexto}</span>
                    <span>·</span>
                    <a
                      href={urlGoogleMaps(p)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent underline flex-shrink-0"
                    >
                      Ver en el mapa
                    </a>
                  </p>
                )}
                {p.detallesVehiculo && (
                  <p className="flex items-center gap-1.5">
                    <Car size={15} className="flex-shrink-0 text-foreground-muted" />
                    {p.detallesVehiculo}
                  </p>
                )}
                {p.fechaLimiteExpress && ESTADOS_ACTIVOS.includes(p.estado) && (
                  <p
                    className={`inline-flex items-center gap-1.5 font-medium px-2 py-1 rounded-full text-xs ${
                      new Date(p.fechaLimiteExpress).getTime() - ahora <= 0
                        ? "bg-red-500/15 text-red-400"
                        : "bg-accent/15 text-accent"
                    }`}
                  >
                    <Clock size={13} className="flex-shrink-0" />
                    {tiempoRestante(p.fechaLimiteExpress, ahora)}
                  </p>
                )}
              </div>

              {p.fotosResultado && p.fotosResultado.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {p.fotosResultado.map((url, i) => (
                    <Image
                      key={i}
                      src={url}
                      alt="Resultado del lavado"
                      width={64}
                      height={64}
                      className="w-16 h-16 object-cover rounded-xl border border-border"
                    />
                  ))}
                </div>
              )}

              {rol === "lavador" && usuarioId && ["confirmado", "en_curso"].includes(p.estado) && (
                <AccionesLavadorTurno
                  pedidoId={p.id}
                  lavadorId={usuarioId}
                  estado={p.estado}
                  fotosIniciales={p.fotosResultado ?? []}
                />
              )}

              {(ESTADOS_CANCELABLES.includes(p.estado) ||
                (rol === "lavador" && p.estado === "pendiente_pago") ||
                !ESTADOS_ACTIVOS.includes(p.estado)) && (
                <div className="flex gap-2 flex-wrap pt-1">
                  {ESTADOS_CANCELABLES.includes(p.estado) && (
                    <button
                      onClick={() => cancelar(p.id)}
                      disabled={cancelando === p.id}
                      className="text-xs font-medium text-red-400 border border-red-500/30 rounded-full px-3 py-1.5 transition-all duration-200 active:scale-95 disabled:opacity-50"
                    >
                      {cancelando === p.id ? "Cancelando..." : "Cancelar turno"}
                    </button>
                  )}
                  {rol === "lavador" && p.estado === "pendiente_pago" && (
                    <button
                      onClick={() => cancelarAceptacion(p.id)}
                      disabled={cancelandoAceptacion === p.id}
                      className="text-xs font-medium text-red-400 border border-red-500/30 rounded-full px-3 py-1.5 transition-all duration-200 active:scale-95 disabled:opacity-50"
                    >
                      {cancelandoAceptacion === p.id ? "Cancelando..." : "Cancelar (sin cargo, todavía no te pagaron)"}
                    </button>
                  )}
                  {!ESTADOS_ACTIVOS.includes(p.estado) && (
                    <button
                      onClick={() => eliminar(p.id)}
                      disabled={eliminando === p.id}
                      className="text-xs font-medium text-foreground-muted border border-border rounded-full px-3 py-1.5 transition-all duration-200 active:scale-95 disabled:opacity-50"
                    >
                      {eliminando === p.id ? "Eliminando..." : "Eliminar de mi historial"}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
