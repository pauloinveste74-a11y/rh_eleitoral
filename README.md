# RH Eleitoral

Sistema de gestão de pessoas, operações e pagamentos para campanha eleitoral.

> **Fase atual: 9 — Usuários.** Sobre a base técnica (Fase 1A), **Pessoas**
> (Fase 1B), **multi-tenant** por campanha (Fase 1C —
> [Multi-tenant](#multi-tenant)), **Aprovações** (Fase 2), **Financeiro**
> (Fase 3 — pagamentos avulsos e em lote, [Financeiro](#financeiro)),
> **Despesas** (Fase 6 — reembolso com comprovante, [Despesas](#despesas)),
> **Auditoria** (Fase 7 — trilha de eventos, [Auditoria](#auditoria)) e
> **Relatórios** (Fase 8 — financeiro/pessoas/aprovações com filtro e CSV,
> [Relatórios](#relatórios)), o sistema agora tem uma tela de
> **Usuários**: login sempre por e-mail + senha (últimos dígitos do
> telefone, trocável depois em "Minha conta") e atribuição de papéis com
> escopo territorial (ver [Usuários](#usuários)) — não fazia parte dos 8 módulos
> originais da Fase 1A, é uma adição pedida nesta sessão. A numeração de
> fase aqui segue o rótulo original dos placeholders da Fase 1A (mais essa
> adição), não uma sequência 1-2-3-4 — ver a tabela em
> [Próxima fase](#próxima-fase) para o mapeamento completo. Os módulos
> restantes (Ponto, Operações) serão implementados em fases seguintes.
>
> **Iniciativa nova em andamento**: uma especificação separada
> (`docs/IMPLEMENTACAO_CADASTRO_IMPORTACAO_DESPESAS.md`) pede autocadastro
> por convite, cadeia de coordenação, importação em lote por Excel e uma
> reformulação de Despesas com autorizador/alçada — ver
> [MVP — Cadastro, Convite, Coordenação, Importação e Despesas](#mvp--cadastro-convite-coordenação-importação-e-despesas)
> logo abaixo. As Etapas 1 a 11 estão implementadas — banco (migrações
> `0013`–`0028`) aplicado e verificado em produção; app
> (`/meu-cadastro`, `/minha-equipe`, `/cadastro/[token]` (com correção
> campo a campo), `/validacoes`, `/importacoes` (com reversão),
> `/despesas` com autorizador de registro e `/despesas/alcadas` com
> escopo de eixo/cidade) passando em `typecheck`/`lint`/`build`. Todos
> os pontos da spec original têm implementação funcional agora.
>
> **Referência rápida**: `docs/FUNCOES_E_ROTAS.md` lista todas as
> funções `SECURITY DEFINER` do banco (quem chama, o que verifica, o que
> faz) e todas as rotas do app, levantado direto do banco em produção —
> use esse arquivo pra consulta pontual de "o que existe", em vez de
> procurar espalhado pelas seções de cada fase abaixo.

## MVP — Cadastro, Convite, Coordenação, Importação e Despesas

Especificação própria (`docs/IMPLEMENTACAO_CADASTRO_IMPORTACAO_DESPESAS.md`,
20 seções), pedida à parte da numeração de fases acima. Trabalho dividido em
6 etapas verificáveis (seção 19 do documento); plano detalhado de cada etapa
fica em `C:\Users\LENOVO\.claude\plans\hidden-yawning-pillow.md` (arquivo
local do agente, não versionado no repositório).

**Etapa 1 — camada de banco (concluída e verificada):**

- Migrações `0013`–`0021` aplicadas ao projeto `pjjarkxwwzqiajlvpsdx` (via
  Supabase CLI, `supabase db push`, pelo próprio usuário — o MCP do
  Supabase esteve indisponível nesta sessão no momento da aplicação).
  Histórico de migrações (`supabase_migrations.schema_migrations`)
  registrado manualmente depois, porque o `db push` não deixou rastro lá
  apesar de ter criado o schema corretamente.
- 15 tabelas novas, todas com RLS habilitada: `registration_invites`,
  `coordination_relationships`, `registration_submissions`,
  `registration_field_reviews`, `correction_requests`, `import_batches`,
  `import_staging_records`, `import_row_errors`, `data_conflicts`,
  `expense_categories`, `expense_authorization_rules`, `expense_documents`,
  `expense_approvals`, `notifications` — mais `person_documents` e
  `expenses` ganhando colunas novas (nenhuma tabela recriada).
- `people`: CPF e título de eleitor deixam de ser únicos globalmente e
  passam a ser únicos **por campanha**, só entre cadastros ativos (índices
  únicos parciais) — a mesma pessoa real pode ter cadastro em campanhas
  diferentes. `status` ganha 8 valores novos (aditivo).
- `coordination_relationships`: cadeia de coordenação pessoa→pessoa, com
  trigger de prevenção de ciclo (CTE recursiva).
- `redeem_registration_invite()`: primeira função do projeto liberada para
  o papel `anon` (protegida por token aleatório, não por RLS/sessão) — é
  como o contratado, sem login tradicional, acessa o próprio convite.
- `create_expense()`/`decide_expense()` **não mudaram de assinatura** —
  `/despesas` em produção continua funcionando exatamente como antes; as
  colunas/tabelas novas de despesas ficam prontas e não obrigatórias até a
  Etapa 5 escrever o código que as usa.
- **Verificado** (Supabase Advisors + simulação de sessão via
  `set local role authenticated; set local request.jwt.claims = ...` em
  transações com `rollback`, direto no banco real): nenhum alerta de
  segurança novo além do `redeem_registration_invite` (esperado);
  usuário sem `profile_roles` não enxerga nenhuma linha das tabelas novas;
  `administrador` grava normalmente dentro da própria campanha; inserir um
  vínculo de coordenação fora da campanha é rejeitado por
  `check_same_campaign()`; criar um ciclo de coordenação (A coordena B,
  tentar fazer B coordenar A) é rejeitado pelo trigger; cadastrar um CPF
  já ativo na mesma campanha é rejeitado pelo índice único parcial.
- `npm run typecheck`/`lint`/`build` — sem erros (nenhum código de
  aplicação foi alterado nesta etapa, só SQL).
- **Riscos/pendências**: RLS de `coordination_relationships`/
  `registration_submissions`/etc. hoje só libera `administrador`/`rh` — o
  contratado (sem login Supabase Auth tradicional, só um link com token)
  ainda não tem acesso modelado; fica para a Etapa 2, quando o mecanismo
  de sessão dele for decidido.

**Etapa 2 — coordenador completa o próprio cadastro e convida o cabo
eleitoral (camada de banco concluída e verificada; UI ainda não
existe):**

- Migração `0022_etapa2_autocadastro_coordenacao.sql` aplicada ao projeto
  `pjjarkxwwzqiajlvpsdx` pelo próprio usuário via Supabase CLI
  (`supabase db push` — mesmo motivo da Etapa 1, MCP instável na hora).
  Histórico de migrações registrado manualmente depois (mesmo gap de
  bookkeeping da Etapa 1).
- Mecanismo de sessão decidido: o **coordenador tem login normal**
  (e-mail + senha, reaproveita `/usuarios` da Fase 9); o **cabo
  eleitoral nunca tem login** — só o link/token de
  `registration_invites` já construído na Etapa 1. Preenche o elo
  `profiles.person_id` (existe desde a `0001`, nunca usado até aqui).
- 5 funções novas, todas `security definer`, autorização própria via
  `auth.uid()` (nenhuma política de `INSERT`/`UPDATE` de
  `people`/`coordination_relationships`/`registration_submissions`/
  `registration_invites` muda — só as duas funções seguintes que também
  vão para `anon`, mais `redeem_registration_invite()` da Etapa 1):
  - `complete_own_registration(...)`: qualquer `authenticated` cria/edita
    a **própria** `people` (liga `profiles.person_id` na primeira
    chamada) e os 3 satélites (endereço, banco, dados eleitorais).
  - `create_team_invite(...)`: qualquer `authenticated` que já completou
    o próprio cadastro cria um convite para um subordinado; herda
    cidade/eixo do `profile_roles` do chamador quando ele for
    `coordenador_cidade`/`coordenador_eixo`.
  - `submit_public_registration(...)`: terceira função liberada para
    `anon` — cria a `people` do cabo eleitoral a partir do token do
    convite, sem sessão nenhuma; cria o vínculo em
    `coordination_relationships` com o coordenador sugerido no convite.
  - `submit_registration_for_review(p_person_id)`: o próprio coordenador
    (ou admin/rh) envia a própria `people` para validação do gestor —
    exige ao menos 1 documento ativo.
  - `submit_public_registration_for_review(p_token)`: mesma função, mas
    para o cabo eleitoral via token, sem `auth.uid()`.
- RLS: 6 extensões pontuais, todas restritas ao próprio registro —
  `person_documents_insert` e a policy de Storage
  `pessoas_documentos_insert` passam a aceitar upload sobre o próprio
  `person_id`; `people_select`, `registration_submissions_select`,
  `coordination_relationships_select` e `registration_invites_select`
  passam a liberar leitura da própria pessoa/equipe/convites criados.
  Nenhuma policy de escrita além de `person_documents_insert` muda.
- **Verificado** (via `execute_sql` direto, testes funcionais em
  transação com `rollback` — sem dado de teste residual ao final):
  `complete_own_registration` cria a pessoa e liga `profiles.person_id`;
  `create_team_invite` gera o convite com o coordenador correto;
  `submit_public_registration` com o token do convite cria a pessoa do
  cabo eleitoral e o vínculo em `coordination_relationships`
  (`relationship_type = 'contratado_para_coordenador'`, `status =
  'vigente'`); `submit_public_registration_for_review` rejeita quando a
  pessoa não tem nenhum documento ativo (`P0001`) e, com 1 documento,
  conclui corretamente (`registration_invites.status = 'concluido'`,
  `people.status = 'aguardando_gestor'`,
  `registration_submissions.status = 'aguardando_validacao_gestor'`,
  `manager_person_id` apontando pro coordenador certo).
- `npm run typecheck`/`lint`/`build` — sem erros (nenhum código de
  aplicação foi alterado nesta etapa, só SQL).
- **Riscos/pendências**: nenhum segundo usuário não-admin real existe no
  banco ainda, então o isolamento de RLS entre contas foi testado só por
  simulação de `auth.uid()` (mesma limitação já registrada desde a Fase
  3), não com uma sessão de verdade de um coordenador/cabo eleitoral. A
  conexão do MCP do Supabase ficou instável por boa parte desta etapa
  (erros de socket intermitentes, sem relação aparente com a query) —
  contornado com novas tentativas e o usuário aplicando a migração
  manualmente via CLI quando necessário.

**Etapa 3 — páginas de aplicação para o que a Etapa 2 habilitou no banco
(concluída):**

- `/meu-cadastro`: o coordenador completa os próprios dados. Reaproveita
  `PersonForm` (o mesmo componente de `/pessoas/novo` e
  `/pessoas/[id]/editar`) — a Server Action que ele chama passou a ser
  configurável (`action`/`submitLabel`/`showSocialName`/`onSuccess`, todos
  opcionais, sem mudar nenhum dos usos existentes em `/pessoas`) para
  apontar para `complete_own_registration()` em vez de gravar direto em
  `people`. `profiles.person_id` decide se a página mostra "criar" ou
  "editar" — sem rota própria por ID, é sempre a pessoa do usuário logado.
  Reaproveita também `uploadPersonDocument()` de `/pessoas` sem alterações
  (a extensão de RLS da Etapa 2 já cobre "upload sobre o próprio
  `person_id`"). Botão "Enviar para validação" some quando o status não é
  mais editável — mesmo padrão de `SendForApprovalCard` (componente fica
  sempre montado, decide sozinho o que mostrar).
- `/minha-equipe`: lista os convites que o próprio usuário criou
  (`registration_invites.created_by`) e cria novos via
  `create_team_invite()`. Depois de criado, mostra o link
  `/cadastro/{token}` num componente `ShareInviteLink` (mesmo padrão de
  `ShareCredentials` do `/usuarios` — copiar / WhatsApp). Bloqueada com um
  aviso até o usuário completar o próprio cadastro (a função exige
  `profiles.person_id` preenchido).
- `/cadastro/[token]`: página pública (fora do grupo `(app)`, sem
  sidebar/topbar), adicionada a `PUBLIC_ROUTES` no proxy. Fluxo em 3
  passos na mesma página, sem reload (`PublicRegistrationFlow`, estado
  local): formulário (`submit_public_registration`) → upload de
  documento(s) → "enviar para validação"
  (`submit_public_registration_for_review`). Reabrir o mesmo link depois
  de já ter enviado os dados pula direto para a etapa certa (o servidor
  decide a partir de `invite.person_id`/`invite.status`, nunca o client).
  Upload de documento sem sessão nenhuma: a Server Action revalida o
  token chamando `redeem_registration_invite()` de novo (idempotente) e
  só então usa o cliente com a service role key
  (`src/lib/supabase/admin.ts`) pra subir o arquivo e gravar
  `person_documents` — mesma ordem "autoriza com o cliente normal, só
  depois usa o admin" de `/usuarios`; **segunda vez que o projeto usa o
  cliente admin fora de `/usuarios`**.
- `src/types/database.ts` (mantido à mão desde a Fase 1A) ganhou os tipos
  de `registration_invites`, `coordination_relationships`,
  `registration_submissions` e das 6 funções da Etapa 2 (mais
  `redeem_registration_invite`, que já existia sem tipo) — sem isso,
  TypeScript estrito não deixaria compilar nenhuma chamada a essas
  tabelas/funções. `PersonStatus` ganhou os 8 valores novos da migração
  `0013` (só agora usados por código de aplicação pela primeira vez).
- `npm run typecheck`/`lint`/`build` — sem erros nem avisos; as 3 rotas
  novas aparecem no build (`/meu-cadastro`, `/minha-equipe`,
  `/cadastro/[token]`).
- **Riscos/pendências**: nenhum teste interativo via Playwright (segue a
  instrução já dada nesta sessão — "não vamos testar mais nada"); só
  `typecheck`/`lint`/`build`. A fila de validação do gestor sobre
  `registration_submissions` (aprovar/rejeitar/pedir correção) ainda não
  tem tela — hoje só dá pra decidir via SQL direto. Importação em lote por
  Excel e a reformulação de Despesas com autorizador/alçada (banco já
  pronto desde a Etapa 1) também não têm UI ainda.

**Etapa 4 — fila de validação do gestor (concluída):**

- Migração `0023_etapa4_fila_validacao_gestor.sql`: função
  `decide_registration_submission(p_submission_id, p_decision, p_reason)`
  (`aprovar`/`rejeitar`/`solicitar_correcao`), mesmo idioma de
  `decide_approval()` (0006) — `SECURITY DEFINER`, autoriza e audita ela
  mesma. Só atua sobre submissões em `aguardando_validacao_gestor`;
  `aprovar` → `aprovado_gestor`, `rejeitar` → `rejeitado` (grava
  `rejection_reason`), `solicitar_correcao` → `correcao_solicitada` +
  cria uma linha em `correction_requests`. Autorizado: `administrador`/
  `rh`, ou a pessoa cujo `people.id` bate com
  `registration_submissions.manager_person_id` do chamador. **Nenhuma
  policy de RLS muda** — a Etapa 2 já libera leitura da própria fila.
- `/validacoes`: nova página listando o que está `aguardando_validacao_gestor`
  para o usuário decidir (RLS já filtra: administrador/rh vê tudo da
  campanha, coordenador só o que é `manager_person_id` dele; a tela ainda
  exclui a própria submissão da lista, que pertence a `/meu-cadastro`).
  Formulário de decisão com 3 botões (aprovar/solicitar correção/rejeitar)
  + motivo, mesmo padrão de `ApprovalDecisionForm` em `/aprovacoes`. O
  reenvio após correção **não precisou de código novo**: `people.status =
  'correcao_solicitada'` já cai nos `EDITABLE_STATUSES` de `/meu-cadastro`
  (Etapa 3), que já permite editar e reenviar para validação.
- **Bug de segurança encontrado e corrigido durante o teste, antes de
  qualquer publicação**: a checagem de autorização original comparava
  `registration_submissions.manager_person_id = v_manager_person_id` sem
  proteger contra `v_manager_person_id` nulo (usuário sem
  `profiles.person_id`) — em PL/pgSQL, `NULL` propagando por `AND`/`OR`
  faz `v_authorized` virar `NULL`, e `if not v_authorized` **não dispara**
  para `NULL` (só para `false` explícito), deixando um chamador não
  autorizado passar. Corrigido com um guard `v_manager_person_id is not
  null and ...` mais um `coalesce(v_authorized, false)` de defesa em
  profundidade. Auditei as outras 4 funções de decisão do projeto
  (`decide_approval`, `decide_expense`, `decide_payment`,
  `submit_registration_for_review`) — nenhuma tinha esse padrão vulnerável
  (todas já guardavam comparações contra valor possivelmente nulo, ou só
  compunham `v_authorized` a partir de funções que retornam booleano
  garantido via `coalesce` interno).
- **Verificado** (testes funcionais diretos, em transação com `rollback`,
  sem dado residual): `aprovar`/`rejeitar`/`solicitar_correcao` fazem a
  transição de status correta em `registration_submissions` **e**
  `people`; `solicitar_correcao` cria a linha em `correction_requests`
  com o motivo certo; decidir a mesma submissão duas vezes é rejeitado
  (`status atual: aprovado_gestor`); decisão inválida é rejeitada;
  chamador sem vínculo com a submissão é rejeitado (só depois da correção
  do bug acima — antes dela, esse teste vazava).
- `npm run typecheck`/`lint`/`build` — sem erros nem avisos; `/validacoes`
  aparece no build.
- **Riscos/pendências**: mesma limitação de sempre — sem um segundo
  usuário não-admin real, não dá pra testar o caminho "só
  `manager_person_id`, sem ser admin/rh" com uma sessão de verdade (só
  via simulação de `auth.uid()`). A revisão campo a campo
  (`registration_field_reviews`, reabrir só os campos específicos
  pedidos) e a etapa de validação do RH (`aprovado_gestor` →
  `aguardando_rh` → `validado`) ficam para a etapa seguinte.

**Etapa 5 — validação do RH (concluída):**

- Migração `0024_etapa5_validacao_rh.sql`: função
  `decide_rh_validation(p_submission_id, p_decision, p_reason)`
  (`validar`/`rejeitar`/`solicitar_correcao`), mesmo idioma de
  `decide_registration_submission()` (0023) — `SECURITY DEFINER`, mas
  autorização **só** `administrador`/`rh` (não existe "gestor pessoa
  física" nesta etapa). Atua sobre submissões em `aprovado_gestor`;
  `validar` → `validado`, `rejeitar` → `rejeitado`, `solicitar_correcao`
  → `correcao_solicitada` (mesmo efeito colateral de criar
  `correction_requests` e cair de volta em `/meu-cadastro` para reenvio).
  Como só administrador/rh chama esta função, ela audita via
  `log_audit_event()` direto (não precisa do insert manual em
  `audit_logs` que `decide_registration_submission()` usa para o
  coordenador comum).
- **Simplificação deliberada**: trata `aprovado_gestor` como o próprio
  estado "aguardando RH" — não introduz uma transição para o valor
  `aguardando_rh` do enum (reservado desde a `0013`) porque não existe
  nenhum processo real entre gestor e RH ainda (ex.: checagem automática
  de documento). Fica pronto para uma etapa futura inserir esse passo
  sem precisar de migração de dado.
- `/validacoes` ganhou uma segunda seção, "Validação do RH" — só visível
  para quem tem o papel `administrador`/`rh` (checagem via `has_role()`
  no Server Component, mesma tela nunca faz uma query a mais pra quem
  não precisa dela). O componente de fila (`ValidationQueue`) e o
  formulário de decisão (`ValidationDecisionForm`) foram generalizados
  nesta etapa para servir as duas filas (gestor e RH), recebendo a
  Server Action e os rótulos como prop — mesmo espírito da generalização
  de `PersonForm` na Etapa 3.
- **Verificado** (testes funcionais diretos, em transação com `rollback`,
  sem dado residual): as 3 decisões fazem a transição de status correta;
  `solicitar_correcao` cria `correction_requests`; redecidir a mesma
  submissão é rejeitado; chamador sem papel `administrador`/`rh` (mesmo
  com `profiles.person_id` preenchido) é rejeitado — confirmando que esta
  função, ao contrário da Etapa 4, não aceita o caminho
  `manager_person_id`.
- `npm run typecheck`/`lint`/`build` — sem erros nem avisos.
- **Riscos/pendências**: revisão campo a campo
  (`registration_field_reviews`) continua sem UI — hoje uma correção
  solicitada reabre o cadastro inteiro em `/meu-cadastro`, não só os
  campos específicos. Importação em lote por Excel (banco pronto desde a
  Etapa 1) segue sem UI.

**Etapa 6 — importação de pessoas em lote por Excel (concluída):**

- **Sem migração nova** — `import_batches`/`import_staging_records`/
  `import_row_errors` (Etapa 1) já tinham policy de `INSERT`/`UPDATE`
  direta para `administrador`/`rh`, e `people`/satélites também (desde a
  `0005`) — diferente de todo o resto desta iniciativa, aqui não precisou
  de nenhuma função `SECURITY DEFINER` nova. Confirmação da importação é
  uma Server Action fazendo os mesmos inserts diretos que `/pessoas/novo`
  já faz, só que em lote.
- **Nova dependência**: `xlsx` (SheetJS) para ler o arquivo `.xlsx` no
  servidor. **Decisão deliberada**: a versão publicada no npm
  (`0.18.5`) tem 2 vulnerabilidades conhecidas de severidade alta
  (prototype pollution, `GHSA-4r6h-8v6p-xvw6`; ReDoS,
  `GHSA-5pgg-2g8v-p4x9`) — relevantes aqui porque o app processa arquivo
  enviado por usuário, exatamente o vetor das duas falhas. `npm audit`
  não tem correção disponível via registry (o autor parou de publicar
  versões novas no npm); instalado direto do CDN oficial do SheetJS
  (`https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`, canal de
  distribuição documentado pelo próprio projeto), que já corrige as
  duas. `npm audit` confirma 0 vulnerabilidades depois da troca.
- `src/lib/imports/`: `columns.ts` (cabeçalho aceito, sem dependência de
  `xlsx`/`server-only` — importável por um Client Component só pra
  mostrar a lista de colunas) + `person-import.ts` (parsing do arquivo +
  classificação de cada linha, reaproveitando exatamente os schemas de
  `personSchema`/`addressSchema`/`bankAccountSchema`/`electoralDataSchema`
  — mesma régua de validação de um cadastro manual, sem duplicar regra).
  Casamento de cabeçalho tolera acento/caixa (`normalizeHeader()`); só
  "Nome completo" e "CPF" são obrigatórios.
- **Simplificação deliberada**: dos 10 valores possíveis de
  `import_staging_records.result`, esta etapa usa 5 (`pronta`,
  `invalida`, `duplicada_arquivo`, `ja_existente`, `importada`) — os
  outros 5 (`incompleta`, `possivel_duplicidade`, `conflitante`,
  `pendente_decisao`, `rejeitada`) implicam decisão manual linha a linha
  ou correspondência difusa de nome, fora do escopo desta etapa.
  "Reverter uma importação já confirmada" (`import_batches.status =
  'revertido'`) também fica de fora — o schema já reserva o valor, mas
  a lógica ("só reverter se nada do lote tiver vínculo posterior") não
  foi implementada.
- `/importacoes`: upload da planilha + lista de lotes já enviados.
  `/importacoes/[id]`: prévia linha a linha (nome, CPF, resultado,
  detalhe do erro) + "Confirmar importação" (só se `status = 'preview'`)
  ou "Cancelar". Pessoa confirmada entra como `rascunho`/
  `origin = 'importacao_excel'`, igual a uma pessoa criada manualmente —
  seguem o mesmo `/pessoas` e o mesmo fluxo de aprovação de sempre.
- **Verificado**: lógica de parsing/classificação testada isoladamente
  fora do Next.js (`npx tsx`, com uma planilha montada em memória via
  `xlsx`) cobrindo linha válida, nome faltando, CPF inválido, CPF
  duplicado no arquivo e CPF já existente — todas as 5 classificações
  bateram. Fluxo de gravação (staging → `people` → satélites →
  contadores do lote) testado direto no banco em transação com
  `rollback`, sem dado residual.
- `npm run typecheck`/`lint`/`build` — sem erros nem avisos;
  `/importacoes` e `/importacoes/[id]` aparecem no build.
- **Riscos/pendências**: sem teste via upload real de arquivo pelo
  navegador (Playwright pausado). Confirmação processa as linhas uma a
  uma (sequencial, não em lote no banco) — aceitável para o volume
  esperado de uma campanha, mas não pensado para milhares de linhas de
  uma vez. Reversão de importação e as 5 classificações mais finas do
  enum ficam para uma etapa futura, se a demanda aparecer.

**Etapa 7 — despesas com autorizador de registro (concluída):**

- Migração `0025_etapa7_despesas_autorizador.sql`: **estende**
  `create_expense()` (mesma função da Fase 6, `0009` — não uma v2) com 11
  parâmetros novos, todos opcionais (`default null`) no final da lista:
  categoria estruturada (`p_category_id`), motivo (`p_purpose`),
  fornecedor (`p_vendor_name`/`p_vendor_document`), forma de pagamento,
  comprador (`p_purchaser_person_id` — se omitido, é a própria pessoa
  reembolsada) e o **autorizador de registro**: pessoa do sistema
  (`p_authorized_by_profile_id`, com snapshot de nome/telefone/papel
  gravado no momento da criação) **ou** alguém não identificado no
  sistema (`p_unidentified_authorizer_name/phone/reason`, texto livre) —
  a função rejeita se os dois caminhos vierem preenchidos juntos. Gera
  `protocol` automaticamente (`EXP-AAAAMMDD-XXXXXX`). `decide_expense()`
  **não muda** — continua decidindo por status, que nenhuma coluna nova
  afeta.
- **Cuidado técnico**: como a lista de parâmetros cresceu (6 → 17),
  `create or replace function` sozinho teria criado uma SEGUNDA função
  sobrecarregada em vez de substituir a de 6 parâmetros da Fase 6 (Postgres
  identifica uma função pela assinatura completa) — a migração começa com
  um `drop function` explícito da assinatura antiga antes de recriar.
- `profiles_select` ganhou o papel `financeiro` na lista que enxerga
  outros perfis (mesmo padrão aditivo de `0010`/`0011`, que já tinham
  acrescentado `auditor` e `rh`) — necessário pra quem cria a despesa
  poder escolher "autorizador = pessoa do sistema" num select; sem isso
  o financeiro veria uma lista vazia.
- Alçada (`expense_authorization_rules`, criada na Etapa 1) **continua
  só informativa e sem UI de configuração** nesta etapa — só dá pra
  cadastrar regra via SQL direto. Não bloqueia criação nem decisão.
- `/despesas/novo`: formulário reescrito com os campos novos —
  categoria vem de `expense_categories` (não mais do enum fixo
  diretamente, embora o texto legado continue sendo gravado, derivado do
  `code` da categoria escolhida), autorizador com alternância "pessoa do
  sistema" (select) / "não identificado" (nome + motivo em texto livre,
  ambos obrigatórios nesse caso), canal de autorização. `/despesas` (lista)
  ganhou colunas de protocolo (abaixo do nome da pessoa) e autorizador.
- **Verificado** (testes funcionais diretos, em transação com `rollback`,
  sem dado residual): os dois caminhos de autorizador gravam
  corretamente (snapshot de nome/telefone/papel quando é pessoa do
  sistema; nome/telefone/motivo em texto livre quando não identificado);
  informar os dois caminhos ao mesmo tempo é rejeitado; `category_id`,
  fornecedor, forma de pagamento, comprador e protocolo gravam certo.
- `npm run typecheck`/`lint`/`build` — sem erros nem avisos.
- **Riscos/pendências**: sem tela de configuração de alçada
  (`expense_authorization_rules`) — só leitura/checagem futura, sem
  cadastro de regra pela UI. "Valor autorizado diferente do valor
  pedido" (`authorized_amount_cents`) não tem fluxo próprio —
  `amount_cents` continua sendo o único valor de fato pago. Sem teste
  via navegador (Playwright pausado). Sem um segundo usuário
  `financeiro` real pra confirmar a leitura de `profiles` na prática
  (mesma limitação de sempre).

**Etapa 8 — configuração de alçada pela UI (concluída):**

- Migração `0026_etapa8_alcada_delete_policy.sql`: único ajuste de
  banco — `expense_authorization_rules` (criada na Etapa 1) tinha
  `select`/`insert`/`update` para `administrador`, mas nenhuma policy
  de `delete` (RLS bloqueia por padrão sem uma policy explícita); sem
  ela, a tela de configuração não conseguiria remover uma regra criada
  por engano. Resto desta etapa é só app — mesmo espírito de
  `/importacoes` (Etapa 6), sem função `SECURITY DEFINER` nova.
- `/despesas/alcadas` (só `administrador`, via `is_admin()` — não
  `administrador`/`rh` como o resto de Despesas): cria regra de alçada
  por papel (com teto em R$, escopo opcional de eixo ou cidade) e lista/
  remove regras existentes.
- `/despesas` (lista) ganhou um selo "Dentro da alçada" / "Fora da
  alçada" / "Sem regra definida" por despesa com autorizador identificado
  no sistema (`src/lib/expenses/alcada.ts`). Continua **só
  informativo**: não bloqueia criação nem decisão de despesa.
- **Verificado**: criar e remover uma regra testado direto no banco em
  transação com `rollback`, sem dado residual.
- `npm run typecheck`/`lint`/`build` — sem erros nem avisos;
  `/despesas/alcadas` aparece no build.

**Etapa 9 — indicador de alçada com escopo, e alçada por pessoa específica
(concluída, sem migração nova):**

- `/despesas/alcadas`: a regra passa a poder ser "por papel" ou "por
  pessoa específica" (alternância no formulário) — a segunda opção usa
  `expense_authorization_rules.profile_id`, coluna que já existia no
  banco desde a Etapa 1 mas não tinha UI. A listagem resolve o nome da
  pessoa quando a regra é desse tipo.
- `src/lib/expenses/alcada.ts` (`computeAlcadaStatus`) refeito pra
  considerar o **escopo de eixo/cidade** da regra, que a Etapa 8 tinha
  deixado de fora: uma regra por papel com `axis_id`/`city_id`
  preenchido só bate se o autorizador tiver esse papel **nesse mesmo**
  eixo/cidade (via `profile_roles.axis_id`/`city_id`) — não em qualquer
  lugar da campanha. Regra por pessoa específica continua batendo
  direto, sem olhar papel ou escopo.
- **Verificado**: criação de regra por pessoa específica testada direto
  no banco em transação com `rollback` (sem dado residual); a lógica de
  `computeAlcadaStatus` testada isoladamente (`npx tsx`, sem Next.js)
  com 6 casos — papel dentro/fora do teto, papel com escopo batendo,
  papel com escopo **não** batendo (autorizador de outro lugar — deve
  cair pra "sem regra", não pra um teto de outro lugar), pessoa
  específica, e nenhuma regra aplicável.
- `npm run typecheck`/`lint`/`build` — sem erros nem avisos.
- **Riscos/pendências**: sem teste via navegador (Playwright pausado);
  sem um segundo usuário real com papel territorial pra confirmar o
  cruzamento de escopo com uma sessão de verdade (mesma limitação de
  sempre).

Com as Etapas 8 e 9, a lacuna citada no próprio nome da spec ("despesas
com autorizador **e alçada**") tem UI própria e considera escopo.

**Etapa 10 — reversão de importação confirmada (concluída):**

- Migração `0027_etapa10_reverter_importacao.sql`: `revert_import_batch(p_batch_id)`
  — só funciona sobre um lote `confirmado`; **tudo ou nada**: se
  QUALQUER pessoa criada pelo lote já tiver `status` além de `rascunho`,
  ou qualquer vínculo posterior (pagamento, despesa, vínculo
  organizacional, cadeia de coordenação, submissão de cadastro, ou até
  um login vinculado via `profiles.person_id`), a função inteira falha
  sem apagar nada. Se passar na checagem, apaga as pessoas do lote (e
  satélites), desvincula `import_staging_records.person_id` (volta pra
  `result = 'pronta'`) e marca o lote como `revertido`.
- **Bug real encontrado e corrigido durante o teste**: a primeira versão
  apagava `people` antes de desvincular `import_staging_records.person_id`
  — como essa FK é `RESTRICT` (não `CASCADE`), o Postgres rejeitava o
  `delete` com violação de chave estrangeira. Corrigido invertendo a
  ordem (desvincula primeiro, apaga depois).
- `/importacoes/[id]`: botão "Reverter importação" quando o lote está
  `confirmado`; mensagem própria quando já está `revertido`.
- **Verificado** (testes funcionais diretos, em transação com
  `rollback`, sem dado residual): reversão bem-sucedida remove a pessoa
  e reseta o `staging record`/lote corretamente; pessoa com vínculo
  posterior (testado com `organizational_assignments`) bloqueia a
  reversão inteira e não apaga nada; reverter um lote que não está
  `confirmado` é rejeitado; chamador sem papel `administrador`/`rh` é
  rejeitado.
- `npm run typecheck`/`lint`/`build` — sem erros nem avisos.
- **Riscos/pendências**: sem teste via navegador (Playwright pausado).

**Etapa 11 — revisão campo a campo + reabertura do cabo eleitoral
(concluída):**

Duas lacunas fechadas juntas, porque são a mesma funcionalidade na
prática:

1. "Solicitar correção" (Etapas 4/5) sempre gravava
   `correction_requests.field_names` vazio — o gestor/RH não tinha como
   apontar QUAIS campos estavam errados, só um motivo em texto livre.
2. **Achado ao investigar o item 1**: o cabo eleitoral
   (`/cadastro/[token]`) **nunca conseguia reabrir o próprio cadastro**
   depois de uma correção solicitada — a página pública só olhava
   `registration_invites.status` (que fica `concluido` para sempre
   depois do primeiro envio), nunca `people.status`. Era um bug
   funcional real, não só falta de granularidade: pra esse público (sem
   login), "correção solicitada" simplesmente não tinha como acontecer
   na prática.

- Migração `0028_etapa11_revisao_campo_a_campo.sql`:
  - `decide_registration_submission()`/`decide_rh_validation()` ganham
    `p_field_names text[]` (precisou `drop function` antes — mesmo
    cuidado da Etapa 7, adicionar parâmetro muda a assinatura).
  - `get_public_registration_status(p_token)`: **nova função anon** —
    devolve o status da pessoa, os dados atuais (pra pré-popular o
    formulário) e a correção pendente (motivo + campos), protegida só
    pelo token. Não muda nada, só lê.
  - `update_public_registration(p_token, ...)`: **nova função anon** —
    o cabo eleitoral reedita os próprios dados; só funciona se
    `people.status` estiver em `correcao_solicitada`/`reenviado`
    (diferente de `submit_public_registration()`, que só cria uma vez).
  - `submit_public_registration_for_review()` perde a checagem de
    `invite.status = 'concluido'` (era o que impedia reenviar — o bug
    real) e passa a marcar `correction_requests.resolved_at` ao
    reenviar. `submit_registration_for_review()` (coordenador) ganha a
    mesma resolução, por consistência.
  - `correction_requests_select`: estendida pra a própria pessoa e o
    gestor dela — **outro achado durante o teste**: antes só
    administrador/rh liam, e o coordenador não conseguia ver a própria
    correção pendente em `/meu-cadastro`.
- `src/lib/validations/correction-fields.ts`: lista canônica dos campos
  que podem ser apontados — mesmas chaves de `PersonFormValues`, usada
  tanto pelo seletor do gestor quanto por quem corrige.
- `PersonForm` ganha `editableFields?: string[] | null` — quando
  informado, só os campos da lista ficam editáveis, o resto vira
  somente leitura (`disabled`). `/validacoes` ganha um checklist de
  campos (recolhido por padrão) junto ao motivo, só relevante quando a
  decisão é "Solicitar correção". `/meu-cadastro` e `/cadastro/[token]`
  passam a mostrar um aviso com o motivo da correção e travar os campos
  não apontados.
- **Verificado** (fluxo completo simulado direto no banco, em
  transação com `rollback`, sem dado residual): convite → autocadastro
  → `solicitar_correcao` com `field_names=['cpf','phone']` →
  `get_public_registration_status` devolve exatamente o motivo, os
  campos e os dados atuais pra pré-popular → `update_public_registration`
  corrige (`people.status` vira `reenviado`) → reenvio funciona (o bug
  da reabertura está corrigido) → a correção antiga é marcada como
  resolvida automaticamente. Testado também: convite cancelado bloqueia
  `update_public_registration`.
- `npm run typecheck`/`lint`/`build` — sem erros nem avisos.
- **Riscos/pendências**: sem teste via navegador (Playwright pausado).
  A saudação personalizada ("Olá, {nome}!") da página pública foi
  simplificada — `get_public_registration_status()` não devolve
  `contact_name` do convite (só dados da pessoa); recuperável numa
  futura iteração se fizer falta.

Com a Etapa 11, todas as pendências documentadas na especificação
original foram endereçadas.

## Nova versão — RH Eleitoral (docs/NOVA_VERSAO_RH_ELEITORAL.md)

Especificação separada, pedida depois da iniciativa acima, bem maior:
cargos configuráveis, pessoa jurídica, contratos, importação por PDF,
painel do coordenador e um modelo de pagamentos mais rico. Ver
`docs/NOVA_VERSAO_MATRIZ.md` pro levantamento completo requisito × estado
real, feito antes de qualquer código desta iniciativa — boa parte da
spec **já estava implementada** pela iniciativa anterior; outra parte é
schema pronto desde a Etapa 1 (`notifications`, `data_conflicts`,
`expense_documents`, `expense_approvals`, `registration_field_reviews`)
nunca usado por nenhum código de app.

**Segurança conferida antes de qualquer código** (exigido pela seção 23
do documento): busca em todo o histórico do git por credencial exposta
(JWT, `sb_secret_`, `.env*` versionado) — nada encontrado, só menções ao
*nome* da variável `SUPABASE_SERVICE_ROLE_KEY`, nunca ao valor.

**Etapa 1 — cargos configuráveis e pessoa jurídica (concluída):**

- Migração `0029_nova_versao_cargos_e_pessoa_juridica.sql`: duas tabelas
  novas.
  - `job_functions` (spec seção 4.1) — cargo/função de trabalho
    configurável por campanha, **distinto** de `roles` (perfil de
    acesso). Campos: nome, descrição, categoria, tipo de contratação
    (PF/PJ), jornada de referência, faixa de remuneração, documentos
    exigidos, necessidade de coordenador, papéis de acesso sugeridos
    (informativo), status, ordem de exibição. Leitura liberada a
    qualquer `authenticated` da campanha (catálogo de referência, mesmo
    espírito de `roles`); escrita só `administrador` (mesmo padrão de
    `axes`/`cities`/`teams`, `0005`).
  - `legal_entities` (spec seção 5.1-PJ) — cadastro-mestre de pessoa
    jurídica: razão social, nome fantasia, CNPJ (único por campanha
    entre não-arquivados, mesmo padrão do CPF em `people`), inscrições,
    representante legal (nome + CPF), contatos, endereço e dados
    bancários **embutidos na própria tabela** (sem satélite — sem
    autocadastro de PJ ainda, um registro por CNPJ não pede a mesma
    normalização de `people`). RLS espelha `people`: leitura
    administrador/rh/auditor, escrita administrador/rh.
  - Nova função de validação de CNPJ (`src/lib/validations/cnpj.ts`),
    mesmo algoritmo/estilo de `cpf.ts`.
- `/configuracoes` ganha a seção "Cargos" (cria e lista), ao lado de
  Eixos/Cidades/Equipes. Novo módulo `/empresas` (só administrador/rh):
  cria e lista PJ.
- **Verificado** (testes funcionais diretos em transação com `rollback`,
  sem dado residual): criação de cargo e de empresa; unicidade de CNPJ
  por campanha rejeitando duplicata corretamente.
- `npm run typecheck`/`lint`/`build` — sem erros nem avisos;
  `/empresas` aparece no build.
- **Escopo desta etapa, deliberadamente de fora** (documentado no
  cabeçalho da própria migração): ligar `job_functions` ao autocadastro
  ou ao cadastro administrativo de `people` — mudança maior em telas já
  em produção, fica pra depois; upload de documento societário/contrato
  pra `legal_entities`; `job_functions.default_contract_template_id`
  (não existe `contract_templates` ainda — seção 12 da spec); unificar
  PJ com aprovações/pagamentos/despesas de `people`; edição de cargo ou
  empresa já criados (só criar + listar, mesmo padrão de
  `axes`/`cities`/`teams`, que também não têm edição).

**Etapa 2 — painel do coordenador com indicadores por escopo (spec
seção 11, concluída):**

- **Sem migração nova.** Toda a RLS necessária já existia (estendida
  pelas Etapas 2/11 da iniciativa anterior): `people_select` (equipe via
  `coordination_relationships`), `registration_submissions_select`
  (`manager_person_id`), `correction_requests_select`,
  `registration_invites_select` (`created_by`). `/painel` deixa de ser o
  placeholder fictício da Fase 1A e passa a consultar o banco de
  verdade, com o mesmo cliente/RLS já usado por `/relatorios` e
  `/validacoes` — nenhum dado é lido fora do que a RLS já deixa cada
  papel ver.
- `src/lib/painel/dashboard.ts` (novo): `fetchCoordinatorSummary`
  (equipe vigente, cadastros a decidir, correções pendentes dos
  liderados, convites em aberto — mesmas fontes de `/minha-equipe` e
  `/validacoes`), `fetchOrgSummary` (pessoas ativas, aguardando
  gestor/RH, correções pendentes — campanha inteira, só não-zero pra
  quem a RLS deixa ver), `fetchFinanceSummary` (despesas/pagamentos
  pendentes), `fetchRecentPeople` (últimos cadastros visíveis — a RLS
  resolve o escopo certo pra cada papel sem branch explícito).
- `/painel` (reescrita): seções condicionais por papel —
  administrador/RH veem KPIs de campanha; financeiro/tesouraria veem
  despesas/pagamentos pendentes; quem tem equipe (própria ou por
  convites enviados) vê o bloco "Minha equipe"; lista de "Cadastros
  recentes" sempre no fim, escopada pela RLS. Cada KPI é um link pra
  tela correspondente (`/validacoes`, `/minha-equipe`, `/despesas`,
  `/relatorios/pessoas`).
- `src/lib/reports/pessoas.ts`: `PERSON_STATUS_LABEL` ganhou os status
  de autocadastro da migração `0013` (`aguardando_gestor`,
  `correcao_solicitada` etc.) que faltavam desde aquela migração —
  usados agora pelos badges de "Cadastros recentes".
- `npm run typecheck`/`lint`/`build` — sem erros nem avisos; `/painel`
  aparece no build como rota dinâmica (sem alteração de tamanho de
  bundle relevante).
- **Fora de escopo desta etapa**: indicadores de despesas/pagamentos
  para coordenador (hoje só `administrador`/`financeiro`/`tesouraria`
  veem `expenses`/`payments` — ampliar essa RLS é uma decisão de
  exposição de dado financeiro, não um ajuste de painel); qualquer
  gráfico/série temporal (só contadores atuais); indicadores
  específicos por eixo/cidade/equipe dentro da própria equipe do
  coordenador (a equipe hoje é tratada como um único conjunto, não
  subdividida — o `/relatorios` já cobre filtro por território pra quem
  tem acesso a relatórios).

**Etapa 3 — schema ocioso de documento: hash, versionamento e dois bugs
de produção corrigidos (spec seções 8 e 10, parcial):**

Investigando o schema ocioso de `person_documents` (colunas prontas
desde a migração `0019`, nunca usadas), dois bugs reais de produção
foram achados **antes** de qualquer feature nova — nenhum reportado
pelo usuário, só nunca testados fora da conta platform_admin (que
bypassa toda RLS):

1. `person_documents_select` e a policy de Storage
   `pessoas_documentos_select` nunca tinham sido estendidas pra "a
   própria pessoa" ou "o gestor da pessoa" — só administrador/rh/auditor
   liam. O coordenador que sobe o próprio documento em `/meu-cadastro`
   (a policy de INSERT já permitia desde a Etapa 2) nunca conseguia ver
   nem baixar o que tinha acabado de subir.
2. `uploadPersonDocument()` chamava `log_audit_event()` sem checar o
   papel do chamador antes — essa função faz `raise exception` pra quem
   não é administrador/rh. Um coordenador comum recebia erro do
   servidor **depois** do arquivo já ter sido gravado.

- Migração `0030_nova_versao_documentos_leitura_e_hash.sql`: corrige as
  duas policies de leitura (mesmo padrão de extensão de
  `people_select`/`registration_submissions_select` das Etapas 2/11) e
  cria `record_person_document()` — função única que agora escreve
  `person_documents` (substitui o insert direto + chamada solta de
  `log_audit_event()`), com:
  - **hash** (spec seção 8): rejeita duplicata exata (mesma pessoa,
    mesmo hash, documento ainda ativo).
  - **versionamento** (spec seção 8): reenvio do mesmo tipo de
    documento depois de classificado `ilegivel`/`divergente` vira
    substituto (`replaces_document_id`) e supera o anterior
    (`status = 'removido'`), preservando o histórico.
  - auditoria condicional (mesmo padrão de
    `complete_own_registration()`/`create_team_invite()`: admin/rh via
    `log_audit_event()`, senão insert direto em `audit_logs`).
- `uploadPersonDocument()` (`/pessoas`, `/meu-cadastro`) e
  `uploadPublicDocument()` (`/cadastro/[token]`, anon) recalculados pra
  computar o hash (`src/lib/documents/hash.ts`, SHA-256) e aplicar a
  mesma lógica — o caminho anônimo replica a lógica em TypeScript com o
  cliente admin (não pode chamar a função, que exige `authenticated`),
  já que aquele fluxo já usa o cliente admin pra bypassar RLS por
  completo (mesma exceção documentada nesta seção).
- **Verificado** (transação com `rollback`, sem dado residual):
  duplicata rejeitada; reenvio do mesmo tipo após `divergente` virou
  substituto e superou o documento antigo corretamente. A extensão de
  RLS em si (ramo "própria pessoa") não pôde ser testada isolada do
  bypass de platform_admin — só existe uma conta real no banco — mas é
  cópia estrutural exata da cláusula já provada em produção em
  `people_select` desde a Etapa 2.
- **Limpeza incidental**: achados e removidos 5 registros de teste
  residuais na tabela `people` (mais convite e vínculos organizacionais
  associados) deixados por uma sessão de teste anterior via navegador
  (fora da disciplina de transação-com-rollback desta sessão) — não
  eram desta etapa, mas violavam a mesma regra de "sem dado real" que
  este projeto segue.
- `npm run typecheck`/`lint`/`build` — sem erros nem avisos.
- **Fora de escopo desta etapa** (fica pra próxima): a classificação em
  si do documento pelo gestor (aprovar/ilegível/divergente — spec seção
  10) — precisa de uma função `decide_person_document()` nova e de uma
  tela (o gestor agora já consegue **ver** o documento da equipe, que
  era o pré-requisito que faltava); `correction_requests.previous_values`/
  `new_values`; `expenses.authorized_amount_cents`; `audit_logs.ip_address`/
  `user_agent`.

**Etapa 4 — classificação de documento pelo gestor (spec seção 10,
concluída):**

- Migração `0031_nova_versao_classificacao_documento.sql`:
  `decide_person_document(p_document_id, p_review_status, p_rejection_reason?)`
  — mesmo padrão de `decide_registration_submission()` (autoriza
  administrador/rh ou o coordenador direto da pessoa via
  `coordination_relationships` vigente; audita com insert direto em
  `audit_logs`, não usa `log_audit_event()`, que rejeitaria o
  coordenador comum). `p_review_status` em `aprovado`/`ilegivel`/
  `divergente`; motivo obrigatório pras duas últimas.
- `/validacoes`: cada linha da fila (gestor e RH, mesmo componente
  genérico) ganhou uma segunda linha expandida com os documentos ativos
  da pessoa — link "Ver documento" (URL assinada) + badge de status +
  três botões de classificação inline (aprovar/ilegível/divergente) com
  campo de motivo. `src/components/validacoes/document-review-list.tsx`
  (novo); `ValidationQueueRow` ganhou `documents`; `loadQueue()` busca
  `person_documents` ativos dos `personIds` da fila em paralelo com as
  URLs assinadas.
- **Verificado** (transação com `rollback`, sem dado residual):
  classificação sem motivo rejeitada corretamente pra
  `ilegivel`/`divergente`; classificação com motivo grava
  `review_status`/`reviewed_by`/`reviewed_at`/`rejection_reason` e audita.
- `npm run typecheck`/`lint`/`build` — sem erros nem avisos.
- Com isso, o item 10 da spec (documento válido/ilegível/divergente,
  substituto) está completo — o substituto automático no reenvio já
  tinha sido feito na Etapa 3.

**Etapa 5 — gestão de contratos (spec seção 12, concluída):**

A peça que a matriz tinha apontado como maior e totalmente ausente
(nenhuma tabela existia). Migração `0032_nova_versao_contratos.sql`:
quatro tabelas novas + bucket de Storage + seis funções.

- `contract_templates` + `template_versions`: modelo de contrato
  versionado por campanha/tipo de contratado (PF/PJ), com responsável,
  vigência, status e aprovação jurídica (spec 12.1). Leitura liberada a
  qualquer `authenticated` da campanha (catálogo — um coordenador
  precisa ver os modelos disponíveis pra gerar contrato da equipe);
  escrita administrador/rh (aprovação jurídica: jurídico/administrador).
  `publish_template_version()` publica uma versão nova e supera a
  anterior automaticamente — mesma lógica de versionamento de
  `record_person_document()` (Etapa 3), aplicada a modelo em vez de
  documento de pessoa.
- `contracts`: geração individual via `generate_contract()` — PF
  (autoriza administrador/rh ou o coordenador direto da pessoa) ou PJ
  (só administrador/rh). Preenche os placeholders
  (`{{nome_contratado}}`, `{{cpf}}`, `{{rg}}`, `{{endereco_completo}}`,
  `{{funcao}}`, `{{cidade}}`, `{{eixo}}`, `{{coordenador}}`,
  `{{data_inicio}}`, `{{data_fim}}`, `{{valor_contratado}}` pra PF;
  `{{razao_social}}`, `{{cnpj}}`, `{{representante_legal}}` pra PJ — spec
  12.1) com dados reais de `people`/`person_addresses`/
  `organizational_assignments`/`coordination_relationships` ou
  `legal_entities`, grava um snapshot completo (`generated_body`/
  `variables_used`) imune a alterações futuras do modelo (spec 12.2).
  Valor formatado em BRL (`R$ 1.234,56`) sem depender do locale da
  sessão do banco — `to_char` com `G`/`D` varia com `lc_numeric` do
  ambiente, então a formatação é feita na mão com regex de agrupamento
  de milhar.
- `contract_documents`: só o PDF assinado enviado de volta (spec 12.3)
  — o contrato **gerado** não vira arquivo nesta versão (sem lib de PDF
  no projeto): é servido como página imprimível a partir de
  `generated_body` (Ctrl+P / salvar como PDF do próprio navegador),
  suficiente pro fluxo "contratado faz download, assina fora do
  sistema, envia o PDF assinado" — assinatura digital integrada já é
  explicitamente uma versão futura na própria spec (12.3).
- Ciclo de vida via três funções adicionais: `mark_contract_downloaded()`
  (self/coordenador/admin/rh), `submit_signed_contract()` (mesmo
  conjunto — grava `contract_documents` + muda status), `decide_contract()`
  (administrador/rh ou o coordenador direto — `validar`/
  `solicitar_correcao`/`recusar`, motivo obrigatório nas duas últimas).
  Todas seguem o padrão de autorização já estabelecido (checagem própria
  via `auth.uid()`, auditoria com insert direto em `audit_logs` — mesma
  razão de `decide_registration_submission()` nunca usar
  `log_audit_event()`).
- Bucket `contratos-documentos` (privado, 10 MB, PDF/JPG/PNG) — mesma
  convenção de path de `pessoas-documentos`
  (`campaign_id/person_id/uuid-arquivo` pra PF; PJ não tem
  autosserviço, só administrador/rh).
- App: `/contratos` (lista + formulário de geração individual — PF ou
  PJ, modelo, cargo/função ou texto livre, valor, datas),
  `/contratos/modelos` (criar modelo, publicar versão, aprovação
  jurídica), `/contratos/[id]` (visualização imprimível, upload da
  assinatura, conferência do gestor/RH). Item "Contratos" adicionado à
  navegação principal.
- **Verificado** (transação com `rollback`, sem dado residual): ciclo
  completo gerado → baixado → assinatura enviada → validado, testado
  também `recusar`; placeholders PF e PJ preenchidos corretamente
  (endereço concatenado, cidade/eixo/coordenador resolvidos via
  `organizational_assignments`/`coordination_relationships`, valor em
  BRL com milhar); modelo PF usado pra gerar contrato PJ rejeitado
  corretamente pela checagem de tipo. Achado e corrigido durante o
  teste: a primeira versão de `generate_contract()` formatava o valor
  usando `to_char(..., 'FM999G999G990D00')`, que depende do locale da
  sessão — trocado por formatação manual determinística.
- `npm run typecheck`/`lint`/`build` — sem erros nem avisos; as três
  rotas novas aparecem no build.
- **Fora de escopo desta etapa** (documentado no cabeçalho da própria
  migração): geração em lote/grupo (só individual por enquanto); os 4
  status de 12.4 que pressupõem uma etapa de aprovação prévia à geração
  (`aguardando_geracao`, `disponivel`, `aguardando_assinatura`,
  `em_conferencia`) ficam no `CHECK` pra não exigir migração nova
  quando forem usados, mas o fluxo desta etapa não os produz; `{{funcao}}`
  não tem coluna estrutural em `people` ainda (o cargo impresso é
  escolhido no momento da geração, do catálogo ou texto livre).

**Etapa 6 — resto do schema ocioso (concluída):**

Fecha os três itens que a Etapa 3 tinha deixado de fora. Migração
`0033_nova_versao_schema_ocioso.sql`.

- **`audit_logs.ip_address`/`user_agent`** (spec 15) — a princípio
  pareceria exigir tocar a assinatura de ~22 funções (todas as que
  gravam `audit_logs`, direto ou via `log_audit_event()`) e cada Server
  Action que as chama. Achado melhor antes de codificar: o PostgREST
  expõe os headers da requisição HTTP numa GUC de sessão
  (`current_setting('request.headers', true)`) — testado ao vivo via
  `curl` direto no `/rest/v1/rpc` antes de qualquer código. Com isso, um
  **trigger `BEFORE INSERT` em `audit_logs`** (`request_ip_address()`/
  `request_user_agent()` como funções auxiliares, preferindo
  `cf-connecting-ip` e caindo para o primeiro IP de `x-forwarded-for`)
  preenche os dois campos sozinho — **zero função existente alterada,
  zero mudança no app**, e cobre qualquer função futura de graça.
- **`correction_requests.previous_values`/`new_values`** (spec 6.4) —
  nova função auxiliar `snapshot_correction_fields(person_id,
  field_names)` tira uma foto dos campos apontados (a partir de
  `people` + os 3 satélites). `previous_values` é gravado quando o
  gestor/RH pede a correção (`decide_registration_submission`/
  `decide_rh_validation`); `new_values` quando a pessoa reenvia
  (`submit_registration_for_review`/
  `submit_public_registration_for_review`, que já resolviam o
  `correction_requests` desde a Etapa 11 — só ganharam o campo novo no
  mesmo `UPDATE`). `/meu-cadastro` ganhou um detalhe recolhível "Valores
  no momento da solicitação" no aviso de correção pendente.
- **`expenses.authorized_amount_cents`** (spec 13.1) — `create_expense()`
  ganhou `p_authorized_amount_cents` (opcional, trailing — precisou do
  `drop function` de praxe antes do `create or replace`, mesmo padrão
  das Etapas 7/11). Em branco, continua igual ao valor pedido
  (comportamento anterior idêntico). `/despesas/novo` ganhou o campo
  "Valor autorizado"; a lista em `/despesas` mostra o valor autorizado
  só quando diverge do pedido.
- **Verificado** (transação com `rollback`, sem dado residual): despesa
  criada com valor autorizado diferente do pedido, e outra sem informar
  (confirma que fica igual ao pedido — sem regressão); correção
  solicitada gravou `previous_values` com exatamente os campos
  apontados; reenvio após corrigir gravou `new_values` com os valores
  novos e resolveu a correção; trigger de auditoria não quebra quando
  chamado fora de um contexto HTTP (`ip_address`/`user_agent` ficam
  `null`, sem erro) — o funcionamento real via HTTP já tinha sido
  confirmado antes de escrever qualquer função.
- `npm run typecheck`/`lint`/`build` — sem erros nem avisos.

Com isso, **o item 4 da ordem proposta (schema já pronto e ocioso) está
completo** — nenhuma coluna morta identificada na matriz original ficou
de fora.

**Etapa 7 — importação por PDF, primeira fatia (concluída):**

Spec 9.2 é grande (OCR, várias pessoas por documento, comparação com
pessoa já existente com nível de confiança, complementar/atualizar/
vincular). Escopo desta etapa, decidido antes de codificar: **só PDF
com texto pesquisável** (sem OCR — exigiria decidir um provedor pago,
decisão que não é minha pra tomar sozinho), **uma página = uma pessoa**,
e **só criação** — nunca atualiza/complementa/vincula pessoa já
existente. Essa última escolha não é só simplicidade: ela elimina por
completo o risco que a própria spec 9.2 aponta como o mais grave
("PDF/OCR nunca deve atualizar CPF/CNPJ/dados bancários/PIX/função/
coordenador/remuneração em silêncio") — nenhum registro existente é
tocado nesta etapa. Migração `0034_nova_versao_importacao_pdf.sql`.

- **Reaproveitamento quase total da importação por Excel** — mesmas
  tabelas de staging (`import_batches`/`import_staging_records`/
  `import_row_errors`), coluna nova `import_batches.source_type`
  (`'excel' | 'pdf'`) só pra diferenciar a origem. `people.origin` ganhou
  o valor `'importacao_pdf'`. A única lógica genuinamente nova é
  "extrair texto do PDF e achar candidatos a campo" — a
  validação/dedup em si (`classifyRow()`) é a mesma função que a
  importação por Excel já usava, sem duplicar regra nenhuma.
- **`src/lib/imports/pdf-import.ts`** — extrai texto por página com
  `pdf-parse` (2.4.5, reescrita moderna sobre `pdfjs-dist`, licença
  Apache-2.0); página com pouco texto extraído (provável imagem
  digitalizada) fica marcada `invalida` com o motivo "requer OCR" em vez
  de tentar adivinhar. Campos achados por regex simples (CPF, "Nome:",
  telefone, e-mail, data de nascimento).
- **`/importacoes`** ganhou um segundo cartão de upload lado a lado com
  o de Excel, e a lista de lotes ganhou uma coluna "Tipo"; `/importacoes/
  [id]` troca "Linha"/"linha" por "Página"/"página" quando o lote é PDF.
  `confirmImportBatch()` (uma função só pras duas origens) passou a ler
  `import_batches.source_type` pra decidir o `people.origin` gravado.
- **Verificado** (transação com `rollback`): lote com `source_type='pdf'`
  e pessoa com `origin='importacao_pdf'` inseridos com sucesso; um
  terceiro insert com `source_type` inválido foi rejeitado pelo `CHECK`
  como esperado. Advisors de segurança sem achado novo (a migração só
  adiciona coluna/constraint, nenhuma função nova).
- `npm run typecheck`/`lint`/`build` — sem erros nem avisos.
- **Risco não totalmente verificado**: o `package.json` do `pdf-parse`
  lista `@napi-rs/canvas` (binário nativo) como dependência — usado só
  por métodos que este projeto não chama (`getScreenshot()`/
  `getImage()`), mas ele ainda precisa **instalar** com sucesso no
  build da Vercel. `npm install` e `npm run build` locais (Windows)
  passaram limpos; a compatibilidade real com o build serverless da
  Vercel só fica confirmada depois do deploy — recomendo testar um
  upload de PDF de verdade em produção assim que o deploy terminar.

Fora de escopo desta etapa, para uma etapa futura: OCR de página sem
texto (decisão de provedor pendente), mais de uma pessoa por página,
comparação com pessoa já existente usando o `data_conflicts` (ainda
sem uso desde a migração `0018`) e os fluxos de complementar/atualizar/
vincular pessoa existente que a spec 9.2 pede no passo 8.

**Próxima etapa proposta**: pagamentos com modelo rico (conciliação,
PIX/TED, spec 14) ou a central de pendências consolidada (spec 16). A
decidir com o usuário.

## Identidade visual (docs/IDENTIDADE_VISUAL.md)

Manual de identidade visual entregue por Agilize Tecnologia Ltda.
(`docs/MANUAL_IDENTIDADE_VISUAL_RH_ELEITORAL_FINAL.docx`) — encerrado
por ora nas Fases 1–4: fundação (tokens, tipografia Manrope/Inter,
componentes-base, navegação, login), telas de conteúdo (~44 arquivos),
sidebar recolhível + números tabulares, e logo vetorial (com variante
negativa — achado durante a verificação: a versão padrão fica invisível
num fundo também azul-marinho) + ícone automático em todo badge de
status. Checklist de aprovação visual (seção 13 do manual) avaliado
item a item em `docs/IDENTIDADE_VISUAL.md`, com o que ficou pendente
documentado honestamente (modo escuro de marca, mascaramento de CPF,
gráficos, relatórios em PDF).

## Stack

- [Next.js 16](https://nextjs.org) (App Router, Turbopack) + TypeScript estrito
- [Tailwind CSS 4](https://tailwindcss.com)
- Componentes acessíveis baseados em [Radix UI](https://www.radix-ui.com) (padrão shadcn/ui)
- [Supabase](https://supabase.com) (Postgres, Auth, Storage, Row Level Security)
- [Zod](https://zod.dev) + [React Hook Form](https://react-hook-form.com) para validação de formulários
- Hospedagem: [Vercel](https://vercel.com) · Versionamento: GitHub

## Pré-requisitos

- Node.js 20 ou superior (recomendado: a versão LTS mais recente) e npm
- Uma conta gratuita no [Supabase](https://supabase.com)
- Git

## Como executar localmente

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar o Supabase

> **Já existe um projeto Supabase em uso para esta campanha**
> (`rh_eleitoral`, projeto `pjjarkxwwzqiajlvpsdx`, região `ca-central-1`),
> com as migrações `0001`–`0009` aplicadas (schema base + tabelas satélite
> de pessoa + isolamento multi-tenant por campanha + fluxo de aprovação +
> pagamentos avulsos/em lote + despesas). **O seed fictício não
> foi aplicado neste projeto** — o banco recebe dados reais desde o início
> da Fase 1B. Um `.env.local` já criado localmente aponta para ele (arquivo
> ignorado pelo Git — não é versionado). O deploy de produção está em
> <https://rh-eleitoral.vercel.app> (Vercel, conectado ao repositório no
> GitHub, deploy automático a cada push em `main`). Se você está clonando
> este repositório em outra máquina ou quer um projeto próprio, siga os
> passos abaixo normalmente.

1. Crie um projeto gratuito em [supabase.com](https://supabase.com) (ou peça
   para quem administra a campanha criar e compartilhar o acesso).
2. No painel do projeto, vá em **Settings → API** e copie:
   - **Project URL**
   - **anon public key**
3. Copie `.env.example` para `.env.local` e preencha os dois valores:

   ```bash
   cp .env.example .env.local
   ```

4. Aplique as migrações do banco, em ordem (`0001` a `0009`). Duas opções:

   **Opção A — SQL Editor do Supabase Studio (mais simples):**
   Abra cada arquivo em `supabase/migrations/` (0001 a 0009), copie o
   conteúdo e execute no SQL Editor do painel do Supabase, um de cada vez,
   na ordem numérica.

   **Opção B — Supabase CLI:**

   ```bash
   npx supabase link --project-ref <seu-project-ref>
   npx supabase db push
   ```

5. (Opcional, apenas para desenvolvimento) Carregue dados fictícios para
   testar a navegação e o painel:

   Execute o conteúdo de `supabase/seed.sql` no SQL Editor. **Nunca execute
   este arquivo em um projeto de produção.**

6. Crie a primeira campanha (tenant) e o primeiro usuário administrador
   (ver [Multi-tenant](#multi-tenant) para o modelo completo):

   ```sql
   insert into public.campaigns (name, slug) values ('Nome da Campanha', 'slug-da-campanha');
   ```

   - No painel do Supabase, vá em **Authentication → Users → Add user** e
     crie um usuário com e-mail e senha (isso já cria automaticamente uma
     linha em `public.profiles`, via trigger — mas **sem** `campaign_id`
     ainda).
   - No SQL Editor, vincule esse usuário à campanha e ao papel de
     administrador (substitua o e-mail e o slug):

     ```sql
     update public.profiles
       set campaign_id = (select id from public.campaigns where slug = 'slug-da-campanha')
       where email = 'seu-email@exemplo.com';

     insert into public.profile_roles (profile_id, role_id)
     select p.id, r.id
     from public.profiles p, public.roles r
     where p.email = 'seu-email@exemplo.com'
       and r.code = 'administrador';
     ```

   - (Opcional) Para torná-lo **super administrador de plataforma**
     (enxerga todas as campanhas, não só a própria):

     ```sql
     update public.profiles set is_platform_admin = true where email = 'seu-email@exemplo.com';
     ```

### 3. Rodar o projeto

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000). Sem estar autenticado,
qualquer rota redireciona para `/login`.

### Outros comandos

```bash
npm run build        # build de produção
npm run start         # roda o build de produção localmente
npm run lint           # ESLint
npm run typecheck    # checagem de tipos (tsc --noEmit)
npm run format         # formata com Prettier
npm run format:check  # verifica formatação sem alterar arquivos
```

> **Nota:** `npm run build` funciona mesmo sem `.env.local` configurado,
> pois as páginas desta fase usam apenas dados fictícios embutidos — o
> Supabase só é necessário em tempo de execução (login, sessão, e
> futuramente dados reais).

## Estrutura de pastas

```
src/
  app/
    login/              # tela de login (pública)
    (app)/              # rotas autenticadas (layout com sidebar/topbar)
      painel/           # dashboard inicial
      pessoas/          # cadastro, edição, documentos e listagem (Fase 1B)
      aprovacoes/       # filas de validação cidade/eixo (Fase 2)
      ponto/            # placeholder — Fase 4
      operacoes/        # placeholder — Fase 4
      financeiro/       # pagamentos avulsos/lote financeiro → tesouraria (Fase 3)
      despesas/         # reembolso de despesa com comprovante (Fase 6)
      auditoria/        # trilha de auditoria: lista/busca/paginação (Fase 7)
      relatorios/       # financeiro/pessoas/aprovações, filtros + CSV (Fase 8)
      usuarios/         # criar acesso + atribuição de papéis com escopo (Fase 9)
      conta/            # trocar a própria senha (Fase 9)
      configuracoes/    # gestão territorial: eixos/cidades/equipes (Fase 2)
    proxy.ts            # (fora de app/, ver abaixo) proteção de rotas
  components/
    ui/                 # componentes acessíveis reutilizáveis (botão, input, card...)
    layout/             # shell do painel (sidebar, topbar, navegação)
    relatorios/         # campos de filtro compartilhados entre os 3 relatórios (Fase 8)
    usuarios/           # formulários de criação/papel/status/senha (Fase 9)
    conta/              # formulário de troca de senha (Fase 9)
  lib/
    supabase/           # clientes Supabase (browser, servidor, proxy, admin — Fase 9)
    validations/        # esquemas Zod
    reports/            # consultas compartilhadas entre tela e exportação CSV (Fase 8)
    csv.ts              # geração de CSV (Fase 8)
    temp-password.ts    # senha inicial a partir do telefone (Fase 9)
    whatsapp.ts         # link wa.me a partir de um telefone (Fase 9)
    nav-items.ts        # itens da navegação principal
  types/
    database.ts         # tipos do schema Supabase (regenerar quando o projeto existir)
supabase/
  migrations/           # migrações SQL versionadas
  seed.sql              # dados fictícios de desenvolvimento (nunca produção)
```

`src/proxy.ts` é o equivalente ao antigo `middleware.ts` (renomeado para
"Proxy" a partir do Next.js 16) — roda em toda requisição para renovar a
sessão e bloquear o acesso não autenticado.

## Decisões arquiteturais

- **Fonte única de dados de pessoa**: a tabela `people` é o único lugar
  onde uma pessoa é cadastrada; toda outra tabela referencia
  `people.id`. CPF é `unique`, mas nunca é chave primária (UUID é usado em
  toda a base).
- **Nenhuma exclusão física**: todas as tabelas de domínio usam uma coluna
  `status` para desativação/arquivamento lógico.
- **Usuário autenticado ≠ pessoa cadastrada**: `profiles` (1:1 com
  `auth.users`) é distinto de `people`. Nem todo usuário do sistema tem um
  cadastro de pessoa e vice-versa; o vínculo é opcional e feito por
  referência.
- **Histórico organizacional imutável**: `organizational_assignments`
  nunca é sobrescrita — uma mudança de equipe/cidade/eixo/função encerra a
  vigência anterior (`valid_until`) e insere uma nova linha.
- **Autorização garantida no banco**: toda a lógica de permissão crítica
  está em políticas de RLS usando as funções `has_role()`/`is_admin()`
  (`SECURITY DEFINER`), não apenas na interface. O proxy (`src/proxy.ts`)
  faz somente uma checagem otimista de sessão.
- **Escopo reduzido da migração inicial**: seguindo a orientação de
  entregar por fases, a migração `0001_initial_schema.sql` cobre apenas
  campanhas, papéis, eixos, cidades, equipes, pessoas (dados de identidade
  essenciais), vínculos organizacionais e auditoria. Regiões, setores,
  documentos, contratos, ponto, financeiro, despesas, combustível e
  conciliação bancária (ver modelo completo no briefing do projeto) entram
  em migrações incrementais nas fases correspondentes.
- **`audit_logs` somente leitura para o cliente**: por enquanto não existe
  política de `INSERT` para os papéis `authenticated`/`anon` — a gravação
  de auditoria será feita por uma função `SECURITY DEFINER` dedicada
  quando os módulos que geram eventos (Fase 2 em diante) forem
  implementados. Isso evita abrir a tabela de auditoria antes de haver
  algo real para auditar.
- **Componentes de UI "copiados", não uma dependência de biblioteca de
  design fechada**: seguindo o padrão shadcn/ui, os componentes em
  `src/components/ui` são código do próprio projeto (build sobre
  `@radix-ui/react-*` + Tailwind), não um pacote de terceiros — mais fácil
  de auditar e adaptar à identidade visual da campanha depois.

## Multi-tenant

Cada linha de `campaigns` é um **tenant isolado**: um cliente/candidato com
seus próprios eixos, cidades, equipes, pessoas, documentos e auditoria,
invisíveis para as demais campanhas. Um usuário pertence a **exatamente
uma campanha** (`profiles.campaign_id`) — não há seletor de
multi-campanha por login.

- **Isolamento**: banco compartilhado, não projetos Supabase separados.
  Toda tabela de domínio (`people`, os satélites de pessoa, `cities`,
  `teams`, `audit_logs`, etc.) tem uma coluna `campaign_id` própria
  (denormalizada, não só via join), e toda política de RLS exige
  `campaign_id = current_campaign_id()` além dos checks de papel já
  existentes. A função `public.current_campaign_id()` (`SECURITY DEFINER`)
  devolve a campanha do usuário autenticado.
- **Bucket de documentos**: o path no Storage passou a ser
  `{campaignId}/{personId}/{uuid}-{arquivo}` (antes só
  `{personId}/...`), e as políticas de `storage.objects` checam o primeiro
  segmento do path.
- **Super administrador de plataforma** (`profiles.is_platform_admin`):
  atravessa o isolamento — enxerga e edita todas as campanhas. Hoje só
  `pauloinvest74@gmail.com` tem essa flag; concedê-la é uma ação manual de
  SQL (ver passo 6 do bootstrap acima), sem tela no app. **Limitação
  conhecida**: como a interface não tem seletor de campanha, um super
  admin vê pessoas de todas as campanhas misturadas na mesma listagem em
  `/pessoas` — não há hoje uma visão "uma campanha de cada vez, à minha
  escolha" para esse papel.
- **Criar uma nova campanha** (provisionar um tenant) é exclusivo do super
  admin (`campaigns_insert` exige `is_platform_admin()`). Até a Etapa 1 da
  transformação multi-tenant (abaixo) era um processo manual de SQL — hoje
  tem tela própria em `/master/organizacoes`.
- **Novo usuário sem campanha**: o trigger que cria `profiles` ao
  registrar um `auth.users` não atribui `campaign_id` (fica `null` até um
  `UPDATE` manual) — por isso a coluna é nullable, ao contrário da maioria
  das colunas `campaign_id` do sistema. Um usuário sem campanha e sem
  `is_platform_admin` não enxerga nada, por padrão de segurança.
- **`profile_roles.campaign_id`** (existente desde a Fase 1A, nullable)
  não é mais usado para autorização — a fonte da verdade é
  `profiles.campaign_id`, mais simples dado que um usuário só pertence a
  uma campanha.

Detalhes completos em `supabase/migrations/0005_multi_tenant_campaign_scoping.sql`.

### Etapa 1 — identidade da organização (CNPJ), painel do master, login por CNPJ (concluída)

Especificação-fonte:
`docs/ESPECIFICACAO_MULTI_TENANT_RH_ELEITORAL_CLAUDE.md` (677 linhas,
pedido do usuário pra transformar o produto numa plataforma SaaS
completa). Escopo desta primeira etapa, decidido a partir do pedido
concreto do usuário ("master cadastra CNPJs/campanhas/administradores;
usuários entram com CNPJ + e-mail + senha"):

- **Achado antes de codificar**: o banco já era multi-tenant no nível
  de schema/RLS desde a `0005` (seção acima) — `campaigns_insert`,
  `profiles_update` e `profile_roles_insert` já permitiam
  `is_platform_admin()` sem restrição adicional (conferido ao vivo em
  `pg_policies`). Por isso esta etapa **não** recriou
  `tenants`/`tenant_memberships`/`permissions` do zero como a
  especificação original sugere — reaproveitou `campaigns`/`profiles`/
  `profile_roles`/`is_platform_admin()` como já existiam. Nenhuma
  policy nova ou alterada.
- **Migração `0035_multi_tenant_organizacoes.sql`**: `campaigns` ganhou
  `document_number` (CNPJ, só dígitos), `legal_name`, `trade_name` —
  índice único parcial em `document_number` (nullable: a campanha
  "Bia Kicis - Senadora", único tenant existente antes desta etapa,
  não ganhou CNPJ, e continua sem conseguir logar por CNPJ até alguém
  preencher — sem problema, não tinha usuário vinculado a ela).
- **`/master/organizacoes`** (novo, só visível a
  `profiles.is_platform_admin`, item de navegação próprio): lista
  organizações com contagem de usuários e formulário de criação (nome,
  CNPJ, razão social/nome fantasia opcionais + dados do primeiro
  administrador). `/master/organizacoes/[id]`: dados da organização,
  lista de administradores/membros, adicionar administrador, mudar
  status (`ativa`/`encerrada`/`arquivada`).
- **Criação de organização + primeiro administrador**
  (`src/app/(app)/master/organizacoes/actions.ts`): reaproveita o
  padrão exato de `usuarios/actions.ts#inviteUser()` — cria o usuário
  direto com senha derivada do telefone (`derivePasswordFromPhone()`),
  sem link de convite — só que com `campaign_id` explícito (a
  organização escolhida pelo master) em vez de `current_campaign_id()`.
  `ShareCredentials` (já usada em `/usuarios`) ganhou uma prop opcional
  `documentNumber` pra somar o CNPJ na mensagem de WhatsApp/e-mail
  compartilhada com o novo administrador.
- **Bootstrap do master resolvido com `linkSelfAsAdmin()`**: depois de
  criar a primeira organização (o pedido concreto foi a Agilize
  Tecnologia, CNPJ `01.596.311/0001-28`), o master usa o botão
  "Vincular meu usuário a esta organização" pra passar a fazer parte
  dela — sem isso, ele nunca teria uma organização com CNPJ pra usar no
  próprio login.
- **Login por CNPJ** (`src/app/login/login-form.tsx`): campo novo,
  obrigatório. Depois do `signInWithPassword` ter sucesso, compara
  `campaigns.document_number` da campanha do perfil com o CNPJ
  digitado; divergente, nulo, ou perfil sem campanha → `signOut()` +
  mensagem genérica ("CNPJ, e-mail ou senha inválidos" — não revela
  qual campo errou, mesmo padrão de segurança já usado antes do CNPJ
  existir). **Exceção deliberada**: `is_platform_admin` pula essa
  checagem — resolve o ovo-e-a-galinha (o master precisa conseguir
  entrar ANTES de existir qualquer organização com CNPJ cadastrado,
  pra poder criar a primeira). Desvio consciente da especificação
  original (que descreve CNPJ como atalho opcional, seção 9.2): o
  usuário pediu explicitamente que seja obrigatório pra todo mundo.
- **Fora de escopo desta etapa**, documentado em `docs/MULTI_TENANT.md`:
  modo de suporte (master "entrar" temporariamente nas telas normais de
  uma organização — exigiria alterar `current_campaign_id()`, usada por
  ~40 policies), usuário com vínculo em mais de uma organização,
  catálogo granular de permissões, convite por token/e-mail expirável,
  assistente de implantação, estados adicionais de organização.
- **Verificado**: transação de teste (`begin`/`rollback`) confirmando
  que o índice único em `document_number` rejeita duplicata e aceita
  `null`; `npm run typecheck`/`lint`/`build` sem erros nem avisos;
  advisors de segurança sem achado novo (migração só adiciona
  coluna/índice, nenhuma função nova).

### Etapa 2 — modo de suporte (master "entra" numa organização) + login aterrissa em `/master/organizacoes` (concluída)

Depois de testar a Etapa 1 em produção, o usuário pediu explicitamente
o que a Etapa 1 tinha deixado de fora por decisão deliberada: poder
**"entrar"** numa organização específica e trocar entre elas — o modo
de suporte da spec original (seção 6.3) — e que o login do master caia
direto na tela de organizações, não no painel comum.

- **Migração `0036_multi_tenant_current_campaign_override.sql`**:
  `current_campaign_id()` passou a aceitar um override — quando o
  chamador é `is_platform_admin()` **e** o header
  `x-active-campaign-id` vem preenchido com um UUID válido (checado por
  regex antes do `::uuid`, pra um cookie adulterado não quebrar a
  query), devolve esse valor; senão, comportamento de sempre
  (`profiles.campaign_id`). Reaproveita `request_headers()` (já
  existia desde a `0033`, mesma técnica do IP/user-agent da auditoria).
  **Nenhuma das ~40 policies que já usam `campaign_id =
  current_campaign_id()` mudou** — só o que essa função devolve muda,
  e só pra quem é master. Testado ao vivo simulando os três casos (sem
  header → cai no perfil; com header válido → devolve o override; com
  header malformado → cai no perfil sem erro), com `set local role
  authenticated`/`request.jwt.claims`, dentro de transações com
  `rollback`.
- **Cookie `active_campaign_id`** (`httpOnly`, `secure` em produção,
  `sameSite: lax`): `src/lib/supabase/server.ts` lê o cookie e repassa
  como header em toda query do cliente de servidor — único ponto de
  mudança, todas as páginas/RPCs que já dependem de
  `current_campaign_id()` passam a respeitar o modo de suporte de
  graça. `enterOrganization(campaignId)` (nova ação, em
  `master/organizacoes/actions.ts`) seta o cookie e redireciona pro
  `/painel`; `exitSupportMode()` apaga o cookie e volta pro
  `/master/organizacoes`; `logout()` também limpa o cookie, pra não
  vazar modo de suporte pra uma sessão futura.
- **Faixa "Você está administrando..."**
  (`src/components/layout/support-mode-banner.tsx`): aparece em toda
  tela enquanto o cookie estiver ativo, com nome da organização + CNPJ
  formatado + botão "Voltar ao painel master". `(app)/layout.tsx` passa
  a resolver o nome/CNPJ exibidos a partir da organização ativa (não
  mais só da campanha "casa" do profile) quando o modo de suporte está
  ligado.
- **Botão "Entrar nesta organização"** em
  `/master/organizacoes/[id]` (`EnterOrganizationButton`, mesmo padrão
  de `useTransition` dos outros botões do arquivo) — clicar no nome na
  listagem continua só abrindo o detalhe, não troca de contexto sozinho
  com um clique acidental na tabela.
- **Login** (`login-form.tsx`): quando não há `redirectTo` explícito na
  URL, `is_platform_admin` vai pra `/master/organizacoes` em vez de
  `/painel` — qualquer outro usuário continua indo pro painel comum,
  sem mudança.
- **Pergunta feita ao usuário**: ele tinha pedido senha = últimos 4
  dígitos do celular; expliquei que o Supabase Auth deste projeto exige
  mínimo 6 caracteres por padrão (por isso o código já usava 6, não 4
  — mudar pra 4 faria a criação de usuário falhar) e que eu não tenho
  acesso programático a essa configuração pelas ferramentas MCP
  disponíveis aqui. Ele confirmou **manter 6 dígitos** — nenhuma
  mudança de senha nesta etapa.
- **Verificado**: `npm run typecheck`/`lint`/`build` sem erros nem
  avisos; advisors de segurança sem achado novo (só a função
  `current_campaign_id()` mudou, sem policy nova).

### Etapa 3 — editar organização já criada (concluída)

Testando a Etapa 2, o usuário não achou onde adicionar o CNPJ
`68.608.387/0001-05` na campanha "Bia Kicis - Senadora" (criada antes
desta iniciativa) — a razão: `/master/organizacoes` só tinha
formulário de **criação**, sem edição do que já existe.

- Migração `0037_multi_tenant_organizacoes_contato.sql`:
  `campaigns` ganhou `phone`/`email` (spec 7.2 — contato da própria
  organização, distinto do telefone/e-mail do administrador).
- Nova ação `updateOrganization()` + componente `EditOrganizationForm`
  em `/master/organizacoes/[id]`: edita nome, CNPJ, razão social, nome
  fantasia, telefone e e-mail de qualquer organização já existente —
  reaproveita o mesmo schema Zod da criação
  (`organizationFieldsSchema`, extraído de `createOrganizationSchema`
  pra não duplicar validação). `CreateOrganizationForm` também ganhou
  os campos telefone/e-mail (antes só existiam pro administrador, não
  pra organização em si).
- **Verificado**: `update` de teste (transação com `rollback`)
  confirmando que a campanha existente aceita CNPJ novo;
  `npm run typecheck`/`lint`/`build` sem erros; advisors sem achado
  novo (migração só adiciona coluna).

### Etapa 4 — "lembrar CNPJ e e-mail" no login (concluída)

Pedido: uma caixa em `/login` pra logar só clicando em "Entrar", sem
redigitar tudo. Guardar a **senha** em `localStorage` (texto puro,
legível por qualquer script que rode na página) foi recusado depois de
explicar o risco — confirmado com o usuário manter só CNPJ + e-mail
guardados pelo app, com a senha ficando por conta do gerenciador de
senha nativo do navegador.

- **`src/lib/auth/remembered-login-store.ts`** (novo): external store
  (`useSyncExternalStore`, mesmo padrão de `sidebar-collapse-store.ts`)
  que guarda `{ documentNumber, email }` em `localStorage` — nunca a
  senha. Evita divergência de hidratação entre servidor e cliente (o
  mesmo problema que motivou o padrão original na Fase de identidade
  visual).
- **`login-form.tsx`**: campo de e-mail ganhou `autoComplete="username"`
  (par correto com `current-password` da senha, pro navegador oferecer
  salvar/preencher a senha sozinho). Checkbox "Lembrar CNPJ e e-mail
  neste navegador" — ao logar com sucesso, salva ou limpa o que está
  guardado conforme o estado da caixa. O valor da caixa é lido do
  evento nativo de submit (`event.currentTarget.elements`), não de um
  `ref` — um `ref` acessado dentro da função passada pra
  `handleSubmit()` do React Hook Form dispara o lint
  `react-hooks/refs` ("Cannot access refs during render") mesmo só
  rodando depois, no submit.
- **Verificado**: `npm run typecheck`/`lint`/`build` sem erros.

## Aprovações

Núcleo do fluxo de validação territorial de uma pessoa, cobrindo só os
estados centrais de `people.status` (os demais — documentos/OCR/contrato —
seguem fora de escopo):

```
rascunho → (RH envia, escolhendo uma cidade) → pendente_validacao_cidade
  → (coordenador de cidade decide) → pendente_validacao_eixo ou rejeitado
  → (coordenador de eixo decide) → aprovado ou rejeitado
```

- **Enviar para aprovação** (`/pessoas/{id}/editar`, só quando `status =
'rascunho'`): RH/administrador escolhe uma cidade; isso cria a linha de
  `organizational_assignments` (com `axis_id` derivado da cidade) e muda
  `people.status` para `pendente_validacao_cidade`. Equipe não participa
  dessa decisão (campo opcional, não coberto pela tela de envio).
- **Decidir** (`/aprovacoes`, duas filas — cidade e eixo): usa a função
  `public.decide_approval(p_person_id, p_decision, p_reason)`
  (`SECURITY DEFINER`), que valida se quem está decidindo é o coordenador
  certo para aquele território (`is_city_coordinator_for()`/
  `is_axis_coordinator_for()`, novas funções que checam `profile_roles`
  com o `city_id`/`axis_id` do coordenador) ou um administrador/super
  admin, faz a transição de status, **encerra o vínculo territorial em
  caso de rejeição** (`organizational_assignments.status = 'encerrado'`),
  e grava a auditoria diretamente (não via `log_audit_event()`, porque
  coordenadores não têm papel `administrador`/`rh` exigido por aquela
  função).
- **Quem vê o quê**: `people_select`/`organizational_assignments_select`
  ganharam ramos novos para coordenador de cidade/eixo, escopados ao
  próprio território — um coordenador só vê pessoas na etapa que é dele.
  Não há visibilidade de endereço/dados bancários/eleitorais/documentos
  para coordenadores (a aprovação territorial não depende desses dados).
- **Atribuir o papel de coordenador** (`coordenador_cidade`/
  `coordenador_eixo`, com `city_id`/`axis_id`) continua manual via SQL,
  mesmo processo do bootstrap de administrador — não há tela para isso
  ainda.

Detalhes completos em `supabase/migrations/0006_approvals_workflow.sql`.

## Financeiro

Pagamento avulso por pessoa, e também em lote (folha por período). Fluxo
de duas etapas, espelhando os papéis `financeiro`/`tesouraria` do
catálogo:

```
financeiro lança (pendente) → tesouraria decide: pago ou rejeitado
                             ↳ financeiro pode cancelar enquanto pendente
```

- **Elegibilidade**: só pessoas com `people.status = 'ativo'` podem
  receber pagamento — é a única checagem de elegibilidade (não há papel,
  cidade ou eixo envolvidos aqui).
- **`bank_snapshot`**: ao criar o pagamento, os dados de
  `person_bank_accounts` (banco/agência/conta/PIX) são copiados para
  dentro do próprio registro de `payments`, em `jsonb`. Como
  `person_bank_accounts` é mutável, o snapshot preserva o destino
  bancário real usado naquele pagamento mesmo que a pessoa troque de
  conta depois. Pessoa sem conta cadastrada ainda pode receber um
  pagamento — o snapshot fica um objeto vazio.
- **`create_payment(p_person_id, p_amount_cents, p_description)`** e
  **`decide_payment(p_payment_id, p_decision, p_reason)`** (ambas
  `SECURITY DEFINER`) são as **únicas** formas de gravar em `payments` —
  não existe política de `INSERT`/`UPDATE` para o cliente nessa tabela.
  Isso não é só um endurecimento extra: como `audit_logs` não tem
  política de `INSERT` para nenhum papel de cliente, e `financeiro`/
  `tesouraria` não têm o papel `administrador`/`rh` exigido por
  `log_audit_event()`, as duas funções gravam a auditoria diretamente
  (mesmo padrão de `decide_approval()` na Fase 2).
- **Valores em centavos** (`amount_cents bigint`) para evitar erro de
  ponto flutuante; formatados como `R$ 1.234,56` na UI via
  `Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })`.
- **Sem movimentação real de dinheiro**: o sistema só registra o status
  do pagamento (pendente/pago/rejeitado/cancelado) — não há integração
  com banco, PIX ou qualquer gateway de pagamento.
- **Lote (`/financeiro/lote/novo`)**: `financeiro` escolhe um período de
  referência (texto livre, ex.: "Setembro/2026"), um valor único e uma
  descrição, e seleciona várias pessoas `ativo` de uma vez (`<select
multiple>`) — `create_payment_batch()` cria uma linha em
  `payment_batches` e uma linha em `payments` por pessoa selecionada
  (todas com o mesmo `batch_id`, mesmo valor e mesma descrição), numa
  única transação (tudo ou nada: se uma pessoa não for elegível, o lote
  inteiro é revertido). Cada pessoa ainda recebe seu próprio
  `bank_snapshot`. A **decisão** (pagar/rejeitar/cancelar) continua sendo
  por pagamento individual — não existe "decidir o lote inteiro de uma
  vez" nesta fase; a listagem em `/financeiro` mostra o período do lote
  como uma coluna, para agrupar visualmente.

Detalhes completos em `supabase/migrations/0007_financeiro_payments.sql`
e `supabase/migrations/0008_financeiro_lote.sql`.

## Despesas

Diferente de Financeiro (a campanha paga a pessoa pelo trabalho),
Despesas é **reembolso**: a pessoa gasta do próprio bolso por algo da
campanha (combustível, material, alimentação, transporte, hospedagem,
outro) e pede reembolso, com comprovante obrigatório. Mesmo fluxo de
duas etapas e as mesmas regras de Financeiro (só pessoa `status =
'ativo'`; `financeiro` lança, `tesouraria` paga/rejeita, `financeiro`
cancela enquanto pendente; toda gravação via função `SECURITY DEFINER`
— `create_expense()`/`decide_expense()`, sem policy de `INSERT`/`UPDATE`
em `expenses` para o cliente).

- **Comprovante**: `receipt_storage_path` é **obrigatório** (ao contrário
  do `bank_snapshot` opcional de `payments`) — não dá pra registrar uma
  despesa sem anexar o comprovante. Bucket privado `despesas-comprovantes`
  (mesmos limites de `pessoas-documentos`: 10 MB, PDF/JPG/PNG), path
  `{campaignId}/{personId}/{uuid}-{arquivo}`. O upload acontece **antes**
  da chamada a `create_expense()` (a Storage API não pode ser chamada de
  dentro de uma função `plpgsql`) — mesma ordem de
  `uploadPersonDocument()` no módulo Pessoas.
- **Categoria**: enum fixo (`combustivel`/`material`/`alimentacao`/
  `transporte`/`hospedagem`/`outro`) — sem categorias customizáveis nesta
  fase.

Detalhes completos em `supabase/migrations/0009_despesas.sql`.

## Modelo de dados (Fase 1A + 1B + 1C + 2 + 3 + 6)

| Tabela                       | Descrição                                                                       |
| ---------------------------- | ------------------------------------------------------------------------------- |
| `campaigns`                  | Campanha eleitoral — cada linha é um tenant isolado                             |
| `roles`                      | Catálogo de perfis de acesso (11 papéis da seção 5) — global, sem `campaign_id` |
| `axes`                       | Eixos da campanha                                                               |
| `cities`                     | Cidades / Regiões Administrativas                                               |
| `teams`                      | Equipes de campo                                                                |
| `people`                     | Cadastro único de pessoa (identidade essencial)                                 |
| `profiles`                   | Usuário autenticado (1:1 com `auth.users`)                                      |
| `profile_roles`              | Atribuição de papel a usuário, com escopo e vigência                            |
| `organizational_assignments` | Histórico de vínculo pessoa ↔ equipe/cidade/eixo/função                         |
| `audit_logs`                 | Trilha de auditoria imutável                                                    |
| `person_addresses`           | Endereço atual da pessoa (1:1, mutável)                                         |
| `person_bank_accounts`       | Conta bancária/PIX atual da pessoa (1:1, mutável)                               |
| `person_electoral_data`      | Dados do título de eleitor da pessoa (1:1, mutável)                             |
| `person_documents`           | Metadados de documentos anexados (1:N, soft-delete)                             |
| `payments`                   | Pagamento avulso ou de lote a uma pessoa (financeiro → tesouraria)              |
| `payment_batches`            | Lote de pagamentos (período/valor/descrição uniformes)                          |
| `expenses`                   | Reembolso de despesa a uma pessoa, com comprovante (financeiro → tesouraria)    |

Todas as tabelas acima, exceto `campaigns` e `roles`, têm uma coluna
`campaign_id` (ver [Multi-tenant](#multi-tenant)). Endereço, dados
bancários e dados eleitorais são tratados como atributos mutáveis da
pessoa (análogos a `people.phone`/`people.email`), não como histórico
versionado — ao contrário de `organizational_assignments`. O histórico de
alterações fica registrado em `audit_logs` (`before_data`/`after_data`),
não em `valid_from`/`valid_until` próprios.

Detalhes de colunas, checks e comentários estão em
`supabase/migrations/0001_initial_schema.sql`,
`supabase/migrations/0004_person_satellite_tables.sql`,
`supabase/migrations/0005_multi_tenant_campaign_scoping.sql`,
`supabase/migrations/0007_financeiro_payments.sql`,
`supabase/migrations/0008_financeiro_lote.sql`,
`supabase/migrations/0009_despesas.sql`,
`supabase/migrations/0010_auditoria_profiles_visibility.sql` e
`supabase/migrations/0011_usuarios_rh_access.sql` e
`supabase/migrations/0012_usuarios_telefone.sql`.

## Políticas de RLS criadas

Todas as 17 tabelas têm RLS habilitado. Desde a Fase 1C, **toda** política
abaixo tem um bypass adicional para `is_platform_admin()` (o super admin
de plataforma vê/edita tudo, atravessando o filtro de campanha) — omitido
no resumo por brevidade, ver [Multi-tenant](#multi-tenant). Resumo:

- **`campaigns`**: leitura/escrita restritas à própria campanha do usuário
  (`campaign_id = current_campaign_id()`, ou `id = ...` no caso desta
  tabela); `INSERT` (criar uma campanha nova) é exclusivo do super admin.
- **`roles`**: catálogo global, sem `campaign_id` — leitura liberada a
  qualquer usuário autenticado; escrita restrita ao papel `administrador`.
- **`axes`, `cities`, `teams`**: leitura restrita à própria campanha do
  usuário (antes era liberada para qualquer autenticado — corrigido na
  Fase 1C); escrita restrita a `administrador` **dentro** da própria
  campanha.
- **`people`**: leitura e escrita restritas a `administrador`/`rh` **da
  própria campanha** (leitura também para `auditor`). Desde a Fase 2, um
  coordenador de cidade/eixo também lê (só leitura) as pessoas na etapa
  que é dele (`status = 'pendente_validacao_cidade'`/`'pendente_validacao_eixo'`
  cujo território bate com o dele — ver [Aprovações](#aprovações)). Desde
  a Fase 3, `financeiro`/`tesouraria` também leem (só leitura) as pessoas
  com `status = 'ativo'` — as elegíveis a pagamento (ver
  [Financeiro](#financeiro)). Sem política de `DELETE` — exclusão é
  sempre lógica via `status`.
- **`person_addresses`, `person_electoral_data`, `person_documents`**:
  mesmo padrão de `people` — leitura para `administrador`/`rh`/`auditor`
  da própria campanha, escrita para `administrador`/`rh` da própria
  campanha. Sem `DELETE` (exclusão lógica via `status` em
  `person_documents`; satélites 1:1 são simplesmente sobrescritos).
- **`person_bank_accounts`**: mesmo padrão acima, **mais** leitura para
  `financeiro`/`tesouraria` da própria campanha (Fase 3) — `financeiro`
  precisa ler a conta para montar o `bank_snapshot` de um pagamento
  (`create_payment()`), `tesouraria` para conferir antes de pagar.
- **`payments`** (Fase 3): leitura para
  `administrador`/`financeiro`/`tesouraria`/`auditor` da própria
  campanha. **Sem política de `INSERT` nem `UPDATE`** — a única forma de
  gravar é via `create_payment()`/`create_payment_batch()`/
  `decide_payment()` (`SECURITY DEFINER`), que também centralizam a
  checagem de elegibilidade (`people.status = 'ativo'`) e a montagem do
  `bank_snapshot`. Sem `DELETE`. Também coberta pelo trigger
  `check_same_campaign()` (`person_id`/`batch_id` precisam pertencer à
  mesma campanha do pagamento).
- **`payment_batches`**: mesma leitura de `payments`. Sem política de
  `INSERT`/`UPDATE`/`DELETE` — só `create_payment_batch()` grava aqui.
- **`expenses`** (Fase 6): mesma leitura de `payments` (`administrador`/
  `financeiro`/`tesouraria`/`auditor` da própria campanha). Sem política
  de `INSERT`/`UPDATE` — só `create_expense()`/`decide_expense()` gravam.
  Sem `DELETE`. Coberta pelo trigger `check_same_campaign()`. Bucket
  `despesas-comprovantes` segue o mesmo padrão de `pessoas-documentos`
  (path prefixado por campanha, `INSERT` para `administrador`/
  `financeiro`, `SELECT` também para `tesouraria`/`auditor`).
- **`profiles`**: cada usuário vê/edita apenas o próprio registro;
  `administrador`/`rh`/`auditor` veem os demais perfis **da própria
  campanha** (histórico: só `administrador` até a Fase 1C; `auditor`
  somado na Fase 7/migração `0010`; `rh` somado na Fase 9/migração `0011`
  — só `administrador`/`rh` também **editam** outros perfis, ver
  [Usuários](#usuários)).
- **`profile_roles`**: cada usuário vê os próprios papéis;
  `administrador`/`rh` administram os de perfis **da própria campanha**
  (verificado via join em `profiles.campaign_id`, já que
  `profile_roles.campaign_id` não é mais usado para autorização) — regra
  inalterada desde a 0001, só ganhou uma tela na Fase 9.
- **`organizational_assignments`**: leitura para
  `administrador`/`rh`/`auditor` da própria campanha, e (Fase 2) para o
  coordenador de cidade/eixo do próprio território; escrita para
  `administrador`/`rh` da própria campanha (a transição para `encerrado`
  ao rejeitar uma pessoa é feita por `decide_approval()`, que roda como
  `SECURITY DEFINER`). Sem `DELETE`. Desde a Fase 2, um trigger
  (`check_same_campaign()`) impede que `axis_id`/`city_id`/`team_id`
  referenciem uma linha de outra campanha — mesma checagem aplicada em
  `cities`/`teams`.
- **`audit_logs`**: leitura restrita a `administrador`/`auditor` da
  própria campanha; sem `INSERT`/`UPDATE`/`DELETE` direto para usuários
  comuns — a única forma de gravar é via a função `SECURITY DEFINER`
  `log_audit_event()` (ver "Auditoria" abaixo), chamada pelas server
  actions do módulo Pessoas a cada criação/edição.
- **`profiles` (ajustes da Fase 7 e 9)**: a política `profiles_select` foi
  reescrita duas vezes — migração `0010` (Fase 7) somou leitura de
  **outros** perfis da campanha para `auditor` (sem isso, um `auditor`
  puro não resolvia o nome/e-mail do autor de uma linha de `audit_logs`
  que não fosse ele mesmo); migração `0011` (Fase 9) somou `rh`, e também
  reescreveu `profiles_update` para incluir `rh` (antes só
  `administrador` editava outro perfil) — necessário pra tela de
  Usuários, que o usuário pediu que fosse gerenciada por
  `administrador` **e** `rh`.
- **Storage — bucket `pessoas-documentos`** (privado): política de
  `INSERT` para `administrador`/`rh`, `SELECT` para
  `administrador`/`rh`/`auditor`, ambas também checando que o primeiro
  segmento do path bate com a campanha do usuário
  (`{campaignId}/{personId}/...`), sem `UPDATE`/`DELETE`. Leitura de
  arquivo sempre via URL assinada de 60s gerada sob demanda — nunca há
  acesso público direto ao objeto.

## Auditoria

A partir da Fase 1B, `audit_logs` recebe gravações reais: a função
`public.log_audit_event()` (`SECURITY DEFINER`, chamável apenas por
`administrador`/`rh`) é invocada explicitamente pelas server actions de
`src/app/(app)/pessoas/actions.ts` após cada gravação bem-sucedida em
`people` ou em uma tabela satélite, e ao anexar um documento. Todas as
linhas geradas por uma mesma submissão de formulário compartilham um
`related_request_id`, permitindo correlacionar, por exemplo, a criação de
uma pessoa com a gravação simultânea de seu endereço e dados bancários.
Desde a Fase 1C, cada linha também grava `campaign_id` automaticamente
(a campanha de quem disparou o evento), e a leitura de `audit_logs` (ver
acima) respeita esse isolamento — exceto para o super admin de plataforma.

**Tela de auditoria (Fase 7)**: `/auditoria` (`src/app/(app)/auditoria/page.tsx`)
lista as linhas de `audit_logs` já escopadas pela RLS existente
(`administrador`/`auditor` da própria campanha, bypass para o super
admin), mais recente primeiro, com busca simples por texto (`action`/
`entity_table`, via `ilike`) e paginação de 20 em 20. Cada linha resolve
o nome do autor buscando os `profiles` correspondentes aos
`actor_user_id` da página atual (uma segunda query em lote, não N+1), o
que só funciona para um `auditor` puro graças ao ajuste de
`profiles_select` da migração `0010` (ver acima). Um `<details>` por
linha expõe `reason`/`before_data`/`after_data` quando presentes, sem
poluir a tabela por padrão. É uma tela somente leitura — não há
edição/exclusão de auditoria em lugar nenhum do sistema, por design.
Desde a Fase 2, papéis que não são `administrador`/`rh` (coordenador de
cidade/eixo na Fase 2, `financeiro`/`tesouraria` na Fase 3) não conseguem
chamar `log_audit_event()` — as funções que eles usam
(`decide_approval()`, `create_payment()`, `decide_payment()`) gravam a
auditoria com um `insert` direto dentro da própria função
`SECURITY DEFINER`, já que `audit_logs` não tem política de `INSERT`
para nenhum papel de cliente.

## Relatórios

Três relatórios gerenciais somente leitura, cada um com filtro amplo e
exportação CSV — sem tabela nova: consultam as tabelas de domínio já
existentes (`payments`, `expenses`, `people`, `audit_logs`), então herdam
automaticamente o isolamento de campanha e as restrições de RLS de cada
uma (ver [Políticas de RLS criadas](#políticas-de-rls-criadas)). Toda a
lógica de consulta fica em `src/lib/reports/` (`financeiro.ts`,
`pessoas.ts`, `aprovacoes.ts`, `territory-scope.ts`), compartilhada entre
a tela (`page.tsx`) e o endpoint de exportação (`export/route.ts`) de
cada relatório — os dois nunca divergem porque chamam exatamente a mesma
função.

- **Financeiro** (`/relatorios/financeiro`): combina `payments` e
  `expenses` em uma lista única, filtrável por período (`created_at` —
  data de lançamento, não de pagamento, porque um registro `pendente`
  ainda não tem `payment_date`/data de decisão), tipo (pagamento/despesa),
  status, categoria (despesas) e território. Mostra totais (pago,
  pendente, rejeitado/cancelado) e a lista, limitada a 500 linhas na tela
  (5000 na exportação CSV).
- **Pessoas** (`/relatorios/pessoas`): funil de contagem por status
  (respeitando período/território, mas não o filtro de status — mostra a
  distribuição completa), mais uma lista detalhada já filtrada por
  status, com as mesmas capacidades de período/território/exportação.
- **Aprovações** (`/relatorios/aprovacoes`): não existe uma tabela
  dedicada de aprovações — o histórico é extraído de `audit_logs`
  (ações `pessoa.aprovacao.aprovar`/`pessoa.aprovacao.rejeitar`, gravadas
  por `decide_approval()` desde a Fase 2), com autor resolvido via
  `profiles` (mesma mecânica da tela de Auditoria). **Herda a mesma
  restrição de leitura de `audit_logs`**: só `administrador`/`auditor` da
  campanha (mais o super admin) conseguem ver este relatório — um
  coordenador de cidade/eixo, que é quem de fato toma essas decisões, não
  tem acesso a ele (ver "Riscos e pendências desta fase").
- **Filtro de território** (`src/lib/reports/territory-scope.ts`):
  `payments`/`expenses`/`audit_logs` não têm coluna de eixo/cidade/equipe
  própria, então o filtro por território resolve primeiro os
  `person_id`s com vínculo `organizational_assignments` **vigente**
  batendo com o eixo/cidade/equipe escolhido, e depois filtra a tabela
  de destino por esses IDs. Isso reflete o vínculo **atual** da pessoa,
  não o vínculo no momento de um evento passado (um pagamento ou uma
  aprovação antigos podem ter ocorrido quando a pessoa estava em outra
  cidade/eixo) — limitação aceita conscientemente para esta fase.
- **Exportação CSV**: cada relatório tem um botão "Exportar CSV" que
  linka para `.../export?<mesmos filtros da URL>` — um Route Handler
  (`GET`) que roda a mesma consulta sem o teto de 500 linhas da tela
  (teto de 5000 na exportação), gera o CSV (`;` como separador e BOM
  UTF-8, formato que o Excel em pt-BR espera) via `src/lib/csv.ts` e
  devolve com `Content-Disposition: attachment`. Roda sob o mesmo proxy
  de autenticação de qualquer outra rota (`src/proxy.ts`) — sem sessão,
  redireciona para `/login` como as demais.

## Usuários

Tela de gestão de usuários (`/usuarios`, restrita a `administrador`/`rh`
— quem acessa sem esse papel vê uma mensagem de acesso negado, mesma
lógica que já protege as escritas por RLS). Três responsabilidades:
criar acesso para gente nova, atribuir/remover papéis de quem já está, e
cada usuário trocar a própria senha.

**Login sempre é e-mail + senha — sem link de convite por e-mail.**
A ideia original desta fase (Fase 9) era convidar por e-mail com um link
de confirmação (`/convite`, usando `auth.admin.inviteUserByEmail()`/
`generateLink()`); o usuário pediu explicitamente para simplificar: a
senha inicial já vem pronta (últimos dígitos do telefone), e a pessoa
entra direto em `/login` com e-mail + essa senha, sem clicar em nenhum
link. `/convite` foi removida do código (nunca chegou a ser usada de
verdade — a `SUPABASE_SERVICE_ROLE_KEY` nunca esteve configurada).

- **Catálogo de papéis**: os 11 papéis já existiam desde a Fase 1A
  (tabela `roles`), mas só 7 têm efeito real hoje em alguma política de
  RLS ou função — `administrador`, `rh`, `auditor`, `financeiro`,
  `tesouraria`, `coordenador_cidade`, `coordenador_eixo`. Os outros 4
  (`juridico`, `auxiliar_delegado_eixo`, `coordenador_equipe`,
  `colaborador`) existem no catálogo mas nenhuma política os checa ainda
  — atribuí-los não dá nenhum acesso além do próprio perfil. O formulário
  de atribuição (`AssignRoleForm`) marca esses 4 como "sem efeito de
  permissão ainda" na própria lista, pra não criar falsa expectativa.
- **Por que ainda precisa da service role key**: uma linha em `profiles`
  só passa a existir via o trigger `handle_new_user()`, disparado por um
  `insert` em `auth.users` — não há como inserir um perfil "por fora" de
  uma conta real do Supabase Auth, e só a **service role key**
  (`SUPABASE_SERVICE_ROLE_KEY`) pode criar essa conta com uma senha
  definida na hora (`auth.admin.createUser()`). Usada estritamente dentro
  de `src/lib/supabase/admin.ts` (nunca importado por código de cliente —
  reforçado por `import "server-only"`, que quebra o build se isso
  acontecer). A Server Action `inviteUser()` primeiro verifica com o
  cliente normal (respeitando RLS) que quem está chamando tem
  `has_role(['administrador', 'rh'])` — só depois usa o cliente admin,
  que ignora RLS por completo e não sabe quem é o chamador, então essa
  ordem importa.
- **Senha inicial = últimos 6 dígitos do telefone**
  (`src/lib/temp-password.ts`): o pedido original foi "os 4 últimos
  números", mas o Supabase Auth recusa senha com menos de 6 caracteres
  por padrão — usei 6 dígitos em vez de 4 pra continuar funcionando sem
  precisar mexer na política de senha do projeto (que afetaria o sistema
  inteiro, não só este fluxo). Por isso o telefone passou de opcional
  para **obrigatório** no convite (mínimo de 6 dígitos, validado no Zod).
  `inviteUser()` chama `auth.admin.createUser({ email, password,
  email_confirm: true, user_metadata })` — cria a conta já com e-mail
  confirmado, pronta pra logar em `/login` sem nenhum passo a mais — e
  na sequência atualiza o `profiles` recém-criado pelo trigger com
  `campaign_id`/`full_name`/`phone` (cliente admin de novo, porque a
  política normal de `profiles_update` não aceita editar uma linha com
  `campaign_id` nulo, e é nulo até esse passo).
- **Compartilhar a senha** (`ShareCredentials`, em
  `src/components/usuarios/`): aparece depois de criar o usuário (ou
  resetar a senha), com e-mail + senha visíveis e três botões — "Copiar
  senha", "Enviar por WhatsApp" (`wa.me/<telefone>?text=...` numa nova
  aba, só aparece com telefone cadastrado; `src/lib/whatsapp.ts` assume
  Brasil, prefixando `55` quando o número tem 10-11 dígitos) e "Enviar
  por e-mail" (`mailto:`, abre o cliente de e-mail do próprio admin —
  não depende do mailer do Supabase).
- **Resetar senha** (`/usuarios/[id]`, `ResetPasswordButton` →
  `resetUserPassword()`): reseta a senha de um usuário existente para os
  últimos dígitos do telefone **atualmente** cadastrado (mesma fórmula),
  via `auth.admin.updateUserById()`. Útil se a pessoa esqueceu a senha
  ou nunca chegou a trocar. Exige telefone com pelo menos 6 dígitos —
  editável antes, no mesmo card (`PhoneForm`).
- **Trocar a própria senha** (`/conta`, acessível a **qualquer** usuário
  autenticado, link "Minha conta" no topbar): `ChangePasswordForm`
  chama `auth.updateUser({ password })` do lado do cliente, com a
  sessão já existente — não pede a senha atual (o Supabase Auth não
  exige isso pra essa chamada). É o "depois a pessoa pode trocar" que o
  usuário pediu; nada força a troca — fica só disponível.
- **Escopo territorial na atribuição de papel**: `coordenador_cidade`
  exige `cityId` e `coordenador_eixo` exige `axisId` no formulário
  (validado no Zod, `src/lib/validations/user.ts`) — são os únicos
  papéis cujo escopo em `profile_roles` é lido por uma função de RLS
  (`is_city_coordinator_for()`/`is_axis_coordinator_for()`, ver
  [Aprovações](#aprovações)). Para os demais papéis, cidade/eixo/equipe
  no formulário são só informativos.
- **Suspender/reativar** (`ToggleStatusButton`): alterna
  `profiles.status` entre `ativo`/`suspenso`. Como nenhuma política de
  RLS checa `profiles.status` hoje, suspender um usuário **não** revoga
  automaticamente o acesso dele enquanto a sessão atual continuar válida
  — é uma pendência registrada abaixo, não uma proteção real ainda.
- **Toda ação grava auditoria** (`usuario.convidar`,
  `usuario.papel.atribuir`, `usuario.papel.remover`,
  `usuario.suspender`/`usuario.reativar`, `usuario.senha.resetar`) via
  `log_audit_event()`, já que quem chama estas Server Actions é sempre
  `administrador`/`rh` (os únicos papéis autorizados a chamar essa
  função diretamente). A troca de senha pelo próprio usuário
  (`/conta`) **não** grava auditoria — é uma chamada direta do cliente
  ao Supabase Auth, fora do alcance de `log_audit_event()`.

## Segurança

- Nenhuma credencial ou chave secreta está versionada. `.env.example`
  contém apenas os nomes das variáveis.
- `.gitignore` exclui `.env*` (com exceção de `.env.example`), planilhas
  (`.xlsx`, `.xls`, `.csv`), extratos (`.ofx`) e pastas reservadas a dados
  reais (`/planilhas`, `/documentos`, `/extratos`, `/dados-reais`).
- A chave `SUPABASE_SERVICE_ROLE_KEY` — usada pela primeira vez na Fase 9,
  só para criar/resetar senha de usuários (ver [Usuários](#usuários)) —
  é usada **somente** em `src/lib/supabase/admin.ts`, nunca em
  componentes de cliente. Esse arquivo importa `"server-only"` (pacote da
  Vercel): se algum dia for importado por engano em código que roda no
  navegador, o `next build` falha em vez de vazar a chave no bundle.
  **Não está configurada em nenhum ambiente ainda** — precisa ser
  adicionada manualmente (painel do Supabase > Settings > API >
  `service_role` secret) em `.env.local` e nas variáveis de ambiente do
  Vercel; até lá, criar usuário/resetar senha mostra um erro claro em
  vez de quebrar.
- Todos os dados de exemplo em `supabase/seed.sql` e no painel são
  fictícios — nenhum CPF, nome ou dado real de pessoa foi usado.

## Riscos e pendências desta fase

- **`SUPABASE_SERVICE_ROLE_KEY` não configurada em nenhum ambiente
  (Fase 9)**: criar usuário e resetar senha dependem dela e não vão
  funcionar até ser adicionada manualmente em `.env.local` e no Vercel —
  ver [Segurança](#segurança). Não incluí o valor real em nenhum lugar
  deste repositório nem pedi para o usuário colar no chat, por ser uma
  credencial que ignora RLS por completo.
- **Senha inicial fraca por design — dígitos do telefone que a própria
  campanha divulga (Fase 9)**: a senha (6 dígitos do telefone) é curta e,
  mais importante, deriva de um dado que não é secreto — qualquer pessoa
  que tenha o WhatsApp de alguém (colega de equipe, material de
  campanha, grupo) tem tudo que precisa pra logar como ela, sem nem
  precisar receber a mensagem de compartilhamento. Isso foi um pedido
  explícito do usuário pela simplicidade operacional (entregar acesso
  por telefone sem depender de um link/e-mail), com a mitigação de dar à
  pessoa uma forma fácil de trocar a senha depois (`/conta` — ver
  [Usuários](#usuários)). **Não há nada hoje que force essa troca**: se
  a pessoa nunca abrir `/conta`, a senha original continua valendo
  indefinidamente. Se isso for um problema na prática, dá pra somar um
  campo tipo `profiles.must_change_password` e um redirecionamento
  obrigatório no primeiro login — não implementado, por não ter sido
  pedido.
- **Suspender usuário não revoga sessão ativa (Fase 9)**: `ToggleStatusButton`
  muda `profiles.status` para `suspenso`, mas nenhuma política de RLS
  checa esse campo hoje — `has_role()`/`is_admin()` só olham
  `profile_roles`. Um usuário já autenticado continua com acesso normal
  até a sessão expirar por conta própria. Endurecer isso exigiria alterar
  `has_role()`/`is_admin()` (chamadas por praticamente toda política de
  RLS do sistema) para também checar `status = 'ativo'` — decidi não
  fazer essa mudança sem testar, dado o alcance; documentado aqui como a
  pendência de segurança mais importante desta fase.
- **Papel `rh` ganhou acesso amplo a `profiles` (Fase 9, migração
  `0011`)**: `rh` agora lê/edita o perfil de qualquer usuário da
  campanha, inclusive de um `administrador` — mesmo alcance que
  `profile_roles` já dava a `rh` desde a 0001 (podia atribuir/remover
  papel de qualquer um, inclusive `administrador`), só que agora também
  pelo perfil em si. Foi a decisão explícita do usuário
  ("administrador e rh" gerenciam usuários); registrado aqui porque é uma
  ampliação de privilégio real.
- **Criação/reset de usuário não testado ponta a ponta**: nunca foi
  criado um usuário de verdade nesta sessão (a
  `SUPABASE_SERVICE_ROLE_KEY` não está configurada — ver acima —, e a
  bateria de testes interativos desta sessão segue interrompida a pedido
  do usuário). Em particular, não verifiquei na prática: se
  `createUser()` com `email_confirm: true` realmente deixa a pessoa
  logar de primeira em `/login` sem passo extra (esperado pela
  documentação do Supabase, não confirmado ao vivo), e se
  `auth.updateUser({password})` em `/conta` funciona sem pedir a senha
  atual como o código assume.
- **Heurística de telefone do `wa.me` não testada**: `buildWhatsAppLink()`
  (`src/lib/whatsapp.ts`) assume Brasil e prefixa `55` quando o número
  tem 10-11 dígitos — não testei com um número real se o WhatsApp Web
  abre a conversa corretamente; é só uma conveniência de formatação, o
  admin vê o destinatário antes de enviar.
- **Relatório de Aprovações inacessível a coordenadores (Fase 8)**: por
  usar `audit_logs` como fonte, herda a política `audit_logs_select`
  (`administrador`/`auditor` da campanha, mais o super admin). Um
  coordenador de cidade/eixo — que decide as aprovações — não consegue
  ver `/relatorios/aprovacoes`. Endurecer isso exigiria abrir
  `audit_logs` (ou criar uma view derivada) para coordenadores, o que não
  foi pedido nesta fase; documentado aqui em vez de decidido
  unilateralmente.
- **Filtro de território dos relatórios reflete o vínculo atual, não o
  histórico**: ver "Filtro de território" em
  [Relatórios](#relatórios) — um pagamento ou aprovação antigos, feitos
  quando a pessoa estava em outra cidade/eixo, aparecem sob a cidade/eixo
  **atual** dela, não a de então.
- **Relatórios não testados manualmente na UI** (mesma limitação já
  registrada nas fases anteriores — bateria de testes interativos desta
  sessão segue interrompida a pedido do usuário): filtros combinados,
  paginação implícita (teto de 500/5000 linhas) e os três CSVs exportados
  não foram abertos/conferidos num Excel real.
- **Isolamento entre campanhas não testado com um segundo usuário real**:
  as políticas de RLS da Fase 1C foram conferidas por leitura/Advisors e
  por consulta SQL direta (que roda como `postgres`, contornando RLS —
  não prova nada sobre `authenticated`/`anon`), mas não há ainda um
  segundo usuário de teste, sem `is_platform_admin`, numa segunda
  campanha, confirmando pela UI que ele **não** vê os dados da primeira.
  Criar esse teste é a validação mais importante pendente desta fase.
- **UI sem seletor/indicador de campanha para o super admin**: hoje só
  existe o ponto de vista "minha campanha" (usuário comum) ou "todas
  misturadas, sem distinção visual" (super admin) em `/pessoas`. Não há
  uma visão "uma campanha de cada vez, à minha escolha" para o super
  admin — nem uma coluna indicando de qual campanha é cada linha quando
  ele vê a lista combinada.
- **Concessão de `is_platform_admin` é só via SQL**, sem tela — mesmo
  processo manual de `campaigns_insert` (criar uma campanha nova).
- **`has_role()`/`is_admin()`/`is_platform_admin()`/`current_campaign_id()`/
  `log_audit_event()` chamáveis via RPC por usuários autenticados**: o
  Security Advisor aponta isso como alerta; é intencional em todos os
  casos — cada função só revela dado do próprio usuário chamador
  (`profile_id`/`campaign_id`/`is_platform_admin` do próprio
  `auth.uid()`), e `log_audit_event` checa `has_role(['administrador','rh'])`
  internamente antes de gravar, então não há exposição de dado de
  terceiros nem escalonamento de privilégio.
- **PWA/offline**: apenas o `manifest.webmanifest` foi criado; não há
  Service Worker/cache offline ainda — depende de definir os ícones e a
  estratégia de cache junto com os módulos de campo (Ponto/Operações), que
  são os que realmente precisam funcionar offline.
- **Escopo de visibilidade por hierarquia dentro de uma campanha —
  parcialmente resolvido na Fase 2**: as políticas de `people`/tabelas
  satélite continuam liberando leitura ampla para
  `administrador`/`rh`/`auditor` **dentro da própria campanha**; o que a
  Fase 2 endereçou foi só a visibilidade de um coordenador de
  cidade/eixo **durante a aprovação** (só a pessoa na etapa dele). Um
  coordenador não tem hoje uma visão geral de "minha cidade"/"meu eixo"
  fora do fluxo de aprovação (ex.: listar todas as pessoas já aprovadas
  do seu território) — isso segue pendente para uma fase futura.
- **Papel de coordenador ainda só via SQL**: atribuir
  `coordenador_cidade`/`coordenador_eixo` (com `city_id`/`axis_id`) a um
  usuário não tem tela — mesmo processo manual do bootstrap de admin (ver
  seção "Aprovações"/"Como executar localmente").
- **Equipe não participa da lógica de aprovação**: o formulário "Enviar
  para aprovação" só pede Cidade; o campo Equipe de
  `organizational_assignments` fica `null` — pode ser preenchido depois,
  manualmente, se um módulo de gestão de equipe precisar dele.
- **Fluxo de aprovação não testado com um coordenador real**: mesma
  limitação já registrada para o isolamento multi-tenant — sem um segundo
  usuário de teste com papel `coordenador_cidade`/`coordenador_eixo`
  (não-admin), não foi possível confirmar na prática que a visibilidade
  fica restrita ao território dele (só testado logado como o super admin,
  que sempre vê tudo via `is_platform_admin()`).
- **Fluxo financeiro também não testado com `financeiro`/`tesouraria`
  reais**: mesma limitação — só testado logado como super admin. Atribuir
  esses papéis a um usuário também é só via SQL, sem tela.
- **Sem movimentação real de dinheiro**: `payments` só registra status
  (pendente/pago/rejeitado/cancelado) — não há integração com banco, PIX
  ou qualquer gateway. Conciliação bancária e exportação PDF/Excel de
  pagamentos seguem fora de escopo.
- **Lote sem decisão em massa**: `create_payment_batch()` cria N
  pagamentos de uma vez, mas `decide_payment()` continua decidindo um por
  um — tesouraria precisa aprovar/rejeitar cada pessoa do lote
  individualmente em `/financeiro`. Um "decidir o lote inteiro" fica para
  uma iteração futura, se o volume de pagamentos por lote justificar.
- **`create_payment()`/`create_payment_batch()`/`decide_payment()`
  chamáveis via RPC por usuários autenticados**: mesma categoria de
  alerta intencional do Security Advisor — todas checam o papel do
  chamador (`financeiro`/`administrador` para criar, `tesouraria`/
  `administrador` para decidir) antes de qualquer gravação, então não há
  escalonamento de privilégio.
- **Sem atomicidade real entre `people` e as tabelas satélite**: cada
  gravação é uma chamada PostgREST separada (sem transação compartilhada).
  Uma falha parcial (ex.: pessoa criada, mas endereço não salvo) é
  reportada ao usuário na própria tela de edição, com uma linha de
  auditoria de `result: 'falha'` — mas não há rollback automático. Uma
  função Postgres consolidada (`save_person`) resolveria isso com
  atomicidade real, se falhas parciais se mostrarem um problema recorrente.
- **OCR, assinatura eletrônica e geração de PDF/Excel**: interfaces
  desacopladas ainda não criadas — entram quando os módulos que os usam
  (Documentos, Contratos, Relatórios) forem implementados.
- **Despesas não testadas com `financeiro`/`tesouraria` reais**: mesma
  limitação já registrada para Aprovações/Financeiro — sessão de testes
  interativos foi interrompida a pedido do usuário antes de chegar a este
  módulo. Migração aplicada, Advisors conferidos, `typecheck`/`lint`/
  `build` limpos, mas o formulário/upload de comprovante em si não foi
  clicado numa sessão real.
- **Comprovante sem validação de conteúdo além do mime-type**: o upload
  aceita qualquer arquivo PDF/JPG/PNG dentro do limite de 10 MB — não há
  verificação de que o conteúdo é de fato um comprovante legível (nem
  antivírus/malware scan). Mesmo nível de confiança que
  `pessoas-documentos` já tinha.
- **Sem reembolso parcial ou parcelado**: uma despesa é paga integralmente
  de uma vez (`pago`) ou rejeitada — não há conceito de pagamento parcial
  nem parcelamento nesta fase mínima.
- **Tipos do Supabase escritos à mão**: `src/types/database.ts` foi
  escrito manualmente para refletir as migrações `0001`, `0004`–`0009`.
  Considere regenerar com
  `npx supabase gen types typescript --project-id pjjarkxwwzqiajlvpsdx`
  quando o CLI/config local do Supabase for configurado neste repositório
  (ainda não existe `supabase/config.toml`) — atenção: a geração
  automática não preserva union types como `PersonStatus`, então uma
  migração completa para o arquivo gerado exige reintroduzir esses tipos
  literais manualmente.
- **Ícones do manifesto PWA**: `manifest.webmanifest` está sem ícones
  (nenhuma arte foi fornecida). Adicionar quando houver identidade visual
  definida para a campanha.

## Testes realizados

**Fase 1A:**

- Migrações `0001`–`0003` aplicadas com sucesso em um projeto Supabase real
  (`list_tables` confirmou as 10 tabelas com `rls_enabled: true`).
- Teste end-to-end do proxy de autenticação contra o projeto Supabase real:
  `/` responde `307` redirecionando para `/login?redirectTo=%2F` (sem
  sessão) e `/login` responde `200` com o formulário renderizado.
- Teste do proxy com variáveis de ambiente inválidas: mesmo comportamento
  de redirecionamento, confirmando que falhas de configuração/rede
  degradam para "não autenticado" em vez de erro 500 (ver
  `src/lib/supabase/proxy.ts`).

**Fase 1B:**

- `npm run typecheck`, `npm run lint`, `npm run build` e
  `npm run format:check` — sem erros, com as três rotas novas (`/pessoas`,
  `/pessoas/novo`, `/pessoas/[id]/editar`) geradas corretamente como
  dinâmicas (`ƒ`).
- Migração `0004` (tabelas satélite, bucket `pessoas-documentos`, função
  `log_audit_event`) aplicada com sucesso no projeto `pjjarkxwwzqiajlvpsdx`
  (`list_tables` confirmou as 14 tabelas com `rls_enabled: true`).
- Supabase Security Advisor e Performance Advisor checados após a
  migração `0004`: nenhum alerta novo além dos já aceitos deliberadamente
  (ver "Riscos e pendências"); achados de `unused_index` são esperados
  (tabelas ainda vazias em produção).
- Deploy de produção (Vercel) com as env vars atualizadas: build remoto
  concluído com sucesso, `/` e `/login` respondendo como esperado.
- Teste end-to-end via Playwright (headless Chromium) contra a produção:
  login como admin → `/pessoas` → criar pessoa com CPF de teste
  `111.444.777-35` → redirect para edição confirmado → anexar documento →
  linha gravada em `person_documents` e `audit_logs` (`pessoa.criar`,
  `pessoa.documento.anexar`, com `actor_email` correto) → pessoa aparece
  na listagem com badge "Rascunho" → busca por nome funciona. Nenhum erro
  de console. **Não verificado**: bloqueio de RLS para um usuário sem
  papel `administrador`/`rh`/`auditor` (faltava uma segunda conta de
  teste).

**Fase 1C:**

- Migração `0005` (colunas `campaign_id`, funções
  `current_campaign_id()`/`is_platform_admin()`, reescrita de todas as
  políticas de RLS, path com prefixo de campanha no Storage) aplicada com
  sucesso no projeto `pjjarkxwwzqiajlvpsdx`.
- Backfill conferido via SQL: a campanha "Bia Kicis - Senadora" foi criada,
  o admin (`pauloinvest74@gmail.com`) ficou com `is_platform_admin: true`
  e vinculado a ela, a pessoa de teste "Maria Teste da Silva" migrada para
  a mesma campanha, e os 2 registros pré-existentes de `audit_logs` com
  `campaign_id` correto.
- `npm run typecheck`, `npm run lint`, `npm run build` — sem erros.
- Supabase Security Advisor e Performance Advisor checados após a
  migração `0005`: nenhum alerta novo além dos já aceitos deliberadamente
  (mesma lista de funções `SECURITY DEFINER` chamáveis via RPC, agora
  incluindo `current_campaign_id`/`is_platform_admin`).
- **Não verificado**: teste de isolamento com um segundo usuário/segunda
  campanha reais (ver "Riscos e pendências desta fase").

**Fase 2:**

- Migração `0006` (funções `is_city_coordinator_for()`/
  `is_axis_coordinator_for()`/`decide_approval()`, trigger
  `check_same_campaign()`, reescrita de `people_select`/
  `organizational_assignments_select`) aplicada com sucesso no projeto
  `pjjarkxwwzqiajlvpsdx`.
- `npm run typecheck`, `npm run lint`, `npm run build` — sem erros.
- Supabase Security Advisor checado após a migração: encontrado e
  corrigido no ato um gap real — `check_same_campaign()` (função de
  trigger de uso interno) tinha ficado chamável via RPC por `anon`, sem o
  `revoke` que as demais funções `SECURITY DEFINER` já recebem por
  padrão desde a 0002; corrigido antes de seguir. Depois da correção,
  nenhum alerta novo além dos já aceitos deliberadamente.
- **Não verificado**: fluxo de aprovação com um coordenador de
  cidade/eixo real, não-admin (ver "Riscos e pendências desta fase").

**Fase 3:**

- Migração `0007` (tabela `payments`, funções `create_payment()`/
  `decide_payment()`, extensão de `people_select`/
  `person_bank_accounts_select` para `financeiro`/`tesouraria`, trigger
  `check_same_campaign()` estendido) aplicada com sucesso no projeto
  `pjjarkxwwzqiajlvpsdx`.
- Durante o desenho, percebi que o plano original previa `createPayment`
  gravando auditoria via `insert` direto em `audit_logs` — o que não
  funciona, porque essa tabela não tem política de `INSERT` para nenhum
  papel de cliente (só funções `SECURITY DEFINER` escrevem lá). Corrigido
  antes de aplicar: criada a função `create_payment()` (mesmo padrão de
  `decide_payment()`), que também centraliza a checagem de elegibilidade
  e a montagem do `bank_snapshot` — a política `payments_insert` nem
  chegou a ficar em produção como pensada originalmente.
- `npm run typecheck`, `npm run lint`, `npm run build` — sem erros.
- Supabase Security Advisor checado após a migração: nenhum alerta novo
  além dos já aceitos deliberadamente.
- **Não verificado**: fluxo financeiro com `financeiro`/`tesouraria`
  reais, não-admin (ver "Riscos e pendências desta fase").
- Migração `0008` (tabela `payment_batches`, função
  `create_payment_batch()`, coluna `payments.batch_id`, trigger
  `check_same_campaign()` estendido de novo) aplicada com sucesso no
  mesmo projeto, complementando a Fase 3 com folha em lote.
  `npm run typecheck`/`lint`/`build` sem erros; Security Advisor sem
  alertas novos. **Não verificado manualmente na UI** (`/financeiro/lote/novo`
  e a coluna "Lote" em `/financeiro`) — a bateria de testes interativos
  desta sessão foi interrompida a pedido do usuário antes de chegar a
  essa parte; a lógica de elegibilidade/atomicidade do lote foi revisada
  por leitura, não exercitada ponta a ponta.
- Migração `0009` (tabela `expenses`, bucket `despesas-comprovantes`,
  funções `create_expense()`/`decide_expense()`, `check_same_campaign()`
  estendido de novo) aplicada com sucesso no mesmo projeto.
  `npm run typecheck`/`lint`/`build` sem erros; Security Advisor sem
  alertas novos além dos já aceitos. **Não verificado manualmente na UI**
  (mesma limitação já registrada para o lote de pagamentos — sessão de
  testes interrompida antes desta parte).

**Fase 7:**

- Migração `0010` (reescrita de `profiles_select` para liberar leitura de
  outros perfis da campanha para `auditor`, além de `administrador`)
  aplicada com sucesso no projeto `pjjarkxwwzqiajlvpsdx`.
- Tela `/auditoria` criada (lista/busca/paginação de `audit_logs`,
  resolução de autor via `profiles`) — `npm run typecheck`/`lint`/`build`
  sem erros.
- Supabase Security Advisor checado após a migração: nenhum alerta novo
  além dos já aceitos deliberadamente.
- **Não verificado manualmente na UI**: mesma limitação já registrada nas
  fases anteriores — a bateria de testes interativos desta sessão segue
  interrompida a pedido do usuário; em particular, o acesso com um
  usuário `auditor` puro (não-admin) não foi exercitado ponta a ponta,
  só verificado por leitura da política.

**Fase 8:**

- Sem migração nova — os três relatórios consultam tabelas e políticas de
  RLS já existentes (`payments`, `expenses`, `people`, `audit_logs`,
  `organizational_assignments`, `profiles`).
- Telas `/relatorios`, `/relatorios/financeiro`, `/relatorios/pessoas`,
  `/relatorios/aprovacoes` e os três endpoints `.../export` criados —
  `npm run typecheck`/`lint`/`build` sem erros.
- **Não verificado manualmente na UI**: mesma limitação já registrada nas
  fases anteriores. Em particular, nenhuma combinação de filtros foi
  exercitada na prática, nenhum dos três CSVs foi baixado/aberto num
  Excel real, e o acesso ao relatório de Aprovações com um usuário
  `auditor`/coordenador não-admin não foi testado (ver "Riscos e
  pendências desta fase").

**Fase 9:**

- Migração `0011` (`profiles_select`/`profiles_update` passam a incluir
  `rh`, além de `administrador`/`auditor` já existentes) aplicada com
  sucesso no projeto `pjjarkxwwzqiajlvpsdx`.
- Telas `/usuarios` e `/usuarios/[id]`, cliente admin
  (`src/lib/supabase/admin.ts`), Server Actions `inviteUser()`/
  `assignRole()`/`removeRole()`/`toggleUserStatus()` criados — `npm run
  typecheck`/`lint`/`build` sem erros. (Versão original desta entrega
  usava convite por e-mail com link; substituído logo em seguida — ver
  abaixo.)
- Supabase Security Advisor checado após a migração: nenhum alerta novo
  além dos já aceitos deliberadamente.

**Fase 9 (complemento 1 — telefone/WhatsApp):**

- Migração `0012` (`profiles.phone`, campo livre) aplicada com sucesso no
  mesmo projeto — Security Advisor sem alertas novos.
- Convite trocado de `inviteUserByEmail()` para `generateLink({ type:
  "invite" })`, pra expor o link em vez de só mandar e-mail. Componente
  de compartilhamento, reenvio de link e `updatePhone()` criados — `npm
  run typecheck`/`lint`/`build` sem erros. (Essa versão baseada em link
  também foi substituída no complemento seguinte, a pedido do usuário —
  ver abaixo.)

**Fase 9 (complemento 2 — login por senha, sem link):**

- Sem migração nova. Convite trocado de novo — desta vez de
  `generateLink()` para `auth.admin.createUser({ password, email_confirm:
  true })`: cria a conta já com senha (últimos 6 dígitos do telefone) e
  e-mail confirmado, login direto em `/login`. `/convite` (rota de
  aceitar link) e `src/lib/site-url.ts` removidos do código — não tinham
  mais uso. `resetUserPassword()` substitui o antigo reenvio de link.
  Nova página `/conta` (qualquer usuário autenticado) para trocar a
  própria senha — `auth.updateUser({password})` do lado do cliente.
  `npm run typecheck`/`lint`/`build` sem erros.
- Supabase Security Advisor não re-checado nesta rodada (nenhuma
  migração nova para revisar).
- **Não verificado de forma nenhuma, nas três rodadas desta fase**: além
  da UI não ter sido exercitada interativamente (mesma limitação de
  sempre), o fluxo **não pode** ter sido testado ainda, porque
  `SUPABASE_SERVICE_ROLE_KEY` não está configurada em nenhum ambiente.
  Ver "Riscos e pendências desta fase" para o que falta confirmar assim
  que a chave for adicionada.

## Próxima fase

A numeração de fase usada neste README mistura dois esquemas: a
numeração **original dos placeholders** criados na Fase 1A (Pessoas=2,
Aprovações=3, Ponto/Operações=4, Financeiro=5, Despesas=6, Auditoria=7,
Relatórios=8) e a numeração **real de entrega** desta sessão
(1A → 1B → 1C → 2 → 3 → 6 → 7 → 8 → 9). **Usuários (Fase 9)** não tem
correspondente na numeração original dos placeholders — é um módulo
pedido fora dos 8 originais. Mapeamento completo:

| Nº do placeholder original | Módulo            | Nº real de entrega | Status       |
| -------------------------- | ----------------- | ------------------ | ------------ |
| Fase 2                     | Pessoas           | Fase 1B            | ✅ concluído |
| Fase 3                     | Aprovações        | Fase 2             | ✅ concluído |
| Fase 4                     | Ponto / Operações | —                  | ⏳ pendente  |
| Fase 5                     | Financeiro        | Fase 3             | ✅ concluído |
| Fase 6                     | Despesas          | Fase 6             | ✅ concluído |
| Fase 7                     | Auditoria         | Fase 7             | ✅ concluído |
| Fase 8                     | Relatórios        | Fase 8             | ✅ concluído |
| **— (fora do original)**   | **Usuários**      | **Fase 9**         | ✅ concluído |

Módulos **Pessoas** (Fase 1B), **Multi-tenant** (Fase 1C), **Aprovações**
(Fase 2), **Financeiro** (Fase 3, incluindo lote), **Despesas** (Fase 6),
**Auditoria** (Fase 7), **Relatórios** (Fase 8) e **Usuários** (Fase 9)
estão funcionais — **Usuários só depois que `SUPABASE_SERVICE_ROLE_KEY`
for configurada** (ver "Riscos e pendências desta fase"). Só resta
**Ponto** e **Operações** (Fase 4) como módulos ainda placeholder.
Pendências que ficaram deliberadamente fora do escopo mínimo, para
retomar quando fizer sentido:

1. **Configurar `SUPABASE_SERVICE_ROLE_KEY`** (painel do Supabase >
   Settings > API > `service_role` secret) em `.env.local` e no Vercel —
   sem isso, criar usuário e resetar senha falham. Depois disso, criar um
   usuário de teste e confirmar que o login em `/login` funciona de
   primeira com e-mail + últimos 6 dígitos do telefone, e que `/conta`
   troca a senha corretamente.
2. Verificação manual/end-to-end do lote de pagamentos
   (`/financeiro/lote/novo`), de Despesas (`/despesas/novo`), da tela de
   Auditoria (`/auditoria`) e dos três relatórios (`/relatorios/*`,
   inclusive os CSVs exportados) — não testados nesta sessão.
3. Teste de isolamento entre campanhas E teste dos fluxos de
   aprovação/financeiro/despesas, com usuários de teste reais (segunda
   campanha, coordenador/financeiro/tesouraria/auditor não-admin) — mais
   fácil agora que existe `/usuarios` para criar esses usuários de teste
   sem SQL manual — ver "Riscos e pendências desta fase".
4. Visão geral de "minha cidade"/"meu eixo" para um coordenador fora do
   fluxo de aprovação (hoje só vê a pessoa que está na etapa dele) — o
   relatório de Aprovações não cobre isso, porque um coordenador não
   consegue lê-lo (ver "Riscos e pendências desta fase").
5. Suspender usuário revogar a sessão de fato (hoje só marca
   `profiles.status`, não é checado por nenhuma política de RLS — ver
   "Riscos e pendências desta fase").
6. Decisão em massa para um lote inteiro (hoje é por pagamento
   individual); conciliação bancária; reembolso parcial/parcelado.
7. Exportação em PDF/Excel dos relatórios (hoje só CSV) e gráficos (hoje
   só barras de funil simples em HTML/CSS).
8. Atomicidade real entre `people` e as tabelas satélite (função Postgres
   consolidada), caso falhas parciais se mostrem um problema recorrente.
9. Seletor/indicador de campanha na UI para o super admin de plataforma.
10. OCR de documentos e assinatura eletrônica de contrato — dependem dos
    módulos que os utilizam.

Para o próximo módulo funcional, a navegação já criada na Fase 1A aponta
para **Ponto** e **Operações** — os dois únicos placeholders restantes.
