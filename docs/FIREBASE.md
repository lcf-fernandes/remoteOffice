# Configurar o Firebase

1. Em https://console.firebase.google.com crie um projeto (ou use um existente).
2. **Adicionar app → Web** e copie os valores de configuração.
3. Copie `.env.example` para `.env` e preencha as variáveis `VITE_FIREBASE_*`. Reinicie `npm run dev`.
4. **Authentication → Método de login:** ative E-mail/senha. Em **Usuários**, crie o seu usuário (o app não tem cadastro público).
5. **Firestore Database → Criar banco de dados:** comece em **modo de produção** (nega tudo por padrão).
6. Em **Authentication → Configurações → Domínios autorizados**, adicione o domínio de produção quando publicar.

## Segurança — leia antes de gravar dados reais

- A configuração `VITE_FIREBASE_*` é pública: qualquer pessoa que abrir o site consegue vê-la. Ela **não** protege nada.
- Quem protege os dados são as **regras do Firestore**. Deve existir, antes do primeiro dado real:
  - negar leitura e escrita para usuários não autenticados;
  - permitir que cada usuário acesse apenas os próprios registros (`request.auth.uid` igual ao dono do documento);
  - nenhuma permissão baseada em campo editável no cliente (por exemplo, um campo `role: "admin"`).
- As regras estão em `firestore.rules`. Teste-as com `npm run test:rules` (emulador; requer Java) e só então publique: `npx firebase-tools deploy --only firestore:rules --project <id-do-projeto>`.
- Os dados ficam em `users/{uid}/...`; ver [DECISIONS.md](DECISIONS.md).
- Nunca coloque service account, chave privada ou credenciais administrativas no frontend ou no Git.

## Publicar na Vercel

O Vite grava as variáveis `VITE_*` **no momento do build**: elas precisam existir na Vercel antes do deploy, e qualquer mudança exige um novo deploy. O arquivo `.env` local não vai para o Git, então a Vercel não o enxerga.

1. Vercel → projeto → **Settings → Environment Variables**.
2. Cadastre as 6 variáveis `VITE_FIREBASE_*` (mesmos nomes do `.env.example`, valores do app Web do Firebase), marcadas para **Production, Preview e Development**.
3. **Deployments →** `⋯` do último deploy **→ Redeploy** (ou faça um novo commit).
4. No Firebase: **Authentication → Configurações → Domínios autorizados → Adicionar domínio** e inclua o domínio da Vercel (ex.: `remote-office-omega.vercel.app`). Sem isso o login falha com `auth/unauthorized-domain`.
5. URLs de *preview* da Vercel (uma por commit/branch) são domínios diferentes: o Firebase não aceita curinga, então teste pela URL de produção ou adicione cada preview que quiser usar.

Configurações de build esperadas (a Vercel detecta o Vite sozinha): comando `npm run build`, saída `dist`. A navegação usa `#/` (hash), então não é preciso configurar redirecionamentos.
