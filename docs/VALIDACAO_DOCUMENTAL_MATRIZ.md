# Validação documental, OCR e base mestra + biblioteca jurídica de contratos — matriz requisito × estado real

> Análise conjunta de dois cadernos, a pedido do usuário ("faça a
> análise dos dois cadernos para implantarmos no nosso sistema"),
> antes de qualquer código — mesma disciplina de
> `docs/NOVA_VERSAO_MATRIZ.md`, `docs/MULTI_TENANT.md`,
> `docs/IA_DIVERGENCIAS.md` e `docs/CENTRAL_INTELIGENCIA_RH_MATRIZ.md`.
>
> - **Caderno A** — `docs/CADERNO_DOCUMENTAL_JURIDICO_CONTRATOS_RH_ELEITORAL.md`
>   (45 seções). Uma fatia dele (cabeçalho/rodapé + variáveis
>   `{{organizacao_*}}`) já foi implementada — ver
>   `docs/CENTRAL_INTELIGENCIA_RH_MATRIZ.md`. Esta matriz cobre o
>   **resto**, nunca analisado seção a seção até agora.
> - **Caderno B** — `docs/CADERNO_VALIDACAO_DOCUMENTAL_OCR_BASE_MESTRA_RH_ELEITORAL.md`
>   (46 seções), novo, ainda sem nenhum código.

## Achado central dos dois juntos

Os dois cadernos **descrevem o mesmo problema por ângulos diferentes**
e se sobrepõem em vários pontos com o que **já existe** no projeto:

- Ambos quantos partem do princípio "nunca decidir automaticamente
  sobre dado sensível" — já é exatamente a filosofia de
  `resolve_data_conflict()` (IA para checagem de dados, Etapa A):
  `data_conflicts` guarda a sugestão, um humano decide.
- Caderno B pede uma interface de OCR desacoplada de fornecedor
  (seção 41) — a checagem de documento por IA (Etapa A, usando a
  Responses API da OpenAI) **já cumpre essa função na prática**: lê o
  documento, devolve dado estruturado, nunca aplica nada sozinha. Não
  é literalmente um "adaptador OCR" com fila assíncrona, mas resolve o
  mesmo problema sem precisar contratar mais um provedor.
- Caderno A pede estados de aprovação de modelo
  (`draft/legal_review/accounting_review/approved/inactive/archived`,
  seção 40) — hoje `contract_templates.status` só tem
  `rascunho/ativo/inativo` (mais simples) e já existe aprovação
  jurídica separada (`legal_approval_status`, `set_template_legal_approval()`,
  Nova Versão Etapa 5) — falta só a etapa de aprovação **contábil**
  como uma segunda trilha, e um estado de arquivamento.
- Os dois cadernos sugerem juntos **~30 tabelas novas** no total —
  nenhuma dessas listas foi construída como está sugerida; onde já
  existe uma tabela cumprindo o mesmo papel (`data_conflicts`,
  `person_documents`, `contracts`), a recomendação nas duas matrizes
  anteriores e nesta é sempre **estender o que existe**, não duplicar.

## Caderno A — biblioteca jurídica de contratos (resto, além do cabeçalho/rodapé já feito)

🟢 existente · 🟡 parcial · 🔴 ausente

| # | Requisito | Estado |
|---|---|---|
| 8/9/15 | Cabeçalho/rodapé + variáveis `{{organizacao_*}}` na qualificação | 🟢 **Feito** — ver `docs/CENTRAL_INTELIGENCIA_RH_MATRIZ.md`, migrações `0040`/`0041` |
| 11/12 | Biblioteca de 14 tipos de contrato PF + 17 tipos PJ (cabo eleitoral, coordenador, advogado, agência de publicidade, etc.) | 🔴 Hoje `contract_templates.contract_type` só distingue `pf`/`pj` genericamente — não existe um catálogo dos 31 tipos nomeados, nem texto de cláusula pronto pra nenhum deles. Cada organização cria seu próprio modelo do zero em `/contratos/modelos` |
| 13 | Documentos auxiliares (confidencialidade, LGPD, uso de imagem, termo de uniforme, rescisão, aditivos, recibo...) | 🔴 Nenhum desses 22 documentos auxiliares existe como modelo — só o contrato principal |
| 14 | Estrutura obrigatória de 29 itens por contrato (objeto, jornada, justificativa de preço, integridade eleitoral, LGPD, foro...) | 🔴 O texto do modelo é livre (`template_versions.body`) — nada impede ou garante que os 29 itens estejam presentes; é responsabilidade de quem escreve o modelo hoje |
| 15/16 | Corpo base PF e PJ com cláusulas prontas (texto sugerido no caderno) | 🔴 Nenhum modelo pré-carregado — sistema não vem com texto nenhum, cada organização escreve o próprio |
| 17/18 | Requisitos do art. 100-A (limite de contratação de militância, exclusões, saldo consolidado) | 🔴 Não existe nenhum cálculo ou registro de limite/enquadramento no art. 100-A |
| 19 | PJ fornecedora de equipe — anexo nominal dos alocados | 🔴 Não existe; hoje um contrato PJ não lista pessoas físicas alocadas |
| 20 | Justificativa do preço (critério, fonte, aprovador) | 🔴 `generate_contract()` grava `value_cents`, não a justificativa — campo novo, pequeno |
| 21/22 | Comprovação da execução + documento fiscal/recibo | 🔴 Não existe módulo de evidência de execução nem de nota fiscal/recibo — despesas (`expenses`) é o mais próximo, mas não é isso |
| 23 | Forma de pagamento (preferência por PIX = CPF/CNPJ do contratado) | 🟡 `payments`/`legal_entities.pix_key` existem, mas nenhuma regra de preferência/validação está codificada |
| 24 | Datas documentais separadas (assinatura, contratação, início, execução, fiscal, pagamento, prestação de contas) | 🟡 `contracts` tem `generated_at`/`start_date`/`end_date`/`signed_submitted_at` — faltam as outras (execução, emissão fiscal, registro na prestação de contas) |
| 25/26 | Contratos especializados de advocacia/contabilidade (OAB, CRC, escopo, honorários) | 🔴 Nenhum campo específico pra esses dois tipos |
| 27/28 | Serviços gráficos, marketing digital (campos técnicos próprios) | 🔴 Nenhum campo específico |
| 29 | Termo de militância não remunerada (nunca contrato com valor zero) | 🔴 Hoje `generate_contract()` aceita `value_cents = null`/0 livremente — não existe um tipo de documento separado pra isso, nem validação impedindo |
| 30-36 | Cláusula de aplicativos/geolocalização/ponto, limites de monitoramento, aparelho pessoal, equipamento da campanha | 🔴 Nada disso existe — `/ponto` e `/operacoes` são só placeholders no app (confirmado desde o início da sessão) |
| 38 | Anexos numerados (I a XV) | 🔴 `contracts` não tem conceito de anexo separado do corpo principal |
| 39 | Dossiê documental (12 itens por contratação) | 🟡 As peças existem espalhadas (`person_documents`, `contracts`, `contract_documents`, `payments`) mas não há uma tela/consulta que as reúna num dossiê único — mesma lacuna já apontada em `docs/CENTRAL_INTELIGENCIA_RH_MATRIZ.md`, item 21 |
| 40 | Estados do modelo `draft→legal_review→accounting_review→approved→inactive→archived` | 🟡 Existe rascunho/ativo/inativo + aprovação jurídica separada (`legal_approval_status`) desde a Etapa 5 — falta a trilha contábil e o estado `archived` |
| 41 | Estados documentais (`draft`...`expired`, 16 estados) | 🟡 `contracts.status` já tem um ciclo rico e equivalente (ver achado central) — vocabulário em português, não 1:1, mas cobre a mesma ideia |
| 42 | Snapshot documental imutável | 🟢 Já existe (`generate_contract()`, spec 12 da Nova Versão) |
| 43/44 | Checklists jurídico e contábil | 🔴 Não existem como funcionalidade — são checklists de revisão humana, não algo pra automatizar necessariamente |

## Caderno B — validação documental, OCR e base mestra

🟢 existente · 🟡 parcial · 🔴 ausente

| # | Requisito | Estado |
|---|---|---|
| 8 | Validações determinísticas antes do OCR (CPF/CNPJ/data/e-mail/telefone/CEP/hash) | 🟢 Já existe em toda importação (`classifyRow()`) e upload de documento (`record_person_document()`) |
| 9/10 | Classificação documental automática + controle de qualidade de imagem (nitidez, corte, reflexo) | 🔴 `person_documents.document_type` é escolhido manualmente no upload — nenhuma sugestão automática nem checagem de qualidade de imagem |
| 11 | Extração por tipo de documento (RG/CNH, título eleitoral, comprovante) | 🟡 A checagem de documento por IA (Etapa A) já lê RG/CNH e devolve nome/CPF — não extrai os outros campos da seção 11.1 (filiação, naturalidade, órgão emissor) nem os outros tipos de documento (11.2/11.3/11.4) ainda |
| 12/13 | Preservar original vs. normalizado vs. valor de impressão, por campo | 🔴 `data_conflicts.details` guarda valores ad hoc (`nome_importado`/`nome_existente`) — não é um mecanismo sistemático de 3 valores por campo |
| 14 | Registro mestre por campo (valor+situação+fonte+validador+histórico) | 🔴 **Maior lacuna dos dois cadernos** — `people` continua com colunas simples; nenhum histórico por campo existe |
| 15/16/17 | Comparação campo a campo + classificação + correspondência de identidade sem CPF | 🟡 Comparação de nome pro mesmo CPF já existe (Etapa A); comparação multi-campo (nascimento, filiação, telefone) e correspondência sem CPF válido não existem |
| 18 | Histórico de nomes (nome social, grafias, motivo) | 🔴 `people.full_name` é um campo único, sem histórico |
| 19 | Validação cruzada entre documentos da mesma pessoa | 🔴 Não existe — a checagem de IA hoje compara documento × cadastro, não documento × documento |
| 20 | Validade temporal (comprovante recente prevalece) | 🔴 Não existe nenhuma regra de "mais recente vence" |
| 21/22/33 | Confiança separada por tipo + conceitos distintos (extraído/validado/confirmado/autêntico) + índice de identidade | 🟡 A IA já devolve um veredito (`confere`/`diverge`/`inconclusivo`) e uma explicação — não é a granularidade completa dos 5 conceitos do caderno, nem um índice de identidade por pessoa |
| 23 | Tela de resolução (valor mestre/importado/extraído lado a lado, com trecho da imagem) | 🟡 `/divergencias` já mostra nome atual × importado + veredito da IA — não mostra recorte da imagem nem histórico |
| 24 | Fila baseada em risco (crítico/alto/médio/baixo) | 🔴 **Proposto na Etapa 1 deste plano** — `data_conflicts` não tem severidade hoje |
| 25 | Dupla aprovação pra CPF/banco/PIX/mesclagem | 🔴 **Proposto na Etapa 1 deste plano** — `resolve_data_conflict()` hoje só exige uma decisão |
| 26/27 | Confirmação pelo titular + link de correção sem conta | 🟡 `/meu-cadastro` (conta) e `/cadastro/[token]` (token, sem conta) já existem pra fluxo parecido — não são especificamente "confirme este dado extraído", precisariam adaptação |
| 28 | Registro de contato humano complementar | 🔴 Não existe |
| 29 | Detecção de duplicidade — mesmo arquivo em pessoas diferentes | 🟡 Hash já detecta duplicata **na mesma pessoa** (`record_person_document()`); duplicidade **entre pessoas** é **proposta na Etapa 1 deste plano** |
| 30 | Sinais de possível alteração de documento (fonte incompatível, metadados) | 🔴 Não existe — exigiria análise forense de imagem, fora do escopo da checagem por IA atual |
| 31/32 | Bloqueio de pagamento por identidade/banco divergente + reconferência antes de pagar | 🔴 = "Etapa B" já planejada em `docs/IA_DIVERGENCIAS.md` (conciliação contrato × pagamento), não iniciada |
| 34 | Relatório de resolução | 🔴 Não existe |
| 35/36 | Fluxo extrair→comparar→sugerir→revisar→aprovar→atualizar→auditar | 🟢 É exatamente o fluxo já implementado: `checkWithAi()` sugere, `resolve_data_conflict()` decide e audita via `log_audit_event()` |
| 37/38 | Segurança (bucket privado, URL assinada, mascaramento) e privacidade | 🟡 Bucket privado/URL assinada já existem; **mascaramento de CPF é um gap real já documentado** em `docs/IDENTIDADE_VISUAL.md` desde a Fase de identidade visual |
| 41 | Adaptador de provedor de OCR desacoplado | 🟡 Ver achado central — coberto na prática pela checagem por IA; não é um adaptador formal com fila |

## Recomendação

Os dois cadernos juntos somam quase 100 seções — não é uma etapa, nem
duas. Como nas matrizes anteriores, a recomendação é seguir por
fatias pequenas e verificáveis. Três frentes independentes, prontas
pra decidir a ordem:

1. **Etapa 1 já desenhada** (ver plano desta conversa): severidade em
   `data_conflicts`, dupla aprovação pra CPF/banco/PIX, duplicidade de
   documento entre pessoas diferentes — fecha os três pontos que o
   próprio Caderno B chama de mais críticos, construindo em cima do
   que já existe.
2. **Mascaramento de CPF** — gap de segurança real, achado há duas
   fases, citado nos dois cadernos novos também (seção 37 do Caderno
   B). Pequeno, isolado, já bem entendido.
3. **Biblioteca de contratos PF/PJ do Caderno A** (seções 11-29) — a
   maior peça isolada: 31 tipos de contrato com cláusulas prontas.
   Precisa de revisão jurídica antes de qualquer aprovação definitiva
   (o próprio caderno diz isso na seção 45) — dá pra carregar os
   modelos como `rascunho` sem risco, mas o texto de cláusula em si
   merece confirmação de que é pra usar exatamente como veio no
   caderno ou adaptar.

O "registro mestre por campo" (Caderno B, seção 14) é o pedaço mais
caro dos dois cadernos — recomendo tratá-lo por último, só depois que
as frentes acima já estiverem rodando e mostrarem, na prática, se essa
granularidade toda é realmente necessária ou se as ferramentas mais
simples (divergência + IA sob demanda) já resolvem o suficiente.

## Etapa 1 — concluída

A pedido do usuário ("vamos para etapa 1, nao faremos nenhum
mascaramento" — item 2 da recomendação acima fica de fora por
enquanto), a Etapa 1 desenhada foi implementada e verificada:

- Migração `0042_validacao_documental_risco.sql`: `data_conflicts`
  ganhou `severity` (`critico/alto/medio/baixo`, default `medio`) e
  `requires_dual_approval`/`first_approved_by`; nova tabela
  `duplicate_document_matches` pra duplicidade de documento **entre
  pessoas diferentes** (a duplicidade dentro da mesma pessoa já era
  bloqueada desde a `0030`).
- `record_person_document()` passou a checar hash duplicado entre
  pessoas diferentes da mesma campanha depois de gravar o documento —
  não bloqueia o upload (Caderno B, seção 30: nunca classificar
  automaticamente como fraude), só abre um `data_conflicts` crítico e
  grava o par em `duplicate_document_matches`.
- `resolve_data_conflict()` passou a exigir dupla aprovação (duas
  pessoas diferentes) pra conflitos de `cpf_duplicado`/`dado_divergente`
  quando a resolução muda dado (`aceitar_novo`/`ajustar_contrato`/
  `estornar_pagamento`): primeira chamada só registra
  `first_approved_by` e deixa `em_analise`, sem aplicar nada; segunda
  chamada por pessoa diferente aplica a correção e fecha. Verificado
  por transação de teste (`rollback`/sem `commit`): duplicidade entre
  pessoas, rejeição da segunda aprovação pela mesma pessoa, e o
  caminho feliz completo (1ª aprovação não muda nada → 2ª aprovação
  por outra pessoa aplica e fecha).
- A detecção determinística de nome divergente na importação
  (`uploadImportBatch`/`uploadPdfImportBatch`, Etapa A) passou a
  gravar `severity: 'alto'` (era `medio` por padrão).
- `/divergencias` agora ordena por severidade (crítico primeiro) e o
  `ConflictCard` mostra um badge de severidade e o estado de dupla
  aprovação pendente — esconde os botões de resolução de quem já deu
  a primeira aprovação (o `resolve_data_conflict()` já rejeitava isso
  no servidor; a UI só evita a tentativa inútil).

**Fora desta etapa, sem mudança**: mascaramento de CPF (item 2 da
recomendação, explicitamente adiado pelo usuário); tudo listado em
"Fora de escopo" no plano original (registro mestre por campo,
reconferência antes do pagamento, confirmação pelo titular, contato
humano registrado, relatório de resolução, índice de identidade,
adaptador formal de OCR).

**Próximo passo confirmado pelo usuário**: biblioteca jurídica de
contratos do Caderno A (seções 11-29, item 3 da recomendação).

## Biblioteca de contratos — concluída

Migração `0043_biblioteca_contratos.sql`:

- Tabela nova `contract_type_catalog` (referência global, mesmo padrão
  de `public.roles`) com os 31 tipos nomeados do Caderno A (seções
  11/12 — 14 PF + 17 PJ).
- `contract_templates.source_catalog_code` (nulo pra modelo escrito à
  mão) marca de qual item do catálogo um modelo nasceu.
- `generate_contract()` ganhou 4 chaves novas em `variables_used`
  (`telefone`, `email` pra PF e PJ; `endereco_completo`,
  `representante_cpf` pra PJ) — dado que já existia em `people`/
  `legal_entities`, sem coluna nova em `contracts`.
- `src/lib/contracts/base-bodies.ts`: corpo-base PF/PJ (seções 15/16),
  usando só as chaves flat que `generate_contract()` já substitui —
  onde o caderno pede um dado sem fonte no modelo atual (testemunha
  por nome, forma de pagamento específica, critério/fonte do preço,
  fiscal PJ nomeado), o texto usa linguagem genérica ou linha de
  assinatura em branco, nunca um `{{placeholder}}` sem substituição.
- `/contratos/modelos` ganhou a `CatalogLibrary` — um clique cria o
  modelo (`status: 'rascunho'`, não aparece em `/contratos` pra gerar
  contrato real) e pré-preenche o texto sugerido em
  `PublishVersionForm` pra revisão humana antes de publicar de
  propósito (mesmo fluxo de um modelo escrito à mão) — "carregar como
  rascunho sem risco", como a recomendação original pedia.

Verificado por transação de teste (sem `commit`): `generate_contract()`
PF e PJ com todos os dados novos preenchidos → confirma as 4 chaves em
`variables_used` e substituídas no `generated_body`; conferência manual
de que todo `{{...}}` usado em `CONTRACT_BASE_BODY_PF`/`PJ` está na
lista de chaves suportadas (nenhum placeholder sem substituição).

**Fora desta etapa, sem mudança** (leitura literal das seções 17-29+
pediria um subsistema por peça): limite do art. 100-A, anexo nominal
de PJ fornecedora de equipe, campos de justificativa de preço/
evidência de execução/documento fiscal como módulos, campos
especializados de advocacia/contabilidade/gráfica/marketing, termo de
militância não remunerada como tipo de documento separado, cláusulas
de app/geolocalização, anexos numerados como entidade própria, os 22
documentos auxiliares da seção 13, trilha de aprovação contábil e
estado "arquivado" do modelo.

## Registro mestre por campo — concluída

Última peça pendente das duas matrizes (Caderno B, seção 14), a mais
cara, deixada por último de propósito. Migração
`0044_registro_mestre_por_campo.sql`:

- `master_field_values` (uma linha "atual" por campo por pessoa,
  `unique (person_id, field_name)`) + `master_field_history`
  (append-only) — só os 6 campos do exemplo do próprio caderno
  (seção 15): `nome`, `cpf`, `data_nascimento`, `telefone`, `email`,
  `endereco`. Os 12 estados da seção 14 (`nao_informado` →
  `informado` → `divergente` → `validado` → `desatualizado`...) viram
  o `check` de `status`.
- `set_master_field_value()` — único ponto de escrita (upsert +
  histórico), mesmo padrão SECURITY DEFINER autoautorizado do resto
  do projeto.
- Backfill de toda `people`/`person_addresses` existente
  (`status: 'informado'`, `source: 'cadastro'`) — todo mundo que já
  existia entra rastreado desde já.
- `resolve_data_conflict()` (a correção de nome que a Etapa 1 anterior
  já aplicava em `people.full_name` após dupla aprovação) passa
  também a chamar `set_master_field_value()` — `field_name: 'nome'`,
  `status: 'validado'`, `validated_by` = quem deu a segunda aprovação.
  Único write-path ligado nesta etapa — `savePerson()`
  (`src/app/(app)/pessoas/actions.ts`) e os dois uploads de
  importação continuam gravando só `people`/satélites direto (fora de
  escopo, ver abaixo).
- `/pessoas/[id]/editar` ganha o card "Registro mestre por campo"
  (só leitura, só administrador/rh) — badge de situação por campo,
  fonte, quem/quando validou, histórico em `<details>`.

Verificado por transação de teste (`begin`/`rollback` explícitos —
ver nota de processo abaixo): contagem do backfill batendo com quem
tem cada coluna preenchida; conflito `dado_divergente` com dupla
aprovação → confirma que a 1ª aprovação não mexe no registro mestre,
e a 2ª (por pessoa diferente) grava `status: 'validado'`,
`validated_by` correto e uma linha nova em `master_field_history` com
o valor anterior certo (`null`, pessoa nova).

**Nota de processo**: durante a verificação desta etapa, dois testes
anteriores desta mesma sessão (Etapa 1 de validação documental e
biblioteca de contratos) que não usavam `begin`/`rollback` explícitos
tinham, na real, **persistido** dados de teste em produção (uma
suposição errada de que a ferramenta de SQL fazia rollback automático
sem commit). Encontrado e limpo por completo (pessoas de teste,
conflitos, modelos/contratos de teste e a empresa de teste
associados) antes de seguir — nenhum dado real do sistema foi
afetado, a base de `people` estava vazia além desses dois registros
de teste. Toda transação de verificação a partir de agora usa
`begin`/`rollback` explícitos.

**Fora desta etapa, sem mudança**: escrever no registro mestre a
partir de `savePerson()`/importação (Excel e PDF) — os write-paths
mais usados no dia a dia; detecção automática de `desatualizado`
quando `people` muda fora do fluxo de conflito; campos fora dos 6
escolhidos (bancários, PIX, eleitorais, RG); as outras 17 tabelas da
seção 39 (pipeline de extração/OCR, qualidade documental, índice de
identidade, confirmação pelo titular, bloqueio de pagamento);
visibilidade pro titular.

Com isso, as três frentes da recomendação original (validação
documental, biblioteca de contratos, registro mestre por campo) estão
concluídas — só o mascaramento de CPF, explicitamente adiado pelo
usuário, continua fora do sistema.
