# O que ainda não foi implementado ou feito

Atualize este arquivo sempre que algo for concluído (mova para [PROGRESS.md](PROGRESS.md)) ou descoberto.

## Ações manuais suas (nada disso foi feito pelo código)

- [x] **Criar o projeto no Firebase e registrar o app Web** — feito: projeto `remote-office-e73ae`.
- [ ] **Criar o `.env` local** a partir de `.env.example` com os valores do app Web (o arquivo não vai para o Git).
- [ ] **Ativar Authentication → E-mail/senha.**
- [ ] **Criar seu usuário** em Authentication → Usuários (não existe tela de cadastro, de propósito).
- [ ] **Criar o Firestore** em modo de produção.
- [ ] **Testar as regras no emulador:** `npm run test:rules` (requer Java e acesso à internet para o `firebase-tools`).
- [ ] **Republicar as regras** (`firestore.rules` mudou nos commits 10 a 15: valida tarefas, clientes, interações, projetos, marcos, diário, eventos, propostas e lançamentos financeiros; **clientes, projetos, agenda, comercial e financeiro não funcionam sem isso**). **Publicar:** `npx firebase-tools deploy --only firestore:rules --project <id-do-projeto>` (só depois do teste).
- [x] Hospedagem: repositório conectado à Vercel (`remote-office-omega.vercel.app`).
- [ ] **Vercel:** cadastrar as 6 variáveis `VITE_FIREBASE_*` em Settings → Environment Variables e fazer **Redeploy** — [FIREBASE.md](FIREBASE.md#publicar-na-vercel).
- [ ] **Firebase:** autorizar o domínio da Vercel em Authentication → Domínios autorizados.
- [ ] Revisão final de publicação (commit 23).

## Funcionalidades do guia ainda não construídas

| Guia | Entrega |
|---|---|
| 16 | Cronômetro e registro de tempo |
| 17 | Notas e diário |
| 18 | Contextos e preferências (inclui configurar atalhos externos e tema) |
| 19 | Templates e lembretes |
| 20 | Dashboard: revisão final e indicadores consolidados (todos os blocos já leem dados reais) |
| 21 | Segurança e casos extremos |
| 22 | Polimento, acessibilidade e performance |
| 23 | Documentação final e publicação |

## Limitações atuais conhecidas

- Todos os blocos do dashboard e do painel direito leem dados reais; **não há mais dados de demonstração**. Exceção: o painel "Cronômetro" (commit 16) e "Notas rápidas"/"Atalhos externos" (commits 17 e 18) ainda são marcadores.
- Financeiro: sem conversão de moedas (não há fonte de câmbio), sem recorrência, anexos/comprovantes, gráficos ou relatórios; aceitar proposta não gera lançamento (criar manualmente).
- O botão "Criar" ainda não abre formulários; o painel "Notas rápidas", os "Atalhos externos" e o "Cronômetro" são só marcadores.
- Bundle JS acima de 500 kB (SDK do Firebase): avaliar divisão de código no commit 22.
- Sem testes automatizados de interface. Há testes de lógica de tarefas (`npm test`) e de regras (`npm run test:rules`, ainda não executados).
- Comercial: sem envio de proposta/e-mail, sem anexos/PDF; o prazo de follow-up fica no navegador (vai para a conta no commit 18).
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
