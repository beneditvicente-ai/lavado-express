import { requireRol } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/LogoutButton";
import { LavadorNav } from "@/components/LavadorNav";
import { DisponibleAhoraToggle } from "@/components/DisponibleAhoraToggle";
import { PushNotificationsToggle } from "@/components/PushNotificationsToggle";
import { ResenasSection } from "@/components/ResenasSection";
import { CentroAyuda } from "@/components/CentroAyuda";
import { MenuItemLink } from "@/components/MenuItemLink";
import { Star, User } from "lucide-react";

export default async function LavadorPage() {
  const usuario = await requireRol("lavador");
  const supabase = await createClient();

  const [
    { data: lavador },
    { data: resenas },
    { data: estadoExpress },
    { count: cantidadFotos },
    { count: cantidadCompaneros },
    { count: cantidadPrecios },
    { count: cantidadZonas },
    { count: cantidadDisponibilidad },
    { data: fotoPerfil },
  ] = await Promise.all([
    supabase
      .from("lavadores")
      .select("rating_promedio, cantidad_calificaciones, pedidos_completados_count")
      .eq("id", usuario.id)
      .single(),
    supabase
      .from("calificaciones")
      .select("id, puntaje, comentario, creado_en")
      .eq("lavador_id", usuario.id)
      .eq("es_penalizacion", false)
      .order("creado_en", { ascending: false }),
    supabase
      .from("lavador_estado_express")
      .select("disponible_ahora")
      .eq("lavador_id", usuario.id)
      .maybeSingle(),
    supabase.from("lavador_fotos").select("id", { count: "exact", head: true }).eq("lavador_id", usuario.id),
    supabase
      .from("lavador_companeros")
      .select("id", { count: "exact", head: true })
      .eq("lavador_id", usuario.id),
    supabase
      .from("lavador_servicios")
      .select("id", { count: "exact", head: true })
      .eq("lavador_id", usuario.id),
    supabase.from("lavador_zonas").select("id", { count: "exact", head: true }).eq("lavador_id", usuario.id),
    supabase
      .from("lavador_disponibilidad")
      .select("id", { count: "exact", head: true })
      .eq("lavador_id", usuario.id),
    supabase
      .from("lavador_fotos")
      .select("storage_path")
      .eq("lavador_id", usuario.id)
      .eq("tipo", "perfil")
      .limit(1)
      .maybeSingle(),
  ]);

  const urlFotoPerfil = fotoPerfil
    ? supabase.storage.from("lavador-fotos").getPublicUrl(fotoPerfil.storage_path).data.publicUrl
    : null;

  return (
    <main className="flex-1 max-w-2xl mx-auto w-full p-6 space-y-4">
      <div className="bg-neutral-900 text-white rounded-2xl p-6 -mt-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{usuario.nombre}</h1>
            <p className="text-sm text-amber-400 mt-1 flex items-center gap-1">
              <Star size={14} fill="currentColor" strokeWidth={0} />
              {(lavador?.rating_promedio ?? 0).toFixed(2)} · {lavador?.pedidos_completados_count ?? 0} lavados
            </p>
            <div className="mt-2">
              <LogoutButton className="text-sm text-neutral-400 hover:text-white underline" />
            </div>
          </div>
          {urlFotoPerfil ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={urlFotoPerfil}
              alt={usuario.nombre}
              className="w-16 h-16 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-neutral-700 flex items-center justify-center flex-shrink-0">
              <User size={28} strokeWidth={1.5} />
            </div>
          )}
        </div>
      </div>

      <LavadorNav activo="/lavador" />

      <DisponibleAhoraToggle
        lavadorId={usuario.id}
        disponibleInicial={estadoExpress?.disponible_ahora ?? false}
      />

      <PushNotificationsToggle />

      <ResenasSection
        ratingPromedio={lavador?.rating_promedio ?? 0}
        cantidadCalificaciones={lavador?.cantidad_calificaciones ?? 0}
        resenas={resenas ?? []}
      />

      <div className="space-y-2">
        <MenuItemLink
          href="/lavador/fotos"
          label="Fotos"
          resumen={`${cantidadFotos ?? 0} foto${cantidadFotos === 1 ? "" : "s"}`}
        />
        <MenuItemLink
          href="/lavador/companeros"
          label="Tu equipo"
          resumen={`${cantidadCompaneros ?? 0} compañero${cantidadCompaneros === 1 ? "" : "s"}`}
        />
        <MenuItemLink
          href="/lavador/precios"
          label="Precios"
          resumen={`${cantidadPrecios ?? 0} de 3 servicios cargados`}
        />
        <MenuItemLink
          href="/lavador/zonas"
          label="Zonas de cobertura"
          resumen={`${cantidadZonas ?? 0} zona${cantidadZonas === 1 ? "" : "s"}`}
        />
        <MenuItemLink
          href="/lavador/disponibilidad"
          label="Disponibilidad semanal"
          resumen={`${cantidadDisponibilidad ?? 0} día${cantidadDisponibilidad === 1 ? "" : "s"} configurados`}
        />
      </div>

      <CentroAyuda />
    </main>
  );
}
