const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function loadApp() {
  const source = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
  const context = vm.createContext({
    window: {}, console,
    localStorage: { getItem: () => null, setItem: () => {} },
    document: { querySelector: () => null },
  });
  vm.runInContext(source.replace('document.addEventListener("DOMContentLoaded", init);', `
    window.testApp = {
      state, buildNextRotation, ensureMatchDraftForSetup, collectGameFormData,
      handleGameFormSubmit,
      installFixtures(fixture) {
        state.selectedPeladaId = fixture.pelada.id;
        requirePermission = () => true;
        readActivePlayers = async () => fixture.players;
        getRecord = async () => fixture.pelada;
        findActiveGame = async () => null;
        readGamesForPelada = async () => fixture.games;
        readTeamPresets = async () => fixture.presets;
        showFormErrors = (id, errors) => { fixture.errors = errors; };
        putRecords = async (records) => { fixture.saved = records; };
        switchSection = async () => {};
        runBackgroundTask = () => {};
      },
    };
  `), context);
  return context.window.testApp;
}

function fixture() {
  const players = Array.from({ length: 17 }, (_, i) => ({
    id: `p${i}`, nome: `Player ${i}`, status: 'Ativo',
    tipoJogador: i < 15 ? 'Linha' : 'Goleiro',
    posicaoPrincipal: i < 15 ? 'ST' : 'GK',
  }));
  const line = (start) => players.slice(start, start + 5).map(p => p.id);
  const game = {
    id: 'first', peladaId: 'pelada', status: 'Finalizado', modoJogo: 'classica',
    placarA: 1, placarB: 0, numero: 1,
    timeA: { id: 'first-A', nome: 'Time A', cor: '#ff5a00' },
    timeB: { id: 'first-B', nome: 'Time B', cor: '#4aa3df' },
  };
  return {
    players, line, games: [game], presets: [],
    pelada: { id: 'pelada', status: 'Aberta', timeDaVez: { nome: 'Time C', linha: line(10) } },
    teams: ['A', 'B'].map((side, i) => ({
      id: `first-${side}`, time: side, linha: line(i * 5), goleiroId: `p${15 + i}`,
    })),
  };
}

function form(mode = 'classica', ids = {}) {
  return { elements: { modoJogo: { value: mode }, ...ids }, querySelector: () => null };
}

for (const winningSide of ['A', 'B']) {
  test(`manual rotation starts games 2 and 3 with winner on ${winningSide}`, async () => {
    const app = loadApp();
    const f = fixture();
    f.games[0].placarA = winningSide === 'A' ? 1 : 0;
    f.games[0].placarB = winningSide === 'B' ? 1 : 0;
    app.installFixtures(f);
    for (let number = 2; number <= 3; number++) {
      const previous = f.games.at(-1);
      f.pelada.proximoConfronto = app.buildNextRotation(f.pelada, previous, {
        presets: [], players: f.players, gameTeams: f.teams,
      });
      const expected = JSON.parse(JSON.stringify(f.pelada.proximoConfronto));
      app.ensureMatchDraftForSetup(f.pelada, []);
      await app.handleGameFormSubmit({ preventDefault() {}, currentTarget: form() });
      assert.equal(f.errors.length, 0, f.errors.join('; '));
      assert.ok(f.saved, 'the next game must be persisted');
      const game = f.saved.jogos[0];
      assert.equal(game.numero, number);
      assert.equal(game.status, 'Em andamento');
      assert.equal(game.presetAId, '');
      assert.equal(game.presetBId, '');
      assert.equal(game.timeA.nome, expected.nomeA);
      assert.equal(game.timeB.nome, expected.nomeB);
      assert.equal(f.saved.escalacoes.length, 12);
      for (const side of ['A', 'B']) {
        const team = f.saved.times.find(t => t.time === side);
        assert.deepEqual(Array.from(team.linha), expected['linha' + side]);
        assert.equal(team.goleiroId, expected['goleiro' + side + 'Id']);
      }
      f.teams = f.saved.times;
      f.games.push({ ...game, status: 'Finalizado', placarA: previous.placarA, placarB: previous.placarB });
      f.pelada = { ...f.saved.peladas[0], timeDaVez: { nome: 'Time D', linha: f.line(5) } };
      if (winningSide === 'B') f.pelada.timeDaVez.linha = f.line(0);
      f.saved = null;
    }
  });
}

test('saved presets retain their identities and rotation order', () => {
  const app = loadApp();
  const f = fixture();
  f.presets = ['A', 'B', 'C'].map((side, i) => ({ id: `preset-${side}`, nome: `Time ${side}`, linha: f.line(i * 5) }));
  Object.assign(f.games[0], { presetAId: 'preset-A', presetBId: 'preset-B', filaTimes: ['preset-C'] });
  f.pelada.proximoConfronto = app.buildNextRotation(f.pelada, f.games[0], {
    presets: f.presets, players: f.players, gameTeams: f.teams,
  });
  app.ensureMatchDraftForSetup(f.pelada, f.presets);
  const data = app.collectGameFormData(form(), f.players);
  assert.equal(data.presetAId, 'preset-A');
  assert.equal(data.presetBId, 'preset-C');
  assert.deepEqual(Array.from(f.pelada.proximoConfronto.fila), ['preset-B']);
});

for (const mode of ['classica', 'bagrecup']) {
  test(`${mode} still rejects a preset outside the current modality`, async () => {
    const app = loadApp();
    const f = fixture();
    app.installFixtures(f);
    await app.handleGameFormSubmit({ preventDefault() {}, currentTarget: form(mode, {
      presetAId: { value: 'other-modality-team' },
    }) });
    assert.ok(f.errors.includes('Escolha times da modalidade atual.'));
    assert.equal(f.saved, undefined);
  });
}
