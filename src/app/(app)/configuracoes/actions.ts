"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  axisSchema,
  citySchema,
  teamSchema,
} from "@/lib/validations/territory";
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
