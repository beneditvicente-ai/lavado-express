"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { distanciaKm } from "@/lib/distancia";
import { Droplets, Zap, Calendar, MapPin, Gem, Sparkles } from "lucide-react";
import { EstrellasRating } from "@/components/EstrellasRating";

const UbicacionMapaSelector = dynamic(
  () => import("@/components/UbicacionMapaSelector").then((m) => m.UbicacionMapaSelector),
  { ssr: false, loading: () => <div className="h-64 rounded-2xl border border-border bg-surface-raised animate-pulse" /> }
);

type TipoServicio = { id: string; nombre: string; descripcion: string | null };
type ZonaDisponible = { id: string; nombre: string };
type Paso =
  | "datos"
  | "modo"
  | "confirmar_ubicacion"
  | "buscando"
  | "elegir_lavadores"
  | "sin_candidatos"
  | "esperando_lavador"
  | "lavador_encontrado";
type TipoVehiculo = "auto" | "suv" | "pickup";
type TipoPedido = "programado" | "express";

type OfertaLavador = {
  id: string;
  nombre: string;
  rating_promedio: number;
  cantidad_calificaciones: number;
  fotoUrl: string | null;
};

type Candidato = {
  id: string;
  nombre: string;
  rating_promedio: number;
  cantidad_calificaciones: number;
  pedidos_completados_count: number;
  precios: Record<string, number>;
  fotoUrl: string | null;
};

const VEHICULOS: { valor: TipoVehiculo; etiqueta: string }[] = [
  { valor: "auto", etiqueta: "Auto" },
  { valor: "suv", etiqueta: "SUV" },
  { valor: "pickup", etiqueta: "Pick up" },
];

function iconoServicio(nombre: string) {
  const n = nombre.toLowerCase();
  if (n.includes("encerado")) return Gem;
  if (n.includes("interior")) return Sparkles;
  return Droplets;
}

export function PedirLavadoWizard({
  tiposServicio,
  zonasDisponibles,
}: {
  usuarioId: string;
  tiposServicio: TipoServicio[];
  zonasDisponibles: ZonaDisponible[];
}) {
  const [paso, setPaso] = useState<Paso>("datos");
  const [error, setError] = useState<string | null>(null);

  // datos
  const [tipoVehiculo, setTipoVehiculo] = useState<TipoVehiculo>("auto");
  const [tipoServicioId, setTipoServicioId] = useState(tiposServicio[0]?.id ?? "");
  const [calle, setCalle] = useState("");
  const [zonaId, setZonaId] = useState(zonasDisponibles[0]?.id ?? "");
  const [loteBarrio, setLoteBarrio] = useState("");
  const [detallesVehiculo, setDetallesVehiculo] = useState("");

  // modo
  const [tipo, setTipo] = useState<TipoPedido>("express");
  const [fechaHora, setFechaHora] = useState("");
  const [horasDisponibles, setHorasDisponibles] = useState(2);

  // ubicacion exacta en el mapa, tipo Uber (solo express): arranca en el
  // GPS y se puede arrastrar el pin para ajustar
  const [ubicacionMapa, setUbicacionMapa] = useState<{ lat: number; lng: number } | null>(null);
  const [direccionMapa, setDireccionMapa] = useState("");
  const [geocodificando, setGeocodificando] = useState(false);

  const [pedidoId, setPedidoId] = useState<string | null>(null);
  const [precioFinal, setPrecioFinal] = useState<number | null>(null);

  // "a la Uber": el pedido nace sin lavador (tanto express como
  // programado), el lavador lo acepta primero y recien ahi se sabe el
  // precio -- nunca se cobra antes de que alguien confirme.
  const [ofertaLavador, setOfertaLavador] = useState<OfertaLavador | null>(null);
  const [fechaLimiteExpress, setFechaLimiteExpress] = useState<string | null>(null);
  const [miUbicacionExpress, setMiUbicacionExpress] = useState<{ lat: number; lng: number } | null>(null);
  const [distanciaLavadorKm, setDistanciaLavadorKm] = useState<number | null>(null);

  // elegir_lavadores (solo programado): lavadores libres en ese horario/zona
  // para que el cliente elija a quiénes invitar
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [recargosVehiculo, setRecargosVehiculo] = useState<Record<string, number>>({});
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [filtroPrecioMin, setFiltroPrecioMin] = useState<number | null>(null);
  const [filtroPrecioMax, setFiltroPrecioMax] = useState<number | null>(null);

  const zonaElegida = zonasDisponibles.find((z) => z.id === zonaId);

  const candidatosFiltrados = candidatos.filter((c) => {
    const precioBase = c.precios[tipoServicioId];
    if (precioBase == null) return false;
    const precioFinal = precioBase * (1 + (recargosVehiculo[tipoVehiculo] ?? 0) / 100);
    if (filtroPrecioMin != null && precioFinal < filtroPrecioMin) return false;
    if (filtroPrecioMax != null && precioFinal > filtroPrecioMax) return false;
    return true;
  });

  // mientras esperamos que un lavador acepte, consultamos cada 3s si ya paso
  useEffect(() => {
    if (paso !== "esperando_lavador" || !pedidoId) return;

    const supabase = createClient();
    const intervalo = setInterval(async () => {
      const { data: pedido } = await supabase
        .from("pedidos")
        .select("estado, lavador_id, precio_total, fecha_limite_express")
        .eq("id", pedidoId)
        .single();

      if (pedido?.estado === "pendiente_pago" && pedido.lavador_id) {
        setFechaLimiteExpress(pedido.fecha_limite_express);
        const [{ data: publico }, { data: foto }, { data: estadoLavador }] = await Promise.all([
          supabase
            .from("lavadores_publicos")
            .select("id, nombre, rating_promedio, cantidad_calificaciones")
            .eq("id", pedido.lavador_id)
            .single(),
          supabase
            .from("lavador_fotos")
            .select("storage_path")
            .eq("lavador_id", pedido.lavador_id)
            .eq("tipo", "perfil")
            .limit(1)
            .maybeSingle(),
          supabase
            .from("lavador_estado_express")
            .select("lat, lng")
            .eq("lavador_id", pedido.lavador_id)
            .maybeSingle(),
        ]);

        if (miUbicacionExpress && estadoLavador?.lat != null && estadoLavador?.lng != null) {
          setDistanciaLavadorKm(
            distanciaKm(miUbicacionExpress.lat, miUbicacionExpress.lng, estadoLavador.lat, estadoLavador.lng)
          );
        }

        setOfertaLavador(
          publico
            ? {
                ...publico,
                fotoUrl: foto
                  ? supabase.storage.from("lavador-fotos").getPublicUrl(foto.storage_path).data.publicUrl
                  : null,
              }
            : {
                id: pedido.lavador_id,
                nombre: "Un lavador",
                rating_promedio: 0,
                cantidad_calificaciones: 0,
                fotoUrl: null,
              }
        );
        setPrecioFinal(pedido.precio_total);
        setPaso("lavador_encontrado");
      }
    }, 3000);

    return () => clearInterval(intervalo);
  }, [paso, pedidoId, miUbicacionExpress]);

  function irAModo(e: React.FormEvent) {
    e.preventDefault();
    if (!detallesVehiculo.trim()) {
      setError("Contanos el modelo de tu vehículo.");
      return;
    }
    if (!calle.trim() || !zonaId) {
      setError("Completá dirección y zona.");
      return;
    }
    setError(null);
    setPaso("modo");
  }

  async function buscar() {
    setError(null);

    if (tipo === "express") {
      iniciarBusquedaExpress();
      return;
    }

    if (!fechaHora) {
      setError("Elegí día y hora.");
      return;
    }

    await buscarLavadoresProgramado();
  }

  // trae los lavadores de la zona que ofrecen el Básico, están disponibles
  // ese día/hora (según su horario semanal) y no tienen un bloqueo puntual
  // que se cruce -- para que el cliente elija a quiénes invitar
  async function buscarLavadoresProgramado() {
    setPaso("buscando");
    const supabase = createClient();

    const fecha = new Date(fechaHora);
    const diaSemana = fecha.getDay();
    const horaStr = `${String(fecha.getHours()).padStart(2, "0")}:${String(fecha.getMinutes()).padStart(2, "0")}:00`;
    const fechaStr = fechaHora.slice(0, 10);

    const { data: zonaRows } = await supabase
      .from("lavador_zonas")
      .select("lavador_id")
      .eq("zona_id", zonaId);
    const idsZona = (zonaRows ?? []).map((r) => r.lavador_id);
    if (idsZona.length === 0) {
      setCandidatos([]);
      setPaso("sin_candidatos");
      return;
    }

    const { data: servRows } = await supabase
      .from("lavador_servicios")
      .select("lavador_id, tipo_servicio_id, precio")
      .eq("activo", true)
      .in("lavador_id", idsZona);
    const preciosPorLavador = new Map<string, Record<string, number>>();
    for (const r of servRows ?? []) {
      const mapa = preciosPorLavador.get(r.lavador_id) ?? {};
      mapa[r.tipo_servicio_id] = r.precio;
      preciosPorLavador.set(r.lavador_id, mapa);
    }
    const idsConServicio = [...preciosPorLavador.entries()]
      .filter(([, precios]) => precios[tipoServicioId] != null)
      .map(([id]) => id);
    if (idsConServicio.length === 0) {
      setCandidatos([]);
      setPaso("sin_candidatos");
      return;
    }

    const { data: dispRows } = await supabase
      .from("lavador_disponibilidad")
      .select("lavador_id, hora_inicio, hora_fin")
      .eq("dia_semana", diaSemana)
      .in("lavador_id", idsConServicio);
    const idsDisponibles = (dispRows ?? [])
      .filter((d) => d.hora_inicio <= horaStr && d.hora_fin >= horaStr)
      .map((d) => d.lavador_id);
    if (idsDisponibles.length === 0) {
      setCandidatos([]);
      setPaso("sin_candidatos");
      return;
    }

    const { data: bloqueosRows } = await supabase
      .from("lavador_bloqueos")
      .select("lavador_id, hora_inicio, hora_fin")
      .eq("fecha", fechaStr)
      .in("lavador_id", idsDisponibles);
    const idsBloqueados = new Set(
      (bloqueosRows ?? [])
        .filter((b) => b.hora_inicio <= horaStr && b.hora_fin >= horaStr)
        .map((b) => b.lavador_id)
    );
    const idsFinal = idsDisponibles.filter((id) => !idsBloqueados.has(id));
    if (idsFinal.length === 0) {
      setCandidatos([]);
      setPaso("sin_candidatos");
      return;
    }

    const [{ data: publicos }, { data: fotos }, { data: recargos }] = await Promise.all([
      supabase
        .from("lavadores_publicos")
        .select("id, nombre, rating_promedio, cantidad_calificaciones, pedidos_completados_count")
        .in("id", idsFinal),
      supabase
        .from("lavador_fotos")
        .select("lavador_id, storage_path")
        .eq("tipo", "perfil")
        .in("lavador_id", idsFinal),
      supabase.from("vehiculo_recargos").select("tipo_vehiculo, recargo_pct"),
    ]);

    const fotoPorLavador = new Map<string, string>();
    for (const f of fotos ?? []) {
      fotoPorLavador.set(
        f.lavador_id,
        supabase.storage.from("lavador-fotos").getPublicUrl(f.storage_path).data.publicUrl
      );
    }

    const lista: Candidato[] = (publicos ?? []).map((p) => ({
      id: p.id,
      nombre: p.nombre,
      rating_promedio: p.rating_promedio,
      cantidad_calificaciones: p.cantidad_calificaciones,
      pedidos_completados_count: p.pedidos_completados_count,
      precios: preciosPorLavador.get(p.id) ?? {},
      fotoUrl: fotoPorLavador.get(p.id) ?? null,
    }));

    if (lista.length === 0) {
      setPaso("sin_candidatos");
      return;
    }

    setRecargosVehiculo(Object.fromEntries((recargos ?? []).map((r) => [r.tipo_vehiculo, r.recargo_pct])));
    setCandidatos(lista);
    setSeleccionados(new Set());
    setFiltroPrecioMin(null);
    setFiltroPrecioMax(null);
    setPaso("elegir_lavadores");
  }

  async function enviarInvitaciones() {
    if (seleccionados.size === 0) return;
    setError(null);
    setPaso("buscando");

    const res = await fetch("/api/pedidos/crear-solicitud-programado", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo_vehiculo: tipoVehiculo,
        tipo_servicio_id: tipoServicioId,
        detalles_vehiculo: detallesVehiculo,
        direccion_texto: loteBarrio.trim() ? `${calle} — ${loteBarrio.trim()}` : calle,
        zona_id: zonaId,
        fecha_hora_turno: new Date(fechaHora).toISOString(),
        lavador_ids: [...seleccionados],
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "No se pudo enviar la solicitud");
      setPaso("elegir_lavadores");
      return;
    }

    setPedidoId(data.pedidoId);
    setPaso("esperando_lavador");
  }

  function obtenerUbicacion(): Promise<{ lat: number; lng: number }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Tu navegador no soporta ubicación."));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => reject(new Error("Necesitamos tu ubicación para buscar lavadores cerca tuyo.")),
        { timeout: 10000 }
      );
    });
  }

  async function geocodificar(lat: number, lng: number): Promise<string> {
    try {
      const res = await fetch(`/api/geocodificar?lat=${lat}&lng=${lng}`);
      const data = await res.json();
      return data.direccion ?? calle;
    } catch {
      return calle;
    }
  }

  // paso 1 (como Uber): tomamos el GPS y mostramos el mapa para que
  // confirme/ajuste el pin antes de buscar
  async function iniciarBusquedaExpress() {
    setError(null);
    setPaso("buscando");

    let ubicacion: { lat: number; lng: number };
    try {
      ubicacion = await obtenerUbicacion();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos obtener tu ubicación.");
      setPaso("modo");
      return;
    }

    setUbicacionMapa(ubicacion);
    setGeocodificando(true);
    const direccion = await geocodificar(ubicacion.lat, ubicacion.lng);
    setDireccionMapa(direccion);
    setGeocodificando(false);
    setPaso("confirmar_ubicacion");
  }

  async function moverPin(lat: number, lng: number) {
    setUbicacionMapa({ lat, lng });
    setGeocodificando(true);
    const direccion = await geocodificar(lat, lng);
    setDireccionMapa(direccion);
    setGeocodificando(false);
  }

  // paso 2: confirmado el pin, recien ahi se crea el pedido de verdad
  async function confirmarUbicacionYBuscar() {
    if (!ubicacionMapa) return;
    setError(null);
    setPaso("buscando");

    setMiUbicacionExpress(ubicacionMapa);

    const res = await fetch("/api/pedidos/crear-solicitud-express", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo_vehiculo: tipoVehiculo,
        tipo_servicio_id: tipoServicioId,
        detalles_vehiculo: detallesVehiculo,
        direccion_texto: loteBarrio.trim() ? `${direccionMapa} — ${loteBarrio.trim()}` : direccionMapa,
        zona_id: zonaId,
        lat: ubicacionMapa.lat,
        lng: ubicacionMapa.lng,
        horas_disponibles: horasDisponibles,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "No se pudo iniciar la búsqueda");
      setPaso("confirmar_ubicacion");
      return;
    }

    setPedidoId(data.pedidoId);
    setPaso("esperando_lavador");
  }

  async function buscarOtro() {
    if (!pedidoId) return;
    setError(null);
    await fetch(`/api/pedidos/${pedidoId}/liberar`, { method: "POST" });
    setOfertaLavador(null);
    setPrecioFinal(null);
    setPaso("esperando_lavador");
  }

  async function cancelarBusqueda() {
    if (!pedidoId) return;
    await fetch(`/api/pedidos/${pedidoId}/cancelar-busqueda`, { method: "POST" });
    setPedidoId(null);
    setOfertaLavador(null);
    setPaso("modo");
  }

  async function pagar() {
    if (!pedidoId) return;
    setError(null);

    const res = await fetch(`/api/pedidos/${pedidoId}/pagar`, { method: "POST" });
    const data = await res.json();

    if (!res.ok) {
      // lo mas probable es que el lavador haya cancelado su aceptación
      // antes de que pagaras -- el pedido vuelve a estar buscando otro
      setError("Ese lavador ya no puede tomar tu pedido. Seguimos buscando otro...");
      setOfertaLavador(null);
      setPrecioFinal(null);
      setPaso("esperando_lavador");
      return;
    }

    // el turno se confirma recien cuando llega el webhook de Mercado Pago
    // con el pago aprobado -- acá solo redirigimos al checkout
    window.location.href = data.url;
  }

  return (
    <div className="border border-border rounded-2xl p-4 space-y-4 bg-surface">
      {paso === "datos" && (
        <form onSubmit={irAModo} className="space-y-4">
          <h2 className="font-semibold text-lg text-foreground">¿Qué necesitás lavar?</h2>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Tipo de vehículo</label>
            <div className="flex gap-2">
              {VEHICULOS.map((v) => (
                <button
                  key={v.valor}
                  type="button"
                  onClick={() => setTipoVehiculo(v.valor)}
                  className={`border rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 active:scale-95 ${
                    tipoVehiculo === v.valor
                      ? "bg-accent border-accent text-accent-foreground"
                      : "border-border text-foreground-muted hover:border-accent/40"
                  }`}
                >
                  {v.etiqueta}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Tipo de lavado</label>
            <div className="space-y-2">
              {tiposServicio.map((t) => {
                const Icono = iconoServicio(t.nombre);
                const seleccionado = tipoServicioId === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTipoServicioId(t.id)}
                    className={`w-full flex items-start gap-3 border-2 rounded-2xl p-3.5 text-left transition-all duration-200 active:scale-95 ${
                      seleccionado ? "border-accent bg-accent/10" : "border-border"
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                        seleccionado ? "bg-accent/20" : "bg-surface-raised"
                      }`}
                    >
                      <Icono size={16} strokeWidth={1.75} className={seleccionado ? "text-accent" : "text-foreground-muted"} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{t.nombre}</p>
                      {t.descripcion && <p className="text-xs text-foreground-muted mt-0.5">{t.descripcion}</p>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Modelo de vehículo <span className="text-accent">*</span>
            </label>
            <input
              required
              value={detallesVehiculo}
              onChange={(e) => setDetallesVehiculo(e.target.value)}
              placeholder="ej: Corolla gris, patente AB123CD"
              className="w-full bg-surface-raised border border-border rounded-xl px-3.5 py-2.5 text-foreground placeholder:text-foreground-muted transition-all duration-200 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
            />
            <p className="text-xs text-foreground-muted">Así el lavador lo reconoce al llegar.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Dirección exacta</label>
            <input
              value={calle}
              onChange={(e) => setCalle(e.target.value)}
              placeholder="Calle y número"
              className="w-full bg-surface-raised border border-border rounded-xl px-3.5 py-2.5 text-foreground placeholder:text-foreground-muted transition-all duration-200 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Localidad</label>
            <select
              value={zonaId}
              onChange={(e) => setZonaId(e.target.value)}
              className="w-full bg-surface-raised border border-border rounded-xl px-3.5 py-2.5 text-foreground transition-all duration-200 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
            >
              {zonasDisponibles.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Lote / Barrio (opcional)</label>
            <input
              value={loteBarrio}
              onChange={(e) => setLoteBarrio(e.target.value)}
              placeholder="ej: Lote 45, Barrio Los Álamos"
              className="w-full bg-surface-raised border border-border rounded-xl px-3.5 py-2.5 text-foreground placeholder:text-foreground-muted transition-all duration-200 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
            />
            <p className="text-xs text-foreground-muted">
              Si estás en un barrio cerrado o el GPS no marca el lote exacto, agregalo acá.
            </p>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            className="w-full bg-accent text-accent-foreground rounded-full px-6 py-3.5 font-semibold shadow-lg shadow-accent/20 transition-all duration-200 active:scale-95"
          >
            Continuar
          </button>
        </form>
      )}

      {paso === "modo" && (
        <div className="space-y-4">
          <h2 className="font-semibold text-lg text-foreground">¿Cuándo lo necesitás?</h2>

          <div className="flex gap-2">
            <button
              onClick={() => setTipo("express")}
              className={`flex-1 rounded-2xl px-4 py-4 border-2 text-left transition-all duration-200 active:scale-95 ${
                tipo === "express" ? "bg-accent border-accent text-accent-foreground" : "border-border text-foreground"
              }`}
            >
              <Zap size={22} strokeWidth={1.75} />
              <p className="font-semibold text-sm mt-1.5">Express</p>
              <p className={`text-xs mt-0.5 ${tipo === "express" ? "text-accent-foreground/70" : "text-foreground-muted"}`}>
                Alguien viene ya, con GPS en vivo
              </p>
            </button>
            <button
              onClick={() => setTipo("programado")}
              className={`flex-1 rounded-2xl px-4 py-4 border-2 text-left transition-all duration-200 active:scale-95 ${
                tipo === "programado" ? "bg-accent border-accent text-accent-foreground" : "border-border text-foreground"
              }`}
            >
              <Calendar size={22} strokeWidth={1.75} />
              <p className="font-semibold text-sm mt-1.5">Programado</p>
              <p className={`text-xs mt-0.5 ${tipo === "programado" ? "text-accent-foreground/70" : "text-foreground-muted"}`}>
                Elegís día y hora
              </p>
            </button>
          </div>

          {tipo === "programado" && (
            <div className="space-y-2">
              <input
                type="datetime-local"
                value={fechaHora}
                onChange={(e) => setFechaHora(e.target.value)}
                className="w-full bg-surface-raised border border-border rounded-xl px-3.5 py-2.5 text-foreground transition-all duration-200 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
              />
              <p className="text-sm text-foreground-muted">
                Te mostramos los lavadores libres en ese horario para que elijas a quién invitar —
                podés invitar a varios. El primero que confirma se queda con el turno. No se te
                cobra nada hasta entonces.
              </p>
            </div>
          )}

          {tipo === "express" && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">¿Cuánto tiempo podés dejar el auto?</label>
              <select
                value={horasDisponibles}
                onChange={(e) => setHorasDisponibles(Number(e.target.value))}
                className="w-full bg-surface-raised border border-border rounded-xl px-3.5 py-2.5 text-foreground transition-all duration-200 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
              >
                <option value={2}>2 horas (mínimo)</option>
                <option value={3}>3 horas</option>
                <option value={4}>4 horas</option>
                <option value={6}>6 horas</option>
                <option value={8}>Todo el día</option>
              </select>
              <p className="text-sm text-foreground-muted">
                Vamos a pedirte tu ubicación exacta y se lo vamos a mostrar a los lavadores junto
                con este tiempo, para que decidan si te pueden aceptar. No se te cobra nada hasta
                que confirmes.
              </p>
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-2">
            <button
              onClick={() => setPaso("datos")}
              className="border border-border text-foreground rounded-full px-5 py-3 transition-all duration-200 active:scale-95"
            >
              Volver
            </button>
            <button
              onClick={buscar}
              className="flex-1 bg-accent text-accent-foreground rounded-full px-6 py-3 font-semibold shadow-lg shadow-accent/20 transition-all duration-200 active:scale-95"
            >
              Buscar lavadores
            </button>
          </div>
        </div>
      )}

      {paso === "confirmar_ubicacion" && ubicacionMapa && (
        <div className="space-y-3">
          <h2 className="font-semibold text-lg text-foreground">Confirmá dónde está el auto</h2>
          <p className="text-sm text-foreground-muted">
            Movés el pin si no es exacto — esto es lo que va a ver el lavador.
          </p>

          <div className="rounded-2xl overflow-hidden border border-border">
            <UbicacionMapaSelector posicion={[ubicacionMapa.lat, ubicacionMapa.lng]} onMover={moverPin} />
          </div>

          <p className="text-sm flex items-center gap-1.5 text-foreground">
            <MapPin size={16} className="flex-shrink-0 text-accent" />
            {geocodificando ? "Buscando dirección..." : direccionMapa}
          </p>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-2">
            <button
              onClick={() => setPaso("modo")}
              className="border border-border text-foreground rounded-full px-5 py-3 transition-all duration-200 active:scale-95"
            >
              Volver
            </button>
            <button
              onClick={confirmarUbicacionYBuscar}
              disabled={geocodificando}
              className="flex-1 bg-accent text-accent-foreground rounded-full px-6 py-3 font-semibold shadow-lg shadow-accent/20 transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
            >
              Confirmar y buscar lavador
            </button>
          </div>
        </div>
      )}

      {paso === "buscando" && (
        <div className="flex items-center gap-2.5 py-6 justify-center">
          <span className="w-2 h-2 rounded-full bg-accent animate-bounce [animation-delay:-0.3s]" />
          <span className="w-2 h-2 rounded-full bg-accent animate-bounce [animation-delay:-0.15s]" />
          <span className="w-2 h-2 rounded-full bg-accent animate-bounce" />
          <p className="text-foreground-muted text-sm ml-1">Buscando lavadores...</p>
        </div>
      )}

      {paso === "sin_candidatos" && (
        <div className="space-y-3 text-center py-6">
          <p className="font-medium text-foreground">No encontramos lavadores libres en ese horario y localidad.</p>
          <p className="text-sm text-foreground-muted">Probá con otro día/hora, o usá el modo Express.</p>
          <button
            onClick={() => setPaso("modo")}
            className="border border-border text-foreground rounded-full px-5 py-2.5 text-sm transition-all duration-200 active:scale-95"
          >
            Volver
          </button>
        </div>
      )}

      {paso === "elegir_lavadores" && (
        <div className="space-y-4">
          <h2 className="font-semibold text-lg text-foreground">Elegí a quién invitar</h2>
          <p className="text-sm text-foreground-muted">
            Podés invitar a varios — el primero que confirme se queda con el turno.
          </p>

          <div className="flex gap-2 flex-wrap">
            {tiposServicio
              .filter((t) => t.id === tipoServicioId || candidatos.some((c) => c.precios[t.id] != null))
              .map((t) => {
                const Icono = iconoServicio(t.nombre);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setTipoServicioId(t.id);
                      setSeleccionados(new Set());
                    }}
                    className={`flex items-center gap-1.5 border rounded-full px-3.5 py-1.5 text-sm font-medium transition-all duration-200 active:scale-95 ${
                      tipoServicioId === t.id
                        ? "bg-accent border-accent text-accent-foreground"
                        : "border-border text-foreground-muted hover:border-accent/40"
                    }`}
                  >
                    <Icono size={14} strokeWidth={1.75} />
                    {t.nombre}
                  </button>
                );
              })}
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span className="text-foreground-muted flex-shrink-0">Precio</span>
            <input
              type="number"
              placeholder="Mín"
              value={filtroPrecioMin ?? ""}
              onChange={(e) => setFiltroPrecioMin(e.target.value ? Number(e.target.value) : null)}
              className="w-full bg-surface-raised border border-border rounded-xl px-3 py-2 text-foreground placeholder:text-foreground-muted transition-all duration-200 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
            />
            <span className="text-foreground-muted">–</span>
            <input
              type="number"
              placeholder="Máx"
              value={filtroPrecioMax ?? ""}
              onChange={(e) => setFiltroPrecioMax(e.target.value ? Number(e.target.value) : null)}
              className="w-full bg-surface-raised border border-border rounded-xl px-3 py-2 text-foreground placeholder:text-foreground-muted transition-all duration-200 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
            />
          </div>

          {candidatosFiltrados.length === 0 ? (
            <p className="text-sm text-foreground-muted py-4 text-center">
              Ningún lavador ofrece ese servicio en ese rango de precio.
            </p>
          ) : (
            <>
              <label className="flex items-center gap-2 text-sm font-medium text-foreground border-b border-border pb-2">
                <input
                  type="checkbox"
                  checked={seleccionados.size === candidatosFiltrados.length}
                  onChange={(e) =>
                    setSeleccionados(
                      e.target.checked ? new Set(candidatosFiltrados.map((c) => c.id)) : new Set()
                    )
                  }
                  className="accent-accent"
                />
                Seleccionar todos ({candidatosFiltrados.length})
              </label>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {candidatosFiltrados.map((c) => {
                  const precioBase = c.precios[tipoServicioId];
                  const precioFinal =
                    precioBase != null
                      ? Math.round(precioBase * (1 + (recargosVehiculo[tipoVehiculo] ?? 0) / 100) * 100) / 100
                      : null;
                  const marcado = seleccionados.has(c.id);
                  return (
                    <label
                      key={c.id}
                      className={`flex items-center gap-3 border rounded-2xl p-3 cursor-pointer transition-all duration-200 active:scale-95 ${
                        marcado ? "border-accent bg-accent/10" : "border-border bg-surface-raised"
                      }`}
                    >
                      <input type="checkbox" checked={marcado} className="accent-accent"
                        onChange={() =>
                          setSeleccionados((prev) => {
                            const next = new Set(prev);
                            if (next.has(c.id)) next.delete(c.id);
                            else next.add(c.id);
                            return next;
                          })
                        }
                      />
                      {c.fotoUrl ? (
                        <Image
                          src={c.fotoUrl}
                          alt={c.nombre}
                          width={40}
                          height={40}
                          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-surface flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{c.nombre}</p>
                        <p className="text-xs text-foreground-muted flex items-center gap-1">
                          <EstrellasRating puntaje={c.rating_promedio} size={11} />
                          {c.rating_promedio.toFixed(1)} ({c.cantidad_calificaciones}) · {c.pedidos_completados_count}{" "}
                          lavados
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-foreground flex-shrink-0">
                        {precioFinal != null ? `$${precioFinal.toLocaleString("es-AR")}` : "—"}
                      </p>
                    </label>
                  );
                })}
              </div>
            </>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-2">
            <button
              onClick={() => setPaso("modo")}
              className="border border-border text-foreground rounded-full px-5 py-3 transition-all duration-200 active:scale-95"
            >
              Volver
            </button>
            <button
              onClick={enviarInvitaciones}
              disabled={seleccionados.size === 0}
              className="flex-1 bg-accent text-accent-foreground rounded-full px-6 py-3 font-semibold shadow-lg shadow-accent/20 transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
            >
              Invitar a {seleccionados.size || ""} lavador{seleccionados.size === 1 ? "" : "es"}
            </button>
          </div>
        </div>
      )}

      {paso === "esperando_lavador" && (
        <div className="space-y-3 text-center py-6">
          <div className="flex items-center gap-2.5 justify-center">
            <span className="w-2 h-2 rounded-full bg-accent animate-bounce [animation-delay:-0.3s]" />
            <span className="w-2 h-2 rounded-full bg-accent animate-bounce [animation-delay:-0.15s]" />
            <span className="w-2 h-2 rounded-full bg-accent animate-bounce" />
          </div>
          <p className="font-medium text-foreground">
            {tipo === "express" ? "Buscando un lavador cerca tuyo..." : "Esperando que algún lavador confirme..."}
          </p>
          <p className="text-sm text-foreground-muted">
            En cuanto alguien acepte, te avisamos acá mismo. Todavía no se te cobró nada.
          </p>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            onClick={cancelarBusqueda}
            className="border border-border text-foreground rounded-full px-5 py-2.5 text-sm transition-all duration-200 active:scale-95"
          >
            Cancelar búsqueda
          </button>
        </div>
      )}

      {paso === "lavador_encontrado" && ofertaLavador && (
        <div className="space-y-4">
          <h2 className="font-semibold text-lg text-foreground">¡Un lavador aceptó tu pedido!</h2>

          <div className="border border-border rounded-2xl p-4 flex gap-4 items-center bg-surface-raised">
            {ofertaLavador.fotoUrl ? (
              <Image
                src={ofertaLavador.fotoUrl}
                alt={ofertaLavador.nombre}
                width={64}
                height={64}
                className="w-16 h-16 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-surface flex-shrink-0" />
            )}
            <div className="flex-1">
              <p className="font-medium text-foreground">{ofertaLavador.nombre}</p>
              <p className="text-xs text-foreground-muted flex items-center gap-1">
                <EstrellasRating puntaje={ofertaLavador.rating_promedio} size={12} />
                {ofertaLavador.rating_promedio.toFixed(1)} ({ofertaLavador.cantidad_calificaciones})
              </p>
              <p className="font-semibold text-foreground mt-1">${precioFinal?.toLocaleString("es-AR")}</p>
              {distanciaLavadorKm != null && (
                <p className="text-xs text-foreground-muted">A {distanciaLavadorKm.toFixed(1)} km tuyo</p>
              )}
              {fechaLimiteExpress && (
                <p className="text-xs text-amber-400">
                  Se compromete a tenerlo listo antes de las{" "}
                  {new Date(fechaLimiteExpress).toLocaleTimeString("es-AR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}
              <a
                href={`/lavadores/${ofertaLavador.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs underline text-foreground-muted hover:text-foreground transition-colors duration-200"
              >
                Ver perfil
              </a>
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-2">
            <button
              onClick={buscarOtro}
              className="flex-1 border border-border text-foreground rounded-full px-5 py-3.5 transition-all duration-200 active:scale-95"
            >
              Buscar otro
            </button>
            <button
              onClick={pagar}
              className="flex-1 bg-accent text-accent-foreground rounded-full px-6 py-3.5 font-semibold shadow-lg shadow-accent/20 transition-all duration-200 active:scale-95"
            >
              Aceptar y pagar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
