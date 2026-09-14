# RH Eleitoral

Sistema de gestão de pessoas, operações e pagamentos para campanha eleitoral.

> **Fase atual: 1A — Fundação.** Este repositório contém a base técnica do
> projeto (autenticação, navegação, modelo de dados inicial e RLS). Os
> módulos funcionais (Pessoas, Aprovações, Ponto, Financeiro, etc.) serão
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

> **Já existe um projeto de desenvolvimento configurado nesta máquina**
> (`rh_eleitoral`, projeto `qtzatmhioqtkxhuhiqkd`, região `us-west-2`), com
> as migrações `0001`–`0003` e o seed fictício já aplicados, e um
> `.env.local` já criado localmente (arquivo ignorado pelo Git — não é
> versionado). Se você está clonando este repositório em outra máquina ou
> quer um projeto próprio, siga os passos abaixo normalmente.

1. Crie um projeto gratuito em [supabase.com](https://supabase.com) (ou peça
   para quem administra a campanha criar e compartilhar o acesso).
2. No painel do projeto, vá em **Settings → API** e copie:
   - **Project URL**
   - **anon public key**
3. Copie `.env.example` para `.env.local` e preencha os dois valores:

   ```bash
   cp .env.example .env.local
   ```

4. Aplique a migração inicial do banco. Duas opções:

   **Opção A — SQL Editor do Supabase Studio (mais simples):**
   Abra `supabase/migrations/0001_initial_schema.sql`, copie o conteúdo e
   execute no SQL Editor do painel do Supabase.

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
      pessoas/          # placeholder — Fase 2
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

## Modelo de dados (Fase 1A)

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

Detalhes de colunas, checks e comentários estão em
`supabase/migrations/0001_initial_schema.sql`.

## Políticas de RLS criadas

Todas as 10 tabelas têm RLS habilitado. Resumo:

- **`campaigns`, `roles`, `axes`, `cities`, `teams`**: leitura liberada a
  qualquer usuário autenticado (dados de catálogo/organização, não
  sensíveis); escrita restrita ao papel `administrador`.
- **`people`**: leitura e escrita restritas a `administrador`/`rh`
  (leitura também para `auditor`). Sem política de `DELETE` — exclusão é
  sempre lógica via `status`.
- **`profiles`**: cada usuário vê/edita apenas o próprio registro;
  `administrador` vê/edita todos.
- **`profile_roles`**: cada usuário vê os próprios papéis;
  `administrador`/`rh` administram todos.
- **`organizational_assignments`**: leitura para
  `administrador`/`rh`/`auditor`; escrita para `administrador`/`rh`. Sem
  `DELETE`.
- **`audit_logs`**: leitura restrita a `administrador`/`auditor`; sem
  `INSERT`/`UPDATE`/`DELETE` para usuários comuns (ver decisão
  arquitetural acima).

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

- **Projeto Supabase compartilhado**: o projeto `rh_eleitoral` usado nesta
  fase já continha uma tabela `instagram_leads` de outra finalidade,
  criada anteriormente na mesma organização/conta. Nenhuma tabela desse
  projeto foi alterada além das criadas por este repositório, mas
  recomenda-se migrar para um projeto Supabase dedicado exclusivamente à
  campanha assim que possível (a organização atingiu o limite de 2
  projetos gratuitos simultâneos ao tentar criar um projeto novo e
  dedicado).
- **`has_role()`/`is_admin()` chamáveis via RPC por usuários autenticados**:
  o Security Advisor aponta isso como alerta; é intencional — essas
  funções só revelam o papel do próprio usuário (`profile_id = auth.uid()`),
  então não há exposição de dado de terceiros nem escalonamento de
  privilégio. Mantido assim para permitir checagens otimistas de UI no
  cliente.
- **PWA/offline**: apenas o `manifest.webmanifest` foi criado; não há
  Service Worker/cache offline ainda — depende de definir os ícones e a
  estratégia de cache junto com os módulos de campo (Ponto/Operações), que
  são os que realmente precisam funcionar offline.
- **Escopo de visibilidade por hierarquia**: as políticas de RLS de
  `people`/`organizational_assignments` nesta fase liberam leitura para
  `administrador`/`rh`/`auditor` de forma ampla. A visibilidade restrita
  por eixo/cidade/equipe de um coordenador (seção 5) será implementada
  junto com o módulo de Pessoas (Fase 2), quando o formulário de cadastro
  e as telas de gestão territorial existirem para validar as regras.
- **OCR, assinatura eletrônica e geração de PDF/Excel**: interfaces
  desacopladas ainda não criadas — entram quando os módulos que os usam
  (Documentos, Contratos, Relatórios) forem implementados.
- **Tipos do Supabase escritos à mão**: `src/types/database.ts` foi
  escrito manualmente para refletir a migração 0001. Assim que o projeto
  Supabase existir, regenere com `npx supabase gen types typescript`.
- **Ícones do manifesto PWA**: `manifest.webmanifest` está sem ícones
  (nenhuma arte foi fornecida). Adicionar quando houver identidade visual
  definida para a campanha.

## Testes realizados

- `npm run typecheck` — sem erros.
- `npm run lint` — sem erros.
- `npm run build` — build de produção concluído com sucesso (rotas do
  painel corretamente marcadas como dinâmicas `ƒ`, `/login` estática `○`).
- `npm run format:check` — sem pendências após `npm run format`.
- Migrações `0001`–`0003` aplicadas com sucesso em um projeto Supabase real
  (`list_tables` confirmou as 10 tabelas com `rls_enabled: true`).
- Supabase Security Advisor: todos os alertas de nível `WARN` corrigidos
  (search_path mutável, EXECUTE de função `SECURITY DEFINER` liberado por
  padrão para `anon`), exceto dois aceitos deliberadamente — ver
  "Riscos e pendências".
- Supabase Performance Advisor: alertas de `multiple_permissive_policies` e
  `auth_rls_initplan` corrigidos; índices de chave estrangeira ausentes
  adicionados.
- Teste end-to-end do proxy de autenticação contra o projeto Supabase real:
  `/` responde `307` redirecionando para `/login?redirectTo=%2F` (sem
  sessão) e `/login` responde `200` com o formulário renderizado.
- Teste do proxy com variáveis de ambiente inválidas (fase anterior à
  criação do projeto): mesmo comportamento de redirecionamento, confirmando
  que falhas de configuração/rede degradam para "não autenticado" em vez de
  erro 500 (ver `src/lib/supabase/proxy.ts`).

## Próxima fase

Sugestão: **Fase 1B — Cadastro de Pessoa (mínimo viável)**:

1. Formulário de cadastro de pessoa (RHF + Zod) com validação de CPF
   (formato e dígitos verificadores).
2. Tabelas satélite: `person_addresses`, `person_bank_accounts`,
   `person_electoral_data`.
3. Upload de documentos em bucket privado do Supabase Storage com URLs
   assinadas (sem interface de OCR ainda — apenas o campo para anexar).
4. Listagem de pessoas com busca e paginação, respeitando o RLS existente.
5. Primeira gravação real em `audit_logs` (função `SECURITY DEFINER` de
   log de auditoria) disparada pela criação/edição de uma pessoa.

Isso mantém o projeto executável ao final da fase e entrega o primeiro
módulo funcional real do sistema.
