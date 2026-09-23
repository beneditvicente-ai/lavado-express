"use client";

import { useState } from "react";

type Turno = {
  id: string;
  fecha_hora_turno: string | null;
  estado: string;
  clienteNombre: string;
  direccionTexto: string;
  servicioNombre: string;
  precioTotal: number;
};
type Bloqueo = { id: string; fecha: string; hora_inicio: string; hora_fin: string; motivo: string | null };
type Disponibilidad = { dia_semana: number; hora_inicio: string; hora_fin: string };
type SolicitudPendiente = { id: string; fecha_hora_turno: string };

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
// dia_semana en la base es 0=domingo; nuestra grilla arranca en lunes
const DIA_SEMANA_POR_COLUMNA = [1, 2, 3, 4, 5, 6, 0];

function lunesDeLaSemana(fecha: Date) {
  const d = new Date(fecha);
  const dia = d.getDay();
  const diff = dia === 0 ? -6 : 1 - dia;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function aClaveFecha(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function TurnosCalendar({
  turnos,
  bloqueos,
  disponibilidad,
  solicitudesPendientes,
}: {
  turnos: Turno[];
  bloqueos: Bloqueo[];
  disponibilidad: Disponibilidad[];
  solicitudesPendientes: SolicitudPendiente[];
}) {
  const [offsetSemana, setOffsetSemana] = useState(0);
  const [turnoSeleccionado, setTurnoSeleccionado] = useState<Turno | null>(null);

  const hoy = new Date();
  const lunesBase = lunesDeLaSemana(hoy);
  const lunes = new Date(lunesBase);
  lunes.setDate(lunes.getDate() + offsetSemana * 7);

  const dias = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lunes);
    d.setDate(d.getDate() + i);
    return d;
  });

  const turnosPorDia = new Map<string, Turno[]>();
  for (const t of turnos) {
    if (!t.fecha_hora_turno) continue;
    const clave = t.fecha_hora_turno.slice(0, 10);
    if (!turnosPorDia.has(clave)) turnosPorDia.set(clave, []);
    turnosPorDia.get(clave)!.push(t);
  }

  const bloqueosPorDia = new Map<string, Bloqueo[]>();
  for (const b of bloqueos) {
    if (!bloqueosPorDia.has(b.fecha)) bloqueosPorDia.set(b.fecha, []);
    bloqueosPorDia.get(b.fecha)!.push(b);
  }

  const solicitudesPorDia = new Map<string, SolicitudPendiente[]>();
  for (const s of solicitudesPendientes) {
    const clave = s.fecha_hora_turno.slice(0, 10);
    if (!solicitudesPorDia.has(clave)) solicitudesPorDia.set(clave, []);
    solicitudesPorDia.get(clave)!.push(s);
  }

  const disponibilidadPorDiaSemana = new Map<number, Disponibilidad>();
  for (const d of disponibilidad) disponibilidadPorDiaSemana.set(d.dia_semana, d);

  const hoyClave = aClaveFecha(hoy);

  return (
    <div className="border rounded-md p-4 space-y-3">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setOffsetSemana((v) => v - 1)}
          className="border rounded-md px-3 py-1 text-sm"
          aria-label="Semana anterior"
        >
          ←
        </button>
        <div className="text-center">
          <p className="font-medium text-sm">
            {lunes.toLocaleDateString("es-AR", { day: "numeric", month: "short" })} –{" "}
            {dias[6].toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
          </p>
          {offsetSemana !== 0 && (
            <button onClick={() => setOffsetSemana(0)} className="text-xs underline text-neutral-500">
              Volver a esta semana
            </button>
          )}
        </div>
        <button
          onClick={() => setOffsetSemana((v) => v + 1)}
          className="border rounded-md px-3 py-1 text-sm"
          aria-label="Semana siguiente"
        >
          →
        </button>
      </div>

      <div className="flex items-center gap-3 text-[11px] text-neutral-500">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-green-600 inline-block" /> Confirmado
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" /> Pendiente
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-red-600 inline-block" /> Bloqueado
        </span>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {dias.map((d, i) => {
          const clave = aClaveFecha(d);
          const turnosDia = turnosPorDia.get(clave) ?? [];
          const bloqueosDia = bloqueosPorDia.get(clave) ?? [];
          const solicitudesDia = solicitudesPorDia.get(clave) ?? [];
          const dispDia = disponibilidadPorDiaSemana.get(DIA_SEMANA_POR_COLUMNA[i]);

          return (
            <div
              key={clave}
              className={`border rounded-md p-1.5 min-h-28 text-[11px] ${
                clave === hoyClave ? "border-neutral-900" : "border-neutral-200"
              }`}
            >
              <p className="font-medium text-xs">{DIAS[i]}</p>
              <p className="text-neutral-400 text-xs">{d.getDate()}</p>
              <p className="text-neutral-400 mt-0.5">
                {dispDia ? `${dispDia.hora_inicio.slice(0, 5)}–${dispDia.hora_fin.slice(0, 5)}` : "sin horario"}
              </p>

              {turnosDia.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTurnoSeleccionado(t)}
                  className={`mt-1 w-full text-left text-white rounded px-1 py-0.5 truncate ${
                    t.estado === "pendiente_pago" ? "bg-amber-500" : "bg-green-600"
                  }`}
                >
                  {new Date(t.fecha_hora_turno!).toLocaleTimeString("es-AR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  {t.estado === "pendiente_pago" ? "Sin pagar" : t.clienteNombre}
                </button>
              ))}

              {solicitudesDia.map((s) => (
                <p key={s.id} className="mt-1 bg-amber-500 text-white rounded px-1 py-0.5 leading-tight break-words">
                  {new Date(s.fecha_hora_turno).toLocaleTimeString("es-AR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  pendiente
                </p>
              ))}

              {bloqueosDia.map((b) => (
                <p key={b.id} className="mt-1 bg-red-600 text-white rounded px-1 py-0.5 leading-tight break-words">
                  {b.hora_inicio.slice(0, 5)}–{b.hora_fin.slice(0, 5)}
                </p>
              ))}
            </div>
          );
        })}
      </div>

      {turnoSeleccionado && (
        <div className="border-t pt-3 space-y-1">
          <div className="flex items-center justify-between">
            <p className="font-medium text-sm">Detalle del turno</p>
            <button
              onClick={() => setTurnoSeleccionado(null)}
              className="text-neutral-400 hover:text-neutral-900 text-sm"
            >
              Cerrar ×
            </button>
          </div>
          <p className="text-sm">Cliente: {turnoSeleccionado.clienteNombre}</p>
          <p className="text-sm">Dirección: {turnoSeleccionado.direccionTexto}</p>
          <p className="text-sm">Servicio: {turnoSeleccionado.servicioNombre}</p>
          <p className="text-sm">Precio: ${turnoSeleccionado.precioTotal.toLocaleString("es-AR")}</p>
          <p className="text-sm">
            Hora:{" "}
            {turnoSeleccionado.fecha_hora_turno &&
              new Date(turnoSeleccionado.fecha_hora_turno).toLocaleString("es-AR")}
          </p>
        </div>
      )}
    </div>
  );
}
