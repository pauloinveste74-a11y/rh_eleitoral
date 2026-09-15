# Caderno técnico + ficha do cabo eleitoral — matriz requisito × estado real

> Levantada em 15/09/2026, antes de qualquer código desta iniciativa,
> cruzando dois documentos novos do usuário (ainda não commitados, na
> raiz do repositório: `CADERNO_TECNICO_RH_ELEITORAL_IA.docx` e
> `Ficha_cadastro_CABO ELEITORAL 2026.docx`) com o schema/código em
> produção. Metodologia igual às matrizes anteriores
> (`docs/NOVA_VERSAO_MATRIZ.md`, `docs/VALIDACAO_DOCUMENTAL_MATRIZ.md`):
> 🟢 existente · 🟡 parcial (schema pronto sem app, ou app mais simples
> que o pedido) · 🔴 ausente · ⚠️ conflitante com decisão já tomada.
>
> O caderno técnico, na maior parte, **confirma** decisões já tomadas em
> iniciativas anteriores (não é uma spec nova do zero) — a matriz abaixo
> foca no que diverge ou está ausente. A ficha de papel do cabo
> eleitoral é o achado mais concreto: tem campos que o cadastro digital
> atual não coleta.
>
> **Não redeuz o que já foi matrizado antes.** A seção 6 do caderno novo
> ("Central de Inteligência e Qualidade") e a seção 11 ("Processamento
> assíncrono") descrevem, com outras palavras, exatamente o mesmo
> universo já analisado seção a seção em
> `docs/CENTRAL_INTELIGENCIA_RH_MATRIZ.md` (import/contratos/pendências,
> a partir de `CADERNO_TECNICO_IMPORTACAO_CONTRATOS_INTELIGENCIA_RH.md`)
> — inclusive com uma classificação por esforço (pequeno/médio/grande)
> já pronta. A seção 2 abaixo aponta pra lá em vez de reabrir a análise.
> O grupo de dados sensíveis da Ficha (liderança/mobilização) também já
> tinha sido sinalizado em `docs/CADERNO_DOCUMENTAL_JURIDICO_CONTRATOS_RH_ELEITORAL.md`
> (seção 6), analisado em `docs/VALIDACAO_DOCUMENTAL_MATRIZ.md`.

## 1. Ficha de cadastro do cabo eleitoral — campos × schema atual

| Campo da ficha | Estado |
|---|---|
| Nome, nascimento, gênero, estado civil, CPF, RG, órgão emissor | 🟢 `people` (`0001`/`0013`) |
| WhatsApp/celular, e-mail | 🟢 `people.phone`/`email` |
| Instagram, Facebook | 🔴 Ausente — sem coluna de rede social em `people` nem satélite |
| Endereço (rua, número, bairro, cidade, UF, CEP) | 🟢 `person_addresses` |
| Ponto de referência do endereço | 🔴 Ausente — `person_addresses` não tem esse campo |
| Tamanho de uniforme (camiseta) | 🔴 Ausente |
| Chave PIX (CPF), banco, agência, conta | 🟢 `person_bank_accounts` |
| Dados de veículo (placa, modelo, ano) | 🔴 Ausente |
| Título de eleitor, zona, seção | 🟢 `person_electoral_data` |
| Local de votação, bairro onde vota | 🔴 Ausente — `person_electoral_data` só tem `voter_city`/`voter_state`, não "local de votação" |
| Região/bairro de atuação política, liderança comunitária (sim/não + qual), estimativa de votos mobilizados | 🔴 Ausente — e já **sinalizado como dado sensível** numa análise anterior (`docs/CADERNO_DOCUMENTAL_JURIDICO_CONTRATOS_RH_ELEITORAL.md`, seção 6: "dados capazes de revelar opinião política... devem receber proteção reforçada e acesso restrito"), nunca modelado no banco |
| Documentos anexos (RG/CPF/CNH, título, comprovante de residência) | 🟢 `person_documents` cobre os tipos pedidos |
| Contato de referência / abono político (nome + telefone) | 🔴 Ausente |
| Termo de consentimento LGPD | 🟡 Parcial — a ficha em papel tem o texto e a assinatura física; o cadastro digital não tem "aceite de veracidade/consentimento" versionado (gap já apontado em `docs/NOVA_VERSAO_MATRIZ.md`, item 6, segue sem solução) |

Os campos ausentes acima são justamente os que a análise jurídica
anterior classificou como **"dados não contratuais"** (grupo
Logístico/Estratégico/Comunicação) — teriam finalidade, nível de acesso
e retenção próprios, e os de cunho político/eleitoral pedem proteção
reforçada. Modelar isso como extensão solta de `people` sem esse
controle de acesso reproduziria o mesmo problema que a análise jurídica
já preveniu.

## 2. Matriz por seção do caderno técnico

| # | Requisito | Estado |
|---|---|---|
| 1.1 | Status pendente por padrão + validação por alçada em toda entrada (trabalhador/importação/IA) | 🟢 Padrão do projeto inteiro desde a Etapa 1 |
| 1.1 | Função de trabalho e perfil de acesso como conceitos separados e configuráveis | 🟡 `job_functions` (`0029`) existe e tem tela própria, mas **nunca foi ligada** ao cadastro de pessoa (`/pessoas`, `/meu-cadastro`, `/cadastro/[token]`) — é comentário explícito na própria migração `0029`: "NÃO inclui... ligar job_functions ao autocadastro" |
| 1.1 | Coordenador só enxerga a própria cadeia (RLS) | 🟢 Padrão do projeto |
| 1.1 | Documentos em bucket privado + URL assinada | 🟢 Padrão do projeto |
| 1.1 | Alterações sensíveis versionadas | 🟡 Documento de pessoa é versionado (`replaces_document_id`, Etapa 3); contrato tem snapshot imutável; mas não é uniforme — endereço/bancário/eleitoral seguem só em `audit_logs` (antes/depois), sem versionamento próprio, decisão de modelagem já documentada e aceita desde a `0004` |
| 1.1 | Desligamento segue fluxo de autorização | 🔴 Ausente como fluxo — `people.status` tem os valores `suspenso`/`desligado` desde a `0013`, mas não existe a cadeia "coordenador solicita → eixo autoriza → RH apura valores pendentes → define data → executa" (seção 8.1) nem função `SECURITY DEFINER` dedicada |
| 1.1 | IA nunca aprova nem grava direto na base-mestra | 🟢 Toda checagem por IA hoje é consultiva, grava em `data_conflicts`/staging, nunca em `people` direto |
| 3.1 | Perfis de acesso (matriz mínima) | 🟢 `roles` cobre a lista pedida; ⚠️ falta `supervisor` como perfil de acesso (mesmo achado da `NOVA_VERSAO_MATRIZ.md`, ainda não corrigido) |
| 4 | Arquitetura de referência (Next.js/Vercel + Supabase + IA server-only) | 🟢 Exatamente o que está em produção |
| 4.1 | Fluxo seguro de IA: staging → revisão humana → confirmação → auditoria | 🟢 Padrão já usado em `data_conflicts`/`document-cross-check.ts` |
| 4.1 | IA como job assíncrono com fila, idempotência, orçamento e reprocessamento controlado | 🔴 Ausente — hoje toda chamada de IA é síncrona, sob demanda (botão "Verificar com IA" em `/divergencias`), sem tabela de jobs, sem `idempotency_key`, sem orçamento diário nem contagem de tokens/custo |
| 4.2 | Ambiente de preview com projeto Supabase separado | 🔴 Ausente — um único projeto Supabase (`pjjarkxwwzqiajlvpsdx`) atende dev/preview/produção |
| 5.1–5.7 | Módulos (pessoas, documentos, importação, contratos, despesas, pagamentos, relatórios do coordenador) | 🟢 Todos implementados nas iniciativas anteriores, na essência descrita |
| 5.6 | Conciliação bancária: upload de extrato + motor determinístico de correspondência, IA só para ambiguidade | 🔴 Ausente — `payments` registra comprovante por pagamento, mas não há `bank_statements`/`reconciliation_matches` nem motor de correspondência. **Não confundir** com a conciliação cadastro×contrato×pagamento (seção 20 do `CADERNO_TECNICO_IMPORTACAO_CONTRATOS_INTELIGENCIA_RH.md`) — essa é a "Etapa B" já planejada em `docs/IA_DIVERGENCIAS.md` e também ausente, mas é um problema diferente (contrato válido bate com o pagamento, não banco bate com o lançamento) |
| 5.7 | Exportação em PDF (apresentação) além de Excel/CSV | 🟡 Só CSV hoje (decisão documentada no README) — nenhum export gera PDF ou `.xlsx` |
| 6 (tabela) | Assistente de coordenador/RH/financeiro/auditoria dentro da Central de Inteligência | 🔴 Ausente — a "Central de Inteligência" hoje é só a tela `/divergencias` (checagem de nome/documento); não há assistente conversacional por perfil. Não analisado a fundo aqui — é o mesmo universo já coberto por `docs/CENTRAL_INTELIGENCIA_RH_MATRIZ.md` |
| 6.1 | Governança de IA (origem, valor anterior/sugerido, confiança, evidência, versão de prompt) | 🟡 `document-cross-check.ts` retorna divergência com evidência, mas não versiona prompt/modelo explicitamente nem grava "confiança" estruturada em todos os fluxos |
| 6 | Central de Inteligência: importação além de pessoas, contratos em lote, upload de modelo DOCX, painel de contratos, lembretes, e-mail/WhatsApp real, dossiê/índice de prontidão | 🟡🔴 **Já matrizado seção a seção** em `docs/CENTRAL_INTELIGENCIA_RH_MATRIZ.md` — não repetido aqui. Achados que valem destacar porque o caderno novo os reforça: geração de contrato **em lote não existe** (`generate_contract()` só gera um por vez, deixado fora de propósito na Etapa 5); **upload de modelo de contrato (arquivo) não existe** (hoje é texto colado); e-mail/WhatsApp automáticos **dependem de contratar provedor pago** (Resend/SES, API oficial da Meta), mesma decisão já tomada pra OpenAI |
| 9 | Segurança/LGPD: MFA obrigatório para perfis privilegiados | 🔴 Ausente — login é e-mail+senha (+CNPJ), sem MFA em nenhum perfil |
| 9.1 | Mascaramento de dado sensível em listagem/log/relatório amplo | 🔴 Ausente — **decisão já tomada e documentada**: mascaramento de CPF está explicitamente adiado a pedido do usuário (ver `CONTEXT.md`); este caderno amplia o pedido para todo dado sensível (bancário, eleitoral, endereço, contrato), o que é uma extensão real do escopo represado |
| 10 | Configuração OpenAI (chave server-only, `OPENAI_PROJECT_ID`, budget diário, limiar de revisão) | 🟡 `OPENAI_API_KEY` configurada e testada (sem crédito na conta, ver `CONTEXT.md`); `OPENAI_PROJECT_ID`/`AI_DAILY_BUDGET_CENTS`/`AI_CONFIDENCE_REVIEW` como variáveis próprias **não existem** — o limiar de confiança, quando usado, está hardcoded no código, não configurável por env |
| 11 | Processamento assíncrono e confiabilidade (idempotency_key, fila, retry, circuit breaker) | 🔴 Ausente — mesmo gap do item 4.1, é a mesma lacuna de infraestrutura vista por outro ângulo |
| 12 | Construtor de relatórios (campos/filtros/agrupamento/ordenação configuráveis pelo usuário) | 🟡 Relatórios atuais têm filtro fixo por tela (`/relatorios/pessoas`, `/financeiro`, `/aprovacoes`), não um construtor genérico |
| 16 | Operação/custos: registrar custo estimado por job/campanha/funcionalidade | 🔴 Ausente — depende da infraestrutura de `ai_jobs` do item 4.1/11, que não existe |

## 3. Tabelas do modelo de referência (seção 7 do caderno)

**Já existem com nome e proposta equivalente**: `campaigns`, `axes`,
`locations`/`teams` (via `coordination_relationships`), `profiles`,
`roles`, `work_functions` (via `job_functions`), `people`,
`person_addresses`/`bank_accounts`/`electoral_data`, `documents` (via
`person_documents`/`contract_documents`/`expense_documents`),
`imports` (via `import_batches`/`import_staging_records`),
`contract_templates`/`template_versions`/`contracts`, `payments`,
`expense_categories`/`expenses`, `audit_events` (via `audit_logs`).

**Citadas na spec, ausentes no banco atual**: `permissions`/
`role_assignments` granulares (hoje é `has_role()` fixo por código, sem
matriz de permissão por ação configurável), `delegations`,
`compensation_rules`, `payment_obligations`, `bank_statements`,
`reconciliation_matches`, `approval_flows`/`approval_steps` genéricos
(hoje cada domínio — aprovação de cadastro, despesa, contrato — tem sua
própria função `decide_*`, não um motor de fluxo unificado), `ai_jobs`/
`ai_job_files`/`ai_extractions`/`ai_field_suggestions`/`ai_alerts`/
`ai_prompt_versions`/`ai_usage`, `report_exports` (histórico/expiração
de exportação assíncrona), `contacts` (mesma divergência de design já
registrada na `NOVA_VERSAO_MATRIZ.md`: telefone/e-mail ficam direto em
`people`).

## 4. Ordem proposta (o que vale priorizar, na minha leitura)

1. **Campos da ficha do cabo eleitoral que faltam** — é o gap mais
   concreto e barato: colunas novas em `people`/satélites (ou uma nova
   tabela `person_engagement_data` para os campos sensíveis de
   liderança/mobilização, com RLS própria mais restrita que o resto do
   cadastro) + formulário. Baixo risco, alto valor imediato pra quem
   preenche a ficha em campo hoje e teria que digitar de novo depois.
2. **Ligar `job_functions` ao cadastro de pessoa** — schema já existe
   desde a `0029`, é a lacuna mais barata de fechar (parcial → completo)
   e destrava a seção 3 inteira do caderno (cargo configurável valendo
   de verdade, não só cadastrável).
3. **Papel `supervisor`** — um `insert` em `roles` + revisão de onde
   cada policy usa `has_role([...])`; achado repetido em duas matrizes
   agora.
4. **Fluxo formal de desligamento** (seção 8.1) — states já existem,
   falta a função `SECURITY DEFINER` e a tela; é o mesmo padrão já usado
   em `decide_approval`/`decide_expense`, só um domínio novo.
5. **Infraestrutura de jobs de IA assíncronos** (`ai_jobs` + orçamento +
   idempotência) — maior esforço da lista, mas é pré-requisito para
   qualquer processamento em lote/custoso (OCR de PDF em volume,
   conciliação assistida) e para a Central de Inteligência de verdade
   que o caderno descreve.
6. **Conciliação bancária** — depende de decidir o formato de extrato
   aceito (OFX/CSV do banco) antes de desenhar `bank_statements`;
   convém perguntar ao usuário qual banco/formato antes de modelar.
7. **PDF/Excel em relatórios + MFA + mascaramento amplo de dado
   sensível** — todos são extensões de decisões já tomadas
   (CSV-only, adiamento de mascaramento), então exigem confirmar com o
   usuário que a decisão anterior está sendo revista, não assumir.

Além desta lista, o universo "Central de Inteligência" (importação além
de pessoas, lote de contratos, upload de modelo, painel de contratos,
lembretes, e-mail/WhatsApp real) já tem sua própria priorização pronta
em `docs/CENTRAL_INTELIGENCIA_RH_MATRIZ.md` ("Tamanho real do que
falta") — não duplicada aqui. Resumo dela, pra decidir junto com a
lista acima: **pequeno** (renomear menu, CSV, ativar
`possivel_duplicidade`/`conflitante`, abas na prévia de importação),
**médio** (upload de modelo de contrato, lote de contratos, conciliação
contrato×pagamento, pagamentos no portal do contratado), **grande**
(e-mail/WhatsApp de verdade — precisa provedor pago, lembretes
programados, caixa de entrada documental, índice de prontidão,
assinatura eletrônica).
