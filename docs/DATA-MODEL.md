# Modelo de dados (Firestore)

Tudo pertence a um usuário e fica sob `users/{uid}/…`. Não há coleções na raiz. Os nomes de campo abaixo são os aceitos pelas regras (`firestore.rules`): qualquer campo fora da lista é **recusado**.

## Coleções

| Caminho | Campos principais | Observações |
|---|---|---|
| `users/{uid}` | `email`, `displayName` (≤ 60), `preferences`, `createdAt`, `updatedAt` | perfil criado no primeiro login; **não pode ser excluído** |
| `…/tasks/{id}` | `title`, `description`, `status`, `priority`, `due`, `category`, `tags[]`, `clientId`, `projectId`, `completedAt` | status: backlog, todo, in_progress, waiting, done, cancelled |
| `…/clients/{id}` | `name`, `company`, `email`, `phone`, `source`, `status`, `notes`, `nextAction`, `nextActionDate` | status: lead, active, inactive, archived |
| `…/clients/{id}/interactions/{id}` | `date`, `type`, `summary` | type: call, email, meeting, message, other |
| `…/projects/{id}` | `name`, `description`, `clientId`, `type`, `status`, `priority`, `startDate`, `dueDate`, `links[]` (≤ 10) | status: planning, active, waiting_client, review, completed, archived |
| `…/projects/{id}/milestones/{id}` | `title`, `date`, `done` | marcos do projeto |
| `…/projects/{id}/journal/{id}` | `date`, `text` | diário livre do projeto |
| `…/events/{id}` | `title`, `type`, `allDay`, `start`, `end`, `description`, `projectId`, `reminderMinutes` | type: meeting, appointment, milestone; o lembrete só é **guardado**, nenhuma notificação é enviada |
| `…/proposals/{id}` | `title`, `summary`, `clientId` (**obrigatório**), `amount`, `currency`, `sentDate`, `validUntil`, `status`, `nextAction`, `nextActionDate`, `projectId`, `lastActivityAt` | status: draft, sent, negotiation, accepted, rejected, expired |
| `…/proposals/{id}/history/{id}` | `kind` (created/status/contact), `from`, `to`, `at` | **imutável** (sem edição) |
| `…/transactions/{id}` | `description`, `type`, `amount` (> 0), `currency`, `status`, `dueDate` (obrigatório), `paidDate`, `category`, `clientId`, `projectId`, `notes` | status gravado: planned, pending, paid, cancelled; "pago" exige `paidDate` |
| `…/timer/current` | `start`, `description`, `taskId`, `projectId`, `billable` | **um único documento** (ID fixo): garante um cronômetro por vez |
| `…/timeEntries/{id}` | `description`, `taskId`, `projectId`, `start`, `end`, `durationSeconds`, `billable`, `source`, `revisionCount` | duração coerente com início/fim, máx. 24 h |
| `…/timeEntries/{id}/revisions/{id}` | `before{…}`, `at` | valores anteriores de cada ajuste; imutável |
| `…/notes/{id}` | `title`, `content` (≤ 10.000), `tags[]` (≤ 20), `clientId`, `projectId`, `taskId` | texto puro |
| `…/workLog/{id}` | `date`, `done`, `blockers`, `nextStep`, `clientId`, `projectId`, `taskId` | ao menos um dos três textos preenchido |
| `…/templates/{id}` | `name`, `description`, `projectType`, `tasks[]` (1 a 30) | cada tarefa: `title`, `description`, `priority`, `offsetDays`, `category` |

`preferences` (dentro de `users/{uid}`): `theme`, `currency`, `dateStyle`, `weekStart`, `context`, `hiddenBlocks[]`, `externalLinks[]` (≤ 10), `followUpDays`, `alertDueSoonDays`, `disabledAlerts[]`, `locale`.

## Convenções

- **Datas:** `Timestamp` (instante absoluto, UTC), exibidas no fuso do navegador. Prazos e eventos de "dia inteiro" guardam a **meia-noite local** do dia escolhido.
- **Dinheiro:** `amount` é um **número** na unidade principal da moeda (R$ 4.200,50 → `4200.5`), arredondado pelas casas da moeda (BRL/USD/EUR 2; PYG 0). Nunca texto formatado. Totais são sempre **por moeda**; moedas nunca são somadas nem convertidas.
- **Calculado, nunca gravado:** status "vencido" de lançamentos, progresso de projetos (concluídas ÷ não canceladas), alertas, motivo de follow-up, totais dos relatórios.
- **Vínculos:** são só o ID do outro registro (`clientId`, `projectId`, `taskId`). As regras **não verificam se o registro apontado existe**; o app trata ausência mostrando "(excluído)".

## O que acontece ao excluir (política)

| Excluir… | Efeito |
|---|---|
| **Cliente** | apaga as interações dele; **desvincula** (não apaga) tarefas, projetos, lançamentos, notas e registros de trabalho. **Bloqueado** se tiver propostas — use "Arquivar". |
| **Projeto** | apaga marcos e diário; **desvincula** tarefas, eventos, propostas, lançamentos, notas e registros de trabalho. |
| **Proposta** | apaga o histórico dela. |
| **Registro de tempo** | apaga os ajustes dele (e o tempo sai dos relatórios). |
| **Tarefa** | registros de tempo e notas que a citavam continuam e mostram "(tarefa excluída)". |
| **Modelo** | não afeta projetos já criados. |

"Arquivar" (clientes e projetos) e "Cancelar" (lançamentos) preservam o histórico fora das listas e dos totais.

## Limites que o servidor aplica

Tamanhos máximos de texto e de listas, valores numéricos (`amount` ≤ 1 trilhão), moedas e status válidos, `paidDate` só em lançamentos pagos, fim ≥ início em eventos e registros de tempo. Detalhes em [SECURITY.md](SECURITY.md) e no próprio `firestore.rules`.
