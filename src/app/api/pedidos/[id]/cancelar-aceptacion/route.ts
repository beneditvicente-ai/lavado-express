import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// El lavador se arrepiente de haber aceptado, pero el cliente TODAVIA NO
// PAGO (estado 'pendiente_pago') -- no hay nada que reembolsar ni ninguna
// promesa incumplida, asi que se cancela sin penalidad de rating: el
// pedido vuelve a 'buscando' para que otro lavador (u otro invitado, en
// programado) lo pueda tomar.
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
    .select("id, lavador_id, estado")
    .eq("id", pedidoId)
    .single();

  if (!pedido || pedido.lavador_id !== user.id || pedido.estado !== "pendiente_pago") {
    return NextResponse.json({ error: "No se puede cancelar este pedido" }, { status: 409 });
  }

  const { error } = await admin
    .from("pedidos")
    .update({
      lavador_id: null,
      estado: "buscando",
      precio_base: null,
      precio_total: null,
      comision_pct: 0,
      monto_comision: 0,
      monto_lavador: 0,
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
    actor: "lavador",
  });

  return NextResponse.json({ ok: true });
}
