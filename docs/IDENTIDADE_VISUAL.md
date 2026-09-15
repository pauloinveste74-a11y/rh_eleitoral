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

## Fase 2 — telas de conteúdo (aplicada nesta etapa)

Escopo: os ~44 arquivos que ainda usavam classes `slate-*` soltas em vez
de só herdar dos componentes de `src/components/ui/*` (a Fase 1 já
cobria a fundação — componentes-base, navegação, login).

Feito com um script (`reskin.mjs`, descartado depois de usado — não faz
parte do repo) em vez de edição manual arquivo a arquivo, dado o volume
(167 trocas em 44 arquivos): percorre todo `.tsx` sob `src/`, entra em
cada string de classe (`className="..."`) e troca só os tokens de modo
**claro** — qualquer token que comece com `dark:` fica intocado, mesmo
dentro da mesma string (ex.: `"text-slate-500 dark:text-slate-400"` vira
`"text-brand-graphite dark:text-slate-400"`). Mesmo princípio da Fase 1:
modo escuro propositalmente fora de escopo (manual, seção 12.1).

Mapeamento aplicado (modo claro):

| Classe antiga | Token novo |
| --- | --- |
| `text-slate-900`/`950` | `text-brand-navy` |
| `text-slate-600`/`500` | `text-brand-graphite` |
| `text-slate-400` | `text-brand-graphite/60` |
| `border-slate-200`/`300`/`100` | `border-border-default` |
| `hover:border-slate-300`/`400` | `hover:border-state-info` |
| `bg-slate-100` | `bg-state-neutral-soft` |
| `bg-slate-50` | `bg-surface-page` |
| `bg-slate-900` (texto solto, não em `dark:`) | `bg-brand-navy` |
| `ring-slate-950` (`focus-visible:ring-slate-950`) | `ring-state-info` |

- **Verificado**: `npm run typecheck`/`lint`/`build` sem erros nem
  avisos; `git diff --stat` conferido arquivo a arquivo (167
  inserções/167 remoções — troca 1:1, nenhuma linha estrutural tocada);
  screenshot do `/login` repetido depois da troca pra confirmar que a
  fundação da Fase 1 não regrediu (arquivo idêntico, não fazia parte do
  escopo desta etapa). Não foi possível screenshot de tela autenticada
  de novo (mesma limitação de credencial da Fase 1) — recomenda-se
  conferência visual do usuário em `/painel`, `/pessoas`, `/despesas`,
  `/validacoes` e `/contratos` depois do deploy.

## Fase 3 — sidebar recolhida, ícones e números tabulares (aplicada nesta etapa)

- **Sidebar recolhida (72px)**: os dois estados que o manual prevê
  (seção 6.1) agora existem — botão de recolher/expandir no rodapé da
  barra lateral, ícone `PanelLeftClose`/`PanelLeftOpen` (Lucide). Modo
  recolhido: só os ícones (20px, centralizados), rótulo vira tooltip
  nativo (`title`) + texto continua acessível a leitor de tela
  (`sr-only`) em vez de sumir de vez. Preferência salva em
  `localStorage` (é conveniência de dispositivo, não dado do usuário no
  banco) via `useSyncExternalStore` — evita o mismatch de hidratação e
  a cascata de re-render que o `set-state-in-effect` do lint do projeto
  rejeitaria com `useState`+`useEffect` comuns.
  `src/components/layout/sidebar-collapse-store.ts` (novo),
  `app-shell.tsx`/`sidebar-nav.tsx`/`nav-link.tsx` atualizados.
- **Ícones**: auditoria mostrou que a maior parte já batia com a regra
  de tamanho por contexto do manual (seção 9.1 — 16px campo/20px
  navegação/24px ação destacada) só de ter seguido o mesmo critério
  nos componentes de layout da Fase 1. Ajuste real: os três ícones de
  ação do topo (`Meu cadastro`/`Minha conta`/`Sair`, `topbar.tsx`)
  estavam em 16px, subiram pra 20px — são navegação primária, mesmo
  peso visual do menu lateral.
- **Números tabulares** (seção 5.2): `font-variant-numeric:
  tabular-nums` aplicado centralizadamente no componente `Table` (afeta
  toda tabela do sistema de uma vez, sem risco — só muda a largura dos
  dígitos, inofensivo em célula só com texto). Colunas de valor
  monetário (`despesas`, `despesas/alcadas`, `financeiro`,
  `relatorios/financeiro`) alinhadas à direita (seção 7.2, "alinhar
  valores à direita").
- **Verificado**: `npm run typecheck`/`lint`/`build` sem erros nem
  avisos (inclusive corrigindo de cara um erro real do lint
  `react-hooks/set-state-in-effect` na primeira versão da sidebar
  recolhida). Não foi possível screenshot de tela autenticada de novo
  (mesma limitação de credencial das fases anteriores) — a sidebar
  recolhida em particular só dá pra conferir de verdade logado; peço
  que você teste o botão de recolher em `/painel` depois do deploy.

## Fase 4 — logo vetorial e ícone em todo badge de status (aplicada)

- **Logo vetorial** (`src/components/layout/brand-mark.tsx`,
  `src/app/icon.svg`, `public/icon.svg`): desenho novo, geométrico e
  plano, seguindo literalmente a descrição do manual (seção 2.1: escudo
  + letra A + linha ascendente + circuito) — não é uma tentativa de
  recriar o mockup 3D do `.docx` (o próprio manual pede simplificação
  pra versão vetorial, seção 14). Favicon vem automaticamente do
  `src/app/icon.svg` (convenção do Next.js); `public/icon.svg` é a
  cópia usada no `manifest.webmanifest` (ícone de PWA).
  - **Achado durante a verificação visual**: a versão padrão (metade
    azul-marinho / metade dourada) fica com a metade azul-marinho
    **invisível** num fundo também azul-marinho (mesma cor, sem
    contraste) — exatamente o caso que o manual previu com a variante
    "Negativa" (seção 2.1: "fundos azul-marinho... branco com dourado
    opcional"). `BrandMark` ganhou `variant="negative"` (escudo branco,
    "A" azul-marinho) usada no `/login`; a variante padrão continua no
    cabeçalho (fundo branco, sem esse problema). Confirmado com
    screenshot antes e depois da correção.
- **Ícone em todo badge de status** (seção 13 do checklist): em vez de
  mapear ~50 strings de status por tela (volume da Fase 2, alto risco
  de escolha errada de ícone por status), o componente `Badge` passou a
  escolher um ícone **por variante** automaticamente
  (`success`→`CheckCircle2`, `warning`→`AlertCircle`,
  `destructive`→`XCircle`, `info`→`Info`, `secondary`→`Circle`) —
  como toda tela já reduz o status pra uma dessas variantes, o sistema
  inteiro ganha ícone de uma vez, sem tocar nas ~11 telas que têm seu
  próprio mapa de status. Pode ser desligado por badge (`showIcon={false}`)
  ou trocado (`icon={OutroIcone}`) quando não servir.
- **Verificado**: `npm run typecheck`/`lint`/`build` sem erros nem
  avisos. Não foi possível screenshot de badge em tela autenticada
  (mesma limitação de credencial) — o logo foi verificado visualmente
  (antes/depois do achado da variante negativa); o ícone do badge foi
  conferido só por leitura de código + build, recomendo conferência
  visual do usuário nas telas de `/validacoes`, `/despesas` ou
  `/contratos`.

## Checklist de aprovação visual (seção 13 do manual) — status honesto

| Item do checklist | Status |
| --- | --- |
| Marca aplicada na versão correta e com área de proteção | 🟢 Logo vetorial (Fase 4) — padrão e negativa; falta a "área de proteção" formal (espaçamento mínimo ao redor) em uso livre, hoje só implícito |
| Somente cores previstas neste manual | 🟢 Modo claro, sim (Fases 1–2). Modo escuro segue com a paleta slate anterior, de propósito |
| Títulos e corpo seguem a hierarquia tipográfica | 🟢 Manrope/Inter, `PageHeader` em 28px |
| A ação principal está evidente e não há competição entre botões | 🟡 O componente `Button` distingue primário/secundário/destrutivo; não auditei tela a tela se cada formulário usa só uma ação primária |
| Status tem rótulo, ícone e cor acessível | 🟢 Rótulo+cor+ícone (Fase 4) — automático por variante do `Badge` |
| Campos possuem rótulos, ajuda, erro e foco visível | 🟡 Rótulo/erro/foco sim; nem todo campo tem texto de ajuda |
| Tabelas mantêm alinhamento numérico, filtros e leitura em telas menores | 🟢 Números tabulares + valores à direita (Fase 3); tabelas já eram roláveis horizontalmente |
| Dados pessoais aparecem mascarados conforme o contexto | 🔴 Auditado agora: CPF aparece sempre por extenso (`formatCpf()` só formata, nunca mascara) em pelo menos 11 arquivos (`/pessoas`, `/meu-cadastro`, `/cadastro/[token]`, `/validacoes`, relatórios etc.). É comportamento de dado com implicação de segurança (quem pode revelar, ação auditada), não um ajuste visual — não implementado aqui de propósito |
| A interface funciona por teclado e com zoom de 200% | ⚪ Não testado interativamente; auditoria de código: todo controle usa elemento nativo (`<button>`/`<a>`/campo de formulário, não `<div onClick>`), e o foco visível (`focus-ring`) é centralizado nos componentes-base desde a Fase 1 — mas isso não substitui um teste de verdade |
| Login, dashboard, pessoa, despesas, relatórios revisados | 🟢 Revisados nas Fases 1–4 ("Central de IA" do manual não existe no sistema, é feature futura fora de escopo) |

## Pendente (fora de escopo até aqui)

- **Modo escuro de marca**: propositalmente adiado — o manual pede
  explicitamente pra só fazer isso depois do modo claro homologado
  (seção 12.1), e essa aprovação é decisão de quem é dono da marca, não
  algo que eu decida sozinho.
- **Mascaramento de dado pessoal** (seção 7.1/18): achado real, CPF
  sempre visível por extenso — é feature de segurança/UX (precisa de
  desenho: quem revela, se fica registrado em auditoria), não um ajuste
  de CSS. Fica como próxima etapa a decidir com o usuário.
- **Gráficos**: paleta de série já documentada (seção 9.2), mas o
  sistema não tem nenhum gráfico implementado ainda — nada a aplicar.
- **Relatórios/documentos com layout visual** (seção 11): capa com
  brasão, cabeçalho preto, rodapé institucional — os exports atuais são
  CSV puro; um layout de verdade precisa de geração de PDF, que é uma
  capacidade nova (biblioteca), não CSS.
- **Teclado/zoom 200%**: só auditado por leitura de código (ver
  checklist acima), nunca testado interativamente de fato.
- **"Área de proteção" da marca**: o espaçamento mínimo ao redor do
  brasão (metade da largura do "A", seção 2.2) não é imposto
  estruturalmente em nenhum lugar — hoje depende de quem usa `BrandMark`
  dar espaço suficiente.
