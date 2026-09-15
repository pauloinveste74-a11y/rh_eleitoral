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
| 14 | Aprovação/envio com e-mail + WhatsApp rastreado | 🔴 **Maior lacuna de infraestrutura real**: não existe envio de e-mail nenhum (nem SMTP nem provedor) — os únicos "envios" no app inteiro são links `mailto:`/`wa.me` que o próprio usuário clica manualmente (`src/components/usuarios/share-credentials.tsx`). Nenhum rastreamento de entrega/leitura existe |
| 15 | Retorno do contrato (upload + registro de quem/canal/hash) | 🟡 `submit_signed_contract()` já grava hash/quem enviou/quando — falta "importação de arquivo recebido externamente" e associação por identificador seguro além do upload autenticado direto |
| 16/17 | Estados e linha do tempo do contrato | 🟡 Já existe um ciclo de status rico (ver "achado central" acima) — falta granularidade de evento por canal (enviado por e-mail às 10h, visualizado às 14h etc.) — hoje só timestamps agregados (`downloaded_at`, `signed_submitted_at`, `reviewed_at`) |
| 18 | Lembretes programados | 🔴 Não existe nenhum mecanismo de lembrete/agendamento no app |
| 19 | Painel de contratos com métricas e filtros | 🔴 Não existe painel dedicado de contratos — `/relatorios` tem pessoas/aprovações/financeiro, não contratos |
| 20 | Conciliação cadastro × contrato × pagamento | 🔴 = Etapa B da IA de divergências, planejada, não iniciada |
| 21 | Dossiê digital da pessoa | 🟡 `/pessoas/[id]/editar` já reúne cadastro/documentos/contratos-relacionados-por-RLS, mas não numa aba única "dossiê" com linha do tempo consolidada |
| 22 | Índice de prontidão configurável | 🔴 Não existe — `src/lib/painel/dashboard.ts` tem contadores por papel, não um índice de prontidão por pessoa |
| 23 | Portal do contratado (dados, documentos, contrato, pagamentos) | 🟡 Bem avançado já — `/meu-cadastro` (dados+documentos), `/contratos/[id]` (RLS já restringe ao próprio/coordenador). **Falta**: consultar os próprios pagamentos (não existe tela nenhuma disso pro contratado hoje) |
| 24 | Caixa de entrada documental centralizada | 🔴 Não existe — cada módulo (pessoas, contratos) tem upload próprio, sem uma inbox central |
| 25 | Comunicação rastreável (`communication_events`) | 🔴 Não existe — ver item 14 |
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
