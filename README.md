# RH Eleitoral

Sistema de gestão de pessoas, operações e pagamentos para campanha eleitoral.

> **Fase atual: 1B — Cadastro de Pessoa.** Além da base técnica da Fase 1A
> (autenticação, navegação, modelo de dados inicial e RLS), o módulo
> **Pessoas** já está funcional: cadastro com validação de CPF, endereço,
> dados bancários e eleitorais, upload de documentos e listagem com busca e
> paginação. Os demais módulos (Aprovações, Ponto, Financeiro, etc.) serão
> implementados em fases seguintes — ver [Próxima fase](#próxima-fase).

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
> com as migrações `0001`–`0004` aplicadas (schema base + tabelas satélite de
> pessoa). **O seed fictício não foi aplicado neste projeto** — o banco
> recebe dados reais desde o início da Fase 1B. Um `.env.local` já criado
> localmente aponta para ele (arquivo ignorado pelo Git — não é versionado).
> O deploy de produção está em <https://rh-eleitoral.vercel.app> (Vercel,
> conectado ao repositório no GitHub, deploy automático a cada push em
> `main`). Se você está clonando este repositório em outra máquina ou quer
> um projeto próprio, siga os passos abaixo normalmente.

1. Crie um projeto gratuito em [supabase.com](https://supabase.com) (ou peça
   para quem administra a campanha criar e compartilhar o acesso).
2. No painel do projeto, vá em **Settings → API** e copie:
   - **Project URL**
   - **anon public key**
3. Copie `.env.example` para `.env.local` e preencha os dois valores:

   ```bash
   cp .env.example .env.local
   ```

4. Aplique as migrações do banco, em ordem (`0001` a `0004`). Duas opções:

   **Opção A — SQL Editor do Supabase Studio (mais simples):**
   Abra cada arquivo em `supabase/migrations/` (0001, 0002, 0003, 0004),
   copie o conteúdo e execute no SQL Editor do painel do Supabase, um de
   cada vez, na ordem numérica.

   **Opção B — Supabase CLI:**

   ```bash
   npx supabase link --project-ref <seu-project-ref>
   npx supabase db push
   ```

5. (Opcional, apenas para desenvolvimento) Carregue dados fictícios para
   testar a navegação e o painel:

   Execute o conteúdo de `supabase/seed.sql` no SQL Editor. **Nunca execute
   este arquivo em um projeto de produção.**

6. Crie o primeiro usuário administrador:
   - No painel do Supabase, vá em **Authentication → Users → Add user** e
     crie um usuário com e-mail e senha (isso já cria automaticamente uma
     linha em `public.profiles`, via trigger).
   - No SQL Editor, associe o papel de administrador a esse usuário
     (substitua o e-mail):

     ```sql
     insert into public.profile_roles (profile_id, role_id)
     select p.id, r.id
     from public.profiles p, public.roles r
     where p.email = 'seu-email@exemplo.com'
       and r.code = 'administrador';
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
      aprovacoes/       # placeholder — Fase 3
      ponto/            # placeholder — Fase 4
      operacoes/        # placeholder — Fase 4
      financeiro/       # placeholder — Fase 5
      despesas/         # placeholder — Fase 6
      auditoria/        # placeholder — Fase 7
      relatorios/       # placeholder — Fase 8
      configuracoes/    # placeholder
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

## Modelo de dados (Fase 1A + 1B)

| Tabela                       | Descrição                                               |
| ---------------------------- | ------------------------------------------------------- |
| `campaigns`                  | Campanha eleitoral                                      |
| `roles`                      | Catálogo de perfis de acesso (11 papéis da seção 5)     |
| `axes`                       | Eixos da campanha                                       |
| `cities`                     | Cidades / Regiões Administrativas                       |
| `teams`                      | Equipes de campo                                        |
| `people`                     | Cadastro único de pessoa (identidade essencial)         |
| `profiles`                   | Usuário autenticado (1:1 com `auth.users`)              |
| `profile_roles`              | Atribuição de papel a usuário, com escopo e vigência    |
| `organizational_assignments` | Histórico de vínculo pessoa ↔ equipe/cidade/eixo/função |
| `audit_logs`                 | Trilha de auditoria imutável                            |
| `person_addresses`           | Endereço atual da pessoa (1:1, mutável)                 |
| `person_bank_accounts`       | Conta bancária/PIX atual da pessoa (1:1, mutável)       |
| `person_electoral_data`      | Dados do título de eleitor da pessoa (1:1, mutável)     |
| `person_documents`           | Metadados de documentos anexados (1:N, soft-delete)     |

Endereço, dados bancários e dados eleitorais são tratados como atributos
mutáveis da pessoa (análogos a `people.phone`/`people.email`), não como
histórico versionado — ao contrário de `organizational_assignments`. O
histórico de alterações fica registrado em `audit_logs`
(`before_data`/`after_data`), não em `valid_from`/`valid_until` próprios.

Detalhes de colunas, checks e comentários estão em
`supabase/migrations/0001_initial_schema.sql` e
`supabase/migrations/0004_person_satellite_tables.sql`.

## Políticas de RLS criadas

Todas as 14 tabelas têm RLS habilitado. Resumo:

- **`campaigns`, `roles`, `axes`, `cities`, `teams`**: leitura liberada a
  qualquer usuário autenticado (dados de catálogo/organização, não
  sensíveis); escrita restrita ao papel `administrador`.
- **`people`**: leitura e escrita restritas a `administrador`/`rh`
  (leitura também para `auditor`). Sem política de `DELETE` — exclusão é
  sempre lógica via `status`.
- **`person_addresses`, `person_bank_accounts`, `person_electoral_data`,
  `person_documents`**: mesmo padrão de `people` — leitura para
  `administrador`/`rh`/`auditor`, escrita para `administrador`/`rh`. Sem
  `DELETE` (exclusão lógica via `status` em `person_documents`; satélites
  1:1 são simplesmente sobrescritos).
- **`profiles`**: cada usuário vê/edita apenas o próprio registro;
  `administrador` vê/edita todos.
- **`profile_roles`**: cada usuário vê os próprios papéis;
  `administrador`/`rh` administram todos.
- **`organizational_assignments`**: leitura para
  `administrador`/`rh`/`auditor`; escrita para `administrador`/`rh`. Sem
  `DELETE`.
- **`audit_logs`**: leitura restrita a `administrador`/`auditor`; sem
  `INSERT`/`UPDATE`/`DELETE` direto para usuários comuns — a única forma de
  gravar é via a função `SECURITY DEFINER` `log_audit_event()` (ver
  "Auditoria" abaixo), chamada pelas server actions do módulo Pessoas a
  cada criação/edição.
- **Storage — bucket `pessoas-documentos`** (privado): política de
  `INSERT` para `administrador`/`rh`, `SELECT` para
  `administrador`/`rh`/`auditor`, sem `UPDATE`/`DELETE`. Leitura de arquivo
  sempre via URL assinada de 60s gerada sob demanda — nunca há acesso
  público direto ao objeto.

## Auditoria

A partir da Fase 1B, `audit_logs` recebe gravações reais: a função
`public.log_audit_event()` (`SECURITY DEFINER`, chamável apenas por
`administrador`/`rh`) é invocada explicitamente pelas server actions de
`src/app/(app)/pessoas/actions.ts` após cada gravação bem-sucedida em
`people` ou em uma tabela satélite, e ao anexar um documento. Todas as
linhas geradas por uma mesma submissão de formulário compartilham um
`related_request_id`, permitindo correlacionar, por exemplo, a criação de
uma pessoa com a gravação simultânea de seu endereço e dados bancários.

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

- **Verificação manual de ponta a ponta ainda pendente**: as mudanças desta
  fase foram verificadas via `typecheck`/`lint`/`build`, aplicação real das
  migrações no Supabase e conferência dos Advisors — mas o fluxo completo
  na UI (login → criar pessoa → anexar documento → conferir `audit_logs`)
  ainda não foi percorrido manualmente no ambiente de produção. Recomenda-se
  fazer esse teste antes de considerar o módulo Pessoas pronto para uso
  real (roteiro em "Testes realizados" abaixo).
- **`has_role()`/`is_admin()`/`log_audit_event()` chamáveis via RPC por
  usuários autenticados**: o Security Advisor aponta isso como alerta; é
  intencional em todos os três casos — `has_role`/`is_admin` só revelam o
  papel do próprio usuário (`profile_id = auth.uid()`), e `log_audit_event`
  checa `has_role(['administrador','rh'])` internamente antes de gravar
  qualquer linha, então não há exposição de dado de terceiros, escalonamento
  de privilégio, nem risco de um usuário comum forjar entradas de auditoria.
- **PWA/offline**: apenas o `manifest.webmanifest` foi criado; não há
  Service Worker/cache offline ainda — depende de definir os ícones e a
  estratégia de cache junto com os módulos de campo (Ponto/Operações), que
  são os que realmente precisam funcionar offline.
- **Escopo de visibilidade por hierarquia**: as políticas de RLS de
  `people`/tabelas satélite/`organizational_assignments` liberam leitura
  para `administrador`/`rh`/`auditor` de forma ampla. A visibilidade
  restrita por eixo/cidade/equipe de um coordenador (seção 5) segue
  pendente para uma fase futura, quando as telas de gestão territorial
  existirem para validar as regras.
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
  escrito manualmente para refletir as migrações `0001` e `0004`. Considere
  regenerar com `npx supabase gen types typescript --project-id
pjjarkxwwzqiajlvpsdx` quando o CLI/config local do Supabase for
  configurado neste repositório (ainda não existe `supabase/config.toml`).
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
- **Não verificado nesta sessão**: o fluxo manual completo na UI (login →
  `/pessoas` → criar pessoa com CPF de teste `111.444.777-35` → anexar
  documento → conferir linha em `audit_logs` → confirmar que RLS bloqueia
  um usuário sem papel `administrador`/`rh`/`auditor`). Ver roteiro em
  "Riscos e pendências desta fase".

## Próxima fase

Módulo **Pessoas** (Fase 1B) está funcional. Pendências que ficaram
deliberadamente fora do escopo mínimo, para retomar quando fizer sentido:

1. Verificação manual de ponta a ponta do fluxo de cadastro (ver acima).
2. Escopo de visibilidade por hierarquia (coordenador vê só sua
   cidade/eixo/equipe) nas políticas de RLS de `people` e satélites.
3. Atomicidade real entre `people` e as tabelas satélite (função Postgres
   consolidada), caso falhas parciais se mostrem um problema recorrente.
4. OCR de documentos, assinatura eletrônica de contrato e exportação
   PDF/Excel — dependem dos módulos que os utilizam.

Para o próximo módulo funcional, a navegação já criada na Fase 1A aponta
para **Aprovações** como sequência natural (fluxo de validação do cadastro
de pessoa por cidade/eixo, mencionado na seção 5 do briefing do projeto).
