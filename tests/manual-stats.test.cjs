const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { IDBFactory } = require('fake-indexeddb');
const manual = require('../manual-stats.js');
const plain = value => JSON.parse(JSON.stringify(value));

const batch = {
  id: 'anotacoes-test-2026-09-09', data: '2026-09-09', modoJogo: 'classica',
  jogadores: [
    { nome: 'Atacante', gols: 4, assistencias: 3 },
    { nome: 'Goleiro', gols: 0, assistencias: 1, goleiro: true },
  ],
};

async function app() {
  const indexedDB = new IDBFactory();
  const window = { indexedDB, BagreScoreManualStats: manual, crypto: require('node:crypto').webcrypto };
  const context = vm.createContext({ window, indexedDB, structuredClone, console, navigator: { onLine: true },
    localStorage: { getItem: () => null, setItem: () => {} }, document: { querySelector: () => null } });
  const source = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
  vm.runInContext(source.replace('document.addEventListener("DOMContentLoaded", init);', `
    window.testApp = {
      state, openLocalDatabase, putRecords, getAllRecords, getRecord, readManualStatsSnapshot,
      importManualStats, undoManualStats, commitManualStats, calcularEstatisticasJogadores,
      buildEventEvolutionChanges, aplicarEvolucaoPorEventos, defaultAttributes,
      getRankingMonthOptions, getOverallRankingEntries,
      install() {
        state.backendUrl = 'https://example.invalid/exec';
        state.authToken = 'test-only';
        state.currentUser = { id: 'test-admin', permissoes: ['*'] };
        syncLatestMutations = async () => ({ ok: true, version: '1.6.2', hasMore: false });
        runBackgroundTask = () => {};
        downloadManualStatsBackup = backup => { window.testBackup = backup; };
      },
      failBackup() { downloadManualStatsBackup = () => { throw new Error('backup failed'); }; },
    };
  `), context);
  const api = window.testApp;
  api.state.db = await api.openLocalDatabase();
  api.install();
  const players = [
    { id: 'line', nome: 'Atacante', apelido: 'Atacante', posicaoPrincipal: 'ST', tipoJogador: 'Linha', overall: 59, estrelas: 3, revision: 7 },
    { id: 'gk', nome: 'Goleiro', apelido: 'Goleiro', posicaoPrincipal: 'GK', tipoJogador: 'Goleiro', overall: 59, estrelas: 3, revision: 4 },
  ];
  const attributes = players.map(player => ({ jogadorId: player.id,
    ...Object.fromEntries(Object.keys(api.defaultAttributes(player.tipoJogador, player.posicaoPrincipal)).map(key => [key, 59])),
    xp: {}, overall: 59, revision: 5,
  }));
  await api.putRecords({ jogadores: players, atributos: attributes,
    peladas: [{ id: 'old-pelada', data: '2026-08-01', tipoRegistro: 'oficial', status: 'Finalizada' }],
    jogos: [{ id: 'old-game', peladaId: 'old-pelada', status: 'Finalizado', placarA: 1, placarB: 0, modoJogo: 'classica', timeA: { nome: 'A' }, timeB: { nome: 'B' } }],
    escalacoes: [{ id: 'old-lineup', jogoId: 'old-game', jogadorId: 'line', time: 'A' }],
    eventos: [{ id: 'old-goal', tipo: 'Gol', jogoId: 'old-game', jogadorId: 'line', createdAt: '2026-08-01T12:00:00Z' }],
  });
  return api;
}

test('validates counts, dates, unambiguous mapping and goalkeeper identity', () => {
  assert.throws(() => manual.validate({ ...batch, data: '2026-02-30' }), /Data inválida/);
  assert.throws(() => manual.validate({ ...batch, jogadores: [{ nome: 'X', gols: -1, assistencias: 0 }] }), /Quantidade/);
  assert.throws(() => manual.validate({ ...batch, jogadores: [batch.jogadores[0], batch.jogadores[0]] }), /repetido/);
  assert.equal(manual.suggest({ nome: 'Pedro', apelido: 'PH' }, [{ id: 'ph', nome: 'Pedro', apelido: 'PH' }]), 'ph');
  assert.equal(manual.suggest({ nome: 'Pedro' }, [{ id: '1', nome: 'Pedro' }, { id: '2', nome: 'Pedro' }]), '');
  assert.throws(() => manual.buildEvents(batch, ['1', '2'], [{id:'1'}, {id:'2', posicaoPrincipal:'ST'}], [], 'admin', 'now'), /goleiro/);
});

test('import preserves history, adds only totals, and scopes monthly and competition rankings', async () => {
  const api = await app();
  const before = plain(await api.readManualStatsSnapshot());
  await api.importManualStats(batch, ['line', 'gk']);
  const after = plain(await api.readManualStatsSnapshot());
  for (const store of ['peladas', 'jogos', 'times', 'escalacoes', 'faltas', 'estatisticasCache']) assert.deepEqual(after[store], before[store]);
  assert.deepEqual(after.eventos.find(event => event.id === 'old-goal'), before.eventos[0]);
  const stats = await api.calcularEstatisticasJogadores({});
  const line = stats.playersStats.find(player => player.jogadorId === 'line');
  assert.equal(line.gols, 5);
  assert.equal(line.assistencias, 3);
  assert.equal(line.jogos, 1);
  assert.equal(line.vitorias, 1);
  assert.equal(line.golsPorJogo, 1);
  assert.equal(line.assistenciasPorJogo, 0);
  assert.equal(line.mvp, 0);
  assert.equal(stats.summary.totalGols, 5);
  const month = await api.calcularEstatisticasJogadores({ month: '2026-09', modoJogo: 'classica' });
  assert.equal(month.summary.totalGols, 4);
  assert.equal(month.summary.totalAssistencias, 4);
  assert.equal(month.summary.totalPeladas, 0);
  assert.equal(month.summary.totalJogosFinalizados, 0);
  assert.equal(api.getOverallRankingEntries(month).length, 2);
  assert.ok(api.getRankingMonthOptions(after.eventos.filter(manual.active)).includes('2026-09'));
  assert.equal((await api.calcularEstatisticasJogadores({ modoJogo: 'bagrecup' })).summary.totalGols, 0);
  assert.equal((await api.calcularEstatisticasJogadores({ peladaId: 'old-pelada' })).summary.totalGols, 1);
  assert.equal((await api.calcularEstatisticasJogadores({ month: '2026-08' })).summary.totalGols, 1);
  assert.ok((await api.getRecord('configs', `manual-backup:${batch.id}`)).snapshot);
});

test('XP uses existing rules, includes GK assist and excludes game and award bonuses', async () => {
  const api = await app();
  await api.importManualStats(batch, ['line', 'gk']);
  const evolutions = await api.getAllRecords('evolucoes');
  const gk = evolutions.filter(item => item.jogadorId === 'gk');
  assert.equal(gk.length, 1);
  assert.equal(gk[0].atributo, 'KIC');
  assert.equal(gk[0].xpGanho, 1);
  const totals = evolutions.filter(item => item.jogadorId === 'line').reduce((map, item) => {
    map[item.atributo] = (map[item.atributo] || 0) + item.xpGanho; return map;
  }, {});
  assert.deepEqual(totals, { TIR: 12, RIT: 4, PAS: 9.5, REG: 7, FIS: 2, DEF: 1 });
  assert.ok(evolutions.every(item => !item.jogoId && !item.peladaId));
  const line = await api.getRecord('atributos', 'line');
  assert.equal(line.TIR, 62);
  assert.equal(line.xp.TIR, 1);
});

test('repeat import fails without duplicate totals or XP', async () => {
  const api = await app();
  await api.importManualStats(batch, ['line', 'gk']);
  await api.putRecords({ syncQueue: (await api.getAllRecords('syncQueue')).map(item => ({ ...item, status: 'sincronizado' })) });
  const before = plain(await api.readManualStatsSnapshot());
  await assert.rejects(api.importManualStats(batch, ['line', 'gk']), /já foi registrada/);
  assert.deepEqual(plain(await api.readManualStatsSnapshot()), before);
  assert.equal(api.state.manualStatsInProgress, false);
});

test('backup failure or stale snapshot writes nothing', async () => {
  const api = await app();
  const before = plain(await api.readManualStatsSnapshot());
  api.failBackup();
  await assert.rejects(api.importManualStats(batch, ['line', 'gk']), /backup failed/);
  assert.deepEqual(plain(await api.readManualStatsSnapshot()), before);
  await api.putRecords({ jogadores: [{ ...before.jogadores[0], apelido: 'Changed' }] });
  await assert.rejects(api.commitManualStats(before, { eventos: [{id:'must-not-save'}] }, {id:'backup'}), /dados mudaram/);
  assert.equal(await api.getRecord('eventos', 'must-not-save'), undefined);
});

test('undo restores exact attributes and removes totals without altering earlier games', async () => {
  const api = await app();
  const before = await api.getRecord('atributos', 'line');
  await api.importManualStats(batch, ['line', 'gk']);
  const importedEvolutionCount = (await api.getAllRecords('evolucoes')).length;
  await api.putRecords({ syncQueue: (await api.getAllRecords('syncQueue')).map(item => ({ ...item, status: 'sincronizado' })) });
  await api.undoManualStats(batch.id);
  const after = await api.getRecord('atributos', 'line');
  for (const key of ['TIR', 'RIT', 'PAS', 'REG', 'FIS', 'DEF']) assert.equal(after[key], before[key]);
  assert.deepEqual(plain(after.xp), plain(before.xp));
  const stats = await api.calcularEstatisticasJogadores({});
  assert.equal(stats.summary.totalGols, 1);
  assert.equal(stats.summary.totalAssistencias, 0);
  assert.equal(stats.summary.totalJogosFinalizados, 1);
  assert.equal((await api.getAllRecords('eventos')).filter(manual.active).length, 0);
  assert.equal((await api.getAllRecords('evolucoes')).length, 0);
  assert.equal((await api.getAllRecords('syncQueue')).filter(item => item.storeName === 'evolucoes' && item.operation === 'delete').length, importedEvolutionCount);
});

test('undo refuses to overwrite subsequent evolution', async () => {
  const api = await app();
  await api.importManualStats(batch, ['line', 'gk']);
  const current = await api.getRecord('atributos', 'line');
  await api.putRecords({ atributos: [{ ...current, TIR: current.TIR + 1 }], syncQueue: (await api.getAllRecords('syncQueue')).map(item => ({ ...item, status: 'sincronizado' })) });
  await assert.rejects(api.undoManualStats(batch.id), /atributos mudaram/);
  assert.equal((await api.getRecord('atributos', 'line')).TIR, current.TIR + 1);
  assert.equal((await api.getAllRecords('eventos')).filter(manual.active).length, 2);
});
