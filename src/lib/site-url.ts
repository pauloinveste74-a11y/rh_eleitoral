import "server-only";

/**
 * URL pública do site, usada para montar o `redirectTo` do convite de
 * usuário (Fase 9). Usa as variáveis que o próprio Vercel já injeta
 * automaticamente — sem exigir configuração manual — com um override
 * opcional via `NEXT_PUBLIC_SITE_URL` para outros ambientes de deploy.
 */
export function getSiteUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL &&
      `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) ||
    (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ||
    "http://localhost:3000";
  return url.replace(/\/$/, "");
}
