/**
 * Normaliza um nome pra comparação (minúsculas, sem acento, espaços
 * colapsados) — usado só pra detectar divergência óbvia entre o nome
 * de uma linha importada e o nome já cadastrado pro mesmo CPF (ex.:
 * "Jose" vs "Josue"). Comparação exata após normalizar, sem
 * correspondência difusa (Levenshtein/soundex) — fica pra uma etapa
 * futura se necessário.
 */
export function normalizeNameForCompare(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export function namesDiverge(nameA: string, nameB: string): boolean {
  return normalizeNameForCompare(nameA) !== normalizeNameForCompare(nameB);
}
