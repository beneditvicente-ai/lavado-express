import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// El cliente cancela una busqueda express que todavia no encontro
// lavador (o que ya acepto uno, pero se arrepiente). Nunca hubo cobro
// en este estado, asi que no aplica ninguna penalidad.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
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
    .select("id, cliente_id, estado")
    .eq("id", pedidoId)
    .single();

  if (!pedido || pedido.cliente_id !== user.id || !["buscando", "pendiente_pago"].includes(pedido.estado)) {
    return NextResponse.json({ error: "No se puede cancelar este pedido" }, { status: 409 });
  }

  const { error } = await admin
    .from("pedidos")
    .update({
      estado: "cancelado_sin_cargo",
      cancelado_en: new Date().toISOString(),
      cancelado_por: "cliente",
      actualizado_en: new Date().toISOString(),
    })
    .eq("id", pedidoId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await admin.from("pedido_eventos").insert({
    pedido_id: pedidoId,
    estado_anterior: pedido.estado,
    estado_nuevo: "cancelado_sin_cargo",
    actor: "cliente",
  });

  return NextResponse.json({ ok: true });
}
