"use client";

import { startTransition, useActionState } from "react";
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
}: {
  mode: "create" | "edit";
  personId?: string;
  defaultValues?: Partial<PersonFormValues>;
}) {
  const action =
    mode === "edit" && personId
      ? updatePerson.bind(null, personId)
      : createPerson;
  const [state, dispatch, isPending] = useActionState<
    PersonActionState,
    FormData
  >(action, initialPersonActionState);

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
            <Input id="fullName" {...register("fullName")} />
            <FieldError message={errorFor("fullName")} />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="socialName">Nome social (opcional)</Label>
            <Input id="socialName" {...register("socialName")} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="cpf">CPF</Label>
            <Input id="cpf" placeholder="000.000.000-00" {...register("cpf")} />
            <FieldError message={errorFor("cpf")} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="birthDate">Data de nascimento</Label>
            <Input id="birthDate" type="date" {...register("birthDate")} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input id="phone" {...register("phone")} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <Input id="whatsapp" {...register("whatsapp")} />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" {...register("email")} />
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
            <Input id="zipCode" {...register("zipCode")} />
            <FieldError message={errorFor("zipCode")} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="state">UF</Label>
            <Input id="state" maxLength={2} {...register("state")} />
            <FieldError message={errorFor("state")} />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="street">Logradouro</Label>
            <Input id="street" {...register("street")} />
            <FieldError message={errorFor("street")} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="number">Número</Label>
            <Input id="number" {...register("number")} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="complement">Complemento</Label>
            <Input id="complement" {...register("complement")} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="neighborhood">Bairro</Label>
            <Input id="neighborhood" {...register("neighborhood")} />
            <FieldError message={errorFor("neighborhood")} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="city">Cidade</Label>
            <Input id="city" {...register("city")} />
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
            <Input id="bankCode" placeholder="000" {...register("bankCode")} />
            <FieldError message={errorFor("bankCode")} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="bankName">Nome do banco</Label>
            <Input id="bankName" {...register("bankName")} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="agency">Agência</Label>
            <Input id="agency" {...register("agency")} />
            <FieldError message={errorFor("agency")} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="agencyDigit">Dígito da agência</Label>
            <Input id="agencyDigit" {...register("agencyDigit")} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="accountNumber">Número da conta</Label>
            <Input id="accountNumber" {...register("accountNumber")} />
            <FieldError message={errorFor("accountNumber")} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="accountDigit">Dígito da conta</Label>
            <Input id="accountDigit" {...register("accountDigit")} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="accountType">Tipo de conta</Label>
            <Select id="accountType" {...register("accountType")}>
              <option value="">Selecione</option>
              <option value="corrente">Corrente</option>
              <option value="poupanca">Poupança</option>
            </Select>
            <FieldError message={errorFor("accountType")} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="pixKeyType">Tipo de chave PIX</Label>
            <Select id="pixKeyType" {...register("pixKeyType")}>
              <option value="">Nenhuma</option>
              <option value="cpf">CPF</option>
              <option value="email">E-mail</option>
              <option value="telefone">Telefone</option>
              <option value="aleatoria">Aleatória</option>
            </Select>
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="pixKey">Chave PIX</Label>
            <Input id="pixKey" {...register("pixKey")} />
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
            <Input id="voterId" {...register("voterId")} />
            <FieldError message={errorFor("voterId")} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="voterState">UF de votação</Label>
            <Input id="voterState" maxLength={2} {...register("voterState")} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="electoralZone">Zona</Label>
            <Input id="electoralZone" {...register("electoralZone")} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="electoralSection">Seção</Label>
            <Input id="electoralSection" {...register("electoralSection")} />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="voterCity">Cidade de votação</Label>
            <Input id="voterCity" {...register("voterCity")} />
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
            : mode === "create"
              ? "Cadastrar pessoa"
              : "Salvar alterações"}
        </Button>
      </div>
    </form>
  );
}
