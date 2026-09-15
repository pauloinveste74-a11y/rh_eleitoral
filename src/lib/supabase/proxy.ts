import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { getSupabaseEnv } from "./env";

/**
 * Rotas acessíveis sem sessão autenticada. `/cadastro` é o autocadastro
 * público do cabo eleitoral (Etapa 2) — protegido pelo token na própria URL
 * (`/cadastro/[token]`), não por sessão; nunca terá login tradicional.
 */
const PUBLIC_ROUTES = ["/login", "/cadastro"];

function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

/**
 * Renova a sessão do Supabase a cada requisição e bloqueia o acesso de
 * usuários não autenticados às rotas protegidas.
 *
 * Esta é uma verificação otimista (lê apenas o cookie de sessão), conforme
 * recomendado pela documentação do Next.js: a autorização definitiva por
 * registro é sempre garantida pelo RLS no Postgres, nunca só aqui.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { pathname } = request.nextUrl;

  const { url, anonKey } = getSupabaseEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // IMPORTANTE: não remover. getUser() valida o token junto ao servidor de
  // autenticação e é o que efetivamente renova a sessão nos cookies.
  // Falhas de rede/configuração ao falar com o Supabase são tratadas como
  // "não autenticado" em vez de derrubar a requisição com erro 500 —
  // trata-se apenas da checagem otimista; o RLS continua sendo a garantia
  // real de autorização por registro.
  let user: Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"] =
    null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (error) {
    console.error("[proxy] Falha ao validar sessão Supabase:", error);
  }

  if (!user && !isPublicRoute(pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && pathname === "/login") {
    return NextResponse.redirect(new URL("/painel", request.url));
  }

  return response;
}
