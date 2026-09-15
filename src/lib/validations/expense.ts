import { z } from "zod";

export const expenseCategories = [
  "combustivel",
  "material",
  "alimentacao",
  "transporte",
  "hospedagem",
  "outro",
] as const;

export const expenseCategoryLabels: Record<(typeof expenseCategories)[number], string> = {
  combustivel: "Combustível",
  material: "Material",
  alimentacao: "Alimentação",
  transporte: "Transporte",
  hospedagem: "Hospedagem",
  outro: "Outro",
};

export const paymentMethods = [
  "pix",
  "transferencia",
  "dinheiro",
  "cartao",
  "boleto",
  "outro",
] as const;

export const paymentMethodLabels: Record<(typeof paymentMethods)[number], string> = {
  pix: "Pix",
  transferencia: "Transferência",
  dinheiro: "Dinheiro",
  cartao: "Cartão",
  boleto: "Boleto",
  outro: "Outro",
};

export const authorizationChannels = [
  "presencial",
  "whatsapp",
  "telefone",
  "sistema",
  "outro",
] as const;

export const authorizationChannelLabels: Record<(typeof authorizationChannels)[number], string> = {
  presencial: "Presencial",
  whatsapp: "WhatsApp",
  telefone: "Telefone",
  sistema: "Sistema",
  outro: "Outro",
};

/**
 * Etapa 7 — despesa com autorizador de registro (seção da spec original).
 * `categoryId` substitui o antigo `category` na tela (o texto legado ainda
 * existe na tabela, derivado de `expense_categories.code` na Server Action,
 * pra não quebrar `create_expense()`/relatórios que leem a coluna antiga).
 * O autorizador é obrigatório e vem de exatamente um dos dois caminhos:
 * uma pessoa do sistema (`authorizedByProfileId`) ou alguém não
 * identificado no sistema (nome + motivo em texto livre).
 */
export const expenseSchema = z
  .object({
    personId: z.uuid({ error: "Selecione a pessoa." }),
    categoryId: z.uuid({ error: "Selecione a categoria." }),
    amountReais: z
      .string()
      .trim()
      .refine((v) => v !== "" && !Number.isNaN(Number(v)) && Number(v) > 0, {
        error: "Informe um valor válido, maior que zero.",
      })
      .transform((v) => Math.round(Number(v) * 100)),
    purpose: z
      .string()
      .trim()
      .min(3, { error: "Descreva o motivo do gasto." })
      .max(300),
    expenseDate: z.string().refine((v) => v !== "" && !Number.isNaN(Date.parse(v)), {
      error: "Informe a data da despesa.",
    }),
    vendorName: z.string().trim().max(200).optional().or(z.literal("")),
    vendorDocument: z.string().trim().max(30).optional().or(z.literal("")),
    paymentMethod: z.enum(paymentMethods, { error: "Selecione a forma de pagamento." }),
    purchaserPersonId: z.string().optional().or(z.literal("")),
    authorizerType: z.enum(["sistema", "nao_identificado"], {
      error: "Informe quem autorizou o gasto.",
    }),
    authorizedByProfileId: z.string().optional().or(z.literal("")),
    unidentifiedAuthorizerName: z.string().trim().max(200).optional().or(z.literal("")),
    unidentifiedAuthorizerPhone: z.string().trim().max(20).optional().or(z.literal("")),
    unidentifiedAuthorizerReason: z.string().trim().max(300).optional().or(z.literal("")),
    authorizationChannel: z.enum(authorizationChannels, {
      error: "Selecione o canal de autorização.",
    }),
    // Nova versão (Etapa 6) — valor efetivamente aprovado pelo autorizador,
    // quando diferente do solicitado (spec 13.1). Opcional: em branco,
    // create_expense() usa o mesmo valor pedido (comportamento anterior).
    authorizedAmountReais: z
      .string()
      .trim()
      .optional()
      .or(z.literal(""))
      .refine((v) => !v || (!Number.isNaN(Number(v)) && Number(v) >= 0), {
        error: "Informe um valor válido.",
      }),
  })
  .superRefine((data, ctx) => {
    if (data.authorizerType === "sistema" && !data.authorizedByProfileId) {
      ctx.addIssue({
        code: "custom",
        path: ["authorizedByProfileId"],
        message: "Selecione quem autorizou.",
      });
    }
    if (data.authorizerType === "nao_identificado") {
      if (!data.unidentifiedAuthorizerName) {
        ctx.addIssue({
          code: "custom",
          path: ["unidentifiedAuthorizerName"],
          message: "Informe o nome de quem autorizou.",
        });
      }
      if (!data.unidentifiedAuthorizerReason) {
        ctx.addIssue({
          code: "custom",
          path: ["unidentifiedAuthorizerReason"],
          message: "Informe por que essa pessoa não está no sistema.",
        });
      }
    }
  });
export type ExpenseInput = z.infer<typeof expenseSchema>;

/**
 * Etapa 8 — regra de alçada (expense_authorization_rules, criada na
 * Etapa 1). Só por papel nesta etapa (não por pessoa específica) — a
 * coluna `profile_id` fica pronta no banco pra uma regra futura mais fina,
 * mas a tela só cria regra por papel, caso de uso mais comum.
 */
export const alcadaRuleSchema = z
  .object({
    scopeType: z.enum(["papel", "pessoa"], { error: "Selecione o tipo de regra." }),
    roleId: z.string().optional().or(z.literal("")),
    profileId: z.string().optional().or(z.literal("")),
    maxAmountReais: z
      .string()
      .trim()
      .refine((v) => v !== "" && !Number.isNaN(Number(v)) && Number(v) > 0, {
        error: "Informe um valor válido, maior que zero.",
      })
      .transform((v) => Math.round(Number(v) * 100)),
    axisId: z.string().optional().or(z.literal("")),
    cityId: z.string().optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.scopeType === "papel" && !data.roleId) {
      ctx.addIssue({ code: "custom", path: ["roleId"], message: "Selecione o papel." });
    }
    if (data.scopeType === "pessoa" && !data.profileId) {
      ctx.addIssue({ code: "custom", path: ["profileId"], message: "Selecione a pessoa." });
    }
  });
export type AlcadaRuleInput = z.infer<typeof alcadaRuleSchema>;
