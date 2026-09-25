"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { distanciaKm } from "@/lib/distancia";

const ExpressMap = dynamic(() => import("@/components/ExpressMap").then((m) => m.ExpressMap), {
  ssr: false,
  loading: () => <div className="h-72 rounded-md border bg-neutral-50" />,
});

type Pedido = {
  id: string;
  direccion_texto: string;
  lat: number;
  lng: number;
  tipo_vehiculo: string;
  detalles_vehiculo: string | null;
  fecha_limite_express: string | null;
  creado_en: string;
};

function tiempoRestante(fechaLimite: string) {
  const diffMs = new Date(fechaLimite).getTime() - Date.now();
  if (diffMs <= 0) return "Plazo vencido";
  const horas = Math.floor(diffMs / (1000 * 60 * 60));
  const minutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  if (horas > 0) return `el cliente tiene ${horas}h ${minutos}m`;
  return `el cliente tiene ${minutos}m`;
}

export function ExpressPanelLavador({
  lavadorId,
  pedidosIniciales,
  posicionInicial,
  serviciosOfrecidos,
}: {
  lavadorId: string;
  pedidosIniciales: Pedido[];
  posicionInicial: [number, number] | null;
  serviciosOfrecidos: string[];
}) {
  const router = useRouter();
  const [pedidos, setPedidos] = useState(pedidosIniciales);
  const [miPosicion, setMiPosicion] = useState<[number, number] | null>(posicionInicial);
  const [procesando, setProcesando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function actualizarMiUbicacion() {
    setError(null);
    if (!navigator.geolocation) {
      setError("Tu navegador no soporta ubicación.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setMiPosicion([lat, lng]);
        const supabase = createClient();
        await supabase
          .from("lavador_estado_express")
          .upsert({ lavador_id: lavadorId, lat, lng, actualizado_en: new Date().toISOString() }, { onConflict: "lavador_id" });
      },
      () => setError("No pudimos acceder a tu ubicación.")
    );
  }

  // apenas entra a la pantalla, toma tu ubicacion actual sola (si no la tenia ya)
  useEffect(() => {
    if (!posicionInicial) actualizarMiUbicacion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // refresca la lista de pedidos "buscando" cada 8s (solo los servicios que este lavador ofrece)
  useEffect(() => {
    if (serviciosOfrecidos.length === 0) return;
    const intervalo = setInterval(async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("pedidos")
        .select("id, direccion_texto, lat, lng, tipo_vehiculo, detalles_vehiculo, fecha_limite_express, creado_en")
        .eq("estado", "buscando")
        .eq("tipo", "express")
        .is("lavador_id", null)
        .in("tipo_servicio_id", serviciosOfrecidos)
        .order("creado_en", { ascending: false });
      setPedidos(data ?? []);
    }, 8000);
    return () => clearInterval(intervalo);
  }, [serviciosOfrecidos]);

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

  // un pedido cuyo plazo ya venció ya no tiene sentido ofrecerlo para
  // aceptar -- lo sacamos de la lista (sigue "buscando" en la base, pero
  // no se lo mostramos al lavador)
  const pedidosVigentes = pedidos.filter(
    (p) => !p.fecha_limite_express || new Date(p.fecha_limite_express).getTime() > Date.now()
  );

  const pedidosConDistancia = pedidosVigentes
    .map((p) => ({
      ...p,
      distanciaKm: miPosicion ? distanciaKm(miPosicion[0], miPosicion[1], p.lat, p.lng) : null,
    }))
    .sort((a, b) => (a.distanciaKm ?? Infinity) - (b.distanciaKm ?? Infinity));

  const centro: [number, number] = miPosicion ?? [
    pedidosVigentes[0]?.lat ?? -34.6,
    pedidosVigentes[0]?.lng ?? -58.4,
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Pedidos express cerca tuyo</h2>
        <button onClick={actualizarMiUbicacion} className="text-sm underline">
          Actualizar mi ubicación
        </button>
      </div>

      <ExpressMap
        centro={centro}
        miPosicion={miPosicion}
        puntos={pedidosVigentes.map((p) => ({ id: p.id, lat: p.lat, lng: p.lng, etiqueta: p.direccion_texto }))}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}
      {!miPosicion && (
        <p className="text-xs text-neutral-500">
          Activá tu ubicación para ver a cuántos km está cada pedido.
        </p>
      )}

      {pedidosConDistancia.length === 0 ? (
        <p className="text-sm text-neutral-500">
          No hay pedidos express esperando en tu zona ahora mismo.
        </p>
      ) : (
        <div className="space-y-2">
          {pedidosConDistancia.map((p) => (
            <div key={p.id} className="border rounded-md p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{p.direccion_texto}</p>
                <p className="text-xs text-neutral-500">
                  {p.detalles_vehiculo || `Vehículo: ${p.tipo_vehiculo}`}
                  {p.distanciaKm != null && ` · a ${p.distanciaKm.toFixed(1)} km`}
                </p>
                {p.fecha_limite_express && (
                  <p className="text-xs text-amber-600">{tiempoRestante(p.fecha_limite_express)}</p>
                )}
              </div>
              <button
                onClick={() => aceptar(p.id)}
                disabled={procesando === p.id}
                className="bg-neutral-900 text-white rounded-md px-3 py-1.5 text-sm disabled:opacity-50"
              >
                {procesando === p.id ? "..." : "Aceptar"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
