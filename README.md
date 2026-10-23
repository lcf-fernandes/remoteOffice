# Leandro Desk

Escritório virtual pessoal para freelancer: tarefas, clientes, projetos, propostas, agenda, financeiro, tempo, notas e um dashboard com alertas. Uso individual (um usuário, criado manualmente no Firebase), em português do Brasil.

**Stack:** React 18 + Vite 5 (JavaScript) · Firebase Authentication (e-mail/senha) · Cloud Firestore · hospedagem estática (testado na Vercel).

> Este projeto foi construído em etapas a partir do guia `leandro-desk-guia-implementacao.md`. O estado de cada etapa está em [`docs/PROGRESS.md`](docs/PROGRESS.md).

## Colocar para funcionar do zero

Você precisa de: **Node.js 18 ou superior** (testado com a versão 22), Git e uma conta Google para o Firebase.

**1. Baixar e instalar**
```bash
git clone https://github.com/lcf-fernandes/remoteOffice.git
cd remoteOffice
npm install
```

**2. Criar o projeto no Firebase** (console.firebase.google.com) — passo a passo detalhado em [`docs/FIREBASE.md`](docs/FIREBASE.md):
1. Criar um projeto e registrar um **app Web**; copiar os valores de configuração.
2. **Authentication → Método de login:** ativar **E-mail/senha**; em **Usuários**, criar o seu usuário. *O app não tem tela de cadastro: só quem você criar aqui consegue entrar.*
3. **Firestore Database:** criar em **modo de produção**.
4. **Firestore → Regras:** colar o conteúdo de [`firestore.rules`](firestore.rules) e **Publicar**. *Sem isso, quase todas as telas mostram "Sem permissão".*

**3. Variáveis de ambiente.** Copie `.env.example` para `.env` e preencha os seis valores `VITE_FIREBASE_*` com os do app Web. O arquivo `.env` nunca vai para o Git. Esses valores são públicos por natureza (qualquer visitante do site os vê); quem protege os dados são as regras do Firestore. **Nunca** coloque chave de service account ou credencial administrativa aqui.

**4. Rodar**
```bash
npm run dev      # http://localhost:5173 — entre com o usuário criado no passo 2
```
Sem o `.env`, o app abre uma tela dizendo exatamente quais variáveis faltam.

**5. Publicar** (Vercel, ou qualquer hospedagem de arquivos estáticos): `npm run build` gera a pasta `dist/`. As variáveis `VITE_FIREBASE_*` precisam existir **no momento do build** (na Vercel: Settings → Environment Variables, depois Redeploy), e o domínio publicado precisa ser autorizado no Firebase (Authentication → Domínios autorizados). Detalhes e armadilhas em [`docs/FIREBASE.md`](docs/FIREBASE.md#publicar-na-vercel). A navegação usa `#/rota`, então **não é preciso configurar redirecionamentos**.

## Comandos

| Comando | Para quê |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` / `npm run preview` | build de produção em `dist/` / servi-lo localmente |
| `npm test` | testes de lógica + análise estática (297) |
| `npm run test:ui` | a interface rodando com um Firebase simulado (100) |
| `npm run test:tz` | a suíte de lógica em 7 fusos horários |
| `npm run test:rules` | regras do Firestore no emulador (**ainda nunca executado**; exige Java) |
| `npm run e2e:build`, `test:layout`, `test:a11y`, `test:keyboard` | layout, acessibilidade e teclado no Chromium (instalar `puppeteer-core`, `@sparticuz/chromium`, `axe-core` à parte) |

O que cada teste cobre — **e o que não cobre** — está em [`docs/TESTING.md`](docs/TESTING.md).

## Documentação

- [`docs/FIREBASE.md`](docs/FIREBASE.md) — configuração do Firebase e publicação
- [`docs/TESTING.md`](docs/TESTING.md) — testes: como rodar e limites
- [`docs/DATA-MODEL.md`](docs/DATA-MODEL.md) — coleções, campos, vínculos e o que acontece ao excluir
- [`docs/SECURITY.md`](docs/SECURITY.md) — modelo de segurança, limites e checklist manual
- [`docs/PROGRESS.md`](docs/PROGRESS.md) — o que foi feito em cada etapa e como testar
- [`docs/PENDING.md`](docs/PENDING.md) — o que ainda falta, limitações e riscos conhecidos
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — decisões técnicas e motivos

## O que existe

Dashboard com **contextos** (Hoje, Desenvolvimento, Edição, Comercial) e **central de alertas** · Tarefas · Clientes (histórico de interações) · Projetos (lista/Kanban, marcos, diário, progresso calculado) · **Modelos de projeto** (revisão antes de criar) · Agenda (lista e calendário) · Comercial (propostas, histórico, follow-up, aceite com vínculo a projeto) · Financeiro (receitas/despesas, totais por moeda, vencido calculado) · Tempo (cronômetro único, ajustes com histórico, relatórios) · Notas e registro de trabalho · Configurações (tema claro/escuro, moeda, formato de data, início da semana, blocos do dashboard, atalhos externos).

**Não existe:** cadastro de usuários, envio de e-mails/notificações, integração bancária, conversão de moedas, exportação de dados dentro do app. Veja [`docs/PENDING.md`](docs/PENDING.md) para limitações e riscos conhecidos — em especial, **as regras do Firestore e o app contra o Firebase real ainda não foram exercitados em testes automatizados**.
