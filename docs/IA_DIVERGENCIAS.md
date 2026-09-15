# IA (OpenAI) para checagem de dados

> Pedido do usuário: uma "central inteligente" que cruza dados da
> importação (planilha/PDF) contra cadastros já existentes e contra o
> documento de identidade anexado, avisando o administrador de
> divergências (ex.: mesmo CPF com nomes diferentes) — e, depois,
> avisando de pagamento fora do previsto no contrato, com prazo pra
> decidir. Combinado inicialmente API da Anthropic (Claude); o usuário
> colou uma chave da OpenAI ("sk-proj-...", formato incompatível com a
> Anthropic) e confirmou que era pra usar OpenAI mesmo — o cliente foi
> trocado (`@anthropic-ai/sdk` → `openai`) antes de qualquer coisa ir
> pro ar. As duas partes planejadas juntas, implementadas uma etapa de
> cada vez.

## Etapa A — divergência de nome/CPF + verificação de documento por IA (concluída)

- **`data_conflicts`** existia desde a migração `0018`, nunca usada por
  nenhum código — reaproveitada quase como está. Migração `0038`
  acrescentou os `conflict_type` `'documento_divergente'` (achado da
  IA) e `'pagamento_divergente_contrato'` (Etapa B) ao `CHECK` já
  existente, e a coluna `due_at` (prazo de resolução, usada pela Etapa
  B — a divergência de cadastro da Etapa A não define prazo).
- **Detecção determinística, sem IA, gratuita**: ao importar planilha
  ou PDF (`uploadImportBatch()`/`uploadPdfImportBatch()`,
  `src/app/(app)/importacoes/actions.ts`), quando uma linha bate com
  CPF já cadastrado na campanha mas o nome (normalizado — minúsculas,
  sem acento, `src/lib/imports/name-match.ts`) diverge do nome já
  cadastrado, grava uma linha em `data_conflicts`
  (`conflict_type: 'dado_divergente'`) em vez de só marcar
  `'ja_existente'` como antes — sem mudar o comportamento existente,
  só somando o registro da divergência.
- **`resolve_data_conflict(p_conflict_id, p_resolution, p_note,
  p_apply_correction, p_corrected_name)`** (migração `0038`) — só
  admin/rh da campanha, conflito precisa estar
  `pendente`/`em_analise`. Aplica a correção em `people.full_name`
  **só** quando `p_apply_correction = true` (nunca mexe em CPF/dados
  bancários) — mesma cautela da spec 9.2 sobre nunca sobrescrever
  campo sensível sem confirmação humana explícita.
- **Cliente OpenAI, do zero** (`src/lib/ai/`) — nenhuma infraestrutura
  de IA existia neste projeto antes. `openai-client.ts`
  (`getOpenAiClient()`, mesmo formato de erro de
  `src/lib/supabase/admin.ts` quando falta a chave) +
  `document-cross-check.ts` (`crossCheckIdentityDocument()` — usa a
  Responses API (`client.responses.create`), manda o RG/CNH via bloco
  `input_image`/`input_file` nativo, resposta sempre estruturada via
  *Structured Outputs* (`text.format: {type: "json_schema", strict:
  true}`), nunca parsing de texto livre. Modelo `gpt-5.4-mini`
  (camada "mini", custo baixo, suficiente pra ler um documento de
  identidade — trocar a constante `MODEL` no arquivo se a OpenAI
  descontinuar/renomear).
- **`/divergencias`** (nova, item de navegação próprio): lista
  conflitos pendentes da campanha. Botão **"Verificar com IA"** (só
  aparece quando a pessoa tem RG/CNH cadastrado) roda a checagem **sob
  demanda** — nunca automática a cada upload, de propósito, por custo
  (chamada paga por uso) e previsibilidade; mantém a decisão final
  sempre com uma pessoa. Botões de resolução (aceitar o nome
  importado/manter o cadastrado/descartar) chamam
  `resolve_data_conflict()`.
- **Achado e corrigido de quebra**: `documentTypes`/
  `documentTypeLabels` (`src/lib/validations/person.ts`) só tinham 6
  dos 10 tipos de documento que o banco aceita desde a migração `0019`
  — faltava `cnh` (que esta etapa precisa pra achar o documento certo
  pra verificar), `comprovante_bancario`, `contrato`, `certidao`.
  `src/types/database.ts` também estava com o `document_type` de
  `person_documents` desatualizado (só os 6 originais) — os dois
  corrigidos pra bater com o `CHECK` real do banco.
- **Verificado**: transação de teste (`rollback`) — conflito criado,
  `resolve_data_conflict()` aplicando a correção só quando
  `p_apply_correction=true`, tentar resolver um conflito já resolvido
  rejeitado corretamente. `npm run typecheck`/`lint`/`build` sem
  erros. Advisors sem achado novo além do padrão de sempre.
- **`OPENAI_API_KEY` configurada** em `.env.local` e no Vercel
  (15/09/2026) — mesmo processo já usado pra
  `SUPABASE_SERVICE_ROLE_KEY`. Testada ao vivo com uma chamada real à
  API (imagem de 1×1 pixel, só pra confirmar chave/modelo/formato da
  chamada — resposta estruturada recebida corretamente, então o
  pipeline está certo). **Achado no mesmo teste**: a conta da OpenAI
  está **sem crédito** ("You have no credits remaining") — o botão
  "Verificar com IA" vai retornar esse erro até o usuário adicionar
  crédito em platform.openai.com/settings/organization/billing. O
  resto de `/divergencias` funciona normalmente enquanto isso (a
  detecção determinística de nome divergente independe da IA).

## Etapa B — conciliação contrato × pagamento (planejada, não iniciada)

`contracts` não tem campo de carga horária; `payments` não tem
`contract_id` nem período — hoje são tabelas desconectadas (achado da
investigação antes do plano). Precisa de migração nova
(`contracts.daily_hours`, `payments.contract_id`/`hours_covered`/
`period_start`/`period_end`) antes de comparar qualquer coisa. Ao
marcar um pagamento como pago, se as horas cobertas divergirem do
esperado pelo contrato além de uma tolerância, grava
`data_conflicts` (`conflict_type: 'pagamento_divergente_contrato'`,
`due_at` preenchido). Resolução só **registra a decisão**
(ajustar contrato / estornar pagamento) — não mexe em dinheiro nem
gera contrato novo sozinho, o administrador continua usando
`/contratos`/`/financeiro` pra executar.

## Fora de escopo (documentado, não esquecido)

- IA automática em todo upload (fica sob demanda).
- Correspondência difusa de nome (Levenshtein/soundex) — só igualdade
  normalizada por ora; `import_staging_records` já tem os valores
  `'possivel_duplicidade'`/`'conflitante'` prontos no schema, não
  usados ainda.
- Notificação por e-mail/WhatsApp quando uma divergência é criada — a
  tabela `notifications` segue sem uso (código morto desde a migração
  `0021`).
- Central de pendências consolidada — `/divergencias` é uma fila nova,
  separada de `/validacoes`/`/aprovacoes`, não uma consolidação.
