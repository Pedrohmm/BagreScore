const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const source = fs.readFileSync(require("node:path").join(__dirname, "..", "apps-script", "Code.gs"), "utf8");
const context = vm.createContext({});
vm.runInContext(source, context);

const before = { RIT: 77, TIR: 78, PAS: 63, REG: 60, DEF: 56, FIS: 71, overall: 69 };

test("servidor descarta queda ampla de atributos sem motivo explícito", () => {
  const incoming = { RIT: 65, TIR: 67, PAS: 56, REG: 52, DEF: 53, FIS: 62, overall: 59 };
  const conflict = context.bagreScoreGetAttributeRegressionConflict_(before, incoming, {});
  assert.equal(conflict.motivo, "queda-inconsistente-de-atributos");
  assert.equal(conflict.atributosReduzidos, 6);
});

test("perdas pequenas e correções administrativas explícitas continuam possíveis", () => {
  assert.equal(context.bagreScoreGetAttributeRegressionConflict_(before, { ...before, RIT: 76, overall: 69 }, {}), null);
  assert.equal(context.bagreScoreGetAttributeRegressionConflict_(before, { ...before, RIT: 60, TIR: 60, overall: 60 }, { regressionReason: "admin-edit" }), null);
});
