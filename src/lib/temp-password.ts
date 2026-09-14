/**
 * Senha inicial de um usuário convidado (Fase 9, complemento): os
 * últimos dígitos do telefone/WhatsApp cadastrado.
 *
 * O pedido original foi "os 4 últimos números" — usei 6 em vez de 4
 * porque o Supabase Auth recusa senha com menos de 6 caracteres por
 * padrão (`admin.createUser()`/`admin.updateUserById()` retornam erro
 * "Password should be at least 6 characters" abaixo disso). É uma senha
 * fraca de qualquer forma (poucos dígitos, derivados de um número que a
 * própria pessoa divulga) — o ponto é ser fácil de comunicar por
 * WhatsApp/e-mail, não ser segura a longo prazo; por isso existe
 * `/conta` para a pessoa trocar assim que entrar (ver README, "Riscos e
 * pendências desta fase").
 */
export function derivePasswordFromPhone(phone: string): string {
  return phone.replace(/\D/g, "").slice(-6);
}
