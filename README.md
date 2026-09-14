# RH Eleitoral

Sistema de gestão de pessoas, operações e pagamentos para campanha eleitoral.

> **Fase atual: 3 — Financeiro.** Sobre a base técnica (Fase 1A), o módulo
> **Pessoas** (Fase 1B), o isolamento **multi-tenant** por campanha (Fase
> 1C — ver [Multi-tenant](#multi-tenant)) e o fluxo de **validação
> territorial** (Fase 2 — ver [Aprovações](#aprovações)), o sistema agora
> cobre **pagamentos avulsos**: `financeiro` lança um pagamento para uma
> pessoa `ativo`, `tesouraria` paga ou rejeita (ver
> [Financeiro](#financeiro)). Os demais módulos (Ponto, Operações,
> Despesas, etc.) serão implementados em fases seguintes — ver
> [Próxima fase](#próxima-fase).

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
> com as migrações `0001`–`0007` aplicadas (schema base + tabelas satélite
> de pessoa + isolamento multi-tenant por campanha + fluxo de aprovação +
> pagamentos). **O seed fictício não
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

4. Aplique as migrações do banco, em ordem (`0001` a `0007`). Duas opções:

   **Opção A — SQL Editor do Supabase Studio (mais simples):**
   Abra cada arquivo em `supabase/migrations/` (0001 a 0007), copie o
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
      financeiro/       # pagamentos avulsos financeiro → tesouraria (Fase 3)
      despesas/         # placeholder — Fase 6
      auditoria/        # placeholder — Fase 7
      relatorios/       # placeholder — Fase 8
      configuracoes/    # gestão territorial: eixos/cidades/equipes (Fase 2)
    proxy.ts            # (fora de app/, ver abaixo) proteção de rotas
  components/
    ui/                 # componentes acessíveis reutilizáveis (botão, input, card...)
    layout/             # shell do painel (sidebar, topbar, navegação)
  lib/
    supabase/           # clientes Supabase (browser, servidor, proxy)
    validations/        # esquemas Zod
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
  admin (`campaigns_insert` exige `is_platform_admin()`) e continua sendo
  um processo manual de SQL — não existe tela de onboarding de campanha.
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

Pagamento avulso por pessoa — sem folha recorrente nem lote nesta fase.
Fluxo de duas etapas, espelhando os papéis `financeiro`/`tesouraria` do
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

Detalhes completos em `supabase/migrations/0007_financeiro_payments.sql`.

## Modelo de dados (Fase 1A + 1B + 1C + 2 + 3)

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
| `payments`                   | Pagamento avulso a uma pessoa (financeiro → tesouraria)                         |

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
`supabase/migrations/0005_multi_tenant_campaign_scoping.sql` e
`supabase/migrations/0007_financeiro_payments.sql`.

## Políticas de RLS criadas

Todas as 15 tabelas têm RLS habilitado. Desde a Fase 1C, **toda** política
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
  gravar é via `create_payment()`/`decide_payment()` (`SECURITY
DEFINER`), que também centralizam a checagem de elegibilidade
  (`people.status = 'ativo'`) e a montagem do `bank_snapshot`. Sem
  `DELETE`. Também coberta pelo trigger `check_same_campaign()`
  (`person_id` precisa pertencer à mesma campanha do pagamento).
- **`profiles`**: cada usuário vê/edita apenas o próprio registro;
  `administrador` vê/edita os demais perfis **da própria campanha** (antes
  da Fase 1C, via todas as campanhas — corrigido).
- **`profile_roles`**: cada usuário vê os próprios papéis;
  `administrador`/`rh` administram os de perfis **da própria campanha**
  (verificado via join em `profiles.campaign_id`, já que
  `profile_roles.campaign_id` não é mais usado para autorização).
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
Desde a Fase 2, papéis que não são `administrador`/`rh` (coordenador de
cidade/eixo na Fase 2, `financeiro`/`tesouraria` na Fase 3) não conseguem
chamar `log_audit_event()` — as funções que eles usam
(`decide_approval()`, `create_payment()`, `decide_payment()`) gravam a
auditoria com um `insert` direto dentro da própria função
`SECURITY DEFINER`, já que `audit_logs` não tem política de `INSERT`
para nenhum papel de cliente.

## Segurança

- Nenhuma credencial ou chave secreta está versionada. `.env.example`
  contém apenas os nomes das variáveis.
- `.gitignore` exclui `.env*` (com exceção de `.env.example`), planilhas
  (`.xlsx`, `.xls`, `.csv`), extratos (`.ofx`) e pastas reservadas a dados
  reais (`/planilhas`, `/documentos`, `/extratos`, `/dados-reais`).
- A chave `SUPABASE_SERVICE_ROLE_KEY` (quando necessária, em fases
  futuras) deve ser usada **somente** em código de servidor, nunca em
  componentes de cliente nem exposta ao navegador.
- Todos os dados de exemplo em `supabase/seed.sql` e no painel são
  fictícios — nenhum CPF, nome ou dado real de pessoa foi usado.

## Riscos e pendências desta fase

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
  ou qualquer gateway. Conciliação bancária, folha recorrente/lote e
  exportação PDF/Excel de pagamentos seguem fora de escopo.
- **`create_payment()`/`decide_payment()` chamáveis via RPC por usuários
  autenticados**: mesma categoria de alerta intencional do Security
  Advisor — ambas checam o papel do chamador (`financeiro`/`administrador`
  para criar, `tesouraria`/`administrador` para decidir) antes de
  qualquer gravação, então não há escalonamento de privilégio.
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
- **Tipos do Supabase escritos à mão**: `src/types/database.ts` foi
  escrito manualmente para refletir as migrações `0001`, `0004`, `0005`,
  `0006` e `0007`. Considere regenerar com
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

## Próxima fase

Módulos **Pessoas** (Fase 1B), **Multi-tenant** (Fase 1C), **Aprovações**
(Fase 2) e **Financeiro** (Fase 3) estão funcionais. Pendências que
ficaram deliberadamente fora do escopo mínimo, para retomar quando fizer
sentido:

1. Teste de isolamento entre campanhas E teste dos fluxos de
   aprovação/financeiro, com usuários de teste reais (segunda campanha,
   coordenador/financeiro/tesouraria não-admin) — ver "Riscos e
   pendências desta fase".
2. Visão geral de "minha cidade"/"meu eixo" para um coordenador fora do
   fluxo de aprovação (hoje só vê a pessoa que está na etapa dele).
3. Tela de atribuição de papel (coordenador, financeiro, tesouraria —
   hoje só via SQL).
4. Conciliação bancária, folha recorrente/lote e exportação PDF/Excel de
   pagamentos.
5. Atomicidade real entre `people` e as tabelas satélite (função Postgres
   consolidada), caso falhas parciais se mostrem um problema recorrente.
6. Seletor/indicador de campanha na UI para o super admin de plataforma.
7. OCR de documentos, assinatura eletrônica de contrato e exportação
   PDF/Excel — dependem dos módulos que os utilizam.

Para o próximo módulo funcional, a navegação já criada na Fase 1A aponta
para **Ponto**, **Operações**, **Despesas**, **Auditoria** ou
**Relatórios** como sequência natural, a depender da prioridade da
campanha.
