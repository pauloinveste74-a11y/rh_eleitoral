/**
 * Corpo-base PF/PJ (CADERNO_DOCUMENTAL_JURIDICO_CONTRATOS_RH_ELEITORAL.md,
 * seções 15/16), adaptado para as chaves flat que generate_contract()
 * substitui — nunca o estilo com ponto ({{pessoa.nome_completo}}) do
 * caderno. Onde o caderno pede um dado sem fonte no modelo atual
 * (testemunha por nome, forma de pagamento específica, critério/fonte do
 * preço, fiscal PJ nomeado), o texto usa linguagem genérica ou linha de
 * assinatura em branco — nunca uma chave sem substituição no contrato
 * gerado.
 */

export const CONTRACT_BASE_BODY_PF = `QUALIFICAÇÃO

CONTRATANTE: {{organizacao_nome}}, inscrito no CNPJ sob o nº {{organizacao_cnpj}}, com endereço em {{organizacao_endereco}}, representado por {{organizacao_representante_nome}}, CPF nº {{organizacao_representante_cpf}}.

CONTRATADO: {{nome_contratado}}, CPF nº {{cpf}}, RG nº {{rg}}, residente em {{endereco_completo}}, telefone {{telefone}} e e-mail {{email}}.

NATUREZA

A contratação tem por objeto a prestação temporária de serviços de campanha eleitoral, observada sua natureza efetiva e o período contratado, nos termos do art. 100 da Lei nº 9.504 de 1997, sem prejuízo das obrigações previdenciárias, fiscais e documentais aplicáveis.

OBJETO

O CONTRATADO prestará os serviços de {{funcao}}, compreendendo as atividades detalhadas no Anexo de Função e Execução.

Cidade/eixo de referência: {{cidade}} {{eixo}}.

PERÍODO E LOCAL

Os serviços serão prestados entre {{data_inicio}} e {{data_fim}}, nos dias, horários e locais definidos nos anexos.

REMUNERAÇÃO

Pelos serviços efetivamente prestados, a CONTRATANTE pagará o valor bruto de {{valor_contratado}}, mediante forma de pagamento identificável acordada entre as partes, observadas as retenções legais aplicáveis.

JUSTIFICATIVA DO PREÇO

O preço foi definido com base em critério de mercado e na natureza das atividades contratadas, compatível com contratações semelhantes realizadas pela CONTRATANTE.

OBRIGAÇÕES DO CONTRATADO

O CONTRATADO deverá executar as atividades autorizadas, manter os registros exigidos, conservar materiais, comunicar faltas ou impedimentos, observar as normas eleitorais e manter confidencialidade.

OBRIGAÇÕES DA CONTRATANTE

A CONTRATANTE fornecerá orientações, condições, materiais e responsáveis, bem como pagará os serviços efetivamente comprovados.

COORDENAÇÃO

Coordenador(a) responsável pelo acompanhamento: {{coordenador}}. Este(a) não poderá alterar preço, objeto ou prazo sem autorização formal da CONTRATANTE.

EXECUÇÃO

A prestação será demonstrada por escala, relatório, presença, entrega, ateste, arquivos produzidos ou outros meios definidos no Anexo de Evidências.

MATERIAIS E DESPESAS

Materiais serão registrados em termo. Despesas ou ressarcimentos dependerão de autorização e documentação próprias.

CONFIDENCIALIDADE E DADOS

O CONTRATADO manterá sigilo. Os dados serão tratados para cadastro, contratação, execução, pagamento, auditoria e obrigações legais, observadas finalidade, necessidade, transparência e segurança.

INTEGRIDADE ELEITORAL

É vedado oferecer, prometer ou entregar vantagem em troca de voto, coagir eleitor, utilizar dados sem autorização, criar evidências falsas, desviar materiais ou praticar propaganda vedada.

RESCISÃO

O contrato poderá terminar por prazo, conclusão, inadimplemento, impossibilidade ou decisão formal, com apuração dos serviços executados, materiais e valores devidos.

ALTERAÇÕES

Qualquer alteração relevante dependerá de aditivo ou registro formal aprovado.

FORO

Fica eleito o foro da comarca sede da CONTRATANTE para dirimir eventuais controvérsias decorrentes deste contrato.

ASSINATURAS

_____________________________________
{{organizacao_representante_nome}}
CONTRATANTE

_____________________________________
{{nome_contratado}}
CONTRATADO

_____________________________________
TESTEMUNHA — Nome:
CPF:

_____________________________________
TESTEMUNHA — Nome:
CPF:`;

export const CONTRACT_BASE_BODY_PJ = `QUALIFICAÇÃO

CONTRATANTE: {{organizacao_nome}}, CNPJ nº {{organizacao_cnpj}}, endereço {{organizacao_endereco}}, representado por {{organizacao_representante_nome}}, CPF nº {{organizacao_representante_cpf}}.

CONTRATADA: {{razao_social}}, CNPJ nº {{cnpj}}, endereço {{endereco_completo}}, representada por {{representante_legal}}, CPF nº {{representante_cpf}}, telefone {{telefone}}, e-mail {{email}}.

OBJETO

A CONTRATADA executará {{funcao}}, conforme escopo, quantitativos, entregáveis, locais, prazos e critérios de aceite definidos no Anexo de Escopo e Execução.

VIGÊNCIA

A vigência será de {{data_inicio}} a {{data_fim}}.

PREÇO

O valor total será {{valor_contratado}}, definido com base em critério de mercado e na natureza dos serviços contratados, compatível com contratações semelhantes realizadas pela CONTRATANTE.

FATURAMENTO E PAGAMENTO

O pagamento dependerá de medição, aceite e documento fiscal idôneo, emitido em nome da entidade contratante e com descrição detalhada do serviço.

EQUIPE

A CONTRATADA responderá por sua equipe e, quando houver fornecimento de pessoal, apresentará relação nominal dos profissionais efetivamente alocados.

SUBCONTRATAÇÃO

Subcontratação somente ocorrerá mediante autorização formal e não afastará as responsabilidades da CONTRATADA.

FISCALIZAÇÃO E ACEITE

A CONTRATANTE designará um responsável pela fiscalização, que acompanhará os entregáveis e emitirá o ateste correspondente.

EVIDÊNCIAS

A CONTRATADA fornecerá relatórios, arquivos, registros, listas, comprovantes, fotografias ou outros elementos definidos para o objeto.

CONFIDENCIALIDADE, DADOS E PROPRIEDADE

A CONTRATADA protegerá os dados e informações, limitará acessos e observará as regras de propriedade intelectual constantes dos anexos.

INTEGRIDADE

É vedada qualquer prática ilícita, desvio de finalidade, pagamento irregular, uso indevido de dados ou atuação fora do objeto.

RESPONSABILIDADES

Cada parte responderá pelas obrigações fiscais, civis, profissionais, trabalhistas e previdenciárias decorrentes de sua atuação.

RESCISÃO

O contrato poderá terminar por prazo, conclusão, inadimplemento, irregularidade ou impossibilidade, com apuração dos serviços aceitos e dos valores devidos.

FORO

Fica eleito o foro da comarca sede da CONTRATANTE para dirimir eventuais controvérsias decorrentes deste contrato.

ASSINATURAS

_____________________________________
{{organizacao_representante_nome}}
CONTRATANTE

_____________________________________
{{representante_legal}}
CONTRATADA

_____________________________________
TESTEMUNHA — Nome:
CPF:

_____________________________________
TESTEMUNHA — Nome:
CPF:`;
