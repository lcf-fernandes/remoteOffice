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
| 08 | `feat: configure Firebase client services` | ✅ código · ✅ projeto Firebase criado (`remote-office-e73ae`) · ⏳ configuração local e serviços (ver PENDING.md) |
| 09 | `feat: add secure authentication and private workspace` | ✅ código · ⏳ regras não publicadas, não testadas no emulador |
| 10 | `feat: implement task management CRUD` | ✅ código · ⏳ não testado com o Firebase real |
| 11–23 | Demais módulos, dashboard real, segurança, polimento, publicação | ⏳ |

> Os commits 02–07 foram criados juntos a partir de uma mesma base; commits intermediários podem não compilar isoladamente. O estado de cada commit a partir do 08 foi validado com `npm run build`.

---

## Commits 02–07 — Base, visual, layout e navegação

- **O que foi feito:** projeto Vite + React + JavaScript; tokens de design (`src/styles/tokens.css`); componentes (Button, Card, StatusBadge, Dialog nativo, Input/Select, estados vazio/carregando/erro); layout de três colunas responsivo (20/55/25 no desktop; gaveta + painel empilhado em telas menores); dashboard com dados de demonstração em `src/dev/fixtures.js`; navegação por hash (`#/tarefas`) e botão "Criar".
- **Limitações conhecidas:** os módulos além do dashboard mostram "A implementar"; "Criar" abre um aviso, não um formulário; atalhos externos e notas rápidas são só marcadores; o dashboard usa dados fictícios.
- **Como testar:** `npm install && npm run dev`; redimensione a janela (desktop/tablet/celular); navegue pelo menu; clique em "Criar".

## Commit 08 — Firebase (código)

- **O que foi feito:** `src/services/firebase.js` inicializa Auth e Firestore a partir de `VITE_FIREBASE_*`; se faltar variável, o app não quebra e informa quais faltam; `.env.example` sem valores; `docs/FIREBASE.md` com o passo a passo.
- **Projeto Firebase:** criado em 2026-10-09 (`remote-office-e73ae`), app Web registrado.
- **Não feito:** preencher o `.env` local, ativar Authentication e criar o Firestore (ações manuais — ver [PENDING.md](PENDING.md)).
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

## Commit 10 — Tarefas (CRUD)

- **O que foi feito:**
  - Módulo **Tarefas** (`#/tarefas`): criar, listar, visualizar (detalhe), editar, concluir/reabrir e excluir (com confirmação).
  - Campos: título (obrigatório), descrição, status, prioridade, prazo, categoria e tags.
  - Visões: Abertas, Hoje, Próximas, Atrasadas, Concluídas, Todas; filtros por status e prioridade; busca por título, descrição, categoria e tags.
  - Estados de carregamento, erro (com "Tentar de novo") e lista vazia; erros de rede/permissão/documento inexistente com mensagens em português.
  - Dados em `users/{uid}/tasks/{id}` com atualização em tempo real (uma única assinatura compartilhada por todas as telas).
  - O **dashboard** e a lista "Hoje" do painel esquerdo agora leem as tarefas reais (mesmo serviço, sem cópias). O botão "Criar → Nova tarefa" abre o formulário real.
  - Regras do Firestore: removida a regra genérica de subcoleções; `tasks` tem regra própria com validação (título, status, prioridade, campos permitidos). Subcoleções não listadas ficam negadas.
  - Testes de lógica (`npm test`, 15 casos, **executados e passando**) e novos casos nas regras (`npm run test:rules`, **não executados**).
- **Não feito:**
  - Vínculo com cliente/projeto: os campos `clientId`/`projectId` existem (valor `null`) mas não há seletor até os commits 11 e 12.
  - Nenhum teste de interface automatizado.
- **Como testar (com Firebase configurado e regras publicadas):** crie uma tarefa; recarregue a página (ela deve continuar); edite; conclua e reabra; filtre por visão, status, prioridade e busca; exclua (confirmação); confira o dashboard e "Hoje". Tente salvar sem título (erro no campo). Em outra conta, as tarefas não aparecem.
- **Atenção:** republique `firestore.rules` no console (a versão anterior permitia qualquer escrita em subcoleções do próprio usuário).
