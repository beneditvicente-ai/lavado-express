import { Star } from "lucide-react";
import { EstrellasRating } from "@/components/EstrellasRating";

type Resena = { id: string; puntaje: number; comentario: string | null; creado_en: string };

export function ResenasSection({
  ratingPromedio,
  cantidadCalificaciones,
  resenas,
}: {
  ratingPromedio: number;
  cantidadCalificaciones: number;
  resenas: Resena[];
}) {
  return (
    <div className="border rounded-md p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Tus reseñas</h2>
        <p className="text-sm flex items-center gap-1">
          <Star size={14} className="text-amber-500" fill="currentColor" strokeWidth={0} />
          {ratingPromedio.toFixed(1)} ({cantidadCalificaciones})
        </p>
      </div>

      {resenas.length === 0 ? (
        <p className="text-sm text-neutral-500">Todavía no tenés reseñas.</p>
      ) : (
        <div className="space-y-2">
          {resenas.map((r) => (
            <div key={r.id} className="border-t pt-2">
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
  );
}
