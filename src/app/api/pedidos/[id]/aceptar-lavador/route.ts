import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// El lavador acepta un pedido (express o programado) que estaba
// "buscando" (sin asignar). Calcula el precio recien aca (depende de que
// lavador lo tomo) y hace un UPDATE condicional para que, si dos
// lavadores aprietan "Aceptar" casi al mismo tiempo, solo uno se quede
// con el pedido (el segundo recibe 0 filas afectadas y un error claro).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: pedidoId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: pedido } = await admin
    .from("pedidos")
    .select("id, estado, lavador_id, tipo, tipo_servicio_id, tipo_vehiculo")
    .eq("id", pedidoId)
    .single();

  if (!pedido || pedido.estado !== "buscando" || pedido.lavador_id !== null) {
    return NextResponse.json({ error: "Este pedido ya no está disponible" }, { status: 409 });
  }

  const { data: servicio } = await admin
    .from("lavador_servicios")
    .select("precio")
    .eq("lavador_id", user.id)
    .eq("tipo_servicio_id", pedido.tipo_servicio_id)
    .eq("activo", true)
    .single();

  if (!servicio) {
    return NextResponse.json({ error: "No tenés precio cargado para ese servicio" }, { status: 400 });
  }

  const { data: vehiculo } = await admin
    .from("vehiculo_recargos")
    .select("recargo_pct")
    .eq("tipo_vehiculo", pedido.tipo_vehiculo)
    .single();

  // el recargo express solo aplica si el pedido es express -- para
  // programado el precio no lleva recargo.
  let recargoExpresoPct = 0;
  if (pedido.tipo === "express") {
    const { data: config } = await admin
      .from("configuracion_app")
      .select("valor")
      .eq("clave", "recargo_express_pct")
      .single();
    recargoExpresoPct = config?.valor ?? 0;
  }

  const { data: comisionPct } = await admin.rpc("calcular_comision_lavador", {
    p_lavador_id: user.id,
  });

  // el plazo (fecha_limite_express) ya lo declaro el cliente al pedirlo,
  // no se toca aca: el lavador lo vio y decidio aceptar sabiendo ese limite.

  const precioBase = Math.round(servicio.precio * (1 + (vehiculo?.recargo_pct ?? 0) / 100) * 100) / 100;
  const precioTotal = Math.round(precioBase * (1 + recargoExpresoPct / 100) * 100) / 100;
  const montoComision = Math.round((precioTotal * (comisionPct ?? 25)) / 100 * 100) / 100;
  const montoLavador = Math.round((precioTotal - montoComision) * 100) / 100;

  const { data: actualizado, error } = await admin
    .from("pedidos")
    .update({
      lavador_id: user.id,
      estado: "pendiente_pago",
      recargo_pct: recargoExpresoPct,
      precio_base: precioBase,
      precio_total: precioTotal,
      comision_pct: comisionPct ?? 25,
      monto_comision: montoComision,
      monto_lavador: montoLavador,
      actualizado_en: new Date().toISOString(),
    })
    .eq("id", pedidoId)
    .eq("estado", "buscando")
    .is("lavador_id", null)
    .select("id")
    .single();

  if (error || !actualizado) {
    return NextResponse.json({ error: "Otro lavador lo tomó primero" }, { status: 409 });
  }

  await admin.from("pedido_eventos").insert({
    pedido_id: pedidoId,
    estado_anterior: "buscando",
    estado_nuevo: "pendiente_pago",
    actor: "lavador",
  });

  return NextResponse.json({ ok: true });
}
