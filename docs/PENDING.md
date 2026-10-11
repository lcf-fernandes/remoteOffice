# O que ainda não foi implementado ou feito

Atualize este arquivo sempre que algo for concluído (mova para [PROGRESS.md](PROGRESS.md)) ou descoberto.

## Ações manuais suas (nada disso foi feito pelo código)

- [x] **Criar o projeto no Firebase e registrar o app Web** — feito: projeto `remote-office-e73ae`.
- [ ] **Criar o `.env` local** a partir de `.env.example` com os valores do app Web (o arquivo não vai para o Git).
- [ ] **Ativar Authentication → E-mail/senha.**
- [ ] **Criar seu usuário** em Authentication → Usuários (não existe tela de cadastro, de propósito).
- [ ] **Criar o Firestore** em modo de produção.
- [ ] **Testar as regras no emulador:** `npm run test:rules` (requer Java e acesso à internet para o `firebase-tools`).
- [ ] **Republicar as regras** (`firestore.rules` mudou nos commits 10 a 19: valida tarefas, clientes, interações, projetos, marcos, diário, eventos, propostas, lançamentos financeiros, registros de tempo, notas, registros de trabalho, preferências e modelos de projeto; **os módulos a partir de Clientes não funcionam sem isso**). **Publicar:** `npx firebase-tools deploy --only firestore:rules --project <id-do-projeto>` (só depois do teste).
- [x] Hospedagem: repositório conectado à Vercel (`remote-office-omega.vercel.app`).
- [ ] **Vercel:** cadastrar as 6 variáveis `VITE_FIREBASE_*` em Settings → Environment Variables e fazer **Redeploy** — [FIREBASE.md](FIREBASE.md#publicar-na-vercel).
- [ ] **Firebase:** autorizar o domínio da Vercel em Authentication → Domínios autorizados.
- [ ] Revisão final de publicação (commit 23).

## Funcionalidades do guia ainda não construídas

| Guia | Entrega |
|---|---|
| 20 | Dashboard: revisão final e indicadores consolidados (todos os blocos já leem dados reais) |
| 21 | Segurança e casos extremos |
| 22 | Polimento, acessibilidade e performance |
| 23 | Documentação final e publicação |

## Limitações atuais conhecidas

- Todos os blocos do dashboard e dos painéis laterais leem dados reais; **não há mais dados de demonstração nem marcadores** na interface.
- Notas: sem rascunho automático (aviso de alterações não salvas no lugar), sem IA de resumo, sem formatação rica/anexos; busca não inclui nomes de itens vinculados.
- Tempo: sem valor/hora nem rentabilidade, sem faturas, sem pausa/retomada (parar e iniciar outro), sem notificação de cronômetro esquecido; registros sobrepostos só geram aviso; tarefas/projetos excluídos aparecem como "(tarefa excluída)" / "(projeto excluído)" nos relatórios.
- Financeiro: sem conversão de moedas (não há fonte de câmbio), sem recorrência, anexos/comprovantes, gráficos ou relatórios; aceitar proposta não gera lançamento (criar manualmente).
- O botão "Criar" abre formulários reais para todas as suas ações (tarefa, cliente, projeto, evento, proposta, receita, despesa, registro de tempo, nota e registro de trabalho), na ordem do contexto escolhido.
- Bundle JS acima de 500 kB (SDK do Firebase): avaliar divisão de código no commit 22.
- Sem testes automatizados de interface. Há testes da lógica pura de tarefas, clientes, projetos, agenda, propostas, financeiro, tempo e notas (`npm test`, 159 casos, executados e passando) e das regras do Firestore (`npm run test:rules`, **ainda não executados**: exigem o emulador).
- Comercial: sem envio de proposta/e-mail, sem anexos/PDF; o prazo de follow-up agora fica na conta (Configurações).
- **Notificações de lembrete não existem:** o lembrete do evento só fica salvo. Exigem infraestrutura própria (ex.: Cloud Functions + e-mail/push, que pedem plano Blaze do Firebase) — avaliar depois do MVP.
- Marcos de projeto não aparecem na agenda (só eventos do tipo "Marco de entrega"); eventos de vários dias aparecem no dia de início; sem eventos recorrentes.
- Fuso horário fixo no do navegador (sem preferência de fuso; fora da lista do guia). Datas de dia inteiro e prazos guardam a meia-noite local.
- Modelos: sem "salvar projeto como modelo", subtarefas, dependências ou tarefas recorrentes. Alertas: não podem ser dispensados/adiados individualmente (somem ao resolver a condição) e não há alertas de eventos da agenda nem notificações por e-mail/push.
- Preferências: sem reordenação manual de blocos, sem contextos personalizados; o contexto afeta o dashboard e as ações rápidas (não filtra as telas de Tarefas/Projetos). O formato de data ISO não altera títulos com dia da semana nem horários.
- **Tema escuro, responsividade e contraste ainda não foram conferidos visualmente** (sem navegador no ambiente de desenvolvimento).
- Kanban de projetos sem arrastar e soltar (muda o status pelo seletor do cartão).
- Excluir marco do projeto, registro do diário do projeto e interação de cliente não pede confirmação (as demais exclusões pedem).
- Excluir cliente ou projeto é limitado a ~480 registros relacionados de uma vez (acima disso, o app orienta a arquivar).
- Busca de tarefas e clientes é feita no navegador (adequada para uso pessoal); revisar se o volume crescer muito.
- Sem lint/formatador configurado.
- Commits intermediários 02–07 podem não compilar isoladamente (ver nota em [PROGRESS.md](PROGRESS.md)).

## Ideias futuras (só depois do MVP — seção 5 do guia)

Assistente de IA, integrações (calendário, GitHub, e-mail), relatórios e rotina de backup/exportação testada.
