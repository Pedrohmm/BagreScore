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
2. Crie uma pelada de teste, confirme as presenças e monte pelo menos três times com 5 jogadores de linha.
3. Inicie um jogo entre dois times e registre um gol, uma assistência e uma falta.
4. Confirme que placar, eventos e estatísticas foram atualizados no próprio celular.
5. Registre o segundo gol e confirme que a partida foi encerrada e salva no histórico.
6. Confira se o vencedor permaneceu e o time que estava esperando foi carregado no próximo confronto.
7. Teste uma substituição usando as opções **Somente neste jogo** e **Manter nos próximos jogos**.
8. Em um empate, escolha quem começa e confira a alternância da disputa de pênaltis.
9. Exclua o jogo ou a pelada de teste e confirme que os registros oficiais permaneceram intactos.
10. Abra o aplicativo no PC e confirme que o histórico foi sincronizado.

## Atualização 1.1.6 — fluxo rápido de pelada

Esta atualização foi feita de forma aditiva: os jogadores, peladas, jogos e estatísticas que já existiam continuam sendo considerados registros oficiais. Não é necessário zerar a base.

Principais mudanças:

- presets de times com 5 jogadores de linha;
- seleção rápida de confrontos e escalações carregadas automaticamente;
- vencedor permanece e enfrenta o próximo time da fila;
- edição dos times durante a pelada;
- substituição somente no jogo atual ou mantida nos próximos jogos;
- aviso quando um jogador retirado de outro time deixa o preset incompleto;
- desempate por pênaltis alternados, com escolha prévia de quem começa;
- cada jogador cobra uma vez antes de o time reiniciar a ordem de cobradores;
- áreas de confrontos e times separadas dentro da mesma pelada;
- interface mais limpa, com explicações redundantes removidas;
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

## Atualização 1.2.0 — presenças, fila e goleiros por confronto

Esta atualização também é aditiva e preserva todos os registros oficiais existentes.

- os formulários e seletores abertos não são mais fechados por uma sincronização em segundo plano;
- cada atleta pode ser marcado como **Presente**, **Atrasado** ou **Ausente**;
- os presets guardam somente os 5 jogadores de linha;
- os goleiros são escolhidos separadamente em cada confronto e podem trocar de lado;
- quando houver menos de dois cards de goleiro presentes, o card **Goleiro Reserva** fica disponível;
- o organizador informa quem está fisicamente usando o Goleiro Reserva, mas as estatísticas de goleiro ficam somente no card reserva;
- o Goleiro Reserva participa dos rankings específicos de goleiro, mas não concorre a MVP, Bagre ou ranking individual geral;
- com três times completos, permanece a rotação por times; sem três times completos, o vencedor fica e a fila de jogadores forma o desafiante, completado por atletas do time que perdeu;
- a escalação sugerida continua editável antes de iniciar o próximo jogo;
- o Ranking permite alternar entre todas as peladas oficiais e uma pelada específica;
- peladas de teste continuam fora dos rankings oficiais.

Como o formato de sincronização já aceita esses campos adicionais, não é necessário substituir o `Code.gs` apenas por causa da versão 1.2.0. Publique os arquivos do aplicativo e use **Forçar atualização** no celular.

## Correção 1.2.1 — confrontos e rotação

Esta correção preserva os jogadores, as peladas e todos os resultados já registrados.

- a troca dos seletores carrega somente os jogadores do preset escolhido;
- as escalações do confronto sugerido são restauradas pelo ID do time, mesmo quando ele muda de lado;
- o goleiro escolhido não é mais sobrescrito ao redesenhar a tela;
- selecionar o goleiro do adversário troca automaticamente os dois goleiros de lado;
- **Manter nos próximos jogos** atualiza o preset e remove do time de origem qualquer atleta transferido;
- a rotação seguinte usa a escalação do jogo como fonte principal e possui fallback para escalações e presets;
- ao criar a próxima partida, todo o estado do confronto anterior é limpo antes de carregar a sugestão;
- confrontos antigos com a escalação vencedora vazia são recuperados a partir do preset salvo.

Não é necessário atualizar o `Code.gs` para a versão 1.2.1. Publique os arquivos do aplicativo e use **Forçar atualização** uma vez no celular.

## Atualização 1.2.2 — nova tela inicial

- A marca e o menu passaram a ocupar uma única barra superior compacta.
- **Destaques da semana** agora considera somente a pelada oficial finalizada mais recente.
- **Destaques gerais** soma gols, assistências, MVPs e Bagres de todas as peladas oficiais.
- Peladas marcadas como teste continuam fora das estatísticas oficiais.
- A pelada em destaque e os cards de estatísticas ficaram mais compactos para uso no celular.

Não é necessário atualizar o `Code.gs` para a versão 1.2.2. Publique os arquivos do aplicativo e use **Forçar atualização** uma vez no celular.

## Ajuste 1.2.3 — cards de destaques

- Removidos os selos “Última pelada” e “Histórico”.
- Removido o texto explicativo abaixo de **Destaques gerais**.
- **Destaques da semana** e **Destaques gerais** agora usam a mesma grade visual.
- Cards receberam melhor contraste, hierarquia e acabamento para o celular.

Não é necessário atualizar o `Code.gs` para a versão 1.2.3. Publique os arquivos do aplicativo e use **Forçar atualização** uma vez no celular.

## Ajuste 1.2.4 — destaques compactos

- Removido o excesso de espaço vertical dos cards.
- Retirados os círculos decorativos que competiam com fotos e estatísticas.
- Os quatro destaques agora formam uma única matriz compacta, com divisórias discretas.
- Categoria, jogador e número ficaram próximos e com leitura mais rápida.

Não é necessário atualizar o `Code.gs` para a versão 1.2.4. Publique os arquivos do aplicativo e use **Forçar atualização** uma vez no celular.

## Ajuste 1.2.5 — título da pelada em destaque

- “Pelada em destaque” agora aparece alinhado à esquerda.
- O título ganhou o mesmo tamanho e a mesma barra laranja das demais seções.
- O estado vazio e o botão continuam centralizados para manter a ação evidente.

Não é necessário atualizar o `Code.gs` para a versão 1.2.5. Publique os arquivos do aplicativo e use **Forçar atualização** uma vez no celular.

## Ajuste 1.2.6 — elenco direto e ranking limpo

- A aba **Jogadores** agora abre diretamente no elenco cadastrado.
- O acesso ao cadastro virou uma ação única e compacta acima da lista.
- Foi removida a etapa intermediária “Abrir elenco”.
- No **Ranking**, o filtro não repete mais o rótulo “Período do ranking”.
- As categorias não exibem mais contagens redundantes como “19 no ranking”.
- Os cards do pódio e da classificação exibem apenas o valor da categoria, sem repetir seu nome em cada jogador.

Não é necessário atualizar o `Code.gs` para a versão 1.2.6. Publique os arquivos do aplicativo e use **Forçar atualização** uma vez no celular.

## Atualização 1.2.9 — empate com quatro times

- A nova dinâmica é ativada somente quando a pelada possui exatamente quatro times cadastrados.
- Ao encerrar uma partida empatada, o aplicativo pergunta se haverá disputa de pênaltis ou se os dois times em campo sairão.
- Em **Saem os dois times**, o jogo é salvo como empate e os dois times que estavam fora são preparados automaticamente para o próximo confronto.
- Os times que saíram passam a compor a fila seguinte, preservando o ciclo dos quatro times.
- Em **Disputar pênaltis**, o fluxo anterior é mantido: o vencedor permanece e enfrenta o próximo time da fila.
- Com dois ou três times, a regra atual continua sem alterações.

Não é necessário atualizar o `Code.gs` para a versão 1.2.9. Publique os arquivos do aplicativo e use **Forçar atualização** uma vez no celular.

## Atualização 1.3.0 — evolução rápida e balanceada

- Atributos abaixo de 60 agora precisam de 3 XP para evoluir; de 60 a 69 precisam de 4 XP; a partir de 70 precisam de 5 XP.
- Gols distribuem XP pelos seis atributos ativos, com maior peso para finalização.
- Vitórias premiam o atributo central de cada posição.
- Jogos sem sofrer gols contam inclusive em empates por 0 a 0.
- Zagueiros recebem o maior bônus defensivo; meias recebem bônus intermediário e atacantes recebem um bônus pequeno.
- Goleiros passam a receber XP por participação, vitória e jogo sem sofrer gols.
- O Bagre da Pelada deixa de perder XP.
- A finalização da pelada permite escolher, opcionalmente, o Defensor da Pelada.
- As novas bonificações por resultado valem para jogos criados a partir desta versão, preservando a evolução registrada anteriormente.

Não é necessário atualizar o `Code.gs` para a versão 1.3.0. Publique os arquivos do aplicativo e use **Forçar atualização** uma vez no celular.

## Atualização 1.3.6 — confronto direto e Time da vez automático

- a aba **Confrontos** não exige mais a criação prévia de dois times;
- o primeiro confronto abre com os lados A e B vazios, sem jogadores ou goleiros selecionados;
- jogadores e goleiros são escolhidos diretamente entre os atletas presentes;
- times salvos continuam disponíveis, mas agora funcionam apenas como atalhos opcionais;
- ao iniciar a partida, até cinco jogadores de linha presentes que ficaram fora formam automaticamente o **Time da vez**;
- o Time da vez continua editável durante o jogo e será preparado para enfrentar o vencedor;
- a rotação por vencedor também funciona em peladas que nunca tiveram times salvos;
- peladas, jogos e times criados nas versões anteriores continuam compatíveis.

Não é necessário atualizar o `Code.gs` para a versão 1.3.6. Publique os arquivos do aplicativo e use **Forçar atualização** uma vez no celular.

## Atualização 1.3.7 — identidade dos times e Time da vez manual

- o nome e a cor dos dois times podem ser editados diretamente no confronto;
- os nomes editáveis aparecem alinhados horizontalmente, separados por **VS**;
- o título duplicado do confronto e o aviso inferior sobre a próxima equipe foram removidos;
- o aplicativo não preenche mais automaticamente o **Time da vez**;
- durante a partida ao vivo, o organizador monta manualmente o Time da vez apenas com jogadores que estão fora de campo;
- o vencedor continua carregado automaticamente para enfrentar o Time da vez selecionado.

Não é necessário atualizar o `Code.gs` para a versão 1.3.7. Publique os arquivos do aplicativo e use **Forçar atualização** uma vez no celular.

## Atualização 1.3.8 — limite da escalação e cabeçalho simplificado

- cada time aceita no máximo 5 jogadores de linha;
- ao atingir o limite, os demais jogadores ficam bloqueados até alguém ser desmarcado;
- a edição do nome e da cor do time agora fica dentro do modal **Editar escalação**;
- o texto explicativo “Mostrando jogadores...” foi removido;
- o confronto e os cartões exibem somente os nomes escolhidos, sem os rótulos genéricos “Time A” e “Time B”.

Não é necessário atualizar o `Code.gs` para a versão 1.3.8. Publique os arquivos do aplicativo e use **Forçar atualização** uma vez no celular.

## Atualização 1.3.9 — prontidão visual do confronto

- os avisos individuais de jogador ocupado não aparecem mais dentro da lista de escalação;
- o confronto incompleto recebe borda e brilho vermelhos; quando pronto, o efeito muda para verde;
- o selo superior foi substituído pelos textos simples **Times incompletos** e **Bagres prontos**;
- o botão liberado passa a se chamar **Iniciar pelada dos bagres** e usa o mesmo verde do estado pronto;
- o detalhamento “0/5” e os textos vazios do histórico foram removidos;
- o título do histórico usa o mesmo estilo de **Próximo confronto**, com caixa e jogos mais compactos;
- o marcador **VS** foi centralizado verticalmente entre as caixas dos times.

Não é necessário atualizar o `Code.gs` para a versão 1.3.9. Publique os arquivos do aplicativo e use **Forçar atualização** uma vez no celular.

## Atualização 1.3.10 — modais de escalação compactos

- o botão verde agora exibe **INICIAR PELADA DOS BAGRES** em letras maiúsculas e centralizadas;
- **Monte a escalação** e **Escolha o goleiro** passaram para o cabeçalho do modal;
- o contador `0/5` ou `0/1` aparece ao lado do título no cabeçalho;
- a identidade do time ficou mais compacta;
- o campo de busca agora aparece na mesma linha de **Buscar jogador**;
- os botões de salvar e cancelar ficam lado a lado também no celular.

Não é necessário atualizar o `Code.gs` para a versão 1.3.10. Publique os arquivos do aplicativo e use **Forçar atualização** uma vez no celular.

## Atualização 1.3.11 — histórico em formato de relatório

- o botão bloqueado agora exibe **COMPLETE OS TIMES** em letras maiúsculas e centralizadas;
- cada jogo do histórico ganhou uma coluna com número e ícone de relatório;
- o placar passou a destacar os nomes e as cores dos dois times;
- decisões por pênaltis aparecem abaixo do placar;
- cada gol exibe ícone de bola, autor e horário no padrão `5'30''`;
- os novos gols guardam também o tempo exato em segundos, mantendo compatibilidade com registros antigos;
- o cartão inteiro continua abrindo o relatório detalhado da partida.

Não é necessário atualizar o `Code.gs` para a versão 1.3.11. Publique os arquivos do aplicativo e use **Forçar atualização** uma vez no celular.

## Atualização 1.3.12 — tela Ao Vivo compacta

- O placar ao vivo ficou menor e passou a exibir os nomes dos times em caixas arredondadas com as cores escolhidas.
- O próximo desafiante mostra cinco posições clicáveis; qualquer posição abre a seleção manual dos jogadores.
- Os textos auxiliares e o botão **Editar** foram removidos do próximo desafiante.
- O cabeçalho de eventos e o indicador **Tempo real** foram alinhados e compactados.

Não é necessário atualizar o `Code.gs` para a versão 1.3.12. Publique os arquivos do aplicativo e use **Forçar atualização** uma vez no celular.

## Atualização 1.3.13 — seleção do próximo desafiante padronizada

- A tela de seleção do próximo desafiante agora usa o mesmo desenho compacto das demais escalações.
- Nome, cor e contador ficam no cabeçalho do formulário, e a busca ocupa uma única linha.
- Jogadores em campo continuam bloqueados e identificados sem alterar a montagem manual do time seguinte.

Não é necessário atualizar o `Code.gs` para a versão 1.3.13. Publique os arquivos do aplicativo e use **Forçar atualização** uma vez no celular.

## Atualização 1.3.14 — gerenciamento de peladas mais objetivo

- O cartão sem pelada aberta ficou menor e não exibe mais a frase auxiliar.
- O painel foi renomeado para **Ambiente de testes** e recebeu um visual inteiramente dourado.
- O botão **Limpar testes** foi centralizado com o título.
- Os cartões de teste não mostram mais os selos inferiores de tipo/status nem a seta, mas continuam abrindo normalmente ao toque.

Não é necessário atualizar o `Code.gs` para a versão 1.3.14. Publique os arquivos do aplicativo e use **Forçar atualização** uma vez no celular.

## Atualização 1.3.15 — ações de exclusão no Gerenciar

- O cartão oficial agora mostra **Próxima pelada oficial** e o status ao lado do título.
- O selo **Oficial** e o texto **Abrir pelada** foram removidos.
- A ação **Excluir pelada** voltou a ficar visível diretamente no rodapé do cartão oficial e usa a confirmação segura já existente.
- A ação **Limpar testes** foi movida para o rodapé do ambiente de testes.

Não é necessário atualizar o `Code.gs` para a versão 1.3.15. Publique os arquivos do aplicativo e use **Forçar atualização** uma vez no celular.

## Atualização 1.3.16 — cabeçalhos de Jogadores e Ranking

- A aba **Jogadores** agora usa **Elenco BagreScore** como título principal.
- O bloco do elenco reúne **Elenco cadastrado**, quantidade de jogadores e **Cadastrar jogador** em um cabeçalho compacto.
- A aba **Ranking** exibe somente o título **Ranking**, sem o texto “Leaderboard”.

Não é necessário atualizar o `Code.gs` para a versão 1.3.16. Publique os arquivos do aplicativo e use **Forçar atualização** uma vez no celular.

## Atualização 1.3.17 — cabeçalho integrado do elenco

- **Elenco BagreScore** e **Elenco cadastrado** agora fazem parte da mesma caixa.
- O cabeçalho do elenco recebeu hierarquia visual mais discreta e alinhada ao restante do aplicativo.
- Quantidade e ação de cadastro permanecem compactas na linha inferior.

Não é necessário atualizar o `Code.gs` para a versão 1.3.17. Publique os arquivos do aplicativo e use **Forçar atualização** uma vez no celular.

## Atualização 1.3.18 — contador e cadastro do elenco

- Removido o subtítulo **Elenco cadastrado**.
- A quantidade de jogadores ganhou o mesmo destaque laranja dos títulos do aplicativo.
- **Cadastrar jogador** agora ocupa toda a largura abaixo do contador, com o texto centralizado.

Não é necessário atualizar o `Code.gs` para a versão 1.3.18. Publique os arquivos do aplicativo e use **Forçar atualização** uma vez no celular.

## Atualização 1.3.19 — título do Ranking

- O título **Ranking** agora segue o mesmo acabamento visual de **Elenco BagreScore**.
- A caixa integrada ganhou barra lateral laranja, tipografia branca e separador discreto.

Não é necessário atualizar o `Code.gs` para a versão 1.3.19. Publique os arquivos do aplicativo e use **Forçar atualização** uma vez no celular.

## Atualização 1.3.20 — início mais compacto

- O estado vazio agora informa apenas **Nenhuma pelada marcada**.
- A frase auxiliar foi removida para reduzir a altura do primeiro bloco.
- O símbolo **+** foi incorporado ao botão **Criar pelada**.
- Espaçamentos, título e botão foram compactados para ampliar a área útil da tela inicial.

Não é necessário atualizar o `Code.gs` para a versão 1.3.20. Publique os arquivos do aplicativo e use **Forçar atualização** uma vez no celular.

## Atualização 1.3.21 — limpeza e otimização interna

- Funções antigas e fluxos de interface que não eram mais utilizados foram removidos do JavaScript.
- O funcionamento e o visual atuais foram preservados.
- Arquivos temporários de desenvolvimento deixaram de ser incluídos na publicação.
- A versão do aplicativo e do cache foi atualizada para evitar que o celular mantenha arquivos antigos.

Não é necessário atualizar o `Code.gs` para a versão 1.3.21. Publique os arquivos do aplicativo e use **Forçar atualização** uma vez no celular.

## Correção 1.3.22 — finalização sem times salvos

- O botão **Finalizar pelada** voltou a aparecer no histórico assim que houver pelo menos um jogo finalizado.
- A finalização não depende da criação de times salvos; usa diretamente os jogos e as escalações já registrados.
- Peladas e partidas existentes são preservadas, inclusive os registros criados antes desta atualização.
- Se ainda houver uma partida em andamento, o botão permanece visível, mas bloqueado até essa partida ser encerrada.

Não é necessário atualizar o `Code.gs` para a versão 1.3.22. Publique os arquivos do aplicativo e use **Forçar atualização** uma vez no celular.

## Atualização 1.3.23 — modalidades de jogadores

- O cadastro separa **Situação** (Ativo ou Inativo) de **Modalidade** (Mensalista ou Convidado).
- Jogadores mensalistas recebem identificação e acabamento dourados no card; convidados mantêm o visual tradicional.
- A aba **Jogadores** permite filtrar Todos, Mensalistas e Convidados, com contadores por modalidade.
- Registros antigos com status Convidado são reconhecidos automaticamente como convidados ativos, sem alteração do histórico.
- Os demais registros antigos são tratados como mensalistas até que o cadastro seja editado.

Não é necessário atualizar o `Code.gs` para a versão 1.3.23. Publique os arquivos do aplicativo e use **Forçar atualização** uma vez no celular.

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
