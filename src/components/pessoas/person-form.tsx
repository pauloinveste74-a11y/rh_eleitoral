"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";

import { createPerson, updatePerson } from "@/app/(app)/pessoas/actions";
import {
  initialPersonActionState,
  type PersonActionState,
} from "@/app/(app)/pessoas/action-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export type PersonFormValues = {
  fullName: string;
  socialName: string;
  cpf: string;
  birthDate: string;
  phone: string;
  whatsapp: string;
  email: string;
  zipCode: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  bankCode: string;
  bankName: string;
  agency: string;
  agencyDigit: string;
  accountNumber: string;
  accountDigit: string;
  accountType: string;
  pixKeyType: string;
  pixKey: string;
  voterId: string;
  electoralZone: string;
  electoralSection: string;
  voterCity: string;
  voterState: string;
};

export const emptyPersonFormValues: PersonFormValues = {
  fullName: "",
  socialName: "",
  cpf: "",
  birthDate: "",
  phone: "",
  whatsapp: "",
  email: "",
  zipCode: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  bankCode: "",
  bankName: "",
  agency: "",
  agencyDigit: "",
  accountNumber: "",
  accountDigit: "",
  accountType: "",
  pixKeyType: "",
  pixKey: "",
  voterId: "",
  electoralZone: "",
  electoralSection: "",
  voterCity: "",
  voterState: "",
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-sm text-red-600" role="alert">
      {message}
    </p>
  );
}

export function PersonForm({
  mode,
  personId,
  defaultValues,
  action: actionOverride,
  submitLabel,
  showSocialName = true,
  onSuccess,
  editableFields,
}: {
  mode: "create" | "edit";
  personId?: string;
  defaultValues?: Partial<PersonFormValues>;
  /**
   * Sobrescreve a Server Action padrão (createPerson/updatePerson) — usado
   * por /meu-cadastro (Etapa 2), que reaproveita esta mesma estrutura de
   * formulário para chamar complete_own_registration() em vez de gravar
   * direto na tabela people.
   */
  action?: (
    prevState: PersonActionState,
    formData: FormData,
  ) => Promise<PersonActionState>;
  /** Rótulo do botão de envio quando o padrão ("Cadastrar pessoa"/"Salvar alterações") não se aplica. */
  submitLabel?: string;
  /** complete_own_registration() não tem parâmetro de nome social — oculta o campo nesse caso. */
  showSocialName?: boolean;
  /**
   * Chamado uma vez quando o estado transiciona para "success" — usado pelo
   * autocadastro público (/cadastro/[token]), que avança para a etapa de
   * upload de documento sem recarregar a página.
   */
  onSuccess?: () => void;
  /**
   * Etapa 11 — revisão campo a campo: quando informado (não `null`/`undefined`),
   * só os campos cujas chaves estão nesta lista ficam editáveis — o resto
   * vira somente leitura. Usado por /meu-cadastro e /cadastro/[token]
   * quando people.status = 'correcao_solicitada'/'reenviado', a partir de
   * correction_requests.field_names. `undefined`/`null` (padrão) = tudo
   * editável, comportamento de sempre.
   */
  editableFields?: string[] | null;
}) {
  const action =
    actionOverride ??
    (mode === "edit" && personId
      ? updatePerson.bind(null, personId)
      : createPerson);
  const [state, dispatch, isPending] = useActionState<
    PersonActionState,
    FormData
  >(action, initialPersonActionState);

  const notifiedRef = useRef(false);
  useEffect(() => {
    if (state.status === "success" && !notifiedRef.current) {
      notifiedRef.current = true;
      onSuccess?.();
    }
  }, [state.status, onSuccess]);

  const { register, handleSubmit } = useForm<PersonFormValues>({
    defaultValues: { ...emptyPersonFormValues, ...defaultValues },
  });

  function onSubmit(values: PersonFormValues) {
    const formData = new FormData();
    for (const [key, value] of Object.entries(values)) {
      formData.append(key, value ?? "");
    }
    startTransition(() => {
      dispatch(formData);
    });
  }

  function errorFor(field: string): string | undefined {
    return state.errors?.[field]?.[0];
  }

  // Sem editableFields (undefined/null) = tudo editável, sempre foi assim.
  // Com editableFields = só quem está na lista fica editável; os travados
  // ganham `disabled` (bloqueia interação) mas continuam sendo enviados no
  // submit com o valor de defaultValues — é o react-hook-form que monta o
  // FormData a partir do estado interno, não do HTML do <input>, então um
  // campo disabled não desaparece do payload.
  function isLocked(field: keyof PersonFormValues): boolean {
    return editableFields != null && !editableFields.includes(field);
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-6"
    >
      <Card>
        <CardHeader>
          <CardTitle>Dados pessoais</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="fullName">Nome completo</Label>
            <Input id="fullName" disabled={isLocked("fullName")} {...register("fullName")} />
            <FieldError message={errorFor("fullName")} />
          </div>
          {showSocialName && (
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="socialName">Nome social (opcional)</Label>
              <Input id="socialName" disabled={isLocked("socialName")} {...register("socialName")} />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="cpf">CPF</Label>
            <Input id="cpf" placeholder="000.000.000-00" disabled={isLocked("cpf")} {...register("cpf")} />
            <FieldError message={errorFor("cpf")} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="birthDate">Data de nascimento</Label>
            <Input id="birthDate" type="date" disabled={isLocked("birthDate")} {...register("birthDate")} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input id="phone" disabled={isLocked("phone")} {...register("phone")} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <Input id="whatsapp" disabled={isLocked("whatsapp")} {...register("whatsapp")} />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" disabled={isLocked("email")} {...register("email")} />
            <FieldError message={errorFor("email")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Endereço (opcional)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="zipCode">CEP</Label>
            <Input id="zipCode" disabled={isLocked("zipCode")} {...register("zipCode")} />
            <FieldError message={errorFor("zipCode")} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="state">UF</Label>
            <Input id="state" maxLength={2} disabled={isLocked("state")} {...register("state")} />
            <FieldError message={errorFor("state")} />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="street">Logradouro</Label>
            <Input id="street" disabled={isLocked("street")} {...register("street")} />
            <FieldError message={errorFor("street")} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="number">Número</Label>
            <Input id="number" disabled={isLocked("number")} {...register("number")} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="complement">Complemento</Label>
            <Input id="complement" disabled={isLocked("complement")} {...register("complement")} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="neighborhood">Bairro</Label>
            <Input id="neighborhood" disabled={isLocked("neighborhood")} {...register("neighborhood")} />
            <FieldError message={errorFor("neighborhood")} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="city">Cidade</Label>
            <Input id="city" disabled={isLocked("city")} {...register("city")} />
            <FieldError message={errorFor("city")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dados bancários (opcional)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="bankCode">Código do banco</Label>
            <Input id="bankCode" placeholder="000" disabled={isLocked("bankCode")} {...register("bankCode")} />
            <FieldError message={errorFor("bankCode")} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="bankName">Nome do banco</Label>
            <Input id="bankName" disabled={isLocked("bankName")} {...register("bankName")} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="agency">Agência</Label>
            <Input id="agency" disabled={isLocked("agency")} {...register("agency")} />
            <FieldError message={errorFor("agency")} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="agencyDigit">Dígito da agência</Label>
            <Input id="agencyDigit" disabled={isLocked("agencyDigit")} {...register("agencyDigit")} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="accountNumber">Número da conta</Label>
            <Input id="accountNumber" disabled={isLocked("accountNumber")} {...register("accountNumber")} />
            <FieldError message={errorFor("accountNumber")} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="accountDigit">Dígito da conta</Label>
            <Input id="accountDigit" disabled={isLocked("accountDigit")} {...register("accountDigit")} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="accountType">Tipo de conta</Label>
            <Select id="accountType" disabled={isLocked("accountType")} {...register("accountType")}>
              <option value="">Selecione</option>
              <option value="corrente">Corrente</option>
              <option value="poupanca">Poupança</option>
            </Select>
            <FieldError message={errorFor("accountType")} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="pixKeyType">Tipo de chave PIX</Label>
            <Select id="pixKeyType" disabled={isLocked("pixKeyType")} {...register("pixKeyType")}>
              <option value="">Nenhuma</option>
              <option value="cpf">CPF</option>
              <option value="email">E-mail</option>
              <option value="telefone">Telefone</option>
              <option value="aleatoria">Aleatória</option>
            </Select>
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="pixKey">Chave PIX</Label>
            <Input id="pixKey" disabled={isLocked("pixKey")} {...register("pixKey")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dados eleitorais (opcional)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="voterId">Título de eleitor</Label>
            <Input id="voterId" disabled={isLocked("voterId")} {...register("voterId")} />
            <FieldError message={errorFor("voterId")} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="voterState">UF de votação</Label>
            <Input id="voterState" maxLength={2} disabled={isLocked("voterState")} {...register("voterState")} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="electoralZone">Zona</Label>
            <Input id="electoralZone" disabled={isLocked("electoralZone")} {...register("electoralZone")} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="electoralSection">Seção</Label>
            <Input id="electoralSection" disabled={isLocked("electoralSection")} {...register("electoralSection")} />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="voterCity">Cidade de votação</Label>
            <Input id="voterCity" disabled={isLocked("voterCity")} {...register("voterCity")} />
          </div>
        </CardContent>
      </Card>

      {state.status === "error" && state.message && (
        <p className="text-sm text-red-600" role="alert">
          {state.message}
        </p>
      )}
      {state.status === "success" && (
        <p className="text-sm text-emerald-600" role="status">
          Alterações salvas.
        </p>
      )}

      <div>
        <Button type="submit" disabled={isPending}>
          {isPending
            ? "Salvando..."
            : (submitLabel ??
              (mode === "create" ? "Cadastrar pessoa" : "Salvar alterações"))}
        </Button>
      </div>
    </form>
  );
}
