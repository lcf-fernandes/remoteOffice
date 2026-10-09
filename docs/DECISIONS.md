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
