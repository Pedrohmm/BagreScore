const test = require("node:test");
const assert = require("node:assert/strict");
const repair = require("../ovr-repair.js");

const player = { id: "p", nome: "Teste", tipoJogador: "Linha", posicaoPrincipal: "ST", revision: 4 };
const attributes = (rit, xp = 0) => ({
  jogadorId: "p", RIT: rit, TIR: 60, PAS: 60, REG: 60, DEF: 60, FIS: 60,
  xp: { RIT: xp }, revision: 4,
});
const evolution = (id, gained, extra = {}) => ({
  id, jogadorId: "p", atributo: "RIT", modo: "xp", xpGanho: gained,
  variacao: 0, serverRevision: 1, ...extra,
});
const backup = (before, after, oldEvolutions = []) => ({
  format: "bagrescore-backup-v1", importacaoId: "anotacoes-2026-09-09",
  snapshot: { jogadores: [player], atributos: [before], evolucoes: oldEvolutions },
  afterAttributes: [after], eventIds: ["manual-event"],
});
const current = (record, evolutions = []) => ({ jogadores: [player], atributos: [record], evolucoes: evolutions });

test("reconstrói XP posterior sem reaplicar a importação manual", () => {
  const input = backup(attributes(68, 3), attributes(69, 1));
  const now = current(attributes(65, 0), [
    evolution("imported", 4, { eventoId: "manual-event" }),
    evolution("later", 5, { serverRevision: 2 }),
  ]);
  const result = repair.buildRepair(input, now);
  assert.equal(result.addedCount, 1);
  assert.equal(result.repairs[0].values.RIT, 70);
  assert.equal(result.repairs[0].xp.RIT, 2);
});

test("desconta evolução desfeita e preserva aumento manual mais alto", () => {
  const old = evolution("removed", 1, { variacao: 1 });
  const input = backup(attributes(70, 0), attributes(70, 0), [old]);
  const now = current(attributes(72, 2));
  const result = repair.buildRepair(input, now);
  assert.equal(result.removedCount, 1);
  assert.equal(result.repairs.length, 0);
});

test("usa revisão do servidor para ordenar XP em torno do limite de nível", () => {
  const input = backup(attributes(69, 3), attributes(69, 3));
  const now = current(attributes(60, 0), [
    evolution("second", 2, { serverRevision: 10 }),
    evolution("first", 1, { serverRevision: 9 }),
  ]);
  const result = repair.buildRepair(input, now);
  assert.equal(result.repairs[0].values.RIT, 70);
  assert.equal(result.repairs[0].xp.RIT, 2);
});

test("jogadores sem backup antigo não recebem atributos inventados", () => {
  const input = backup(attributes(60), attributes(60));
  const newcomer = { id: "n", apelido: "Novo", tipoJogador: "Linha", posicaoPrincipal: "ST" };
  const now = current(attributes(60));
  now.jogadores.push(newcomer);
  now.atributos.push({ ...attributes(60), jogadorId: "n" });
  const result = repair.buildRepair(input, now);
  assert.deepEqual(result.unanchored.map(item => item.id), ["n"]);
});

test("XP da carta reconstruída usa o histórico, não o saldo da carta reduzida", () => {
  const input = backup(attributes(69, 1), attributes(69, 1));
  const now = current(attributes(65, 3), [evolution("later", 4)]);
  const result = repair.buildRepair(input, now);
  assert.equal(result.repairs[0].values.RIT, 70);
  assert.equal(result.repairs[0].xp.RIT, 1);
});
