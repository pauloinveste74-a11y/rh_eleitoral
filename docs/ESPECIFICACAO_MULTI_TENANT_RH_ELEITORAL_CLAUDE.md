# RH Eleitoral — Especificação para implementação multi-tenant

> Documento de implementação para uso no Claude Code  
> Produto: RH Eleitoral  
> Empresa: Agilize Tecnologia Ltda. — Desenvolvimento de Sistemas  
> Versão: 1.0  
> Prioridade: fundação de autenticação, organizações, isolamento e administração

## 1. Instrução principal ao Claude Code

Implemente a fundação multi-tenant do RH Eleitoral conforme este documento, respeitando a arquitetura existente do repositório. Antes de alterar arquivos:

1. Analise a estrutura, dependências, autenticação, migrations e componentes atuais.
2. Leia `README.md`, `package.json`, arquivos de configuração, migrations e eventuais documentos de contexto.
3. Não remova funcionalidades existentes sem justificar.
4. Preserve o padrão visual definido no Manual de Identidade Visual do RH Eleitoral.
5. Apresente um plano curto de execução e implemente por etapas verificáveis.
6. Crie migrations versionadas; não altere manualmente o banco de produção.
7. Rode lint, verificação de tipos, testes e build ao terminar cada etapa relevante.
8. Não faça deploy nem execute migrations em produção sem confirmação expressa.
9. Não inclua chaves, senhas, tokens ou dados pessoais reais no repositório.

## 2. Objetivo

Transformar o RH Eleitoral em uma plataforma SaaS multi-tenant, permitindo que várias empresas, campanhas ou organizações utilizem o mesmo aplicativo, mantendo usuários, pessoas, documentos, contratos, pagamentos, despesas, configurações e auditorias isolados.

O usuário master da plataforma poderá cadastrar várias organizações. Cada organização terá pelo menos um administrador próprio e um ambiente administrativo independente.

## 3. Vocabulário oficial

| Termo | Significado |
|---|---|
| Plataforma | Aplicação RH Eleitoral como um todo |
| Tenant/organização | Ambiente isolado de uma empresa, campanha ou cliente |
| Entidade legal | Empresa, comitê, partido ou prestador identificado por CPF/CNPJ |
| Campanha | Operação eleitoral pertencente a uma organização |
| Master | Administrador global da plataforma |
| Administrador | Gestor de uma organização específica |
| Membro | Usuário com vínculo e permissões dentro de uma organização |
| Organização ativa | Tenant selecionado na sessão atual |

No código, usar preferencialmente `tenant` e `tenant_id`. Na interface, exibir “Organização”, “Empresa” ou “Campanha”, conforme o contexto.

## 4. Premissas de segurança

- O e-mail inicial informado para o master é `pauloinvest74@gmail.com`.
- Confirmar esse endereço antes da criação em produção.
- Não hardcodar o e-mail master no front-end, middleware ou políticas RLS.
- Criar o primeiro master por migration segura, script administrativo ou variável de implantação executada uma única vez.
- Uma pessoa autenticada não ganha acesso global apenas por possuir esse e-mail.
- A autorização deve usar registro persistido de função global.
- O navegador nunca será fonte confiável para `tenant_id`, perfil ou permissão.
- Ocultar botões não substitui autorização no servidor e no banco.
- Toda tabela de negócio deverá ter isolamento por tenant e RLS habilitada.
- Documentos privados deverão usar buckets privados e URLs assinadas temporárias.
- CPF, dados bancários e documentos deverão ser mascarados conforme permissão.

## 5. Modelo funcional

### 5.1 Usuário master da plataforma

Perfil técnico: `platform_master`.

Pode:

- cadastrar, editar, ativar, suspender e arquivar organizações;
- cadastrar ou convidar o primeiro administrador;
- acessar o painel de qualquer organização em modo de suporte;
- gerenciar administradores;
- visualizar métricas gerais e integridade de configuração;
- consultar auditoria global;
- definir limites e módulos habilitados;
- retornar ao painel master sem encerrar a sessão.

Todo acesso do master a uma organização deve gerar auditoria. Alterações sensíveis devem exigir justificativa.

### 5.2 Administrador da organização

Pode somente dentro de seus tenants autorizados:

- cadastrar usuários e trabalhadores;
- importar planilhas e documentos;
- configurar cargos, funções, cidades, regiões e eixos;
- gerenciar contratos, pagamentos e despesas;
- conferir documentos e pendências;
- atribuir perfis e permissões permitidas;
- emitir relatórios;
- consultar auditorias dentro de seu escopo.

### 5.3 Usuário com múltiplos vínculos

Um usuário pode pertencer a vários tenants e ter papel diferente em cada um. O vínculo, e não o perfil global, define suas permissões dentro do tenant.

## 6. Jornada do master

### 6.1 Primeiro acesso

1. Master realiza login.
2. O sistema valida a função global `platform_master` no servidor.
3. O sistema abre `/master/organizacoes`.
4. Se não houver organização, exibe chamada para “Cadastrar primeira organização”.
5. Após o cadastro, o master convida o primeiro administrador.
6. A organização aparece na listagem do master.
7. O master pode acessar seu dashboard em modo administrativo.

### 6.2 Painel “Organizações”

Exibir cards ou tabela com:

- nome e nome fantasia;
- CPF/CNPJ mascarado;
- tipo da organização;
- administrador principal;
- situação;
- quantidade de usuários e trabalhadores;
- percentual de configuração;
- última atividade;
- alertas;
- ações: acessar, editar, suspender, reativar e arquivar.

Disponibilizar busca por nome, CPF/CNPJ e administrador; filtros por tipo e situação; paginação; cadastro de nova organização.

### 6.3 Acesso em modo de suporte

Ao entrar em uma organização, mostrar faixa persistente:

> Você está administrando: {nome} — {CPF/CNPJ mascarado}

Disponibilizar “Voltar ao painel master”. Registrar entrada, saída, justificativa e alterações realizadas.

## 7. Cadastro da organização

Criar formulário em etapas com salvamento de rascunho.

### 7.1 Identificação

- nome da organização;
- razão social ou nome da campanha;
- nome fantasia;
- tipo: campanha eleitoral, empresa, partido, instituto, prestador de serviço ou outro;
- CPF ou CNPJ;
- ano eleitoral, se aplicável;
- número do candidato, se aplicável;
- situação inicial.

### 7.2 Contato e sede

- e-mail principal;
- telefone e WhatsApp;
- CEP, logradouro, número, complemento, bairro, cidade e UF;
- indicação de que não há sede física, quando aplicável.

### 7.3 Representante

- nome completo;
- CPF;
- cargo ou qualidade de representação;
- e-mail e telefone;
- documento comprobatório opcional, conforme regra da organização.

### 7.4 Configurações

- nome de exibição;
- logotipo;
- fuso horário, padrão `America/Sao_Paulo`;
- moeda, padrão `BRL`;
- idioma, padrão `pt-BR`;
- módulos habilitados;
- limites de usuários e armazenamento, se aplicável.

Validar CPF/CNPJ, e-mail, telefone e CEP. O CPF/CNPJ normalizado deve ficar sem pontuação no banco e formatado apenas na interface.

## 8. Convite do primeiro administrador

Campos:

- nome completo;
- CPF;
- e-mail;
- telefone;
- cargo;
- tenant;
- papel inicial;
- exigência de MFA.

Fluxo:

1. Master envia convite.
2. Sistema cria convite de uso único com expiração.
3. Destinatário confirma o e-mail.
4. Define senha conforme Supabase Auth.
5. Aceita termos e política de privacidade.
6. Configura MFA, se obrigatório.
7. Vínculo fica ativo.

O master não cria, visualiza ou transmite a senha do administrador.

## 9. Login e seleção da organização

### 9.1 Fluxo recomendado

1. Solicitar e-mail e senha.
2. Autenticar com Supabase Auth.
3. Consultar vínculos ativos no servidor.
4. Se houver zero vínculos e o usuário não for master, bloquear e orientar contato com administrador.
5. Se houver um vínculo, selecionar automaticamente.
6. Se houver vários, abrir seletor de organização.
7. Registrar a seleção e redirecionar ao dashboard.

### 9.2 CNPJ no login

O CNPJ não deve ser obrigatório para todos os usuários. Oferecer campo opcional “CNPJ ou código da organização” como atalho. Trabalhadores podem não conhecer o CNPJ.

Não usar CNPJ como chave primária. Cada tenant deve possuir:

- `id` UUID imutável;
- `document_number` normalizado;
- `access_code` curto e único;
- `slug` amigável e único.

### 9.3 Organização ativa

Armazenar a seleção em cookie seguro, `httpOnly`, `secure` em produção e `sameSite=lax`, ou em sessão validada no servidor. Nunca aceitar o tenant ativo somente por parâmetro fornecido pelo cliente.

## 10. Estrutura de banco sugerida

Adaptar nomes ao projeto existente, evitando tabelas duplicadas.

### 10.1 Tabelas fundamentais

```text
profiles
  id uuid PK -> auth.users.id
  full_name text
  cpf_encrypted/text protegido
  phone text
  global_role text nullable
  status text
  created_at timestamptz
  updated_at timestamptz

tenants
  id uuid PK
  name text
  legal_name text
  trade_name text
  organization_type text
  document_type text
  document_number text
  access_code text unique
  slug text unique
  status text
  created_by uuid
  created_at timestamptz
  updated_at timestamptz
  archived_at timestamptz nullable

tenant_legal_entities
  id uuid PK
  tenant_id uuid FK
  legal_name text
  trade_name text
  document_type text
  document_number text
  is_primary boolean
  contact fields...
  address fields...
  representative fields...

campaigns
  id uuid PK
  tenant_id uuid FK
  legal_entity_id uuid nullable
  name text
  election_year integer nullable
  candidate_number text nullable
  status text

tenant_memberships
  id uuid PK
  tenant_id uuid FK
  user_id uuid FK
  role_id uuid FK
  status text
  invited_by uuid nullable
  joined_at timestamptz nullable
  unique (tenant_id, user_id)

roles
  id uuid PK
  tenant_id uuid nullable
  code text
  name text
  is_system boolean
  unique (tenant_id, code)

permissions
  id uuid PK
  code text unique
  description text

role_permissions
  role_id uuid FK
  permission_id uuid FK
  primary key (role_id, permission_id)

tenant_settings
  tenant_id uuid PK/FK
  timezone text
  currency text
  locale text
  enabled_modules jsonb
  limits jsonb
  onboarding_state jsonb

invitations
  id uuid PK
  tenant_id uuid FK
  email text
  role_id uuid FK
  token_hash text
  status text
  expires_at timestamptz
  invited_by uuid

audit_logs
  id uuid PK
  tenant_id uuid nullable
  actor_user_id uuid nullable
  actor_global_role text nullable
  action text
  entity_type text
  entity_id uuid/text nullable
  before_data jsonb nullable
  after_data jsonb nullable
  justification text nullable
  ip_address inet nullable
  user_agent text nullable
  created_at timestamptz
```

### 10.2 Restrições

- Criar índices para `tenant_id`, `user_id`, status e datas usadas em filtros.
- Definir unicidade de CPF/CNPJ de acordo com a regra comercial. Não assumir que uma mesma entidade nunca poderá estar relacionada a mais de um tenant.
- Usar soft delete/arquivamento para entidades com histórico.
- Tabelas financeiras, contratos e auditoria não devem possuir exclusão física por usuários comuns.
- Todas as tabelas atuais de pessoas, documentos, contratos, despesas, pagamentos e importações devem receber `tenant_id NOT NULL`, após migração segura dos registros existentes.

## 11. RLS e autorização

Criar funções SQL estáveis e testáveis, por exemplo:

```sql
is_platform_master()
is_tenant_member(target_tenant_id uuid)
has_tenant_permission(target_tenant_id uuid, permission_code text)
```

Princípios:

- habilitar RLS em todas as tabelas expostas;
- negar por padrão;
- permitir `select`, `insert`, `update` e `delete` separadamente;
- validar `tenant_id` no `WITH CHECK` e no `USING`;
- impedir que um usuário troque o `tenant_id` de um registro;
- não usar `user_metadata` editável como fonte de autorização;
- usar funções `security definer` somente quando necessário, com `search_path` fixado;
- nunca expor `service_role` ao navegador;
- ações privilegiadas devem ocorrer em Server Actions, Route Handlers ou Edge Functions seguras.

Exemplo conceitual, a ser adaptado e revisado:

```sql
create policy "members read own tenant"
on public.example_table
for select
using (public.is_tenant_member(tenant_id));

create policy "authorized members insert"
on public.example_table
for insert
with check (
  public.has_tenant_permission(tenant_id, 'example.create')
);
```

Criar testes que tentem explicitamente acessar e modificar registros de outro tenant.

## 12. Storage de documentos

Buckets privados sugeridos:

- `tenant-documents`;
- `tenant-logos`;
- `contracts`;
- `payment-receipts`.

Estrutura de caminho:

```text
{tenant_id}/{module}/{entity_id}/{uuid}-{sanitized_filename}
```

Regras:

- validar tipo MIME, extensão e tamanho no servidor;
- usar nome aleatório, nunca confiar no nome original;
- armazenar metadados no banco;
- liberar leitura somente por URL assinada curta;
- registrar upload, download sensível, substituição e arquivamento;
- impedir referência a caminhos pertencentes a outro tenant;
- preparar antivírus/análise de arquivos como evolução futura.

## 13. Estados da organização

| Código | Comportamento |
|---|---|
| `draft` | Cadastro incompleto, acesso restrito ao master |
| `pending_configuration` | Administrador pode concluir implantação |
| `active` | Operação normal |
| `suspended` | Acesso operacional bloqueado, preservando dados |
| `archived` | Somente consulta autorizada e retenção histórica |

Evitar exclusão definitiva pela interface comum.

## 14. Assistente de implantação da organização

Após o primeiro login do administrador, exibir checklist:

1. confirmar dados da organização;
2. cadastrar ou revisar cargos e funções;
3. cadastrar cidades e regiões administrativas;
4. configurar eixos;
5. cadastrar coordenadores;
6. configurar centros de custo;
7. inserir modelos de contrato;
8. configurar categorias de despesas;
9. convidar usuários;
10. importar trabalhadores.

Mostrar percentual de conclusão, itens pendentes e ação seguinte recomendada.

## 15. Importação multi-tenant

Antes de processar planilha, PDF ou documento, exigir confirmação de:

- organização de destino;
- campanha, quando aplicável;
- tipo de importação;
- estratégia de duplicidade;
- responsável.

Criar etapa de pré-visualização com:

- válidos;
- incompletos;
- CPF inválido;
- duplicidades prováveis;
- conflitos;
- novos registros;
- registros que poderão ser atualizados.

Importações devem ser idempotentes quando possível. Nenhum CPF coincidente autoriza atualização em outro tenant.

## 16. Auditoria

Registrar, no mínimo:

- criação, edição, arquivamento e restauração;
- login, logout, falhas relevantes e troca de tenant;
- convites e alterações de permissões;
- acesso do master em modo de suporte;
- uploads, substituições e downloads sensíveis;
- importações;
- alterações financeiras e contratuais.

O log deve guardar ator, tenant, data/hora, ação, entidade, antes/depois, IP, dispositivo e justificativa quando exigida. O usuário comum não poderá editar ou apagar logs.

## 17. Interface e rotas sugeridas

```text
/login
/selecionar-organizacao
/master/organizacoes
/master/organizacoes/nova
/master/organizacoes/[tenantId]
/app/[tenantSlug]/dashboard
/app/[tenantSlug]/configuracoes
/app/[tenantSlug]/usuarios
/app/[tenantSlug]/importacoes
```

O slug da URL melhora usabilidade, mas a autorização deve resolver o UUID do tenant no servidor.

Componentes:

- `TenantSwitcher`;
- `ActiveTenantBanner`;
- `OrganizationCard`;
- `OrganizationForm`;
- `AdminInvitationForm`;
- `TenantOnboardingChecklist`;
- `PermissionGuard` para experiência visual, sem substituir validação de servidor;
- `SupportModeBanner`.

## 18. Permissões iniciais

Criar catálogo granular, por exemplo:

```text
tenant.view
tenant.update
users.view
users.invite
users.update
roles.manage
people.view
people.create
people.update
people.approve
documents.view
documents.validate
imports.create
imports.approve
contracts.view
contracts.manage
payments.view
payments.manage
expenses.view
expenses.manage
reports.export
audit.view
```

Não condicionar regras apenas a nomes como `admin`. Verificar permissões específicas.

## 19. Requisitos de UX e identidade

- Usar a identidade visual oficial da Agilize Tecnologia/RH Eleitoral.
- Manter aparência profissional, sofisticada e confiável.
- Navegação master visualmente distinta da navegação de um tenant.
- Sempre exibir a organização ativa no cabeçalho.
- Mascarar CPF/CNPJ e dados sensíveis por padrão.
- Usar confirmação reforçada para suspensão, arquivamento e alteração de permissões.
- Formulários devem informar pendências sem impedir salvamento como rascunho.
- Garantir acessibilidade WCAG 2.1 AA e uso por teclado.
- Projetar responsivamente, priorizando desktop administrativo sem inviabilizar celular.

## 20. Requisitos não funcionais

- TypeScript estrito, sem `any` implícito.
- Validação compartilhada com Zod ou solução já adotada.
- Operações financeiras com tipos adequados; não usar ponto flutuante para dinheiro.
- Datas armazenadas com fuso/UTC e apresentadas em `America/Sao_Paulo`.
- Paginação server-side nas listagens.
- Tratamento padronizado de erros sem revelar detalhes internos.
- Observabilidade para falhas de autenticação, autorização e importação.
- Consultas devem evitar vazamento por contagem, busca, autocomplete ou mensagens de erro.

## 21. Migração dos dados existentes

Antes de tornar `tenant_id` obrigatório:

1. Criar tenant inicial de migração.
2. Associar registros atuais a esse tenant mediante confirmação.
3. Verificar registros órfãos.
4. Adicionar chaves estrangeiras e índices.
5. Ativar RLS e testar.
6. Somente depois aplicar `NOT NULL` onde couber.

Gerar relatório de migração com quantidade por tabela. Não descartar registros automaticamente.

## 22. Etapas de implementação

### Etapa 1 — Diagnóstico

- Mapear autenticação, schema e rotas existentes.
- Identificar tabelas que precisam de `tenant_id`.
- Documentar incompatibilidades e riscos.

### Etapa 2 — Fundação de dados

- Criar migrations das tabelas fundamentais.
- Criar papéis e permissões iniciais.
- Preparar migração dos dados existentes.

### Etapa 3 — Segurança

- Implementar funções de autorização e RLS.
- Implementar isolamento de Storage.
- Criar testes negativos entre tenants.

### Etapa 4 — Master

- Criar painel, cadastro da organização e convite do administrador.
- Implementar modo de suporte auditado.

### Etapa 5 — Login multi-tenant

- Implementar resolução dos vínculos, seletor e tenant ativo seguro.
- Implementar troca de organização.

### Etapa 6 — Integração dos módulos

- Aplicar tenant em pessoas, documentos, contratos, pagamentos, despesas, relatórios e importações.

### Etapa 7 — Qualidade

- Testes unitários, integração, RLS e E2E.
- Lint, typecheck e build.
- Documentar variáveis de ambiente e operação.

## 23. Critérios de aceite

- [ ] Master consegue criar duas organizações distintas.
- [ ] Master consegue convidar um administrador para cada organização.
- [ ] Administrador A não consegue consultar, contar, alterar ou baixar dados da organização B.
- [ ] Usuário com um tenant entra diretamente no ambiente correto.
- [ ] Usuário com vários tenants visualiza o seletor.
- [ ] Campo de CNPJ/código funciona como atalho, sem ser obrigatório.
- [ ] Organização ativa aparece claramente em todas as telas internas.
- [ ] Troca de tenant invalida dados em cache do tenant anterior.
- [ ] Toda tabela de negócio relevante possui `tenant_id` e RLS.
- [ ] Storage impede acesso cruzado.
- [ ] Ações do master no tenant aparecem na auditoria.
- [ ] Organização suspensa não permite operação normal.
- [ ] Organização arquivada preserva histórico.
- [ ] Convites expiram e não podem ser reutilizados.
- [ ] Nenhuma chave privilegiada aparece no bundle do navegador.
- [ ] `npm run lint`, typecheck, testes e `npm run build` finalizam sem erros.

## 24. Testes mínimos obrigatórios

1. Criar Tenant A e Tenant B.
2. Criar usuários exclusivos e um usuário com vínculo em ambos.
3. Tentar `select`, `insert`, `update` e `delete` cruzados via cliente Supabase.
4. Tentar acessar documento do outro tenant por caminho conhecido.
5. Tentar alterar `tenant_id` de um registro existente.
6. Tentar forjar tenant em URL, cookie e payload.
7. Verificar cache após troca de organização.
8. Suspender membro e confirmar bloqueio imediato.
9. Expirar convite e confirmar rejeição.
10. Confirmar auditoria das ações privilegiadas.

## 25. Entregáveis esperados do Claude Code

Ao concluir, apresentar:

- resumo do que foi implementado;
- arquivos criados e alterados;
- migrations e instruções para aplicá-las;
- políticas RLS adicionadas;
- variáveis de ambiente necessárias, apenas com nomes e exemplos fictícios;
- testes executados e resultados;
- riscos, pendências e decisões que dependem do responsável;
- instruções para validar localmente;
- plano de rollback das migrations relevantes.

## 26. Decisões que não devem ser tomadas silenciosamente

Parar e solicitar confirmação se for necessário:

- apagar ou sobrescrever dados existentes;
- executar migrations em produção;
- alterar o provedor ou fluxo principal de autenticação;
- criar um projeto Supabase separado por tenant;
- mudar o domínio ou configuração Vercel;
- armazenar documentos pessoais fora de bucket privado;
- flexibilizar RLS para resolver erro de acesso;
- conceder `service_role` ao cliente;
- cadastrar o e-mail master sem confirmação do endereço informado.

## 27. Resultado esperado

Ao final desta fase, o RH Eleitoral deverá possuir uma base multi-tenant segura: o master cadastra várias organizações, cada organização tem administrador e configurações próprias, usuários entram no tenant correto, todos os módulos respeitam o isolamento e as operações relevantes ficam auditadas.

