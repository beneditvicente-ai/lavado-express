import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ESTADOS_CANCELABLES = ["confirmado", "en_camino"];

// El cliente cancela un turno ya pagado. El reembolso depende de cuanto
// falta: programado con mas de 24hs de anticipacion = reembolso completo;
// con menos, o express (que no tiene "anticipacion" posible), se aplica
// la penalidad configurada (default 50%).
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
    .select("id, cliente_id, estado, tipo, fecha_hora_turno, precio_total")
    .eq("id", pedidoId)
    .single();

  if (!pedido || pedido.cliente_id !== user.id || !ESTADOS_CANCELABLES.includes(pedido.estado)) {
    return NextResponse.json({ error: "No se puede cancelar este pedido" }, { status: 409 });
  }

  const { data: config } = await admin
    .from("configuracion_app")
    .select("valor")
    .eq("clave", "penalidad_cancelacion_tardia_pct")
    .single();
  const penalidadPctConfigurada = config?.valor ?? 50;

  let dentroDePlazo = false;
  if (pedido.tipo === "programado" && pedido.fecha_hora_turno) {
    const horasHastaElTurno =
      (new Date(pedido.fecha_hora_turno).getTime() - Date.now()) / (1000 * 60 * 60);
    dentroDePlazo = horasHastaElTurno >= 24;
  }
  // express no tiene "anticipacion" posible (es para ahora), siempre aplica la penalidad

  const penalidadPct = dentroDePlazo ? 0 : penalidadPctConfigurada;
  const precioTotal = pedido.precio_total ?? 0;
  const montoPenalidad = Math.round(((precioTotal * penalidadPct) / 100) * 100) / 100;
  const montoReembolso = Math.round((precioTotal - montoPenalidad) * 100) / 100;

  const { error } = await admin
    .from("pedidos")
    .update({
      estado: penalidadPct > 0 ? "cancelado_con_cargo" : "cancelado_sin_cargo",
      cancelado_en: new Date().toISOString(),
      cancelado_por: "cliente",
      penalidad_aplicada: montoPenalidad,
      actualizado_en: new Date().toISOString(),
    })
    .eq("id", pedidoId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await admin.from("pagos").insert({
    pedido_id: pedidoId,
    proveedor: "simulado",
    estado: "reembolsado",
    monto: montoReembolso,
  });

  await admin.from("pedido_eventos").insert({
    pedido_id: pedidoId,
    estado_anterior: pedido.estado,
    estado_nuevo: penalidadPct > 0 ? "cancelado_con_cargo" : "cancelado_sin_cargo",
    actor: "cliente",
  });

  return NextResponse.json({ ok: true, montoReembolso, montoPenalidad, penalidadPct });
}
