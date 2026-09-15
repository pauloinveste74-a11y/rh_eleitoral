# RH Eleitoral — Importação de Dados, Contratos e Inteligência de RH

> Caderno técnico para implementação no Claude Code  
> Produto: RH Eleitoral  
> Empresa: Agilize Tecnologia Ltda. — Desenvolvimento de Sistemas  
> Versão: 1.0  
> Data de referência: setembro de 2026

## 1. Instrução inicial ao Claude Code

Implemente este escopo de forma incremental no projeto existente do RH Eleitoral.

Antes de editar:

1. Analise arquitetura, rotas, componentes, autenticação, migrations e políticas RLS atuais.
2. Verifique o caderno multi-tenant e o manual de identidade visual existentes.
3. Apresente um plano curto, dividido em etapas verificáveis.
4. Preserve funcionalidades atuais e dados já cadastrados.
5. Use migrations versionadas para alterações no Supabase.
6. Não execute migration ou deploy em produção sem autorização expressa.
7. Não inclua chaves, tokens, senhas ou dados pessoais reais no repositório.
8. Execute lint, typecheck, testes e build antes da conclusão.

## 2. Objetivo

Transformar os módulos de importação, contratos e pagamentos em uma **Central de Inteligência de RH**, capaz de receber dados de diferentes fontes, padronizar informações, detectar duplicidades e divergências, gerar contratos individuais ou em lote, acompanhar assinatura e retorno e conciliar contratação, cadastro e pagamento.

O sistema deverá orientar o responsável e prevenir erros, sem alterar automaticamente dados sensíveis quando houver conflito.

## 3. Alteração do menu

Substituir em toda a aplicação:

```text
Importar pessoal -> Importar dados
```

A alteração deve alcançar:

- menu lateral;
- título e descrição da página;
- breadcrumbs;
- rotas ou aliases;
- permissões;
- textos de ajuda;
- relatórios e auditoria;
- testes automatizados.

Manter redirecionamento temporário da rota antiga, se já estiver publicada, para não quebrar favoritos.

## 4. Central de Inteligência de RH

A Central reunirá quatro áreas:

1. **Importações** — recebimento e leitura dos arquivos;
2. **Validação e conciliação** — comparação com a base-mestra;
3. **Contratos** — modelos, geração, envio e retorno;
4. **Pendências** — conflitos, responsáveis, prazos e decisões.

Cada informação deverá manter sua origem, data, responsável e nível de confiança.

## 5. Menu “Importar dados”

### 5.1 Tipos de dados

O módulo deverá ser preparado para receber:

- pessoas e trabalhadores;
- coordenadores e equipes;
- cidades, regiões administrativas e eixos;
- cargos e funções;
- dados bancários e chaves PIX;
- pagamentos e comprovantes;
- despesas e documentos fiscais;
- extratos bancários;
- contratos e controles de retorno;
- outros layouts configurados pela organização.

### 5.2 Formatos

Fase inicial:

- XLSX;
- CSV;
- PDF com texto pesquisável;
- DOCX, quando necessário para contratos.

Evolução:

- PDF digitalizado com OCR;
- imagens de documentos;
- integrações por API;
- extratos OFX e CNAB, conforme necessidade financeira.

### 5.3 Fluxo de importação

1. Selecionar organização e campanha.
2. Escolher o tipo de dado ou solicitar detecção assistida.
3. Enviar o arquivo para área temporária privada.
4. Ler cabeçalhos, campos, páginas e possíveis registros.
5. Mapear campos da origem para o modelo interno.
6. Normalizar os valores.
7. Comparar com a base-mestra.
8. Classificar novos dados, confirmações, complementos e conflitos.
9. Mostrar uma prévia antes de gravar.
10. Permitir decisão individual ou em lote.
11. Processar somente os itens aprovados.
12. Gerar relatório e auditoria.

### 5.4 Normalização

Padronizar:

- CPF e CNPJ sem pontuação no banco;
- datas em formato interno consistente;
- telefones com DDI e DDD;
- e-mails em minúsculas;
- CEP e endereço;
- nomes, preservando a grafia documental;
- banco, agência, conta e dígito;
- chave PIX;
- título, zona e seção eleitoral;
- valores monetários em centavos ou tipo decimal adequado.

### 5.5 Classificação dos resultados

| Situação | Significado |
|---|---|
| Novo | Registro ainda inexistente |
| Compatível | Confirma informação cadastrada |
| Complementar | Preenche campo que estava vazio |
| Divergente | Conflita com informação atual |
| Duplicado | Repete registro ou arquivo |
| Inválido | Não atende ao formato ou à regra |
| Inconclusivo | Não existe confiança suficiente |
| Pendente de validação | Aguarda decisão autorizada |

### 5.6 Comparação de identidade

Utilizar CPF como principal identificador de pessoa quando disponível. Nome, nascimento, filiação, telefone, e-mail e endereço são sinais complementares.

Alertar quando houver:

- mesmo CPF com nomes diferentes;
- mesmo CPF com datas de nascimento divergentes;
- nomes semelhantes com CPFs diferentes;
- telefone ou e-mail compartilhado por vários cadastros;
- filiação divergente;
- título eleitoral inconsistente;
- documento já utilizado em outro registro do mesmo tenant.

Nenhuma divergência de CPF, nascimento, filiação ou documento deverá ser resolvida automaticamente.

### 5.7 Comparação financeira

Conferir:

- CPF/CNPJ do favorecido;
- titularidade informada;
- banco, agência e conta;
- chave PIX e CPF correspondente;
- valor contratado;
- valor previsto;
- valor efetivamente pago;
- data e período;
- identificador da transação;
- duplicidade de pagamento;
- contrato válido e liberado.

### 5.8 Tela de pré-validação

Apresentar abas:

- Resumo;
- Novos;
- Complementares;
- Divergentes;
- Duplicados;
- Inválidos;
- Processados.

Cada item exibirá:

- campo;
- valor atual;
- valor importado;
- arquivo e localização de origem;
- regra aplicada;
- nível de confiança;
- decisão sugerida;
- decisão humana;
- responsável.

### 5.9 Fila de pendências

Toda divergência deverá gerar pendência com:

- tipo;
- pessoa ou entidade relacionada;
- gravidade;
- responsável;
- prazo;
- evidência;
- decisão;
- justificativa;
- data de resolução.

## 6. Princípios da inteligência de dados

A IA poderá:

- sugerir o tipo do documento;
- extrair campos;
- sugerir mapeamento de colunas;
- identificar nomes semelhantes;
- resumir divergências;
- estimar confiança;
- sugerir a pessoa ou contrato relacionado.

A IA não poderá, sozinha:

- validar definitivamente identidade;
- substituir CPF ou dados bancários divergentes;
- liberar pagamento;
- declarar uma assinatura válida;
- excluir registros;
- mesclar cadastros sensíveis;
- alterar valores contratuais.

Decisões sensíveis deverão usar regras determinísticas e, quando necessário, validação humana.

## 7. Matriz de fontes confiáveis

| Informação | Fonte prioritária sugerida |
|---|---|
| Nome, CPF e nascimento | Documento de identificação validado |
| Filiação | Documento oficial ou informação eleitoral conferida |
| Endereço | Comprovante de residência |
| Título, zona e seção | Documento eleitoral |
| Banco, agência e conta | Comprovante bancário |
| PIX | Declaração e validação com CPF |
| Função, jornada e remuneração | Contrato aprovado |
| Valor pago | Extrato conciliado |
| Coordenador e equipe | Estrutura organizacional aprovada |

Quando fontes prioritárias divergirem, bloquear alteração automática e solicitar decisão.

## 8. Menu “Contratos”

Reorganizar o menu nos seguintes submódulos:

1. **Visão geral**;
2. **Modelos de contrato**;
3. **Gerar contratos**;
4. **Contratos enviados**;
5. **Contratos recebidos**;
6. **Pendências e cobranças**;
7. **Configurações**.

## 9. Modelos de contrato

Permitir cadastrar ou importar modelos de:

- contrato de trabalho;
- prestação de serviço por pessoa física;
- prestação de serviço por pessoa jurídica;
- coordenação;
- supervisão;
- outras modalidades configuráveis.

Cada modelo deve possuir:

- nome e descrição;
- tipo;
- tenant proprietário;
- versão;
- situação: rascunho, aprovado, inativo ou arquivado;
- vigência;
- arquivo original da versão;
- campos dinâmicos;
- funções elegíveis;
- responsável pela aprovação;
- trilha de auditoria.

### 9.1 Marcadores sugeridos

```text
{{pessoa.nome_completo}}
{{pessoa.cpf}}
{{pessoa.data_nascimento}}
{{pessoa.endereco_completo}}
{{pessoa.telefone}}
{{pessoa.email}}
{{pessoa.pix}}
{{pessoa.titulo_eleitoral}}
{{pessoa.zona_eleitoral}}
{{pessoa.secao_eleitoral}}
{{pessoa.banco}}
{{pessoa.agencia}}
{{pessoa.conta}}
{{contrato.funcao}}
{{contrato.valor}}
{{contrato.carga_horaria}}
{{contrato.data_inicio}}
{{contrato.data_fim}}
{{organizacao.razao_social}}
{{organizacao.cnpj}}
{{organizacao.representante_nome}}
{{organizacao.representante_cpf}}
```

O sistema deverá analisar o modelo e apontar quais dados estão ausentes antes da geração.

## 10. Geração individual e em lote

Permitir selecionar uma ou várias pessoas para o mesmo modelo e condições gerais.

Exemplo operacional:

- quantidade: 10 cabos eleitorais;
- valor individual: R$ 800,00;
- jornada: 4 horas diárias;
- início: 15/09/2026;
- término: 03/10/2026.

Antes da geração, mostrar:

| Pessoa | Cadastro | Documentos | Banco/PIX | Contrato |
|---|---|---|---|---|
| Pessoa A | Completo | Validado | Compatível | Pronto |
| Pessoa B | Incompleto | Validado | PIX divergente | Bloqueado |
| Pessoa C | Completo | Pendente | Compatível | Requer validação |

O gestor poderá gerar contratos apenas para os aptos ou justificar exceção, conforme sua permissão.

## 11. Lotes de contratação

Cada geração coletiva deverá criar um lote, por exemplo:

```text
Lote 2026-001 — 10 cabos eleitorais — 15/09/2026 a 03/10/2026
```

O lote deverá armazenar:

- modelo e versão;
- função;
- remuneração;
- carga horária;
- período;
- pessoas selecionadas;
- contratos gerados;
- enviados, entregues, devolvidos e validados;
- pendências;
- responsável.

Cada pessoa receberá contrato individual, nunca um arquivo compartilhado com dados de outros trabalhadores.

## 12. Snapshot contratual

Ao emitir um contrato, salvar uma fotografia imutável dos dados utilizados:

- dados da pessoa;
- dados da organização;
- condições contratuais;
- versão do modelo;
- arquivo gerado;
- hash do arquivo;
- responsável e data.

Alterações posteriores no cadastro não devem modificar contratos já emitidos. O sistema deverá indicar que existem dados cadastrais posteriores e permitir a geração de nova versão.

## 13. Complementação de dados

Quando faltarem campos, permitir:

- correção pelo administrador;
- atribuição ao coordenador;
- solicitação ao contratado pelo portal;
- manutenção como rascunho pendente.

O contratado preencherá apenas os campos liberados. A informação enviada passará por validação antes de substituir a base-mestra.

## 14. Aprovação e envio

Após a conferência, a ação **Salvar e disponibilizar** deverá:

1. salvar o contrato na ficha da pessoa;
2. disponibilizá-lo no portal autenticado;
3. enviar aviso individual por e-mail;
4. enviar aviso por WhatsApp oficial, quando integrado;
5. registrar destinatário, canal, data e resultado;
6. programar lembretes, se configurados.

Preferir o envio de link autenticado. Evitar documentos pessoais em links públicos ou anexos sem proteção.

O WhatsApp deverá utilizar provedor oficial e templates aprovados quando exigidos. Falha em um canal não poderá apagar ou invalidar o contrato gerado.

## 15. Retorno do contrato

Aceitar:

- upload pelo contratado autenticado;
- upload pelo administrador;
- upload por coordenador autorizado;
- importação de arquivo recebido externamente;
- e-mail de entrada, em fase posterior e com associação segura.

Registrar:

- quem enviou;
- em nome de quem;
- canal;
- data e hora;
- arquivo e hash;
- contrato relacionado;
- situação da conferência.

Não associar o arquivo somente pelo nome. Usar identificador seguro, usuário autenticado, código do contrato ou confirmação humana.

## 16. Situações do contrato

```text
draft
pending_data
pending_approval
ready_to_send
sent
delivered
delivery_failed
viewed
downloaded
returned_unsigned
returned_signed
pending_validation
validated
rejected
cancelled
expired
```

O sistema deve distinguir enviado, entregue, visualizado, devolvido, aparentemente assinado e validado. Nesta fase, não declarar validade de assinatura digital ainda não integrada.

## 17. Linha do tempo

Cada contrato terá histórico visual:

1. Rascunho criado;
2. Dados conferidos;
3. Contrato gerado;
4. Aprovado;
5. Enviado;
6. Entregue;
7. Visualizado ou baixado;
8. Devolvido;
9. Assinatura conferida;
10. Validado;
11. Liberado para pagamento.

## 18. Lembretes programados

Permitir configurar:

- prazo final;
- primeiro lembrete;
- periodicidade;
- quantidade máxima;
- canais;
- responsável escalonado;
- horário permitido;
- interrupção após retorno válido.

Exemplo:

- 24 horas: primeiro lembrete;
- 48 horas: segundo lembrete;
- 72 horas: alerta ao coordenador;
- próximo ao prazo: alerta ao RH;
- contrato validado: cancelar lembretes.

## 19. Painel de contratos

Exibir:

- total gerado;
- enviado;
- entregue;
- falha de entrega;
- devolvido sem assinatura;
- devolvido assinado;
- pendente de validação;
- validado;
- vencido;
- pessoa sem contrato;
- pessoa com dados insuficientes;
- divergências contratuais.

Filtros:

- organização;
- campanha;
- cidade ou RA;
- eixo;
- coordenador;
- função;
- modelo;
- período;
- situação;
- lote.

## 20. Conciliação entre cadastro, contrato e pagamento

Antes de liberar pagamento, conferir:

- identidade e CPF;
- contrato validado;
- função;
- remuneração;
- jornada;
- vigência;
- banco, conta e PIX;
- valor previsto e pago;
- duplicidade;
- desligamento ou bloqueio.

Alertas obrigatórios:

- pagamento sem contrato validado;
- contrato sem programação financeira;
- remuneração divergente;
- pagamento fora da vigência;
- sobreposição de contratos;
- dados bancários alterados após emissão;
- contrato devolvido sem assinatura;
- favorecido diferente do contratado;
- pagamento duplicado.

Um usuário autorizado poderá liberar exceção com justificativa, aprovação e auditoria.

## 21. Dossiê digital da pessoa

A ficha individual deverá reunir:

- dados cadastrais;
- coordenador e equipe;
- documentos;
- contratos e versões;
- eventos de envio e retorno;
- pagamentos e pendências;
- divergências;
- tarefas;
- histórico de alterações.

## 22. Índice de prontidão

Exibir percentual e situação:

- pronto para contratar;
- cadastro incompleto;
- documento pendente;
- dado divergente;
- aguardando contrato;
- aguardando assinatura;
- aguardando validação;
- pronto para pagamento;
- pagamento bloqueado.

O cálculo deverá ser baseado em regras visíveis e configuráveis, não em decisão inexplicável de IA.

## 23. Portal do contratado

O contratado deverá visualizar somente:

- completar cadastro;
- corrigir pendências solicitadas;
- enviar documentos;
- consultar e baixar seu contrato;
- enviar contrato assinado;
- acompanhar validação;
- consultar seus pagamentos;
- responder ao RH.

Não exibir menus administrativos ou informações de outros trabalhadores.

## 24. Caixa de entrada documental

Centralizar documentos recebidos por:

- portal;
- upload administrativo;
- importação;
- e-mail integrado;
- WhatsApp, futuramente.

O sistema poderá sugerir pessoa e contrato correspondentes. Se a identificação não for segura, exigir confirmação humana.

## 25. Comunicação rastreável

Registrar:

- destinatário;
- canal;
- template;
- data e hora;
- situação técnica;
- identificador do provedor;
- entregue, falhou ou rejeitado;
- tentativas;
- próximo lembrete.

## 26. Estrutura de banco sugerida

Adaptar ao schema existente e aplicar `tenant_id`, RLS, timestamps e auditoria.

```text
data_imports
data_import_files
data_import_rows
data_import_field_values
data_import_matches
data_import_decisions
data_conflicts
data_sources

contract_templates
contract_template_versions
contract_template_fields
contract_batches
contracts
contract_parties
contract_snapshots
contract_files
contract_events
contract_deliveries
contract_reminder_rules
contract_reminders
contract_validations

hr_tasks
readiness_rules
readiness_results
communication_events
```

Contratos emitidos, versões, eventos financeiros e auditorias não deverão ser fisicamente apagados.

## 27. Permissões sugeridas

```text
imports.view
imports.create
imports.map
imports.validate
imports.approve
imports.rollback

contracts.view
contracts.templates.view
contracts.templates.manage
contracts.generate
contracts.approve
contracts.send
contracts.receive
contracts.validate
contracts.cancel
contracts.reminders.manage

hr_intelligence.view
hr_intelligence.resolve_conflicts
hr_intelligence.override_block
payments.release
audit.view
```

Permissões de interface não substituem RLS e validação no servidor.

## 28. Segurança e privacidade

- Buckets privados e URLs assinadas de curta duração;
- arquivos separados por `tenant_id`;
- validação de extensão, MIME e tamanho;
- nomes internos aleatórios;
- CPF e banco mascarados;
- justificativa para acesso administrativo sensível;
- proteção contra acesso cruzado entre tenants;
- registro de download sensível;
- retenção e descarte conforme política definida;
- service role apenas no servidor;
- cookies e sessões seguros;
- observância da LGPD e revisão jurídica dos modelos e fluxos.

## 29. Etapas factíveis de implementação

### Fase 1 — Essencial

- Renomear menu para “Importar dados”;
- importar XLSX e CSV;
- comparar cadastros por CPF;
- mostrar prévia e conflitos;
- gerenciar modelos DOCX;
- gerar contratos individuais e em lote;
- criar snapshot;
- disponibilizar no portal;
- enviar aviso por e-mail;
- receber upload;
- acompanhar situações;
- conciliar contrato e pagamento por regras básicas.

### Fase 2 — Inteligência operacional

- leitura de PDF;
- extração assistida;
- score de confiança;
- comparação avançada;
- WhatsApp oficial;
- lembretes automáticos;
- caixa de entrada documental;
- conciliação bancária.

### Fase 3 — Automação avançada

- assinatura eletrônica integrada;
- OCR de documentos;
- validação assistida por IA;
- webhooks bancários e de comunicação;
- modelos com aprovação jurídica;
- detecção de fraude e anomalias.

## 30. Critérios de aceite

- [ ] O sistema exibe “Importar dados” em todas as áreas.
- [ ] A rota antiga redireciona, se já tiver sido publicada.
- [ ] Uma importação não grava dados antes da pré-validação.
- [ ] Cada campo importado mantém sua origem.
- [ ] O sistema classifica novo, compatível, complementar, divergente, duplicado e inválido.
- [ ] Dados sensíveis divergentes exigem validação humana.
- [ ] Não ocorre atualização entre tenants.
- [ ] Modelos possuem versões imutáveis.
- [ ] Um lote gera contrato individual para cada pessoa.
- [ ] O contrato mantém snapshot dos dados utilizados.
- [ ] Alterar o cadastro não altera o contrato emitido.
- [ ] O usuário visualiza apenas o próprio contrato.
- [ ] O sistema diferencia enviado, entregue, devolvido, assinado e validado.
- [ ] Lembretes param após retorno validado.
- [ ] Falha no WhatsApp não invalida o contrato.
- [ ] Pagamento incompatível gera alerta ou bloqueio.
- [ ] Exceções exigem justificativa e auditoria.
- [ ] RLS e Storage impedem acesso entre tenants.
- [ ] Lint, typecheck, testes e build são concluídos sem erros.

## 31. Testes obrigatórios

1. Importar arquivo com registros novos, duplicados, complementares e divergentes.
2. Tentar substituir CPF e banco por dado conflitante.
3. Tentar importar dados para outro tenant alterando o payload.
4. Gerar dez contratos no mesmo lote.
5. Confirmar que cada trabalhador recebe somente seu documento.
6. Modificar cadastro depois da emissão e conferir o snapshot.
7. Simular falha de e-mail e WhatsApp.
8. Devolver contrato sem assinatura.
9. Devolver arquivo diferente do contrato enviado.
10. Executar lembretes e confirmar interrupção.
11. Tentar liberar pagamento sem contrato validado.
12. Simular pagamento duplicado.
13. Testar acesso a arquivo de outro tenant.
14. Confirmar auditoria de decisão e exceção.

## 32. Entregáveis esperados do Claude Code

Ao concluir cada fase, apresentar:

- resumo funcional;
- arquivos alterados;
- migrations;
- políticas RLS;
- novas rotas e componentes;
- variáveis de ambiente necessárias com valores fictícios;
- testes executados;
- resultado do build;
- riscos e pendências;
- instruções de validação;
- plano de rollback.

## 33. Resultado esperado

O RH Eleitoral deverá receber dados de múltiplas fontes, comparar cada informação com a base-mestra, impedir alterações sensíveis indevidas, organizar contratos individuais e em lote, acompanhar entrega e retorno e conciliar contratação com pagamento. A inteligência do sistema deverá produzir explicações, alertas e prioridades, mantendo a decisão crítica sob controle de usuários autorizados.

