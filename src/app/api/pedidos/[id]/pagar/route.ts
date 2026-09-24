import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPreferenceClient } from "@/lib/mercadopago";

// Crea una preferencia de pago en Mercado Pago (Checkout Pro) y devuelve el
// link para redirigir al cliente. El pedido recien pasa a "confirmado" cuando
// llega la notificacion del webhook (/api/webhooks/mercadopago) con el pago
// aprobado -- nunca en esta respuesta, porque el cliente todavia no pago.
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
    .select("id, cliente_id, estado, precio_total, tipo")
    .eq("id", pedidoId)
    .single();

  if (!pedido || pedido.cliente_id !== user.id) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }

  if (pedido.estado !== "pendiente_pago") {
    return NextResponse.json({ error: "Este pedido no esta esperando pago" }, { status: 409 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;

  const preferencia = await getPreferenceClient().create({
    body: {
      items: [
        {
          id: pedido.id,
          title: `Lavado de auto (${pedido.tipo})`,
          quantity: 1,
          unit_price: pedido.precio_total,
          currency_id: "ARS",
        },
      ],
      external_reference: pedido.id,
      notification_url: `${baseUrl}/api/webhooks/mercadopago`,
      back_urls: {
        success: `${baseUrl}/cliente/pedidos`,
        pending: `${baseUrl}/cliente/pedidos`,
        failure: `${baseUrl}/cliente/pedidos`,
      },
      auto_return: "approved",
    },
  });

  return NextResponse.json({ url: preferencia.init_point });
}
