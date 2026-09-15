import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/**
 * Cliente da API da Anthropic — usado só sob demanda (botão "Verificar
 * com IA" em `/divergencias`), nunca automático a cada upload, por
 * custo e previsibilidade (chamada paga por uso).
 *
 * `import "server-only"` garante em build time que este arquivo nunca
 * entra num bundle de cliente (navegador) — mesma disciplina de
 * `src/lib/supabase/admin.ts` pra chave sensível.
 */
export function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY não configurada. Gere uma chave em console.anthropic.com " +
        "e defina essa variável de ambiente para habilitar a checagem de documento por IA. " +
        "Nunca prefixe com NEXT_PUBLIC_.",
    );
  }

  return new Anthropic({ apiKey });
}
