# Caderno Documental e Jurídico dos Contratos do RH Eleitoral

> Documento para implementação no Claude Code  
> Produto RH Eleitoral  
> Agilize Tecnologia Ltda Desenvolvimento de Sistemas  
> Versão 1.0  
> Referência normativa Eleições 2026

## 1 Finalidade

Este caderno define a biblioteca documental e jurídica dos contratos, termos, declarações, anexos, recibos, aditivos e documentos de encerramento do RH Eleitoral.

O objetivo é permitir que o sistema:

- mantenha modelos juridicamente organizados;
- preencha os documentos com dados da organização ativa;
- gere contratos individuais ou em lote;
- preserve a versão e os dados utilizados;
- receba contratos assinados;
- mantenha dossiê documental completo;
- produza documentos aptos à revisão jurídica e contábil;
- ofereça elementos de comprovação da contratação e da prestação do serviço.

Este documento não aprova juridicamente os modelos. Todos deverão ser instalados como rascunho e submetidos ao advogado eleitoral e ao contador responsável antes do uso definitivo.

## 2 Base normativa de referência

A biblioteca deverá observar, entre outras normas aplicáveis:

- Constituição Federal, especialmente proteção da intimidade, vida privada, honra, imagem, sigilo e dados;
- Lei nº 9.504 de 1997, especialmente arts. 26, 41-A, 100 e 100-A;
- Resolução TSE nº 23.607 de 2019, com alterações posteriores;
- Resolução TSE nº 23.731 de 2024;
- Resolução TSE nº 23.752 de 2026;
- Lei nº 13.709 de 2018, Lei Geral de Proteção de Dados;
- Código Civil, especialmente regras de prestação de serviços;
- legislação previdenciária, fiscal e profissional aplicável;
- Estatuto da Advocacia;
- normas do Conselho Federal de Contabilidade;
- normas próprias de segurança privada, quando aplicáveis.

Fontes oficiais:

- https://www.tse.jus.br/legislacao/compilada/res/2019/resolucao-no-23-607-de-17-de-dezembro-de-2019
- https://www.tse.jus.br/legislacao/compilada/res/2026/resolucao-no-23-752-de-26-de-fevereiro-de-2026
- https://www.tse.jus.br/legislacao/codigo-eleitoral/lei-das-eleicoes/lei-das-eleicoes-lei-nb0-9.504-de-30-de-setembro-de-1997
- https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm
- https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm

## 3 Instrução ao Claude Code

1. Tratar este caderno como requisito documental.
2. Não substituir cláusulas por resumos.
3. Armazenar modelos e versões no banco, não diretamente no código.
4. Manter os modelos inicialmente no estado draft.
5. Não marcar modelo como approved sem aprovação registrada.
6. Aplicar tenant_id e RLS a modelos e documentos.
7. Não executar migrations ou deploy em produção sem autorização.
8. Não utilizar dados pessoais reais em seeds ou testes.
9. Preservar o documento emitido, sua versão e seus anexos.
10. Gerar prévia antes da emissão definitiva.

## 4 Separação entre cadastro e contrato

O cadastro do RH Eleitoral será mais amplo do que o conteúdo impresso dos contratos.

O sistema poderá armazenar dados:

- contratuais;
- documentais;
- eleitorais;
- financeiros;
- administrativos;
- operacionais;
- logísticos;
- de comunicação;
- estratégicos;
- de emergência;
- de auditoria.

A existência de um campo no cadastro não autoriza sua inclusão automática no contrato.

Cada modelo deverá possuir uma lista explícita de campos autorizados para impressão.

## 5 Classificação das informações

| Grupo | Exemplos | Uso |
|---|---|---|
| Contratual | Nome, CPF ou CNPJ, endereço, função, período, jornada e valor | Contrato |
| Documental | RG, CNH, título e comprovante de residência | Validação |
| Financeiro | Banco, agência, conta e PIX | Pagamento |
| Eleitoral | Título, zona, seção e local de votação | Conferência |
| Operacional | Cidade, eixo, coordenador, escala e equipe | Organização |
| Logístico | Camiseta, veículo e materiais | Controle |
| Comunicação | E mail, telefone, WhatsApp e redes sociais | Comunicação autorizada |
| Estratégico | Liderança, território e mobilização | Planejamento restrito |
| Emergência | Contato e telefone de emergência | Segurança |
| Auditoria | Origem, alteração, validação e responsável | Rastreabilidade |

## 6 Dados não contratuais

Poderão ser cadastrados para demandas específicas, sem inclusão automática no contrato:

- Instagram;
- Facebook;
- outras redes sociais;
- liderança comunitária;
- igreja, associação, sindicato ou grupo social;
- região de influência;
- estimativa de mobilização;
- histórico de participação;
- referência ou indicação;
- tamanho de camiseta;
- contato de emergência;
- disponibilidade;
- veículo quando não integrar o objeto;
- observações administrativas.

Esses dados deverão ter finalidade, nível de acesso, prazo de retenção e permissões próprias.

Dados capazes de revelar opinião política ou vínculo com organização política devem receber proteção reforçada e acesso restrito.

## 7 Dados contratuais permitidos

Conforme o modelo, poderão constar:

- nome ou razão social;
- CPF ou CNPJ;
- RG e órgão emissor;
- nacionalidade;
- estado civil;
- profissão;
- endereço;
- telefone;
- e mail;
- representante;
- função;
- objeto;
- atividades;
- local;
- jornada;
- período;
- remuneração;
- forma de pagamento;
- responsáveis;
- assinaturas;
- testemunhas.

Dados bancários somente deverão aparecer no contrato ou anexo quando houver finalidade e aprovação do modelo.

## 8 Cabeçalho obrigatório

Todas as páginas deverão apresentar:

- logotipo ou brasão;
- nome da campanha ou entidade contratante;
- razão social quando aplicável;
- CNPJ eleitoral;
- título do contrato.

Modelo:

> {{campaign_legal_entity.nome}}  
> {{contrato.titulo}}  
> CNPJ {{campaign_legal_entity.cnpj}}

O sistema não deverá usar automaticamente o CNPJ genérico do tenant. Deverá utilizar o CNPJ da entidade que efetivamente assumirá e registrará a despesa eleitoral.

## 9 Rodapé obrigatório

Todas as páginas deverão apresentar:

- CNPJ da entidade contratante;
- e mail;
- telefone ou WhatsApp;
- endereço do escritório;
- código do contrato;
- página atual e total;
- hash ou código de verificação quando implantado.

Modelo:

> CNPJ {{campaign_legal_entity.cnpj}} | {{campaign_legal_entity.email}} | {{campaign_legal_entity.telefone}}  
> {{campaign_legal_entity.endereco_completo}}  
> Contrato {{contrato.codigo}} | Página {{documento.pagina}} de {{documento.total_paginas}}

## 10 Qualificação da entidade eleitoral

Antes da emissão, deverão estar cadastrados:

- nome constante do CNPJ;
- CNPJ eleitoral;
- tipo da entidade;
- campanha;
- eleição;
- cargo disputado;
- candidato ou partido relacionado;
- endereço;
- e mail;
- telefone;
- representante;
- CPF do representante;
- responsável financeiro;
- responsável pela prestação de contas.

## 11 Biblioteca de contratos PF

| Código | Contrato |
|---|---|
| PF 01 | Cabo eleitoral |
| PF 02 | Coordenador de equipe |
| PF 03 | Coordenador de cidade ou RA |
| PF 04 | Coordenador de eixo |
| PF 05 | Apoio administrativo |
| PF 06 | Atendimento e recepção |
| PF 07 | Motorista |
| PF 08 | Fotógrafo ou videomaker |
| PF 09 | Designer ou social media |
| PF 10 | Técnico de informática |
| PF 11 | Fiscal ou delegado eleitoral |
| PF 12 | Prestador especializado eventual |
| PF 13 | Advogado autônomo |
| PF 14 | Contador autônomo |

## 12 Biblioteca de contratos PJ

| Código | Contrato |
|---|---|
| PJ 01 | Empresa de mobilização eleitoral |
| PJ 02 | Empresa de apoio administrativo |
| PJ 03 | Consultoria eleitoral |
| PJ 04 | Agência de publicidade |
| PJ 05 | Marketing digital |
| PJ 06 | Produção audiovisual |
| PJ 07 | Tecnologia e software |
| PJ 08 | Call center |
| PJ 09 | Transporte e logística |
| PJ 10 | Locação e estrutura |
| PJ 11 | Segurança privada |
| PJ 12 | Alimentação e eventos |
| PJ 13 | Sociedade de advocacia |
| PJ 14 | Organização contábil |
| PJ 15 | Pesquisa e análise de dados |
| PJ 16 | Serviços gráficos |
| PJ 17 | Prestação especializada |

## 13 Documentos auxiliares

- Ficha cadastral;
- Termo de confidencialidade;
- Aviso ou termo de tratamento de dados;
- Autorização de uso de imagem;
- Declaração de dados bancários;
- Termo de entrega de uniforme;
- Termo de entrega de materiais;
- Termo de responsabilidade por equipamento;
- Termo de cessão de veículo;
- Termo de militância não remunerada;
- Termo de ciência e utilização de aplicativos;
- Ateste de prestação;
- Relatório de execução;
- Recibo de pagamento PF quando admitido;
- Solicitação e conferência de nota fiscal;
- Termo de rescisão;
- Termo de encerramento;
- Termo de quitação;
- Aditivo de prazo;
- Aditivo de valor;
- Aditivo de função ou objeto;
- Notificação de pendência;
- Termo de devolução de materiais.

## 14 Estrutura obrigatória de cada contrato

1. Título;
2. Código;
3. Qualificação completa;
4. Natureza da contratação;
5. Objeto específico;
6. Atividades;
7. Local;
8. Período;
9. Jornada ou disponibilidade;
10. Valor;
11. Critério e justificativa do preço;
12. Forma de pagamento;
13. Obrigações do contratado;
14. Obrigações do contratante;
15. Coordenação e fiscalização;
16. Comprovação da execução;
17. Materiais;
18. Despesas e ressarcimentos;
19. Confidencialidade;
20. Proteção de dados;
21. Aplicativos quando aplicável;
22. Conduta e integridade eleitoral;
23. Rescisão;
24. Apuração de valores;
25. Aditivos;
26. Foro;
27. Assinaturas;
28. Testemunhas;
29. Anexos.

## 15 Corpo base PF

### Qualificação

CONTRATANTE: {{campaign_legal_entity.nome}}, inscrito no CNPJ sob o nº {{campaign_legal_entity.cnpj}}, com endereço em {{campaign_legal_entity.endereco_completo}}, representado por {{campaign_legal_entity.representante_nome}}, CPF nº {{campaign_legal_entity.representante_cpf}}.

CONTRATADO: {{pessoa.nome_completo}}, CPF nº {{pessoa.cpf}}, RG nº {{pessoa.rg}}, residente em {{pessoa.endereco_completo}}, telefone {{pessoa.telefone}} e e mail {{pessoa.email}}.

### Natureza

A contratação tem por objeto a prestação temporária de serviços de campanha eleitoral, observada sua natureza efetiva e o período contratado, nos termos do art. 100 da Lei nº 9.504 de 1997, sem prejuízo das obrigações previdenciárias, fiscais e documentais aplicáveis.

### Objeto

O CONTRATADO prestará os serviços de {{contrato.funcao}}, compreendendo as atividades detalhadas no Anexo de Função e Execução.

### Período e local

Os serviços serão prestados entre {{contrato.data_inicio}} e {{contrato.data_fim}}, nos dias, horários e locais definidos nos anexos.

### Remuneração

Pelos serviços efetivamente prestados, a CONTRATANTE pagará o valor bruto de {{contrato.valor}}, conforme {{contrato.forma_pagamento}}, observadas as retenções aplicáveis.

### Justificativa do preço

O preço foi definido conforme {{contrato.criterio_preco}}, considerando {{contrato.justificativa_preco}} e a fonte de comparação {{contrato.fonte_preco}}.

### Obrigações do contratado

O CONTRATADO deverá executar as atividades autorizadas, manter os registros exigidos, conservar materiais, comunicar faltas ou impedimentos, observar as normas eleitorais e manter confidencialidade.

### Obrigações da contratante

A CONTRATANTE fornecerá orientações, condições, materiais e responsáveis, bem como pagará os serviços efetivamente comprovados.

### Coordenação

O acompanhamento será realizado por {{contrato.coordenador}}, que não poderá alterar preço, objeto ou prazo sem autorização formal.

### Execução

A prestação será demonstrada por escala, relatório, presença, entrega, ateste, arquivos produzidos ou outros meios definidos no Anexo de Evidências.

### Materiais e despesas

Materiais serão registrados em termo. Despesas ou ressarcimentos dependerão de autorização e documentação próprias.

### Confidencialidade e dados

O CONTRATADO manterá sigilo. Os dados serão tratados para cadastro, contratação, execução, pagamento, auditoria e obrigações legais, observadas finalidade, necessidade, transparência e segurança.

### Integridade eleitoral

É vedado oferecer, prometer ou entregar vantagem em troca de voto, coagir eleitor, utilizar dados sem autorização, criar evidências falsas, desviar materiais ou praticar propaganda vedada.

### Rescisão

O contrato poderá terminar por prazo, conclusão, inadimplemento, impossibilidade ou decisão formal, com apuração dos serviços executados, materiais e valores devidos.

### Alterações

Qualquer alteração relevante dependerá de aditivo ou registro formal aprovado.

### Assinaturas

{{campaign_legal_entity.representante_nome}}  
CONTRATANTE

{{pessoa.nome_completo}}  
CONTRATADO

{{testemunha1.nome}} CPF {{testemunha1.cpf}}  
TESTEMUNHA

{{testemunha2.nome}} CPF {{testemunha2.cpf}}  
TESTEMUNHA

## 16 Corpo base PJ

### Qualificação

CONTRATANTE: {{campaign_legal_entity.nome}}, CNPJ nº {{campaign_legal_entity.cnpj}}, endereço {{campaign_legal_entity.endereco_completo}}, representado por {{campaign_legal_entity.representante_nome}}, CPF nº {{campaign_legal_entity.representante_cpf}}.

CONTRATADA: {{empresa.razao_social}}, CNPJ nº {{empresa.cnpj}}, endereço {{empresa.endereco_completo}}, representada por {{empresa.representante_nome}}, CPF nº {{empresa.representante_cpf}}.

### Objeto

A CONTRATADA executará {{contrato.objeto}}, conforme escopo, quantitativos, entregáveis, locais, prazos e critérios de aceite.

### Vigência

A vigência será de {{contrato.data_inicio}} a {{contrato.data_fim}}.

### Preço

O valor total será {{contrato.valor}}, definido conforme {{contrato.criterio_preco}} e {{contrato.justificativa_preco}}.

### Faturamento e pagamento

O pagamento dependerá de medição, aceite e documento fiscal idôneo, emitido em nome da entidade contratante e com descrição detalhada do serviço.

### Equipe

A CONTRATADA responderá por sua equipe e, quando houver fornecimento de pessoal, apresentará relação nominal dos profissionais efetivamente alocados.

### Subcontratação

Subcontratação somente ocorrerá mediante autorização formal e não afastará as responsabilidades da CONTRATADA.

### Fiscalização e aceite

O responsável {{contrato.fiscal_responsavel}} acompanhará os entregáveis e emitirá ateste.

### Evidências

A CONTRATADA fornecerá relatórios, arquivos, registros, listas, comprovantes, fotografias ou outros elementos definidos para o objeto.

### Confidencialidade dados e propriedade

A CONTRATADA protegerá os dados e informações, limitará acessos e observará as regras de propriedade intelectual constantes dos anexos.

### Integridade

É vedada qualquer prática ilícita, desvio de finalidade, pagamento irregular, uso indevido de dados ou atuação fora do objeto.

### Responsabilidades

Cada parte responderá pelas obrigações fiscais, civis, profissionais, trabalhistas e previdenciárias decorrentes de sua atuação.

### Rescisão

O contrato poderá terminar por prazo, conclusão, inadimplemento, irregularidade ou impossibilidade, com apuração dos serviços aceitos e dos valores devidos.

### Assinaturas

{{campaign_legal_entity.representante_nome}}  
CONTRATANTE

{{empresa.representante_nome}}  
CONTRATADA

{{testemunha1.nome}} CPF {{testemunha1.cpf}}  
TESTEMUNHA

{{testemunha2.nome}} CPF {{testemunha2.cpf}}  
TESTEMUNHA

## 17 Requisitos de contratação de pessoal

Contratos diretos ou terceirizados de pessoal deverão registrar:

- identificação integral;
- CPF;
- função;
- local;
- horas;
- atividades;
- período;
- valor;
- justificativa do preço;
- coordenador;
- evidências;
- classificação no art. 100-A.

## 18 Limite do art 100 A

Para militância e mobilização, registrar:

- cargo disputado;
- circunscrição;
- limite divulgado;
- contratações diretas;
- contratações terceirizadas;
- contratações de titular, vice ou suplente;
- total consolidado;
- saldo;
- pessoas excluídas do limite;
- fundamento da exclusão.

Estados:

- sujeito ao limite;
- excluído do limite;
- pendente de classificação.

## 19 Pessoa jurídica fornecedora de equipe

Exigir anexo nominal com:

- nome;
- CPF;
- função;
- local;
- dias;
- horas;
- atividades;
- período;
- substituições;
- responsável;
- classificação no limite.

O contrato apenas com o CNPJ da fornecedora não substitui a identificação das pessoas efetivamente alocadas.

## 20 Justificativa do preço

Campos obrigatórios:

- {{contrato.criterio_preco}}
- {{contrato.justificativa_preco}}
- {{contrato.valor_hora_referencia}}
- {{contrato.valor_dia_referencia}}
- {{contrato.fonte_preco}}
- {{contrato.aprovador_preco}}

Fontes:

- tabela aprovada;
- pesquisa de preços;
- propostas;
- contratos semelhantes;
- especialização;
- complexidade;
- território;
- carga horária;
- volume;
- entregáveis.

## 21 Comprovação da execução

O dossiê poderá conter:

- escala;
- presença;
- relatório;
- ateste;
- registro operacional;
- entrega;
- arquivos produzidos;
- fotos permitidas;
- chamados;
- comprovante fiscal;
- comprovante bancário.

Contrato sem comprovação suficiente deverá permanecer pendente de encerramento documental.

## 22 Documento fiscal e recibo

Documento fiscal deverá conter:

- data;
- descrição detalhada;
- valor;
- emitente;
- CPF ou CNPJ;
- endereço;
- destinatário;
- CNPJ eleitoral;
- período;
- referência ao contrato.

Quando a emissão fiscal for legalmente dispensada, o recibo deverá conter, no mínimo:

- data;
- descrição;
- valor;
- identificação das partes;
- CPF ou CNPJ;
- endereço;
- assinatura.

A utilização do recibo dependerá de validação contábil.

## 23 Forma de pagamento

Prever meios identificáveis admitidos pela regulamentação.

Por política interna, poderá ser dada preferência à chave PIX correspondente ao CPF ou CNPJ do contratado. Outra forma identificável poderá ser utilizada após validação financeira.

O documento não deverá afirmar que o PIX CPF é exigência geral atual do TSE.

## 24 Datas documentais

Registrar separadamente:

- assinatura;
- contratação;
- início;
- término;
- execução;
- emissão fiscal;
- pagamento;
- registro na prestação de contas.

## 25 Advocacia

Contratos PF ou PJ deverão conter:

- OAB e UF;
- sociedade e registro quando aplicável;
- responsável;
- escopo consultivo;
- escopo contencioso;
- processos;
- fases e instâncias;
- honorários;
- despesas;
- sigilo;
- quem contratou;
- quem recebeu o serviço;
- quem pagou;
- fonte;
- informação necessária à prestação de contas.

Separar serviços de campanha e defesa judicial conforme orientação jurídica e contábil.

## 26 Contabilidade

Contratos PF ou PJ deverão conter:

- CRC e UF;
- organização contábil;
- responsável técnico;
- escrituração;
- conciliação;
- relatórios;
- sistema de prestação de contas;
- entregas parciais e finais;
- diligências;
- guarda de documentos;
- quem contratou;
- quem recebeu;
- quem pagou;
- fonte.

## 27 Serviços gráficos

Exigir:

- produto;
- dimensões;
- material;
- cores;
- tiragem;
- quantidade;
- preço unitário;
- preço total;
- arte;
- beneficiários;
- data;
- local de entrega;
- responsável;
- amostra;
- documento fiscal detalhado.

## 28 Marketing digital

Separar:

- criação;
- gestão;
- produção;
- consultoria;
- impulsionamento;
- valor da mídia;
- taxa;
- provedor;
- conta;
- candidato beneficiado;
- crédito contratado;
- crédito utilizado;
- saldo não utilizado.

## 29 Termo de militância não remunerada

Não utilizar contrato remunerado com valor zero.

O termo próprio conterá:

- identificação;
- atividade;
- período;
- declaração de voluntariedade;
- ausência de remuneração;
- despesas autorizadas;
- materiais;
- confidencialidade;
- tratamento de dados;
- registro de serviço estimável quando aplicável;
- avaliação do valor quando exigida;
- aprovação contábil.

## 30 Cláusula de aplicativos e plataformas

O CONTRATADO poderá ser solicitado a utilizar aplicativos, sistemas ou plataformas disponibilizados, indicados ou autorizados pela CONTRATANTE, exclusivamente para execução do contrato e organização da campanha.

As ferramentas poderão ser utilizadas para:

- comunicação;
- orientações;
- escalas;
- início e término;
- presença;
- horas;
- locais;
- comprovação;
- relatórios;
- fotos e documentos;
- tarefas;
- ocorrências;
- geolocalização limitada à atividade;
- auditoria e obrigações legais.

## 31 Limites do monitoramento

A coleta de localização, acesso, horário e informações operacionais ficará limitada ao período e à finalidade informada.

É vedado:

- monitoramento oculto;
- monitoramento fora da jornada;
- uso incompatível;
- acesso a mensagens pessoais;
- acesso a contatos particulares;
- acesso a fotos ou arquivos privados;
- acesso ao histórico de navegação;
- controle geral do aparelho particular.

A geolocalização deverá ser ativada somente quando necessária e interrompida ao final da atividade.

## 32 Aparelho pessoal

Quando instalado em aparelho particular:

- limitar permissões;
- explicar cada permissão;
- não acessar conteúdo privado;
- informar dados coletados;
- informar duração;
- informar pessoas com acesso;
- permitir correção;
- encerrar acessos ao final.

## 33 Equipamento da campanha

O termo de entrega deverá registrar:

- patrimônio;
- aparelho;
- acessórios;
- aplicativos;
- permissões;
- controles;
- data;
- responsável;
- devolução;
- revogação.

Não será permitido monitoramento oculto.

## 34 Ponto e geolocalização

O registro poderá conter:

- usuário;
- data;
- hora;
- local autorizado;
- dispositivo;
- evento;
- evidência.

O contratado poderá consultar e solicitar correção.

A geolocalização será preferencialmente por evento:

- início;
- término;
- check in;
- visita;
- evento;
- entrega;
- ocorrência.

## 35 Falha técnica

A indisponibilidade, falta de sinal, falha de GPS ou defeito não caracterizará automaticamente falta. O contratado comunicará a ocorrência e poderá utilizar procedimento alternativo.

## 36 Termo de ciência de aplicativos

Documento separado contendo:

1. Aplicativo;
2. Fornecedor;
3. Controlador;
4. Finalidades;
5. Dados;
6. Permissões;
7. Geolocalização;
8. Ponto;
9. Período;
10. Acessos;
11. Compartilhamentos;
12. Retenção;
13. Direitos;
14. Falhas;
15. Revogação;
16. Assinatura ou aceite.

## 37 Cláusula geral de dados

Os dados pessoais do contratado serão tratados para cadastro, elaboração e execução do contrato, organização das atividades, cumprimento de obrigações legais, eleitorais, fiscais, contábeis e financeiras, segurança, comunicação e auditoria.

Informações destinadas a finalidades administrativas, operacionais ou estratégicas que não sejam necessárias à qualificação ou ao objeto permanecerão no cadastro interno e não integrarão automaticamente o instrumento.

## 38 Anexos

- Anexo I Função e atividades;
- Anexo II Jornada escala e período;
- Anexo III Valor e cronograma;
- Anexo IV Cidade região eixo e locais;
- Anexo V Coordenadores;
- Anexo VI Materiais;
- Anexo VII Dados bancários;
- Anexo VIII Confidencialidade e dados;
- Anexo IX Uso de imagem;
- Anexo X Evidências e ateste;
- Anexo XI Propriedade intelectual;
- Anexo XII Encerramento;
- Anexo XIII Equipe terceirizada;
- Anexo XIV Justificativa do preço;
- Anexo XV Aplicativos e geolocalização.

## 39 Dossiê documental

Cada contratação deverá reunir:

1. Ficha cadastral;
2. Identificação;
3. Comprovante de endereço;
4. Comprovante bancário;
5. Contrato;
6. Anexos;
7. Aditivos;
8. Evidências;
9. Ateste;
10. Documento fiscal ou recibo;
11. Comprovante de pagamento;
12. Rescisão ou encerramento.

## 40 Versões e aprovação

Estados dos modelos:

- draft;
- legal_review;
- accounting_review;
- approved;
- inactive;
- archived.

Regras:

- somente approved gera documento definitivo;
- alterar approved cria nova versão;
- contratos antigos preservam a versão;
- pareceres ficam registrados;
- rejeição exige justificativa.

## 41 Situações documentais

- draft;
- pending_data;
- pending_approval;
- ready_to_send;
- sent;
- delivered;
- delivery_failed;
- viewed;
- downloaded;
- returned_unsigned;
- returned_signed;
- pending_validation;
- validated;
- rejected;
- cancelled;
- expired.

Enviado, entregue, devolvido, assinado e validado são situações diferentes.

## 42 Snapshot documental

Salvar de forma imutável:

- entidade contratante;
- contratado;
- condições;
- valor;
- versão do modelo;
- anexos;
- arquivo;
- hash;
- responsável;
- data.

## 43 Checklist jurídico

- [ ] Entidade e CNPJ corretos;
- [ ] Representação válida;
- [ ] Qualificação completa;
- [ ] Objeto específico;
- [ ] Atividades detalhadas;
- [ ] Período;
- [ ] Local;
- [ ] Jornada;
- [ ] Valor;
- [ ] Justificativa do preço;
- [ ] Forma de pagamento;
- [ ] Obrigações;
- [ ] Evidências;
- [ ] Limite do art. 100-A;
- [ ] Proteção de dados;
- [ ] Aplicativos quando necessários;
- [ ] Integridade eleitoral;
- [ ] Rescisão;
- [ ] Foro;
- [ ] Assinaturas;
- [ ] Anexos.

## 44 Checklist contábil documental

- [ ] Contratante correto;
- [ ] Data da contratação;
- [ ] Classificação da despesa;
- [ ] Fonte do recurso;
- [ ] Documento fiscal ou recibo;
- [ ] Descrição detalhada;
- [ ] Ateste;
- [ ] Comprovante bancário;
- [ ] Retenções;
- [ ] Valor contratado e pago;
- [ ] Profissional informado;
- [ ] Registro na prestação de contas.

## 45 Regra final

Os modelos serão disponibilizados inicialmente como draft. A implantação técnica não representa aprovação jurídica. A liberação definitiva dependerá de revisão e aprovação formal do jurídico eleitoral e da contabilidade responsável por cada organização.

