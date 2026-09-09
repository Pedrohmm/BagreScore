/* Standalone totals carry no match, result, attendance or award information. */
(function (root) {
  "use strict";
  const TYPE = "ESTATISTICA_AVULSA";
  const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  const isManual = event => event?.tipo === TYPE && event.origem === "anotacoes";
  const active = event => isManual(event) && !event.cancelado && !event.deletedAt;

  function validate(input) {
    if (!input || !/^[a-z0-9-]{3,80}$/.test(input.id || "")) throw new Error("Identificador de importação inválido.");
    const date = String(input.data || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) {
      throw new Error("Data inválida. Use AAAA-MM-DD.");
    }
    if (input.modoJogo !== "classica") throw new Error("Este lançamento é exclusivo da Pelada Clássica.");
    if (!Array.isArray(input.jogadores) || !input.jogadores.length || input.jogadores.length > 100) throw new Error("Informe de 1 a 100 jogadores.");
    const names = new Set();
    const rows = input.jogadores.map(row => {
      const name = String(row.nome || "").trim();
      if (!name || names.has(normalize(name))) throw new Error("Nome vazio ou repetido nas anotações.");
      names.add(normalize(name));
      for (const key of ["gols", "assistencias"]) {
        if (!Number.isInteger(row[key]) || row[key] < 0 || row[key] > 100) throw new Error(`Quantidade inválida para ${name}.`);
      }
      if (!row.gols && !row.assistencias) throw new Error(`Nenhum gol ou assistência para ${name}.`);
      return { nome: name, apelido: String(row.apelido || name).trim(), goleiro: row.goleiro === true, gols: row.gols, assistencias: row.assistencias };
    });
    return { id: input.id, data: date, modoJogo: "classica", jogadores: rows };
  }

  function suggest(row, players) {
    const names = [row.nome, row.apelido].map(normalize);
    const candidates = players.filter(player =>
      [player.nome, player.apelido].some(name => name && names.includes(normalize(name))) &&
      (!row.goleiro || player.posicaoPrincipal === "GK" || normalize(player.tipoJogador) === "goleiro")
    );
    return candidates.length === 1 ? candidates[0].id : "";
  }

  function buildEvents(input, ids, players, existingEvents, actor, savedAt) {
    const batch = validate(input);
    if (existingEvents.some(event => isManual(event) && event.importacaoId === batch.id)) throw new Error("Esta importação já foi registrada. Não será duplicada.");
    if (ids.length !== batch.jogadores.length || new Set(ids).size !== ids.length) throw new Error("Vincule cada nome a um jogador diferente.");
    return batch.jogadores.map((row, index) => {
      const player = players.find(item => item.id === ids[index]);
      if (!player) throw new Error(`Selecione o jogador de ${row.nome}.`);
      if (row.goleiro && player.posicaoPrincipal !== "GK" && normalize(player.tipoJogador) !== "goleiro") throw new Error(`${row.nome} deve ser vinculado a um goleiro.`);
      return {
        id: `avulso:${batch.id}:${index + 1}`, tipo: TYPE, origem: "anotacoes", importacaoId: batch.id,
        data: batch.data, modoJogo: batch.modoJogo, jogadorId: player.id, nomeAnotado: row.nome,
        gols: row.gols, assistencias: row.assistencias, jogoId: "", peladaId: "",
        criadoPor: actor, createdAt: savedAt, updatedAt: savedAt, revision: 1, cancelado: false,
      };
    });
  }

  function matches(event, filters = {}) {
    return active(event) && !filters.peladaId &&
      (!filters.month || event.data.startsWith(filters.month)) &&
      (!filters.modoJogo || filters.modoJogo === "todos" || event.modoJogo === filters.modoJogo) &&
      (!filters.jogadorId || event.jogadorId === filters.jogadorId);
  }

  // In-memory projections reuse the app's goal/assist XP rules without saving fake goals.
  function evolutionEvents(event) {
    if (!active(event)) return [];
    return [
      ...Array.from({ length: event.gols }, (_, i) => ({ id: `${event.id}:gol:${i + 1}`, jogadorId: event.jogadorId })),
      ...Array.from({ length: event.assistencias }, (_, i) => ({ id: `${event.id}:assistencia:${i + 1}`, assistenteId: event.jogadorId })),
    ].map(item => ({ ...item, tipo: "Gol", createdAt: `${event.data}T12:00:00-03:00`, jogoId: "", peladaId: "" }));
  }

  const api = { TYPE, isManual, active, validate, suggest, buildEvents, matches, evolutionEvents };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.BagreScoreManualStats = api;
})(typeof window !== "undefined" ? window : {});
