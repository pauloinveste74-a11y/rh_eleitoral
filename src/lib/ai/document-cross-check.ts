import "server-only";

import { getAnthropicClient } from "./anthropic-client";

export interface DocumentCrossCheckResult {
  verdict: "confere" | "diverge" | "inconclusivo";
  extractedName: string | null;
  extractedCpf: string | null;
  explanation: string;
}

const REPORT_TOOL_NAME = "reportar_verificacao";

/**
 * Pede pro Claude ler um documento de identidade (RG/CNH — imagem ou
 * PDF) e comparar nome/CPF encontrados nele contra os valores
 * candidatos vindos do cadastro/importação. Resposta sempre
 * estruturada via tool use forçado — nunca parsing de texto livre.
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
  const client = getAnthropicClient();
  const base64Data = documentBytes.toString("base64");

  const documentBlock =
    mimeType === "application/pdf"
      ? ({
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: base64Data },
        } as const)
      : ({
          type: "image",
          source: {
            type: "base64",
            media_type: mimeType as "image/jpeg" | "image/png" | "image/webp",
            data: base64Data,
          },
        } as const);

  const response = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 1024,
    tools: [
      {
        name: REPORT_TOOL_NAME,
        description: "Reporta o resultado da verificação do documento de identidade.",
        input_schema: {
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
        },
      },
    ],
    tool_choice: { type: "tool", name: REPORT_TOOL_NAME },
    messages: [
      {
        role: "user",
        content: [
          documentBlock,
          {
            type: "text",
            text:
              `Este é um documento de identidade (RG ou CNH) de uma pessoa cadastrada num sistema de RH. ` +
              `O cadastro/planilha diz: nome "${candidateName}", CPF "${candidateCpf}". ` +
              `Leia o documento e diga se esses dados conferem com o que está escrito nele, usando a ferramenta ${REPORT_TOOL_NAME}.`,
          },
        ],
      },
    ],
  });

  const toolUse = response.content.find(
    (block): block is Extract<typeof block, { type: "tool_use" }> => block.type === "tool_use",
  );
  if (!toolUse) {
    return {
      verdict: "inconclusivo",
      extractedName: null,
      extractedCpf: null,
      explanation: "A IA não retornou um resultado estruturado.",
    };
  }

  const input = toolUse.input as {
    verdict: "confere" | "diverge" | "inconclusivo";
    extracted_name: string | null;
    extracted_cpf: string | null;
    explanation: string;
  };

  return {
    verdict: input.verdict,
    extractedName: input.extracted_name,
    extractedCpf: input.extracted_cpf,
    explanation: input.explanation,
  };
}
