import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPaymentClient } from "@/lib/mercadopago";

// Mercado Pago notifica pagos acá (configurado como notification_url al
// crear la preferencia). Solo cuando el pago está "approved" confirmamos el
// turno -- el resto de la app ya asume que "confirmado" = pago acreditado.
// Idempotente: si el pago ya fue procesado (mismo external_id en `pagos`),
// no vuelve a actualizar nada, porque MP puede reenviar la misma notificación.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const paymentId: string | undefined = body?.data?.id ?? new URL(req.url).searchParams.get("id") ?? undefined;

  if (!paymentId) {
    return NextResponse.json({ ok: true });
  }

  const pago = await getPaymentClient().get({ id: paymentId }).catch(() => null);
  if (!pago) {
    return NextResponse.json({ ok: true });
  }

  const pedidoId = pago.external_reference;
  if (!pedidoId) {
    return NextResponse.json({ ok: true });
  }

  const admin = createAdminClient();

  const { data: yaProcesado } = await admin
    .from("pagos")
    .select("id")
    .eq("external_id", String(pago.id))
    .maybeSingle();
  if (yaProcesado) {
    return NextResponse.json({ ok: true });
  }

  const { data: pedido } = await admin
    .from("pedidos")
    .select("id, estado, precio_total")
    .eq("id", pedidoId)
    .single();
  if (!pedido) {
    return NextResponse.json({ ok: true });
  }

  const estadoPago = pago.status === "approved" ? "capturado" : pago.status === "rejected" ? "fallido" : "pendiente";

  await admin.from("pagos").insert({
    pedido_id: pedido.id,
    proveedor: "mercadopago",
    estado: estadoPago,
    monto: pago.transaction_amount ?? pedido.precio_total,
    external_id: String(pago.id),
    payload: pago,
  });

  if (estadoPago === "capturado" && pedido.estado === "pendiente_pago") {
    await admin
      .from("pedidos")
      .update({ estado: "confirmado", actualizado_en: new Date().toISOString() })
      .eq("id", pedido.id);

    await admin.from("pedido_eventos").insert({
      pedido_id: pedido.id,
      estado_anterior: "pendiente_pago",
      estado_nuevo: "confirmado",
      actor: "sistema",
    });
  }

  return NextResponse.json({ ok: true });
}
