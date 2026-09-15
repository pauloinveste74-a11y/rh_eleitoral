# Central de Inteligência de RH — matriz requisito × estado real

> Análise do `CADERNO_TECNICO_IMPORTACAO_CONTRATOS_INTELIGENCIA_RH.md`
> contra o estado real do banco/código em 15/09/2026, antes de
> qualquer código desta iniciativa — mesma disciplina já usada em
> `docs/NOVA_VERSAO_MATRIZ.md`, `docs/MULTI_TENANT.md` e
> `docs/IA_DIVERGENCIAS.md`.

## Achado central, antes de entrar em qualquer seção

O caderno propõe um schema novo e paralelo
(`data_imports`/`data_import_files`/`data_import_rows`/
`data_import_matches`/`data_import_decisions`, seção 26) pra um
problema que **já tem solução parcialmente construída e em uso**:
`import_batches`/`import_staging_records`/`import_row_errors` (Excel
desde a Fase 1C, PDF desde a Nova Versão Etapa 7) +
`data_conflicts` (existia ociosa desde a migração `0018`, ativada há
pouco pela iniciativa "IA para checagem de dados", Etapa A — nome
divergente pro mesmo CPF, verificação de RG/CNH por IA). O mesmo vale
pro módulo de contratos: `contract_templates`/`template_versions`/
`contracts`/`contract_documents` já existem (Nova Versão Etapa 5), com
um ciclo de vida de status (`aguardando_geracao → gerado → disponivel
→ baixado → aguardando_assinatura → assinado_enviado → em_conferencia
→ correcao_solicitada → assinado_e_validado/recusado → substituido →
encerrado`) que já cobre boa parte do vocabulário da seção 16 do
caderno (`draft/sent/delivered/viewed/returned_signed/validated/...`),
só com nomes em português e uma granularidade um pouco menor (sem
evento por canal ainda).

**Decisão que este documento não toma sozinho**: reaproveitar e
estender o que já existe (caminho de menor risco, consistente com
como toda esta sessão trabalhou até agora) vs. adotar o schema novo
proposto pelo caderno. A recomendação abaixo, seção a seção, é sempre
"estender o que existe" — mas cabe ao usuário confirmar antes de
qualquer migração.

## Matriz por seção do caderno

🟢 existente · 🟡 parcial · 🔴 ausente

| # | Requisito | Estado |
|---|---|---|
| 3 | Menu "Importar pessoal" → "Importar dados" | 🟡 Nav hoje diz **"Importar pessoas"** (`src/lib/nav-items.ts`), não "Importar pessoal" — rótulo já é razoavelmente próximo. Rota `/importacoes` não precisa mudar (caderno só pede renomear rótulo/título, manter redirect se a rota antiga já estivesse publicada — não é o caso aqui, é troca de texto, não de URL) |
| 5.1/5.2 | Tipos de dado além de pessoas (coordenadores, cidades, cargos, bancário, pagamento, despesa, extrato, contrato) | 🔴 Hoje `/importacoes` só importa **pessoas** (Excel/PDF). Cidades/eixos/cargos são cadastro manual; pagamentos/despesas não têm importação em lote nenhuma |
| 5.2 | Formatos: XLSX 🟢, CSV 🔴 (só `.xlsx` aceito hoje), PDF pesquisável 🟡 (implementado mas **quebrado em produção** — `pdf-parse`/`@napi-rs/canvas` não roda no runtime da Vercel, documentado em `docs/NOVA_VERSAO_MATRIZ.md`), DOCX 🔴 (nenhum upload de arquivo de modelo existe — é exatamente o pedido de "campo pra subir modelo de contrato" que ainda não tratei) |
| 5.3 | Fluxo de importação (staging → prévia → decisão → gravação) | 🟢 Já é assim — `import_batches` (status `staging→preview→confirmado`), nada grava direto |
| 5.4 | Normalização (CPF/CNPJ, datas, telefone, e-mail, CEP, banco, PIX, título eleitoral, valores) | 🟢 Maior parte já existe via os mesmos schemas Zod do cadastro manual (`src/lib/validations/person.ts`), reaproveitados por `classifyRow()` |
| 5.5 | Classificação (novo/compatível/complementar/divergente/duplicado/inválido/inconclusivo/pendente) | 🟡 Hoje só `pronta/invalida/duplicada_arquivo/ja_existente/importada` são realmente emitidos. `import_staging_records.result` **já tem no schema** `'possivel_duplicidade'`/`'conflitante'` prontos e nunca usados (achado documentado desde a Etapa 7) — caderno pede exatamente completar isso. "Complementar" (preencher campo vazio) não existe como conceito hoje — importação é sempre criação, nunca complementa pessoa existente (limite deliberado da Etapa 7, pra nunca sobrescrever campo sensível sem confirmação) |
| 5.6 | Comparação de identidade (CPF + nome/nascimento/filiação/telefone/e-mail/endereço como sinais) | 🟡 **Etapa A da IA de divergências** (concluída) já cobre "mesmo CPF, nome diferente" com checagem de documento por IA sob demanda. Nascimento/filiação/telefone/e-mail/endereço como sinais adicionais: 🔴 não comparados ainda |
| 5.7 | Comparação financeira (favorecido, banco, PIX, valor contratado × previsto × pago, duplicidade, contrato válido) | 🔴 **Etapa B da IA de divergências**, planejada em `docs/IA_DIVERGENCIAS.md`, não iniciada — `contracts` e `payments` são tabelas desconectadas hoje (sem `contract_id`, sem carga horária) |
| 5.8 | Tela de pré-validação com abas (Resumo/Novos/Complementares/Divergentes/...) | 🟡 `/importacoes/[id]` já mostra prévia linha a linha com resultado e erro, mas **sem abas** — é uma lista única. Campo a campo (valor atual × importado, confiança, decisão sugerida) não existe — hoje é linha inteira aprovada/rejeitada, não campo a campo |
| 5.9 | Fila de pendências (tipo, pessoa, gravidade, responsável, prazo, evidência, decisão, justificativa) | 🟡 `/divergencias` (nova, Etapa A da IA) já é essa fila — mas só cobre `dado_divergente` hoje; sem "gravidade" nem "responsável designado" como campos próprios (`data_conflicts` tem `resolved_by`/`resolution_note`, não um campo de responsável *antes* da resolução) |
| 6 | Limites do que a IA pode decidir sozinha | 🟢 Já é exatamente a filosofia adotada — `resolve_data_conflict()` nunca aplica correção sem `p_apply_correction=true` explícito do administrador; IA só sugere (`crossCheckIdentityDocument()`), nunca decide |
| 7 | Matriz de fontes confiáveis | 🔴 Não existe como configuração — é uma convenção que já seguimos na prática (documento > planilha pra identidade) mas não está formalizada em nenhuma tabela/regra |
| 8/9 | Reorganizar menu "Contratos" em 7 submódulos + upload de modelo DOCX | 🟡 `/contratos`, `/contratos/modelos`, `/contratos/[id]` já existem, mas como 3 rotas, não 7 submódulos. **Upload de modelo (DOCX/arquivo) não existe** — hoje `template_versions.body` é texto colado com `{{placeholder}}`, nunca um arquivo importado. Isso é a pergunta que você fez antes ("campo pra subir modelo de contrato") — ainda não implementada |
| 10/11 | Geração em lote com tabela de prontidão por pessoa + `contract_batches` | 🔴 **Confirmado ausente** — `generate_contract()` só gera **um contrato por vez**; geração em lote foi explicitamente deixada de fora na Etapa 5 ("fica fora, documentado no cabeçalho da migração") |
| 12 | Snapshot imutável do contrato | 🟢 Já existe — `contracts.generated_body`/`variables_used` são gravados na hora, editar o cadastro depois não muda o contrato já emitido (confirmado no código de `generate_contract()`) |
| 13 | Complementação de dados (admin/coordenador/portal/rascunho) | 🟡 `/meu-cadastro` e `/cadastro/[token]` já cobrem "o contratado completa pelo portal" — mas não há um fluxo específico "contrato pede campo faltante ao contratado" fora da correção geral de cadastro (`correction_requests`) |
| 14 | Aprovação/envio com e-mail + WhatsApp rastreado | 🟡 **Implementado o envio manual rastreado** — botão "Enviar" em `/contratos` (lista) e `/contratos/[id]`: monta link + (pra PF sem login ainda) cria acesso de verdade, e cada clique em WhatsApp/e-mail grava em `contract_deliveries`. Continua sem envio automático de verdade (nenhum provedor pago contratado) — ver seção "Envio manual de contrato" abaixo |
| 15 | Retorno do contrato (upload + registro de quem/canal/hash) | 🟡 `submit_signed_contract()` já grava hash/quem enviou/quando — falta "importação de arquivo recebido externamente" e associação por identificador seguro além do upload autenticado direto |
| 16/17 | Estados e linha do tempo do contrato | 🟡 Já existe um ciclo de status rico (ver "achado central" acima) — falta granularidade de evento por canal (enviado por e-mail às 10h, visualizado às 14h etc.) — hoje só timestamps agregados (`downloaded_at`, `signed_submitted_at`, `reviewed_at`) |
| 18 | Lembretes programados | 🔴 Não existe nenhum mecanismo de lembrete/agendamento no app |
| 19 | Painel de contratos com métricas e filtros | 🔴 Não existe painel dedicado de contratos — `/relatorios` tem pessoas/aprovações/financeiro, não contratos |
| 20 | Conciliação cadastro × contrato × pagamento | 🔴 = Etapa B da IA de divergências, planejada, não iniciada |
| 21 | Dossiê digital da pessoa | 🟡 `/pessoas/[id]/editar` já reúne cadastro/documentos/contratos-relacionados-por-RLS, mas não numa aba única "dossiê" com linha do tempo consolidada |
| 22 | Índice de prontidão configurável | 🔴 Não existe — `src/lib/painel/dashboard.ts` tem contadores por papel, não um índice de prontidão por pessoa |
| 23 | Portal do contratado (dados, documentos, contrato, pagamentos) | 🟡 Bem avançado já — `/meu-cadastro` (dados+documentos), `/contratos/[id]` (RLS já restringe ao próprio/coordenador). **Falta**: consultar os próprios pagamentos (não existe tela nenhuma disso pro contratado hoje) |
| 24 | Caixa de entrada documental centralizada | 🔴 Não existe — cada módulo (pessoas, contratos) tem upload próprio, sem uma inbox central |
| 25 | Comunicação rastreável (`communication_events`) | 🟡 `contract_deliveries` (migração `0039`) cobre o caso de contrato — canal/destinatário/quem enviou/quando. Ainda não existe pra outros tipos de comunicação (convite de usuário, lembrete, etc.) |
| 26 | Schema novo proposto | ⚠️ **Conflita** com schema já existente e em uso — ver "achado central" acima. Recomendo mapear os conceitos do caderno pras tabelas já existentes em vez de criar um schema paralelo |
| 27 | Permissões novas (`imports.*`, `contracts.*`, `hr_intelligence.*`, `payments.release`) | 🟡 Hoje a autorização é só por **papel** (`administrador`/`rh`/coordenador), não por permissão granular nomeada — funciona, mas não bate com o vocabulário do caderno. Criar essa granularidade é uma mudança de modelo de autorização, não uma migração pontual |
| 28 | Segurança (bucket privado, URL assinada, tenant isolation, CPF mascarado) | 🟢 Maior parte já é assim (buckets privados, `createSignedUrl` de 60s, isolamento por `campaign_id`/RLS) — **exceto CPF mascarado**, que é um gap real já documentado em `docs/IDENTIDADE_VISUAL.md` (CPF aparece sem máscara em pelo menos 11 arquivos) |

## Tamanho real do que falta

Separando por esforço, não por seção do caderno:

**Pequeno / já quase pronto** (reaproveita infraestrutura existente):
- Renomear "Importar pessoas" → "Importar dados" no menu.
- CSV como segundo formato de planilha (mesma pipeline do `.xlsx`).
- Ativar `'possivel_duplicidade'`/`'conflitante'` em `import_staging_records` (schema já pronto).
- Abas na tela de prévia de importação (`/importacoes/[id]`).

**Médio** (extensão de módulo existente):
- Upload de modelo de contrato (DOCX/arquivo) em vez de texto colado — a peça que você já tinha pedido antes.
- Lote de contratos (`contract_batches`) — gerar N contratos individuais de uma vez, com tabela de prontidão por pessoa antes de gerar.
- Etapa B da IA de divergências (conciliação contrato × pagamento) — já planejada em `docs/IA_DIVERGENCIAS.md`.
- Consulta de pagamentos pelo próprio contratado no portal.

**Grande / infraestrutura nova de verdade** (não existe nada hoje pra estender):
- Envio de e-mail de verdade (precisa de um provedor — Resend, SendGrid, SES — decisão de custo/conta, mesmo padrão da chave da OpenAI/Anthropic).
- WhatsApp oficial com rastreamento de entrega (hoje é só um link `wa.me` manual — integração de verdade precisa da API oficial da Meta/um BSP, outra conta paga).
- Lembretes programados (precisa de um mecanismo de agendamento — este projeto não tem nenhum job/cron hoje).
- Caixa de entrada documental centralizada.
- Índice de prontidão configurável.
- Assinatura eletrônica integrada (fase 3 do próprio caderno, explicitamente adiada por eles também).

## Envio manual de contrato (concluído)

Primeira etapa implementada desta análise — pedido do usuário: botão
"Enviar" ao lado do contrato, deixando pronto pra automatizar depois,
mas por enquanto copiando/colando ou abrindo WhatsApp/e-mail
manualmente, com a opção de mandar login + senha pra pessoa entrar no
sistema e assinar por lá.

- **Migração `0039_contract_deliveries.sql`**: tabela nova e pequena
  (`campaign_id`, `contract_id`, `channel`, `recipient`, `sent_by`,
  `created_at`) só pra registrar o envio manual de hoje — quando a
  automação de verdade vier (provedor pago, decisão futura), é só
  mais um escritor nessa mesma tabela, sem precisar de nova migração
  pra isso funcionar. RLS mirror de `contracts_select`/mesma
  autorização de quem já pode agir no contrato (admin/rh da campanha
  ou coordenador direto do alvo).
- **`sendContractAccess(contractId)`** (nova, `src/app/(app)/contratos/actions.ts`):
  - **PJ**: sem conceito de login — só monta a mensagem com o link do
    contrato, endereçada ao `email`/`phone` de `legal_entities`.
  - **PF já com login**: mensagem diz pra acessar com o login já
    existente — nunca reseta a senha de ninguém só por mandar um
    contrato.
  - **PF sem login ainda** — a decisão do usuário foi criar um login
    de verdade (não um link de token avulso): mesma sequência de
    `usuarios/actions.ts#inviteUser()` (senha derivada do telefone,
    `createAdminClient()`), só que ligando ao `person_id` já existente
    do contrato em vez de criar uma pessoa nova — precisou de uma
    checagem nova (`profiles.person_id`), que não existia em nenhum
    código do projeto até agora.
  - O link do contrato (`/contratos/[id]`) já funciona sem sessão
    prévia — o `redirectTo` do login (existente desde o Multi-tenant)
    já leva a pessoa de volta pro contrato depois de entrar.
- **`logContractDelivery()`**: grava em `contract_deliveries` só
  quando o administrador de fato clica em WhatsApp ou e-mail (não
  quando só abre o painel de envio).
- **`src/components/contratos/send-contract-access.tsx`** (novo):
  mesmo idioma visual de `ShareCredentials`
  (`src/components/usuarios/share-credentials.tsx`), botão em
  `/contratos` (lista, coluna "Ações") e `/contratos/[id]` (topo,
  visível só pra quem já vê os outros controles de conferência).
- **Verificado**: transação de teste (`rollback`) confirmando a RLS
  de `contract_deliveries` (insert/select como `administrador`);
  `npm run typecheck`/`lint`/`build` sem erros; advisors sem achado
  novo.
- **Fora de escopo, documentado**: envio automático de verdade
  (precisa de provedor pago — Resend/SES pra e-mail, API oficial da
  Meta/BSP pra WhatsApp, mesmo processo de decisão da chave da
  OpenAI), lembretes programados, assinatura eletrônica dentro do app
  ("assinar no sistema" aqui continua sendo ver o contrato logado +
  subir o PDF assinado, fluxo que já existia).

## Cabeçalho/rodapé do contrato impresso + dados da organização no corpo (concluído)

Pedido do usuário: CNPJ, e-mail, telefone e endereço do escritório
prontos como cabeçalho/rodapé do contrato, "no corpo dos contratos",
pra impressão sair completa. No meio do trabalho, o usuário trouxe um
documento novo — `docs/CADERNO_DOCUMENTAL_JURIDICO_CONTRATOS_RH_ELEITORAL.md`
— cujas seções 8/9/15 definem exatamente essa exigência com mais
precisão (cabeçalho/rodapé obrigatório em toda página, qualificação do
CONTRATANTE com representante legal) — o trabalho foi ajustado pra
seguir essa referência mais precisa antes de terminar.

- **Migração `0040`**: `campaigns` ganhou endereço (`zip_code`/
  `street`/`number`/`complement`/`neighborhood`/`city`/`state`,
  mesma convenção de `legal_entities`) e representante legal
  (`representative_name`/`representative_cpf`) — editável em
  `/master/organizacoes/[id]` (`EditOrganizationForm`), junto do
  CNPJ/e-mail/telefone que já existiam desde a Multi-tenant Etapa 1/3.
- **`ContractPrintView`** (`src/components/contratos/contract-print-view.tsx`):
  ganhou cabeçalho (nome/razão social + CNPJ da organização) e rodapé
  (CNPJ + e-mail + telefone + endereço + código do contrato) — dados
  buscados **ao vivo** da campanha no momento de ver/imprimir, não
  fazem parte do snapshot imutável do contrato (endereço do escritório
  não é cláusula contratual — se o escritório mudar de endereço, faz
  sentido que TODOS os contratos, mesmo os antigos, mostrem o endereço
  atual na hora de imprimir; diferente de valor/prazo/função, que
  continuam congelados pra sempre em `generated_body`).
- **Migração `0041`**: `generate_contract()` (existia desde a `0032`)
  nunca populava nenhuma variável da organização — só do contratado.
  Passou a somar `{{organizacao_nome}}`, `{{organizacao_cnpj}}`,
  `{{organizacao_endereco}}`, `{{organizacao_telefone}}`,
  `{{organizacao_email}}`, `{{organizacao_representante_nome}}`,
  `{{organizacao_representante_cpf}}` ao mesmo mecanismo de
  `replace()` já usado pras demais variáveis — quem editar o texto do
  modelo agora pode escrever a qualificação do CONTRATANTE (seção 15
  do caderno jurídico) usando esses marcadores. Nomeação flat
  (`organizacao_cnpj`), não o estilo com ponto do caderno
  (`{{organizacao.cnpj}}`), porque o mecanismo de substituição deste
  projeto não suporta chave aninhada.
- **Verificado**: transação de teste (`rollback`) — modelo com os 4
  marcadores novos, `generate_contract()` chamado de verdade,
  conferido que `generated_body` e `variables_used` saíram com os
  valores certos da organização. `npm run typecheck`/`lint`/`build`
  sem erros. Advisors sem achado novo.
- **Fora de escopo desta etapa**: o resto do caderno jurídico é uma
  biblioteca completa de contratos (14 tipos PF + 17 tipos PJ, texto
  de cláusula pronto pra LGPD/TSE, estados de aprovação
  draft→legal_review→accounting_review→approved, dossiê documental,
  aditivos, recibos) — não analisado ainda seção a seção; fica pra uma
  matriz própria, como esta, quando o usuário quiser avançar nisso.

## Recomendação

Não dá pra tratar isso como uma etapa só — é maior que qualquer
iniciativa desta sessão até agora. Sugiro decidir a **ordem**, não o
pacote inteiro de uma vez, seguindo o mesmo método usado em todas as
etapas anteriores (escopo pequeno e verificável, uma coisa de cada
vez). Três pontos de partida naturais, cada um independente dos
outros:

1. **Upload de modelo de contrato (DOCX)** — já era um pedido seu
   antes desta análise, e é a peça que mais destrava o resto do
   módulo de contratos.
2. **Lote de contratos** — maior "buraco" confirmado explicitamente
   desde a Etapa 5, mecânico de implementar (mesma função
   `generate_contract()`, chamada N vezes com tabela de prontidão
   antes).
3. **CSV + `possivel_duplicidade`/`conflitante` na importação** —
   menor de todos, reaproveita quase tudo que já existe.

E-mail/WhatsApp de verdade e lembretes programados dependem de decidir
um provedor pago antes de qualquer código — mesmo processo já seguido
pra Supabase/OpenAI (você gera a conta/chave, eu configuro).
