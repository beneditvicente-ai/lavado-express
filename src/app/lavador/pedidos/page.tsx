import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/LogoutButton";
import { InicioLink } from "@/components/InicioLink";
import { LavadorNav } from "@/components/LavadorNav";
import { TabsPedidos, type PedidoResumen } from "@/components/TabsPedidos";
import { BloqueosForm } from "@/components/BloqueosForm";
import { TurnosCalendar } from "@/components/TurnosCalendar";
import { SolicitudesProgramadasLavador } from "@/components/SolicitudesProgramadasLavador";

export default async function PedidosLavadorPage() {
  const usuario = await requireRol("lavador");
  const supabase = await createClient();

  const [
    { data: pedidos },
    { data: bloqueos },
    { data: disponibilidad },
    { data: tiposServicio },
    { data: solicitudesProgramadas },
    { data: preciosPropios },
    { data: vehiculoRecargos },
  ] = await Promise.all([
    supabase
      .from("pedidos")
      .select(
        "id, tipo, estado, precio_total, fecha_hora_turno, creado_en, direccion_texto, detalles_vehiculo, tipo_servicio_id, lat, lng, fecha_limite_express"
      )
      .eq("lavador_id", usuario.id)
      .eq("oculto_lavador", false)
      .order("creado_en", { ascending: false }),
    supabase
      .from("lavador_bloqueos")
      .select("id, fecha, hora_inicio, hora_fin, motivo")
      .eq("lavador_id", usuario.id),
    supabase
      .from("lavador_disponibilidad")
      .select("dia_semana, hora_inicio, hora_fin")
      .eq("lavador_id", usuario.id),
    supabase.from("tipos_servicio").select("id, nombre"),
    supabase
      .from("pedidos")
      .select("id, direccion_texto, lat, lng, tipo_vehiculo, detalles_vehiculo, tipo_servicio_id, fecha_hora_turno")
      .eq("estado", "buscando")
      .eq("tipo", "programado")
      .is("lavador_id", null)
      .order("fecha_hora_turno", { ascending: true }),
    supabase.from("lavador_servicios").select("tipo_servicio_id, precio").eq("lavador_id", usuario.id),
    supabase.from("vehiculo_recargos").select("tipo_vehiculo, recargo_pct"),
  ]);

  const { data: estadoExpress } = await supabase
    .from("lavador_estado_express")
    .select("lat, lng")
    .eq("lavador_id", usuario.id)
    .maybeSingle();
  const miPosicion: [number, number] | null =
    estadoExpress?.lat != null && estadoExpress?.lng != null ? [estadoExpress.lat, estadoExpress.lng] : null;

  const pedidoIds = (pedidos ?? []).map((p) => p.id);
  const { data: fotos } = pedidoIds.length
    ? await supabase.from("pedido_fotos").select("pedido_id, storage_path").in("pedido_id", pedidoIds)
    : { data: [] as { pedido_id: string; storage_path: string }[] };

  const fotosPorPedido = new Map<string, string[]>();
  for (const f of fotos ?? []) {
    const url = supabase.storage.from("lavador-fotos").getPublicUrl(f.storage_path).data.publicUrl;
    fotosPorPedido.set(f.pedido_id, [...(fotosPorPedido.get(f.pedido_id) ?? []), url]);
  }

  const preciosPorServicio = Object.fromEntries(
    (preciosPropios ?? []).map((p) => [p.tipo_servicio_id, p.precio])
  );
  const recargosPorVehiculo = Object.fromEntries(
    (vehiculoRecargos ?? []).map((v) => [v.tipo_vehiculo, v.recargo_pct])
  );
  const nombresServicio = Object.fromEntries((tiposServicio ?? []).map((t) => [t.id, t.nombre]));

  const nombreServicioPorId = new Map((tiposServicio ?? []).map((t) => [t.id, t.nombre]));

  const lista: PedidoResumen[] = [];
  const turnosCalendario = await Promise.all(
    (pedidos ?? []).map(async (p) => {
      const { data: contraparte } = await supabase.rpc("get_perfil_publico_contraparte", {
        p_pedido_id: p.id,
      });
      const nombre = contraparte?.[0]?.nombre ?? "—";

      lista.push({
        id: p.id,
        tipo: p.tipo,
        estado: p.estado,
        precio_total: p.precio_total ?? 0,
        fecha_hora_turno: p.fecha_hora_turno,
        creado_en: p.creado_en,
        contraparteNombre: nombre,
        direccionTexto: p.direccion_texto,
        detallesVehiculo: p.detalles_vehiculo,
        lat: p.lat,
        lng: p.lng,
        fechaLimiteExpress: p.fecha_limite_express,
        fotosResultado: fotosPorPedido.get(p.id) ?? [],
      });

      return {
        id: p.id,
        fecha_hora_turno: p.fecha_hora_turno,
        estado: p.estado,
        clienteNombre: nombre,
        direccionTexto: p.direccion_texto,
        servicioNombre: nombreServicioPorId.get(p.tipo_servicio_id) ?? "—",
        precioTotal: p.precio_total ?? 0,
      };
    })
  );

  return (
    <main className="flex-1 max-w-2xl mx-auto w-full p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <InicioLink />
          <h1 className="text-2xl font-semibold">Mis turnos</h1>
        </div>
        <LogoutButton />
      </div>

      <LavadorNav activo="/lavador/pedidos" />

      <TurnosCalendar
        turnos={turnosCalendario}
        bloqueos={bloqueos ?? []}
        disponibilidad={disponibilidad ?? []}
        solicitudesPendientes={(solicitudesProgramadas ?? []).map((s) => ({
          id: s.id,
          fecha_hora_turno: s.fecha_hora_turno,
        }))}
      />

      <SolicitudesProgramadasLavador
        lavadorId={usuario.id}
        pedidosIniciales={solicitudesProgramadas ?? []}
        preciosPropios={preciosPorServicio}
        recargosVehiculo={recargosPorVehiculo}
        nombresServicio={nombresServicio}
        miPosicion={miPosicion}
      />

      <TabsPedidos pedidos={lista} etiquetaContraparte="Cliente" rol="lavador" usuarioId={usuario.id} />

      <BloqueosForm lavadorId={usuario.id} bloqueosActuales={bloqueos ?? []} />
    </main>
  );
}
