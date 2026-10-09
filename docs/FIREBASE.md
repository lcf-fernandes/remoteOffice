# Configurar o Firebase

1. Em https://console.firebase.google.com crie um projeto (ou use um existente).
2. **Adicionar app → Web** e copie os valores de configuração.
3. Copie `.env.example` para `.env` e preencha as variáveis `VITE_FIREBASE_*`. Reinicie `npm run dev`.
4. **Authentication → Método de login:** ative E-mail/senha.
5. **Firestore Database → Criar banco de dados:** comece em **modo de produção** (nega tudo por padrão).
6. Em **Authentication → Configurações → Domínios autorizados**, adicione o domínio de produção quando publicar.

## Segurança — leia antes de gravar dados reais

- A configuração `VITE_FIREBASE_*` é pública: qualquer pessoa que abrir o site consegue vê-la. Ela **não** protege nada.
- Quem protege os dados são as **regras do Firestore**. Deve existir, antes do primeiro dado real:
  - negar leitura e escrita para usuários não autenticados;
  - permitir que cada usuário acesse apenas os próprios registros (`request.auth.uid` igual ao dono do documento);
  - nenhuma permissão baseada em campo editável no cliente (por exemplo, um campo `role: "admin"`).
- As regras propostas e a forma de testá-las no emulador entram no **commit 09**.
- Nunca coloque service account, chave privada ou credenciais administrativas no frontend ou no Git.
