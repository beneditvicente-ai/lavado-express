import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Pago SIMULADO: crea un registro en `pagos` como si Mercado Pago hubiera
// confirmado, y confirma el turno. Reemplazar el bloque marcado abajo por
// la integracion real de Mercado Pago (preferencia + webhook) sin tocar
// el resto del flujo: el resto de la app ya asume que "confirmado" =
// pago acreditado.
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
    .select("id, cliente_id, estado, precio_total")
    .eq("id", pedidoId)
    .single();

  if (!pedido || pedido.cliente_id !== user.id) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }

  if (pedido.estado !== "pendiente_pago") {
    return NextResponse.json({ error: "Este pedido no esta esperando pago" }, { status: 409 });
  }

  // --- SIMULACION: reemplazar por Mercado Pago ---
  const { error: errorPago } = await admin.from("pagos").insert({
    pedido_id: pedido.id,
    proveedor: "simulado",
    estado: "capturado",
    monto: pedido.precio_total,
  });
  // --- fin simulacion ---

  if (errorPago) {
    return NextResponse.json({ error: errorPago.message }, { status: 500 });
  }

  const { error: errorUpdate } = await admin
    .from("pedidos")
    .update({ estado: "confirmado", actualizado_en: new Date().toISOString() })
    .eq("id", pedido.id);

  if (errorUpdate) {
    return NextResponse.json({ error: errorUpdate.message }, { status: 500 });
  }

  await admin.from("pedido_eventos").insert({
    pedido_id: pedido.id,
    estado_anterior: "pendiente_pago",
    estado_nuevo: "confirmado",
    actor: "sistema",
  });

  return NextResponse.json({ ok: true });
}
