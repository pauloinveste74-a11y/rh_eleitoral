/**
 * Etapa 2 (autocadastro) — sem schema novo: o coordenador em /meu-cadastro
 * e o cabo eleitoral em /cadastro/[token] preenchem exatamente os mesmos
 * campos e regras de validação de uma pessoa cadastrada pelo admin em
 * /pessoas. Reexporta em vez de duplicar — ver `src/lib/validations/person.ts`.
 */
export {
  personSchema,
  addressSchema,
  bankAccountSchema,
  electoralDataSchema,
  vehicleSchema,
  engagementSchema,
  documentTypes,
  documentTypeLabels,
  isSectionEmpty,
} from "./person";
export type {
  PersonInput,
  AddressInput,
  BankAccountInput,
  ElectoralDataInput,
  VehicleInput,
  EngagementInput,
} from "./person";
