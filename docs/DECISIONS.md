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
