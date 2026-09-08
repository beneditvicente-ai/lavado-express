"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type TipoServicio = { id: string; nombre: string; descripcion: string | null };
type ZonaDisponible = { id: string; nombre: string };
type Paso = "datos" | "modo" | "buscando" | "candidato" | "sin_resultados" | "confirmar" | "listo";
type TipoVehiculo = "auto" | "suv" | "pickup";
type TipoPedido = "programado" | "express";

type Resultado = {
  id: string;
  nombre: string;
  rating_promedio: number;
  cantidad_calificaciones: number;
  pedidos_completados_count: number;
  precio: number;
  fotoUrl: string | null;
  companeros: string[];
};

const VEHICULOS: { valor: TipoVehiculo; etiqueta: string }[] = [
  { valor: "auto", etiqueta: "Auto" },
  { valor: "suv", etiqueta: "SUV" },
  { valor: "pickup", etiqueta: "Pick up" },
];

export function PedirLavadoWizard({
  tiposServicio,
  zonasDisponibles,
}: {
  usuarioId: string;
  tiposServicio: TipoServicio[];
  zonasDisponibles: ZonaDisponible[];
}) {
  const router = useRouter();
  const [paso, setPaso] = useState<Paso>("datos");
  const [error, setError] = useState<string | null>(null);

  // datos
  const [tipoVehiculo, setTipoVehiculo] = useState<TipoVehiculo>("auto");
  const [tipoServicioId, setTipoServicioId] = useState(tiposServicio[0]?.id ?? "");
  const [calle, setCalle] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [zonaId, setZonaId] = useState(zonasDisponibles[0]?.id ?? "");

  // modo
  const [tipo, setTipo] = useState<TipoPedido>("express");
  const [fechaHora, setFechaHora] = useState("");

  // candidatos: se van mostrando de a uno, como en Uber
  const [candidatos, setCandidatos] = useState<Resultado[]>([]);
  const [indiceCandidato, setIndiceCandidato] = useState(0);
  const [precioFinal, setPrecioFinal] = useState<number | null>(null);

  const [pedidoId, setPedidoId] = useState<string | null>(null);

  const candidatoActual = candidatos[indiceCandidato] ?? null;
  const zonaElegida = zonasDisponibles.find((z) => z.id === zonaId);

  function irAModo(e: React.FormEvent) {
    e.preventDefault();
    if (!calle.trim() || !ciudad.trim() || !zonaId) {
      setError("Completá dirección y zona.");
      return;
    }
    setError(null);
    setPaso("modo");
  }

  async function buscar() {
    setError(null);

    if (tipo === "programado" && !fechaHora) {
      setError("Elegí día y hora.");
      return;
    }

    setPaso("buscando");
    const supabase = createClient();

    // 1) lavadores que ofrecen ese servicio, con su precio
    const { data: servicios } = await supabase
      .from("lavador_servicios")
      .select("lavador_id, precio")
      .eq("tipo_servicio_id", tipoServicioId)
      .eq("activo", true);

    const precioPorLavador = new Map((servicios ?? []).map((s) => [s.lavador_id, s.precio]));

    // 2) lavadores que cubren la zona elegida
    const { data: zonas } = await supabase
      .from("lavador_zonas")
      .select("lavador_id")
      .eq("zona_id", zonaId);
    const idsPorZona = new Set((zonas ?? []).map((z) => z.lavador_id));

    // 3) disponibilidad segun el modo
    let idsDisponibles = new Set<string>();
    if (tipo === "express") {
      const { data: disponibles } = await supabase
        .from("lavador_estado_express")
        .select("lavador_id")
        .eq("disponible_ahora", true);
      idsDisponibles = new Set((disponibles ?? []).map((d) => d.lavador_id));
    } else {
      const fecha = new Date(fechaHora);
      const diaSemana = fecha.getDay();
      const hora = fecha.toTimeString().slice(0, 8);
      const { data: disponibles } = await supabase
        .from("lavador_disponibilidad")
        .select("lavador_id, hora_inicio, hora_fin")
        .eq("dia_semana", diaSemana)
        .lte("hora_inicio", hora)
        .gte("hora_fin", hora);
      idsDisponibles = new Set((disponibles ?? []).map((d) => d.lavador_id));
    }

    const idsCandidatos = [...precioPorLavador.keys()].filter(
      (id) => idsPorZona.has(id) && idsDisponibles.has(id)
    );

    if (idsCandidatos.length === 0) {
      setCandidatos([]);
      setPaso("sin_resultados");
      return;
    }

    const [{ data: publicos }, { data: fotos }, { data: companeros }, { data: vehiculoRecargo }] =
      await Promise.all([
        supabase
          .from("lavadores_publicos")
          .select("id, nombre, rating_promedio, cantidad_calificaciones, pedidos_completados_count")
          .in("id", idsCandidatos),
        supabase
          .from("lavador_fotos")
          .select("lavador_id, storage_path")
          .in("lavador_id", idsCandidatos)
          .eq("tipo", "perfil"),
        supabase.from("lavador_companeros").select("lavador_id, nombre").in("lavador_id", idsCandidatos),
        supabase.from("vehiculo_recargos").select("recargo_pct").eq("tipo_vehiculo", tipoVehiculo).single(),
      ]);

    let recargoExpresoPct = 0;
    if (tipo === "express") {
      const { data: config } = await supabase
        .from("configuracion_app")
        .select("valor")
        .eq("clave", "recargo_express_pct")
        .single();
      recargoExpresoPct = config?.valor ?? 0;
    }

    const fotoPorLavador = new Map((fotos ?? []).map((f) => [f.lavador_id, f.storage_path]));

    const listaOrdenada: Resultado[] = (publicos ?? [])
      .map((p) => {
        const precioBase =
          (precioPorLavador.get(p.id) ?? 0) * (1 + (vehiculoRecargo?.recargo_pct ?? 0) / 100);
        const precio = Math.round(precioBase * (1 + recargoExpresoPct / 100) * 100) / 100;
        const storagePath = fotoPorLavador.get(p.id);
        return {
          id: p.id,
          nombre: p.nombre,
          rating_promedio: p.rating_promedio,
          cantidad_calificaciones: p.cantidad_calificaciones,
          pedidos_completados_count: p.pedidos_completados_count,
          precio,
          fotoUrl: storagePath
            ? supabase.storage.from("lavador-fotos").getPublicUrl(storagePath).data.publicUrl
            : null,
          companeros: (companeros ?? [])
            .filter((c) => c.lavador_id === p.id)
            .map((c) => c.nombre),
        };
      })
      .sort(
        (a, b) =>
          b.pedidos_completados_count - a.pedidos_completados_count ||
          b.rating_promedio - a.rating_promedio
      );

    setCandidatos(listaOrdenada);
    setIndiceCandidato(0);
    setPrecioFinal(listaOrdenada[0]?.precio ?? null);
    setPaso("candidato");
  }

  function pedirOtro() {
    const siguiente = indiceCandidato + 1;
    if (siguiente >= candidatos.length) {
      setPaso("sin_resultados");
      return;
    }
    setIndiceCandidato(siguiente);
    setPrecioFinal(candidatos[siguiente].precio);
  }

  function aceptar() {
    setPaso("confirmar");
  }

  async function confirmarYCrearPedido() {
    if (!candidatoActual) return;
    setError(null);

    const res = await fetch("/api/pedidos/crear", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo,
        tipo_vehiculo: tipoVehiculo,
        tipo_servicio_id: tipoServicioId,
        lavador_id: candidatoActual.id,
        direccion_texto: `${calle}, ${ciudad}`,
        zona: zonaElegida?.nombre,
        zona_id: zonaId,
        fecha_hora_turno: tipo === "programado" ? new Date(fechaHora).toISOString() : null,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "No se pudo crear el pedido");
      return;
    }

    setPedidoId(data.pedidoId);
    setPrecioFinal(data.precioTotal);
  }

  async function pagar() {
    if (!pedidoId) return;
    setError(null);

    const res = await fetch(`/api/pedidos/${pedidoId}/pagar`, { method: "POST" });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "No se pudo procesar el pago");
      return;
    }

    setPaso("listo");
    router.refresh();
  }

  if (paso === "listo") {
    return (
      <div className="border rounded-md p-6 text-center space-y-2">
        <p className="text-lg font-medium">¡Turno confirmado!</p>
        <p className="text-sm text-neutral-500">
          (Pago simulado — todavía falta conectar Mercado Pago de verdad)
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-md p-4 space-y-4">
      {paso === "datos" && (
        <form onSubmit={irAModo} className="space-y-3">
          <h2 className="font-medium">¿Qué necesitás lavar?</h2>

          <div className="space-y-1">
            <label className="text-sm font-medium">Tipo de vehículo</label>
            <div className="flex gap-2">
              {VEHICULOS.map((v) => (
                <button
                  key={v.valor}
                  type="button"
                  onClick={() => setTipoVehiculo(v.valor)}
                  className={`border rounded-md px-3 py-2 text-sm ${
                    tipoVehiculo === v.valor ? "bg-neutral-900 text-white" : ""
                  }`}
                >
                  {v.etiqueta}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Tipo de servicio</label>
            <div className="space-y-2">
              {tiposServicio.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTipoServicioId(t.id)}
                  className={`w-full text-left rounded-md px-3 py-2 border-2 ${
                    tipoServicioId === t.id
                      ? "border-neutral-900 bg-neutral-50"
                      : "border-neutral-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                        tipoServicioId === t.id
                          ? "border-neutral-900 bg-neutral-900"
                          : "border-neutral-300"
                      }`}
                    />
                    <p className="font-medium text-sm">{t.nombre}</p>
                  </div>
                  <p className="text-xs text-neutral-500 pl-6">{t.descripcion}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Dirección exacta</label>
            <input
              value={calle}
              onChange={(e) => setCalle(e.target.value)}
              placeholder="Calle y número"
              className="w-full border rounded-md px-3 py-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input
              value={ciudad}
              onChange={(e) => setCiudad(e.target.value)}
              placeholder="Ciudad"
              className="border rounded-md px-3 py-2"
            />
            <select
              value={zonaId}
              onChange={(e) => setZonaId(e.target.value)}
              className="border rounded-md px-3 py-2"
            >
              {zonasDisponibles.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.nombre}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" className="bg-neutral-900 text-white rounded-md px-4 py-2">
            Continuar
          </button>
        </form>
      )}

      {paso === "modo" && (
        <div className="space-y-3">
          <h2 className="font-medium">¿Cuándo lo necesitás?</h2>

          <div className="flex gap-2">
            <button
              onClick={() => setTipo("express")}
              className={`flex-1 border rounded-md px-3 py-3 ${
                tipo === "express" ? "bg-neutral-900 text-white" : ""
              }`}
            >
              Express (ahora)
            </button>
            <button
              onClick={() => setTipo("programado")}
              className={`flex-1 border rounded-md px-3 py-3 ${
                tipo === "programado" ? "bg-neutral-900 text-white" : ""
              }`}
            >
              Programado
            </button>
          </div>

          {tipo === "programado" && (
            <input
              type="datetime-local"
              value={fechaHora}
              onChange={(e) => setFechaHora(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
            />
          )}

          {tipo === "express" && (
            <p className="text-sm text-neutral-500">
              Te van a ir apareciendo lavadores disponibles ahora mismo, de a uno. Podés
              aceptar o pedir el siguiente. No se te cobra nada hasta que aceptes y confirmes.
            </p>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button onClick={() => setPaso("datos")} className="border rounded-md px-4 py-2">
              Volver
            </button>
            <button onClick={buscar} className="bg-neutral-900 text-white rounded-md px-4 py-2">
              Buscar lavadores
            </button>
          </div>
        </div>
      )}

      {paso === "buscando" && <p className="text-neutral-500">Buscando lavadores...</p>}

      {paso === "sin_resultados" && (
        <div className="space-y-3">
          <h2 className="font-medium">Sin resultados</h2>
          <p className="text-sm text-neutral-600">
            No encontramos (más) lavadores disponibles en tu zona
            {tipo === "express" ? " en este momento" : " para ese horario"}. No se
            realizó ningún cobro.
          </p>
          <button onClick={() => setPaso("modo")} className="border rounded-md px-4 py-2">
            Probar otra opción
          </button>
        </div>
      )}

      {paso === "candidato" && candidatoActual && (
        <div className="space-y-3">
          <h2 className="font-medium">Te ofrece el turno:</h2>

          <div className="border rounded-md p-4 flex gap-4">
            {candidatoActual.fotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={candidatoActual.fotoUrl}
                alt={candidatoActual.nombre}
                className="w-16 h-16 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-neutral-200 flex-shrink-0" />
            )}
            <div className="flex-1">
              <p className="font-medium">{candidatoActual.nombre}</p>
              <p className="text-xs text-neutral-500">
                ★ {candidatoActual.rating_promedio.toFixed(1)} (
                {candidatoActual.cantidad_calificaciones})
              </p>
              {candidatoActual.companeros.length > 0 && (
                <p className="text-xs text-neutral-500">
                  Con: {candidatoActual.companeros.join(", ")}
                </p>
              )}
              <p className="font-medium mt-1">
                ${candidatoActual.precio.toLocaleString("es-AR")}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={pedirOtro} className="flex-1 border rounded-md px-4 py-2">
              Buscar otro
            </button>
            <button
              onClick={aceptar}
              className="flex-1 bg-neutral-900 text-white rounded-md px-4 py-2"
            >
              Aceptar
            </button>
          </div>
        </div>
      )}

      {paso === "confirmar" && candidatoActual && (
        <div className="space-y-3">
          <h2 className="font-medium">Confirmar turno</h2>
          <div className="text-sm space-y-1">
            <p>
              Lavador: <span className="font-medium">{candidatoActual.nombre}</span>
            </p>
            <p>
              Precio: <span className="font-medium">${precioFinal?.toLocaleString("es-AR")}</span>
            </p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {!pedidoId ? (
            <div className="flex gap-2">
              <button onClick={() => setPaso("candidato")} className="border rounded-md px-4 py-2">
                Volver
              </button>
              <button
                onClick={confirmarYCrearPedido}
                className="bg-neutral-900 text-white rounded-md px-4 py-2"
              >
                Confirmar
              </button>
            </div>
          ) : (
            <button onClick={pagar} className="bg-neutral-900 text-white rounded-md px-4 py-2">
              Pagar ${precioFinal?.toLocaleString("es-AR")} (simulado)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
