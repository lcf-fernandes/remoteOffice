# O que ainda não foi implementado ou feito

Atualize este arquivo sempre que algo for concluído (mova para [PROGRESS.md](PROGRESS.md)) ou descoberto.

## Ações manuais suas (nada disso foi feito pelo código)

- [x] **Criar o projeto no Firebase e registrar o app Web** — feito: projeto `remote-office-e73ae`.
- [ ] **Criar o `.env` local** a partir de `.env.example` com os valores do app Web (o arquivo não vai para o Git).
- [ ] **Ativar Authentication → E-mail/senha.**
- [ ] **Criar seu usuário** em Authentication → Usuários (não existe tela de cadastro, de propósito).
- [ ] **Criar o Firestore** em modo de produção.
- [ ] **Testar as regras no emulador:** `npm run test:rules` (requer Java e acesso à internet para o `firebase-tools`).
- [ ] **Republicar as regras** (`firestore.rules` mudou nos commits 10 a 13: valida tarefas, clientes, interações, projetos, marcos, diário e eventos; **clientes, projetos e a agenda não funcionam sem isso**). **Publicar:** `npx firebase-tools deploy --only firestore:rules --project <id-do-projeto>` (só depois do teste).
- [x] Hospedagem: repositório conectado à Vercel (`remote-office-omega.vercel.app`).
- [ ] **Vercel:** cadastrar as 6 variáveis `VITE_FIREBASE_*` em Settings → Environment Variables e fazer **Redeploy** — [FIREBASE.md](FIREBASE.md#publicar-na-vercel).
- [ ] **Firebase:** autorizar o domínio da Vercel em Authentication → Domínios autorizados.
- [ ] Revisão final de publicação (commit 23).

## Funcionalidades do guia ainda não construídas

| Guia | Entrega |
|---|---|
| 14 | Propostas e follow-ups |
| 15 | Financeiro básico |
| 16 | Cronômetro e registro de tempo |
| 17 | Notas e diário |
| 18 | Contextos e preferências (inclui configurar atalhos externos e tema) |
| 19 | Templates e lembretes |
| 20 | Dashboard com dados reais (hoje usa `src/dev/fixtures.js`) |
| 21 | Segurança e casos extremos |
| 22 | Polimento, acessibilidade e performance |
| 23 | Documentação final e publicação |

## Limitações atuais conhecidas

- No dashboard, tarefas, clientes, projetos e agenda são reais. Propostas e pagamentos (dashboard e painel direito) ainda são **dados de demonstração**.
- O botão "Criar" ainda não abre formulários; o painel "Notas rápidas", os "Atalhos externos" e o "Cronômetro" são só marcadores.
- Bundle JS acima de 500 kB (SDK do Firebase): avaliar divisão de código no commit 22.
- Sem testes automatizados de interface. Há testes de lógica de tarefas (`npm test`) e de regras (`npm run test:rules`, ainda não executados).
- Detalhe do cliente: a seção "Propostas" (commit 14) ainda é um aviso.
- **Notificações de lembrete não existem:** o lembrete do evento só fica salvo. Exigem infraestrutura própria (ex.: Cloud Functions + e-mail/push, que pedem plano Blaze do Firebase) — avaliar depois do MVP.
- Marcos de projeto não aparecem na agenda (só eventos do tipo "Marco de entrega"); eventos de vários dias aparecem no dia de início; sem eventos recorrentes.
- Fuso horário fixo no do navegador; preferência de fuso fica para o commit 18.
- Kanban de projetos sem arrastar e soltar (muda o status pelo seletor do cartão).
- Excluir marco, registro de diário e interação não pede confirmação.
- Excluir interação não pede confirmação; excluir cliente é limitado a ~480 registros relacionados.
- Busca de tarefas e clientes é feita no navegador (adequada para uso pessoal); revisar se o volume crescer muito.
- Sem lint/formatador configurado.
- Commits intermediários 02–07 podem não compilar isoladamente (ver nota em [PROGRESS.md](PROGRESS.md)).

## Ideias futuras (só depois do MVP — seção 5 do guia)

Assistente de IA, integrações (calendário, GitHub, e-mail), relatórios e rotina de backup/exportação testada.
