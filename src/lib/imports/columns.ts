/**
 * Cabeçalho aceito na planilha de importação (Etapa 6) — separado de
 * person-import.ts porque este arquivo não pode importar "xlsx"/"server-only"
 * (é usado também pelo formulário de upload, client component, só pra
 * mostrar a lista de colunas aceitas).
 */
export const IMPORT_COLUMNS: { header: string; key: string }[] = [
  { header: "Nome completo", key: "fullName" },
  { header: "CPF", key: "cpf" },
  { header: "Data de nascimento", key: "birthDate" },
  { header: "Telefone", key: "phone" },
  { header: "WhatsApp", key: "whatsapp" },
  { header: "E-mail", key: "email" },
  { header: "CEP", key: "zipCode" },
  { header: "Logradouro", key: "street" },
  { header: "Número", key: "number" },
  { header: "Complemento", key: "complement" },
  { header: "Bairro", key: "neighborhood" },
  { header: "Cidade", key: "city" },
  { header: "UF", key: "state" },
  { header: "Banco (código)", key: "bankCode" },
  { header: "Nome do banco", key: "bankName" },
  { header: "Agência", key: "agency" },
  { header: "Dígito da agência", key: "agencyDigit" },
  { header: "Número da conta", key: "accountNumber" },
  { header: "Dígito da conta", key: "accountDigit" },
  { header: "Tipo de conta (corrente/poupanca)", key: "accountType" },
  { header: "Tipo de chave PIX (cpf/email/telefone/aleatoria)", key: "pixKeyType" },
  { header: "Chave PIX", key: "pixKey" },
  { header: "Título de eleitor", key: "voterId" },
  { header: "Zona eleitoral", key: "electoralZone" },
  { header: "Seção eleitoral", key: "electoralSection" },
  { header: "Cidade de votação", key: "voterCity" },
  { header: "UF de votação", key: "voterState" },
];

/** Remove acentos, baixa a caixa e apara espaços — pra casar cabeçalhos com pequenas variações de digitação. */
export function normalizeHeader(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

export const HEADER_TO_KEY = new Map(
  IMPORT_COLUMNS.map((c) => [normalizeHeader(c.header), c.key]),
);
