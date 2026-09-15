import "server-only";

import { getOpenAiClient } from "./openai-client";

export interface DocumentCrossCheckResult {
  verdict: "confere" | "diverge" | "inconclusivo";
  extractedName: string | null;
  extractedCpf: string | null;
  explanation: string;
}

/**
 * Modelo com visão + saída estruturada, camada "mini" (custo baixo,
 * suficiente pra ler um documento de identidade). Se a OpenAI
 * descontinuar/renomear este modelo, o erro retornado pela API deixa
 * claro — é só trocar esta constante.
 */
const MODEL = "gpt-5.4-mini";

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    verdict: {
      type: "string",
      enum: ["confere", "diverge", "inconclusivo"],
      description:
        "'confere' se o nome/CPF candidatos batem com o documento, 'diverge' se o documento mostra outro valor, 'inconclusivo' se não deu pra ler o documento com confiança.",
    },
    extracted_name: {
      type: ["string", "null"],
      description: "Nome completo encontrado no documento, ou null se ilegível.",
    },
    extracted_cpf: {
      type: ["string", "null"],
      description: "CPF encontrado no documento (só dígitos), ou null se não aparecer/ilegível.",
    },
    explanation: {
      type: "string",
      description: "Explicação curta (1-2 frases) do veredito, em português.",
    },
  },
  required: ["verdict", "extracted_name", "extracted_cpf", "explanation"],
  additionalProperties: false,
} as const;

/**
 * Pede pra IA ler um documento de identidade (RG/CNH — imagem ou PDF)
 * e comparar nome/CPF encontrados nele contra os valores candidatos
 * vindos do cadastro/importação. Resposta sempre estruturada via
 * Structured Outputs (JSON Schema) — nunca parsing de texto livre.
 *
 * A IA só sugere; quem decide aceitar ou não é sempre um humano, em
 * `/divergencias` (`resolve_data_conflict()`).
 */
export async function crossCheckIdentityDocument({
  documentBytes,
  mimeType,
  candidateName,
  candidateCpf,
}: {
  documentBytes: Buffer;
  mimeType: string;
  candidateName: string;
  candidateCpf: string;
}): Promise<DocumentCrossCheckResult> {
  const client = getOpenAiClient();
  const base64Data = documentBytes.toString("base64");

  const documentContent =
    mimeType === "application/pdf"
      ? ({
          type: "input_file" as const,
          filename: "documento.pdf",
          file_data: `data:application/pdf;base64,${base64Data}`,
        })
      : ({
          type: "input_image" as const,
          detail: "high" as const,
          image_url: `data:${mimeType};base64,${base64Data}`,
        });

  const response = await client.responses.create({
    model: MODEL,
    input: [
      {
        role: "user",
        content: [
          documentContent,
          {
            type: "input_text",
            text:
              `Este é um documento de identidade (RG ou CNH) de uma pessoa cadastrada num sistema de RH. ` +
              `O cadastro/planilha diz: nome "${candidateName}", CPF "${candidateCpf}". ` +
              `Leia o documento e diga se esses dados conferem com o que está escrito nele.`,
          },
        ],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "reportar_verificacao",
        schema: RESPONSE_SCHEMA,
        strict: true,
      },
    },
  });

  let parsed: {
    verdict: "confere" | "diverge" | "inconclusivo";
    extracted_name: string | null;
    extracted_cpf: string | null;
    explanation: string;
  };
  try {
    parsed = JSON.parse(response.output_text);
  } catch {
    return {
      verdict: "inconclusivo",
      extractedName: null,
      extractedCpf: null,
      explanation: "A IA não retornou um resultado estruturado.",
    };
  }

  return {
    verdict: parsed.verdict,
    extractedName: parsed.extracted_name,
    extractedCpf: parsed.extracted_cpf,
    explanation: parsed.explanation,
  };
}
