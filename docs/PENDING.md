# O que ainda não foi implementado ou feito

Atualize este arquivo sempre que algo for concluído (mova para [PROGRESS.md](PROGRESS.md)) ou descoberto.

## Ações manuais suas (nada disso foi feito pelo código)

- [x] **Criar o projeto no Firebase e registrar o app Web** — feito: projeto `remote-office-e73ae`.
- [ ] **Criar o `.env` local** a partir de `.env.example` com os valores do app Web (o arquivo não vai para o Git).
- [ ] **Ativar Authentication → E-mail/senha.**
- [ ] **Criar seu usuário** em Authentication → Usuários (não existe tela de cadastro, de propósito).
- [ ] **Criar o Firestore** em modo de produção.
- [ ] **Testar as regras no emulador:** `npm run test:rules` (requer Java e acesso à internet para o `firebase-tools`).
- [ ] **Republicar as regras** (`firestore.rules` mudou no commit 10: agora valida tarefas). **Publicar:** `npx firebase-tools deploy --only firestore:rules --project <id-do-projeto>` (só depois do teste).
- [ ] Adicionar o domínio de produção em Authentication → Domínios autorizados (na publicação).
- [ ] Escolher a hospedagem e publicar (commit 23).

## Funcionalidades do guia ainda não construídas

| Guia | Entrega |
|---|---|
| 10 (parcial) | Vínculo de tarefa com cliente/projeto: seletores entram com os commits 11 e 12 |
| 11 | Clientes e histórico de interações |
| 12 | Projetos e relacionamentos |
| 13 | Agenda e prazos |
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

- No dashboard, só as **tarefas** são reais. Agenda, projetos, propostas e pagamentos (dashboard e painel direito) ainda são **dados de demonstração**.
- O botão "Criar" ainda não abre formulários; o painel "Notas rápidas", os "Atalhos externos" e o "Cronômetro" são só marcadores.
- Bundle JS acima de 500 kB (SDK do Firebase): avaliar divisão de código no commit 22.
- Sem testes automatizados de interface. Há testes de lógica de tarefas (`npm test`) e de regras (`npm run test:rules`, ainda não executados).
- Busca de tarefas é feita no navegador (adequada para uso pessoal); revisar se o volume crescer muito.
- Sem lint/formatador configurado.
- Commits intermediários 02–07 podem não compilar isoladamente (ver nota em [PROGRESS.md](PROGRESS.md)).

## Ideias futuras (só depois do MVP — seção 5 do guia)

Assistente de IA, integrações (calendário, GitHub, e-mail), relatórios e rotina de backup/exportação testada.
