# RH Eleitoral Validação Documental OCR e Base Mestra

> Caderno técnico para implementação no Claude Code  
> Produto RH Eleitoral  
> Agilize Tecnologia Ltda Desenvolvimento de Sistemas  
> Versão 1.0

## 1 Finalidade

Este documento define o processo de recebimento, leitura, normalização, comparação e validação de dados provenientes de planilhas, cadastros, imagens e documentos PDF.

O objetivo é formar uma base mestra confiável sem escolher informações pela quantidade de ocorrências e sem sobrescrever automaticamente dados sensíveis.

Princípio central:

> Verdade por campo, origem comprovável e decisão auditável.

## 2 Instrução ao Claude Code

1. Analise o projeto, schema, autenticação e importações atuais.
2. Preserve o isolamento multi tenant.
3. Não permita que OCR atualize diretamente a base mestra.
4. Implemente migrations versionadas.
5. Armazene origem, valor original, valor normalizado e decisão.
6. Dados críticos exigem regras determinísticas e validação humana.
7. Não use documentos reais em testes.
8. Não envie arquivos a serviço externo sem configuração e autorização.
9. Não execute migrations ou deploy em produção sem confirmação.
10. Execute lint, typecheck, testes e build.

## 3 Problema

Uma mesma pessoa pode aparecer de formas divergentes:

| Fonte | Nome | CPF |
|---|---|---|
| Planilha A | João | 001.001.941-49 |
| Planilha B | José | 001.001.941-49 |
| Documento | A verificar | 001.001.941-49 |

O sistema não poderá escolher João ou José por maioria. Primeiro deverá validar o CPF, analisar os documentos, comparar outros identificadores e encaminhar a divergência para decisão.

O CPF do exemplo deverá ser tratado apenas como dado ilustrativo. O sistema deve validar matematicamente seus dígitos antes de utilizá-lo como identificador.

## 4 Arquitetura da solução

Etapas:

1. Receber fontes;
2. Preservar arquivos originais;
3. Validar formatos;
4. Classificar documentos;
5. Avaliar qualidade;
6. Extrair dados;
7. Normalizar;
8. Comparar campo a campo;
9. Aplicar hierarquia de fontes;
10. Gerar conflitos e sugestões;
11. Solicitar confirmação quando necessário;
12. Aprovar;
13. Atualizar a base mestra;
14. Auditar.

## 5 Fontes de informação

- Planilhas XLSX XLS e CSV;
- Cadastros manuais;
- Formulários do contratado;
- RG;
- CNH;
- CPF;
- Título eleitoral;
- Comprovante de residência;
- Comprovante bancário;
- Contratos;
- Documentos fiscais;
- Comprovantes de pagamento;
- Extratos;
- Confirmação documentada do titular;
- Validação de gestor autorizado.

## 6 Hierarquia inicial das fontes

| Prioridade | Fonte | Observação |
|---:|---|---|
| 1 | Documento oficial legível e validado | Fonte documental principal |
| 2 | Informação confirmada pelo titular com evidência | Correção assistida |
| 3 | Cadastro previamente validado | Referência interna |
| 4 | Planilha com origem e responsável | Importação rastreável |
| 5 | Planilha sem origem comprovada | Apenas indicação |

A hierarquia deverá ser configurada por campo, não por registro inteiro.

## 7 Fonte prioritária por campo

| Campo | Fonte sugerida |
|---|---|
| Nome CPF e nascimento | RG ou CNH validado |
| Filiação | Documento oficial que contenha filiação |
| Título zona e seção | Documento eleitoral |
| Endereço | Comprovante mais recente |
| Telefone e e mail | Confirmação do titular |
| Banco agência e conta | Comprovante bancário recente |
| PIX | Declaração atual e validação |
| Função e remuneração | Contrato aprovado |
| Coordenador e equipe | Estrutura aprovada |
| Valor pago | Extrato conciliado |

## 8 Validações determinísticas anteriores ao OCR

Executar antes de consumir serviço de leitura:

- extensão;
- MIME;
- tamanho;
- hash;
- arquivo corrompido;
- PDF protegido;
- quantidade de páginas;
- CPF;
- CNPJ;
- datas;
- e mail;
- telefone;
- CEP;
- título eleitoral quando houver regra confiável;
- agência e conta;
- chave PIX;
- valores monetários.

## 9 Classificação documental

O sistema deverá sugerir:

- RG frente;
- RG verso;
- CNH;
- CPF;
- título eleitoral;
- comprovante de residência;
- comprovante bancário;
- contrato;
- recibo;
- nota fiscal;
- comprovante de pagamento;
- extrato;
- desconhecido.

A classificação automática deverá guardar confiança e permitir correção humana.

## 10 Controle de qualidade

Verificar:

- resolução;
- nitidez;
- contraste;
- reflexo;
- rotação;
- documento cortado;
- quatro bordas;
- página ausente;
- frente e verso;
- texto encoberto;
- compressão;
- arquivo duplicado;
- senha;
- formato não suportado.

Mensagens ao usuário devem explicar a correção:

> A imagem está cortada. Envie novamente mostrando as quatro bordas.

> O documento está desfocado. Fotografe em local iluminado e mantenha o aparelho firme.

## 11 Extração por documento

### 11.1 RG ou CNH

- Nome;
- CPF;
- RG;
- Data de nascimento;
- Filiação;
- Naturalidade;
- Nacionalidade;
- Órgão emissor;
- UF;
- Data de expedição;
- Validade da CNH.

### 11.2 Título eleitoral

- Nome;
- Número;
- Zona;
- Seção;
- Município;
- UF;
- Local de votação quando disponível.

### 11.3 Comprovante de residência

- Nome;
- Logradouro;
- Número;
- Complemento;
- Bairro;
- Cidade;
- UF;
- CEP;
- Data de emissão;
- Titular do comprovante.

### 11.4 Comprovante bancário

- Titular;
- CPF ou CNPJ quando disponível;
- Banco;
- Agência;
- Conta;
- Dígitos;
- Tipo de conta;
- PIX quando disponível.

## 12 Preservação do original

Para cada campo, manter:

- valor original;
- valor normalizado;
- trecho ou página de origem;
- documento;
- data da extração;
- motor;
- versão do motor;
- confiança;
- decisão.

Exemplo:

| Tipo | Valor |
|---|---|
| Original | JOÃO D'ÁVILA DE SOUZA |
| Normalizado | JOAO DAVILA DE SOUZA |
| Valor para impressão | João D'Ávila de Souza |

Nunca substituir o texto documental original pelo valor normalizado.

## 13 Normalização

- Remover pontuação de CPF e CNPJ para armazenamento;
- Padronizar espaços;
- Normalizar caixa para comparação;
- Remover acentos somente em chave de comparação;
- Padronizar datas;
- Separar número e dígito;
- Padronizar DDI e DDD;
- Padronizar CEP;
- Tratar abreviações com cautela;
- Manter centavos em tipo monetário seguro.

## 14 Registro mestre por campo

Cada campo possuirá:

- valor mestre;
- situação;
- fonte;
- documento;
- quem informou;
- quem validou;
- data da validação;
- validade temporal;
- divergências abertas;
- histórico.

Estados:

- não informado;
- informado;
- importado;
- extraído;
- compatível;
- complementar;
- divergente;
- pendente;
- validado;
- rejeitado;
- desatualizado;
- bloqueado.

## 15 Comparação por campo

Exemplo:

| Campo | Cadastro | Importação | Documento | Resultado |
|---|---|---|---|---|
| Nome | João | José | José da Silva | Divergente |
| CPF | 001... | 001... | 001... | Validar dígitos |
| Nascimento | Vazio | 10/05/1980 | 10/05/1980 | Complementar |
| Endereço | Antigo | Novo | Novo | Possível atualização |

Não classificar todo o registro como certo ou errado.

## 16 Classificação dos resultados

| Situação | Definição |
|---|---|
| Novo | Registro não encontrado |
| Compatível | Confirma valor mestre |
| Complementar | Preenche campo vazio |
| Divergente | Conflita com valor existente |
| Duplicado | Repete registro ou arquivo |
| Inválido | Falha em regra objetiva |
| Inconclusivo | Evidência insuficiente |
| Pendente | Aguarda validação |

## 17 Correspondência de identidade

Quando não houver CPF válido, comparar:

- nome;
- data de nascimento;
- filiação;
- telefone;
- e mail;
- endereço;
- título;
- referência documental.

Resultados:

- correspondência forte;
- provável;
- fraca;
- pessoas distintas;
- inconclusivo.

Correspondência probabilística não autoriza mesclagem automática.

## 18 Histórico de nomes

Permitir:

- nome civil atual;
- nome social;
- nome anterior;
- grafias encontradas;
- motivo;
- documento comprobatório;
- data de atualização.

Possíveis causas legítimas:

- casamento;
- divórcio;
- retificação;
- nome social;
- abreviação;
- documento antigo;
- erro de digitação.

## 19 Validação cruzada

Comparar os documentos entre si.

| Campo | Documento 1 | Documento 2 | Documento 3 | Resultado |
|---|---|---|---|---|
| Nome | João Silva | João da Silva | João Silva | Provável compatibilidade |
| CPF | Igual | Igual | Ausente | Compatível |
| Endereço | Antigo | Ausente | Novo | Usar documento recente |
| Nascimento | Igual | Igual | Ausente | Compatível |

## 20 Validade temporal

Guardar:

- data de emissão;
- validade;
- data do upload;
- período de referência;
- data da validação;
- data de expiração interna.

Um comprovante recente pode prevalecer sobre endereço constante de documento antigo.

## 21 Confiança

Separar:

- confiança da classificação;
- confiança da leitura;
- confiança da correspondência;
- confiança da fonte;
- situação da validação humana.

Faixas iniciais sugeridas:

- 95 a 100 leitura muito segura;
- 80 a 94 conferência simples;
- abaixo de 80 revisão;
- ilegível novo envio.

O percentual não deverá ser apresentado como probabilidade de autenticidade.

## 22 Conceitos distintos

- Extraído: foi lido;
- Compatível: corresponde a outra fonte;
- Validado: regra ou pessoa autorizada confirmou;
- Confirmado pelo titular: titular declarou;
- Autêntico: somente quando houver mecanismo oficial adequado;
- Bloqueado: conflito impede uso.

OCR não produz automaticamente o estado autêntico.

## 23 Tela de resolução

Exibir:

- pessoa;
- campo;
- valor mestre;
- valor importado;
- valor extraído;
- documento;
- trecho da imagem;
- fonte;
- confiança;
- regra;
- sugestão;
- decisão;
- justificativa;
- responsável;
- histórico.

Ações:

- manter;
- atualizar;
- complementar;
- rejeitar;
- solicitar documento;
- solicitar confirmação;
- encaminhar;
- bloquear.

## 24 Fila baseada em risco

### 24.1 Crítico

- CPF inválido;
- mesmo CPF com nomes incompatíveis;
- documento usado em cadastros diferentes;
- conta de terceiro;
- alteração bancária antes do pagamento;
- tentativa de acesso entre tenants.

### 24.2 Alto

- nascimento divergente;
- filiação divergente;
- contrato emitido com dado anterior;
- documentos oficiais divergentes.

### 24.3 Médio

- endereço antigo;
- telefone divergente;
- nome abreviado.

### 24.4 Baixo

- acento;
- pontuação;
- espaços;
- caixa alta ou baixa.

## 25 Dupla aprovação

Exigir duas instâncias para:

- alteração de CPF;
- troca de favorecido;
- alteração de banco ou PIX após aprovação;
- substituição de documento validado;
- mesclagem de pessoas;
- separação de registros unificados.

Fluxo:

1. Analista propõe;
2. Gestor ou financeiro confirma;
3. Sistema executa;
4. Auditoria registra.

## 26 Confirmação pelo titular

Apresentar ao usuário:

> Estes dados foram identificados nos documentos enviados. Confira antes da validação.

Permitir:

- confirmar;
- corrigir;
- explicar;
- enviar novo documento;
- informar mudança;
- solicitar ajuda.

A confirmação do titular não substitui documento oficial em conflito grave.

## 27 Link de correção

Quando não houver conta ativa:

- token de uso único;
- expiração;
- confirmação adicional;
- dados mascarados;
- acesso limitado;
- revogação após uso.

Dados bancários devem preferencialmente exigir login e autenticação reforçada.

## 28 Contato complementar

Contato humano será utilizado quando:

- documento for ilegível;
- documentos divergirem;
- houver suspeita de documento errado;
- conta pertencer a terceiro;
- PIX for incompatível;
- faltar documento;
- alteração grave não tiver comprovação.

Registrar:

- data e hora;
- canal;
- telefone;
- responsável;
- campos confirmados;
- resultado;
- novo documento solicitado;
- observação.

## 29 Detecção de duplicidade

Calcular hash para identificar:

- mesmo arquivo;
- arquivo renomeado;
- documento ligado a pessoas diferentes;
- frente ou verso duplicado;
- comprovante reutilizado;
- contrato duplicado.

## 30 Sinais de possível alteração

Sinalizar para conferência:

- fontes tipográficas incompatíveis;
- sobreposição;
- recorte;
- compressão desigual;
- campo inserido;
- metadados incompatíveis;
- divergência entre texto e código verificável;
- mesma imagem em pessoas distintas.

Nunca classificar automaticamente como fraude. Usar o estado requer conferência documental.

## 31 Bloqueio de pagamento

Quando identidade ou dados bancários estiverem divergentes:

- permitir análise documental;
- permitir elaboração contratual como rascunho;
- bloquear liberação financeira;
- gerar pendência;
- notificar responsável.

## 32 Reconferência antes do pagamento

Comparar novamente:

- CPF do cadastro;
- CPF do contrato;
- favorecido;
- PIX;
- banco;
- conta;
- valor;
- contrato;
- alterações recentes;
- pagamentos anteriores.

Alteração bancária depois da aprovação deverá invalidar a autorização financeira anterior.

## 33 Índice de identidade

Estados recomendados:

- não verificada;
- parcialmente verificada;
- verificada documentalmente;
- confirmada pelo titular;
- divergente;
- bloqueada.

Exibir as verificações concluídas em vez de um percentual genérico de verdade.

## 34 Relatório de resolução

Conter:

- pessoa;
- campo;
- valores;
- fontes;
- documentos;
- validações;
- decisão;
- responsáveis;
- justificativa;
- data;
- valor final.

## 35 Atualização da base mestra

Fluxo obrigatório:

1. Extrair;
2. Comparar;
3. Sugerir;
4. Revisar;
5. Aprovar;
6. Atualizar;
7. Auditar.

OCR nunca deverá executar a etapa 6 diretamente.

## 36 Auditoria

Registrar:

- tenant;
- pessoa;
- campo;
- valor anterior;
- valor proposto;
- valor aprovado;
- arquivo;
- hash;
- origem;
- motor;
- versão;
- confiança;
- usuário proponente;
- usuário aprovador;
- justificativa;
- data e hora;
- IP e dispositivo quando aplicável.

## 37 Segurança

- Buckets privados;
- Caminhos por tenant;
- URLs assinadas;
- Criptografia;
- Acesso por função;
- Dados mascarados;
- Registro de visualizações e downloads;
- Arquivos temporários eliminados;
- Nenhum link público;
- Retenção definida;
- Proibição de uso para treinamento sem autorização;
- Contrato com fornecedores de OCR;
- Configuração de região de processamento;
- Plano de incidentes;
- RLS testada.

## 38 Privacidade

Documentos de identidade, dados bancários e informações políticas exigem proteção elevada.

Aplicar:

- finalidade;
- necessidade;
- transparência;
- segurança;
- prevenção;
- não discriminação;
- responsabilização;
- acesso mínimo;
- retenção limitada.

## 39 Estrutura de banco sugerida

Tabelas:

- data_sources;
- source_files;
- document_uploads;
- document_pages;
- document_classifications;
- document_quality_checks;
- extraction_jobs;
- extracted_fields;
- normalized_field_values;
- identity_candidates;
- field_comparisons;
- data_conflicts;
- validation_tasks;
- validation_decisions;
- master_field_values;
- master_field_history;
- holder_confirmations;
- contact_confirmations;
- duplicate_file_matches;
- payment_validation_blocks;

Todas as tabelas de negócio deverão ter tenant_id, timestamps, RLS e auditoria.

## 40 Requisitos dos arquivos

Guardar:

- UUID;
- tenant;
- pessoa candidata;
- nome original;
- nome interno;
- MIME;
- extensão;
- tamanho;
- hash;
- páginas;
- data;
- origem;
- responsável;
- classificação;
- qualidade;
- situação;
- retenção.

## 41 APIs e serviços de OCR

Criar interface desacoplada de fornecedor:

- submitDocument;
- getJobStatus;
- getExtractedFields;
- normalizeResult;
- deleteTemporaryAsset;

Não vincular regras de negócio diretamente ao formato de um provedor.

Permitir troca de fornecedor e processamento manual de contingência.

## 42 Etapas de implementação

### Fase 1 Determinística

- Importação;
- Validações;
- Hash;
- Normalização;
- Comparação por CPF;
- Origem por campo;
- Tela de conflitos;
- Aprovação;
- Auditoria.

### Fase 2 OCR

- Upload privado;
- Qualidade;
- Classificação;
- Extração;
- Confiança;
- Comparação;
- Solicitação de novo arquivo.

### Fase 3 Validação avançada

- Cruzamento entre documentos;
- Agrupamento de identidade;
- Confirmação do titular;
- Dupla aprovação;
- Bloqueio financeiro;
- Detecção de possíveis alterações.

## 43 Critérios de aceite

- [ ] CPF inválido é detectado antes do OCR;
- [ ] Arquivo duplicado é identificado por hash;
- [ ] Documento original permanece imutável;
- [ ] Valor original e normalizado são preservados;
- [ ] Cada campo registra sua origem;
- [ ] OCR não atualiza a base mestra;
- [ ] Divergências aparecem campo a campo;
- [ ] Dados críticos exigem aprovação;
- [ ] Mesclagem não ocorre por similaridade isolada;
- [ ] Documentos são comparados entre si;
- [ ] Validade temporal influencia a sugestão;
- [ ] Usuário pode confirmar ou corrigir;
- [ ] Conta divergente bloqueia pagamento;
- [ ] Mudança bancária invalida aprovação anterior;
- [ ] Acesso cruzado entre tenants é bloqueado;
- [ ] Toda decisão possui auditoria;
- [ ] Falha de OCR permite tratamento manual;
- [ ] Lint typecheck testes e build passam.

## 44 Testes obrigatórios

1. CPF matematicamente inválido;
2. Mesmo CPF com dois nomes;
3. Mesmo nome com dois CPFs;
4. Documento duplicado e renomeado;
5. Documento usado em duas pessoas;
6. Imagem cortada;
7. Imagem ilegível;
8. Documento sem verso;
9. OCR com confiança baixa;
10. Endereço antigo e comprovante novo;
11. Mudança legítima de nome;
12. Conta de terceiro;
13. Alteração bancária após aprovação;
14. Mesclagem com dupla aprovação;
15. Tentativa de acesso a outro tenant;
16. Falha do provedor;
17. Confirmação do titular;
18. Geração do relatório;
19. Auditoria integral;
20. Exclusão dos temporários.

## 45 Entregáveis do Claude Code

- Migrations;
- RLS;
- Tipos TypeScript;
- Validações;
- Adaptador de OCR;
- Pipeline de processamento;
- Tela de comparação;
- Fila de pendências;
- Confirmação do titular;
- Dupla aprovação;
- Bloqueio financeiro;
- Auditoria;
- Testes;
- Variáveis de ambiente com exemplos fictícios;
- Instruções de implantação;
- Plano de rollback;
- Relatório final.

## 46 Regra final

O sistema utilizará OCR como instrumento de leitura e comparação, não como autoridade absoluta. A base mestra será atualizada somente depois de validação proporcional ao risco, preservando fonte, evidência, histórico e responsabilidade pela decisão.

