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
| 16–23 | Cronômetro, notas, preferências, templates, segurança, polimento, publicação | ⏳ |

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
