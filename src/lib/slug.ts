/**
 * Gera um slug simples a partir de um nome (minúsculas, sem acento,
 * não alfanumérico vira "-"). Usado pra preencher `campaigns.slug`
 * (único) a partir do nome digitado no cadastro de organização —
 * `/master/organizacoes`.
 */
export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
