"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";

type Estado = "cargando" | "no_soportado" | "denegado" | "inactivo" | "activo" | "activando";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function PushNotificationsToggle() {
  const [estado, setEstado] = useState<Estado>("cargando");

  useEffect(() => {
    async function revisar() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setEstado("no_soportado");
        return;
      }
      if (Notification.permission === "denied") {
        setEstado("denegado");
        return;
      }
      const registro = await navigator.serviceWorker.register("/sw.js");
      const suscripcion = await registro.pushManager.getSubscription();
      setEstado(suscripcion ? "activo" : "inactivo");
    }
    revisar().catch(() => setEstado("no_soportado"));
  }, []);

  async function activar() {
    setEstado("activando");
    try {
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) throw new Error("Falta la clave pública VAPID");

      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") {
        setEstado(permiso === "denied" ? "denegado" : "inactivo");
        return;
      }

      const registro = await navigator.serviceWorker.register("/sw.js");
      const suscripcion = await registro.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      await fetch("/api/notificaciones/suscribirse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(suscripcion.toJSON()),
      });

      setEstado("activo");
    } catch {
      setEstado("inactivo");
    }
  }

  async function desactivar() {
    setEstado("activando");
    try {
      const registro = await navigator.serviceWorker.getRegistration();
      const suscripcion = await registro?.pushManager.getSubscription();
      if (suscripcion) {
        await fetch("/api/notificaciones/suscribirse", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: suscripcion.endpoint }),
        });
        await suscripcion.unsubscribe();
      }
      setEstado("inactivo");
    } catch {
      setEstado("activo");
    }
  }

  if (estado === "cargando" || estado === "no_soportado") return null;

  if (estado === "denegado") {
    return (
      <div className="border border-border rounded-2xl p-4 bg-surface flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-surface-raised flex items-center justify-center flex-shrink-0">
          <BellOff size={17} strokeWidth={1.75} className="text-foreground-muted" />
        </div>
        <p className="text-sm text-foreground-muted">
          Bloqueaste las notificaciones del navegador. Activalas desde la configuración del sitio
          para enterarte de pedidos nuevos en tu zona apenas aparecen.
        </p>
      </div>
    );
  }

  if (estado === "activo") {
    return (
      <div className="border border-border rounded-2xl p-4 bg-surface flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-accent/15 flex items-center justify-center flex-shrink-0">
          <BellRing size={17} strokeWidth={1.75} className="text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">Notificaciones activadas</p>
          <p className="text-xs text-foreground-muted">Te avisamos apenas haya un pedido nuevo en tu zona.</p>
        </div>
        <button
          onClick={desactivar}
          className="text-xs text-foreground-muted underline flex-shrink-0 transition-colors duration-200 hover:text-foreground"
        >
          Desactivar
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={activar}
      disabled={estado === "activando"}
      className="w-full border border-accent/30 bg-accent/10 rounded-2xl p-4 flex items-center gap-3 text-left transition-all duration-200 active:scale-95 disabled:opacity-60"
    >
      <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
        <Bell size={17} strokeWidth={1.75} className="text-accent" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">
          {estado === "activando" ? "Activando..." : "Activar notificaciones de pedidos"}
        </p>
        <p className="text-xs text-foreground-muted">Enterate al instante cuando alguien pide un lavado en tu zona.</p>
      </div>
    </button>
  );
}
