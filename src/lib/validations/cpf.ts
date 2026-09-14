/** Remove tudo que não for dígito (pontos, traço, espaços). */
export function sanitizeCpf(value: string): string {
  return value.replace(/\D/g, "");
}

function calcVerifierDigit(base: number[], factor: number): number {
  const sum = base.reduce(
    (acc, digit, index) => acc + digit * (factor - index),
    0,
  );
  const remainder = (sum * 10) % 11;
  return remainder === 10 ? 0 : remainder;
}

/**
 * Valida formato (11 dígitos) e os dois dígitos verificadores do CPF.
 * Rejeita sequências repetidas (ex.: 111.111.111-11), que passariam no
 * cálculo dos dígitos verificadores mas nunca são CPFs válidos emitidos.
 */
export function isValidCpf(rawValue: string): boolean {
  const cpf = sanitizeCpf(rawValue);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const digits = cpf.split("").map(Number);
  if (calcVerifierDigit(digits.slice(0, 9), 10) !== digits[9]) return false;
  if (calcVerifierDigit(digits.slice(0, 10), 11) !== digits[10]) return false;
  return true;
}

/** Formata 11 dígitos como 000.000.000-00; retorna o valor original se não tiver 11 dígitos. */
export function formatCpf(cpf: string): string {
  const d = sanitizeCpf(cpf);
  if (d.length !== 11) return cpf;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}
