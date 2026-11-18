# Regras do projeto BagreScore

Este arquivo orienta agentes de código (Codex e similares) que alteram este
repositório. Leia antes de qualquer mudança e siga as regras abaixo.

## O que é o app

- PWA offline-first para organizar peladas, publicado pelo GitHub Pages.
- Sem etapa de build: o navegador carrega `index.html`, `style.css`,
  `app.js`, `manual-stats.js`, `ovr-repair.js` diretamente.
- Dados no aparelho ficam no IndexedDB; cada alteração entra na `syncQueue`
  e é enviada ao Google Apps Script (`apps-script/Code.gs`), que grava numa
  planilha do Google. Detalhes em `PAOA-SETUP.md`.

## CSS (`style.css`)

1. **Edite a regra que já existe.** Antes de estilizar um elemento, procure o
   seletor no arquivo e altere a regra existente. Não acrescente uma regra
   nova no fim do arquivo para sobrescrever outra.
2. **Não crie blocos marcados com versão** (por exemplo
   `/* ... interface v0.18.0 */`). O histórico fica no git, não no CSS.
3. **Estilo de componente, não de tela.** Prefira `.player-card { ... }` a
   `body[data-section="jogadores"] .player-card { ... }`. Use o seletor por
   tela só quando o componente realmente muda naquela tela.
4. **Evite `!important`.** Se precisar dele, há uma regra conflitante a ser
   corrigida.
5. **Desempenho no celular:** não use `backdrop-filter`, `filter: blur()` ou
   `drop-shadow` em elementos repetidos (cartões, linhas de lista, estrelas)
   nem em elementos `position: fixed`. Prefira fundo sólido semitransparente.
6. Ao remover uma tela ou componente, remova também o CSS dele.

## JavaScript (`app.js`)

1. **Não duplique funções.** Procure uma função existente antes de criar outra
   parecida.
2. Funções novas devem ser curtas (de preferência menos de 80 linhas). Se uma
   função existente passar disso ao ser alterada, divida-a.
3. **Troca de tela:** as telas escrevem em `#section-content` via
   `innerHTML`. O visual da tela nova (título, `body[data-section]`) é
   aplicado no momento dessa escrita (veja `installSectionContentCommitHook`).
   Carregue os dados **antes** de escrever no `#section-content`, nunca limpe
   a tela e espere dados depois.
4. **Fotos de jogador:** sempre exiba com `renderPlayerAvatar`, que usa
   miniaturas. Não coloque `player.foto` direto num `<img>`.
5. Não adicione atrasos artificiais (`setTimeout` só para "dar tempo" de
   animação) no fluxo de abrir o app ou trocar de tela.
6. Não altere `SYNC_INTERVAL_MS` / `LIVE_SYNC_INTERVAL_MS` sem motivo
   explícito do usuário.

## Versão e publicação

A versão aparece em quatro lugares e deve mudar junto, sempre:

- `APP_VERSION` em `app.js`;
- os `?v=` em `index.html` e `manifest.json`;
- `CACHE_VERSION` e os `?v=` em `service-worker.js`.

Registre cada versão com um parágrafo curto no topo de `PAOA-SETUP.md`,
dizendo o que mudou e se é preciso atualizar o Apps Script.

## Antes de terminar

1. Rode os testes: `node --test tests/*.test.cjs`
   (instale a dependência uma vez com `npm install`).
2. Confira a sintaxe: `node --check app.js`.
3. Abra o app no navegador e passe pelas telas que você alterou.
4. Mantenha as quebras de linha existentes dos arquivos (parte deles usa
   CRLF); não reformate arquivos inteiros.
