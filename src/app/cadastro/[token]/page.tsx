import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PublicRegistrationFlow } from "@/components/cadastro/public-registration-flow";

export const metadata: Metadata = {
  title: "Cadastro — RH Eleitoral",
};

// Nunca pré-renderizar/cachear: o token é de uso único e o estado do
// convite muda a cada visita (mesmo motivo de `dynamic` no layout do
// grupo (app) — ver src/app/(app)/layout.tsx).
export const dynamic = "force-dynamic";

export default async function CadastroPublicoPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  // redeem_registration_invite() é a única forma de alguém sem sessão
  // enxergar um convite — protegida pelo token, não por RLS (é `anon`,
  // migração 0014). Chamar de novo aqui é seguro mesmo se o link já foi
  // aberto antes (idempotente para status já avançado).
  const { data: invite, error } = await supabase.rpc(
    "redeem_registration_invite",
    { p_token: token },
  );

  if (error || !invite) {
    return (
      <PublicPageShell>
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Convite indisponível</CardTitle>
            <CardDescription>
              {error?.message ??
                "Este link não é válido. Peça um novo convite para o seu coordenador."}
            </CardDescription>
          </CardHeader>
        </Card>
      </PublicPageShell>
    );
  }

  const initialStep: "form" | "upload" | "done" =
    invite.status === "concluido"
      ? "done"
      : invite.person_id
        ? "upload"
        : "form";

  return (
    <PublicPageShell>
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
            {invite.contact_name
              ? `Olá, ${invite.contact_name}!`
              : "Complete seu cadastro"}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Preencha seus dados e anexe um documento para concluir seu
            cadastro na campanha.
          </p>
        </div>
        <PublicRegistrationFlow token={token} initialStep={initialStep} />
      </div>
    </PublicPageShell>
  );
}

function PublicPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center bg-slate-50 px-4 py-10 dark:bg-slate-900">
      <div className="mb-6 text-lg font-semibold text-slate-900 dark:text-slate-50">
        RH Eleitoral
      </div>
      {children}
    </div>
  );
}
