import "server-only";
import { PDFParse } from "pdf-parse";

import { classifyRow, type ClassifiedRow, type ImportReferenceMaps } from "./person-import";

/** PDF não extrai eixo/coordenador/função por regex — mapas sempre vazios, então essa resolução nunca dispara. */
const EMPTY_REFERENCE_MAPS: ImportReferenceMaps = {
  axisIdByName: new Map(),
  jobFunctionIdByName: new Map(),
  activePeopleByName: new Map(),
};

/**
 * Importação em lote por PDF (Nova versão, Etapa 7 — spec seção 9.2),
 * primeiro corte. Reaproveita `classifyRow()` de person-import.ts — a
 * única diferença de verdade pro Excel é *de onde* vêm os dados brutos
 * de cada linha: aqui, de regex sobre texto de página de PDF, em vez de
 * célula de planilha. Validação, deduplicação e o formato de staging são
 * exatamente os mesmos.
 *
 * Escopo deliberadamente reduzido nesta etapa (documentado com detalhe
 * na migração 0034): só PDF com texto pesquisável (sem OCR de imagem
 * digitalizada — precisa de decisão sobre provedor/custo, não é algo
 * pra decidir sozinho); heurística de separação é 1 página = 1 pessoa;
 * extração de campo é por regex/rótulo, sem confiança por campo ainda.
 */

export type PdfPageResult = ClassifiedRow & {
  /** true quando a página não tinha texto extraível (provável imagem digitalizada — precisaria de OCR). */
  requiresOcr: boolean;
};

/** Extrai o texto de cada página do PDF. Lança se o arquivo não for um PDF válido. */
export async function extractPdfPages(buffer: ArrayBuffer): Promise<string[]> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.pages.map((p) => p.text);
  } finally {
    await parser.destroy();
  }
}

const CPF_RE = /\b(\d{3}\.?\d{3}\.?\d{3}-?\d{2})\b/;
const NAME_RE = /nome(?:\s+completo)?\s*:?\s*([^\n\r]{3,100})/i;
const PHONE_RE = /\(?\d{2}\)?[\s.-]?9?\d{4}[\s.-]?\d{4}\b/;
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const BIRTH_RE = /nascimento\s*:?\s*(\d{2})[\/.-](\d{2})[\/.-](\d{4})/i;

/**
 * Tira dos rótulos mais comuns de um formulário/documento os campos que a
 * gente sabe procurar — sem NLP, só regex. Campos não encontrados ficam
 * de fora (`classifyRow` já sabe lidar com isso: só `fullName`/`cpf` são
 * obrigatórios em `personSchema`).
 */
export function extractCandidateFields(pageText: string): Record<string, string> {
  const fields: Record<string, string> = {};

  const cpfMatch = pageText.match(CPF_RE);
  if (cpfMatch) fields.cpf = cpfMatch[1];

  const nameMatch = pageText.match(NAME_RE);
  if (nameMatch) fields.fullName = nameMatch[1].trim();

  const phoneMatch = pageText.match(PHONE_RE);
  if (phoneMatch) {
    fields.phone = phoneMatch[0];
    fields.whatsapp = phoneMatch[0];
  }

  const emailMatch = pageText.match(EMAIL_RE);
  if (emailMatch) fields.email = emailMatch[0];

  const birthMatch = pageText.match(BIRTH_RE);
  if (birthMatch) {
    const [, day, month, year] = birthMatch;
    fields.birthDate = `${year}-${month}-${day}`;
  }

  return fields;
}

/**
 * Processa um PDF inteiro: uma linha de staging por página. Página sem
 * texto extraível (provável scan/imagem) vira `requiresOcr: true` — não
 * tenta OCR, só sinaliza com mensagem clara em vez de dado inventado.
 */
export async function classifyPdfBatch(
  buffer: ArrayBuffer,
  cpfsExistingInCampaign: Set<string>,
): Promise<PdfPageResult[]> {
  const pages = await extractPdfPages(buffer);
  const cpfsSeenInFile = new Set<string>();

  return pages.map((pageText, i) => {
    const pageNumber = i + 1;
    const trimmed = pageText.trim();

    if (trimmed.length < 20) {
      return {
        rowNumber: pageNumber,
        rawData: {},
        normalizedData: null,
        result: "invalida",
        cpf: null,
        fullName: null,
        errors: [
          {
            field: null,
            message:
              "Página sem texto extraível — provável imagem digitalizada. OCR ainda não é suportado nesta versão; envie um PDF com texto pesquisável ou cadastre esta pessoa manualmente.",
          },
        ],
        warnings: [],
        requiresOcr: true,
      };
    }

    const rawData = extractCandidateFields(pageText);
    const classified = classifyRow(
      pageNumber,
      rawData,
      cpfsSeenInFile,
      cpfsExistingInCampaign,
      EMPTY_REFERENCE_MAPS,
    );
    return { ...classified, requiresOcr: false };
  });
}
