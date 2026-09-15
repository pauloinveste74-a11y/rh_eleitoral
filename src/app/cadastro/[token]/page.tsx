import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PublicRegistrationFlow } from "@/components/cadastro/public-registration-flow";
import type { PersonFormValues } from "@/components/pessoas/person-form";

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

  // get_public_registration_status() (Etapa 11) é a fonte de verdade desta
  // página — ao contrário de redeem_registration_invite(), não rejeita um
  // convite já 'concluido' (precisa continuar lendo depois de uma correção
  // solicitada, quando o cadastro já foi enviado uma vez). Chama
  // redeem_registration_invite() também, só pelo efeito colateral de marcar
  // 'criado' -> 'acessado' na primeira abertura — e ignora se ela falhar
  // (falha esperada depois que o convite já foi usado).
  const [{ data: rows, error }] = await Promise.all([
    supabase.rpc("get_public_registration_status", { p_token: token }),
    supabase.rpc("redeem_registration_invite", { p_token: token }),
  ]);
  const status = rows?.[0];

  if (error || !status) {
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

  if (status.invite_status === "expirado" || status.invite_status === "cancelado") {
    return (
      <PublicPageShell>
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Convite indisponível</CardTitle>
            <CardDescription>
              {status.invite_status === "expirado"
                ? "Este link expirou. Peça um novo convite para o seu coordenador."
                : "Este convite foi cancelado. Peça um novo para o seu coordenador."}
            </CardDescription>
          </CardHeader>
        </Card>
      </PublicPageShell>
    );
  }

  const needsCorrection =
    status.person_status === "correcao_solicitada" ||
    status.person_status === "reenviado";

  const initialStep: "form" | "upload" | "done" = needsCorrection
    ? "form"
    : status.invite_status === "concluido"
      ? "done"
      : status.person_id
        ? "upload"
        : "form";

  const address = status.address as Record<string, string> | null;
  const bank = status.bank as Record<string, string> | null;
  const electoral = status.electoral as Record<string, string> | null;

  const defaultValues: Partial<PersonFormValues> | undefined = status.person_id
    ? {
        fullName: status.full_name ?? "",
        cpf: status.cpf ?? "",
        birthDate: status.birth_date ?? "",
        phone: status.phone ?? "",
        whatsapp: status.whatsapp ?? "",
        email: status.email ?? "",
        zipCode: address?.zip_code ?? "",
        street: address?.street ?? "",
        number: address?.number ?? "",
        complement: address?.complement ?? "",
        neighborhood: address?.neighborhood ?? "",
        city: address?.city ?? "",
        state: address?.state ?? "",
        bankCode: bank?.bank_code ?? "",
        bankName: bank?.bank_name ?? "",
        agency: bank?.agency ?? "",
        agencyDigit: bank?.agency_digit ?? "",
        accountNumber: bank?.account_number ?? "",
        accountDigit: bank?.account_digit ?? "",
        accountType: bank?.account_type ?? "",
        pixKeyType: bank?.pix_key_type ?? "",
        pixKey: bank?.pix_key ?? "",
        voterId: electoral?.voter_id ?? "",
        electoralZone: electoral?.electoral_zone ?? "",
        electoralSection: electoral?.electoral_section ?? "",
        voterCity: electoral?.voter_city ?? "",
        voterState: electoral?.voter_state ?? "",
      }
    : undefined;

  const editableFields =
    needsCorrection && status.correction_fields && status.correction_fields.length > 0
      ? status.correction_fields
      : null;

  return (
    <PublicPageShell>
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold text-brand-navy dark:text-slate-50">
            Complete seu cadastro
          </h1>
          <p className="text-sm text-brand-graphite dark:text-slate-400">
            {needsCorrection
              ? "Seu coordenador pediu uma correção — revise os dados abaixo."
              : "Preencha seus dados e anexe um documento para concluir seu cadastro na campanha."}
          </p>
        </div>
        {needsCorrection && status.correction_reason && (
          <Card className="border-amber-300 dark:border-amber-700">
            <CardHeader>
              <CardTitle>Correção solicitada</CardTitle>
              <CardDescription>{status.correction_reason}</CardDescription>
            </CardHeader>
          </Card>
        )}
        <PublicRegistrationFlow
          token={token}
          initialStep={initialStep}
          isCorrection={needsCorrection}
          defaultValues={defaultValues}
          editableFields={editableFields}
        />
      </div>
    </PublicPageShell>
  );
}

function PublicPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center bg-surface-page px-4 py-10 dark:bg-slate-900">
      <div className="mb-6 text-lg font-semibold text-brand-navy dark:text-slate-50">
        RH Eleitoral
      </div>
      {children}
    </div>
  );
}
