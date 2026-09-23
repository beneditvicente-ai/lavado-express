import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// El cliente rechaza al lavador que acepto su pedido express y vuelve a
// quedar "buscando" para que otro lavador lo pueda tomar.
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

  if (!pedido || pedido.cliente_id !== user.id || pedido.estado !== "pendiente_pago") {
    return NextResponse.json({ error: "No se puede liberar este pedido" }, { status: 409 });
  }

  const { error } = await admin
    .from("pedidos")
    .update({
      lavador_id: null,
      estado: "buscando",
      precio_base: null,
      precio_total: null,
      fecha_limite_express: null,
      actualizado_en: new Date().toISOString(),
    })
    .eq("id", pedidoId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await admin.from("pedido_eventos").insert({
    pedido_id: pedidoId,
    estado_anterior: "pendiente_pago",
    estado_nuevo: "buscando",
    actor: "cliente",
  });

  return NextResponse.json({ ok: true });
}
