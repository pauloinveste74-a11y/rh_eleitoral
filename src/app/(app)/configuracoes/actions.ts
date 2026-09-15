"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  axisSchema,
  citySchema,
  teamSchema,
} from "@/lib/validations/territory";
import { jobFunctionSchema } from "@/lib/validations/job-function";
import type { TerritoryActionState } from "./action-state";

function fieldsOf(formData: FormData, names: string[]): Record<string, string> {
  return Object.fromEntries(
    names.map((name) => [name, String(formData.get(name) ?? "")]),
  );
}

export async function createAxis(
  _prevState: TerritoryActionState,
  formData: FormData,
): Promise<TerritoryActionState> {
  const parsed = axisSchema.safeParse(fieldsOf(formData, ["name", "code"]));
  if (!parsed.success) {
    return {
      status: "error",
      errors: parsed.error.flatten().fieldErrors,
      message: "Corrija os campos destacados.",
    };
  }

  const supabase = await createClient();
  const { data: campaignId, error: campaignError } = await supabase.rpc(
    "current_campaign_id",
  );
  if (campaignError || !campaignId) {
    return {
      status: "error",
      message: "Não foi possível identificar sua campanha.",
    };
  }

  const { error } = await supabase.from("axes").insert({
    campaign_id: campaignId,
    name: parsed.data.name,
    code: parsed.data.code,
  });

  if (error) {
    if (error.code === "23505") {
      return {
        status: "error",
        errors: { code: ["Já existe um eixo com esse código."] },
      };
    }
    return { status: "error", message: "Não foi possível criar o eixo." };
  }

  revalidatePath("/configuracoes");
  return { status: "success" };
}

export async function createCity(
  _prevState: TerritoryActionState,
  formData: FormData,
): Promise<TerritoryActionState> {
  const parsed = citySchema.safeParse(
    fieldsOf(formData, ["axisId", "name", "state", "isAdministrativeRegion"]),
  );
  if (!parsed.success) {
    return {
      status: "error",
      errors: parsed.error.flatten().fieldErrors,
      message: "Corrija os campos destacados.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("cities").insert({
    axis_id: parsed.data.axisId,
    name: parsed.data.name,
    state: parsed.data.state,
    is_administrative_region: parsed.data.isAdministrativeRegion,
  });

  if (error) {
    if (error.code === "23505") {
      return {
        status: "error",
        errors: { name: ["Já existe uma cidade com esse nome nesse eixo."] },
      };
    }
    return { status: "error", message: "Não foi possível criar a cidade." };
  }

  revalidatePath("/configuracoes");
  return { status: "success" };
}

/**
 * Cargo/função de trabalho (Nova versão, spec seção 4.1) — só
 * administrador cria (RLS de job_functions, mesmo padrão de
 * axes/cities/teams).
 */
export async function createJobFunction(
  _prevState: TerritoryActionState,
  formData: FormData,
): Promise<TerritoryActionState> {
  const parsed = jobFunctionSchema.safeParse(
    fieldsOf(formData, [
      "name",
      "description",
      "category",
      "contractType",
      "workloadReference",
      "salaryRangeMinReais",
      "salaryRangeMaxReais",
      "requiresCoordinator",
    ]),
  );
  if (!parsed.success) {
    return {
      status: "error",
      errors: parsed.error.flatten().fieldErrors,
      message: "Corrija os campos destacados.",
    };
  }

  const supabase = await createClient();
  const { data: campaignId, error: campaignError } = await supabase.rpc(
    "current_campaign_id",
  );
  if (campaignError || !campaignId) {
    return {
      status: "error",
      message: "Não foi possível identificar sua campanha.",
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("job_functions").insert({
    campaign_id: campaignId,
    name: parsed.data.name,
    description: parsed.data.description || null,
    category: parsed.data.category || null,
    contract_type: parsed.data.contractType,
    workload_reference: parsed.data.workloadReference || null,
    salary_range_min_cents: parsed.data.salaryRangeMinCents,
    salary_range_max_cents: parsed.data.salaryRangeMaxCents,
    requires_coordinator: parsed.data.requiresCoordinator,
    created_by: user?.id ?? null,
  });

  if (error) {
    if (error.code === "23505") {
      return {
        status: "error",
        errors: { name: ["Já existe um cargo com esse nome nesta campanha."] },
      };
    }
    return { status: "error", message: "Não foi possível criar o cargo." };
  }

  revalidatePath("/configuracoes");
  return { status: "success" };
}

export async function createTeam(
  _prevState: TerritoryActionState,
  formData: FormData,
): Promise<TerritoryActionState> {
  const parsed = teamSchema.safeParse(fieldsOf(formData, ["cityId", "name"]));
  if (!parsed.success) {
    return {
      status: "error",
      errors: parsed.error.flatten().fieldErrors,
      message: "Corrija os campos destacados.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("teams").insert({
    city_id: parsed.data.cityId,
    name: parsed.data.name,
  });

  if (error) {
    if (error.code === "23505") {
      return {
        status: "error",
        errors: { name: ["Já existe uma equipe com esse nome nessa cidade."] },
      };
    }
    return { status: "error", message: "Não foi possível criar a equipe." };
  }

  revalidatePath("/configuracoes");
  return { status: "success" };
}
