import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ESTADOS_CANCELABLES = ["confirmado", "en_camino"];

// El lavador cancela un turno ya pagado: reembolso COMPLETO para el
// cliente (no es su culpa) y penalizacion automatica de rating para el
// lavador (el trigger trg_penalizar_cancelacion_lavador en la base se
// encarga de bajarle las estrellas al pasar el pedido a este estado).
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
    .select("id, lavador_id, estado, precio_total")
    .eq("id", pedidoId)
    .single();

  if (!pedido || pedido.lavador_id !== user.id || !ESTADOS_CANCELABLES.includes(pedido.estado)) {
    return NextResponse.json({ error: "No se puede cancelar este pedido" }, { status: 409 });
  }

  const { error } = await admin
    .from("pedidos")
    .update({
      estado: "cancelado_lavador",
      cancelado_en: new Date().toISOString(),
      cancelado_por: "lavador",
      penalidad_aplicada: 0,
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
    monto: pedido.precio_total ?? 0,
  });

  await admin.from("pedido_eventos").insert({
    pedido_id: pedidoId,
    estado_anterior: pedido.estado,
    estado_nuevo: "cancelado_lavador",
    actor: "lavador",
  });

  return NextResponse.json({ ok: true });
}
