import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/LogoutButton";
import { TabsPedidos, type PedidoResumen } from "@/components/TabsPedidos";

export default async function PedidosClientePage() {
  const usuario = await requireRol("cliente");
  const supabase = await createClient();

  const { data: pedidos } = await supabase
    .from("pedidos")
    .select(
      "id, tipo, estado, precio_total, fecha_hora_turno, creado_en, lavador_id, direccion_texto, detalles_vehiculo, lat, lng, fecha_limite_express"
    )
    .eq("cliente_id", usuario.id)
    .eq("oculto_cliente", false)
    .order("creado_en", { ascending: false });

  const lavadorIds = [...new Set((pedidos ?? []).map((p) => p.lavador_id).filter(Boolean))];
  const pedidoIds = (pedidos ?? []).map((p) => p.id);

  const [{ data: lavadores }, { data: fotos }] = await Promise.all([
    lavadorIds.length
      ? supabase.from("lavadores_publicos").select("id, nombre").in("id", lavadorIds)
      : Promise.resolve({ data: [] as { id: string; nombre: string }[] }),
    pedidoIds.length
      ? supabase.from("pedido_fotos").select("pedido_id, storage_path").in("pedido_id", pedidoIds)
      : Promise.resolve({ data: [] as { pedido_id: string; storage_path: string }[] }),
  ]);

  const nombrePorId = new Map((lavadores ?? []).map((l) => [l.id, l.nombre]));
  const fotosPorPedido = new Map<string, string[]>();
  for (const f of fotos ?? []) {
    const url = supabase.storage.from("lavador-fotos").getPublicUrl(f.storage_path).data.publicUrl;
    fotosPorPedido.set(f.pedido_id, [...(fotosPorPedido.get(f.pedido_id) ?? []), url]);
  }

  const lista: PedidoResumen[] = (pedidos ?? []).map((p) => ({
    id: p.id,
    tipo: p.tipo,
    estado: p.estado,
    precio_total: p.precio_total ?? 0,
    fecha_hora_turno: p.fecha_hora_turno,
    creado_en: p.creado_en,
    contraparteNombre: (p.lavador_id && nombrePorId.get(p.lavador_id)) || "—",
    direccionTexto: p.direccion_texto,
    detallesVehiculo: p.detalles_vehiculo,
    lat: p.lat,
    lng: p.lng,
    fechaLimiteExpress: p.fecha_limite_express,
    fotosResultado: fotosPorPedido.get(p.id) ?? [],
  }));

  return (
    <main className="flex-1 max-w-2xl mx-auto w-full p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Mis pedidos</h1>
        <LogoutButton />
      </div>

      <TabsPedidos pedidos={lista} etiquetaContraparte="Lavador" rol="cliente" />
    </main>
  );
}
