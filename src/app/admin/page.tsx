import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { LogoutButton } from "@/components/LogoutButton";
import { SolicitudesAdminList } from "@/components/SolicitudesAdminList";

export default async function AdminPage() {
  const usuario = await requireRol("admin");
  const supabase = await createClient();

  const { data: solicitudes } = await supabase
    .from("solicitudes_lavador")
    .select("id, bio, zona, creado_en, usuario_id, usuario:usuario_id(nombre, apellido, telefono)")
    .eq("estado", "pendiente")
    .order("creado_en", { ascending: true });

  const admin = createAdminClient();
  const usuarioIds = (solicitudes ?? []).map((s) => s.usuario_id);

  const [
    emails,
    { data: fotos },
    { data: companeros },
    { data: precios },
    { data: zonasElegidas },
    { data: tiposServicio },
    { data: zonasDisponibles },
  ] = await Promise.all([
    Promise.all(
      usuarioIds.map(async (id) => {
        const { data } = await admin.auth.admin.getUserById(id);
        return [id, data.user?.email ?? null] as const;
      })
    ),
    usuarioIds.length
      ? admin.from("lavador_fotos").select("lavador_id, tipo, storage_path").in("lavador_id", usuarioIds)
      : { data: [] },
    usuarioIds.length
      ? admin.from("lavador_companeros").select("lavador_id, nombre").in("lavador_id", usuarioIds)
      : { data: [] },
    usuarioIds.length
      ? admin
          .from("lavador_servicios")
          .select("lavador_id, tipo_servicio_id, precio")
          .in("lavador_id", usuarioIds)
      : { data: [] },
    usuarioIds.length
      ? admin.from("lavador_zonas").select("lavador_id, zona_id").in("lavador_id", usuarioIds)
      : { data: [] },
    admin.from("tipos_servicio").select("id, nombre"),
    admin.from("zonas_disponibles").select("id, nombre"),
  ]);

  const emailPorId = new Map(emails);
  const nombreServicioPorId = new Map((tiposServicio ?? []).map((t) => [t.id, t.nombre]));
  const nombreZonaPorId = new Map((zonasDisponibles ?? []).map((z) => [z.id, z.nombre]));

  const solicitudesCompletas = (solicitudes ?? []).map((s) => ({
    ...s,
    email: emailPorId.get(s.usuario_id) ?? null,
    fotos: (fotos ?? [])
      .filter((f) => f.lavador_id === s.usuario_id)
      .map((f) => ({
        tipo: f.tipo,
        url: admin.storage.from("lavador-fotos").getPublicUrl(f.storage_path).data.publicUrl,
      })),
    companeros: (companeros ?? []).filter((c) => c.lavador_id === s.usuario_id).map((c) => c.nombre),
    precios: (precios ?? [])
      .filter((p) => p.lavador_id === s.usuario_id)
      .map((p) => ({
        servicio: nombreServicioPorId.get(p.tipo_servicio_id) ?? "?",
        precio: p.precio,
      })),
    zonas: (zonasElegidas ?? [])
      .filter((z) => z.lavador_id === s.usuario_id)
      .map((z) => nombreZonaPorId.get(z.zona_id) ?? "?"),
  }));

  return (
    <main className="flex-1 max-w-2xl mx-auto w-full p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Panel admin</h1>
        <LogoutButton />
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Postulaciones de lavadores</h2>
        <SolicitudesAdminList solicitudes={solicitudesCompletas as never} />
      </section>
    </main>
  );
}
