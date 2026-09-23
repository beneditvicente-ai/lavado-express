import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/LogoutButton";
import { SolicitudInicialForm } from "@/components/SolicitudInicialForm";
import { PreciosForm } from "@/components/PreciosForm";
import { ZonasForm } from "@/components/ZonasForm";
import { DisponibleAhoraToggle } from "@/components/DisponibleAhoraToggle";
import { DisponibilidadForm } from "@/components/DisponibilidadForm";
import { CompanerosForm } from "@/components/CompanerosForm";
import { FotosForm } from "@/components/FotosForm";

export default async function PostularmePage() {
  const usuario = await requireRol("cliente");
  const supabase = await createClient();

  const { data: solicitudPendiente } = await supabase
    .from("solicitudes_lavador")
    .select("id, creado_en")
    .eq("usuario_id", usuario.id)
    .eq("estado", "pendiente")
    .maybeSingle();

  if (!solicitudPendiente) {
    return (
      <main className="flex-1 max-w-2xl mx-auto w-full p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Postularme como lavador</h1>
          <LogoutButton />
        </div>
        <SolicitudInicialForm />
      </main>
    );
  }

  const [
    { data: tiposServicio },
    { data: preciosActuales },
    { data: zonasDisponibles },
    { data: zonasActuales },
    { data: estadoExpress },
    { data: disponibilidadActual },
    { data: companerosActuales },
    { data: fotosActuales },
  ] = await Promise.all([
    supabase.from("tipos_servicio").select("id, nombre, descripcion").order("orden"),
    supabase
      .from("lavador_servicios")
      .select("tipo_servicio_id, precio")
      .eq("lavador_id", usuario.id),
    supabase.from("zonas_disponibles").select("id, nombre").order("orden"),
    supabase.from("lavador_zonas").select("zona_id").eq("lavador_id", usuario.id),
    supabase
      .from("lavador_estado_express")
      .select("disponible_ahora")
      .eq("lavador_id", usuario.id)
      .maybeSingle(),
    supabase
      .from("lavador_disponibilidad")
      .select("dia_semana, hora_inicio, hora_fin")
      .eq("lavador_id", usuario.id),
    supabase.from("lavador_companeros").select("id, nombre").eq("lavador_id", usuario.id),
    supabase.from("lavador_fotos").select("id, tipo, storage_path").eq("lavador_id", usuario.id),
  ]);

  return (
    <main className="flex-1 max-w-2xl mx-auto w-full p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Postularme como lavador</h1>
        <LogoutButton />
      </div>

      <div className="border rounded-md p-4 bg-neutral-50">
        <p className="font-medium">Postulación enviada</p>
        <p className="text-sm text-neutral-600">
          Te vamos a contactar por mail o teléfono en breve para avisarte si quedaste
          aprobado. Mientras tanto, completá lo de abajo — así ya queda todo listo para
          cuando te aprobemos.
        </p>
      </div>

      <DisponibleAhoraToggle
        lavadorId={usuario.id}
        disponibleInicial={estadoExpress?.disponible_ahora ?? false}
      />

      <FotosForm lavadorId={usuario.id} fotosActuales={fotosActuales ?? []} />

      <CompanerosForm lavadorId={usuario.id} companerosActuales={companerosActuales ?? []} />

      <PreciosForm
        lavadorId={usuario.id}
        tiposServicio={tiposServicio ?? []}
        preciosActuales={preciosActuales ?? []}
      />

      <ZonasForm
        lavadorId={usuario.id}
        zonasDisponibles={zonasDisponibles ?? []}
        zonaIdsActuales={(zonasActuales ?? []).map((z) => z.zona_id)}
      />

      <DisponibilidadForm
        lavadorId={usuario.id}
        disponibilidadActual={disponibilidadActual ?? []}
      />
    </main>
  );
}
