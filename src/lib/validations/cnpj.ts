/** Remove tudo que não for dígito (pontos, barra, traço, espaços). */
export function sanitizeCnpj(value: string): string {
  return value.replace(/\D/g, "");
}

function calcCnpjDigit(base: number[], weights: number[]): number {
  const sum = base.reduce((acc, digit, i) => acc + digit * weights[i], 0);
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

const WEIGHTS_1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const WEIGHTS_2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

/**
 * Valida formato (14 dígitos) e os dois dígitos verificadores do CNPJ —
 * mesmo espírito de isValidCpf() (src/lib/validations/cpf.ts). Rejeita
 * sequências repetidas, que passariam no cálculo mas nunca são CNPJs
 * válidos emitidos.
 */
export function isValidCnpj(rawValue: string): boolean {
  const cnpj = sanitizeCnpj(rawValue);
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  const digits = cnpj.split("").map(Number);
  if (calcCnpjDigit(digits.slice(0, 12), WEIGHTS_1) !== digits[12]) return false;
  if (calcCnpjDigit(digits.slice(0, 13), WEIGHTS_2) !== digits[13]) return false;
  return true;
}

export function formatCnpj(cnpj: string): string {
  const d = sanitizeCnpj(cnpj);
  if (d.length !== 14) return cnpj;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}
