import { createClient } from "@/lib/supabase/server";
import { Star } from "lucide-react";
import { EstrellasRating } from "@/components/EstrellasRating";

export default async function PerfilPublicoLavadorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: lavador }, { data: fotos }, { data: companeros }, { data: resenas }] = await Promise.all([
    supabase
      .from("lavadores_publicos")
      .select("nombre, bio, rating_promedio, cantidad_calificaciones, pedidos_completados_count")
      .eq("id", id)
      .single(),
    supabase.from("lavador_fotos").select("tipo, storage_path").eq("lavador_id", id),
    supabase.from("lavador_companeros").select("nombre").eq("lavador_id", id),
    supabase
      .from("calificaciones")
      .select("puntaje, comentario, creado_en")
      .eq("lavador_id", id)
      .eq("es_penalizacion", false)
      .order("creado_en", { ascending: false }),
  ]);

  if (!lavador) {
    return (
      <main className="flex-1 max-w-2xl mx-auto w-full p-6">
        <p className="text-neutral-500">No encontramos este perfil.</p>
      </main>
    );
  }

  function urlFoto(path: string) {
    return supabase.storage.from("lavador-fotos").getPublicUrl(path).data.publicUrl;
  }

  const fotoPerfil = fotos?.find((f) => f.tipo === "perfil");
  const fotosEquipo = fotos?.filter((f) => f.tipo === "equipo") ?? [];
  const fotosTrabajo = fotos?.filter((f) => f.tipo === "trabajo") ?? [];

  return (
    <main className="flex-1 max-w-2xl mx-auto w-full p-6 space-y-6">
      <div className="flex items-center gap-4">
        {fotoPerfil ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={urlFoto(fotoPerfil.storage_path)}
            alt={lavador.nombre}
            className="w-20 h-20 rounded-full object-cover"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-neutral-200" />
        )}
        <div>
          <h1 className="text-2xl font-semibold">{lavador.nombre}</h1>
          <p className="text-sm text-neutral-500 flex items-center gap-1">
            <Star size={14} className="text-amber-500" fill="currentColor" strokeWidth={0} />
            {lavador.rating_promedio.toFixed(1)} ({lavador.cantidad_calificaciones} reseñas) ·{" "}
            {lavador.pedidos_completados_count} lavados hechos
          </p>
        </div>
      </div>

      {lavador.bio && <p className="text-neutral-600">{lavador.bio}</p>}

      {companeros && companeros.length > 0 && (
        <div>
          <h2 className="font-medium mb-1">Su equipo</h2>
          <p className="text-sm text-neutral-600">{companeros.map((c) => c.nombre).join(", ")}</p>
        </div>
      )}

      {fotosEquipo.length > 0 && (
        <div>
          <h2 className="font-medium mb-2">Fotos del equipo</h2>
          <div className="flex flex-wrap gap-2">
            {fotosEquipo.map((f, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={urlFoto(f.storage_path)}
                alt="Equipo"
                className="w-20 h-20 object-cover rounded-md border"
              />
            ))}
          </div>
        </div>
      )}

      {fotosTrabajo.length > 0 && (
        <div>
          <h2 className="font-medium mb-2">Trabajos realizados</h2>
          <div className="flex flex-wrap gap-2">
            {fotosTrabajo.map((f, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={urlFoto(f.storage_path)}
                alt="Trabajo realizado"
                className="w-20 h-20 object-cover rounded-md border"
              />
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="font-medium mb-2">Reseñas</h2>
        {!resenas || resenas.length === 0 ? (
          <p className="text-sm text-neutral-500">Todavía no tiene reseñas.</p>
        ) : (
          <div className="space-y-2">
            {resenas.map((r, i) => (
              <div key={i} className="border-t pt-2">
                <EstrellasRating puntaje={r.puntaje} />
                {r.comentario && <p className="text-sm text-neutral-600 mt-1">{r.comentario}</p>}
                <p className="text-xs text-neutral-400">
                  {new Date(r.creado_en).toLocaleDateString("es-AR")}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
