# Histórico de desenvolvimento

Registro de cada etapa do guia `leandro-desk-guia-implementacao.md`. Atualize este arquivo **no mesmo commit** de cada etapa nova.

Legenda: ✅ feito · ⏳ pendente (ver [PENDING.md](PENDING.md))

| Guia | Commit | Status |
|---|---|---|
| 01 | Inspeção do repositório | ✅ (repositório estava vazio; nada a inspecionar — decisões em [DECISIONS.md](DECISIONS.md)) |
| 02 | `chore: prepare project foundation` | ✅ |
| 03 | `style: establish design tokens and visual foundation` | ✅ |
| 05 | `feat: add reusable accessible UI components` | ✅ |
| 04 | `feat: add responsive three-column workspace shell` | ✅ |
| 06 | `feat: build dashboard overview with development fixtures` | ✅ |
| 07 | `feat: add module navigation and quick actions` | ✅ |
| 08 | `feat: configure Firebase client services` | ✅ código · ⏳ projeto Firebase ainda não criado |
| 09 | `feat: add secure authentication and private workspace` | ✅ código · ⏳ regras não publicadas, não testadas no emulador |
| 10–23 | Módulos, dashboard real, segurança, polimento, publicação | ⏳ |

> Os commits 02–07 foram criados juntos a partir de uma mesma base; commits intermediários podem não compilar isoladamente. O estado de cada commit a partir do 08 foi validado com `npm run build`.

---

## Commits 02–07 — Base, visual, layout e navegação

- **O que foi feito:** projeto Vite + React + JavaScript; tokens de design (`src/styles/tokens.css`); componentes (Button, Card, StatusBadge, Dialog nativo, Input/Select, estados vazio/carregando/erro); layout de três colunas responsivo (20/55/25 no desktop; gaveta + painel empilhado em telas menores); dashboard com dados de demonstração em `src/dev/fixtures.js`; navegação por hash (`#/tarefas`) e botão "Criar".
- **Limitações conhecidas:** os módulos além do dashboard mostram "A implementar"; "Criar" abre um aviso, não um formulário; atalhos externos e notas rápidas são só marcadores; o dashboard usa dados fictícios.
- **Como testar:** `npm install && npm run dev`; redimensione a janela (desktop/tablet/celular); navegue pelo menu; clique em "Criar".

## Commit 08 — Firebase (código)

- **O que foi feito:** `src/services/firebase.js` inicializa Auth e Firestore a partir de `VITE_FIREBASE_*`; se faltar variável, o app não quebra e informa quais faltam; `.env.example` sem valores; `docs/FIREBASE.md` com o passo a passo.
- **Não feito:** criar o projeto Firebase e preencher o `.env` (ação manual — ver [PENDING.md](PENDING.md)).
- **Como testar:** sem `.env`, a tela mostra "Firebase não configurado".

## Commit 09 — Autenticação e dados privados

- **O que foi feito:**
  - Login com e-mail/senha, "Esqueci a senha" (mensagem neutra, não revela se o e-mail existe), logout e sessão persistente (padrão do Firebase na web).
  - `AuthProvider` com estados: não configurado, verificando sessão, deslogado, logado, erro. O app só aparece para usuário autenticado.
  - Perfil mínimo em `users/{uid}` (e-mail, nome, preferências `locale`/`currency`/`theme`, datas), criado no primeiro login. Não há campo de papel/admin.
  - `firestore.rules`: negado por padrão; cada usuário acessa só `users/{seuUid}` e subcoleções; perfil valida campos permitidos (`role` etc. são rejeitados).
  - `firebase.json` (regras + portas do emulador) e `tests/firestore.rules.test.js` (6 casos).
- **Não feito / não verificado:**
  - As regras **não foram executadas** no emulador (o ambiente de desenvolvimento não tinha acesso para baixá-lo). Rode `npm run test:rules` antes de publicá-las.
  - As regras **não foram publicadas** no Firebase.
  - Não há cadastro público: o usuário é criado manualmente no console (uso pessoal).
- **Como testar:** com o Firebase configurado, entre com o usuário criado no console; recarregue (a sessão deve continuar); clique em "Sair" (volta ao login); teste senha errada e "Esqueci a senha".
