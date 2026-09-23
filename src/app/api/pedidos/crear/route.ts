import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Crea el pedido con el precio calculado en el servidor (nunca confiando
// en un precio que mande el navegador). El pedido nace en 'pendiente_pago'
// porque el lavador ya fue elegido de una lista de resultados de matching
// (ver /cliente/pedir): nunca se llega a este punto sin lavador asignado,
// asi que express nunca cobra en falso.
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await req.json();
  const {
    tipo, // 'programado' | 'express'
    tipo_vehiculo,
    tipo_servicio_id,
    detalles_vehiculo,
    lavador_id,
    direccion_texto,
    zona,
    zona_id,
    fecha_hora_turno, // string ISO o null (express)
  } = body;

  if (!tipo || !tipo_vehiculo || !tipo_servicio_id || !lavador_id || !direccion_texto) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: servicio, error: errorServicio } = await admin
    .from("lavador_servicios")
    .select("precio")
    .eq("lavador_id", lavador_id)
    .eq("tipo_servicio_id", tipo_servicio_id)
    .eq("activo", true)
    .single();

  if (errorServicio || !servicio) {
    return NextResponse.json(
      { error: "Ese lavador ya no tiene ese servicio disponible" },
      { status: 409 }
    );
  }

  const { data: vehiculo } = await admin
    .from("vehiculo_recargos")
    .select("recargo_pct")
    .eq("tipo_vehiculo", tipo_vehiculo)
    .single();

  let recargoExpresoPct = 0;
  if (tipo === "express") {
    const { data: config } = await admin
      .from("configuracion_app")
      .select("valor")
      .eq("clave", "recargo_express_pct")
      .single();
    recargoExpresoPct = config?.valor ?? 0;
  }

  const { data: comisionPct } = await admin.rpc("calcular_comision_lavador", {
    p_lavador_id: lavador_id,
  });

  const precioBase = Math.round(servicio.precio * (1 + (vehiculo?.recargo_pct ?? 0) / 100) * 100) / 100;
  const precioTotal = Math.round(precioBase * (1 + recargoExpresoPct / 100) * 100) / 100;
  const montoComision = Math.round(precioTotal * (comisionPct ?? 25) / 100 * 100) / 100;
  const montoLavador = Math.round((precioTotal - montoComision) * 100) / 100;

  const { data: pedido, error: errorPedido } = await admin
    .from("pedidos")
    .insert({
      cliente_id: user.id,
      lavador_id,
      tipo,
      estado: "pendiente_pago",
      direccion_texto: `${direccion_texto}${zona ? " - " + zona : ""}`,
      lat: 0,
      lng: 0,
      zona_id: zona_id ?? null,
      fecha_hora_turno: fecha_hora_turno ?? null,
      tipo_vehiculo,
      detalles_vehiculo: detalles_vehiculo || null,
      tipo_servicio_id,
      precio_base: precioBase,
      recargo_pct: recargoExpresoPct,
      precio_total: precioTotal,
      comision_pct: comisionPct ?? 25,
      monto_comision: montoComision,
      monto_lavador: montoLavador,
    })
    .select("id, precio_total")
    .single();

  if (errorPedido || !pedido) {
    return NextResponse.json({ error: errorPedido?.message ?? "Error creando el pedido" }, { status: 500 });
  }

  await admin.from("pedido_eventos").insert({
    pedido_id: pedido.id,
    estado_anterior: null,
    estado_nuevo: "pendiente_pago",
    actor: "sistema",
  });

  return NextResponse.json({ pedidoId: pedido.id, precioTotal: pedido.precio_total });
}
