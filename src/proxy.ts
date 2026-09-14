import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

/**
 * Proxy (equivalente ao antigo "middleware" antes do Next.js 16).
 * Roda em todas as rotas (exceto assets estáticos) para renovar a sessão
 * do Supabase e bloquear o acesso não autenticado ao painel.
 */
export function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Roda em todas as rotas, exceto:
     * - arquivos estáticos do Next.js (_next/static, _next/image)
     * - favicon.ico
     * - arquivos com extensão (imagens, svg, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
