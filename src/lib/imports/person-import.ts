import "server-only";
import * as XLSX from "xlsx";

import {
  personSchema,
  addressSchema,
  bankAccountSchema,
  electoralDataSchema,
  isSectionEmpty,
} from "@/lib/validations/registration";
import { HEADER_TO_KEY, normalizeHeader } from "./columns";

/**
 * Importação em lote por Excel (Etapa 6). Reaproveita exatamente os mesmos
 * schemas de /pessoas e /meu-cadastro — uma linha da planilha é validada com
 * a mesma régua de um cadastro manual, sem regra duplicada. O cabeçalho
 * aceito vive em ./columns.ts (esse arquivo aqui não pode ser importado por
 * um Client Component — depende de "xlsx"/"server-only").
 */

const PERSON_KEYS = ["fullName", "cpf", "birthDate", "phone", "whatsapp", "email"];
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
};

/**
 * Lê o arquivo (buffer do upload) e devolve uma linha por linha de dados da
 * planilha, já com as chaves internas (fullName, cpf, ...) — sem nenhuma
 * validação ainda, só leitura bruta. Primeira aba, primeira linha = cabeçalho.
 */
export function parseWorkbook(buffer: ArrayBuffer): Record<string, string>[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];

  // header: 1 -> matriz de arrays (linha 0 = cabeçalho), em vez de objetos
  // chaveados pelo texto exato do cabeçalho — dá controle total sobre o
  // casamento de coluna via normalizeHeader().
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

function fieldsOf(row: Record<string, string>, keys: string[]): Record<string, string> {
  return Object.fromEntries(keys.map((k) => [k, row[k] ?? ""]));
}

/**
 * Classifica uma linha já mapeada (parseWorkbook) contra os mesmos schemas
 * de pessoa/endereço/banco/eleitoral e contra os CPFs já vistos (no
 * arquivo e no banco) — não grava nada, só decide o `result`.
 */
export function classifyRow(
  rowNumber: number,
  rawData: Record<string, string>,
  cpfsSeenInFile: Set<string>,
  cpfsExistingInCampaign: Set<string>,
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
    };
  }

  const normalizedData: Record<string, unknown> = { person: personParsed.data };
  if (addressPresent && addressParsed?.success) normalizedData.address = addressParsed.data;
  if (bankPresent && bankParsed?.success) normalizedData.bank = bankParsed.data;
  if (electoralPresent && electoralParsed?.success) normalizedData.electoral = electoralParsed.data;

  return {
    rowNumber,
    rawData,
    normalizedData,
    result: "pronta",
    cpf,
    fullName,
    errors: [],
  };
}
