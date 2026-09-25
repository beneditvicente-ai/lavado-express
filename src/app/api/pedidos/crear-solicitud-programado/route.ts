import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notificarLavadores } from "@/lib/push";

// Nace SIN lavador (estado 'buscando'). A diferencia de express, para
// programado el cliente ELIGE a que lavadores invitar (de la lista de
// disponibles en ese horario que ya vio en el paso anterior) -- se
// guarda en pedido_invitaciones, que es lo que usa la RLS para decidir
// quien puede ver esta solicitud. El primero de los invitados que
// acepta (ver /api/pedidos/[id]/aceptar-lavador) se lo queda. Recien ahi
// se sabe el precio y se dispara el pago -- nunca se cobra antes de que
// alguien confirme.
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
    fecha_hora_turno,
    lavador_ids,
  } = await req.json();

  if (!tipo_vehiculo || !tipo_servicio_id || !direccion_texto || !zona_id || !fecha_hora_turno) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  if (!Array.isArray(lavador_ids) || lavador_ids.length === 0) {
    return NextResponse.json({ error: "Elegí al menos un lavador para invitar" }, { status: 400 });
  }

  if (new Date(fecha_hora_turno).getTime() <= Date.now()) {
    return NextResponse.json({ error: "Elegí una fecha y hora futura" }, { status: 400 });
  }

  const admin = createAdminClient();

  // geocodificamos la direccion escrita para que el lavador tambien
  // pueda ver a cuantos km esta (si falla, seguimos con 0,0 -- no
  // bloqueamos la reserva por eso)
  let lat = 0;
  let lng = 0;
  try {
    const resGeo = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(direccion_texto)}&limit=1`,
      { headers: { "User-Agent": "LavadoExpressMVP/1.0 (contacto@lavado-express.vercel.app)" } }
    );
    const dataGeo = await resGeo.json();
    if (dataGeo?.[0]) {
      lat = Number(dataGeo[0].lat);
      lng = Number(dataGeo[0].lon);
    }
  } catch {
    // seguimos con 0,0
  }

  const { data: pedido, error } = await admin
    .from("pedidos")
    .insert({
      cliente_id: user.id,
      lavador_id: null,
      tipo: "programado",
      estado: "buscando",
      direccion_texto,
      lat,
      lng,
      zona_id,
      tipo_vehiculo,
      detalles_vehiculo: detalles_vehiculo || null,
      tipo_servicio_id,
      fecha_hora_turno,
    })
    .select("id")
    .single();

  if (error || !pedido) {
    return NextResponse.json({ error: error?.message ?? "No se pudo crear el pedido" }, { status: 500 });
  }

  await admin.from("pedido_invitaciones").insert(
    (lavador_ids as string[]).map((lavador_id) => ({ pedido_id: pedido.id, lavador_id }))
  );

  await admin.from("pedido_eventos").insert({
    pedido_id: pedido.id,
    estado_anterior: null,
    estado_nuevo: "buscando",
    actor: "sistema",
  });

  try {
    const { data: zona } = await admin.from("zonas_disponibles").select("nombre").eq("id", zona_id).single();
    await notificarLavadores(lavador_ids as string[], {
      titulo: "Te invitaron a un turno",
      cuerpo: `Un cliente te invitó a un lavado programado${zona?.nombre ? ` en ${zona.nombre}` : ""}.`,
      url: "/lavador/pedidos",
    });
  } catch (e) {
    console.error("[push] error notificando invitación programada:", e);
  }

  return NextResponse.json({ pedidoId: pedido.id });
}
