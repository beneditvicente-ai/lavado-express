"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MessageCircle, Send, X } from "lucide-react";

type Mensaje = {
  id: string;
  remitente_id: string;
  contenido: string;
  creado_en: string;
};

// Chat in-app entre cliente y lavador de un pedido puntual. Sondea cada 4s
// en vez de usar realtime de Supabase (mismo patron que el resto de la
// app -- evita depender de que el proyecto tenga la publicacion de
// realtime habilitada para la tabla). El backend ya flaggea automaticamente
// (trigger contiene_datos_contacto) cualquier intento de compartir
// telefono/mail/redes, para moderacion -- no se bloquea el mensaje.
export function ChatPedido({
  pedidoId,
  usuarioId,
  contraparteNombre,
}: {
  pedidoId: string;
  usuarioId: string;
  contraparteNombre: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const finRef = useRef<HTMLDivElement>(null);

  async function cargar() {
    const supabase = createClient();
    const { data } = await supabase
      .from("mensajes")
      .select("id, remitente_id, contenido, creado_en")
      .eq("pedido_id", pedidoId)
      .order("creado_en", { ascending: true });
    setMensajes(data ?? []);
  }

  useEffect(() => {
    if (!abierto) return;
    cargar();
    const intervalo = setInterval(cargar, 4000);
    return () => clearInterval(intervalo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, pedidoId]);

  useEffect(() => {
    if (abierto) finRef.current?.scrollIntoView({ block: "end" });
  }, [mensajes, abierto]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    setError(null);
    setEnviando(true);
    const supabase = createClient();
    const { error: errorInsert } = await supabase
      .from("mensajes")
      .insert({ pedido_id: pedidoId, remitente_id: usuarioId, contenido: texto.trim() });
    setEnviando(false);
    if (errorInsert) {
      setError("No se pudo enviar el mensaje.");
      return;
    }
    setTexto("");
    cargar();
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="mt-1 flex items-center gap-1 text-xs underline text-neutral-600"
      >
        <MessageCircle size={12} strokeWidth={1.75} />
        Chatear con {contraparteNombre}
      </button>
    );
  }

  return (
    <div className="mt-2 border rounded-md overflow-hidden bg-white">
      <div className="flex items-center justify-between bg-neutral-50 px-2 py-1.5 border-b">
        <p className="text-xs font-medium flex items-center gap-1">
          <MessageCircle size={12} strokeWidth={1.75} />
          Chat con {contraparteNombre}
        </p>
        <button type="button" onClick={() => setAbierto(false)} className="text-neutral-400 hover:text-neutral-700">
          <X size={14} />
        </button>
      </div>

      <div className="max-h-48 overflow-y-auto p-2 space-y-1.5">
        {mensajes.length === 0 ? (
          <p className="text-xs text-neutral-400 text-center py-3">Todavía no hay mensajes.</p>
        ) : (
          mensajes.map((m) => (
            <div key={m.id} className={`flex ${m.remitente_id === usuarioId ? "justify-end" : "justify-start"}`}>
              <p
                className={`text-xs rounded-lg px-2.5 py-1.5 max-w-[80%] break-words ${
                  m.remitente_id === usuarioId ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-900"
                }`}
              >
                {m.contenido}
              </p>
            </div>
          ))
        )}
        <div ref={finRef} />
      </div>

      {error && <p className="text-xs text-red-600 px-2">{error}</p>}

      <form onSubmit={enviar} className="flex items-center gap-1.5 border-t p-1.5">
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Escribí un mensaje..."
          className="flex-1 text-xs border rounded-md px-2 py-1.5 min-w-0"
        />
        <button
          type="submit"
          disabled={enviando || !texto.trim()}
          className="bg-neutral-900 text-white rounded-md p-1.5 disabled:opacity-50 flex-shrink-0"
          aria-label="Enviar"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
