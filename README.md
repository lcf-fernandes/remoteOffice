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

## Estado atual (guia: commits 02–19)

- Base Vite + React + JavaScript, `.env.example` sem segredos.
- Tokens de design em `src/styles/tokens.css`.
- Layout de três colunas responsivo (desktop 20/55/25; tablet e celular: menu em gaveta e painel direito empilhado).
- Componentes: Button, Card, StatusBadge, Dialog, Input/Select, estados vazio/carregando/erro.
- Dashboard e painéis laterais com **dados reais** do Firestore.
- Navegação por hash (`#/tarefas`) e botão "Criar". Rotas desconhecidas mostram "Página não encontrada".
- **Modelos de projeto** (padrão e próprios, com revisão e confirmação antes de criar) e **alertas internos** configuráveis no dashboard (prazos, atrasos e follow-ups, sem repetição).
- **Contextos** (Hoje, Desenvolvimento, Edição, Comercial) e **Configurações** (tema claro/escuro, moeda, formato de data, início da semana, blocos do dashboard, atalhos externos), salvos na conta.
- Módulo **Notas** (notas com tags e vínculos, registro de trabalho "feito/bloqueios/próximo passo", captura rápida na lateral, aviso de alterações não salvas).
- Módulo **Tempo** (cronômetro único com início do servidor, registros ajustáveis com histórico, relatórios por dia/tarefa/projeto/categoria).
- Módulo **Financeiro** (receitas e despesas, totais separados por moeda, vencido calculado e explicado; sem processar pagamentos).
- Módulo **Comercial** (propostas, histórico de status, follow-up configurável, aceite com vínculo a projeto).
- Módulo **Agenda** (eventos, lista cronológica, calendário mensal, prazos de tarefas e projetos).
- Módulo **Projetos** (lista e Kanban, marcos, diário, progresso calculado) ligado a clientes e tarefas.
- Módulo **Clientes** com histórico de interações e tarefas vinculadas.
- Módulo **Tarefas** com CRUD completo, filtros e busca; o dashboard lê as tarefas reais.
- Login por e-mail/senha com Firebase, sessão persistente, logout e regras do Firestore (`firestore.rules`). **Requer o Firebase configurado** — veja `docs/PENDING.md`.

## Firebase

Configuração em `src/services/firebase.js` (variáveis `VITE_FIREBASE_*`). Passo a passo e avisos de segurança em [`docs/FIREBASE.md`](docs/FIREBASE.md).

## Próximos commits

20–23 Revisão, segurança, polimento e publicação. Lista completa em `docs/PENDING.md`.

## Segurança

Nunca coloque chaves privadas ou credenciais administrativas no frontend. A configuração pública do Firebase não substitui as regras do Firestore.
