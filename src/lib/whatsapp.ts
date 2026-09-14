/**
 * Monta um link `wa.me` a partir de um telefone em formato livre.
 * Assume Brasil (DDI 55) quando o número tem 10 ou 11 dígitos (DDD +
 * número, sem DDI) — heurística simples, não uma validação de telefone;
 * o admin vê o número de destino antes de enviar no próprio WhatsApp Web.
 */
export function buildWhatsAppLink(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, "");
  const withCountryCode = digits.length <= 11 ? `55${digits}` : digits;
  return `https://wa.me/${withCountryCode}?text=${encodeURIComponent(message)}`;
}
