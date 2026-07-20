# BagreScore no modelo PAOA

O BagreScore usa o mesmo desenho geral do PAOA:

1. o aplicativo salva primeiro no IndexedDB do aparelho;
2. cada alteração entra na `syncQueue`;
3. o Google Apps Script autentica o usuário e grava a base central;
4. o servidor define horário e revisão oficiais;
5. os outros aparelhos baixam as alterações.

Enquanto a URL do Apps Script não estiver configurada, o aplicativo continua funcionando no modo local atual.

## 1. Criar o servidor

1. Acesse [script.google.com](https://script.google.com) e crie um projeto.
2. Substitua o conteúdo de `Code.gs` pelo arquivo [`apps-script/Code.gs`](apps-script/Code.gs).
3. Nas configurações do projeto, use o fuso `America/Fortaleza`.
4. Execute manualmente a função `setupBagreScore`.
5. Autorize o acesso solicitado pelo Google.
6. Abra o registro da execução. Ele mostrará:
   - endereço da planilha criada;
   - login inicial `admin`;
   - PIN administrativo temporário.

Se precisar consultar essas informações novamente, execute `getBagreScoreSetupInfo`. Se perder o PIN antes de conseguir entrar, execute `resetBagreScoreAdminPin`.

## 2. Publicar o Apps Script

1. Clique em **Implantar > Nova implantação**.
2. Escolha **Aplicativo da Web**.
3. Em **Executar como**, selecione sua própria conta.
4. Em **Quem pode acessar**, selecione a opção que permita acesso sem login Google, normalmente **Qualquer pessoa**.
5. Conclua a implantação e copie a URL terminada em `/exec`.

O endpoint pode ser acessado publicamente, mas os dados e operações exigem uma sessão BagreScore válida. PINs são armazenados apenas como hash com salt e segredo do servidor.

## 3. Conectar o aplicativo

1. Abra o BagreScore.
2. Entre em **Configurações**.
3. Na área **Conta e servidor**, cole a URL `/exec`.
4. Clique em **Salvar e conectar**.
5. Entre com o usuário `admin` e o PIN temporário.
6. Altere o PIN na mesma tela.

Depois disso, a fila local começará a ser enviada e a base remota será baixada para o aparelho.

## 4. Criar contas

Na área **Contas dos usuários**, o fluxo principal usa três perfis:

- **Administrador:** acesso completo, configurações e gestão de contas.
- **Operador:** gerencia jogadores, peladas, times, jogos, gols, assistências, faltas e demais eventos.
- **Jogador:** consulta o aplicativo inteiro e pode alterar somente a própria foto, apelido, posição e PIN.

Para uma pelada gerenciada em um único celular, a própria conta Administrador já é suficiente. A conta Operador só é necessária se outra pessoa for usar o aplicativo sem ter acesso às configurações administrativas.

Ao criar uma conta sem informar PIN, o servidor gera um PIN temporário e o mostra uma única vez no aplicativo. Entregue-o diretamente ao usuário.

Para criar uma conta Jogador, primeiro cadastre o atleta e depois selecione-o no campo **Vincular ao jogador**. Um jogador só pode estar vinculado a uma conta ativa. Atributos, overall, tipo de jogador, status e estatísticas não podem ser alterados pela conta Jogador.

## 5. Teste recomendado

1. Faça login no celular principal como Administrador.
2. Crie uma pelada de teste e monte pelo menos três times com os presets.
3. Inicie um jogo entre dois times e registre um gol, uma assistência e uma falta.
4. Confirme que placar, eventos e estatísticas foram atualizados no próprio celular.
5. Registre o segundo gol e confirme que a partida foi encerrada e salva no histórico.
6. Confira se o vencedor permaneceu e o time que estava esperando foi carregado no próximo confronto.
7. Teste uma substituição usando as opções **Somente neste jogo** e **Manter nos próximos jogos**.
8. Em um empate, escolha quem começa e confira a alternância da disputa de pênaltis.
9. Exclua o jogo ou a pelada de teste e confirme que os registros oficiais permaneceram intactos.
10. Abra o aplicativo no PC e confirme que o histórico foi sincronizado.

## Atualização 1.1.0 — fluxo rápido de pelada

Esta atualização foi feita de forma aditiva: os jogadores, peladas, jogos e estatísticas que já existiam continuam sendo considerados registros oficiais. Não é necessário zerar a base.

Principais mudanças:

- presets de times com 5 jogadores de linha e 1 goleiro;
- seleção rápida de confrontos e escalações carregadas automaticamente;
- vencedor permanece e enfrenta o próximo time da fila;
- edição dos times durante a pelada;
- substituição somente no jogo atual ou mantida nos próximos jogos;
- aviso quando um jogador retirado de outro time deixa o preset incompleto;
- desempate por pênaltis alternados, com escolha prévia de quem começa;
- placar do tempo normal separado do resultado dos pênaltis;
- peladas oficiais e peladas de teste;
- exclusão confirmada de jogos, peladas ou todos os registros de teste;
- remoção em cascata dos eventos relacionados, preservando os jogadores;
- atualização da API de sincronização para `1.5.0`.

Para publicar a atualização:

1. substitua o conteúdo do Apps Script pelo arquivo [`apps-script/Code.gs`](apps-script/Code.gs);
2. execute `setupBagreScore` novamente; ela apenas garante que a estrutura necessária exista;
3. em **Implantar > Gerenciar implantações**, edite o Aplicativo da Web;
4. selecione **Nova versão** e conclua a implantação, mantendo a mesma URL `/exec`;
5. publique os arquivos do aplicativo;
6. no celular, use **Forçar atualização** uma vez.

O aplicativo exige o Apps Script `1.5.0` para todas as operações novas de sincronização.

## Atualizações futuras

Sempre que `Code.gs` mudar, crie uma nova versão da implantação do Apps Script. A URL `/exec` pode continuar a mesma se a implantação existente for editada.

## Atualização 0.11 e limpeza dos testes

Esta versão adiciona a planilha `mudancas`, sincronização mais rápida e uma geração da base que impede aparelhos antigos de reenviar registros apagados.

Para aplicar:

1. substitua o `Code.gs` publicado pelo arquivo atualizado;
2. execute novamente `setupBagreScore` uma vez, para criar e preencher a planilha `mudancas`;
3. edite a implantação do Aplicativo da Web e selecione **Nova versão**;
4. force a atualização do BagreScore nos aparelhos;
5. entre como administrador e abra **Configurações**;
6. em **Zerar dados de teste**, digite `ZERAR BAGRESCORE` e confirme.

A limpeza preserva somente a conta administrativa atual e os perfis. Jogadores, peladas, jogos, eventos, contas de teste, filas e sessões são apagados. Todos os aparelhos serão desconectados e, no próximo login, descartarão automaticamente os dados antigos antes de baixar a base limpa.

Se aparecer **“Ação de API inválida”**, o arquivo foi salvo no editor, mas a implantação `/exec` ainda aponta para a versão anterior. Abra **Implantar > Gerenciar implantações**, edite o Aplicativo da Web, escolha **Nova versão** e confirme a implantação. Não é necessário trocar a URL quando a implantação existente é atualizada.
