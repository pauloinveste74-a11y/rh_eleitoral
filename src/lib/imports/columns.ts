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
  { header: "RG", key: "rg" },
  { header: "Eixo", key: "axisName" },
  { header: "Equipe", key: "teamName" },
  { header: "RA", key: "cityName" },
  { header: "Coordenador", key: "coordinatorName" },
  { header: "Função", key: "jobFunctionName" },
  { header: "Marca do veículo", key: "vehicleBrand" },
  { header: "Modelo do veículo", key: "vehicleModel" },
  { header: "Placa", key: "vehiclePlate" },
  { header: "Renavam", key: "vehicleRenavam" },
  { header: "Endereço completo", key: "fullAddress" },
  { header: "Liderança", key: "leadershipNote" },
  { header: "Indicação", key: "referralName" },
  { header: "Tipo de contratação", key: "contractingTypeNote" },
];

/**
 * Variações reais de cabeçalho vistas em planilhas de RH (nomes diferentes
 * pro mesmo conceito) — não aparecem na lista de ajuda da tela (por isso um
 * array separado), mas casam do mesmo jeito. Adicionar aqui é sempre seguro:
 * um alias a mais nunca conflita, `HEADER_TO_KEY` é many-to-one por
 * cabeçalho.
 */
const HEADER_ALIASES: { header: string; key: string }[] = [
  { header: "CPF/CNPJ", key: "cpf" },
  { header: "Nome/Razão Social", key: "fullName" },
  { header: "Nome do cabo", key: "fullName" },
  { header: "Celular", key: "whatsapp" },
  { header: "Município", key: "city" },
  { header: "Estado", key: "state" },
  { header: "Nº", key: "number" },
  { header: "Coord. Eixo", key: "coordinatorName" },
  { header: "Coord. SOD", key: "coordinatorName" },
  // "Endereço" sozinho (sem "completo") — mesmo conceito de texto único.
  { header: "Endereço", key: "fullAddress" },
  { header: "Equipe/Campanha", key: "teamName" },
  { header: "quem indicou/trouxe", key: "referralName" },
  // Cabeçalho combinado visto numa planilha real — melhor esforço: trata
  // como coordenador (é o dado estruturado que já sabemos resolver). Se o
  // uso real for outro, precisa de uma coluna própria depois.
  { header: "liderança/coordenador", key: "coordinatorName" },
];

/**
 * Colunas que servem de chave de junção entre abas (import multi-planilha) —
 * toda aba precisa ter pelo menos a coluna CPF pra suas linhas entrarem na
 * mesclagem por pessoa.
 */
export const SHEET_JOIN_KEY = "cpf";

/**
 * Remove acentos, marcadores de campo obrigatório (*), pontuação de rótulo
 * (":"/".") e apara espaços — pra casar cabeçalhos com pequenas variações de
 * digitação (ex.: "Função*" e "Função" batem; "Coord. Eixo:" e "Coord. Eixo"
 * também).
 */
export function normalizeHeader(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[*:.]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export const HEADER_TO_KEY = new Map(
  [...IMPORT_COLUMNS, ...HEADER_ALIASES].map((c) => [normalizeHeader(c.header), c.key]),
);
