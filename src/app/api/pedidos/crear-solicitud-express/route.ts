import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { lavadorIdsPorZona, notificarLavadores } from "@/lib/push";

// Crea el pedido express SIN lavador asignado (estado 'buscando'). El
// precio todavia no existe: depende de que lavador lo acepte. Nunca se
// cobra en esta instancia.
//
// El plazo (fecha_limite_express) lo declara el CLIENTE aca, al pedirlo
// -- es "hasta cuando puedo dejar el auto", no un compromiso del lavador.
// Se calcula ya mismo y se muestra a todos los lavadores que ven el
// pedido en su panel Express, antes de que decidan aceptar o no.
const HORAS_MINIMAS = 2;
const HORAS_MAXIMAS = 8;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const {
    tipo_vehiculo,
    tipo_servicio_id,
    detalles_vehiculo,
    direccion_texto,
    zona_id,
    lat,
    lng,
    horas_disponibles,
  } = await req.json();

  if (!tipo_vehiculo || !tipo_servicio_id || !direccion_texto || !zona_id || lat == null || lng == null) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  const horas = Math.min(Math.max(Number(horas_disponibles) || HORAS_MINIMAS, HORAS_MINIMAS), HORAS_MAXIMAS);
  const fechaLimite = new Date(Date.now() + horas * 60 * 60 * 1000).toISOString();

  const admin = createAdminClient();

  const { data: pedido, error } = await admin
    .from("pedidos")
    .insert({
      cliente_id: user.id,
      lavador_id: null,
      tipo: "express",
      estado: "buscando",
      direccion_texto,
      lat,
      lng,
      zona_id,
      tipo_vehiculo,
      detalles_vehiculo: detalles_vehiculo || null,
      tipo_servicio_id,
      fecha_limite_express: fechaLimite,
    })
    .select("id")
    .single();

  if (error || !pedido) {
    return NextResponse.json({ error: error?.message ?? "No se pudo crear el pedido" }, { status: 500 });
  }

  await admin.from("pedido_eventos").insert({
    pedido_id: pedido.id,
    estado_anterior: null,
    estado_nuevo: "buscando",
    actor: "sistema",
  });

  try {
    const lavadorIds = await lavadorIdsPorZona(zona_id);
    const { data: zona } = await admin.from("zonas_disponibles").select("nombre").eq("id", zona_id).single();
    await notificarLavadores(lavadorIds, {
      titulo: "Nuevo pedido en tu zona",
      cuerpo: `Alguien pidió un lavado express${zona?.nombre ? ` en ${zona.nombre}` : ""}. Mirá el panel Express.`,
      url: "/lavador/express",
    });
  } catch (e) {
    console.error("[push] error notificando pedido express:", e);
  }

  return NextResponse.json({ pedidoId: pedido.id });
}
