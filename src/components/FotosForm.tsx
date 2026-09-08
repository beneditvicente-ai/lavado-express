"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type TipoFoto = "perfil" | "equipo" | "trabajo";
type Foto = { id: string; tipo: TipoFoto; storage_path: string };

const CATEGORIAS: { tipo: TipoFoto; etiqueta: string; ayuda: string }[] = [
  { tipo: "perfil", etiqueta: "Tu foto", ayuda: "Una foto tuya, de frente." },
  { tipo: "equipo", etiqueta: "Tu equipo", ayuda: "Fotos de vos con tus compañeros." },
  { tipo: "trabajo", etiqueta: "Trabajos realizados", ayuda: "Fotos de autos que lavaste." },
];

export function FotosForm({ lavadorId, fotosActuales }: { lavadorId: string; fotosActuales: Foto[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState<TipoFoto | null>(null);
  const inputRefs = useRef<Record<TipoFoto, HTMLInputElement | null>>({
    perfil: null,
    equipo: null,
    trabajo: null,
  });

  function urlPublica(path: string) {
    const supabase = createClient();
    return supabase.storage.from("lavador-fotos").getPublicUrl(path).data.publicUrl;
  }

  async function subir(tipo: TipoFoto, file: File) {
    setError(null);
    setSubiendo(tipo);

    const supabase = createClient();
    const path = `${lavadorId}/${tipo}-${Date.now()}-${file.name}`;

    const { error: errorSubida } = await supabase.storage
      .from("lavador-fotos")
      .upload(path, file);

    if (errorSubida) {
      setSubiendo(null);
      setError(errorSubida.message);
      return;
    }

    const { error: errorInsert } = await supabase
      .from("lavador_fotos")
      .insert({ lavador_id: lavadorId, tipo, storage_path: path });

    setSubiendo(null);

    if (errorInsert) {
      setError(errorInsert.message);
      return;
    }

    router.refresh();
  }

  async function borrar(foto: Foto) {
    setError(null);
    const supabase = createClient();

    await supabase.storage.from("lavador-fotos").remove([foto.storage_path]);
    const { error } = await supabase.from("lavador_fotos").delete().eq("id", foto.id);

    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="border rounded-md p-4 space-y-5">
      <h2 className="font-medium">Fotos de tu perfil</h2>

      {CATEGORIAS.map((cat) => {
        const fotos = fotosActuales.filter((f) => f.tipo === cat.tipo);
        return (
          <div key={cat.tipo} className="space-y-2">
            <p className="text-sm font-medium">{cat.etiqueta}</p>
            <p className="text-xs text-neutral-500">{cat.ayuda}</p>

            <div className="flex flex-wrap gap-2">
              {fotos.map((f) => (
                // eslint-disable-next-line @next/next/no-img-element
                <div key={f.id} className="relative">
                  <img
                    src={urlPublica(f.storage_path)}
                    alt={cat.etiqueta}
                    className="w-20 h-20 object-cover rounded-md border"
                  />
                  <button
                    onClick={() => borrar(f)}
                    className="absolute -top-2 -right-2 bg-white border rounded-full w-5 h-5 text-xs leading-none"
                    aria-label="Quitar foto"
                  >
                    ×
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() => inputRefs.current[cat.tipo]?.click()}
                disabled={subiendo === cat.tipo}
                className="w-20 h-20 border-2 border-dashed rounded-md text-xs text-neutral-500 disabled:opacity-50"
              >
                {subiendo === cat.tipo ? "Subiendo..." : "+ Agregar"}
              </button>
              <input
                ref={(el) => {
                  inputRefs.current[cat.tipo] = el;
                }}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) subir(cat.tipo, file);
                  e.target.value = "";
                }}
              />
            </div>
          </div>
        );
      })}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
