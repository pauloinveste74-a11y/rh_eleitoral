# Implementação do Cadastro de Pessoas Importação em Lote e Despesas

## 1. Objetivo desta fase

Implementar no sistema RH Eleitoral:

1. autocadastro completo pelo próprio contratado;
2. validação obrigatória do cadastro por um gestor;
3. identificação da cadeia de coordenação;
4. cadastro individual por usuário administrativo;
5. importação de várias pessoas por Excel;
6. upload privado de documentos pessoais;
7. inclusão do responsável pela autorização nas despesas;
8. auditoria de todas as ações relevantes.

Não implementar nesta fase:

- ponto;
- check-in e check-out;
- banco de horas;
- escalas;
- geolocalização;
- operações e relatórios de campo.

As funcionalidades excluídas podem permanecer previstas na arquitetura, mas não devem aparecer como módulos ativos na interface desta fase.

## 2. Princípios obrigatórios

- O próprio contratado preenche o máximo possível de seus dados.
- O cadastro informado pelo contratado não é considerado validado automaticamente.
- Todo cadastro precisa ser conferido e aprovado pelo gestor responsável.
- O aplicativo é a fonte única dos dados.
- CPF não será chave primária; usar UUID.
- Um CPF só pode possuir um cadastro ativo por campanha.
- Dados não devem ser duplicados em tabelas de eixo, cidade ou equipe.
- Vínculos organizacionais devem referenciar o cadastro principal da pessoa.
- Alterações relevantes precisam manter histórico.
- Exclusões normais devem ser lógicas.
- Dados reais, documentos e planilhas nunca devem ser enviados ao GitHub.
- Todas as tabelas operacionais devem possuir RLS.

## 3. Tipos de entrada de cadastro

O sistema terá três formas de inclusão:

### 3.1 Autocadastro do contratado

O contratado acessa um link, preenche seus dados e anexa documentos.

### 3.2 Cadastro administrativo individual

RH ou usuário autorizado preenche o cadastro de uma pessoa pela interface administrativa.

### 3.3 Importação administrativa por Excel

RH ou usuário autorizado envia uma planilha contendo várias pessoas.

Independentemente da origem, o cadastro deve passar por validação humana antes de receber o status validado.

Registrar em todos os casos:

- origem do cadastro;
- usuário responsável pela inclusão;
- data e hora;
- lote de importação, quando aplicável;
- gestor responsável pela validação;
- resultado da validação.

## 4. Convite e acesso do contratado

### 4.1 Link de cadastro

O sistema deve permitir que RH ou gestor autorizado:

1. crie um convite;
2. informe nome, telefone ou e-mail do contratado, quando já conhecidos;
3. defina prazo de validade;
4. associe o convite à campanha;
5. associe coordenador, cidade, equipe ou eixo, quando conhecidos;
6. copie o link para envio por WhatsApp ou e-mail.

O convite deve possuir:

- token aleatório e não previsível;
- uso limitado;
- validade;
- status;
- campanha;
- pessoa que criou;
- data de criação;
- data de abertura;
- data de envio do cadastro;
- data de expiração.

Não colocar CPF, e-mail ou telefone na URL.

### 4.2 Estados do convite

- criado;
- enviado;
- acessado;
- em preenchimento;
- concluído;
- expirado;
- cancelado.

### 4.3 Acesso após envio

Depois que o contratado enviar o cadastro:

- bloquear os campos;
- permitir apenas consulta do andamento;
- reabrir somente campos devolvidos pelo gestor;
- registrar cada reabertura e alteração;
- impedir alteração direta de cadastro já validado.

## 5. Dados do contratado

Organizar o formulário em etapas.

### 5.1 Identificação

- nome completo;
- nome social, quando aplicável;
- CPF;
- data de nascimento;
- RG ou CNH;
- órgão expedidor;
- UF de expedição;
- data de expedição;
- nome da mãe;
- nome do pai;
- nacionalidade;
- naturalidade;
- país de nascimento.

### 5.2 Contato

- telefone principal;
- WhatsApp;
- telefone alternativo;
- e-mail.

### 5.3 Endereço

- CEP;
- tipo de logradouro;
- logradouro;
- número;
- complemento;
- bairro;
- cidade ou RA;
- estado;
- ponto de referência.

### 5.4 Dados eleitorais

- número do título;
- zona;
- seção;
- local de votação;
- município eleitoral;
- UF eleitoral.

### 5.5 Dados bancários

- banco;
- código do banco;
- agência;
- conta;
- dígito;
- tipo de conta;
- chave PIX;
- tipo da chave PIX;
- titular;
- CPF do titular.

Regra preferencial: a chave PIX para pagamento deve ser o CPF do próprio contratado.

Quando a chave PIX não for CPF ou o titular for diferente, criar divergência obrigatória para análise.

### 5.6 Informações organizacionais

O contratado deverá informar ou confirmar:

- campanha;
- eixo;
- cidade ou RA;
- equipe ou grupo;
- função pretendida;
- nome do coordenador responsável;
- telefone do coordenador;
- pessoa que realizou a indicação, quando aplicável.

O coordenador deve ser selecionado entre pessoas previamente cadastradas.

Quando o coordenador não aparecer na lista, disponibilizar:

`Meu coordenador não está na lista`

Nesse caso, solicitar:

- nome informado do coordenador;
- telefone informado;
- cidade ou RA;
- observação.

Criar a pendência `coordenador_nao_identificado`.

## 6. Cadeia de coordenação

Adotar a cadeia:

```text
Coordenador de eixo
        ↓
Coordenador de cidade ou RA
        ↓
Coordenador de equipe ou grupo
        ↓
Contratado
```

A estrutura deve permitir ausência de níveis intermediários quando a campanha não utilizar todos eles.

### 6.1 Regras

- Contratado informa quem é seu coordenador direto.
- Coordenador de equipe informa seu coordenador de cidade.
- Coordenador de cidade informa seu coordenador de eixo.
- Coordenador de eixo é validado por RH ou administrador.
- Nome e telefone devem vir do cadastro principal sempre que o coordenador já existir.
- Não armazenar apenas nomes livres como vínculo definitivo.
- Utilizar IDs internos para os relacionamentos.
- Manter vigência de cada vínculo.
- Preservar a cadeia histórica após mudanças.

### 6.2 Encaminhamento da validação

- contratado → coordenador direto;
- coordenador de equipe → coordenador de cidade;
- coordenador de cidade → coordenador de eixo;
- coordenador de eixo → RH ou administrador.

RH e administrador poderão assumir ou redirecionar uma validação, sempre com justificativa e auditoria.

## 7. Fluxo de validação

### 7.1 Status do cadastro

- rascunho;
- em preenchimento;
- documentos pendentes;
- enviado;
- aguardando validação do gestor;
- em conferência;
- correção solicitada;
- reenviado;
- divergente;
- aprovado pelo gestor;
- aguardando RH;
- validado;
- rejeitado;
- suspenso;
- arquivado.

### 7.2 Ações do gestor

O gestor poderá:

- iniciar conferência;
- aprovar;
- devolver campos específicos;
- solicitar novo documento;
- registrar divergência;
- encaminhar ao nível superior;
- rejeitar com justificativa.

O gestor não poderá apagar o cadastro.

### 7.3 Correções

Quando houver correção solicitada:

- selecionar os campos que serão reabertos;
- descrever o motivo;
- informar prazo;
- notificar o contratado;
- manter os demais campos bloqueados;
- preservar valor anterior e valor novo;
- exigir nova submissão.

### 7.4 Validação final

Somente após aprovação do gestor e, quando configurado, do RH, o cadastro recebe:

`validated_at`, `validated_by` e status `validado`.

## 8. Documentos pessoais

### 8.1 Tipos iniciais

- RG;
- CNH;
- CPF separado;
- título eleitoral;
- comprovante de residência;
- comprovante bancário;
- contrato;
- certidão;
- outro documento autorizado.

### 8.2 Regras de upload

- aceitar PDF, JPG e PNG;
- validar MIME real e extensão;
- configurar limite de tamanho;
- armazenar em bucket privado;
- gerar nome interno aleatório;
- não usar CPF ou nome no caminho público;
- bloquear executáveis;
- registrar hash do arquivo;
- detectar upload repetido;
- usar URL assinada de curta duração;
- registrar visualização e download;
- permitir substituição mantendo versão anterior;
- permitir marcar documento ilegível ou divergente.

### 8.3 Metadados

- pessoa;
- tipo;
- arquivo;
- versão;
- hash;
- MIME;
- tamanho;
- data de envio;
- enviado por;
- origem;
- status;
- validado por;
- data de validação;
- motivo de rejeição;
- documento substituído.

### 8.4 OCR

Preparar interface de serviço, mas não tornar OCR obrigatório nesta fase.

Quando implementado, armazenar:

- campo;
- valor digitado;
- valor extraído;
- confiança;
- divergência;
- valor validado;
- responsável pela validação.

OCR nunca aprova sozinho.

## 9. Cadastro administrativo individual

Usuários administrativos autorizados poderão:

- criar pessoa;
- preencher os mesmos campos do autocadastro;
- anexar documentos;
- informar a origem;
- escolher coordenador;
- salvar rascunho;
- encaminhar para validação.

Mesmo quando criado pelo RH, registrar quem criou e quem validou.

Evitar que a mesma pessoa crie e aprove o cadastro quando a campanha exigir dupla conferência.

## 10. Importação por Excel

### 10.1 Modelo oficial

Criar botão `Baixar modelo de importação`.

O modelo deve possuir:

- instruções;
- cabeçalhos fixos;
- exemplos fictícios;
- listas padronizadas quando possível;
- versão do layout;
- indicação de campos obrigatórios.

Não exigir que documentos PDF sejam incorporados ao Excel.

### 10.2 Fluxo

1. selecionar arquivo;
2. criar lote;
3. guardar arquivo em área privada;
4. ler planilha em staging;
5. normalizar dados;
6. validar linha por linha;
7. detectar duplicidades internas;
8. comparar com a base principal;
9. apresentar prévia;
10. permitir correções ou rejeições;
11. confirmar importação;
12. criar cadastros como aguardando validação;
13. gerar relatório final.

### 10.3 Validações

- CPF com 11 dígitos e dígitos verificadores;
- CPF repetido no arquivo;
- CPF já existente na campanha;
- nome ausente;
- nome divergente;
- telefone inválido;
- e-mail inválido;
- CEP inválido;
- PIX divergente do CPF;
- coordenador inexistente;
- cidade inexistente;
- eixo inexistente;
- equipe inexistente;
- função não cadastrada;
- campos obrigatórios ausentes.

### 10.4 Resultado por linha

- pronta para importar;
- importada;
- incompleta;
- inválida;
- duplicada no arquivo;
- já existente;
- possível duplicidade;
- conflitante;
- pendente de decisão;
- rejeitada.

### 10.5 Controle do lote

Registrar:

- identificador;
- campanha;
- versão do modelo;
- nome original;
- hash;
- usuário;
- data e hora;
- total recebido;
- válidos;
- importados;
- duplicados;
- rejeitados;
- pendentes;
- erros;
- status;
- confirmação;
- possibilidade de reversão.

A reversão só pode ocorrer se os registros do lote ainda não tiverem vínculos posteriores. A ação exige confirmação e auditoria.

### 10.6 Documentos em lote

Não implementar ZIP de documentos nesta fase.

Registrar como evolução futura a importação de ZIP organizado por CPF, sujeita a validação adicional.

## 11. Despesas

### 11.1 Campos

- campanha;
- categoria;
- descrição;
- finalidade;
- fornecedor;
- CNPJ ou CPF do fornecedor;
- data;
- valor solicitado;
- valor autorizado;
- forma de pagamento;
- solicitante;
- responsável pela compra;
- quem autorizou;
- nome do autorizador;
- telefone do autorizador;
- data e hora da autorização;
- canal da autorização;
- protocolo;
- observação;
- nota fiscal;
- comprovante de pagamento;
- fotografia;
- status.

### 11.2 Quem autorizou

Preferencialmente, `authorized_by_profile_id` deve referenciar um usuário autorizado.

Ao selecionar o autorizador:

- preencher nome automaticamente;
- preencher telefone automaticamente;
- validar se possui alçada;
- verificar limite;
- registrar campanha, eixo e cidade de atuação.

Guardar também snapshot imutável:

- `authorizer_name_snapshot`;
- `authorizer_phone_snapshot`;
- `authorization_role_snapshot`.

O snapshot preserva os dados existentes no momento da autorização.

### 11.3 Autorizador externo ou não localizado

Permitir excepcionalmente:

- nome informado;
- telefone informado;
- motivo;
- evidência da autorização;
- responsável pelo registro.

Marcar como `autorizador_nao_identificado` e exigir validação superior.

### 11.4 Segregação

Quando configurado:

- solicitante não autoriza a própria despesa;
- comprador não realiza sozinho a aprovação financeira;
- beneficiário não confirma o próprio reembolso;
- exceções exigem justificativa e aprovação superior.

## 12. Modelo de dados

Avaliar e criar migrações para tabelas equivalentes a:

- registration_invites;
- people;
- person_contacts;
- person_addresses;
- person_electoral_data;
- person_bank_accounts;
- person_documents;
- document_versions;
- document_reviews;
- organizational_roles;
- organizational_assignments;
- coordination_relationships;
- registration_submissions;
- registration_field_reviews;
- correction_requests;
- import_batches;
- import_staging_records;
- import_row_errors;
- data_conflicts;
- expense_categories;
- expense_authorization_rules;
- expenses;
- expense_documents;
- expense_approvals;
- notifications;
- audit_logs.

Ajustar nomes ao padrão existente sem duplicar tabelas ou conceitos.

## 13. Campos essenciais dos vínculos

`coordination_relationships` ou tabela equivalente:

- id;
- campaign_id;
- subordinate_person_id;
- coordinator_person_id;
- relationship_type;
- axis_id;
- city_id;
- team_id;
- valid_from;
- valid_until;
- status;
- source;
- created_by;
- validated_by;
- created_at;
- updated_at;
- archived_at.

Tipos:

- eixo_para_rh;
- cidade_para_eixo;
- equipe_para_cidade;
- contratado_para_coordenador.

Impedir ciclos, como uma pessoa coordenar a si mesma direta ou indiretamente.

## 14. Permissões e RLS

### Contratado

Pode:

- acessar convite válido;
- criar e editar seu rascunho;
- enviar seus documentos;
- consultar próprio status;
- corrigir somente campos reabertos.

Não pode:

- validar o próprio cadastro;
- consultar outras pessoas;
- escolher coordenadores fora das opções permitidas;
- acessar despesas administrativas;
- alterar cadastro já validado.

### Coordenador

Pode visualizar e validar somente pessoas sob sua abrangência vigente.

### RH

Pode administrar pessoas, documentos, pendências, importações e validações dentro da campanha autorizada.

### Administrador

Pode configurar campanha, hierarquia, perfis, alçadas e regras.

### Auditor

Possui leitura controlada de histórico e eventos, sem alterar registros operacionais.

### Despesas

Somente perfis autorizados podem criar, autorizar, aprovar ou consultar conforme campanha, eixo, cidade e alçada.

Criar testes de RLS para impedir acesso horizontal e escalonamento indevido.

## 15. Auditoria

Registrar:

- criação do convite;
- abertura;
- preenchimento;
- envio;
- alteração;
- correção;
- upload;
- substituição;
- visualização e download de documento;
- início de conferência;
- aprovação;
- rejeição;
- mudança de coordenador;
- importação;
- confirmação ou reversão de lote;
- criação e alteração de despesa;
- autorização;
- aprovação financeira;
- exportação.

Cada evento deve conter:

- ator;
- perfil;
- campanha;
- ação;
- entidade;
- registro;
- estado anterior;
- estado posterior;
- motivo;
- data e hora do servidor;
- IP e agente quando disponíveis;
- request_id.

Usuários comuns não podem atualizar ou apagar auditoria.

## 16. Telas

### Área pública controlada

- acesso ao convite;
- identificação;
- formulário por etapas;
- upload de documentos;
- revisão final;
- protocolo;
- acompanhamento;
- correções solicitadas.

### Área administrativa

- painel de cadastros;
- cadastro individual;
- geração de convite;
- validação;
- documentos;
- central de pendências;
- importação por Excel;
- histórico de lotes;
- hierarquia;
- despesas;
- autorizações;
- auditoria;
- configurações.

### Central de pendências

Exibir:

- documentos ausentes;
- documentos ilegíveis;
- CPFs inválidos;
- dados divergentes;
- coordenador não identificado;
- cadastro aguardando gestor;
- correção vencida;
- importação com erros;
- despesa sem autorização;
- autorizador não identificado.

## 17. Notificações

Preparar notificações internas e, posteriormente, WhatsApp e e-mail.

Eventos:

- convite criado;
- cadastro enviado;
- validação atribuída;
- correção solicitada;
- prazo próximo;
- cadastro aprovado;
- cadastro rejeitado;
- documento recusado;
- lote concluído;
- despesa aguardando autorização.

Não acoplar a regra de negócio diretamente a um único provedor de mensagens.

## 18. Critérios de aceite

### Autocadastro

- contratado preenche cadastro completo;
- documentos são enviados de forma privada;
- cadastro enviado fica bloqueado;
- status passa para aguardando validação;
- gestor correto recebe a pendência;
- contratado não aprova o próprio cadastro;
- correção reabre apenas campos selecionados;
- histórico é preservado.

### Coordenação

- contratado seleciona coordenador;
- coordenador de cidade seleciona coordenador de eixo;
- opções respeitam campanha e território;
- coordenador ausente gera pendência;
- vínculo possui vigência;
- mudança não apaga histórico;
- ciclos são bloqueados.

### Excel

- modelo oficial pode ser baixado;
- arquivo é importado para staging;
- nenhuma linha grava diretamente na base final;
- prévia mostra erros;
- duplicidades são detectadas;
- confirmação gera lote auditável;
- registros entram como aguardando validação;
- relatório final é produzido.

### Despesas

- autorizador pode ser selecionado;
- nome e telefone são preenchidos;
- snapshot é preservado;
- alçada é verificada;
- autorizador desconhecido gera pendência;
- autoautorização é bloqueada quando aplicável;
- documentos ficam privados.

### Segurança

- RLS ativa;
- documentos não públicos;
- dados reais não versionados;
- service role ausente do frontend;
- auditoria protegida;
- testes cobrem acesso indevido;
- build de produção concluído.

## 19. Ordem de implementação

### Etapa 1

- revisar banco existente;
- criar migrações;
- definir enums e status;
- criar RLS;
- criar testes de segurança.

### Etapa 2

- convite;
- autocadastro;
- formulário por etapas;
- seleção da hierarquia;
- documentos privados;
- submissão.

### Etapa 3

- fila de validação;
- conferência;
- correção;
- aprovação;
- auditoria;
- notificações internas.

### Etapa 4

- cadastro administrativo individual;
- modelo Excel;
- staging;
- prévia;
- conflitos;
- confirmação do lote.

### Etapa 5

- despesas;
- autorizador;
- alçadas;
- documentos;
- aprovações.

### Etapa 6

- testes;
- acessibilidade;
- responsividade;
- build;
- documentação.

## 20. Instrução para o Claude Code

Antes de implementar:

1. leia `CLAUDE.md`;
2. leia este documento;
3. inspecione o código e as migrações existentes;
4. apresente plano curto baseado no estado real;
5. preserve a arquitetura existente;
6. não importe dados reais;
7. não execute migração destrutiva;
8. não publicar produção sem autorização;
9. não ativar ponto ou operações;
10. implementar por etapas verificáveis.

Comece pela Etapa 1. Ao concluir, apresente:

- arquivos alterados;
- tabelas e políticas criadas;
- testes executados;
- resultado do typecheck;
- resultado do build;
- riscos;
- pendências;
- proposta da Etapa 2.
