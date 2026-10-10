# Decisões técnicas

| Decisão | Motivo |
|---|---|
| React + Vite + JavaScript | Stack proposta no guia; repositório estava vazio. |
| CSS com tokens (variáveis CSS), sem framework | Menos dependências; consistência visual via `src/styles/tokens.css`. |
| Ícones: `lucide-react` | Conjunto único e consistente. |
| Rotas por hash (`#/tarefas`) sem `react-router` | Evita dependência e configuração de servidor; pode ser trocado depois. |
| Modal com `<dialog>` nativo | Esc, foco e acessibilidade vêm do navegador. |
| Dados de demonstração só em `src/dev/fixtures.js` | Não misturar dados falsos com dados reais. |
| Firebase Auth (e-mail/senha) + Firestore | Stack proposta no guia. |
| Sem cadastro público | Uso pessoal; o usuário é criado no console do Firebase. |
| Dados em `users/{uid}/<coleção>/{id}` (subcoleções) | Regras simples e seguras: acesso só ao próprio `uid`, sem confiar em campos do cliente. Desvia da lista de entidades "na raiz" do guia; mantém as mesmas entidades e relações. |
| Valores monetários como número + código da moeda | Nunca como texto formatado (guia, seção 2). |
| Autor dos commits: `leandrowebmaster@gmail.com` | Pedido do dono do projeto; histórico anterior foi reescrito para usar este e-mail. |
| Tarefas lidas com `onSnapshot` em um provider único | Tempo real e dashboard/lista sempre consistentes, sem duplicar dados. |
| Prazo de tarefa gravado como `Timestamp` (meia-noite local) | Ordenação correta; exibição em pt-BR. |
| Regras por coleção, sem curinga em `users/{uid}/**` | Cada coleção valida seus campos; coleções novas só funcionam depois de ganharem regra. |
| Filtros e busca no navegador | Simples e suficiente para uso pessoal; evita índices compostos no Firestore. |
| Clientes: arquivar é o padrão, excluir é permanente e em cascata controlada | Evita perda acidental; excluir apaga interações e só desvincula as tarefas (nunca as apaga). |
| Interações como subcoleção `clients/{id}/interactions` | Histórico pertence ao cliente; carregado só quando o detalhe é aberto. |
| Tarefa guarda só `clientId`; nome vem do provider de clientes | Sem duplicar dados; renomear o cliente reflete em todas as telas. |
| Rota com parâmetro no hash (`#/clientes/{id}`) | Detalhe com URL própria sem adicionar biblioteca de rotas. |
| Progresso do projeto = concluídas ÷ não canceladas, mostrado na tela | Regra única (`projectProgress`) usada por lista, Kanban, detalhe e dashboard; sem tarefas, mostra "Sem tarefas" em vez de 0%. |
| Kanban sem arrastar e soltar; mudança de status por seletor | Acessível por teclado e leitor de tela, com menos código; usa o mesmo campo `status` da lista. |
| Tarefa guarda `projectId` e `clientId` independentes | Uma tarefa pode ter cliente sem projeto; ao criar pela página do projeto, o cliente do projeto é preenchido. |
| Marcos e diário como subcoleções do projeto | Crescem sem limite do documento e são carregados só no detalhe. |
| Links do projeto: só http/https | Evita esquemas perigosos (ex.: `javascript:`); abertos com `rel="noopener noreferrer"`. |
| Projeto de cliente arquivado continua visível | O cliente arquivado continua no cadastro; o projeto mostra "(arquivado)". |
| Datas: `Timestamp` (UTC) no Firestore, exibição no fuso do navegador | Um único critério em todo o app. Prazos e eventos de dia inteiro guardam a meia-noite local; mudar de fuso pode deslocar o dia exibido (preferência de fuso: commit 18). |
| Evento de marco como tipo de evento (não subcoleção do projeto) | Mantém a agenda simples, sem consultas entre coleções; marcos dentro do projeto continuam só no detalhe dele. |
| Agenda = eventos + prazos de tarefas + prazos de projetos, calculada no cliente | Fonte única de cada dado (sem cópias); a origem é sempre mostrada. |
| Lembrete salvo, sem envio | Notificações reais exigem infraestrutura que ainda não existe; a interface não promete envio. |
| Calendário mensal próprio (sem biblioteca) | Grade simples e acessível; evita dependência pesada. |
| Valor da proposta: número na moeda da proposta (unidade principal, arredondado pela moeda) | Nunca guardar texto formatado; formatar com `Intl` na tela; PYG sem casas decimais. Somas sempre por moeda. |
| Moedas aceitas: BRL, USD, EUR, PYG | Cobre os usos atuais; lista única em `utils/proposals.js` e nas regras do Firestore. |
| Status da proposta só muda pelo detalhe (com histórico); a edição não altera status | Garante histórico completo e que "Aceita" sempre passe pela confirmação. |
| Aceite nunca cria projeto sozinho | Três escolhas explícitas; "criar" só abre o formulário preenchido — o projeto nasce quando o usuário salva. |
| Regra de "sem retorno": último status/contato registrado há ≥ N dias (3/7/14/30), só Enviada/Em negociação | Simples de explicar e sem depender de edições cosméticas; "Registrar contato" zera a contagem. Preferência no `localStorage` até o commit 18. |
| Cliente com propostas não pode ser excluído | A proposta exige cliente; evita vínculo quebrado. Arquivar preserva o histórico comercial. |
| "Vencido" é derivado (Pendente + vencimento < hoje), nunca gravado | Evita status desatualizado; a regra é única (`effectiveStatus`) e exibida na tela. Regras do Firestore rejeitam `overdue` como status gravado. |
| Previsto ≠ Pendente | Previsto é estimativa (não é cobrança nem dinheiro); Pendente é conta confirmada. Previstos nunca vencem e ficam em coluna própria. |
| Totais sempre por moeda, sem conversão | Não há fonte de câmbio definida; somar moedas distintas seria enganoso. |
| Saldo realizado = recebido − pago | Só dinheiro efetivamente movimentado; previstos e pendentes não entram. |
| Período usa data do pagamento (pagos) ou vencimento (demais) | Um critério único e explicado; cada lançamento cai em um só período. |
| Vencimento obrigatório; cancelar em vez de excluir para preservar histórico | Todo lançamento tem data de referência; "Cancelada" mantém o registro fora dos totais. |
| Dados de demonstração removidos (`src/dev/fixtures.js`) | Todos os módulos que alimentavam o dashboard agora existem; nada fictício aparece mais. |
| Cronômetro ativo = documento único `timer/current`, iniciado por transação, com início = hora do servidor | Impede dois cronômetros (inclusive entre abas/aparelhos) no servidor, e a duração não depende do relógio do navegador nem de um contador em memória. |
| Duração sempre de timestamps (fim − início), gravada em segundos e validada nas regras | Relatórios coerentes; sem divergência entre duração e horários. |
| Registro com no máximo 24 h; fim ajustável ao parar | Protege contra cronômetro esquecido; o usuário informa o fim correto em vez de registrar dias de tempo falso. |
| Ajuste de registro grava os valores anteriores em `revisions` (imutável) | Nada some silenciosamente; histórico básico visível. |
| Registro conta no dia em que começou | Regra simples e previsível; registros que cruzam a meia-noite não são divididos. |
| Categoria e projeto do relatório vêm da tarefa atual | Evita duplicar dados; mudar a categoria/projeto da tarefa atualiza os relatórios (projeto gravado no registro é usado só quando não há tarefa). |
| "Faturável" é só uma marcação manual | O guia pede para não inferir faturamento a partir do tempo; nenhuma cobrança ou valor é gerado. |
| Sem pausar/retomar | Simplicidade: pausar = parar e iniciar outro registro; cada registro tem início e fim claros. |
