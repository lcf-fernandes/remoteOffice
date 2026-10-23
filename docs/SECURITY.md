# Segurança

## Modelo

App **pessoal, de um único usuário**. O site é público (qualquer um vê a tela de login) e a configuração do Firebase, inclusive a chave de API, vai no código para o navegador: **ela não é segredo**. O que protege os dados é (1) quem consegue entrar e (2) as **regras do Firestore**, que o servidor aplica a cada leitura e escrita.

## Camadas

1. **Autenticação:** Firebase Authentication com e-mail e senha. Não há tela de cadastro; o usuário é criado no console.
2. **Regras do Firestore** (`firestore.rules`): tudo é **negado por padrão**; cada usuário só acessa `users/{seu uid}` e o que está abaixo; toda escrita valida campos, tipos e tamanhos e recusa campos extras; histórico de propostas e ajustes de tempo não podem ser editados; o perfil não pode ser excluído; o cronômetro é um único documento (impede dois ao mesmo tempo). A identidade vem de `request.auth.uid`, nunca de um campo do documento.
3. **No código do app:** React escapa todo texto (não há HTML bruto nem `eval`); links de projeto e atalhos só viram link se forem `http(s)` e são revalidados ao **ler** do banco; e-mail de cliente só vira `mailto:` se for um endereço simples; links externos abrem com `rel="noopener noreferrer"`; nenhuma chave, token ou senha no código; `.env` fora do Git. Testes automáticos travam esses pontos (`npm test`).

## O que as regras NÃO garantem (limites conhecidos)

- **Itens dentro de listas** (atalhos externos, tarefas de um modelo, links de projeto) só são validados no app; as regras limitam apenas o tipo e o tamanho da lista.
- **Vínculos entre registros** (`clientId` etc.) não são conferidos no servidor: o ID pode apontar para algo que não existe. O app lida com isso mostrando "(excluído)".
- **Datas de criação/atualização** (`createdAt`, `updatedAt`) não são impostas como hora do servidor (só o início do cronômetro é).
- **As regras nunca foram executadas em um emulador** (ele não pôde ser baixado no ambiente de desenvolvimento). Elas passam por uma análise estática automatizada e por revisão, mas o comportamento real só será comprovado rodando `npm run test:rules` (exige Java) na sua máquina.
- O app **nunca foi exercitado contra o Firebase de verdade** em testes automatizados.

## Checklist manual no console (recomendado)

- [ ] **Desativar o cadastro público.** Como a chave de API é pública, qualquer pessoa pode tentar criar uma conta pela API do Firebase. Essa conta só enxergaria os próprios dados (as regras garantem), mas poderia gravar dados no seu projeto. Em *Authentication → Configurações → Ações do usuário*, desmarque **"Ativar criação (cadastro)"** (se a opção aparecer no seu console) depois de criar o seu usuário. Confira em *Usuários* que existe só a sua conta.
- [ ] **Restringir a chave de API** (Google Cloud Console → APIs e serviços → Credenciais → chave do navegador → restrição por **referenciadores HTTP**: o seu domínio publicado e `localhost`). Não impede quem copia o código de usar o domínio, mas reduz abuso.
- [ ] **Domínios autorizados** (Authentication): só o domínio publicado e `localhost`.
- [ ] **Publicar as regras** e conferir a data de publicação; rodar `npm run test:rules`.
- [ ] **Alerta de orçamento** em Faturamento (mesmo no plano gratuito), para ser avisado de uso anormal.
- [ ] **Senha forte e exclusiva** para o usuário do app.
- [ ] **Revogar qualquer token** (por exemplo, de GitHub) que tenha sido colado em conversas ou arquivos.
- [ ] **App Check** (não implementado): reduz o uso do seu projeto por clientes que não são o seu app; exige configuração adicional (provedor reCAPTCHA).

## Se suspeitar de acesso indevido

1. Troque a senha do usuário e, no console, desative ou exclua contas desconhecidas.
2. Se precisar travar tudo na hora: em *Firestore → Regras*, publique `allow read, write: if false;` na regra principal (o app para de funcionar até você restaurar o `firestore.rules`).
3. Revise o que mudou (`updatedAt`, históricos) e, se necessário, restaure de um backup ([BACKUP.md](BACKUP.md), quando existir).

Dependências: veja em `docs/PROGRESS.md` (commit 21) o resultado do `npm audit` e por que os avisos atuais não chegam ao navegador.
