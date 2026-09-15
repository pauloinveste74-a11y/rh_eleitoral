import "server-only";
import OpenAI from "openai";

/**
 * Cliente da API da OpenAI — usado só sob demanda (botão "Verificar
 * com IA" em `/divergencias`), nunca automático a cada upload, por
 * custo e previsibilidade (chamada paga por uso, separada de uma
 * assinatura ChatGPT Plus comum).
 *
 * `import "server-only"` garante em build time que este arquivo nunca
 * entra num bundle de cliente (navegador) — mesma disciplina de
 * `src/lib/supabase/admin.ts` pra chave sensível.
 */
export function getOpenAiClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY não configurada. Gere uma chave em platform.openai.com/api-keys " +
        "e defina essa variável de ambiente para habilitar a checagem de documento por IA. " +
        "Nunca prefixe com NEXT_PUBLIC_.",
    );
  }

  return new OpenAI({ apiKey });
}
