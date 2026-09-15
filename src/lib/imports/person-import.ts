import "server-only";
import * as XLSX from "xlsx";

import {
  personSchema,
  addressSchema,
  bankAccountSchema,
  electoralDataSchema,
  vehicleSchema,
  isSectionEmpty,
} from "@/lib/validations/registration";
import { sanitizeCpf } from "@/lib/validations/cpf";
import { HEADER_TO_KEY, normalizeHeader, SHEET_JOIN_KEY } from "./columns";

/**
 * Importação em lote por Excel (Etapa 6, estendida pra multi-planilha).
 * Reaproveita exatamente os mesmos schemas de /pessoas e /meu-cadastro — uma
 * pessoa consolidada é validada com a mesma régua de um cadastro manual, sem
 * regra duplicada. O cabeçalho aceito vive em ./columns.ts (esse arquivo aqui
 * não pode ser importado por um Client Component — depende de "xlsx"/"server-only").
 */

const PERSON_KEYS = ["fullName", "cpf", "rg", "birthDate", "phone", "whatsapp", "email"];
const ADDRESS_KEYS = [
  "zipCode",
  "street",
  "number",
  "complement",
  "neighborhood",
  "city",
  "state",
];
const BANK_KEYS = [
  "bankCode",
  "bankName",
  "agency",
  "agencyDigit",
  "accountNumber",
  "accountDigit",
  "accountType",
  "pixKeyType",
  "pixKey",
];
const ELECTORAL_KEYS = [
  "voterId",
  "electoralZone",
  "electoralSection",
  "voterCity",
  "voterState",
];
const VEHICLE_KEYS = ["vehicleBrand", "vehicleModel", "vehiclePlate", "vehicleRenavam"];

export type ImportRowResult =
  | "pronta"
  | "invalida"
  | "duplicada_arquivo"
  | "ja_existente";

export type ImportRowError = { field: string | null; message: string };

export type ClassifiedRow = {
  rowNumber: number;
  rawData: Record<string, string>;
  normalizedData: Record<string, unknown> | null;
  result: ImportRowResult;
  cpf: string | null;
  fullName: string | null;
  errors: ImportRowError[];
  /** Avisos não bloqueantes (ex.: valor divergente entre abas) — não impedem a linha de ficar "pronta". */
  warnings: ImportRowError[];
};

/** Mapas de referência (por campanha) usados para resolver eixo/coordenador/função por nome. */
export type ImportReferenceMaps = {
  axisIdByName: Map<string, string>;
  jobFunctionIdByName: Map<string, string>;
  /** Nome normalizado -> lista de IDs de pessoas ativas com esse nome (mais de um = ambíguo). */
  activePeopleByName: Map<string, string[]>;
};

function parseSheetRows(
  workbook: XLSX.WorkBook,
  sheetName: string,
): Record<string, string>[] {
  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });
  const [headerRow, ...dataRows] = matrix;
  if (!headerRow) return [];

  const columnKeys = headerRow.map((h) => HEADER_TO_KEY.get(normalizeHeader(String(h))) ?? null);

  return dataRows
    .filter((row) => row.some((cell) => String(cell ?? "").trim() !== ""))
    .map((row) => {
      const mapped: Record<string, string> = {};
      columnKeys.forEach((key, i) => {
        if (key) mapped[key] = String(row[i] ?? "").trim();
      });
      return mapped;
    });
}

export type WorkbookParseResult = {
  /** Uma entrada por CPF encontrado em qualquer aba, já com os campos de todas as abas mesclados. */
  mergedRows: { rawData: Record<string, string>; warnings: ImportRowError[] }[];
  /** Avisos de nível de arquivo (ex.: aba sem coluna CPF, ignorada por completo). */
  fileWarnings: string[];
};

/**
 * Lê TODAS as abas do arquivo (não só a primeira) e consolida por CPF: toda
 * aba que tiver uma coluna CPF contribui seus campos pra pessoa daquele CPF,
 * não importa em qual aba cada campo apareceu (dados pessoais, endereço,
 * eixo, veículo... podem estar em abas separadas). Regra de mesclagem:
 * primeiro valor não-vazio encontrado (na ordem das abas) vence; um valor
 * diferente e também não-vazio encontrado depois vira aviso não bloqueante,
 * nunca sobrescreve silenciosamente. Aba sem coluna CPF nenhuma é ignorada
 * por completo (suas linhas não têm como ser associadas a ninguém).
 */
export function parseWorkbookAllSheets(buffer: ArrayBuffer): WorkbookParseResult {
  const workbook = XLSX.read(buffer, { type: "array" });
  const fileWarnings: string[] = [];
  const byCpf = new Map<string, { rawData: Record<string, string>; warnings: ImportRowError[] }>();

  for (const sheetName of workbook.SheetNames) {
    const rows = parseSheetRows(workbook, sheetName);
    if (rows.length === 0) continue;

    const hasCpfColumn = rows.some((row) => SHEET_JOIN_KEY in row);
    if (!hasCpfColumn) {
      fileWarnings.push(`Aba "${sheetName}" não tem coluna de CPF — ignorada por completo.`);
      continue;
    }

    for (const row of rows) {
      const rawCpf = row[SHEET_JOIN_KEY];
      if (!rawCpf) continue;
      const cpfKey = sanitizeCpf(rawCpf);
      if (!cpfKey) continue;

      let entry = byCpf.get(cpfKey);
      if (!entry) {
        entry = { rawData: {}, warnings: [] };
        byCpf.set(cpfKey, entry);
      }

      for (const [field, value] of Object.entries(row)) {
        if (!value) continue;
        const existing = entry.rawData[field];
        if (existing === undefined || existing === "") {
          entry.rawData[field] = value;
        } else if (existing !== value) {
          entry.warnings.push({
            field,
            message: `Valor divergente encontrado na aba "${sheetName}" ("${value}") — mantido o primeiro valor visto ("${existing}").`,
          });
        }
      }
    }
  }

  return {
    mergedRows: [...byCpf.values()],
    fileWarnings,
  };
}

function fieldsOf(row: Record<string, string>, keys: string[]): Record<string, string> {
  return Object.fromEntries(keys.map((k) => [k, row[k] ?? ""]));
}

/**
 * Classifica uma pessoa já mesclada (parseWorkbookAllSheets) contra os
 * mesmos schemas de pessoa/endereço/banco/eleitoral/veículo, contra os CPFs
 * já vistos (no arquivo e no banco) e resolve eixo/coordenador/função pelos
 * mapas de referência da campanha — não grava nada, só decide o `result`.
 */
export function classifyRow(
  rowNumber: number,
  rawData: Record<string, string>,
  cpfsSeenInFile: Set<string>,
  cpfsExistingInCampaign: Set<string>,
  refs: ImportReferenceMaps,
  mergeWarnings: ImportRowError[] = [],
): ClassifiedRow {
  const errors: ImportRowError[] = [];

  const personParsed = personSchema.safeParse(fieldsOf(rawData, PERSON_KEYS));
  if (!personParsed.success) {
    for (const [field, messages] of Object.entries(personParsed.error.flatten().fieldErrors)) {
      for (const message of messages ?? []) errors.push({ field, message });
    }
  }

  const addressRaw = fieldsOf(rawData, ADDRESS_KEYS);
  const addressPresent = !isSectionEmpty(addressRaw);
  const addressParsed = addressPresent ? addressSchema.safeParse(addressRaw) : null;
  if (addressParsed && !addressParsed.success) {
    for (const [field, messages] of Object.entries(addressParsed.error.flatten().fieldErrors)) {
      for (const message of messages ?? []) errors.push({ field, message });
    }
  }

  const bankRaw = fieldsOf(rawData, BANK_KEYS);
  const bankPresent = !isSectionEmpty(bankRaw);
  const bankParsed = bankPresent ? bankAccountSchema.safeParse(bankRaw) : null;
  if (bankParsed && !bankParsed.success) {
    for (const [field, messages] of Object.entries(bankParsed.error.flatten().fieldErrors)) {
      for (const message of messages ?? []) errors.push({ field, message });
    }
  }

  const electoralRaw = fieldsOf(rawData, ELECTORAL_KEYS);
  const electoralPresent = !isSectionEmpty(electoralRaw);
  const electoralParsed = electoralPresent
    ? electoralDataSchema.safeParse(electoralRaw)
    : null;
  if (electoralParsed && !electoralParsed.success) {
    for (const [field, messages] of Object.entries(electoralParsed.error.flatten().fieldErrors)) {
      for (const message of messages ?? []) errors.push({ field, message });
    }
  }

  const vehicleRawFields = fieldsOf(rawData, VEHICLE_KEYS);
  const vehicleRaw = {
    brand: vehicleRawFields.vehicleBrand,
    model: vehicleRawFields.vehicleModel,
    plate: vehicleRawFields.vehiclePlate,
    renavam: vehicleRawFields.vehicleRenavam,
  };
  const vehiclePresent = !isSectionEmpty(vehicleRawFields);
  const vehicleParsed = vehiclePresent ? vehicleSchema.safeParse(vehicleRaw) : null;
  if (vehicleParsed && !vehicleParsed.success) {
    for (const [field, messages] of Object.entries(vehicleParsed.error.flatten().fieldErrors)) {
      for (const message of messages ?? []) errors.push({ field: `vehicle.${field}`, message });
    }
  }

  let axisId: string | null = null;
  const axisName = rawData.axisName?.trim();
  if (axisName) {
    const found = refs.axisIdByName.get(normalizeHeader(axisName));
    if (!found) {
      errors.push({
        field: "axisName",
        message: `Eixo não encontrado: "${axisName}" — cadastre o eixo antes de importar.`,
      });
    } else {
      axisId = found;
    }
  }

  let jobFunctionId: string | null = null;
  const jobFunctionName = rawData.jobFunctionName?.trim();
  if (jobFunctionName) {
    const found = refs.jobFunctionIdByName.get(normalizeHeader(jobFunctionName));
    if (!found) {
      // Não deveria acontecer — uploadImportBatch() já cria os cargos
      // ausentes antes de chamar classifyRow(). Mantido como rede de
      // segurança caso essa etapa seja pulada por algum motivo.
      errors.push({ field: "jobFunctionName", message: `Função não encontrada: "${jobFunctionName}".` });
    } else {
      jobFunctionId = found;
    }
  }

  let coordinatorPersonId: string | null = null;
  const coordinatorName = rawData.coordinatorName?.trim();
  if (coordinatorName) {
    const matches = refs.activePeopleByName.get(normalizeHeader(coordinatorName)) ?? [];
    if (matches.length === 0) {
      errors.push({
        field: "coordinatorName",
        message: `Coordenador não encontrado: "${coordinatorName}".`,
      });
    } else if (matches.length > 1) {
      errors.push({
        field: "coordinatorName",
        message: `Nome de coordenador ambíguo — ${matches.length} pessoas ativas com o nome "${coordinatorName}".`,
      });
    } else {
      coordinatorPersonId = matches[0];
    }
  }

  const fullName = rawData.fullName?.trim() || null;

  if (errors.length > 0 || !personParsed.success) {
    return {
      rowNumber,
      rawData,
      normalizedData: null,
      result: "invalida",
      cpf: null,
      fullName,
      errors,
      warnings: mergeWarnings,
    };
  }

  const cpf = personParsed.data.cpf;

  if (cpfsSeenInFile.has(cpf)) {
    return {
      rowNumber,
      rawData,
      normalizedData: null,
      result: "duplicada_arquivo",
      cpf,
      fullName,
      errors: [{ field: "cpf", message: "CPF repetido em outra linha deste arquivo." }],
      warnings: mergeWarnings,
    };
  }
  cpfsSeenInFile.add(cpf);

  if (cpfsExistingInCampaign.has(cpf)) {
    return {
      rowNumber,
      rawData,
      normalizedData: null,
      result: "ja_existente",
      cpf,
      fullName,
      errors: [{ field: "cpf", message: "Já existe uma pessoa ativa com este CPF nesta campanha." }],
      warnings: mergeWarnings,
    };
  }

  const normalizedData: Record<string, unknown> = { person: personParsed.data };
  if (addressPresent && addressParsed?.success) normalizedData.address = addressParsed.data;
  if (bankPresent && bankParsed?.success) normalizedData.bank = bankParsed.data;
  if (electoralPresent && electoralParsed?.success) normalizedData.electoral = electoralParsed.data;
  if (vehiclePresent && vehicleParsed?.success) normalizedData.vehicle = vehicleParsed.data;
  if (axisId) normalizedData.axisId = axisId;
  if (jobFunctionId) normalizedData.jobFunctionId = jobFunctionId;
  if (coordinatorPersonId) normalizedData.coordinatorPersonId = coordinatorPersonId;

  return {
    rowNumber,
    rawData,
    normalizedData,
    result: "pronta",
    cpf,
    fullName,
    errors: [],
    warnings: mergeWarnings,
  };
}
