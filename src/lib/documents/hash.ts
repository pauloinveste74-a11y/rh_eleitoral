import "server-only";
import { createHash } from "node:crypto";

/**
 * Hash SHA-256 (hex) do conteúdo de um arquivo — usado só pra detectar
 * duplicata exata (mesmo byte a byte) no upload de documento de pessoa
 * (spec seção 8, "detecção de repetição"). Não é uma proteção
 * criptográfica de nada, só uma chave de deduplicação.
 */
export async function sha256Hex(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return createHash("sha256").update(buffer).digest("hex");
}
