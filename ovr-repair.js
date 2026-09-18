(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.BagreScoreOvrRepair = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const LINE_KEYS = ["RIT", "TIR", "PAS", "REG", "DEF", "FIS"];
  const GK_KEYS = ["DIV", "HAN", "KIC", "REF", "SPE", "POS"];

  function keysFor(player) {
    return player.tipoJogador === "Goleiro" || player.posicaoPrincipal === "GK" ? GK_KEYS : LINE_KEYS;
  }

  function xpNeeded(value) {
    return value < 60 ? 3 : value < 70 ? 4 : 5;
  }

  function safeXp(value) {
    return Number(Math.max(0, Number(value) || 0).toFixed(2));
  }

  function signature(record, player) {
    return JSON.stringify(keysFor(player).map(key => [Number(record?.[key] || 0), safeXp(record?.xp?.[key])]));
  }

  function replayXp(value, xp, earned) {
    let nextValue = value;
    let nextXp = safeXp(xp + earned);
    if (earned > 0) {
      while (nextValue < 99 && nextXp >= xpNeeded(nextValue)) {
        nextXp = safeXp(nextXp - xpNeeded(nextValue));
        nextValue += 1;
      }
    }
    return { value: nextValue, xp: nextValue === 99 ? 0 : nextXp };
  }

  function buildRepair(backup, current) {
    if (backup?.format !== "bagrescore-backup-v1" || backup?.importacaoId !== "anotacoes-2026-09-09") {
      throw new Error("Selecione o backup das anotações de 09/09/2026.");
    }
    const old = backup.snapshot;
    if (!old || !Array.isArray(old.jogadores) || !Array.isArray(old.atributos) || !Array.isArray(old.evolucoes) ||
        !Array.isArray(backup.afterAttributes) || !Array.isArray(backup.eventIds)) {
      throw new Error("O backup está incompleto.");
    }
    if (!current || !Array.isArray(current.jogadores) || !Array.isArray(current.atributos) || !Array.isArray(current.evolucoes)) {
      throw new Error("A base atual está incompleta.");
    }
    const currentEvolutionIds = new Set(current.evolucoes.map(item => item.id));
    const oldEvolutionIds = new Set(old.evolucoes.map(item => item.id));
    const importedEventIds = new Set(backup.eventIds);
    const oldAttributes = new Map(old.atributos.map(item => [item.jogadorId, item]));
    for (const item of backup.afterAttributes) oldAttributes.set(item.jogadorId, item);
    const currentAttributes = new Map(current.atributos.map(item => [item.jogadorId, item]));
    const removed = old.evolucoes.filter(item => !currentEvolutionIds.has(item.id));
    const added = current.evolucoes.filter(item => !oldEvolutionIds.has(item.id) && !importedEventIds.has(item.eventoId))
      .sort((a, b) => Number(a.serverRevision || 0) - Number(b.serverRevision || 0) ||
        String(a.createdAt || "").localeCompare(String(b.createdAt || "")) || String(a.id).localeCompare(String(b.id)));
    const byPlayer = (items) => {
      const map = new Map();
      for (const item of items) {
        const list = map.get(item.jogadorId) || [];
        list.push(item);
        map.set(item.jogadorId, list);
      }
      return map;
    };
    const removedByPlayer = byPlayer(removed);
    const addedByPlayer = byPlayer(added);
    const repairs = [];
    const unanchored = [];

    for (const player of current.jogadores) {
      const baseline = oldAttributes.get(player.id);
      const currentRecord = currentAttributes.get(player.id);
      if (!baseline || !currentRecord) {
        unanchored.push({ id: player.id, nome: player.apelido || player.nome });
        continue;
      }
      const keys = keysFor(player);
      const reconstructed = {};
      const xp = {};
      for (const key of keys) {
        reconstructed[key] = Number(baseline[key]);
        xp[key] = safeXp(baseline.xp?.[key]);
        if (!Number.isInteger(reconstructed[key]) || reconstructed[key] < 1 || reconstructed[key] > 99) {
          throw new Error(`Atributo inválido no backup: ${player.apelido || player.nome}, ${key}.`);
        }
      }
      // The app rolls back deleted evolutions by subtracting their level gain and XP.
      for (const evolution of removedByPlayer.get(player.id) || []) {
        const key = evolution.atributo;
        if (!keys.includes(key)) continue;
        reconstructed[key] = Math.max(1, Math.min(99, reconstructed[key] - Number(evolution.variacao || 0)));
        xp[key] = safeXp(xp[key] - Number(evolution.xpGanho || 0));
      }
      for (const evolution of addedByPlayer.get(player.id) || []) {
        const key = evolution.atributo;
        if (!keys.includes(key)) continue;
        if (evolution.modo === "xp") {
          const earned = Number(evolution.xpGanho || 0);
          if (!Number.isFinite(earned)) throw new Error("Registro de XP inválido.");
          const next = replayXp(reconstructed[key], xp[key], earned);
          reconstructed[key] = next.value;
          xp[key] = next.xp;
        } else {
          reconstructed[key] = Math.max(1, Math.min(99, reconstructed[key] + Number(evolution.variacao || 0)));
        }
      }
      const values = {};
      const nextXp = {};
      const differences = [];
      for (const key of keys) {
        const liveValue = Number(currentRecord[key]);
        const liveXp = safeXp(currentRecord.xp?.[key]);
        // Explicit edits are not in the evolution ledger. Keep any stronger live value.
        values[key] = Math.max(liveValue, reconstructed[key]);
        nextXp[key] = values[key] > reconstructed[key] ? liveXp : xp[key];
        if (values[key] !== liveValue || nextXp[key] !== liveXp) {
          differences.push({ key, before: liveValue, after: values[key], xpBefore: liveXp, xpAfter: nextXp[key] });
        }
      }
      if (differences.length) repairs.push({
        id: player.id,
        nome: player.apelido || player.nome,
        expectedPlayerRevision: Number(player.revision || 0),
        expectedAttributeRevision: Number(currentRecord.revision || 0),
        expectedSignature: signature(currentRecord, player),
        values,
        xp: nextXp,
        differences,
      });
    }
    return { repairs, unanchored, removedCount: removed.length, addedCount: added.length };
  }

  return { buildRepair, signature, replayXp, keysFor };
});
