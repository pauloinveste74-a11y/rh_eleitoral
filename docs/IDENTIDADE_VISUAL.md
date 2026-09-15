# Identidade visual — RH Eleitoral

> Fonte: `docs/MANUAL_IDENTIDADE_VISUAL_RH_ELEITORAL_FINAL.docx` (Agilize
> Tecnologia Ltda., v1.0). Documento em `.docx`; texto completo extraído e
> conferido diretamente (não há conversor de `.docx` no ambiente — extração
> feita via `unzip` + leitura do XML). Este arquivo é o acompanhamento de
> progresso, no mesmo espírito de `docs/NOVA_VERSAO_MATRIZ.md`.

## Resumo do manual

Marca: brasão (escudo + "A" + linha ascendente + circuito) em azul-marinho
e dourado, de Agilize Tecnologia Ltda. Direção: "profissional, sofisticada,
confiável, orientada à gestão" — o produto deve parecer plataforma
empresarial, não peça de campanha.

**Paleta institucional**: Azul Agilize `#0A2947` (dominante), Dourado
Precisão `#B7943E` (só detalhe, nunca área grande), Grafite Gestão
`#4B5158`, Marfim `#F7F6F1`, Branco `#FFFFFF`.

**Paleta funcional** (estado, fundo suave + texto sólido): Informação
`#2E6DA4`/`#EAF2F8`, Sucesso `#19795A`/`#E8F5EF`, Atenção `#B56816`/`#FFF3E2`,
Erro `#B93B45`/`#FCECEF`, Neutro `#5F6872`/`#F0F2F4`.

**Tipografia**: Manrope (títulos, 600–700) + Inter (corpo, 400–600).
Números tabulares em tabelas financeiras.

**Componentes**: botão 40px, campo 44px/raio 8px, cartão raio 12px,
tabela com linhas de 48px, badge sempre com ícone+rótulo+cor (nunca só
cor), sidebar 240px (72px recolhida) azul-marinho.

Seção 12 do manual já traz os tokens prontos (`--brand-navy`,
`--state-success` etc.) como "fonte técnica de verdade" — usados aqui
literalmente, mesmos nomes/valores.

## Fase 1 — fundação (aplicada nesta etapa)

Escopo: tokens + tipografia + os 7 componentes de `src/components/ui/*`
(usados por praticamente toda tela do sistema) + navegação + login.
Modo escuro **não foi redesenhado** — o próprio manual pede pra só fazer
isso depois do modo claro homologado (seção 12.1); as classes `dark:`
existentes (paleta slate) continuam como estavam.

- `src/app/globals.css`: todos os tokens da seção 12 do manual como
  custom properties + mapeados em `@theme inline` (Tailwind 4) — geram
  utilitários (`bg-brand-navy`, `text-state-success`, `rounded-field`,
  `rounded-card`, `shadow-card`, `font-heading` etc.) usáveis em
  qualquer componente, sem repetir hex solto (exigência da seção 12.1).
- `src/app/layout.tsx`: fontes trocadas de Geist para Manrope (títulos)
  + Inter (corpo) via `next/font/google`; `viewport.themeColor` e
  `public/manifest.webmanifest` alinhados ao azul-marinho da marca.
- `src/components/ui/*.tsx` (button, card, badge, input, select, label,
  table): reskinados com os tokens — botão primário azul-marinho,
  secundário com borda azul-marinho, campo 44px/raio 8px, cartão raio
  12px + sombra da marca, **badge com a paleta funcional exata do
  manual** (afeta todo status já exibido no sistema — cadastro,
  documento, contrato, despesa, pagamento — sem precisar editar os
  mapas `STATUS_VARIANT` de cada tela, que já usam os mesmos nomes de
  variante), tabela com cabeçalho em tom azul suave.
- `src/components/layout/*` (app-shell, sidebar-nav, nav-link, topbar,
  mobile-nav, page-header): barra lateral azul-marinho 240px (seção
  6.1), item ativo com friso dourado discreto (seção 3.2, "dourado só
  em detalhe"), topo 64px, título de página em Manrope 28px.
- `src/app/login/page.tsx`: fundo azul-marinho, cartão branco central,
  assinatura institucional "Agilize Tecnologia Ltda. · @agilizetecnologia"
  no rodapé (seções 8 e 11.1).
- **Verificado visualmente**: screenshot real do `/login` (Chrome
  headless local, build de produção) confirma que os tokens compilam e
  renderizam como esperado — fundo azul-marinho, cartão branco,
  tipografia, botão. Não foi possível screenshot de tela autenticada
  nesta sessão (sem credencial válida à mão — login de teste falhou,
  não insisti); recomenda-se conferência visual do usuário em
  `/painel`, `/pessoas` e `/validacoes` após o deploy.
- `npm run typecheck`/`lint`/`build` — sem erros nem avisos.

## Fase 2 — pendente (fora de escopo desta etapa)

- **Logo vetorial**: o próprio manual diz que "a arte conceitual
  aprovada deve ser redesenhada em vetor antes do uso definitivo"
  (seção 14) — a imagem embutida no `.docx` é um mockup, não um SVG
  final. Não tentei vetorizar o brasão (risco alto de sair errado sem
  um designer); favicon/logo continuam como estão até existir o SVG.
- **~60 arquivos de tela** ainda usam classes `slate-*` soltas
  diretamente (em vez de só herdar dos componentes de `src/components/ui`)
  — normalizar cada um é o próximo passo natural, mas é troca de
  conteúdo tela a tela, não fundação; ficou de fora pra manter esta
  etapa revisável.
- **Sidebar recolhida (72px)**: o manual prevê os dois estados; só o
  estado aberto (240px) foi implementado — recolher exigiria estado
  (toggle) novo, é feature de interação, não só visual.
- **Modo escuro de marca**: propositalmente adiado (instrução do
  próprio manual).
- **Ícones**: manual pede biblioteca única Lucide com traço 1,75–2px —
  o projeto já usa só Lucide, então já atende; não há padronização de
  espessura/tamanho (16/20/24px por contexto) feita tela a tela ainda.
- **Gráficos**: paleta de série (`#0A2947`, `#2E6DA4`, `#B7943E`,
  `#19795A`, `#7B8794`) — o sistema hoje não tem nenhum gráfico
  implementado (dashboard usa só KPIs numéricos), então não há onde
  aplicar ainda.
- **Relatórios/documentos** (seção 11): capa com brasão, cabeçalho
  preto, rodapé institucional — os exports atuais são CSV puro, sem
  layout visual a aplicar.
- **Checklist de aprovação visual** (seção 13) — vale revisar com o
  usuário depois que a Fase 2 avançar.
