import "server-only";
import { MercadoPagoConfig, Preference, Payment } from "mercadopago";

// SOLO server-side. Requiere MERCADOPAGO_ACCESS_TOKEN en las variables de
// entorno (Vercel > Settings > Environment Variables, y .env.local en local).
function getClient() {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("Falta MERCADOPAGO_ACCESS_TOKEN en las variables de entorno.");
  }
  return new MercadoPagoConfig({ accessToken });
}

export function getPreferenceClient() {
  return new Preference(getClient());
}

export function getPaymentClient() {
  return new Payment(getClient());
}
