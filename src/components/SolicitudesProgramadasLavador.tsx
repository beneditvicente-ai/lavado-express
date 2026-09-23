"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { distanciaKm } from "@/lib/distancia";

type Pedido = {
  id: string;
  direccion_texto: string;
  lat: number;
  lng: number;
  tipo_vehiculo: string;
  detalles_vehiculo: string | null;
  tipo_servicio_id: string;
  fecha_hora_turno: string;
};

export function SolicitudesProgramadasLavador({
  lavadorId,
  pedidosIniciales,
  preciosPropios,
  recargosVehiculo,
  nombresServicio,
  miPosicion,
}: {
  lavadorId: string;
  pedidosIniciales: Pedido[];
  preciosPropios: Record<string, number>;
  recargosVehiculo: Record<string, number>;
  nombresServicio: Record<string, string>;
  miPosicion: [number, number] | null;
}) {
  const router = useRouter();
  const [pedidos, setPedidos] = useState(pedidosIniciales);
  const [procesando, setProcesando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const intervalo = setInterval(async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("pedidos")
        .select("id, direccion_texto, lat, lng, tipo_vehiculo, detalles_vehiculo, tipo_servicio_id, fecha_hora_turno")
        .eq("estado", "buscando")
        .eq("tipo", "programado")
        .is("lavador_id", null)
        .order("fecha_hora_turno", { ascending: true });
      setPedidos((data as Pedido[]) ?? []);
    }, 15000);
    return () => clearInterval(intervalo);
  }, []);

  async function aceptar(id: string) {
    setError(null);
    setProcesando(id);
    const res = await fetch(`/api/pedidos/${id}/aceptar-lavador`, { method: "POST" });
    const data = await res.json();
    setProcesando(null);

    if (!res.ok) {
      setError(data.error ?? "No se pudo aceptar");
      return;
    }

    setPedidos((prev) => prev.filter((p) => p.id !== id));
    router.refresh();
  }

  if (pedidos.length === 0) {
    return (
      <div className="border rounded-md p-4">
        <h2 className="font-medium mb-1">Solicitudes programadas</h2>
        <p className="text-sm text-neutral-500">No hay solicitudes programadas esperando en tu zona.</p>
      </div>
    );
  }

  return (
    <div className="border rounded-md p-4 space-y-3">
      <h2 className="font-medium">Solicitudes programadas por confirmar</h2>
      <p className="text-sm text-neutral-500">
        El cliente te invitó junto con otros lavadores — el primero que acepta se queda con el turno.
      </p>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="space-y-2">
        {pedidos.map((p) => {
          const precioBase = preciosPropios[p.tipo_servicio_id];
          const precioEstimado =
            precioBase != null
              ? Math.round(precioBase * (1 + (recargosVehiculo[p.tipo_vehiculo] ?? 0) / 100) * 100) / 100
              : null;
          const distancia =
            miPosicion && p.lat && p.lng ? distanciaKm(miPosicion[0], miPosicion[1], p.lat, p.lng) : null;
          return (
            <div key={p.id} className="border rounded-md p-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">
                  {new Date(p.fecha_hora_turno).toLocaleString("es-AR", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <p className="text-xs text-neutral-500">
                  {nombresServicio[p.tipo_servicio_id] ?? "Servicio"} · {p.direccion_texto}
                  {distancia != null && ` · a ${distancia.toFixed(1)} km`}
                </p>
                {p.detalles_vehiculo && (
                  <p className="text-xs text-neutral-500">{p.detalles_vehiculo}</p>
                )}
                {precioEstimado != null && (
                  <p className="text-sm font-medium mt-0.5">${precioEstimado.toLocaleString("es-AR")}</p>
                )}
              </div>
              <button
                onClick={() => aceptar(p.id)}
                disabled={procesando === p.id}
                className="bg-neutral-900 text-white rounded-md px-3 py-1.5 text-sm disabled:opacity-50 flex-shrink-0"
              >
                {procesando === p.id ? "..." : "Aceptar"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
