# Leandro Desk

Escritório virtual pessoal para organizar tarefas, clientes, projetos, propostas, agenda, financeiro e tempo.
Construído em etapas, seguindo o guia `leandro-desk-guia-implementacao.md`.

## Executar

```bash
npm install
npm run dev      # desenvolvimento (http://localhost:5173)
npm run build    # build de produção em dist/
npm run preview  # servir o build localmente
```

## Estado atual (guia: commits 02–07)

- Base Vite + React + JavaScript, `.env.example` sem segredos.
- Tokens de design em `src/styles/tokens.css`.
- Layout de três colunas responsivo (desktop 20/55/25; tablet e celular: menu em gaveta e painel direito empilhado).
- Componentes: Button, Card, StatusBadge, Dialog, Input/Select, estados vazio/carregando/erro.
- Dashboard com **dados de demonstração** isolados em `src/dev/fixtures.js` (não são dados reais).
- Navegação por hash (`#/tarefas`) e botão "Criar". Módulos ainda não construídos mostram "A implementar".

## Próximos commits

08 Firebase (config segura) · 09 Autenticação e regras · 10 Tarefas (CRUD) · 11 Clientes · 12 Projetos.
Ao chegar no 10, o dashboard deixa de ler `src/dev/fixtures.js` e passa a consumir o serviço de tarefas.

## Segurança

Nunca coloque chaves privadas ou credenciais administrativas no frontend. A configuração pública do Firebase não substitui as regras do Firestore.
