"use client";

import { useState } from "react";
import { PostularseForm } from "@/components/PostularseForm";

export function PostularseSection({ usuarioId }: { usuarioId: string }) {
  const [abierto, setAbierto] = useState(false);

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="w-full border-2 border-dashed rounded-md px-4 py-4 text-center hover:bg-neutral-50"
      >
        <p className="font-medium">¿Querés lavar?</p>
        <p className="text-sm text-neutral-500">Sumate como lavador y empezá a generar ingresos.</p>
      </button>
    );
  }

  return <PostularseForm usuarioId={usuarioId} />;
}
