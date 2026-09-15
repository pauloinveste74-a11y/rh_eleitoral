# RH Eleitoral

## Especificação funcional e técnica da nova versão

**Versão do documento:** 1.0  
**Data:** 15 de setembro de 2026  
**Finalidade:** orientar produto, desenvolvimento, validação e implantação da nova versão do sistema.

---

## 1. Visão geral

O RH Eleitoral é uma plataforma multi-campanha para cadastro, validação e acompanhamento de trabalhadores, prestadores de serviço, coordenadores e áreas administrativas.

A nova versão concentra-se em cinco frentes:

1. gestão de pessoas físicas e jurídicas;
2. autocadastro com validação obrigatória;
3. importação administrativa de dados e documentos;
4. gestão de contratos;
5. despesas, pagamentos e acompanhamento pelos coordenadores.

Ponto, check-in, banco de horas, geolocalização e operações de campo ficam fora desta versão.

## 2. Princípios do sistema

- O sistema é a fonte oficial dos dados.
- Cada pessoa ou empresa possui um cadastro-mestre por campanha.
- CPF e CNPJ são identificadores de unicidade, mas as chaves internas usam UUID.
- Nenhum cadastro se torna válido sem conferência humana.
- Importações e leituras automáticas entram primeiro em uma área de preparação.
- Alterações relevantes mantêm versão, justificativa e auditoria.
- Documentos ficam em armazenamento privado.
- Permissões são garantidas pelo banco com RLS, não apenas pela interface.
- Dados de campanhas diferentes permanecem isolados.
- Exclusões normais são lógicas; o histórico é preservado.

## 3. Estrutura organizacional

```text
Campanha
  └── Eixo
      └── Cidade ou região administrativa
          └── Equipe ou grupo
              └── Trabalhador ou prestador
```

A cadeia de coordenação será:

```text
RH ou administração
  └── Coordenador de eixo
      └── Coordenador de cidade ou RA
          └── Coordenador de equipe ou grupo
              └── Trabalhador ou prestador
```

Nem toda campanha precisa utilizar todos os níveis.

### 3.1 Regras dos vínculos

- O trabalhador informa ou confirma seu coordenador direto.
- O coordenador de equipe informa seu coordenador de cidade.
- O coordenador de cidade informa seu coordenador de eixo.
- O coordenador de eixo é validado pelo RH ou administrador.
- Coordenadores devem ser selecionados entre cadastros existentes sempre que possível.
- Nome e telefone digitados livremente geram pendência de identificação.
- Cada vínculo possui início, fim, origem, status e responsáveis pela criação e validação.
- Mudanças de coordenador não apagam os vínculos anteriores.
- O sistema deve impedir autocoordenação e ciclos hierárquicos.

## 4. Cargos funções e perfis

O sistema deve separar **função de trabalho** de **perfil de acesso**.

### 4.1 Funções de trabalho configuráveis

Exemplos:

- cabo eleitoral;
- coordenador de equipe;
- coordenador de cidade;
- coordenador de eixo;
- supervisor;
- motorista;
- apoio administrativo;
- financeiro;
- jurídico;
- prestador de serviço PJ;
- outras funções cadastradas pela campanha.

Cada campanha poderá criar, editar, ordenar e inativar funções. A função poderá definir:

- nome e descrição;
- categoria;
- contratação PF ou PJ;
- jornada de referência, quando aplicável;
- faixa de remuneração;
- documentos exigidos;
- modelo contratual padrão;
- necessidade de coordenador;
- permissões operacionais associáveis;
- vigência e status.

Alterar uma função não modifica contratos ou vínculos históricos.

### 4.2 Perfis de acesso

- administrador;
- RH;
- coordenador de eixo;
- coordenador de cidade;
- coordenador de equipe;
- supervisor;
- financeiro;
- tesouraria;
- jurídico;
- auditor;
- contratado;
- outros perfis configuráveis.

Uma pessoa pode acumular perfis, respeitando segregação de funções e escopo territorial.

## 5. Gestão de pessoas

A área Gestão de Pessoas terá:

- lista com filtros;
- cadastro individual administrativo;
- geração de convite para autocadastro;
- importação de dados e documentos;
- validação cadastral;
- central de pendências;
- cadeia de coordenação;
- situação documental;
- situação contratual;
- situação de pagamento;
- histórico e auditoria.

### 5.1 Tipos de contratado

**Pessoa física**

- identificação pessoal;
- contatos;
- endereço;
- dados eleitorais;
- dados bancários;
- função e coordenação;
- documentos pessoais;
- vínculo e contrato.

**Pessoa jurídica**

- razão social e nome fantasia;
- CNPJ e inscrições aplicáveis;
- endereço e contatos;
- representante legal e CPF;
- dados bancários;
- objeto do serviço;
- documentos societários;
- contrato de prestação de serviço.

## 6. Autocadastro

O próprio contratado deverá inserir o máximo possível de seus dados e documentos. O cadastro somente terá validade após aprovação do gestor e, quando configurado, validação final do RH.

### 6.1 Fluxo

1. RH ou gestor gera convite individual.
2. O contratado acessa o link com token temporário.
3. Preenche o formulário por etapas.
4. Informa sua função, cidade, equipe e coordenador.
5. Envia os documentos exigidos.
6. Aceita a declaração de veracidade e o tratamento de dados.
7. Revê e envia o cadastro.
8. O sistema bloqueia o formulário e cria protocolo.
9. O gestor responsável recebe a pendência.
10. O gestor aprova, rejeita ou solicita correções específicas.
11. Quando exigido, o RH faz a validação final.
12. Somente então o cadastro recebe status validado.

### 6.2 Convite

O convite terá token imprevisível, prazo, campanha, destinatário, responsável, escopo e status. CPF, e-mail e telefone não devem aparecer na URL.

Status:

- criado;
- enviado;
- acessado;
- em preenchimento;
- concluído;
- expirado;
- cancelado.

### 6.3 Status cadastral

- rascunho;
- em preenchimento;
- documentos pendentes;
- enviado;
- aguardando gestor;
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

### 6.4 Correções

Depois do envio, somente os campos devolvidos pelo gestor serão reabertos. O sistema preservará valor anterior, valor novo, motivo, prazo, responsável e data.

## 7. Dados cadastrais

### 7.1 Identificação PF

- nome completo e nome social;
- CPF;
- nascimento;
- RG ou CNH;
- órgão, UF e data de expedição;
- filiação;
- nacionalidade, naturalidade e país de nascimento.

### 7.2 Contatos e endereço

- telefone, WhatsApp, telefone alternativo e e-mail;
- CEP, logradouro, número, complemento, bairro, cidade ou RA, estado e referência.

### 7.3 Dados eleitorais

- título;
- zona;
- seção;
- local, município e UF de votação.

### 7.4 Dados bancários

- banco e código;
- agência;
- conta, dígito e tipo;
- chave e tipo de PIX;
- titular e CPF do titular.

O PIX preferencial é o CPF do contratado. Divergência de titularidade exige análise.

### 7.5 Organização

- campanha;
- função;
- eixo;
- cidade ou RA;
- equipe;
- coordenador direto;
- telefone do coordenador;
- pessoa que indicou, quando aplicável.

Se o coordenador não estiver na lista, o nome e telefone poderão ser informados provisoriamente, criando a pendência **coordenador não identificado**.

## 8. Documentos

### 8.1 Tipos iniciais

- RG ou CNH;
- CPF separado, quando necessário;
- título eleitoral;
- comprovante de residência;
- comprovante bancário;
- documentos de PJ;
- contrato gerado;
- contrato assinado;
- certidões e outros tipos configuráveis.

### 8.2 Segurança

- aceitar somente formatos autorizados, inicialmente PDF, JPG e PNG;
- validar extensão, MIME e tamanho;
- usar buckets privados;
- usar nomes internos aleatórios;
- não expor CPF ou nome no caminho;
- calcular hash;
- detectar repetição;
- usar URLs assinadas de curta duração;
- auditar visualizações e downloads;
- preservar versões substituídas;
- permitir classificação como ilegível, divergente ou validado.

OCR poderá auxiliar a leitura, mas nunca validar ou alterar sozinho dados sensíveis.

## 9. Importação administrativa

Na Gestão de Pessoas haverá o botão **Importar dados e documentos**.

Opções:

- Excel;
- CSV;
- PDF com uma pessoa;
- PDF com várias pessoas;
- documento para complementar cadastro;
- documento para atualizar cadastro;
- documento apenas para vinculação.

### 9.1 Importação por planilha

1. O administrador baixa o modelo oficial ou envia outra planilha.
2. O sistema identifica e mapeia colunas.
3. Os dados entram em staging.
4. O sistema normaliza e valida cada linha.
5. Compara com a base-mestra.
6. Exibe prévia e conflitos.
7. O usuário corrige ou decide cada divergência.
8. Confirma o lote.
9. Os registros entram como aguardando validação.
10. O sistema gera relatório auditável.

Validar CPF, CNPJ, nome, telefone, e-mail, CEP, PIX, função, coordenador, eixo, cidade, equipe e duplicidades.

### 9.2 Importação por PDF

1. Guardar o original em área privada.
2. Detectar texto pesquisável ou imagem digitalizada.
3. Extrair texto ou aplicar OCR.
4. Identificar uma ou várias pessoas.
5. Separar os registros.
6. Comparar campos extraídos com cadastros existentes.
7. Exibir confiança e divergências.
8. Permitir criar, complementar, atualizar ou somente vincular.
9. Exigir confirmação humana.

PDF e OCR nunca atualizam diretamente CPF, CNPJ, banco, PIX, função, coordenador ou remuneração.

### 9.3 Lotes

Cada lote registra arquivo original, hash, versão do modelo, responsável, totais, erros, decisões, status e possibilidade de reversão. A reversão só será permitida antes de vínculos posteriores e exigirá auditoria.

Documentos compactados em ZIP ficam para uma etapa futura.

## 10. Validação pelo gestor

O gestor poderá:

- iniciar conferência;
- conferir dados e documentos;
- marcar documento como válido, ilegível ou divergente;
- solicitar documento substituto;
- reabrir campos específicos;
- aprovar;
- rejeitar com justificativa;
- encaminhar ao nível superior.

O gestor não pode excluir o cadastro, validar a si próprio ou acessar pessoas fora do seu escopo.

## 11. Painel do coordenador

Cada coordenador acessará somente seu grupo:

- coordenador de equipe: sua equipe;
- coordenador de cidade: equipes da cidade ou RA;
- coordenador de eixo: cidades e equipes do eixo;
- RH e administrador: campanha inteira.

### 11.1 Indicadores

- total de pessoas;
- cadastros completos e incompletos;
- percentual de completude;
- cadastros aguardando validação;
- documentos pendentes ou divergentes;
- contratos não gerados, não assinados ou em conferência;
- pagamentos pagos, parciais ou pendentes;
- pendências críticas.

### 11.2 Visão por pessoa

- status cadastral;
- campos ausentes;
- documentos e sua situação;
- contrato e assinatura;
- competência e situação do pagamento;
- coordenador, equipe, cidade e eixo;
- última atualização.

Valores financeiros somente serão mostrados a perfis autorizados. Dados bancários permanecem restritos. CPF, telefone e demais dados serão mascarados quando o acesso integral não for necessário.

### 11.3 Ações

- filtrar pendências;
- conferir documentos;
- solicitar correção;
- encaminhar ao nível superior;
- enviar lembrete;
- gerar relatório do próprio grupo.

## 12. Gestão de contratos

O sistema gerenciará contratos de pessoa física e contratos de prestação de serviço de pessoa jurídica.

### 12.1 Modelos

Usuários autorizados poderão enviar e versionar modelos por campanha, tipo de contratado e função. Cada modelo terá responsável, vigência, status e aprovação jurídica.

Exemplos de campos automáticos:

```text
{{nome_contratado}}
{{cpf}}
{{rg}}
{{endereco_completo}}
{{funcao}}
{{cidade}}
{{eixo}}
{{coordenador}}
{{data_inicio}}
{{data_fim}}
{{valor_contratado}}
{{razao_social}}
{{cnpj}}
{{representante_legal}}
```

### 12.2 Geração

1. Selecionar uma pessoa, grupo, equipe, cidade, eixo ou função.
2. Escolher o modelo compatível.
3. Informar condições específicas.
4. Verificar campos obrigatórios.
5. Gerar prévia.
6. Gerar um contrato individual por contratado.
7. Guardar modelo, versão e dados utilizados.

Alterações posteriores no modelo não modificam contratos já gerados.

### 12.3 Assinatura nesta versão

1. Contrato é gerado.
2. Contratado faz download.
3. Assina fora do sistema.
4. Envia o PDF assinado.
5. Gestor ou RH confere.
6. Contrato recebe status assinado e validado.

Assinatura digital integrada fica para uma versão futura.

### 12.4 Status contratual

- aguardando geração;
- gerado;
- disponível;
- baixado;
- aguardando assinatura;
- assinado enviado;
- em conferência;
- correção solicitada;
- assinado e validado;
- recusado;
- substituído;
- encerrado.

## 13. Despesas

O cadastro de despesa deverá conter:

- campanha, eixo, cidade e equipe;
- categoria, descrição e finalidade;
- fornecedor e documento;
- data e valores solicitado e autorizado;
- forma de pagamento;
- solicitante;
- responsável pela compra;
- pessoa que autorizou;
- nome e telefone do autorizador;
- cargo e alçada do autorizador;
- data, canal e protocolo da autorização;
- observações;
- nota fiscal, comprovante e fotografia;
- status.

### 13.1 Autorizador

O autorizador deve ser selecionado entre usuários habilitados. Nome e telefone serão preenchidos pelo cadastro-mestre. O sistema guardará uma fotografia histórica desses dados no momento da autorização.

Autorizador não identificado será permitido somente como exceção, com nome, telefone, justificativa, evidência e validação superior.

### 13.2 Segregação

Quando configurado:

- solicitante não autoriza a própria despesa;
- comprador não aprova sozinho o financeiro;
- beneficiário não confirma o próprio reembolso;
- exceções exigem justificativa e aprovação superior.

## 14. Pagamentos

O sistema separará:

- valor contratado;
- valor calculado;
- valor autorizado;
- valor pago;
- valor conciliado;
- saldo pendente.

O coordenador acompanha a situação de seu grupo, mas somente perfis financeiros autorizados podem criar, alterar, aprovar, conciliar ou visualizar dados bancários completos.

Status principais:

- em cálculo;
- pendente de aprovação;
- aprovado;
- PIX preparado ou enviado;
- PIX rejeitado;
- TED alternativo;
- pago parcialmente;
- pago;
- divergente;
- conciliado;
- estornado;
- cancelado.

## 15. Auditoria

Auditar criação, consulta sensível, download, upload, alteração, validação, rejeição, mudança de coordenação, contrato, importação, reversão, despesa, pagamento, exportação e configuração.

Cada evento registra ator, perfil, campanha, ação, entidade, estado anterior e posterior, motivo, data do servidor, request ID e, quando disponível, IP e dispositivo.

Usuários comuns não podem alterar ou excluir a auditoria.

## 16. Central de pendências

Consolidar:

- campos obrigatórios ausentes;
- documentos pendentes, ilegíveis ou divergentes;
- CPF, CNPJ, PIX ou dados bancários conflitantes;
- coordenador não identificado;
- validação atrasada;
- correção não respondida;
- contrato não gerado ou não assinado;
- importação com erros;
- despesa sem autorização;
- autorizador sem identificação;
- pagamento pendente ou divergente.

## 17. Relatórios

Filtros por campanha, período, eixo, cidade, equipe, coordenador, função, pessoa, PF ou PJ, cadastro, documento, contrato, despesa, pagamento, pendência e validação.

O resultado respeitará escopo e mascaramento. Exportação inicial poderá ser CSV; PDF e Excel formatados podem ser adicionados conforme prioridade.

## 18. Segurança e LGPD

- menor privilégio;
- RLS em todas as tabelas de domínio;
- funções sensíveis com autorização interna;
- buckets privados e URLs temporárias;
- nenhuma service role no navegador;
- nenhum segredo no GitHub;
- validação de upload;
- prevenção de IDOR e mass assignment;
- proteção contra duplicidade;
- mascaramento;
- retenção e arquivamento;
- auditoria imutável;
- consentimento e declaração versionados.

Qualquer credencial exposta em documento, histórico ou repositório deve ser revogada e substituída imediatamente.

## 19. Escopo excluído

Não implementar agora:

- ponto;
- check-in e check-out;
- jornada e banco de horas;
- geolocalização;
- atividades e relatórios de campo;
- assinatura digital integrada;
- importação ZIP de documentos;
- rastreamento contínuo;
- automações avançadas de OCR sem revisão.

## 20. Modelo de dados de referência

Reutilizar tabelas existentes e criar apenas o necessário para cobrir:

- campaigns;
- profiles, roles e profile_roles;
- job_functions;
- axes, cities e teams;
- people e legal_entities;
- contacts, addresses, bank_accounts e electoral_data;
- person_documents e document_versions;
- registration_invites e registration_submissions;
- correction_requests e field_reviews;
- organizational_assignments e coordination_relationships;
- import_batches, staging_records, row_errors e data_conflicts;
- contract_templates, template_versions, contracts e contract_documents;
- expenses, expense_documents, authorization_rules e expense_approvals;
- payments e reconciliation_matches;
- notifications e audit_logs.

Dinheiro deve ser armazenado em centavos inteiros. Toda tabela de domínio deve possuir campaign_id quando aplicável.

## 21. Critérios de aceite

### Pessoas e coordenação

- contratado preenche dados e documentos;
- cadastro enviado fica bloqueado;
- gestor correto recebe a pendência;
- coordenador de cidade está ligado ao eixo;
- vínculos possuem vigência;
- mudanças preservam histórico;
- acesso fora do grupo é impedido pelo banco.

### Importação

- Excel e PDF entram em staging;
- prévia mostra campos, confiança, erros e conflitos;
- duplicidades são detectadas;
- confirmação humana é obrigatória;
- lote é auditável e reversível dentro das regras.

### Contratos

- modelos são configuráveis e versionados;
- PF e PJ possuem modelos compatíveis;
- geração individual e em grupo funciona;
- contrato é preenchido com dados validados;
- download e upload assinado são auditados;
- gestor acompanha assinatura do grupo.

### Despesas e pagamentos

- despesa identifica autorizador, nome e telefone;
- alçada e segregação são verificadas;
- coordenador acompanha pagamento do grupo;
- dados financeiros completos permanecem restritos.

### Segurança

- RLS testada;
- documentos privados;
- credenciais ausentes do código e dos documentos;
- auditoria protegida;
- typecheck, lint e build aprovados;
- testes de acesso horizontal realizados.

## 22. Ordem de implementação

1. Remover credenciais expostas e revisar pendências críticas de segurança.
2. Consolidar cargos configuráveis e perfis de acesso.
3. Finalizar cadeia hierárquica e painel do coordenador.
4. Consolidar autocadastro, correção por campo e validação do gestor/RH.
5. Finalizar importação Excel com staging e relatórios.
6. Implementar ingestão de PDF com revisão humana.
7. Implementar modelos e geração de contratos PF/PJ.
8. Implementar download, upload e validação do contrato assinado.
9. Consolidar despesas com autorizador e alçadas.
10. Consolidar pagamentos e visibilidade por grupo.
11. Revisar relatórios, auditoria, RLS e testes ponta a ponta.

## 23. Instruções para o Claude Code

Antes de modificar o sistema:

1. leia AGENTS.md, CLAUDE.md, README.md e este documento;
2. inspecione o código, banco e migrações existentes;
3. trate o banco atual como produção;
4. não recrie funcionalidades já implementadas;
5. compare cada requisito com o estado real;
6. produza uma matriz: existente, parcial, ausente ou conflitante;
7. corrija primeiro os riscos de segurança;
8. implemente em migrações aditivas e etapas pequenas;
9. não use dados reais nos testes;
10. não implemente ponto ou operações;
11. execute typecheck, lint, build e testes de RLS;
12. registre decisões, riscos e pendências no README.

Ao final de cada etapa, informar arquivos alterados, migrações, políticas, testes, build, riscos e próxima etapa.

---

## 24. Resultado esperado

A nova versão deve permitir que a campanha cadastre e valide pessoas e empresas, organize a cadeia de coordenação, importe dados com segurança, administre documentos e contratos, controle despesas e pagamentos e dê a cada gestor uma visão confiável do seu grupo, mantendo privacidade, segregação de funções e auditoria completa.
