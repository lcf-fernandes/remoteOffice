# Leandro Desk

Escritório virtual pessoal para organizar tarefas, clientes, projetos, propostas, agenda, financeiro e tempo.
Construído em etapas, seguindo o guia `leandro-desk-guia-implementacao.md`.

## Executar

```bash
npm install
npm run dev      # desenvolvimento (http://localhost:5173)
npm run build    # build de produção em dist/
npm run preview  # servir o build localmente
npm test         # testes de lógica (sem Firebase)
npm run test:rules  # testes das regras do Firestore (emulador; requer Java)
```

## Documentação

- [`docs/PROGRESS.md`](docs/PROGRESS.md) — o que foi feito em cada commit e como testar
- [`docs/PENDING.md`](docs/PENDING.md) — o que ainda falta (inclui criar e configurar o Firebase)
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — decisões técnicas
- [`docs/FIREBASE.md`](docs/FIREBASE.md) — configuração do Firebase

## Estado atual (guia: commits 02–14)

- Base Vite + React + JavaScript, `.env.example` sem segredos.
- Tokens de design em `src/styles/tokens.css`.
- Layout de três colunas responsivo (desktop 20/55/25; tablet e celular: menu em gaveta e painel direito empilhado).
- Componentes: Button, Card, StatusBadge, Dialog, Input/Select, estados vazio/carregando/erro.
- Dashboard com **dados de demonstração** isolados em `src/dev/fixtures.js` (não são dados reais).
- Navegação por hash (`#/tarefas`) e botão "Criar". Módulos ainda não construídos mostram "A implementar".
- Módulo **Comercial** (propostas, histórico de status, follow-up configurável, aceite com vínculo a projeto).
- Módulo **Agenda** (eventos, lista cronológica, calendário mensal, prazos de tarefas e projetos).
- Módulo **Projetos** (lista e Kanban, marcos, diário, progresso calculado) ligado a clientes e tarefas.
- Módulo **Clientes** com histórico de interações e tarefas vinculadas.
- Módulo **Tarefas** com CRUD completo, filtros e busca; o dashboard lê as tarefas reais.
- Login por e-mail/senha com Firebase, sessão persistente, logout e regras do Firestore (`firestore.rules`). **Requer o Firebase configurado** — veja `docs/PENDING.md`.

## Firebase

Configuração em `src/services/firebase.js` (variáveis `VITE_FIREBASE_*`). Passo a passo e avisos de segurança em [`docs/FIREBASE.md`](docs/FIREBASE.md).

## Próximos commits

10 Tarefas (CRUD) · 11 Clientes · 12 Projetos. Lista completa em `docs/PENDING.md`.
Ao chegar no 10, o dashboard deixa de ler `src/dev/fixtures.js` e passa a consumir o serviço de tarefas.

## Segurança

Nunca coloque chaves privadas ou credenciais administrativas no frontend. A configuração pública do Firebase não substitui as regras do Firestore.
