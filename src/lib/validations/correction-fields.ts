/**
 * Etapa 11 — lista canônica de campos que podem ser apontados numa
 * correção (`correction_requests.field_names`). As chaves batem
 * exatamente com `PersonFormValues` (src/components/pessoas/person-form.tsx)
 * — usada tanto pelo seletor do gestor/RH (/validacoes) quanto pelo lado
 * de quem corrige (/meu-cadastro, /cadastro/[token]) pra travar os campos
 * não apontados. `socialName` fica fora: autocadastro nunca mostra esse
 * campo (PersonForm com showSocialName={false}).
 */
export const CORRECTION_FIELDS: { key: string; label: string; section: string }[] = [
  { key: "fullName", label: "Nome completo", section: "Dados pessoais" },
  { key: "cpf", label: "CPF", section: "Dados pessoais" },
  { key: "birthDate", label: "Data de nascimento", section: "Dados pessoais" },
  { key: "phone", label: "Telefone", section: "Dados pessoais" },
  { key: "whatsapp", label: "WhatsApp", section: "Dados pessoais" },
  { key: "email", label: "E-mail", section: "Dados pessoais" },
  { key: "zipCode", label: "CEP", section: "Endereço" },
  { key: "street", label: "Logradouro", section: "Endereço" },
  { key: "number", label: "Número", section: "Endereço" },
  { key: "complement", label: "Complemento", section: "Endereço" },
  { key: "neighborhood", label: "Bairro", section: "Endereço" },
  { key: "city", label: "Cidade", section: "Endereço" },
  { key: "state", label: "UF", section: "Endereço" },
  { key: "bankCode", label: "Código do banco", section: "Dados bancários" },
  { key: "bankName", label: "Nome do banco", section: "Dados bancários" },
  { key: "agency", label: "Agência", section: "Dados bancários" },
  { key: "agencyDigit", label: "Dígito da agência", section: "Dados bancários" },
  { key: "accountNumber", label: "Número da conta", section: "Dados bancários" },
  { key: "accountDigit", label: "Dígito da conta", section: "Dados bancários" },
  { key: "accountType", label: "Tipo de conta", section: "Dados bancários" },
  { key: "pixKeyType", label: "Tipo de chave PIX", section: "Dados bancários" },
  { key: "pixKey", label: "Chave PIX", section: "Dados bancários" },
  { key: "voterId", label: "Título de eleitor", section: "Dados eleitorais" },
  { key: "electoralZone", label: "Zona", section: "Dados eleitorais" },
  { key: "electoralSection", label: "Seção", section: "Dados eleitorais" },
  { key: "voterCity", label: "Cidade de votação", section: "Dados eleitorais" },
  { key: "voterState", label: "UF de votação", section: "Dados eleitorais" },
];
