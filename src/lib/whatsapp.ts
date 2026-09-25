// Normaliza un telefono cargado a mano (ej: "11 5555-5555", "011-5555-5555")
// al formato que necesita wa.me: solo digitos, con codigo de pais y el 9
// de celular argentino si no lo tiene ya.
export function normalizarTelefonoAR(telefono: string | null | undefined): string | null {
  if (!telefono) return null;
  const digitos = telefono.replace(/\D/g, "");
  if (!digitos) return null;

  if (digitos.startsWith("549")) return digitos;
  if (digitos.startsWith("54")) return `549${digitos.slice(2)}`;
  if (digitos.startsWith("0")) return `549${digitos.slice(1)}`;
  return `549${digitos}`;
}

export function urlWhatsapp(telefono: string | null | undefined, mensaje: string): string | null {
  const numero = normalizarTelefonoAR(telefono);
  if (!numero) return null;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}
