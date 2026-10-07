import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// El lavador rechaza explicitamente una invitacion a un turno programado
// (en vez de dejarla pasar sin responder). El pedido sigue abierto para
// el resto de los invitados -- esto NO lo cancela ni lo toca. Aplica una
// penalizacion de rating leve (4 estrellas), porque el lavador habia
// declarado ese horario como libre: es un cambio de planes, no un
// incumplimiento como cancelar un trabajo ya tomado.
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

  const { data: invitacion } = await admin
    .from("pedido_invitaciones")
    .select("pedido_id, lavador_id, rechazada_en")
    .eq("pedido_id", pedidoId)
    .eq("lavador_id", user.id)
    .maybeSingle();

  if (!invitacion || invitacion.rechazada_en) {
    return NextResponse.json({ error: "No se puede rechazar esta invitación" }, { status: 409 });
  }

  const { data: pedido } = await admin
    .from("pedidos")
    .select("id, cliente_id, estado, lavador_id")
    .eq("id", pedidoId)
    .single();

  if (!pedido || pedido.estado !== "buscando" || pedido.lavador_id !== null) {
    return NextResponse.json({ error: "Esta solicitud ya no está disponible" }, { status: 409 });
  }

  const { error: errorInvitacion } = await admin
    .from("pedido_invitaciones")
    .update({ rechazada_en: new Date().toISOString() })
    .eq("pedido_id", pedidoId)
    .eq("lavador_id", user.id);

  if (errorInvitacion) {
    return NextResponse.json({ error: errorInvitacion.message }, { status: 500 });
  }

  await admin.from("calificaciones").insert({
    pedido_id: null,
    cliente_id: pedido.cliente_id,
    lavador_id: user.id,
    puntaje: 4,
    comentario: "Rechazo de una invitación a turno programado (horario que el lavador había declarado libre).",
    es_penalizacion: true,
  });

  return NextResponse.json({ ok: true });
}
