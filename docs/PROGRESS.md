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
| 11 | `feat: implement client management and interaction history` | ✅ código · ⏳ não testado com o Firebase real |
| 12 | `feat: implement projects and task relationships` | ✅ código · ⏳ não testado com o Firebase real |
| 13 | `feat: add calendar and upcoming deadlines` | ✅ código · ⏳ não testado com o Firebase real |
| 14 | `feat: add proposal pipeline and follow-up tracking` | ✅ código · ⏳ não testado com o Firebase real |
| 15 | `feat: add income expense and payment tracking` | ✅ código · ⏳ não testado com o Firebase real |
| 16 | `feat: add task timer and time reports` | ✅ código · ⏳ não testado com o Firebase real |
| 17 | `feat: add notes and work journal` | ✅ código · ⏳ não testado com o Firebase real |
| 18 | `feat: add work contexts and user preferences` | ✅ código · ⏳ não testado com o Firebase real nem visualmente |
| 19 | `feat: add project templates and internal reminders` | ✅ código · ⏳ não testado com o Firebase real nem visualmente |
| 20 | `feat: connect dashboard to real workspace data` | ✅ código · ⏳ não testado com o Firebase real nem visualmente |
| 21 | `test: harden security, errors and edge cases` | ✅ código · ⏳ regras do Firestore e Firebase real ainda não executados |
| 22 | `feat: polish keyboard accessibility and list performance` | ✅ código · ⏳ revisão visual das telas restantes |
| 23 | Documentação final e publicação | ⏳ |

> Os commits 02–07 foram criados juntos a partir de uma mesma base; commits intermediários podem não compilar isoladamente. O estado de cada commit a partir do 08 foi validado com `npm run build`.

---

## Commits 02–07 — Base, visual, layout e navegação

- **O que foi feito:** projeto Vite + React + JavaScript; tokens de design (`src/styles/tokens.css`); componentes (Button, Card, StatusBadge, Dialog nativo, Input/Select, estados vazio/carregando/erro); layout de três colunas responsivo (20/55/25 no desktop; gaveta + painel empilhado em telas menores); dashboard com dados de demonstração em `src/dev/fixtures.js`; navegação por hash (`#/tarefas`) e botão "Criar".
- **Limitações conhecidas:** os módulos além do dashboard mostram "A implementar"; "Criar" abre um aviso, não um formulário; atalhos externos e notas rápidas são só marcadores; o dashboard usa dados fictícios.
- **Como testar:** `npm install && npm run dev`; redimensione a janela (desktop/tablet/celular); navegue pelo menu; clique em "Criar".

## Commit 08 — Firebase (código)

- **O que foi feito:** `src/services/firebase.js` inicializa Auth e Firestore a partir de `VITE_FIREBASE_*`; se faltar variável, o app não quebra e informa quais faltam; `.env.example` sem valores; `docs/FIREBASE.md` com o passo a passo.
- **Projeto Firebase:** criado em 2026-10-09 (`remote-office-e73ae`), app Web registrado.
- **Implantação:** o projeto é testado pela Vercel (sem cópia local). As variáveis precisam ser cadastradas lá — ver [FIREBASE.md](FIREBASE.md#publicar-na-vercel). O aviso na tela agora menciona a Vercel.
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

## Commit 11 — Clientes e histórico de interações

- **O que foi feito:**
  - Módulo **Clientes** (`#/clientes`): criar, listar, editar, arquivar/reativar e excluir. Campos: nome (obrigatório), empresa, e-mail, telefone, origem, status (Lead/Ativo/Inativo/Arquivado), observações, próxima ação e data.
  - Visões (Em andamento, Leads, Ativos, Inativos, Arquivados, Todos) e busca por nome, empresa, e-mail, telefone, origem, observações e próxima ação. Próxima ação vencida aparece em vermelho.
  - **Detalhe do cliente** (`#/clientes/{id}`): contato, próxima ação, **histórico de interações** (data, tipo, resumo; registrar e excluir), **tarefas vinculadas reais** com atalho "Nova tarefa" já vinculada ao cliente.
  - **Tarefas ganharam o campo "Cliente"** (seletor no formulário; o nome aparece na lista e no detalhe da tarefa; clientes arquivados não aparecem como opção, exceto o já vinculado).
  - **Política de remoção:** *Arquivar* é o caminho normal (reversível). *Excluir* é permanente: apaga o cliente e suas interações e **desvincula** as tarefas (elas continuam existindo). Exige confirmação.
  - O botão "Criar → Novo cliente" abre o formulário real. Rotas com parâmetro (`#/clientes/{id}`).
  - Regras do Firestore para `clients` e `clients/{id}/interactions` com validação; `clientId` validado em tarefas.
  - Testes de lógica: 27 casos no total (`npm test`, **executados e passando**). Novos casos de regras em `npm run test:rules` (**não executados**).
- **Não feito:**
  - Seções "Projetos" e "Propostas" do detalhe mostram aviso de que chegam nos commits 12 e 14 (não há dados falsos).
  - Excluir uma interação não pede confirmação (ação de baixo risco; pode ser revisto no commit 22).
  - Exclusão de cliente tem limite de ~480 registros relacionados (um único lote do Firestore); acima disso o app orienta a arquivar.
  - Sem teste automatizado de interface.
- **Como testar:** crie clientes (com e-mail/telefone inválidos para ver as mensagens); busque e filtre; abra o detalhe; registre interações; crie uma tarefa vinculada pelo detalhe e outra pelo módulo Tarefas escolhendo o cliente; arquive e reative; exclua um cliente com tarefas e confira que elas permanecem sem vínculo; confirme que o recarregamento mantém tudo.
- **Atenção:** republique `firestore.rules` no console (novas coleções só funcionam depois disso — sem a regra publicada, clientes dão "Sem permissão").

## Commit 12 — Projetos e tarefas vinculadas

- **O que foi feito:**
  - Módulo **Projetos** (`#/projetos`): criar, listar, editar, mudar status, arquivar/reativar e excluir.
  - Campos: nome, descrição, cliente (opcional), tipo (Desenvolvimento, Edição, Social media, Interno, Outro), status (Planejamento, Ativo, Aguardando cliente, Em revisão, Concluído, Arquivado), prioridade, início, prazo final e links de referência (um por linha; só `http://` ou `https://`, máximo 10).
  - **Lista e Kanban** sobre os mesmos dados e filtros (Em andamento, Concluídos, Arquivados, Todos; busca e tipo). No Kanban, o status muda pelo seletor "Mover … para" de cada cartão (acessível por teclado; arrastar e soltar não foi implementado).
  - **Progresso com regra explícita e visível na tela:** tarefas concluídas ÷ tarefas não canceladas. Sem tarefas aparece "Sem tarefas ainda" (não 0%).
  - **Detalhe do projeto** (`#/projetos/{id}`): resumo, links, progresso, tarefas vinculadas (com "Nova tarefa" já ligada ao projeto e ao cliente dele), **marcos** (título, data opcional, marcar como feito) e **diário** (registros por data).
  - **Vínculos reais:** tarefas ganharam o seletor "Projeto" (nome na lista e no detalhe da tarefa); o detalhe do cliente lista os projetos dele (com "Novo projeto" já vinculado); o botão "Criar → Novo projeto" abre o formulário.
  - **Cliente arquivado não quebra projetos:** o projeto continua legível e mostra "(arquivado)" junto ao nome do cliente. Excluir um cliente desvincula (não apaga) projetos e tarefas.
  - **Dashboard e painel direito agora usam projetos reais:** "Projetos que pedem atenção" (prazo vencido, aguardando cliente ou entrega em até 7 dias), contadores, alerta de projetos vencidos, "Em foco" (projeto em andamento com o prazo mais próximo) e "Próximas entregas".
  - **Política de remoção:** *Arquivar* é o padrão (reversível). *Excluir* é permanente: apaga marcos e diário e só desvincula as tarefas. Exige confirmação.
  - Regras do Firestore para `projects`, `milestones` e `journal` com validação.
  - Testes: 49 casos de lógica (`npm test`, **executados e passando**); novos casos de regras em `npm run test:rules` (**não executados**).
- **Não feito:**
  - Fatura/cobrança e cronômetro (conforme o guia, ficam para os commits 15 e 16).
  - Arrastar e soltar no Kanban.
  - Templates de tarefas (melhoria posterior prevista no guia: commit 19).
  - Excluir marco/registro do diário não pede confirmação.
  - Sem teste automatizado de interface.
- **Como testar:** crie um projeto sem cliente e outro com cliente; mude o status pelo Kanban e confira que a lista reflete o mesmo status; crie tarefas pelo detalhe do projeto e conclua algumas (o progresso deve acompanhar, ignorando canceladas); adicione marcos e diário; arquive um cliente e confirme que os projetos dele continuam legíveis; defina prazos vencidos/próximos e confira o dashboard; exclua um projeto e confirme que as tarefas ficam sem vínculo.
- **Atenção:** republique `firestore.rules` no console antes de testar (sem isso, Projetos dão "Sem permissão").

## Commit 13 — Agenda, prazos e próximas entregas

- **O que foi feito:**
  - Módulo **Agenda** (`#/agenda`): criar, editar e excluir (com confirmação) **eventos** de três tipos — Reunião, Compromisso e Marco de entrega. Campos: título, início, fim opcional, "dia inteiro", descrição, projeto opcional e lembrete.
  - **Lista cronológica** agrupada por dia (Hoje, 7 dias, 30 dias, Prazos vencidos) e **visão de mês** (grade simples, com o dia selecionado listado abaixo e atalho "Evento neste dia"). Filtro por origem: tudo, eventos, prazos de tarefas, prazos de projetos.
  - A agenda **junta três origens e as identifica**: Evento, Prazo de tarefa e Prazo de projeto, diferenciados por rótulo de texto, ícone, estilo da borda e, no calendário, por **forma** do marcador (● ■ ◆) — não dependem só de cor. Clicar abre o evento, a tarefa ou o projeto.
  - **Dashboard:** "Linha do dia" agora usa os eventos reais de hoje (os de dia inteiro aparecem em lista). **Painel direito:** "Próximas entregas" mostra prazos de tarefas e projetos e marcos de entrega (30 dias + vencidos), com a origem de cada um.
  - O botão "Criar → Novo evento" abre o formulário real; excluir um projeto desvincula (não apaga) os eventos dele.
  - Regras do Firestore para `events` (início obrigatório, fim ≥ início, tipo e lembrete válidos).
  - Testes: 69 casos de lógica (`npm test`, **executados e passando**); novo caso de regras em `npm run test:rules` (**não executado**).
- **Fuso horário (como funciona):** instantes são guardados como `Timestamp` (UTC) no Firestore e exibidos no fuso do navegador; a tela mostra qual fuso está em uso. Eventos de dia inteiro e prazos guardam a meia-noite local do dia escolhido. Detalhes em [DECISIONS.md](DECISIONS.md).
- **Lembretes:** o campo existe e é salvo, mas **o app não envia nenhuma notificação** (isso exige infraestrutura própria — ver [PENDING.md](PENDING.md)). A tela avisa isso no formulário e no topo da Agenda.
- **Não feito:**
  - Notificações de lembrete (e-mail/push).
  - Marcos criados dentro do projeto (commit 12) não aparecem na agenda; para vê-los aqui, crie um evento do tipo "Marco de entrega".
  - Eventos de vários dias aparecem só no dia de início.
  - Eventos recorrentes, convites e integração com calendários externos.
  - Sem teste automatizado de interface.
- **Como testar:** crie uma reunião com horário, um compromisso de dia inteiro e um marco; confira a hora exibida; alterne Lista/Mês e os períodos; filtre por origem; clique em um prazo de tarefa e de projeto (abre a tarefa/o projeto); edite e exclua um evento; confira a "Linha do dia" e as "Próximas entregas"; teste fim antes do início (erro no campo).
- **Atenção:** republique `firestore.rules` no console antes de testar (sem isso, a Agenda dá "Sem permissão").

## Commit 14 — Propostas e acompanhamento comercial

- **O que foi feito:**
  - Módulo **Comercial** (`#/comercial`): criar, listar, editar e excluir (com confirmação) propostas. Campos: título, cliente (obrigatório), resumo, valor estimado, moeda (BRL, USD, EUR, PYG), data de envio, validade, status e próxima ação com data.
  - **Ciclo completo:** Rascunho → Enviada → Em negociação → Aceita / Recusada / Expirada, com filtros por status (e "Em aberto") e busca por título, resumo, cliente e próxima ação.
  - **Histórico de status** (subcoleção, imutável): registra criação, cada mudança de status e cada "Registrar contato". Status e histórico são gravados juntos em uma única operação.
  - **Follow-up com regra configurável e explicada na tela:** uma proposta *pede retorno* quando (1) a próxima ação está vencida ou é hoje; (2) a validade venceu e ela está Enviada/Em negociação; ou (3) está Enviada/Em negociação sem mudança de status nem contato registrado há N dias (N = 3, 7, 14 ou 30; padrão 7; guardado neste navegador). O motivo aparece em cada proposta, no alerta do dashboard e no painel direito ("Propostas para retomar").
  - **Aceite com confirmação explícita:** ao escolher "Aceita", abre um diálogo com três opções — apenas marcar como aceita, vincular a um projeto existente ou criar um projeto. "Criar projeto" abre o formulário **já preenchido** e o projeto só existe se você salvar; ao salvar, é vinculado à proposta. Nada é criado silenciosamente.
  - **Dinheiro:** valor guardado como **número** + código da moeda (nunca texto formatado); formatado na exibição conforme a moeda (ex.: R$ 4.200,00, US$ 500,00, ₲ 15.000). Totais "aguardando resposta" são somados **por moeda**, sem misturar.
  - **Vínculos:** detalhe do cliente lista as propostas dele ("Nova proposta" já vinculada); "Criar → Nova proposta" abre o formulário. Cliente com propostas **não pode ser excluído** (arquive em vez disso); excluir um projeto só desvincula as propostas.
  - **Nenhum e-mail é enviado automaticamente** (conforme o guia).
  - Regras do Firestore para `proposals` e `history` (valor numérico ≥ 0, moeda e status válidos, cliente obrigatório, histórico sem edição).
  - Testes: 91 casos de lógica (`npm test`, **executados e passando**); novo caso de regras em `npm run test:rules` (**não executado**).
- **Não feito:**
  - Envio de propostas/e-mails e lembretes por notificação.
  - Anexos/PDF da proposta.
  - Conversão automática de proposta aceita em receita (financeiro, commit 15).
  - Configuração do prazo de follow-up salva na conta (hoje fica no navegador; migra no commit 18).
  - Sem teste automatizado de interface.
- **Como testar:** crie uma proposta (cliente obrigatório; valor em BRL e outra em USD); veja os totais separados por moeda; mude o status e confira o histórico; deixe uma proposta enviada com data de contato antiga ou próxima ação vencida e veja o aviso, o alerta no dashboard e o painel direito; altere o prazo "Sem retorno após"; marque como **Aceita** e teste as três opções (inclusive cancelar o formulário de projeto); tente excluir um cliente com propostas; exclua uma proposta.
- **Atenção:** republique `firestore.rules` no console antes de testar (sem isso, Comercial dá "Sem permissão").

## Commit 15 — Controle financeiro básico

- **O que foi feito:**
  - Módulo **Financeiro** (`#/financeiro`): criar, listar, editar e excluir (com confirmação) receitas e despesas. Campos: descrição, tipo, valor, moeda (BRL, USD, EUR, PYG), status, vencimento, data de pagamento, categoria, cliente e projeto opcionais e observações.
  - **Status gravado:** Prevista, Pendente, Paga/recebida e Cancelada. **"Vencida" não é gravada: é calculada** — lançamento *Pendente* cujo vencimento é anterior a hoje (no dia do vencimento ainda está no prazo). Previstas nunca vencem; pagas e canceladas saem dessa conta. A regra aparece no formulário, no rodapé da página e em "Como os totais são calculados".
  - **Indicadores separados**, em tabela por moeda: Recebido/Pago, Pendente, Vencido e Previsto, para receitas e para despesas. **Moedas nunca são somadas nem convertidas**: cada moeda tem seu bloco.
  - **Previsto não vira recebido:** previstos e pendentes ficam em colunas próprias; o **saldo realizado** (recebido − pago) considera só lançamentos pagos.
  - **Filtros:** período (Este mês, Mês passado, Próximos 30 dias, Este ano, Tudo), status (inclui "Vencida"), tipo, moeda e busca. Os totais acompanham os filtros. Regra do período: pagos contam pela data do pagamento; os demais, pelo vencimento.
  - **"Marcar como recebido/pago"** com data de pagamento (confirmação), só registra — nenhum dinheiro é movimentado.
  - **Histórico preservado:** em vez de excluir, use o status **Cancelada** (mantida e ignorada nos totais). Excluir pede confirmação e é permanente.
  - **Dashboard e painel direito** usam o financeiro real ("A receber e a pagar", alertas de recebimentos/contas vencidos). **Os dados de demonstração foram removidos** (`src/dev/fixtures.js` não existe mais): todo bloco do app agora lê dados reais.
  - Excluir cliente ou projeto desvincula (não apaga) os lançamentos. "Criar → Nova receita/despesa" abre o formulário.
  - Regras do Firestore para `transactions` (valor > 0 numérico, moeda/tipo/status válidos, pago exige data de pagamento, "vencida" rejeitada como status gravado).
  - Testes: 116 casos de lógica (`npm test`, **executados e passando**); novo caso de regras em `npm run test:rules` (**não executado**).
- **Não feito (de propósito):** integração bancária, processamento de pagamentos, conversão de moedas (não há fonte de câmbio definida), recorrência, anexos/comprovantes, gráficos e relatórios, lançamento automático ao aceitar uma proposta.
- **Como testar:** crie receitas e despesas em BRL e USD (confira que os totais ficam em blocos separados); crie uma pendente com vencimento passado (deve aparecer como Vencida e no alerta do dashboard); uma Prevista com vencimento passado (não vence); marque uma como recebida e veja o saldo realizado; mude o período e os filtros; cancele um lançamento (some dos totais, continua na lista com "Todos"); exclua outro (confirmação); veja "A receber e a pagar" no painel direito.
- **Atenção:** republique `firestore.rules` no console antes de testar (sem isso, o Financeiro dá "Sem permissão").

## Commit 16 — Cronômetro e registros de tempo

- **O que foi feito:**
  - Módulo **Tempo** (`#/tempo`): iniciar, parar/registrar e descartar um cronômetro associado a **tarefa ou projeto** (ou nenhum), com descrição opcional; registros manuais; ajuste e exclusão de registros.
  - **Um cronômetro por vez, garantido pelo servidor:** o cronômetro ativo é um único documento de ID fixo (`timer/current`); iniciar é uma transação que falha se ele já existe, e as regras do Firestore negam trocar o início. Vale entre abas e aparelhos. Os botões de iniciar ficam desativados enquanto há um ativo.
  - **Sobrevive ao recarregamento e a sessões interrompidas:** o início é a **hora do servidor** e o tempo exibido (HH:MM:SS) é calculado de timestamps (`agora − início`), não de um contador em memória. Cronômetro ativo há mais de 8 h mostra aviso; ao parar, o fim é editável (padrão: agora), e um registro tem no máximo 24 h.
  - **Registro final:** início, fim, duração (em segundos, coerente com início/fim — também checado nas regras), descrição, tarefa/projeto e origem (cronômetro ou manual).
  - **Ajustes não apagam nada silenciosamente:** cada ajuste guarda os **valores anteriores** em uma subcoleção imutável de revisões, exibida em "Histórico de ajustes"; o registro mostra "ajustado N×". Excluir pede confirmação e é permanente.
  - **Aviso de sobreposição** (não bloqueia) ao criar/ajustar um intervalo que cruza outro registro, porque o tempo seria contado em duplicidade.
  - **Relatórios** por dia, tarefa, projeto e categoria, nos períodos Hoje, Últimos 7 dias, Este mês, Mês passado e Tudo; a soma das linhas sempre fecha com o total (coberto por testes). Cada registro conta no dia em que **começou**. Categoria vem da tarefa; projeto é o atual da tarefa (ou o gravado, se não houver tarefa).
  - **Registrado ≠ faturável:** o relatório mostra "Tempo registrado" e "Marcado como faturável" em colunas separadas. Faturável é uma marcação manual por registro; **nada gera cobrança nem valor**.
  - **Integração:** "Iniciar cronômetro" no detalhe da tarefa; card "Tempo registrado" no detalhe do projeto; painel direito com o cronômetro real (relógio ao vivo); "Criar → Registro de tempo".
  - Regras do Firestore para `timer`, `timeEntries` e `revisions`. Testes: 140 casos de lógica (`npm test`, **executados e passando**); 2 casos novos de regras em `npm run test:rules` (**não executados**).
- **Não feito:** valor/hora e rentabilidade, geração de faturas, pausar/retomar (o guia pede "pausar/finalizar": a pausa é feita parando e iniciando outro registro), lembrete de cronômetro esquecido por notificação, exportação, gráficos.
- **Como testar:** inicie um cronômetro com uma tarefa; recarregue a página (deve continuar contando do início real); abra o app em outra aba e tente iniciar outro (deve negar); pare e confira o registro; descarte um cronômetro iniciado por engano; crie um registro manual sobreposto (aviso); ajuste um registro e veja o histórico; mude período e tipo de relatório e confira que o total fecha; marque um registro como faturável e veja a coluna separada; veja o tempo no detalhe do projeto.
- **Atenção:** republique `firestore.rules` no console antes de testar (sem isso, Tempo dá "Sem permissão").

## Commit 17 — Notas rápidas e diário de bordo

- **O que foi feito:**
  - Módulo **Notas** (`#/notas`) com duas seções: **Notas** e **Registro de trabalho** (diário de bordo). Criar, listar, editar e excluir (com confirmação) em ambas.
  - **Nota:** título opcional, conteúdo, tags e vínculos opcionais com cliente, projeto e tarefa. Texto puro (nada é interpretado como HTML).
  - **Registro de trabalho:** data + **"O que fiz"**, **"Bloqueios"** e **"Próximo passo"** (ao menos um preenchido), com os mesmos vínculos opcionais.
  - **Captura rápida pela lateral** (caixa "Notas rápidas" no painel esquerdo, `Ctrl/⌘+Enter` salva) e pela **ação global** "Criar → Nova nota / Registro de trabalho". Se salvar falhar, **o texto permanece na caixa** e o erro é mostrado.
  - **Busca e filtros:** texto (título, conteúdo e tags nas notas; os três campos no registro), **intervalo de datas** (De/Até, inclusivo), tag (notas) e projeto (registro de trabalho).
  - **Alterações não salvas não se perdem em silêncio:** nos formulários, cancelar ou pressionar Esc com alterações abre "Descartar alterações?"; o aviso "Alterações ainda não salvas" fica visível; e recarregar/fechar a aba com texto não salvo (formulários e caixa da lateral) mostra o aviso do navegador.
  - **Vínculos levam ao registro correto:** cliente e projeto abrem a página deles; tarefa abre o editor da tarefa; vínculos para itens excluídos aparecem como "(excluído)". Excluir cliente/projeto desvincula (não apaga) notas e registros.
  - **Retomada:** o detalhe do projeto ganhou "Retomar de onde parou" (último registro de trabalho + notas do projeto, com "Novo registro" já vinculado); o detalhe do cliente lista as notas dele; o dashboard mostra o "Retomar" com o último registro.
  - Regras do Firestore para `notes` e `workLog`. Testes: 159 casos de lógica (`npm test`, **executados e passando**); 1 caso novo de regras em `npm run test:rules` (**não executado**).
- **Rascunho automático: NÃO implementado, de propósito.** O guia só o permite com tratamento de falhas claro. Em vez disso: aviso de alterações não salvas (acima) e, em falha de salvamento, o texto fica na tela. Nada é guardado no navegador em segundo plano.
- **Não feito:** resumo por IA (o guia pede para não implementar ainda), formatação rica/Markdown, anexos, busca que inclui nomes de clientes/projetos vinculados, vincular uma nota a uma proposta/evento.
- **Como testar:** salve uma nota pela lateral e outra pelo formulário (com tags e vínculos); recarregue a página (devem persistir); busque por texto, por tag e por datas; abra o vínculo de cliente, projeto e tarefa; digite numa nota e tente cancelar/pressionar Esc/recarregar (deve avisar); crie um registro de trabalho (tente salvar com os três campos vazios: erro); veja "Retomar de onde parou" no projeto e "Retomar" no dashboard; exclua um projeto e confirme que as notas dele ficam sem vínculo.
- **Atenção:** republique `firestore.rules` no console antes de testar (sem isso, Notas dá "Sem permissão").

## Commit 18 — Contextos de trabalho e preferências

- **O que foi feito:**
  - **Seletor de contexto** (Hoje, Desenvolvimento, Edição, Comercial) no topo do dashboard e na lateral esquerda; a escolha é **salva na conta**. **O contexto só reorganiza e filtra a apresentação: nenhum registro é criado, copiado ou duplicado** (as listas mostram os mesmos objetos dos módulos).
    - **Hoje:** prioridades gerais (agenda, tarefas, projetos que pedem atenção, propostas, retomada).
    - **Desenvolvimento:** "Projetos técnicos" (projetos do tipo Desenvolvimento em andamento, com **links de repositório** — GitHub, GitLab, Bitbucket, Codeberg, Azure DevOps, SourceHut) e tarefas desses projetos.
    - **Edição:** "Fila de vídeos" (projetos do tipo Edição por fase: produção, revisão e aguardando cliente, com data de **entrega**) e tarefas desses projetos.
    - **Comercial:** propostas para retomar, a receber/a pagar, próximas ações de clientes, agenda e tarefas.
    - Os blocos que não são prioridade no contexto ficam recolhidos em "Outros blocos" (nada some). As **ações rápidas** do botão "Criar" também aparecem na ordem do contexto.
  - **Página Configurações** (`#/configuracoes`), tudo salvo por usuário em `users/{uid}.preferences` e aplicado ao vivo:
    - **Tema:** Claro, Escuro ou Seguir o sistema (novo tema escuro).
    - **Moeda padrão:** vem pré-selecionada em propostas e lançamentos (pode ser trocada em cada um).
    - **Formato de data:** Brasileiro ou numérico ISO (2026-10-05). Vale para datas sem dia da semana nem hora; títulos com dia da semana e horários continuam textuais.
    - **Início da semana** (domingo ou segunda) no calendário da Agenda.
    - **Blocos do dashboard:** ocultar/mostrar cada um (reordenar é decisão do contexto, para não complicar a interface).
    - **Atalhos externos configuráveis** (até 10; só `http(s)`; sem duplicados), exibidos na lateral e abertos em nova aba com `rel="noopener noreferrer"`. **Não há integração com nenhum serviço externo**: são apenas links.
    - **Prazo de "sem retorno" das propostas** agora na conta (migrado do `localStorage`: o valor antigo é usado até você escolher um novo).
  - **Valores padrão sensatos e tolerância a dados inválidos:** preferência ausente ou desconhecida cai no padrão, sem quebrar a tela. Contas antigas (com `locale/currency/theme`) continuam válidas.
  - Regras do Firestore validam as preferências (chaves permitidas e valores válidos; listas limitadas a 10). Testes: 182 casos de lógica (`npm test`, **executados e passando**); 1 caso novo de regras em `npm run test:rules` (**não executado**).
- **Não feito:** preferência de **fuso horário** (não consta na lista do guia; os horários seguem o fuso do navegador), reordenar blocos manualmente, contextos personalizados, aplicar o contexto como filtro nas telas de Tarefas/Projetos (só no dashboard e nas ações rápidas), integrações externas.
- **Verificação:** o build e os testes de lógica passaram. **O tema escuro, a responsividade e o contraste não foram conferidos visualmente** (sem navegador no ambiente) — olhe com atenção ao testar.
- **Como testar:** troque entre os quatro contextos (dashboard e lateral) e confira que o conteúdo muda sem criar registros; crie projetos dos tipos Desenvolvimento (com link do GitHub) e Edição para ver os blocos específicos; em Configurações, troque tema, moeda, formato de data e início da semana; adicione e remova um atalho externo e veja na lateral; faça logout/login (ou abra em outro aparelho) e confirme que tudo persiste; teste no celular.
- **Atenção:** republique `firestore.rules` no console para ativar a validação das preferências (as regras antigas continuam aceitando as preferências, só não as validam).

## Commit 19 — Modelos de projeto e alertas internos

- **O que foi feito:**
  - **Modelos de projeto** (`#/modelos`): 4 modelos padrão (Site institucional, Aplicativo/sistema web, Vídeo institucional, Pacote mensal de social media — somente leitura, podem ser **duplicados** para editar) e **modelos próprios** (criar, editar, excluir com confirmação; até 30 tarefas por modelo, cada uma com título, prioridade, "dias após o início" e categoria; reordenar com subir/descer; aviso de alterações não salvas).
  - **Criar projeto a partir de modelo — só com confirmação explícita** (botão "A partir de modelo" em Projetos ou "Usar modelo" em Modelos): o assistente mostra o **plano exato** — nome, cliente, datas e a **lista de tarefas com checkbox e prazo calculado** (início + dias do modelo) — e o botão diz "Criar projeto e N tarefas". **Nada é gravado antes de confirmar.** Você pode desmarcar tarefas; ao confirmar, projeto + tarefas são criados **de uma vez, em uma operação atômica** (se algo falhar, nada é gravado), o botão fica bloqueado durante o envio (sem duplicar) e você é levado ao projeto. As tarefas herdam o cliente escolhido; sem data de início, são criadas sem prazo. Excluir um modelo **não afeta** projetos já criados.
  - **Progresso do projeto:** continua **calculado a partir das tarefas** (concluídas ÷ não canceladas), nunca gravado — a única automação de dados derivados. Quando chega a 100%, aparece uma **sugestão** (não uma ação) para marcar o projeto como Concluído.
  - **Central de alertas no dashboard:** substitui os contadores anteriores por **uma lista única e sem repetição** (um alerta por condição, com chave estável `tipo:id`, ordenada por criticidade e data). Tipos e critérios (também exibidos em Configurações): tarefa atrasada; tarefa com prazo próximo; projeto atrasado; projeto com prazo próximo; proposta que pede retorno (regra do Comercial); lançamento vencido. São **derivados dos dados a cada renderização**: renderizar de novo dá o mesmo resultado e resolver a condição faz o alerta sumir sozinho.
  - **Regras configuráveis** (Configurações → Alertas internos): antecedência do "prazo próximo" (1, 2, 3 ou 7 dias; padrão 2) e ligar/desligar cada tipo de alerta; o prazo de "sem retorno" das propostas segue configurável.
  - **Nenhuma ação externa ou irreversível automática:** nenhum e-mail, mensagem ou pagamento é enviado, nada é excluído sozinho e nenhum status muda sozinho.
  - Regras do Firestore para `templates` e para as novas preferências. Testes: 220 casos de lógica (`npm test`, **executados e passando**; inclui plano de criação, deduplicação e estabilidade dos alertas); 1 caso novo de regras e extensão do de preferências em `npm run test:rules` (**não executados**).
- **Não feito:** "salvar um projeto existente como modelo", modelos com subtarefas/dependências, tarefas recorrentes, dispensar/adiar alertas individualmente (alertas só somem quando a condição é resolvida), notificações por e-mail/push, alertas de agenda/eventos, reordenar projetos por alerta.
- **Verificação:** build e testes de lógica passaram; a interface (assistente, editor de modelos, painel de alertas, tema escuro) **não foi conferida visualmente** (sem navegador no ambiente).
- **Como testar:** em Modelos, abra "Ver tarefas" de um modelo padrão; clique em "Usar modelo", desmarque algumas tarefas, mude a data de início (os prazos mudam) e confira o texto "Criar projeto e N tarefas"; **cancele** e confirme que nada foi criado em Projetos/Tarefas; repita e confirme: o projeto abre com só as tarefas marcadas, vinculadas a ele e ao cliente; duplique um modelo padrão, edite, salve e exclua; crie tarefas atrasadas/com prazo hoje e veja a central de alertas (recarregue várias vezes: a lista não cresce); mude a antecedência e desligue um tipo em Configurações; conclua todas as tarefas de um projeto e veja a sugestão.
- **Atenção:** republique `firestore.rules` no console (novas coleções só funcionam depois disso — sem isso, "Meus modelos" e a gravação das novas preferências dão "Sem permissão"; os modelos padrão e a criação de projeto a partir deles funcionam mesmo assim, pois usam as regras de projetos e tarefas já publicadas).

## Commit 20 — Dashboard e central de pendências com dados reais

Este commit é uma **revisão de confiabilidade**: a maior parte da conexão com dados reais já havia sido feita nos commits 6 a 19 (todos os módulos alimentam o dashboard por assinaturas em tempo real). A auditoria abaixo mostrou o que ainda estava incompleto e foi corrigido.

- **Auditoria feita (resultado):**
  - **Dados de exemplo:** `src/dev/fixtures.js` já havia sido removido no commit 15; uma varredura em `src/` e `index.html` não achou mais nada fictício, exceto (a) o nome "Leandro" **fixo** na saudação e (b) uma regra de CSS "demo-flag" sem uso. Ambos corrigidos. Um teste (`tests/no-demo-data.test.js`) agora **falha** se reaparecer `fixtures`, "demonstração", `mock`, `lorem ipsum` ou `exemplo.com` no código da aplicação. Dados de teste ficam só em `tests/`.
  - **Consultas redundantes:** não há. Inventário das assinaturas ao vivo (cada uma é aberta **uma única vez** por sessão, em um provider, e compartilhada por todas as telas): tarefas, projetos, clientes, eventos, propostas, lançamentos, tempo (cronômetro + registros), notas (notas + registros de trabalho), modelos próprios e preferências/perfil (1 documento). Assinaturas **por tela**, abertas só enquanto a tela/diálogo está aberto: interações do cliente, histórico da proposta, marcos e diário do projeto, ajustes de um registro de tempo. Dashboard, painel direito e módulos leem os mesmos dados em memória — por isso refletem na hora qualquer alteração.
  - **Indicadores inconsistentes:** "Entregas em 7 dias" contava também projetos **vencidos**. Agora os quatro indicadores usam as mesmas regras dos alertas: *Tarefas abertas*, *Tarefas atrasadas* (mesmo cálculo do alerta), *Projetos em andamento* e *Entregas em até 7 dias* (de hoje a +7; vencidos ficam de fora). Testes garantem a coerência entre indicadores e alertas. Ao corrigir isso, achei e corrigi um defeito: o cálculo de "atrasadas" ignorava a data de referência recebida e usava o relógio real.
- **Alertas que explicam, levam ao registro e dizem como resolver:** cada alerta mostra o **motivo** (ex.: "Prazo vencido há 3 dias"), um link para o **registro específico** e a **ação** que o resolve (ex.: "Concluir ou reagendar", "Registrar contato ou atualizar o status", "Marcar como pago ou reagendar"). Antes, alertas de tarefa e de lançamento levavam só à lista; agora `#/tarefas/{id}` abre a tarefa e `#/financeiro/{id}` abre o lançamento (projetos e propostas já tinham página própria). Se o registro não existir mais, a tela avisa em vez de falhar.
- **Novo alerta "Projeto aguardando cliente"** (projeto bloqueado), que **não duplica** o de prazo: se o projeto também tem prazo vencido/próximo, aparece só o de prazo. Pode ser desligado em Configurações.
- **Estados claros, sem zeros enganosos:** indicadores mostram "—" enquanto carregam (e "0" só quando realmente é zero); a central de alertas mostra "Verificando alertas…", **avisa quando alguma fonte falhou** ("os alertas podem estar incompletos") e, quando está tudo carregado e sem pendências, diz "Nenhum alerta no momento" e lista o que foi verificado (e quais tipos você desligou). Um alerta ausente porque os dados ainda não carregaram nunca é apresentado como "tudo em dia".
- **Área de trabalho vazia:** quando **nenhum módulo** tem registros, o dashboard mostra o cartão "Comece por aqui" (cliente, projeto a partir de modelo, tarefa e evento) em vez de uma tela de cartões vazios.
- **Saudação sem nome fixo:** usa o nome do perfil (Configurações → Perfil); em branco, mostra só "Bom dia". **Você precisa preencher seu nome uma vez** para voltar a ver o nome na saudação. Regras limitam o nome a 60 caracteres.
- Testes: 240 casos de lógica (`npm test`, **executados e passando**); caso de regras do nome em `npm run test:rules` (**não executado**).
- **Não feito:** consolidar os dois painéis (dashboard e direito) — ambos leem os mesmos dados e usam as mesmas regras, mas ainda mostram listas parecidas; métricas de histórico/tendência (o guia pede para não inventar métricas); gráficos; alertas de eventos da agenda.
- **Verificação:** build e testes passaram; a interface **não foi conferida visualmente** (sem navegador no ambiente).
- **Como testar:** com a conta **vazia** (ou em um segundo usuário) veja o "Comece por aqui"; crie uma tarefa atrasada, um projeto "Aguardando cliente", uma proposta antiga e um lançamento vencido e confira a central de alertas (cada item com motivo, link e ação); clique no alerta da tarefa (abre a tarefa) e do lançamento (abre o lançamento); conclua a tarefa em outra aba e veja o alerta sumir sozinho; compare os indicadores com a lista de alertas; desligue um tipo de alerta e veja a nota "Alertas desligados"; preencha seu nome em Configurações → Perfil e confira a saudação; com a internet desligada ao carregar, confira os traços "—" e o aviso de fonte indisponível.
- **Atenção:** republique `firestore.rules` no console (para limitar o nome do perfil; sem isso tudo funciona, só sem a validação).

## Commit 21 — Segurança, erros e casos extremos

Este commit **não adiciona funcionalidades**: é uma rodada de testes e correção só do que foi reproduzido. Detalhes de cada suíte, e do que ela **não** prova, em [TESTING.md](TESTING.md).

- **O que foi montado:** 297 testes de lógica (`npm test`, também em 7 fusos horários com `npm run test:tz`); 89 testes de **interface rodando de verdade** (jsdom + Firebase simulado em memória); um teste de **layout em Chromium real** (6 larguras × 39 telas, claro/escuro, textos enormes, ≈ 2.400 registros); **axe-core** (acessibilidade) em 56 combinações; análise estática das regras do Firestore e da segurança do código.
- **Problemas REPRODUZIDOS e corrigidos (cada um com teste de regressão):**
  1. **Arredondamento de dinheiro:** `1,005` virava `1,00` e `1,255` virava `1,25` (erro de ponto flutuante). Agora arredonda pelo valor decimal digitado (1,01 e 1,26).
  2. **Conta que não carrega** (sem rede ou regras não publicadas) mostrava só "Não foi possível concluir a operação". Agora diz a causa ("Sem conexão…" ou "confira se as regras do Firestore foram publicadas").
  3. **"Tarefas atrasadas" do dashboard** ignorava a data de referência e usava o relógio real (inconsistente com os alertas).
  4. **Links de projeto** vindos do banco eram exibidos sem revalidar (só validavam ao digitar); agora só `http/https` chegam à tela (defesa em profundidade). E-mail de cliente só vira `mailto:` se for um endereço simples (sem `?bcc=`/`&subject=`).
  5. **Layout em telas de celular:** Financeiro e Tempo rolavam para o lado (+170 a +250 px) por causa do CSS Grid; o dashboard tinha 4 indicadores espremidos no celular; **textos longos sem espaço** (nomes, e-mails, URLs) esticavam a página em 37 telas; selos de status e datas à direita encolhiam e quebravam letra por letra.
  6. **Datas** apareciam como "Terça-Feira, 13 De Outubro" (capitalização do CSS); o último rótulo da linha do dia ("20") ficava cortado.
  7. **Acessibilidade:** texto secundário no tema claro com contraste 4,0 (mínimo 4,5); seções repetidas nos painéis laterais com o mesmo nome; lista de descrição inválida em Comercial; cabeçalho de tabela vazio; tabelas roláveis sem acesso por teclado. O tema escuro **passou em contraste em todas as telas**.
- **O que foi verificado e estava correto (sem mudança):** isolamento por usuário nos caminhos do app (o app nunca lê nem grava fora de `users/{uid}`); sessão expirada com o app aberto volta ao login e some com os dados da tela; login com senha errada e recuperação de senha com resposta neutra; formulários vazios, inválidos e valores enormes; exclusão de cliente/projeto/proposta/registro de tempo (desvincula e apaga só o que é dependente; cliente com propostas é bloqueado); modelo de projeto cancelado não cria nada e, em falha, nada é gravado (e não duplica ao repetir); cronômetro único, recarregar a página, cronômetro esquecido (> 24 h) e descarte; falha de rede ao salvar mantém o texto digitado; documento excluído em outro aparelho; texto com HTML/script aparece como texto; preferências corrompidas caem no padrão; todas as mensagens de erro dos serviços são claras e sem códigos técnicos.
- **Desempenho (Chromium, tela de celular, ~1.200 tarefas + 300 clientes + 200 notas + 400 lançamentos + 300 registros de tempo):** dashboard 0,3 s; clientes 0,5 s; notas 0,6 s; tempo 0,4 s; tarefas 0,9 s (≈ 9.000 elementos no DOM, sem virtualização); financeiro 1,4 s. Aceitável para uso pessoal; ver riscos.
- **Dependências:** `npm audit --omit=dev` aponta 11 avisos, **todos** em bibliotecas internas de servidor do pacote `firebase` (`undici`, `@grpc/grpc-js`). Conferi o **bundle de produção**: tem **0 ocorrências** delas, então não chegam ao navegador. A "correção" sugerida pelo `npm audit` seria **rebaixar** o Firebase para a 9.14.0, e **não foi aplicada**. Reavalie ao atualizar o Firebase (testando com o projeto real).
- **Regras do Firestore: NÃO foram alteradas** neste commit (o que está publicado continua válido) e **continuam sem ter sido executadas**: o emulador não baixa no ambiente de desenvolvimento. O que foi feito é **análise estática** (`tests/rules-static.test.js`): toda permissão exige o dono, nenhuma é "se autenticado" ou "verdadeiro", toda escrita valida campos com `hasOnly`, a regra final nega o resto, e cada coleção usada pelo código tem regra. Provado por mutação: afrouxar uma regra de propósito ou usar uma coleção sem regra faz o teste reprovar.
- **Como estes testes foram validados:** com mutações (quebrei validações, regras e coleções de propósito e vi os testes reprovarem; fontes restauradas e conferidas) e um controle negativo da rede de segurança de `console.error`.

## Commit 22 — Polimento, acessibilidade e desempenho

Método: primeiro **medir** (auditoria de teclado e foco no Chromium, medição de desempenho), depois corrigir só o que apareceu, depois medir de novo.

- **Teclado e foco (antes: 5 achados; depois: 0 em 14 telas, desktop e celular):**
  1. No celular, a gaveta de navegação **fechada** ainda recebia foco por Tab (18 controles invisíveis em todas as telas). Agora fechada = fora da tela **e** fora da ordem de tabulação; ao abrir, o foco entra nela; ao fechar (Esc, fundo ou link), volta ao botão do menu.
  2. O menu "Criar" declarava `role="menu"` mas as setas não funcionavam (o padrão ARIA exige). Virou um botão que expande uma lista (`aria-expanded`): Esc fecha e devolve o foco; sair com Tab também fecha; ao escolher um item o foco volta ao "Criar" antes de abrir o formulário. Removido também o diálogo "ainda não existe" que não era mais usado.
  3. O título da aba nunca mudava: agora cada tela tem o seu ("Clientes · Leandro Desk", "Entrar · Leandro Desk", "Página não encontrada · …").
  4. Ao trocar de tela o foco ficava no menu: agora vai para o conteúdo (não na primeira carga).
  5. Alvos de toque menores que 24×24 px (WCAG 2.2): o botão de concluir tarefa (22 px) agora tem área de 44×44 com o mesmo círculo visual; links "Ver/Abrir" dos cartões, botões que parecem link e "Voltar" têm pelo menos 28–32 px.
  - **Já estava certo (verificado):** o link "Ir para o conteúdo" é o primeiro foco; diálogos recebem o foco, o Tab não escapa e o Esc devolve o foco a quem abriu; todo foco tem indicador visível.
- **Formulários:** ao enviar com erro, o foco vai para o **primeiro campo inválido** (13 formulários), e as mensagens de erro de campos de seleção e de texto longo agora ficam associadas ao campo (`aria-describedby`), como já acontecia nos campos de texto.
- **Desempenho — carregamento incremental ("Mostrar mais 50") em Tarefas, Clientes, Projetos (lista), Propostas, Financeiro, Notas (notas e registros) e Tempo (lista de registros).** Filtros, buscas e **totais continuam valendo para todos os itens** (só a lista na tela é cortada; a busca acha item na posição 118; mudar o filtro volta à primeira página; testado). Medido no Chromium, celular, com ~2.400 registros, **mediana de 5 execuções**, antes → depois (o tempo oscila bastante entre execuções; por isso a mediana):
  - Tarefas: 8.962 → **748** elementos no DOM; 640 → **394 ms**.
  - Financeiro: 4.798 → **978** elementos; 953 → **482 ms**.
  - Clientes: 2.083 → 579; Notas: 1.498 → 592; Tempo: 1.841 → 1.633; tempo ≈ igual (dominado por custo fixo de inicialização).
  - Dashboard: sem mudança (≈ 390 ms).
- **O que NÃO foi feito, de propósito:** divisão do código por rota (o pacote principal tem ≈ 400 kB, 110 kB comprimido; sem evidência de que seja problema, "sem otimização prematura"); virtualização de listas (a paginação resolve); animações. A revisão visual (espaçamento/hierarquia) foi feita no dashboard (claro/escuro, desktop/celular), em Tarefas com textos extremos e em Financeiro; as demais telas ficam para passos seguintes.
- Testes: 297 de lógica, 100 de interface (11 novos: foco em formulários, navegação/título, menu "Criar", carregamento incremental), e `npm run test:keyboard` no Chromium (zero problemas). O ambiente de teste de interface passou a imitar o navegador em dois pontos (foco devolvido ao fechar um diálogo; elemento dentro de diálogo fechado não recebe foco).
