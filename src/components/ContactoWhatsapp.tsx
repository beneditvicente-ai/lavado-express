const NUMERO_WHATSAPP = "5491161126422";

export function ContactoWhatsapp() {
  return (
    <div className="flex flex-col items-center gap-3 py-2">
      <p className="text-sm text-foreground-muted text-center">
        ¿Tenés alguna consulta o problema? Comunicate por WhatsApp.
      </p>
      <a
        href={`https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent("Hola, tengo una consulta sobre Lavado Express")}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Escribinos por WhatsApp"
        className="animate-flotar w-14 h-14 rounded-full bg-[#25D366] flex items-center justify-center shadow-lg shadow-[#25D366]/30 transition-transform duration-200 hover:scale-110 active:scale-90"
      >
        <svg viewBox="0 0 24 24" width="26" height="26" fill="white" aria-hidden="true">
          <path d="M12.04 2c-5.52 0-10 4.48-10 10 0 1.77.46 3.45 1.32 4.95L2 22l5.2-1.36a9.96 9.96 0 0 0 4.84 1.24h.01c5.52 0 10-4.48 10-10s-4.48-9.88-10.01-9.88Zm0 18.15h-.01a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-3.09.81.83-3.02-.2-.31A8.18 8.18 0 0 1 3.84 12c0-4.53 3.68-8.21 8.2-8.21 4.53 0 8.2 3.68 8.2 8.22 0 4.53-3.67 8.21-8.2 8.14Zm4.49-6.14c-.25-.12-1.45-.72-1.68-.8-.22-.08-.39-.12-.55.12-.16.25-.63.8-.78.96-.14.16-.28.18-.53.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.48-1.38-1.73-.15-.25-.02-.38.11-.51.11-.11.25-.28.37-.42.12-.14.16-.25.24-.4.08-.16.04-.3-.02-.42-.06-.12-.55-1.33-.76-1.82-.2-.48-.4-.42-.55-.42h-.47c-.16 0-.42.06-.64.3-.22.25-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.59 4.11 3.63.57.25 1.02.4 1.37.5.58.19 1.1.16 1.52.1.46-.07 1.45-.59 1.65-1.17.2-.57.2-1.06.14-1.17-.06-.11-.22-.17-.47-.29Z" />
        </svg>
      </a>
    </div>
  );
}
