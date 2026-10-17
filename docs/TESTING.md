# Testes: o que existe, como rodar e o que NÃO cobrem

| Comando | O que testa | Precisa de |
|---|---|---|
| `npm test` | **Lógica pura** (cálculos, validações, filtros, alertas, modelos, datas), **análise estática** das regras do Firestore e **segurança estática** do código (APIs perigosas, links, segredos). 297 casos. | só Node |
| `npm run test:tz` | A mesma suíte em **7 fusos horários** (UTC, Assunção, São Paulo, Nova York, Lisboa, Auckland, Kolkata), incluindo dias com mudança de horário de verão. | só Node |
| `npm run test:ui` | A **interface inteira** rodando em jsdom com um **Firebase simulado em memória**: todas as telas com dados, login/sessão, isolamento por usuário, formulários inválidos e valores extremos, exclusão com relacionamentos, modelos (tudo ou nada), cronômetro, falhas de rede, links diretos, preferências, dados hostis. 89 casos. | só Node |
| `npm run e2e:build` + `npm run test:layout` | A interface em um **Chromium real**, em 6 larguras (360 a 1920 px) × 39 telas, claro/escuro, com textos enormes e ≈ 2.400 registros: rolagem horizontal, elementos fora da tela, erros de console, desempenho e capturas de tela. | `puppeteer-core` e `@sparticuz/chromium` (instalar à parte) |
| `npm run test:a11y` | **Acessibilidade** com axe-core (WCAG A/AA e boas práticas), claro/escuro, desktop/celular. | idem + `axe-core` |
| `npm run test:rules` | As **regras do Firestore** no emulador (acesso cruzado, validação de campos). | Java + `firebase-tools` com acesso à internet para baixar o emulador |

Instalação dos extras de navegador (fora do `package.json`, porque são pesados):
`npm install --no-save puppeteer-core @sparticuz/chromium axe-core`

## O que estes testes provam — e o que não provam

**Provam:** a lógica de negócio e as validações; que cada tela renderiza com dados reais sem exceções nem avisos do React; que o app só lê e grava em `users/{uid}`; que cascatas de exclusão desvinculam em vez de apagar; que falhas de rede/sessão dão mensagens claras e não perdem o que foi digitado; que textos gigantes e listas grandes não quebram o layout; que o tema escuro tem contraste suficiente.

**NÃO provam:**
1. **As regras de segurança do Firestore em execução.** O emulador não pôde ser baixado no ambiente de desenvolvimento. `npm test` só faz análise *estática* do `firestore.rules` (toda permissão exige `isOwner(uid)`, toda escrita valida campos, a regra final nega o resto, toda coleção usada pelo código tem regra). Os 19 casos de `tests/firestore.rules.test.js` estão escritos mas **nunca foram executados**. Rode `npm run test:rules` na sua máquina antes de confiar nas regras.
2. **O comportamento com o Firebase de verdade.** Os testes de interface usam um simulador próprio (`tests/ui/fake-firebase`); ele reproduz a API usada, mas é escrito por nós e é permissivo (não aplica regras). Faltam login real, índices, latência real, modo offline do SDK e limites de cota.
3. **Outros navegadores.** O layout foi verificado só no Chromium. Firefox e Safari (inclusive iOS) não foram testados.
4. **Uso real em celular/teclado.** Não há teste de toque, teclado virtual ou leitores de tela (o axe só pega o que é detectável automaticamente).

## Como as falhas foram investigadas (regra do projeto)

Nenhum teste foi "afrouxado" para passar. Quando um teste falhou, foi decidido se o erro estava no teste ou no app; só o que foi reproduzido virou correção, com teste de regressão. Os testes têm **controle negativo** (por exemplo, quebrar de propósito uma validação ou uma regra e ver o teste reprovar).
