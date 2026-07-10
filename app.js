(() => {
  "use strict";

  const APP_VERSION = "0.9.5";
  const DB_NAME = "bagrescore-local";
  const DB_VERSION = 1;
  const SYNC_INTERVAL_MS = 15000;

  const STORE_SCHEMAS = [
    {
      name: "jogadores",
      keyPath: "id",
      indexes: [
        ["por_nome", "nome"],
        ["por_status", "status"],
        ["por_posicao", "posicaoPrincipal"],
        ["por_updatedAt", "updatedAt"],
      ],
    },
    {
      name: "atributos",
      keyPath: "jogadorId",
      indexes: [
        ["por_overall", "overall"],
        ["por_updatedAt", "updatedAt"],
      ],
    },
    {
      name: "peladas",
      keyPath: "id",
      indexes: [
        ["por_data", "data"],
        ["por_status", "status"],
        ["por_updatedAt", "updatedAt"],
      ],
    },
    {
      name: "jogos",
      keyPath: "id",
      indexes: [
        ["por_pelada", "peladaId"],
        ["por_status", "status"],
        ["por_inicio", "inicio"],
        ["por_updatedAt", "updatedAt"],
      ],
    },
    {
      name: "times",
      keyPath: "id",
      indexes: [
        ["por_jogo", "jogoId"],
        ["por_nome", "nome"],
      ],
    },
    {
      name: "escalacoes",
      keyPath: "id",
      indexes: [
        ["por_jogo", "jogoId"],
        ["por_jogador", "jogadorId"],
        ["por_time", "timeId"],
      ],
    },
    {
      name: "eventos",
      keyPath: "id",
      indexes: [
        ["por_jogo", "jogoId"],
        ["por_pelada", "peladaId"],
        ["por_tipo", "tipo"],
        ["por_jogador", "jogadorId"],
        ["por_time", "timeId"],
        ["por_revision", "revision"],
        ["por_serverCreatedAt", "serverCreatedAt"],
        ["por_updatedAt", "updatedAt"],
      ],
    },
    {
      name: "faltas",
      keyPath: "id",
      indexes: [
        ["por_jogo", "jogoId"],
        ["por_cometeu", "jogadorCometeuId"],
        ["por_sofreu", "jogadorSofreuId"],
      ],
    },
    {
      name: "evolucoes",
      keyPath: "id",
      indexes: [
        ["por_jogador", "jogadorId"],
        ["por_atributo", "atributo"],
        ["por_createdAt", "createdAt"],
      ],
    },
    {
      name: "usuarios",
      keyPath: "id",
      indexes: [
        ["por_perfil", "perfilId"],
        ["por_status", "status"],
      ],
    },
    {
      name: "perfis",
      keyPath: "id",
      indexes: [["por_nome", "nome"]],
    },
    {
      name: "temporadas",
      keyPath: "id",
      indexes: [
        ["por_status", "status"],
        ["por_inicio", "inicio"],
      ],
    },
    {
      name: "estatisticasCache",
      keyPath: "id",
      indexes: [
        ["por_temporada", "temporadaId"],
        ["por_jogador", "jogadorId"],
        ["por_updatedAt", "updatedAt"],
      ],
    },
    {
      name: "configs",
      keyPath: "id",
      indexes: [["por_updatedAt", "updatedAt"]],
    },
    {
      name: "syncQueue",
      keyPath: "id",
      indexes: [
        ["por_status", "status"],
        ["por_store", "storeName"],
        ["por_createdAt", "createdAt"],
      ],
    },
    {
      name: "auditLog",
      keyPath: "id",
      indexes: [
        ["por_entidade", "entityName"],
        ["por_entidadeId", "entityId"],
        ["por_createdAt", "createdAt"],
      ],
    },
  ];

  const STORE_LABELS = {
    jogadores: "Jogadores",
    atributos: "Atributos",
    peladas: "Peladas",
    jogos: "Jogos",
    times: "Times",
    escalacoes: "Escalações",
    eventos: "Eventos",
    faltas: "Faltas",
    evolucoes: "Evoluções",
    usuarios: "Usuários",
    perfis: "Perfis",
    temporadas: "Temporadas",
    estatisticasCache: "Cache de estatísticas",
    configs: "Configurações",
    syncQueue: "Fila de sincronização",
    auditLog: "Auditoria",
  };

  const DATA_MODELS = {
    jogadores: [
      "id",
      "nome",
      "apelido",
      "idade",
      "foto",
      "posicaoPrincipal",
      "posicaoSecundaria",
      "peForte",
      "tipoJogador",
      "status",
      "overall",
      "estrelas",
      "observacoes",
      "createdAt",
      "updatedAt",
      "revision",
    ],
    atributos: [
      "jogadorId",
      "RIT",
      "TIR",
      "PAS",
      "REG",
      "DEF",
      "FIS",
      "DIV",
      "HAN",
      "KIC",
      "REF",
      "SPE",
      "POS",
      "overall",
      "estrelas",
      "updatedAt",
      "revision",
    ],
    peladas: [
      "id",
      "data",
      "local",
      "endereco",
      "horarioInicio",
      "horarioFim",
      "valor",
      "observacoes",
      "status",
      "finalizadaEm",
      "mvpJogadorId",
      "bagreJogadorId",
      "createdAt",
      "updatedAt",
      "revision",
    ],
    jogos: [
      "id",
      "peladaId",
      "timeA",
      "timeB",
      "placarA",
      "placarB",
      "vencedor",
      "inicio",
      "fim",
      "status",
      "formaEncerramento",
      "createdAt",
      "updatedAt",
      "revision",
    ],
    times: ["id", "jogoId", "nome", "cor", "jogadores", "linha", "goleiroId"],
    escalacoes: ["id", "jogoId", "jogadorId", "time", "timeId", "createdAt", "updatedAt"],
    eventos: [
      "id",
      "jogoId",
      "peladaId",
      "tipo",
      "jogadorId",
      "assistenteId",
      "jogadorSofreuId",
      "timeId",
      "minuto",
      "tipoGol",
      "cartao",
      "tipoAcaoDefensiva",
      "tipoDefesaGoleiro",
      "golContra",
      "observacoes",
      "detalhe",
      "criadoPor",
      "createdAt",
      "updatedAt",
      "editadoPor",
      "editadoEm",
      "serverCreatedAt",
      "serverUpdatedAt",
      "revision",
      "cancelado",
      "canceladoPor",
      "canceladoEm",
      "motivoCancelamento",
      "pontuacaoCalculada",
      "escolhidoManual",
    ],
    faltas: [
      "id",
      "jogoId",
      "jogadorCometeuId",
      "jogadorSofreuId",
      "timeCometeu",
      "timeSofreu",
      "minuto",
      "cartao",
      "observacoes",
      "createdAt",
      "updatedAt",
    ],
    evolucoes: [
      "id",
      "jogadorId",
      "atributo",
      "variacao",
      "motivo",
      "origem",
      "sourceKey",
      "eventoId",
      "jogoId",
      "valorAnterior",
      "valorNovo",
      "criadoPor",
      "createdAt",
      "updatedAt",
      "revision",
    ],
    usuarios: ["id", "nome", "perfilId", "deviceId", "status"],
    perfis: ["id", "nome", "permissoes"],
    temporadas: ["id", "nome", "tipo", "inicio", "fim", "status"],
    estatisticasCache: ["id", "jogadorId", "temporadaId", "metricas", "updatedAt", "revision"],
    configs: ["id", "appVersion", "appsScriptUrl", "regras", "updatedAt"],
  };

  const FIELD_LABELS = {
    id: "ID",
    data: "Data",
    local: "Local",
    nome: "Nome",
    apelido: "Apelido",
    idade: "Idade",
    foto: "Foto",
    posicaoPrincipal: "Posição principal",
    posicaoSecundaria: "Posição secundária",
    peForte: "Pé forte",
    tipoJogador: "Tipo de jogador",
    status: "Status",
    overall: "Overall",
    estrelas: "Estrelas",
    observacoes: "Observações",
    createdAt: "Criado em",
    updatedAt: "Atualizado em",
    revision: "Revisão",
    jogadorId: "Jogador",
    peladaId: "Pelada",
    jogoId: "Jogo",
    timeId: "Time",
    timeA: "Time A",
    timeB: "Time B",
    placarA: "Placar A",
    placarB: "Placar B",
    vencedor: "Vencedor",
    inicio: "Início",
    fim: "Fim",
    formaEncerramento: "Forma de encerramento",
    endereco: "Endereço",
    horarioInicio: "Horário de início",
    horarioFim: "Horário de fim",
    valor: "Valor",
    jogadores: "Jogadores",
    linha: "Linha",
    goleiroId: "Goleiro",
    cor: "Cor",
    time: "Time",
    tipo: "Tipo",
    assistenteId: "Assistente",
    jogadorSofreuId: "Jogador que sofreu",
    minuto: "Minuto",
    tipoGol: "Tipo do gol",
    cartao: "Cartão",
    tipoAcaoDefensiva: "Tipo da ação defensiva",
    tipoDefesaGoleiro: "Tipo da defesa",
    golContra: "Gol contra",
    detalhe: "Detalhe",
    criadoPor: "Criado por",
    editadoPor: "Editado por",
    editadoEm: "Editado em",
    serverCreatedAt: "Criado no servidor",
    serverUpdatedAt: "Atualizado no servidor",
    cancelado: "Cancelado",
    canceladoPor: "Cancelado por",
    canceladoEm: "Cancelado em",
    motivoCancelamento: "Motivo do cancelamento",
    pontuacaoCalculada: "Pontuação calculada",
    escolhidoManual: "Escolhido manualmente",
    finalizadaEm: "Finalizada em",
    mvpJogadorId: "MVP da Pelada",
    bagreJogadorId: "Bagre da Pelada",
    jogadorCometeuId: "Jogador que cometeu",
    timeCometeu: "Time que cometeu",
    timeSofreu: "Time que sofreu",
    atributo: "Atributo",
    variacao: "Variação",
    motivo: "Motivo",
    origem: "Origem",
    sourceKey: "Chave de origem",
    eventoId: "Evento",
    valorAnterior: "Valor anterior",
    valorNovo: "Valor novo",
    perfilId: "Perfil",
    deviceId: "Dispositivo",
    permissoes: "Permissões",
    temporadaId: "Temporada",
    metricas: "Métricas",
    appVersion: "Versão do app",
    appsScriptUrl: "URL do Apps Script",
    regras: "Regras",
  };

  const DEFAULT_PERFIS = [
    {
      id: "administrador",
      nome: "Administrador",
      permissoes: [
        "jogadores:criar",
        "jogadores:editar",
        "atributos:editar",
        "configs:editar",
        "eventos:excluir",
        "jogos:alterar",
      ],
    },
    {
      id: "organizador",
      nome: "Organizador",
      permissoes: ["peladas:criar", "times:montar", "jogos:iniciar", "jogos:finalizar"],
    },
    {
      id: "marcador",
      nome: "Marcador",
      permissoes: ["eventos:criar", "gols:registrar", "faltas:registrar"],
    },
    {
      id: "jogador",
      nome: "Jogador",
      permissoes: ["estatisticas:visualizar", "historico:visualizar", "carta:visualizar"],
    },
    {
      id: "publico",
      nome: "Público",
      permissoes: ["publico:visualizar"],
    },
  ];

  const DEFAULT_RULES = {
    duracaoJogoMinutos: 10,
    golsParaEncerrar: 2,
    empatePermitido: true,
    usarHorarioServidorEmConflitos: true,
    excluirEventosComoCancelados: true,
  };
  const SECTION_NAMES = ["inicio", "jogadores", "peladas", "ao-vivo", "ranking", "estatisticas", "historico", "configuracoes"];
  const GAME_DURATION_SECONDS = DEFAULT_RULES.duracaoJogoMinutos * 60;
  const GOALS_TO_END_GAME = DEFAULT_RULES.golsParaEncerrar;
  const GOAL_TYPES = [
    { value: "normal", label: "Normal" },
    { value: "penalti", label: "Pênalti" },
    { value: "falta", label: "Falta" },
    { value: "cabeca", label: "Cabeça" },
    { value: "gol_contra", label: "Gol contra" },
    { value: "outro", label: "Outro" },
  ];
  const CARD_TYPES = [
    { value: "nenhum", label: "Nenhum" },
    { value: "amarelo", label: "Amarelo" },
    { value: "vermelho", label: "Vermelho" },
  ];
  const DEFENSIVE_ACTION_TYPES = [
    { value: "desarme", label: "Desarme" },
    { value: "interceptacao", label: "Interceptação" },
    { value: "bloqueio", label: "Bloqueio" },
    { value: "corte", label: "Corte" },
  ];
  const GOALKEEPER_SAVE_TYPES = [
    { value: "normal", label: "Normal" },
    { value: "dificil", label: "Difícil" },
    { value: "penalti", label: "Pênalti" },
    { value: "cara_a_cara", label: "Cara a cara" },
    { value: "reflexo", label: "Reflexo" },
  ];

  const PLAYER_TYPES = ["Linha", "Goleiro"];
  const PLAYER_STATUSES = ["Ativo", "Convidado", "Inativo"];
  const STRONG_FEET = ["Direito", "Esquerdo", "Ambidestro"];
  const PLAYER_POSITIONS = ["GK", "CB", "MC", "MAT", "SA", "ST", "LW", "RW"];
  const LINE_POSITIONS = ["CB", "MC", "MAT", "SA", "ST", "LW", "RW"];

  const LINE_ATTRIBUTES = [
    {
      key: "RIT",
      label: "RIT",
      description: "Ritmo, velocidade e fôlego.",
    },
    {
      key: "TIR",
      label: "TIR",
      description: "Chute e finalização.",
    },
    {
      key: "PAS",
      label: "PAS",
      description: "Passe e visão de jogo.",
    },
    {
      key: "REG",
      label: "REG",
      description: "Drible, domínio e habilidade.",
    },
    {
      key: "DEF",
      label: "DEF",
      description: "Marcação e desarme.",
    },
    {
      key: "FIS",
      label: "FÍS",
      description: "Força, resistência e disputa corporal.",
    },
  ];

  const GOALKEEPER_ATTRIBUTES = [
    {
      key: "DIV",
      label: "DIV",
      description: "Defesa e ponte.",
    },
    {
      key: "HAN",
      label: "HAN",
      description: "Segurança com as mãos.",
    },
    {
      key: "KIC",
      label: "KIC",
      description: "Saída com os pés e lançamento.",
    },
    {
      key: "REF",
      label: "REF",
      description: "Reflexo.",
    },
    {
      key: "SPE",
      label: "SPE",
      description: "Velocidade e saída do gol.",
    },
    {
      key: "POS",
      label: "POS",
      description: "Posicionamento.",
    },
  ];

  const ALL_ATTRIBUTE_KEYS = [
    ...LINE_ATTRIBUTES.map((attribute) => attribute.key),
    ...GOALKEEPER_ATTRIBUTES.map((attribute) => attribute.key),
  ];

  const OVERALL_WEIGHTS = {
    ST: { RIT: 1.3, TIR: 1.5, PAS: 1.0, REG: 1.3, DEF: 0.5, FIS: 1.0 },
    SA: { RIT: 1.3, TIR: 1.4, PAS: 1.1, REG: 1.4, DEF: 0.5, FIS: 0.9 },
    LW: { RIT: 1.5, TIR: 1.2, PAS: 1.1, REG: 1.5, DEF: 0.4, FIS: 0.9 },
    RW: { RIT: 1.5, TIR: 1.2, PAS: 1.1, REG: 1.5, DEF: 0.4, FIS: 0.9 },
    MC: { RIT: 1.0, TIR: 1.0, PAS: 1.5, REG: 1.4, DEF: 0.9, FIS: 1.0 },
    MAT: { RIT: 1.0, TIR: 1.1, PAS: 1.5, REG: 1.5, DEF: 0.7, FIS: 0.9 },
    CB: { RIT: 1.0, TIR: 0.4, PAS: 0.8, REG: 0.7, DEF: 1.7, FIS: 1.4 },
    GK: { DIV: 1.4, HAN: 1.3, KIC: 0.8, REF: 1.5, SPE: 0.6, POS: 1.4 },
  };

  const state = {
    db: null,
    currentSection: "inicio",
    installPrompt: null,
    selectedPlayerId: null,
    editingPlayerId: null,
    selectedPeladaId: null,
    selectedGameSummaryId: null,
    peladasView: "gerenciar",
    selectedStatsPlayerId: null,
    evolutionMessage: "",
    gameDraft: {
      A: { nome: "Time A", cor: "#ff5a00", linha: [], goleiro: "" },
      B: { nome: "Time B", cor: "#4aa3df", linha: [], goleiro: "" },
    },
    statsFilters: {
      periodo: "all",
      peladaId: "",
      month: "",
      temporadaId: "",
      jogadorId: "",
      posicao: "",
      sortBy: "gols",
    },
    activeGameId: localStorage.getItem("bagrescore:active-game-id") || null,
    liveTimerId: null,
    liveMessage: "",
  };

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));
  const nowIso = () => new Date().toISOString();

  const uid = () => {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }

    return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  const escapeHtml = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  function isGoalkeeper(tipoJogador, posicaoPrincipal) {
    return tipoJogador === "Goleiro" || posicaoPrincipal === "GK";
  }

  function getActiveAttributeDefinitions(tipoJogador, posicaoPrincipal) {
    return isGoalkeeper(tipoJogador, posicaoPrincipal) ? GOALKEEPER_ATTRIBUTES : LINE_ATTRIBUTES;
  }

  function getActiveAttributeKeys(tipoJogador, posicaoPrincipal) {
    return getActiveAttributeDefinitions(tipoJogador, posicaoPrincipal).map((attribute) => attribute.key);
  }

  function getOverallWeights(tipoJogador, posicaoPrincipal) {
    if (isGoalkeeper(tipoJogador, posicaoPrincipal)) {
      return OVERALL_WEIGHTS.GK;
    }

    return OVERALL_WEIGHTS[posicaoPrincipal] || OVERALL_WEIGHTS.ST;
  }

  function normalizeAttributeValue(value) {
    const numberValue = Number(value);

    if (!Number.isFinite(numberValue)) {
      return 50;
    }

    return clamp(Math.round(numberValue), 1, 99);
  }

  function calculateOverall(tipoJogador, posicaoPrincipal, attributes) {
    const weights = getOverallWeights(tipoJogador, posicaoPrincipal);
    const weighted = Object.entries(weights).reduce(
      (acc, [attribute, weight]) => {
        acc.total += normalizeAttributeValue(attributes[attribute]) * weight;
        acc.weight += weight;
        return acc;
      },
      { total: 0, weight: 0 }
    );

    if (!weighted.weight) {
      return 1;
    }

    return clamp(Math.round(weighted.total / weighted.weight), 1, 99);
  }

  function calculateStars(overall) {
    if (overall < 40) return 1;
    if (overall < 60) return 2;
    if (overall < 75) return 3;
    if (overall < 90) return 4;
    return 5;
  }

  function extractAttributeValues(record = {}) {
    const nested = record.attributes || {};

    return ALL_ATTRIBUTE_KEYS.reduce((attributes, key) => {
      attributes[key] = nested[key] ?? record[key];
      return attributes;
    }, {});
  }

  function recalcularOverallJogador(jogador) {
    const tipoJogador = jogador?.tipoJogador || "Linha";
    const posicaoPrincipal = jogador?.posicaoPrincipal || (tipoJogador === "Goleiro" ? "GK" : "ST");
    const attributes = sanitizePlayerAttributes(
      {
        ...defaultAttributes(tipoJogador, posicaoPrincipal),
        ...extractAttributeValues(jogador),
      },
      tipoJogador,
      posicaoPrincipal
    );
    const overall = calculateOverall(tipoJogador, posicaoPrincipal, attributes);

    return {
      attributes,
      overall,
      estrelas: calculateStars(overall),
    };
  }

  function starsText(stars) {
    return `${stars} estrela${stars === 1 ? "" : "s"}`;
  }

  function playerDisplayName(player) {
    return player.apelido || player.nome || "Jogador";
  }

  function playerInitials(player) {
    return playerDisplayName(player)
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
  }

  function renderOptions(options, selectedValue = "", placeholder = "") {
    const placeholderHtml = placeholder
      ? `<option value="">${escapeHtml(placeholder)}</option>`
      : "";

    return `${placeholderHtml}${options
      .map(
        (option) =>
          `<option value="${escapeHtml(option)}" ${option === selectedValue ? "selected" : ""}>${escapeHtml(option)}</option>`
      )
      .join("")}`;
  }

  function renderPlayerAvatar(player, className = "player-avatar") {
    if (player.foto) {
      return `
        <span class="${className}">
          <img src="${escapeHtml(player.foto)}" alt="Foto de ${escapeHtml(playerDisplayName(player))}" loading="lazy" />
        </span>
      `;
    }

    return `<span class="${className}" aria-hidden="true">${escapeHtml(playerInitials(player) || "BS")}</span>`;
  }

  function defaultAttributes(tipoJogador = "Linha", posicaoPrincipal = "ST") {
    const activeKeys = getActiveAttributeKeys(tipoJogador, posicaoPrincipal);
    return ALL_ATTRIBUTE_KEYS.reduce((attributes, key) => {
      attributes[key] = activeKeys.includes(key) ? 50 : "";
      return attributes;
    }, {});
  }

  function sanitizePlayerAttributes(attributes, tipoJogador, posicaoPrincipal) {
    const activeKeys = getActiveAttributeKeys(tipoJogador, posicaoPrincipal);
    return ALL_ATTRIBUTE_KEYS.reduce((result, key) => {
      result[key] = activeKeys.includes(key) ? normalizeAttributeValue(attributes[key]) : "";
      return result;
    }, {});
  }

  function formatDateLabel(value) {
    if (!value) {
      return "Sem data";
    }

    const [year, month, day] = String(value).split("-");

    if (!year || !month || !day) {
      return value;
    }

    return `${day}/${month}/${year}`;
  }

  function formatCurrency(value) {
    const numberValue = Number(value);

    if (!Number.isFinite(numberValue) || numberValue <= 0) {
      return "Sem valor";
    }

    return numberValue.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function formatClock(totalSeconds) {
    const safeSeconds = Math.max(0, Math.ceil(totalSeconds));
    const minutes = Math.floor(safeSeconds / 60);
    const seconds = safeSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function setActiveGameId(jogoId) {
    state.activeGameId = jogoId || null;

    if (jogoId) {
      localStorage.setItem("bagrescore:active-game-id", jogoId);
      return;
    }

    localStorage.removeItem("bagrescore:active-game-id");
  }

  function normalizeSectionName(sectionName) {
    return SECTION_NAMES.includes(sectionName) ? sectionName : "inicio";
  }

  function readRouteFromHash(hash = window.location.hash) {
    const rawRoute = String(hash || "").replace(/^#/, "");
    const [sectionPart, ...routeParts] = rawRoute.split("/");
    const section = normalizeSectionName(sectionPart || "inicio");
    let peladaId = "";
    let gameId = "";
    let peladasView = "gerenciar";

    if (section === "peladas" && routeParts.length) {
      const [firstPart = "", secondPart = "", thirdPart = ""] = routeParts;

      if (firstPart === "criar") {
        peladasView = "criar";
      } else if (firstPart === "gerenciar") {
        peladasView = "gerenciar";
      } else {
        try {
          peladaId = decodeURIComponent(firstPart);
          if (secondPart === "jogos") {
            gameId = decodeURIComponent(thirdPart || "");
          }
        } catch (error) {
          peladaId = "";
          gameId = "";
        }
      }
    }

    return {
      section,
      peladaId,
      gameId,
      peladasView,
    };
  }

  function buildSectionHash(sectionName, options = {}) {
    const section = normalizeSectionName(sectionName);

    if (section === "peladas" && options.peladasView === "criar") {
      return "#peladas/criar";
    }

    if (section === "peladas" && options.peladaId && options.gameId) {
      return `#peladas/${encodeURIComponent(options.peladaId)}/jogos/${encodeURIComponent(options.gameId)}`;
    }

    if (section === "peladas" && options.peladaId) {
      return `#peladas/${encodeURIComponent(options.peladaId)}`;
    }

    return `#${section}`;
  }

  function setActiveSection(sectionName) {
    $$(".quick-action").forEach((item) => {
      item.classList.toggle("active", item.dataset.section === sectionName);
    });
  }

  async function switchSection(sectionName, options = {}) {
    const targetSection = normalizeSectionName(sectionName);
    const historyMode = options.historyMode || "push";
    const peladaId = targetSection === "peladas" ? options.peladaId || "" : "";
    const gameId = targetSection === "peladas" ? options.gameId || "" : "";
    const peladasView = targetSection === "peladas" ? options.peladasView || "gerenciar" : "";
    const targetHash = buildSectionHash(targetSection, { peladaId, gameId, peladasView });

    state.currentSection = targetSection;

    if (targetSection === "peladas") {
      const nextPeladaId = peladaId || null;
      const previousPeladaId = state.selectedPeladaId || null;

      if (previousPeladaId !== nextPeladaId) {
        state.gameDraft = createEmptyGameDraft();
        state.selectedGameSummaryId = null;
      }

      state.selectedPeladaId = nextPeladaId;
      state.peladasView = nextPeladaId ? "detalhe" : peladasView;

      state.selectedGameSummaryId = gameId || null;

      if (!nextPeladaId) {
        state.selectedGameSummaryId = null;
      }
    }

    if (window.location.hash !== targetHash) {
      if (historyMode === "replace") {
        window.history.replaceState(null, "", targetHash);
      } else if (historyMode === "push") {
        window.history.pushState(null, "", targetHash);
      }
    }

    setActiveSection(targetSection);
    await renderCurrentSection();
  }

  function teamNameFromGame(jogo, teamKey) {
    const team = teamKey === "A" ? jogo?.timeA : jogo?.timeB;
    return team?.nome || `Time ${teamKey}`;
  }

  function teamColorFromGame(jogo, teamKey) {
    const team = teamKey === "A" ? jogo?.timeA : jogo?.timeB;
    return team?.cor || (teamKey === "A" ? "#ff5a00" : "#4a4a4a");
  }

  function scoreByTeam(jogo, teamKey) {
    return Number(teamKey === "A" ? jogo?.placarA || 0 : jogo?.placarB || 0);
  }

  function getGameWinner(jogo) {
    const placarA = Number(jogo.placarA || 0);
    const placarB = Number(jogo.placarB || 0);

    if (placarA > placarB) return teamNameFromGame(jogo, "A");
    if (placarB > placarA) return teamNameFromGame(jogo, "B");
    return "Empate";
  }

  function getGameResultForTeam(jogo, teamKey) {
    const placarA = Number(jogo.placarA || 0);
    const placarB = Number(jogo.placarB || 0);

    if (placarA === placarB) return "empate";
    if (teamKey === "A") return placarA > placarB ? "vitoria" : "derrota";
    return placarB > placarA ? "vitoria" : "derrota";
  }

  function getElapsedGameSeconds(jogo) {
    if (!jogo?.inicio) {
      return 0;
    }

    const startedAt = new Date(jogo.inicio).getTime();
    const now = jogo.pausadoEm ? new Date(jogo.pausadoEm).getTime() : Date.now();
    const totalPausedMs = Number(jogo.totalPausadoMs || 0);
    const elapsedMs = Math.max(0, now - startedAt - totalPausedMs);
    return elapsedMs / 1000;
  }

  function getRemainingGameSeconds(jogo) {
    return Math.max(0, GAME_DURATION_SECONDS - getElapsedGameSeconds(jogo));
  }

  function getGameStatusLabel(jogo) {
    if (!jogo) return "Sem jogo";
    if (jogo.status === "Finalizado") return "Finalizado";
    if (jogo.pausadoEm) return "Pausado";
    if (jogo.status === "Em andamento") return "Em andamento";
    return jogo.status || "Rascunho";
  }

  function normalizeToken(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  function formatPercent(value) {
    const numberValue = Number(value) || 0;
    return `${numberValue.toFixed(numberValue % 1 === 0 ? 0 : 1)}%`;
  }

  function formatAverage(value) {
    const numberValue = Number(value) || 0;
    return numberValue.toFixed(2).replace(".", ",");
  }

  function safeDivide(total, divisor) {
    return divisor ? total / divisor : 0;
  }

  function metricLabel(key, value, stats = null) {
    const labels = {
      gols: `${value} gol${value === 1 ? "" : "s"}`,
      assistencias: `${value} assistência${value === 1 ? "" : "s"}`,
      participacoesGol: `${value} G/A`,
      vitorias: `${value} vitória${value === 1 ? "" : "s"}`,
      aproveitamento: formatPercent(value),
      jogos: `${value} jogo${value === 1 ? "" : "s"}`,
      golsPorJogo: `${formatAverage(value)} gol/jogo`,
      assistenciasPorJogo: `${formatAverage(value)} ast/jogo`,
      gaPorJogo: `${formatAverage(value)} G/A jogo`,
      faltasCometidas: `${value} falta${value === 1 ? "" : "s"}`,
      faltasSofridas: `${value} sofrida${value === 1 ? "" : "s"}`,
      desarmes: `${value} desarme${value === 1 ? "" : "s"}`,
      interceptacoes: `${value} interceptaç${value === 1 ? "ão" : "ões"}`,
      bloqueios: `${value} bloqueio${value === 1 ? "" : "s"}`,
      cortes: `${value} corte${value === 1 ? "" : "s"}`,
      acoesDefensivas: `${value} ação${value === 1 ? "" : "ões"} defensiva${value === 1 ? "" : "s"}`,
      defesasDificeis: `${value} defesa${value === 1 ? "" : "s"}`,
      defesasPenalti: `${value} defesa${value === 1 ? "" : "s"} de pênalti`,
      cartoesTotal: `${value} cartão${value === 1 ? "" : "s"}`,
      golsPenalti: `${value} pênalti${value === 1 ? "" : "s"}`,
      golsFalta: `${value} falta${value === 1 ? "" : "s"}`,
      golsCabeca: `${value} cabeça`,
      golsContra: `${value} contra`,
      mvp: `${value} MVP`,
      bagre: `${value} bagre${value === 1 ? "" : "s"}`,
      mvpsPelada: `${value} MVP${value === 1 ? "" : "s"} da Pelada`,
      bagresPelada: `${value} bagre${value === 1 ? "" : "s"} da Pelada`,
    };

    if (key === "cartoesDetalhe" && stats) {
      return `${stats.cartoesAmarelos} amarelo${stats.cartoesAmarelos === 1 ? "" : "s"} / ${stats.cartoesVermelhos} vermelho${stats.cartoesVermelhos === 1 ? "" : "s"}`;
    }

    return labels[key] || String(value ?? 0);
  }

  function resultLabel(result) {
    if (result === "vitoria") return "Vitória";
    if (result === "derrota") return "Derrota";
    if (result === "empate") return "Empate";
    return "-";
  }

  function getAttributeLabel(attributeKey) {
    return [...LINE_ATTRIBUTES, ...GOALKEEPER_ATTRIBUTES].find((attribute) => attribute.key === attributeKey)?.label || attributeKey;
  }

  function getPrimaryAttributeKey(jogador) {
    if (isGoalkeeper(jogador?.tipoJogador, jogador?.posicaoPrincipal)) {
      return "REF";
    }

    const primaryByPosition = {
      ST: "TIR",
      SA: "REG",
      LW: "REG",
      RW: "REG",
      MC: "PAS",
      MAT: "PAS",
      CB: "DEF",
    };

    return primaryByPosition[jogador?.posicaoPrincipal] || "TIR";
  }

  function getUsefulAttributeKeys(jogador) {
    const activeKeys = getActiveAttributeKeys(jogador?.tipoJogador, jogador?.posicaoPrincipal);
    const weights = getOverallWeights(jogador?.tipoJogador, jogador?.posicaoPrincipal);
    const usefulKeys = activeKeys.filter((key) => Number(weights[key] || 0) >= 0.8);

    return usefulKeys.length ? usefulKeys : activeKeys;
  }

  function getHighestAttributeKey(jogador, attributes) {
    const activeKeys = getActiveAttributeKeys(jogador?.tipoJogador, jogador?.posicaoPrincipal);

    return activeKeys
      .slice()
      .sort((a, b) => normalizeAttributeValue(attributes[b]) - normalizeAttributeValue(attributes[a]))[0] || getPrimaryAttributeKey(jogador);
  }

  function getLowestUsefulAttributeKey(jogador, attributes) {
    return getUsefulAttributeKeys(jogador)
      .slice()
      .sort((a, b) => normalizeAttributeValue(attributes[a]) - normalizeAttributeValue(attributes[b]))[0] || getPrimaryAttributeKey(jogador);
  }

  function resolveEvolutionAttribute(jogador, attributeKey) {
    const activeKeys = getActiveAttributeKeys(jogador?.tipoJogador, jogador?.posicaoPrincipal);

    if (activeKeys.includes(attributeKey)) {
      return attributeKey;
    }

    if (isGoalkeeper(jogador?.tipoJogador, jogador?.posicaoPrincipal)) {
      const goalkeeperFallback = {
        DEF: "POS",
        FIS: "SPE",
        PAS: "KIC",
        TIR: "KIC",
        REG: "REF",
        RIT: "SPE",
      };
      const fallback = goalkeeperFallback[attributeKey];
      return activeKeys.includes(fallback) ? fallback : "";
    }

    return "";
  }

  function eventIncludes(evento, token) {
    const searchable = normalizeToken(
      `${evento.tipo || ""} ${evento.detalhe || ""} ${evento.tipoGol || ""} ${evento.observacoes || ""}`
    );

    return searchable.includes(token);
  }

  function createEventEvolutionChange({ sourceKey, evento, jogoId, atributo, variacao, motivo }) {
    return {
      sourceKey,
      eventoId: evento?.id || "",
      jogoId: jogoId || evento?.jogoId || "",
      atributo,
      variacao,
      motivo,
      origem: "automatica",
    };
  }

  function addEvolutionChange(changes, change) {
    if (!change?.atributo || !Number(change.variacao)) {
      return;
    }

    changes.push(change);
  }

  function buildEventEvolutionChanges(jogadorId, jogador, attributes, eventos) {
    const changes = [];
    const goalsByGame = new Map();
    const assistsByGame = new Map();
    const foulsByGame = new Map();

    eventos
      .filter((evento) => !evento.cancelado)
      .forEach((evento) => {
        const eventType = normalizeEventType(evento.tipo);
        const typeToken = normalizeToken(evento.tipo);
        const jogoId = evento.jogoId || "";

        if (eventType === "gol") {
          if (evento.jogadorId === jogadorId) {
            if (evento.golContra) {
              addEvolutionChange(changes, createEventEvolutionChange({
                sourceKey: `evento:${evento.id}:gol-contra-def`,
                evento,
                atributo: "DEF",
                variacao: -1,
                motivo: "Gol contra registrado.",
              }));
            } else {
              goalsByGame.set(jogoId, (goalsByGame.get(jogoId) || 0) + 1);
              addEvolutionChange(changes, createEventEvolutionChange({
                sourceKey: `evento:${evento.id}:gol-tir`,
                evento,
                atributo: "TIR",
                variacao: 1,
                motivo: "Gol registrado.",
              }));

              if (evento.tipoGol === "penalti") {
                addEvolutionChange(changes, createEventEvolutionChange({
                  sourceKey: `evento:${evento.id}:gol-penalti-tir`,
                  evento,
                  atributo: "TIR",
                  variacao: 1,
                  motivo: "Gol de pênalti.",
                }));
              }

              if (evento.tipoGol === "falta") {
                addEvolutionChange(changes, createEventEvolutionChange({
                  sourceKey: `evento:${evento.id}:gol-falta-tir`,
                  evento,
                  atributo: "TIR",
                  variacao: 1,
                  motivo: "Gol de falta.",
                }));
                addEvolutionChange(changes, createEventEvolutionChange({
                  sourceKey: `evento:${evento.id}:gol-falta-pas`,
                  evento,
                  atributo: "PAS",
                  variacao: 1,
                  motivo: "Gol de falta.",
                }));
              }

              if (evento.tipoGol === "cabeca") {
                addEvolutionChange(changes, createEventEvolutionChange({
                  sourceKey: `evento:${evento.id}:gol-cabeca-fis`,
                  evento,
                  atributo: "FIS",
                  variacao: 1,
                  motivo: "Gol de cabeça.",
                }));
              }
            }
          }

          if (evento.assistenteId === jogadorId) {
            assistsByGame.set(jogoId, (assistsByGame.get(jogoId) || 0) + 1);
            addEvolutionChange(changes, createEventEvolutionChange({
              sourceKey: `evento:${evento.id}:assistencia-pas`,
              evento,
              atributo: "PAS",
              variacao: 1,
              motivo: "Assistência registrada.",
            }));
          }
        }

        if (eventType === "falta" && evento.jogadorId === jogadorId) {
          foulsByGame.set(jogoId, (foulsByGame.get(jogoId) || 0) + 1);

          if (evento.cartao === "amarelo") {
            addEvolutionChange(changes, createEventEvolutionChange({
              sourceKey: `evento:${evento.id}:cartao-amarelo-def`,
              evento,
              atributo: "DEF",
              variacao: -1,
              motivo: "Cartão amarelo.",
            }));
          }

          if (evento.cartao === "vermelho") {
            addEvolutionChange(changes, createEventEvolutionChange({
              sourceKey: `evento:${evento.id}:cartao-vermelho-def`,
              evento,
              atributo: "DEF",
              variacao: -2,
              motivo: "Cartão vermelho.",
            }));
          }
        }

        if (eventType === "cartao" && evento.jogadorId === jogadorId) {
          if (evento.cartao === "amarelo") {
            addEvolutionChange(changes, createEventEvolutionChange({
              sourceKey: `evento:${evento.id}:cartao-amarelo-def`,
              evento,
              atributo: "DEF",
              variacao: -1,
              motivo: "Cartão amarelo.",
            }));
          }

          if (evento.cartao === "vermelho") {
            addEvolutionChange(changes, createEventEvolutionChange({
              sourceKey: `evento:${evento.id}:cartao-vermelho-def`,
              evento,
              atributo: "DEF",
              variacao: -2,
              motivo: "Cartão vermelho.",
            }));
          }
        }

        if (typeToken === "acao_defensiva" && evento.jogadorId === jogadorId) {
          addEvolutionChange(changes, createEventEvolutionChange({
            sourceKey: `evento:${evento.id}:acao-defensiva-def`,
            evento,
            atributo: "DEF",
            variacao: 1,
            motivo: "Ação defensiva registrada.",
          }));
        }

        if (typeToken === "defesa_goleiro" && evento.jogadorId === jogadorId) {
          const tipoDefesa = normalizeToken(evento.tipoDefesaGoleiro);

          if (["dificil", "cara_a_cara", "reflexo"].includes(tipoDefesa)) {
            addEvolutionChange(changes, createEventEvolutionChange({
              sourceKey: `evento:${evento.id}:defesa-goleiro-ref`,
              evento,
              atributo: "REF",
              variacao: 1,
              motivo: "Defesa difícil registrada.",
            }));
          }

          if (tipoDefesa === "penalti") {
            addEvolutionChange(changes, createEventEvolutionChange({
              sourceKey: `evento:${evento.id}:defesa-penalti-ref`,
              evento,
              atributo: "REF",
              variacao: 1,
              motivo: "Defesa de pênalti registrada.",
            }));
          }
        }

        if ((eventType === "mvp" || typeToken === "mvp" || typeToken === "mvp_pelada") && evento.jogadorId === jogadorId) {
          const atributo = isGoalkeeper(jogador.tipoJogador, jogador.posicaoPrincipal)
            ? "REF"
            : getHighestAttributeKey(jogador, attributes);

          addEvolutionChange(changes, createEventEvolutionChange({
            sourceKey: `evento:${evento.id}:mvp-${atributo}`,
            evento,
            atributo,
            variacao: 1,
            motivo: typeToken === "mvp_pelada" ? "MVP da pelada." : "MVP da partida.",
          }));
        }

        if ((eventType === "bagre" || typeToken === "bagre" || typeToken === "bagre_pelada") && evento.jogadorId === jogadorId) {
          const atributo = getLowestUsefulAttributeKey(jogador, attributes);

          addEvolutionChange(changes, createEventEvolutionChange({
            sourceKey: `evento:${evento.id}:bagre-${atributo}`,
            evento,
            atributo,
            variacao: -1,
            motivo: typeToken === "bagre_pelada" ? "Bagre da pelada." : "Bagre da rodada.",
          }));
        }

        if (evento.jogadorId === jogadorId && (eventIncludes(evento, "defesa_dificil") || eventIncludes(evento, "defesa_importante"))) {
          addEvolutionChange(changes, createEventEvolutionChange({
            sourceKey: `evento:${evento.id}:defesa-dificil-ref`,
            evento,
            atributo: "REF",
            variacao: 1,
            motivo: "Defesa difícil.",
          }));
        }

        if (evento.jogadorId === jogadorId && (eventIncludes(evento, "falha_goleiro") || eventIncludes(evento, "gol_sofrido_por_falha"))) {
          addEvolutionChange(changes, createEventEvolutionChange({
            sourceKey: `evento:${evento.id}:falha-goleiro-pos`,
            evento,
            atributo: "POS",
            variacao: -1,
            motivo: "Gol sofrido por falha.",
          }));
        }
      });

    goalsByGame.forEach((total, jogoId) => {
      if (total >= 3) {
        addEvolutionChange(changes, createEventEvolutionChange({
          sourceKey: `jogo:${jogoId}:${jogadorId}:3-gols-tir`,
          jogoId,
          atributo: "TIR",
          variacao: 1,
          motivo: "Três gols no mesmo jogo.",
        }));
      }
    });

    assistsByGame.forEach((total, jogoId) => {
      if (total >= 3) {
        addEvolutionChange(changes, createEventEvolutionChange({
          sourceKey: `jogo:${jogoId}:${jogadorId}:3-assistencias-pas`,
          jogoId,
          atributo: "PAS",
          variacao: 1,
          motivo: "Três assistências no mesmo jogo.",
        }));
      }
    });

    foulsByGame.forEach((total, jogoId) => {
      if (total >= 3) {
        addEvolutionChange(changes, createEventEvolutionChange({
          sourceKey: `jogo:${jogoId}:${jogadorId}:faltas-excesso-def`,
          jogoId,
          atributo: "DEF",
          variacao: -1,
          motivo: "Faltas cometidas em excesso.",
        }));
      }
    });

    return changes;
  }

  function oppositeTeam(teamKey) {
    return teamKey === "A" ? "B" : "A";
  }

  function getEventMinute(jogo) {
    return clamp(Math.floor(getElapsedGameSeconds(jogo) / 60) + 1, 1, DEFAULT_RULES.duracaoJogoMinutos);
  }

  function getGoalTypeLabel(value) {
    return GOAL_TYPES.find((item) => item.value === value)?.label || "Normal";
  }

  function getCardLabel(value) {
    return CARD_TYPES.find((item) => item.value === value)?.label || "Nenhum";
  }

  function getDefensiveActionLabel(value) {
    return DEFENSIVE_ACTION_TYPES.find((item) => item.value === value)?.label || "Ação defensiva";
  }

  function getGoalkeeperSaveLabel(value) {
    return GOALKEEPER_SAVE_TYPES.find((item) => item.value === value)?.label || "Defesa";
  }

  function normalizeEventType(value) {
    return String(value || "").toLowerCase();
  }

  function playerNameFromMap(playerById, playerId) {
    const player = playerById?.get(playerId);
    return player ? playerDisplayName(player) : "Jogador";
  }

  function getLineupTeamForPlayer(bundle, playerId) {
    const lineup = bundle?.escalacoes?.find((item) => item.jogadorId === playerId);
    return lineup?.time || "";
  }

  function getLineupPlayers(bundle, teamKey) {
    return teamKey === "A" ? bundle.playersA : bundle.playersB;
  }

  function isPlayerInTeam(bundle, playerId, teamKey) {
    return getLineupTeamForPlayer(bundle, playerId) === teamKey;
  }

  function renderModalOptions(items, selectedValue = "", placeholder = "Selecione") {
    return `
      <option value="">${escapeHtml(placeholder)}</option>
      ${items
        .map(
          (item) => `
            <option value="${escapeHtml(item.value)}" ${item.value === selectedValue ? "selected" : ""}>
              ${escapeHtml(item.label)}
            </option>
          `
        )
        .join("")}
    `;
  }

  function renderPlayerOptions(players, selectedValue = "", placeholder = "Selecione") {
    return renderModalOptions(
      players.map((player) => ({
        value: player.id,
        label: `${playerDisplayName(player)} (${player.posicaoPrincipal || "-"})`,
      })),
      selectedValue,
      placeholder
    );
  }

  function createEmptyGameDraft() {
    return {
      A: { nome: "Time A", cor: "#ff5a00", linha: [], goleiro: "" },
      B: { nome: "Time B", cor: "#4aa3df", linha: [], goleiro: "" },
    };
  }

  function isGoalkeeperCandidate(player) {
    const secondary = normalizeToken(player?.posicaoSecundaria);
    return isGoalkeeper(player?.tipoJogador, player?.posicaoPrincipal) || secondary === "gk" || secondary === "goleiro";
  }

  function isLineupPlayer(player) {
    return !isGoalkeeper(player?.tipoJogador, player?.posicaoPrincipal);
  }

  function uniqueIds(ids) {
    return [...new Set((ids || []).filter(Boolean))];
  }

  function normalizeGameDraft(players = []) {
    const activeIds = new Set(players.map((player) => player.id));
    const draft = state.gameDraft || createEmptyGameDraft();

    ["A", "B"].forEach((teamKey) => {
      draft[teamKey] = {
        ...(createEmptyGameDraft()[teamKey]),
        ...(draft[teamKey] || {}),
      };
      draft[teamKey].linha = uniqueIds(draft[teamKey].linha).filter((id) => activeIds.has(id));
      draft[teamKey].goleiro = activeIds.has(draft[teamKey].goleiro) ? draft[teamKey].goleiro : "";
    });

    ["A", "B"].forEach((teamKey) => {
      const otherTeam = oppositeTeam(teamKey);
      const blockedByOther = new Set([
        ...draft[otherTeam].linha,
        draft[otherTeam].goleiro,
      ].filter(Boolean));

      draft[teamKey].linha = draft[teamKey].linha.filter((id) => !blockedByOther.has(id) && id !== draft[teamKey].goleiro);

      if (blockedByOther.has(draft[teamKey].goleiro) || draft[teamKey].linha.includes(draft[teamKey].goleiro)) {
        draft[teamKey].goleiro = "";
      }
    });

    state.gameDraft = draft;
    return draft;
  }

  function syncGameDraftFromForm(form = $("#game-form")) {
    if (!form) {
      return;
    }

    state.gameDraft.A.nome = String(form.elements.timeANome?.value || "Time A").trim() || "Time A";
    state.gameDraft.A.cor = form.elements.timeACor?.value || "#ff5a00";
    state.gameDraft.B.nome = String(form.elements.timeBNome?.value || "Time B").trim() || "Time B";
    state.gameDraft.B.cor = form.elements.timeBCor?.value || "#4aa3df";
  }

  function getDraftPlayers(teamKey, players, type = "all") {
    const playerById = new Map(players.map((player) => [player.id, player]));
    const draft = state.gameDraft[teamKey] || createEmptyGameDraft()[teamKey];
    const linePlayers = draft.linha.map((id) => playerById.get(id)).filter(Boolean);
    const goalkeeper = draft.goleiro ? playerById.get(draft.goleiro) : null;

    if (type === "linha") {
      return linePlayers;
    }

    if (type === "goleiro") {
      return goalkeeper ? [goalkeeper] : [];
    }

    return uniqueIds([draft.goleiro, ...draft.linha]).map((id) => playerById.get(id)).filter(Boolean);
  }

  function renderEventTimeline(bundle) {
    const events = bundle?.eventos || [];

    if (!events.length) {
      return `<p>Nenhum evento registrado ainda.</p>`;
    }

    return `<ul class="event-list">${events.map((evento) => renderEventListItem(evento, bundle.playerById, bundle.jogo)).join("")}</ul>`;
  }

  function renderEventListItem(evento, playerById = new Map(), jogo = null) {
    const eventType = normalizeToken(evento.tipo);
    const minute = evento.minuto ? `${escapeHtml(evento.minuto)}'` : "-";

    if (eventType === "cartao") {
      const player = playerNameFromMap(playerById, evento.jogadorId);
      return `<li><strong>${minute}</strong><span>Cartão ${escapeHtml(getCardLabel(evento.cartao))} para ${escapeHtml(player)}</span></li>`;
    }

    if (eventType === "acao_defensiva") {
      const player = playerNameFromMap(playerById, evento.jogadorId);
      const actionLabel = getDefensiveActionLabel(evento.tipoAcaoDefensiva);
      const suffix = evento.tipoAcaoDefensiva === "bloqueio" ? " importante" : "";
      return `<li><strong>${minute}</strong><span>${escapeHtml(actionLabel)}${escapeHtml(suffix)} de ${escapeHtml(player)}</span></li>`;
    }

    if (eventType === "defesa_goleiro") {
      const goalkeeper = playerNameFromMap(playerById, evento.jogadorId);
      const saveLabel = getGoalkeeperSaveLabel(evento.tipoDefesaGoleiro);
      const prefix = evento.tipoDefesaGoleiro === "dificil"
        ? "Defesa difícil"
        : evento.tipoDefesaGoleiro === "penalti"
          ? "Defesa de pênalti"
          : `Defesa ${saveLabel.toLowerCase()}`;
      return `<li><strong>${minute}</strong><span>${escapeHtml(prefix)} de ${escapeHtml(goalkeeper)}</span></li>`;
    }

    if (eventType === "gol") {
      const author = playerNameFromMap(playerById, evento.jogadorId);
      const assist = evento.assistenteId ? ` - Assistência de ${playerNameFromMap(playerById, evento.assistenteId)}` : "";
      const goalType = evento.tipoGol && evento.tipoGol !== "normal" ? ` - ${getGoalTypeLabel(evento.tipoGol)}` : "";

      if (evento.golContra) {
        return `<li><strong>${minute}</strong><span>Gol contra de ${escapeHtml(author)} - ponto para ${escapeHtml(teamNameFromGame(jogo, evento.time || ""))}</span></li>`;
      }

      return `<li><strong>${minute}</strong><span>Gol de ${escapeHtml(author)}${escapeHtml(assist)}${escapeHtml(goalType)}</span></li>`;
    }

    if (eventType === "falta") {
      const offender = playerNameFromMap(playerById, evento.jogadorId);
      const victim = playerNameFromMap(playerById, evento.jogadorSofreuId);
      const card = evento.cartao && evento.cartao !== "nenhum" ? ` - Cartão ${getCardLabel(evento.cartao)}` : "";
      return `<li><strong>${minute}</strong><span>Falta de ${escapeHtml(offender)} em ${escapeHtml(victim)}${escapeHtml(card)}</span></li>`;
    }

    if (eventType === "ação defensiva" || eventType === "acao defensiva") {
      const player = playerNameFromMap(playerById, evento.jogadorId);
      const actionLabel = getDefensiveActionLabel(evento.tipoAcaoDefensiva);
      const suffix = evento.tipoAcaoDefensiva === "bloqueio" ? " importante" : "";
      return `<li><strong>${minute}</strong><span>${escapeHtml(actionLabel)}${escapeHtml(suffix)} de ${escapeHtml(player)}</span></li>`;
    }

    if (eventType === "defesa goleiro") {
      const goalkeeper = playerNameFromMap(playerById, evento.jogadorId);
      const saveLabel = getGoalkeeperSaveLabel(evento.tipoDefesaGoleiro);
      const prefix = evento.tipoDefesaGoleiro === "dificil"
        ? "Defesa difícil"
        : evento.tipoDefesaGoleiro === "penalti"
          ? "Defesa de pênalti"
          : `Defesa ${saveLabel.toLowerCase()}`;
      return `<li><strong>${minute}</strong><span>${escapeHtml(prefix)} de ${escapeHtml(goalkeeper)}</span></li>`;
    }

    return `
      <li>
        <strong>${minute}</strong>
        <span>${escapeHtml(evento.tipo || "Evento")} ${escapeHtml(evento.detalhe || evento.observacoes || "")}</span>
      </li>
    `;
  }

  const requestToPromise = (request) =>
    new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

  const transactionDone = (transaction) =>
    new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });

  function getDeviceId() {
    const storageKey = "bagrescore:device-id";
    const existing = localStorage.getItem(storageKey);

    if (existing) {
      return existing;
    }

    const deviceId = uid();
    localStorage.setItem(storageKey, deviceId);
    return deviceId;
  }

  function openLocalDatabase() {
    return new Promise((resolve, reject) => {
      if (!("indexedDB" in window)) {
        reject(new Error("IndexedDB não está disponível neste navegador."));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        const transaction = request.transaction;

        STORE_SCHEMAS.forEach((schema) => {
          const store = db.objectStoreNames.contains(schema.name)
            ? transaction.objectStore(schema.name)
            : db.createObjectStore(schema.name, { keyPath: schema.keyPath });

          schema.indexes.forEach(([indexName, keyPath, options = {}]) => {
            if (!store.indexNames.contains(indexName)) {
              store.createIndex(indexName, keyPath, options);
            }
          });
        });
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function getRecord(storeName, key) {
    const transaction = state.db.transaction(storeName, "readonly");
    const request = transaction.objectStore(storeName).get(key);
    return requestToPromise(request);
  }

  async function getAllRecords(storeName) {
    const transaction = state.db.transaction(storeName, "readonly");
    const request = transaction.objectStore(storeName).getAll();
    return requestToPromise(request);
  }

  async function putRecord(storeName, record) {
    const transaction = state.db.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).put(record);
    await transactionDone(transaction);
    return record;
  }

  async function putRecords(recordsByStore) {
    const storeNames = Object.keys(recordsByStore);
    const transaction = state.db.transaction(storeNames, "readwrite");

    storeNames.forEach((storeName) => {
      const store = transaction.objectStore(storeName);
      recordsByStore[storeName].forEach((record) => store.put(record));
    });

    await transactionDone(transaction);
  }

  async function countRecords(storeName) {
    const transaction = state.db.transaction(storeName, "readonly");
    const request = transaction.objectStore(storeName).count();
    return requestToPromise(request);
  }

  function createSyncQueueRecord(storeName, operation, entityId, payload) {
    return {
      id: uid(),
      storeName,
      operation,
      entityId,
      payload,
      status: "pendente",
      attempts: 0,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
  }

  function createAuditRecord(entityName, entityId, action, before, after) {
    const createdAt = nowIso();

    return {
      id: uid(),
      entityName,
      entityId,
      action,
      before: before || null,
      after: after || null,
      createdBy: getDeviceId(),
      createdAt,
    };
  }

  async function aplicarAlteracoesAtributos(jogadorId, changes) {
    const filteredChanges = (changes || []).filter((change) => change && Number(change.variacao));

    if (!filteredChanges.length) {
      return [];
    }

    const [jogador, existingAttributes, existingEvolucoes] = await Promise.all([
      getRecord("jogadores", jogadorId),
      getRecord("atributos", jogadorId),
      getAllRecords("evolucoes"),
    ]);

    if (!jogador) {
      return [];
    }

    const savedAt = nowIso();
    const existingSourceKeys = new Set(
      existingEvolucoes
        .filter((evolucao) => evolucao.jogadorId === jogadorId && evolucao.sourceKey)
        .map((evolucao) => evolucao.sourceKey)
    );
    const cardBefore = recalcularOverallJogador({
      ...jogador,
      attributes: {
        ...defaultAttributes(jogador.tipoJogador, jogador.posicaoPrincipal),
        ...(existingAttributes || {}),
      },
    });
    const nextAttributes = { ...cardBefore.attributes };
    const evolucoes = [];

    filteredChanges.forEach((change) => {
      if (change.sourceKey && existingSourceKeys.has(change.sourceKey)) {
        return;
      }

      const atributo = resolveEvolutionAttribute(jogador, change.atributo);

      if (!atributo) {
        return;
      }

      const valorAnterior = normalizeAttributeValue(nextAttributes[atributo]);
      const valorNovo = clamp(valorAnterior + Math.round(Number(change.variacao)), 1, 99);
      const variacaoReal = valorNovo - valorAnterior;

      if (!variacaoReal) {
        return;
      }

      nextAttributes[atributo] = valorNovo;
      evolucoes.push({
        id: uid(),
        jogadorId,
        atributo,
        variacao: variacaoReal,
        motivo: change.motivo || "Evolução da carta.",
        origem: change.origem || "automatica",
        sourceKey: change.sourceKey || `manual:${uid()}`,
        eventoId: change.eventoId || "",
        jogoId: change.jogoId || "",
        valorAnterior,
        valorNovo,
        criadoPor: getDeviceId(),
        createdAt: savedAt,
        updatedAt: savedAt,
        revision: 1,
      });

      if (change.sourceKey) {
        existingSourceKeys.add(change.sourceKey);
      }
    });

    if (!evolucoes.length) {
      return [];
    }

    const cardAfter = recalcularOverallJogador({ ...jogador, attributes: nextAttributes });
    const jogadorAtualizado = {
      ...jogador,
      overall: cardAfter.overall,
      estrelas: cardAfter.estrelas,
      updatedAt: savedAt,
      revision: (jogador.revision || 0) + 1,
    };
    const atributosAtualizados = {
      jogadorId,
      ...cardAfter.attributes,
      overall: cardAfter.overall,
      estrelas: cardAfter.estrelas,
      updatedAt: savedAt,
      revision: (existingAttributes?.revision || 0) + 1,
    };

    await putRecords({
      jogadores: [jogadorAtualizado],
      atributos: [atributosAtualizados],
      evolucoes,
      syncQueue: [
        createSyncQueueRecord("jogadores", "upsert", jogadorId, jogadorAtualizado),
        createSyncQueueRecord("atributos", "upsert", jogadorId, atributosAtualizados),
        ...evolucoes.map((evolucao) =>
          createSyncQueueRecord("evolucoes", "upsert", evolucao.id, evolucao)
        ),
      ],
      auditLog: [
        createAuditRecord("atributos", jogadorId, "evoluir", { jogador, atributos: existingAttributes }, {
          jogador: jogadorAtualizado,
          atributos: atributosAtualizados,
          evolucoes,
        }),
      ],
    });

    return evolucoes;
  }

  async function aplicarEvolucaoPorEventos(jogadorId) {
    const [jogador, attributesRecord, eventos] = await Promise.all([
      getRecord("jogadores", jogadorId),
      getRecord("atributos", jogadorId),
      getAllRecords("eventos"),
    ]);

    if (!jogador) {
      return [];
    }

    const card = recalcularOverallJogador({
      ...jogador,
      attributes: {
        ...defaultAttributes(jogador.tipoJogador, jogador.posicaoPrincipal),
        ...(attributesRecord || {}),
      },
    });
    const changes = buildEventEvolutionChanges(jogadorId, jogador, card.attributes, eventos);

    return aplicarAlteracoesAtributos(jogadorId, changes);
  }

  async function aplicarEvolucaoManual({ jogadorId, atributo, variacao, motivo }) {
    return aplicarAlteracoesAtributos(jogadorId, [
      {
        atributo,
        variacao,
        motivo,
        origem: "manual",
        sourceKey: `manual:${uid()}`,
      },
    ]);
  }

  async function refreshCurrentView() {
    renderDashboardCards(await readDashboardStats());
    await renderCurrentSection();
  }

  async function updatePendingCount() {
    if (!state.db) {
      return;
    }

    const pending = (await getAllRecords("syncQueue")).filter(
      (item) => item.status !== "sincronizado"
    ).length;
    $("#pending-count").textContent = `${pending} pendente${pending === 1 ? "" : "s"}`;
  }

  async function readActivePlayers() {
    const jogadores = await readPlayersWithAttributes();
    return jogadores.filter((jogador) => jogador.status === "Ativo" || jogador.status === "Convidado");
  }

  async function readPeladasSorted() {
    const peladas = await getAllRecords("peladas");
    return peladas.sort((a, b) => {
      const byDate = String(b.data || "").localeCompare(String(a.data || ""));
      if (byDate) return byDate;
      return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
    });
  }

  async function readGamesForPelada(peladaId) {
    const jogos = await getAllRecords("jogos");
    return jogos
      .filter((jogo) => jogo.peladaId === peladaId)
      .sort((a, b) => String(a.createdAt || a.inicio || "").localeCompare(String(b.createdAt || b.inicio || "")));
  }

  async function readGameBundle(jogoId) {
    if (!jogoId) {
      return null;
    }

    const [jogo, times, escalacoes, jogadores, eventos, peladas] = await Promise.all([
      getRecord("jogos", jogoId),
      getAllRecords("times"),
      getAllRecords("escalacoes"),
      getAllRecords("jogadores"),
      getAllRecords("eventos"),
      getAllRecords("peladas"),
    ]);

    if (!jogo) {
      return null;
    }

    const playerById = new Map(jogadores.map((jogador) => [jogador.id, jogador]));
    const gameTeams = times.filter((time) => time.jogoId === jogoId);
    const gameLineups = escalacoes.filter((escalacao) => escalacao.jogoId === jogoId);
    const playersA = gameLineups
      .filter((escalacao) => escalacao.time === "A" || escalacao.timeId === jogo.timeA?.id)
      .map((escalacao) => playerById.get(escalacao.jogadorId))
      .filter(Boolean);
    const playersB = gameLineups
      .filter((escalacao) => escalacao.time === "B" || escalacao.timeId === jogo.timeB?.id)
      .map((escalacao) => playerById.get(escalacao.jogadorId))
      .filter(Boolean);

    return {
      jogo,
      pelada: peladas.find((pelada) => pelada.id === jogo.peladaId) || null,
      times: gameTeams,
      escalacoes: gameLineups,
      playerById,
      eventos: eventos
        .filter((evento) => evento.jogoId === jogoId && !evento.cancelado)
        .sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || ""))),
      playersA,
      playersB,
    };
  }

  function formatScoreNumber(value) {
    const numberValue = Number(value) || 0;
    return numberValue
      .toFixed(numberValue % 1 === 0 ? 0 : 1)
      .replace(".", ",");
  }

  function createPeladaPlayerScore(jogador) {
    return {
      jogador,
      jogadorId: jogador.id,
      jogos: 0,
      vitorias: 0,
      empates: 0,
      derrotas: 0,
      gols: 0,
      assistencias: 0,
      participacoesGol: 0,
      faltasCometidas: 0,
      cartoesAmarelos: 0,
      cartoesVermelhos: 0,
      golsContra: 0,
      acoesDefensivas: 0,
      defesasDificeis: 0,
      defesasPenalti: 0,
      eventos: 0,
      pontuacao: 0,
      bagreScore: 0,
    };
  }

  function getOrCreatePeladaPlayerScore(scoreByPlayerId, playerById, jogadorId) {
    if (!jogadorId) {
      return null;
    }

    if (!scoreByPlayerId.has(jogadorId)) {
      scoreByPlayerId.set(
        jogadorId,
        createPeladaPlayerScore(playerById.get(jogadorId) || { id: jogadorId, nome: "Jogador" })
      );
    }

    return scoreByPlayerId.get(jogadorId);
  }

  function getLatestAwardEvent(events, awardType) {
    return events
      .filter((evento) => normalizeToken(evento.tipo) === awardType)
      .sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")))[0] || null;
  }

  function getTopPeladaPlayerScore(playerScores, metric, options = {}) {
    const requirePositive = options.requirePositive !== false;
    const entries = playerScores
      .filter((stats) => stats.jogador && (!requirePositive || Number(stats[metric] || 0) > 0))
      .sort((a, b) =>
        Number(b[metric] || 0) - Number(a[metric] || 0) ||
        Number(b.pontuacao || 0) - Number(a.pontuacao || 0) ||
        playerDisplayName(a.jogador).localeCompare(playerDisplayName(b.jogador), "pt-BR")
      );

    return entries[0] || null;
  }

  function buildPeladaClosureSummary(pelada, jogos = [], eventos = [], escalacoes = [], jogadores = []) {
    const playerById = new Map(jogadores.map((jogador) => [jogador.id, jogador]));
    const finalizedGames = jogos.filter((jogo) => jogo.status === "Finalizado");
    const activeGames = jogos.filter((jogo) => jogo.status === "Em andamento");
    const finalizedGameIds = new Set(finalizedGames.map((jogo) => jogo.id));
    const scoreByPlayerId = new Map();
    const awardEvents = eventos.filter((evento) =>
      !evento.cancelado &&
      evento.peladaId === pelada.id &&
      ["mvp_pelada", "bagre_pelada"].includes(normalizeToken(evento.tipo))
    );
    const gameEvents = eventos.filter(
      (evento) => !evento.cancelado && finalizedGameIds.has(evento.jogoId)
    );

    finalizedGames.forEach((jogo) => {
      escalacoes
        .filter((escalacao) => escalacao.jogoId === jogo.id)
        .forEach((escalacao) => {
          const stats = getOrCreatePeladaPlayerScore(scoreByPlayerId, playerById, escalacao.jogadorId);
          const result = getGameResultForTeam(jogo, escalacao.time);

          if (!stats) {
            return;
          }

          stats.jogos += 1;
          if (result === "vitoria") {
            stats.vitorias += 1;
            stats.pontuacao += 2;
          } else if (result === "empate") {
            stats.empates += 1;
            stats.pontuacao += 1;
          } else if (result === "derrota") {
            stats.derrotas += 1;
            stats.bagreScore += 1;
          }
        });
    });

    gameEvents.forEach((evento) => {
      const eventType = normalizeToken(evento.tipo);
      const tipoGol = normalizeToken(evento.tipoGol);
      const cartao = normalizeToken(evento.cartao);

      if (eventType === "gol") {
        const stats = getOrCreatePeladaPlayerScore(scoreByPlayerId, playerById, evento.jogadorId);
        const isOwnGoal = Boolean(evento.golContra) || tipoGol === "gol_contra";

        if (stats) {
          stats.eventos += 1;

          if (isOwnGoal) {
            stats.golsContra += 1;
            stats.pontuacao -= 3;
            stats.bagreScore += 4;
          } else {
            stats.gols += 1;
            stats.pontuacao += 3;

            if (tipoGol === "penalti") stats.pontuacao += 1;
            if (tipoGol === "falta") stats.pontuacao += 2;
            if (tipoGol === "cabeca") stats.pontuacao += 1;
          }
        }

        if (evento.assistenteId) {
          const assistStats = getOrCreatePeladaPlayerScore(scoreByPlayerId, playerById, evento.assistenteId);
          if (assistStats) {
            assistStats.assistencias += 1;
            assistStats.eventos += 1;
            assistStats.pontuacao += 2;
          }
        }
      }

      if (eventType === "falta") {
        const stats = getOrCreatePeladaPlayerScore(scoreByPlayerId, playerById, evento.jogadorId);
        if (stats) {
          stats.faltasCometidas += 1;
          stats.eventos += 1;
          stats.pontuacao -= 0.5;
          stats.bagreScore += 0.5;

          if (cartao === "amarelo") {
            stats.cartoesAmarelos += 1;
            stats.pontuacao -= 1;
            stats.bagreScore += 1;
          }

          if (cartao === "vermelho") {
            stats.cartoesVermelhos += 1;
            stats.pontuacao -= 2;
            stats.bagreScore += 3;
          }
        }
      }

      if (eventType === "cartao") {
        const stats = getOrCreatePeladaPlayerScore(scoreByPlayerId, playerById, evento.jogadorId);
        if (stats) {
          if (cartao === "amarelo") {
            stats.cartoesAmarelos += 1;
            stats.pontuacao -= 1;
            stats.bagreScore += 1;
          }

          if (cartao === "vermelho") {
            stats.cartoesVermelhos += 1;
            stats.pontuacao -= 2;
            stats.bagreScore += 3;
          }
        }
      }

      if (eventType === "acao_defensiva") {
        const stats = getOrCreatePeladaPlayerScore(scoreByPlayerId, playerById, evento.jogadorId);
        if (stats) {
          stats.acoesDefensivas += 1;
          stats.eventos += 1;
          stats.pontuacao += 1;
        }
      }

      if (eventType === "defesa_goleiro") {
        const stats = getOrCreatePeladaPlayerScore(scoreByPlayerId, playerById, evento.jogadorId);
        const tipoDefesa = normalizeToken(evento.tipoDefesaGoleiro);

        if (stats) {
          stats.eventos += 1;

          if (tipoDefesa === "penalti") {
            stats.defesasDificeis += 1;
            stats.defesasPenalti += 1;
            stats.pontuacao += 4;
          } else if (["dificil", "cara_a_cara", "reflexo"].includes(tipoDefesa)) {
            stats.defesasDificeis += 1;
            stats.pontuacao += 2;
          }
        }
      }
    });

    const playerScores = [...scoreByPlayerId.values()].map((stats) => {
      const positiveActions = stats.gols + stats.assistencias + stats.acoesDefensivas + stats.defesasDificeis;
      stats.participacoesGol = stats.gols + stats.assistencias;

      if (stats.jogos > 0 && positiveActions === 0) {
        stats.bagreScore += 1;
      }

      if (stats.pontuacao < 0) {
        stats.bagreScore += Math.abs(stats.pontuacao);
      }

      return stats;
    });
    const goals = gameEvents.filter((evento) => normalizeToken(evento.tipo) === "gol");
    const assists = goals.filter((evento) => evento.assistenteId);
    const fouls = gameEvents.filter((evento) => normalizeToken(evento.tipo) === "falta");
    const defensiveActions = gameEvents.filter((evento) => normalizeToken(evento.tipo) === "acao_defensiva");
    const difficultSaves = gameEvents.filter((evento) => {
      const eventType = normalizeToken(evento.tipo);
      const tipoDefesa = normalizeToken(evento.tipoDefesaGoleiro);
      return eventType === "defesa_goleiro" && ["dificil", "penalti", "cara_a_cara", "reflexo"].includes(tipoDefesa);
    });
    const suggestedMvp = playerScores
      .filter((stats) => stats.jogos > 0 || stats.eventos > 0)
      .sort((a, b) =>
        Number(b.pontuacao || 0) - Number(a.pontuacao || 0) ||
        Number(b.participacoesGol || 0) - Number(a.participacoesGol || 0) ||
        Number(b.vitorias || 0) - Number(a.vitorias || 0) ||
        playerDisplayName(a.jogador).localeCompare(playerDisplayName(b.jogador), "pt-BR")
      )[0] || null;
    const suggestedBagre = playerScores
      .filter((stats) => stats.jogos > 0 || stats.eventos > 0)
      .sort((a, b) =>
        Number(b.bagreScore || 0) - Number(a.bagreScore || 0) ||
        Number(a.pontuacao || 0) - Number(b.pontuacao || 0) ||
        Number(b.golsContra || 0) - Number(a.golsContra || 0) ||
        Number(b.cartoesVermelhos || 0) - Number(a.cartoesVermelhos || 0) ||
        Number(b.faltasCometidas || 0) - Number(a.faltasCometidas || 0) ||
        playerDisplayName(a.jogador).localeCompare(playerDisplayName(b.jogador), "pt-BR")
      )[0] || null;

    const summary = {
      pelada,
      jogos,
      finalizedGames,
      activeGames,
      hasActiveGames: activeGames.length > 0,
      playerById,
      scoreByPlayerId,
      playerScores,
      gameEvents,
      awards: {
        mvp: getLatestAwardEvent(awardEvents, "mvp_pelada"),
        bagre: getLatestAwardEvent(awardEvents, "bagre_pelada"),
      },
      leaders: {
        artilheiro: getTopPeladaPlayerScore(playerScores, "gols"),
        assistencias: getTopPeladaPlayerScore(playerScores, "assistencias"),
        participacoesGol: getTopPeladaPlayerScore(playerScores, "participacoesGol"),
        vitorias: getTopPeladaPlayerScore(playerScores, "vitorias"),
        goleiroDefesas: getTopPeladaPlayerScore(playerScores, "defesasDificeis"),
      },
      suggestions: {
        mvp: suggestedMvp,
        bagre: suggestedBagre,
      },
      totals: {
        jogosRealizados: finalizedGames.length,
        gols: goals.length,
        assistencias: assists.length,
        faltas: fouls.length,
        acoesDefensivas: defensiveActions.length,
        defesasDificeis: difficultSaves.length,
      },
    };

    summary.canFinalize = summary.totals.jogosRealizados > 0 && !summary.hasActiveGames && pelada.status !== "Finalizada";
    summary.finishDisabledReason = pelada.status === "Finalizada"
      ? "Pelada já finalizada."
      : summary.hasActiveGames
        ? "Finalize os jogos em andamento antes de encerrar a pelada."
        : summary.totals.jogosRealizados === 0
          ? "É preciso ter pelo menos um jogo finalizado."
          : "";

    return summary;
  }

  async function findActiveGame() {
    if (state.activeGameId) {
      const storedGame = await getRecord("jogos", state.activeGameId);
      if (storedGame?.status === "Em andamento") {
        return storedGame;
      }
    }

    const jogos = await getAllRecords("jogos");
    const activeGame = jogos
      .filter((jogo) => jogo.status === "Em andamento")
      .sort((a, b) => String(b.inicio || "").localeCompare(String(a.inicio || "")))[0];

    if (activeGame) {
      setActiveGameId(activeGame.id);
      return activeGame;
    }

    setActiveGameId(null);
    return null;
  }

  function createEmptyPlayerStats(jogador) {
    return {
      jogador,
      jogadorId: jogador.id,
      jogos: 0,
      vitorias: 0,
      derrotas: 0,
      empates: 0,
      aproveitamento: 0,
      gols: 0,
      assistencias: 0,
      participacoesGol: 0,
      golsPenalti: 0,
      golsFalta: 0,
      golsCabeca: 0,
      golsContra: 0,
      golsPorJogo: 0,
      assistenciasPorJogo: 0,
      gaPorJogo: 0,
      faltasCometidas: 0,
      faltasSofridas: 0,
      desarmes: 0,
      interceptacoes: 0,
      bloqueios: 0,
      cortes: 0,
      acoesDefensivas: 0,
      defesasDificeis: 0,
      defesasPenalti: 0,
      cartoesAmarelos: 0,
      cartoesVermelhos: 0,
      cartoesTotal: 0,
      mvp: 0,
      bagre: 0,
      mvpsPelada: 0,
      bagresPelada: 0,
      historico: [],
      premiosPelada: [],
    };
  }

  async function calcularEstatisticasJogadores(filters = state.statsFilters) {
    const [jogadores, peladas, jogos, escalacoes, eventos] = await Promise.all([
      readPlayersWithAttributes(),
      getAllRecords("peladas"),
      getAllRecords("jogos"),
      getAllRecords("escalacoes"),
      getAllRecords("eventos"),
    ]);
    const peladaById = new Map(peladas.map((pelada) => [pelada.id, pelada]));
    const gameById = new Map(jogos.map((jogo) => [jogo.id, jogo]));
    const playerById = new Map(jogadores.map((jogador) => [jogador.id, jogador]));
    const selectedGames = jogos.filter((jogo) => gameMatchesStatsFilters(jogo, peladaById, filters));
    const selectedGameIds = new Set(selectedGames.map((jogo) => jogo.id));
    const selectedPeladaIdsForAwards = new Set(
      peladas
        .filter((pelada) => peladaMatchesStatsFilters(pelada, filters))
        .map((pelada) => pelada.id)
    );
    const finalizedGames = selectedGames.filter((jogo) => jogo.status === "Finalizado");
    const filteredPlayers = jogadores.filter((jogador) => playerMatchesStatsFilters(jogador, filters));
    const statsByPlayerId = new Map(
      filteredPlayers.map((jogador) => [jogador.id, createEmptyPlayerStats(jogador)])
    );
    const historyByPlayerGame = new Map();

    finalizedGames.forEach((jogo) => {
      const pelada = peladaById.get(jogo.peladaId);
      escalacoes
        .filter((escalacao) => escalacao.jogoId === jogo.id)
        .forEach((escalacao) => {
          const stats = statsByPlayerId.get(escalacao.jogadorId);

          if (!stats) {
            return;
          }

          const result = getGameResultForTeam(jogo, escalacao.time);
          const history = {
            jogoId: jogo.id,
            peladaId: jogo.peladaId,
            data: pelada?.data || jogo.inicio?.slice(0, 10) || "",
            local: pelada?.local || "",
            time: escalacao.time,
            timeNome: teamNameFromGame(jogo, escalacao.time),
            placar: `${jogo.placarA ?? 0} x ${jogo.placarB ?? 0}`,
            resultado: result,
            gols: 0,
            assistencias: 0,
            faltasCometidas: 0,
            faltasSofridas: 0,
            acoesDefensivas: 0,
            defesasDificeis: 0,
          };

          stats.jogos += 1;
          if (result === "vitoria") stats.vitorias += 1;
          if (result === "derrota") stats.derrotas += 1;
          if (result === "empate") stats.empates += 1;
          stats.historico.push(history);
          historyByPlayerGame.set(`${escalacao.jogadorId}:${jogo.id}`, history);
        });
    });

    const scopedEvents = eventos.filter((evento) => {
      if (evento.cancelado) {
        return false;
      }

      const eventType = normalizeToken(evento.tipo);
      const isGameEvent = selectedGameIds.has(evento.jogoId);
      const isPeladaAward = ["mvp_pelada", "bagre_pelada"].includes(eventType) &&
        selectedPeladaIdsForAwards.has(evento.peladaId);

      return isGameEvent || isPeladaAward;
    });

    scopedEvents.forEach((evento) => {
      const eventType = normalizeToken(evento.tipo);
      const tipoGol = normalizeToken(evento.tipoGol);
      const cartao = normalizeToken(evento.cartao);

      if (eventType === "gol") {
        if (evento.jogadorId && statsByPlayerId.has(evento.jogadorId)) {
          const stats = statsByPlayerId.get(evento.jogadorId);
          const history = historyByPlayerGame.get(`${evento.jogadorId}:${evento.jogoId}`);

          if (evento.golContra) {
            stats.golsContra += 1;
          } else {
            stats.gols += 1;
            if (history) history.gols += 1;
          }

          if (!evento.golContra && tipoGol === "penalti") stats.golsPenalti += 1;
          if (!evento.golContra && tipoGol === "falta") stats.golsFalta += 1;
          if (!evento.golContra && tipoGol === "cabeca") stats.golsCabeca += 1;
        }

        if (evento.assistenteId && statsByPlayerId.has(evento.assistenteId)) {
          const stats = statsByPlayerId.get(evento.assistenteId);
          const history = historyByPlayerGame.get(`${evento.assistenteId}:${evento.jogoId}`);
          stats.assistencias += 1;
          if (history) history.assistencias += 1;
        }
      }

      if (eventType === "falta") {
        if (evento.jogadorId && statsByPlayerId.has(evento.jogadorId)) {
          const stats = statsByPlayerId.get(evento.jogadorId);
          const history = historyByPlayerGame.get(`${evento.jogadorId}:${evento.jogoId}`);
          stats.faltasCometidas += 1;
          if (history) history.faltasCometidas += 1;

          if (cartao === "amarelo") stats.cartoesAmarelos += 1;
          if (cartao === "vermelho") stats.cartoesVermelhos += 1;
        }

        if (evento.jogadorSofreuId && statsByPlayerId.has(evento.jogadorSofreuId)) {
          const stats = statsByPlayerId.get(evento.jogadorSofreuId);
          const history = historyByPlayerGame.get(`${evento.jogadorSofreuId}:${evento.jogoId}`);
          stats.faltasSofridas += 1;
          if (history) history.faltasSofridas += 1;
        }
      }

      if (eventType === "cartao" && evento.jogadorId && statsByPlayerId.has(evento.jogadorId)) {
        const stats = statsByPlayerId.get(evento.jogadorId);
        if (cartao === "amarelo") stats.cartoesAmarelos += 1;
        if (cartao === "vermelho") stats.cartoesVermelhos += 1;
      }

      if (eventType === "acao_defensiva" && evento.jogadorId && statsByPlayerId.has(evento.jogadorId)) {
        const stats = statsByPlayerId.get(evento.jogadorId);
        const history = historyByPlayerGame.get(`${evento.jogadorId}:${evento.jogoId}`);
        const tipoAcao = normalizeToken(evento.tipoAcaoDefensiva);

        stats.acoesDefensivas += 1;
        if (history) history.acoesDefensivas += 1;
        if (tipoAcao === "desarme") stats.desarmes += 1;
        if (tipoAcao === "interceptacao") stats.interceptacoes += 1;
        if (tipoAcao === "bloqueio") stats.bloqueios += 1;
        if (tipoAcao === "corte") stats.cortes += 1;
      }

      if (eventType === "defesa_goleiro" && evento.jogadorId && statsByPlayerId.has(evento.jogadorId)) {
        const stats = statsByPlayerId.get(evento.jogadorId);
        const history = historyByPlayerGame.get(`${evento.jogadorId}:${evento.jogoId}`);
        const tipoDefesa = normalizeToken(evento.tipoDefesaGoleiro);

        if (["dificil", "penalti", "cara_a_cara", "reflexo"].includes(tipoDefesa)) {
          stats.defesasDificeis += 1;
          if (history) history.defesasDificeis += 1;
        }

        if (tipoDefesa === "penalti") {
          stats.defesasPenalti += 1;
        }
      }

      if ((eventType === "mvp" || eventType === "mvp_pelada") && evento.jogadorId && statsByPlayerId.has(evento.jogadorId)) {
        const stats = statsByPlayerId.get(evento.jogadorId);
        const pelada = peladaById.get(evento.peladaId);

        stats.mvp += 1;

        if (eventType === "mvp_pelada") {
          stats.mvpsPelada += 1;
          stats.premiosPelada.push({
            tipo: "MVP da Pelada",
            peladaId: evento.peladaId,
            data: pelada?.data || evento.createdAt?.slice(0, 10) || "",
            local: pelada?.local || "Pelada",
            pontuacaoCalculada: evento.pontuacaoCalculada,
            observacoes: evento.observacoes || "",
          });
        }
      }

      if ((eventType === "bagre" || eventType === "bagre_pelada") && evento.jogadorId && statsByPlayerId.has(evento.jogadorId)) {
        const stats = statsByPlayerId.get(evento.jogadorId);
        const pelada = peladaById.get(evento.peladaId);

        stats.bagre += 1;

        if (eventType === "bagre_pelada") {
          stats.bagresPelada += 1;
          stats.premiosPelada.push({
            tipo: "Bagre da Pelada",
            peladaId: evento.peladaId,
            data: pelada?.data || evento.createdAt?.slice(0, 10) || "",
            local: pelada?.local || "Pelada",
            pontuacaoCalculada: evento.pontuacaoCalculada,
            observacoes: evento.observacoes || "",
          });
        }
      }
    });

    const playersStats = [...statsByPlayerId.values()].map((stats) => {
      stats.participacoesGol = stats.gols + stats.assistencias;
      stats.cartoesTotal = stats.cartoesAmarelos + stats.cartoesVermelhos;
      stats.aproveitamento = stats.jogos
        ? ((stats.vitorias * 3 + stats.empates) / (stats.jogos * 3)) * 100
        : 0;
      stats.golsPorJogo = safeDivide(stats.gols, stats.jogos);
      stats.assistenciasPorJogo = safeDivide(stats.assistencias, stats.jogos);
      stats.gaPorJogo = safeDivide(stats.participacoesGol, stats.jogos);
      stats.historico.sort((a, b) => String(b.data || "").localeCompare(String(a.data || "")));
      stats.premiosPelada.sort((a, b) => String(b.data || "").localeCompare(String(a.data || "")));
      return stats;
    });
    const golsRegistrados = scopedEvents.filter(
      (evento) => normalizeToken(evento.tipo) === "gol" && !evento.golContra
    ).length;
    const assistencias = scopedEvents.filter(
      (evento) => normalizeToken(evento.tipo) === "gol" && evento.assistenteId
    ).length;
    const faltas = scopedEvents.filter((evento) => normalizeToken(evento.tipo) === "falta").length;
    const acoesDefensivas = scopedEvents.filter((evento) => normalizeToken(evento.tipo) === "acao_defensiva").length;
    const defesasDificeis = scopedEvents.filter((evento) => {
      const eventType = normalizeToken(evento.tipo);
      const tipoDefesa = normalizeToken(evento.tipoDefesaGoleiro);
      return eventType === "defesa_goleiro" && ["dificil", "penalti", "cara_a_cara", "reflexo"].includes(tipoDefesa);
    }).length;

    return {
      filters,
      jogadores,
      peladas,
      jogos: selectedGames,
      jogosFinalizados: finalizedGames,
      escalacoes,
      eventos: scopedEvents,
      playerById,
      gameById,
      peladaById,
      playersStats,
      summary: {
        totalJogadores: filteredPlayers.length,
        totalPeladas: filters.peladaId ? (peladaById.has(filters.peladaId) ? 1 : 0) : peladas.length,
        totalJogosFinalizados: finalizedGames.length,
        totalGols: golsRegistrados,
        totalAssistencias: assistencias,
        totalFaltas: faltas,
        totalAcoesDefensivas: acoesDefensivas,
        totalDefesasDificeis: defesasDificeis,
        mediaGolsPorJogo: safeDivide(golsRegistrados, finalizedGames.length),
      },
    };
  }

  function gameMatchesStatsFilters(jogo, peladaById, filters) {
    const pelada = peladaById.get(jogo.peladaId);
    const referenceDate = pelada?.data || jogo.inicio?.slice(0, 10) || "";

    if (filters.peladaId && jogo.peladaId !== filters.peladaId) {
      return false;
    }

    if (filters.month && !String(referenceDate).startsWith(filters.month)) {
      return false;
    }

    return true;
  }

  function peladaMatchesStatsFilters(pelada, filters) {
    if (filters.peladaId && pelada.id !== filters.peladaId) {
      return false;
    }

    if (filters.month && !String(pelada.data || "").startsWith(filters.month)) {
      return false;
    }

    return true;
  }

  function playerMatchesStatsFilters(jogador, filters) {
    if (filters.jogadorId && jogador.id !== filters.jogadorId) {
      return false;
    }

    if (filters.posicao && jogador.posicaoPrincipal !== filters.posicao) {
      return false;
    }

    return true;
  }

  async function seedDefaults() {
    const createdAt = nowIso();
    const deviceId = getDeviceId();

    const baseConfigs = {
      id: "app",
      appVersion: APP_VERSION,
      appsScriptUrl: "",
      syncIntervalMs: SYNC_INTERVAL_MS,
      regras: DEFAULT_RULES,
      updatedAt: createdAt,
      revision: 0,
    };

    const existingConfig = await getRecord("configs", "app");

    if (!existingConfig) {
      await putRecord("configs", baseConfigs);
    } else if (existingConfig.appVersion !== APP_VERSION) {
      await putRecord("configs", {
        ...baseConfigs,
        ...existingConfig,
        appVersion: APP_VERSION,
        updatedAt: createdAt,
      });
    }

    for (const perfil of DEFAULT_PERFIS) {
      if (!(await getRecord("perfis", perfil.id))) {
        await putRecord("perfis", {
          ...perfil,
          createdAt,
          updatedAt: createdAt,
          revision: 0,
        });
      }
    }

    if (!(await getRecord("usuarios", deviceId))) {
      await putRecord("usuarios", {
        id: deviceId,
        nome: "Usuário local",
        perfilId: "administrador",
        deviceId,
        status: "ativo",
        createdAt,
        updatedAt: createdAt,
        revision: 0,
      });
    }

    if (!(await getRecord("temporadas", "temporada-atual"))) {
      await putRecord("temporadas", {
        id: "temporada-atual",
        nome: "Temporada atual",
        tipo: "aberta",
        inicio: createdAt.slice(0, 10),
        fim: "",
        status: "ativa",
        createdAt,
        updatedAt: createdAt,
        revision: 0,
      });
    }
  }

  async function readCollectionCounts() {
    const entries = await Promise.all(
      STORE_SCHEMAS.map(async (schema) => [schema.name, await countRecords(schema.name)])
    );

    return Object.fromEntries(entries);
  }

  async function readDashboardStats() {
    const [jogadores, peladas, eventos, jogos, statsResult] = await Promise.all([
      readPlayersWithAttributes(),
      readPeladasSorted(),
      getAllRecords("eventos"),
      getAllRecords("jogos"),
      calcularEstatisticasJogadores({
        periodo: "all",
        peladaId: "",
        month: "",
        temporadaId: "",
        jogadorId: "",
        posicao: "",
        sortBy: "gols",
      }),
    ]);

    const jogadorPorId = new Map(jogadores.map((jogador) => [jogador.id, jogador]));
    const eventosValidos = eventos.filter((evento) => !evento.cancelado && !evento.deletedAt);
    const golsPorJogador = tally(
      eventosValidos.filter((evento) => String(evento.tipo).toLowerCase() === "gol" && !evento.golContra),
      "jogadorId"
    );
    const assistencias = tally(
      eventosValidos.filter((evento) => evento.assistenteId),
      "assistenteId"
    );

    const topScorer = topFromTally(golsPorJogador, jogadorPorId);
    const topAssists = topFromTally(assistencias, jogadorPorId);
    const latestGame = [...jogos].sort((a, b) => String(b.inicio || "").localeCompare(String(a.inicio || "")))[0];
    const highlightedPelada = getHighlightedPelada(peladas, jogos);
    const topScorerStats = topStats(statsResult.playersStats, "gols");
    const topAssistStats = topStats(statsResult.playersStats, "assistencias");
    const mvpStats = topStats(statsResult.playersStats, "mvpsPelada");
    const bestOverallStats = statsResult.playersStats
      .filter((stats) => stats.jogador)
      .sort((a, b) =>
        Number(b.jogador.overall || 0) - Number(a.jogador.overall || 0) ||
        playerDisplayName(a.jogador).localeCompare(playerDisplayName(b.jogador), "pt-BR")
      )[0] || null;
    const mostWins = topFromPlayerStats(statsResult.playersStats, "vitorias", "vitória");
    const bestRate = topFromPlayerStats(
      statsResult.playersStats.filter((stats) => stats.jogos > 0),
      "aproveitamento",
      "%"
    );

    return {
      jogadores,
      peladas,
      eventos: eventosValidos,
      jogos,
      statsResult,
      playerById: jogadorPorId,
      highlightedPelada,
      latestGame,
      highlights: {
        topScorer: topScorerStats,
        topAssists: topAssistStats,
        mvp: mvpStats,
        bestOverall: bestOverallStats,
      },
      topScorer,
      topAssists,
      mostWins,
      bestRate,
      lastGame: latestGame
        ? `${teamNameFromGame(latestGame, "A")} ${latestGame.placarA ?? 0} x ${latestGame.placarB ?? 0} ${teamNameFromGame(latestGame, "B")}`
        : "Sem dados",
    };
  }

  function tally(items, key) {
    return items.reduce((acc, item) => {
      const value = item[key];
      if (value) {
        acc.set(value, (acc.get(value) || 0) + 1);
      }
      return acc;
    }, new Map());
  }

  function getHighlightedPelada(peladas, jogos) {
    const today = new Date().toISOString().slice(0, 10);
    const activePeladaIds = new Set(
      jogos.filter((jogo) => jogo.status === "Em andamento").map((jogo) => jogo.peladaId)
    );

    return [...peladas]
      .sort((a, b) => {
        const activeDiff = Number(activePeladaIds.has(b.id)) - Number(activePeladaIds.has(a.id));
        if (activeDiff) return activeDiff;

        const openDiff = Number(b.status !== "Finalizada") - Number(a.status !== "Finalizada");
        if (openDiff) return openDiff;

        const futureA = String(a.data || "") >= today ? 1 : 0;
        const futureB = String(b.data || "") >= today ? 1 : 0;
        if (futureA !== futureB) return futureB - futureA;

        return String(b.data || b.createdAt || "").localeCompare(String(a.data || a.createdAt || ""));
      })[0] || null;
  }

  function topFromTally(tallyMap, jogadorPorId) {
    const [jogadorId, total] = [...tallyMap.entries()].sort((a, b) => b[1] - a[1])[0] || [];

    if (!jogadorId) {
      return "Sem dados";
    }

    const jogador = jogadorPorId.get(jogadorId);
    return `${jogador?.apelido || jogador?.nome || "Jogador"} (${total})`;
  }

  function topFromPlayerStats(playersStats, metric, suffix) {
    const leader = [...playersStats]
      .filter((stats) => Number(stats[metric] || 0) > 0)
      .sort((a, b) => {
        const diff = Number(b[metric] || 0) - Number(a[metric] || 0);
        if (diff) return diff;
        return playerDisplayName(a.jogador).localeCompare(playerDisplayName(b.jogador), "pt-BR");
      })[0];

    if (!leader) {
      return "Sem dados";
    }

    const value = metric === "aproveitamento" ? formatPercent(leader[metric]) : Number(leader[metric] || 0);
    const label = suffix === "%"
      ? value
      : `${value} ${suffix}${value === 1 ? "" : "s"}`;

    return `${playerDisplayName(leader.jogador)} (${label})`;
  }

  function renderDashboardCards(stats) {
    const oldCards = [
      ["#metric-top-scorer", stats.topScorer],
      ["#metric-top-assists", stats.topAssists],
      ["#metric-most-wins", stats.mostWins],
      ["#metric-best-rate", stats.bestRate],
      ["#metric-last-game", stats.lastGame],
    ];

    oldCards.forEach(([selector, value]) => {
      const element = $(selector);
      if (element) {
        element.textContent = value;
      }
    });

    if (state.currentSection === "inicio" && $("#home-content")) {
      $("#home-content").innerHTML = renderPremiumHome(stats);
    }
  }

  function renderPremiumHome(stats) {
    return `
      <div class="home-premium">
        ${renderFeaturedPeladaCard(stats)}
        ${renderWeeklyHighlights(stats)}
        ${renderLastMatchHomeCard(stats)}
        ${renderRankingGeneralHomeCard()}
      </div>
    `;
  }

  function renderFeaturedPeladaCard(stats) {
    const pelada = stats.highlightedPelada;

    if (!pelada) {
      return `
        <section class="featured-match-card is-empty">
          <span class="feature-badge">Pelada em destaque</span>
          <h2 id="home-title">Nenhuma pelada criada ainda</h2>
          <p>Crie a primeira pelada para acompanhar jogos, escalações e rankings.</p>
          <button class="primary-button home-primary-action" type="button" data-home-section="peladas">Criar pelada</button>
        </section>
      `;
    }

    const games = stats.jogos.filter((jogo) => jogo.peladaId === pelada.id);
    const activeGame = games.find((jogo) => jogo.status === "Em andamento");
    const horario = [pelada.horarioInicio, pelada.horarioFim].filter(Boolean).join(" - ") || "Horário aberto";
    const confirmados = getPeladaConfirmedCount(pelada, games);

    return `
      <section class="featured-match-card">
        <div class="featured-card-glow" aria-hidden="true"></div>
        <div class="featured-card-content">
          <span class="feature-badge">${activeGame ? "Pelada ao vivo" : "Pelada em destaque"}</span>
          <h2 id="home-title">${escapeHtml(pelada.local || "Pelada")}</h2>
          <div class="featured-meta">
            <span>Local: ${escapeHtml(pelada.endereco || pelada.local || "-")}</span>
            <span>Data: ${escapeHtml(formatDateLabel(pelada.data))}</span>
            <span>Horário: ${escapeHtml(horario)}</span>
            <span>${escapeHtml(confirmados ? `+${confirmados} confirmados` : `${games.length} jogo${games.length === 1 ? "" : "s"}`)}</span>
          </div>
          <button class="primary-button home-primary-action" type="button" data-home-action="open-pelada" data-pelada-id="${escapeHtml(pelada.id)}">
            Abrir pelada
          </button>
        </div>
        <div class="featured-shield" aria-hidden="true">
          <img src="assets/icons/icon.svg" alt="" />
        </div>
      </section>
    `;
  }

  function getPeladaConfirmedCount(pelada, games) {
    if (Number.isFinite(Number(pelada.confirmados))) {
      return Number(pelada.confirmados);
    }

    const uniquePlayers = new Set();
    games.forEach((jogo) => {
      [...(jogo.timeA?.jogadores || []), ...(jogo.timeB?.jogadores || [])].forEach((id) => uniquePlayers.add(id));
    });

    return uniquePlayers.size;
  }

  function renderWeeklyHighlights(stats) {
    const cards = [
      ["Artilheiro", stats.highlights.topScorer, "gols", "gols"],
      ["Garçom", stats.highlights.topAssists, "assistencias", "assistências"],
      ["MVP", stats.highlights.mvp, "mvpsPelada", "MVPs"],
      ["Melhor Overall", stats.highlights.bestOverall, "overall", "OVR"],
    ];

    return `
      <section class="home-section-block">
        <div class="home-section-heading">
          <h3>Destaques da semana</h3>
          <button type="button" data-home-section="ranking">Ver todos</button>
        </div>
        <div class="home-highlight-grid">
          ${cards.map(([title, entry, metric, suffix]) => renderHomeHighlightCard(title, entry, metric, suffix)).join("")}
        </div>
      </section>
    `;
  }

  function renderHomeHighlightCard(title, entry, metric, suffix) {
    if (!entry?.jogador) {
      return `
        <article class="home-highlight-card is-empty">
          <span>${escapeHtml(title)}</span>
          <strong>Sem dados</strong>
          <small>Jogue partidas para atualizar</small>
        </article>
      `;
    }

    const value = metric === "overall"
      ? Number(entry.jogador.overall || 0)
      : Number(entry[metric] || 0);
    const valueLabel = metric === "overall"
      ? `${value} ${suffix}`
      : `${value} ${suffix}`;

    return `
      <button class="home-highlight-card" type="button" data-home-action="player-profile" data-player-id="${escapeHtml(entry.jogadorId)}">
        <span>${escapeHtml(title)}</span>
        ${renderPlayerAvatar(entry.jogador, "player-avatar home-avatar")}
        <strong>${escapeHtml(playerDisplayName(entry.jogador))}</strong>
        <small>${escapeHtml(valueLabel)}</small>
      </button>
    `;
  }

  function renderLastMatchHomeCard(stats) {
    const jogo = stats.latestGame;

    if (!jogo) {
      return `
        <section class="home-section-block">
          <div class="home-section-heading">
            <h3>Última partida</h3>
          </div>
          <article class="last-match-card is-empty">
            <p>Nenhuma partida registrada ainda.</p>
          </article>
        </section>
      `;
    }

    const pelada = stats.peladas.find((item) => item.id === jogo.peladaId);
    const gameEvents = stats.eventos.filter((evento) => evento.jogoId === jogo.id);
    const goals = gameEvents.filter((evento) => normalizeToken(evento.tipo) === "gol");

    return `
      <section class="home-section-block">
        <div class="home-section-heading">
          <h3>Última partida</h3>
          <button type="button" data-home-action="open-game-summary" data-pelada-id="${escapeHtml(jogo.peladaId)}" data-game-id="${escapeHtml(jogo.id)}">Ver resumo</button>
        </div>
        <article class="last-match-card">
          <div class="last-match-score">
            <span>${escapeHtml(teamNameFromGame(jogo, "A"))}</span>
            <strong>${escapeHtml(jogo.placarA ?? 0)} x ${escapeHtml(jogo.placarB ?? 0)}</strong>
            <span>${escapeHtml(teamNameFromGame(jogo, "B"))}</span>
          </div>
          <small>${escapeHtml(formatDateLabel(pelada?.data || jogo.inicio?.slice(0, 10) || ""))} ${jogo.inicio ? `- ${escapeHtml(jogo.inicio.slice(11, 16))}` : ""}</small>
          ${renderHomeGoalAuthors(goals, stats.playerById)}
        </article>
      </section>
    `;
  }

  function renderHomeGoalAuthors(goals, playerById) {
    if (!goals.length) {
      return `<p class="last-match-goals">Gols: nenhum</p>`;
    }

    return `
      <div class="last-match-goals">
        ${goals
          .slice(0, 4)
          .map((evento) => {
            const author = playerNameFromMap(playerById, evento.jogadorId);
            const minute = evento.minuto ? `${evento.minuto}'` : "";
            const label = evento.golContra ? `Gol contra de ${author}` : `${minute} ${author}`;
            return `<span>${escapeHtml(label.trim())}</span>`;
          })
          .join("")}
      </div>
    `;
  }

  function renderRankingGeneralHomeCard() {
    return `
      <button class="ranking-general-card" type="button" data-home-section="ranking">
        <span class="ranking-visual" aria-hidden="true"></span>
        <span>
          <strong>Ranking Geral</strong>
          <small>Acompanhe os melhores jogadores da temporada</small>
        </span>
        <em>Top 100</em>
      </button>
    `;
  }

  async function renderCurrentSection() {
    if (state.currentSection !== "ao-vivo") {
      stopLiveTimer();
      closeLiveModal();
    }

    const counts = await readCollectionCounts();
    const syncQueue = await getAllRecords("syncQueue");
    const pending = syncQueue.filter((item) => item.status !== "sincronizado").length;
    const isHome = state.currentSection === "inicio";
    document.body.dataset.section = state.currentSection;
    document.body.classList.toggle("is-internal", !isHome);
    $(".workspace-panel")?.classList.toggle("is-home", isHome);
    const backHome = $("#back-home");
    if (backHome) {
      backHome.hidden = isHome;
    }
    $("#pending-count").textContent = `${pending} pendente${pending === 1 ? "" : "s"}`;

    const renderers = {
      inicio: renderHomeSection,
      jogadores: renderPlayersSection,
      peladas: renderPeladasSection,
      "ao-vivo": renderLiveSection,
      ranking: renderRankingSection,
      estatisticas: renderStatsSection,
      historico: renderHistorySection,
      configuracoes: renderConfigSection,
    };

    const renderer = renderers[state.currentSection] || renderHomeSection;
    await renderer(counts);
  }

  function setSectionTitle(kicker, title) {
    $("#section-kicker").textContent = kicker;
    $("#section-title").textContent = title;
  }

  function renderFields(storeName) {
    return `
      <ul class="field-list">
        ${(DATA_MODELS[storeName] || [])
          .map((field) => `<li>${escapeHtml(FIELD_LABELS[field] || field)}</li>`)
          .join("")}
      </ul>
    `;
  }

  async function renderHomeSection(counts) {
    setSectionTitle("Início", "Resumo da pelada");
    $("#section-content").innerHTML = "";
    renderDashboardCards(await readDashboardStats());
  }

  async function readPlayersWithAttributes() {
    const [jogadores, atributos] = await Promise.all([
      getAllRecords("jogadores"),
      getAllRecords("atributos"),
    ]);
    const attributesByPlayer = new Map(atributos.map((item) => [item.jogadorId, item]));

    return jogadores
      .map((jogador) => {
        const card = recalcularOverallJogador({
          ...jogador,
          attributes: {
            ...defaultAttributes(jogador.tipoJogador, jogador.posicaoPrincipal),
            ...(attributesByPlayer.get(jogador.id) || {}),
          },
        });

        return {
          ...jogador,
          overall: card.overall,
          estrelas: card.estrelas,
          attributes: card.attributes,
        };
      })
      .sort((a, b) => {
        const statusOrder = { Ativo: 0, Convidado: 1, Inativo: 2 };
        const statusDiff = (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3);

        if (statusDiff) {
          return statusDiff;
        }

        return playerDisplayName(a).localeCompare(playerDisplayName(b), "pt-BR");
      });
  }

  function renderPlayerAttributeFields(definitions, values, groupName, activeGroup) {
    const hiddenClass = groupName === activeGroup ? "" : " is-hidden";
    const disabled = groupName === activeGroup ? "" : "disabled";

    return `
      <div class="attribute-group${hiddenClass}" data-attribute-group="${groupName}">
        ${definitions
          .map(
            (attribute) => `
              <label class="attribute-field">
                <span>
                  <strong>${escapeHtml(attribute.label)}</strong>
                  <small>${escapeHtml(attribute.description)}</small>
                </span>
                <input
                  type="number"
                  name="${escapeHtml(attribute.key)}"
                  min="1"
                  max="99"
                  step="1"
                  value="${escapeHtml(values[attribute.key] || 50)}"
                  data-attribute-input
                  ${disabled}
                />
              </label>
            `
          )
          .join("")}
      </div>
    `;
  }

  function renderPlayerForm(player = null, attributesRecord = null) {
    const isEditing = Boolean(player);
    const tipoJogador = player?.tipoJogador || "Linha";
    const posicaoPrincipal = player?.posicaoPrincipal || "ST";
    const attributes = {
      ...defaultAttributes(tipoJogador, posicaoPrincipal),
      ...(attributesRecord || player?.attributes || {}),
    };
    const activeGroup = isGoalkeeper(tipoJogador, posicaoPrincipal) ? "goleiro" : "linha";
    const card = recalcularOverallJogador({ tipoJogador, posicaoPrincipal, attributes });
    const idade = Number.isFinite(Number(player?.idade)) ? player.idade : "";

    return `
      <form class="player-form" id="player-form" data-player-id="${escapeHtml(player?.id || "")}" novalidate>
        <div class="form-errors" id="player-form-errors" hidden></div>

        <section class="form-section">
          <h3>1. Dados básicos</h3>
          <div class="form-grid">
            <label class="field-label">
              <span>Nome *</span>
              <input type="text" name="nome" value="${escapeHtml(player?.nome || "")}" autocomplete="off" required />
            </label>
            <label class="field-label">
              <span>Apelido / nome da carta</span>
              <input type="text" name="apelido" value="${escapeHtml(player?.apelido || "")}" autocomplete="off" />
            </label>
            <label class="field-label">
              <span>Foto (URL)</span>
              <input type="url" name="foto" value="${escapeHtml(player?.foto || "")}" placeholder="https://..." />
            </label>
            <label class="field-label">
              <span>Idade</span>
              <input type="number" name="idade" min="1" max="120" step="1" value="${escapeHtml(idade)}" />
            </label>
          </div>
        </section>

        <section class="form-section">
          <h3>2. Informações futebolísticas</h3>
          <div class="form-grid">
            <label class="field-label">
              <span>Tipo de jogador *</span>
              <select name="tipoJogador" required>
                ${renderOptions(PLAYER_TYPES, tipoJogador, "Selecione")}
              </select>
            </label>
            <label class="field-label">
              <span>Posição principal *</span>
              <select name="posicaoPrincipal" required>
                ${renderOptions(PLAYER_POSITIONS, posicaoPrincipal, "Selecione")}
              </select>
            </label>
            <label class="field-label">
              <span>Posição secundária</span>
              <select name="posicaoSecundaria">
                ${renderOptions(PLAYER_POSITIONS, player?.posicaoSecundaria || "", "Nenhuma")}
              </select>
            </label>
            <label class="field-label">
              <span>Pé forte</span>
              <select name="peForte">
                ${renderOptions(STRONG_FEET, player?.peForte || "Direito")}
              </select>
            </label>
            <label class="field-label">
              <span>Status</span>
              <select name="status">
                ${renderOptions(PLAYER_STATUSES, player?.status || "Ativo")}
              </select>
            </label>
          </div>
        </section>

        <section class="form-section">
          <h3>3. Atributos</h3>
          <div class="attribute-help">
            <span>Use valores de 1 a 99. A ficha mostra atributos de linha ou goleiro conforme o tipo/posição.</span>
          </div>
          ${renderPlayerAttributeFields(LINE_ATTRIBUTES, attributes, "linha", activeGroup)}
          ${renderPlayerAttributeFields(GOALKEEPER_ATTRIBUTES, attributes, "goleiro", activeGroup)}
        </section>

        <section class="form-section">
          <h3>4. Resultado automático da carta</h3>
          <div class="card-result">
            <div>
              <span>Overall</span>
              <strong id="player-overall-preview">${card.overall}</strong>
            </div>
            <div>
              <span>Estrelas</span>
              <strong id="player-stars-preview">${escapeHtml(starsText(card.estrelas))}</strong>
            </div>
          </div>
        </section>

        <div class="form-actions">
          <button class="primary-button" type="submit">${isEditing ? "Salvar alterações" : "Salvar jogador"}</button>
          <button class="ghost-button" type="button" data-player-action="reset-form">${isEditing ? "Cancelar edição" : "Limpar"}</button>
        </div>
      </form>
    `;
  }

  function renderPlayerCard(player) {
    const statusClass = `status-${String(player.status || "Ativo").toLowerCase()}`;

    return `
      <article class="player-card ${player.status === "Inativo" ? "is-inactive" : ""}" data-player-id="${escapeHtml(player.id)}">
        <button class="player-card-main" type="button" data-player-action="view" data-player-id="${escapeHtml(player.id)}">
          ${renderPlayerAvatar(player)}
          <span class="player-card-info">
            <strong>${escapeHtml(playerDisplayName(player))}</strong>
            <span>${escapeHtml(player.posicaoPrincipal || "-")} - Overall ${escapeHtml(player.overall ?? "-")}</span>
            <span>${escapeHtml(starsText(player.estrelas || 1))} - Pé ${escapeHtml(player.peForte || "-")}</span>
          </span>
          <span class="player-status ${statusClass}">${escapeHtml(player.status || "Ativo")}</span>
        </button>
        <div class="player-card-actions">
          <button class="ghost-button compact-button" type="button" data-player-action="edit" data-player-id="${escapeHtml(player.id)}">Editar</button>
          ${
            player.status === "Inativo"
              ? `<button class="ghost-button compact-button" type="button" data-player-action="reactivate" data-player-id="${escapeHtml(player.id)}">Reativar</button>`
              : `<button class="danger-button compact-button" type="button" data-player-action="inactivate" data-player-id="${escapeHtml(player.id)}">Inativar</button>`
          }
        </div>
      </article>
    `;
  }

  function renderPlayerDetail(player) {
    if (!player) {
      return `
        <aside class="empty-state player-detail-empty">
          <h3>Detalhes do jogador</h3>
          <p>Clique em um card para ver dados completos, atributos e espaço reservado para estatísticas futuras.</p>
        </aside>
      `;
    }

    const activeDefinitions = getActiveAttributeDefinitions(player.tipoJogador, player.posicaoPrincipal);

    return `
      <aside class="player-detail">
        <div class="player-detail-header">
          ${renderPlayerAvatar(player, "player-avatar large")}
          <div>
            <span class="panel-kicker">${escapeHtml(player.tipoJogador || "Linha")}</span>
            <h3>${escapeHtml(playerDisplayName(player))}</h3>
            <p>${escapeHtml(player.nome || "")}</p>
          </div>
        </div>
        <div class="player-detail-score">
          <span><strong>${escapeHtml(player.overall ?? "-")}</strong> overall</span>
          <span>${escapeHtml(starsText(player.estrelas || 1))}</span>
          <span>${escapeHtml(player.posicaoPrincipal || "-")}${player.posicaoSecundaria ? ` / ${escapeHtml(player.posicaoSecundaria)}` : ""}</span>
        </div>
        <dl class="detail-list">
          <div><dt>Status</dt><dd>${escapeHtml(player.status || "-")}</dd></div>
          <div><dt>Pé forte</dt><dd>${escapeHtml(player.peForte || "-")}</dd></div>
          <div><dt>Idade</dt><dd>${escapeHtml(player.idade || "-")}</dd></div>
        </dl>
        <div class="attribute-bars">
          ${activeDefinitions
            .map((attribute) => {
              const value = normalizeAttributeValue(player.attributes?.[attribute.key]);
              return `
                <div class="attribute-bar">
                  <span>${escapeHtml(attribute.label)}</span>
                  <meter min="1" max="99" value="${value}"></meter>
                  <strong>${value}</strong>
                </div>
              `;
            })
            .join("")}
        </div>
        <div class="future-stats">
          <h3>Estatísticas futuras</h3>
          <p>Este jogador já está disponível para times, gols, assistências, faltas, MVP, bagre da rodada e rankings.</p>
        </div>
        <div class="player-card-actions">
          <button class="ghost-button compact-button" type="button" data-player-action="edit" data-player-id="${escapeHtml(player.id)}">Editar</button>
          ${
            player.status === "Inativo"
              ? `<button class="ghost-button compact-button" type="button" data-player-action="reactivate" data-player-id="${escapeHtml(player.id)}">Reativar</button>`
              : `<button class="danger-button compact-button" type="button" data-player-action="inactivate" data-player-id="${escapeHtml(player.id)}">Inativar</button>`
          }
        </div>
      </aside>
    `;
  }

  async function renderPlayersSection() {
    const jogadores = await readPlayersWithAttributes();
    const selectedPlayer =
      jogadores.find((jogador) => jogador.id === state.selectedPlayerId) || jogadores[0] || null;
    const editingPlayer = jogadores.find((jogador) => jogador.id === state.editingPlayerId) || null;

    setSectionTitle("Cadastro", "Jogadores");
    state.selectedPlayerId = selectedPlayer?.id || null;

    $("#section-content").innerHTML = `
      <div class="players-layout">
        <section class="data-card player-form-card">
          <div class="players-toolbar">
            <div>
              <h3>${editingPlayer ? "Editar jogador" : "Novo jogador"}</h3>
              <p>Cadastro local com carta calculada automaticamente.</p>
            </div>
          </div>
          ${renderPlayerForm(editingPlayer)}
        </section>

        <section class="players-list-panel">
          <div class="players-toolbar">
            <div>
              <h3>Elenco local</h3>
              <p>${jogadores.length} jogador${jogadores.length === 1 ? "" : "es"} cadastrado${jogadores.length === 1 ? "" : "s"}.</p>
            </div>
            <button class="ghost-button compact-button" type="button" data-player-action="new">Novo</button>
          </div>
          ${
            jogadores.length
              ? `<div class="player-card-grid">${jogadores.map(renderPlayerCard).join("")}</div>`
              : `
                <div class="empty-state">
                  <h3>Nenhum jogador cadastrado</h3>
                  <p>Preencha o formulário para criar o primeiro jogador e liberar a seleção futura em times e eventos.</p>
                </div>
              `
          }
          ${renderPlayerDetail(selectedPlayer)}
        </section>
      </div>
    `;

    bindPlayerSectionEvents();
    updatePlayerFormState();
  }

  function bindPlayerSectionEvents() {
    const layout = $(".players-layout");
    const form = $("#player-form");

    if (!layout || !form) {
      return;
    }

    form.addEventListener("input", () => updatePlayerFormState(form));
    form.addEventListener("change", (event) => {
      normalizePlayerTypeAndPosition(form, event.target);
      updatePlayerFormState(form);
    });
    form.addEventListener("submit", handlePlayerFormSubmit);

    layout.addEventListener("click", async (event) => {
      const actionButton = event.target.closest("[data-player-action]");

      if (!actionButton) {
        return;
      }

      const action = actionButton.dataset.playerAction;
      const playerId = actionButton.dataset.playerId;

      if (action === "view" && playerId) {
        state.selectedStatsPlayerId = playerId;
        state.editingPlayerId = null;
        await switchSection("estatisticas");
        return;
      }

      if (action === "edit" && playerId) {
        state.selectedPlayerId = playerId;
        state.editingPlayerId = playerId;
        await renderCurrentSection();
        $("#player-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }

      if (action === "inactivate" && playerId) {
        await updatePlayerStatus(playerId, "Inativo");
        return;
      }

      if (action === "reactivate" && playerId) {
        await updatePlayerStatus(playerId, "Ativo");
        return;
      }

      if (action === "reset-form" || action === "new") {
        state.editingPlayerId = null;
        await renderCurrentSection();
      }
    });
  }

  function normalizePlayerTypeAndPosition(form, changedField) {
    const typeInput = form.elements.tipoJogador;
    const positionInput = form.elements.posicaoPrincipal;

    if (!typeInput || !positionInput) {
      return;
    }

    if (changedField?.name === "tipoJogador" && typeInput.value === "Goleiro") {
      positionInput.value = "GK";
    }

    if (changedField?.name === "tipoJogador" && typeInput.value === "Linha" && positionInput.value === "GK") {
      positionInput.value = "ST";
    }

    if (changedField?.name === "posicaoPrincipal" && positionInput.value === "GK") {
      typeInput.value = "Goleiro";
    }

    if (changedField?.name === "posicaoPrincipal" && positionInput.value !== "GK" && typeInput.value === "Goleiro") {
      typeInput.value = "Linha";
    }
  }

  function collectPlayerFormData(form) {
    const tipoJogador = form.elements.tipoJogador?.value || "";
    const posicaoPrincipal = form.elements.posicaoPrincipal?.value || "";
    const rawAttributes = {};

    ALL_ATTRIBUTE_KEYS.forEach((key) => {
      rawAttributes[key] = form.elements[key]?.value;
    });

    const card = recalcularOverallJogador({
      tipoJogador,
      posicaoPrincipal,
      attributes: rawAttributes,
    });
    const idadeValue = String(form.elements.idade?.value || "").trim();

    return {
      playerId: form.dataset.playerId || "",
      player: {
        nome: String(form.elements.nome?.value || "").trim(),
        apelido: String(form.elements.apelido?.value || "").trim(),
        foto: String(form.elements.foto?.value || "").trim(),
        idade: idadeValue ? Number(idadeValue) : "",
        posicaoPrincipal,
        posicaoSecundaria: form.elements.posicaoSecundaria?.value || "",
        peForte: form.elements.peForte?.value || "Direito",
        tipoJogador,
        status: form.elements.status?.value || "Ativo",
        overall: card.overall,
        estrelas: card.estrelas,
      },
      attributes: card.attributes,
    };
  }

  function validatePlayerForm(formData) {
    const errors = [];
    const { player, attributes } = formData;
    const activeKeys = getActiveAttributeKeys(player.tipoJogador, player.posicaoPrincipal);

    if (!player.nome) {
      errors.push("Nome é obrigatório.");
    }

    if (!PLAYER_TYPES.includes(player.tipoJogador)) {
      errors.push("Tipo de jogador é obrigatório.");
    }

    if (!PLAYER_POSITIONS.includes(player.posicaoPrincipal)) {
      errors.push("Posição principal é obrigatória.");
    }

    if (player.tipoJogador === "Goleiro" && player.posicaoPrincipal !== "GK") {
      errors.push("Goleiro deve usar a posição principal GK.");
    }

    if (player.tipoJogador === "Linha" && player.posicaoPrincipal === "GK") {
      errors.push("Jogador de linha não pode usar GK como posição principal.");
    }

    if (player.idade !== "" && (!Number.isFinite(player.idade) || player.idade < 1 || player.idade > 120)) {
      errors.push("Idade deve ser um número válido.");
    }

    activeKeys.forEach((key) => {
      const value = Number(attributes[key]);

      if (!Number.isFinite(value) || value < 1 || value > 99) {
        errors.push(`${key} deve estar entre 1 e 99.`);
      }
    });

    return errors;
  }

  function showPlayerFormErrors(errors) {
    const errorsBox = $("#player-form-errors");

    if (!errorsBox) {
      return;
    }

    if (!errors.length) {
      errorsBox.hidden = true;
      errorsBox.innerHTML = "";
      return;
    }

    errorsBox.hidden = false;
    errorsBox.innerHTML = `
      <strong>Revise o cadastro:</strong>
      <ul>${errors.map((error) => `<li>${escapeHtml(error)}</li>`).join("")}</ul>
    `;
  }

  function updatePlayerFormState(form = $("#player-form")) {
    if (!form) {
      return;
    }

    const tipoJogador = form.elements.tipoJogador?.value || "Linha";
    const posicaoPrincipal = form.elements.posicaoPrincipal?.value || "ST";
    const activeGroup = isGoalkeeper(tipoJogador, posicaoPrincipal) ? "goleiro" : "linha";

    form.querySelectorAll("[data-attribute-group]").forEach((group) => {
      const isActive = group.dataset.attributeGroup === activeGroup;
      group.classList.toggle("is-hidden", !isActive);
      group.querySelectorAll("input").forEach((input) => {
        input.disabled = !isActive;
      });
    });

    const formData = collectPlayerFormData(form);
    $("#player-overall-preview").textContent = String(formData.player.overall);
    $("#player-stars-preview").textContent = starsText(formData.player.estrelas);
  }

  async function handlePlayerFormSubmit(event) {
    event.preventDefault();

    const form = event.currentTarget;
    normalizePlayerTypeAndPosition(form);
    updatePlayerFormState(form);

    const formData = collectPlayerFormData(form);
    const errors = validatePlayerForm(formData);
    showPlayerFormErrors(errors);

    if (errors.length) {
      return;
    }

    const existingPlayer = formData.playerId ? await getRecord("jogadores", formData.playerId) : null;
    const existingAttributes = formData.playerId ? await getRecord("atributos", formData.playerId) : null;
    const savedAt = nowIso();
    const jogadorId = existingPlayer?.id || uid();
    const revision = (existingPlayer?.revision || 0) + 1;
    const card = recalcularOverallJogador({
      ...formData.player,
      attributes: formData.attributes,
    });
    const jogadorRecord = {
      id: jogadorId,
      ...formData.player,
      overall: card.overall,
      estrelas: card.estrelas,
      createdAt: existingPlayer?.createdAt || savedAt,
      updatedAt: savedAt,
      revision,
    };
    const atributosRecord = {
      jogadorId,
      ...card.attributes,
      overall: card.overall,
      estrelas: card.estrelas,
      updatedAt: savedAt,
      revision: (existingAttributes?.revision || 0) + 1,
    };
    const auditRecord = createAuditRecord(
      "jogadores",
      jogadorId,
      existingPlayer ? "editar" : "criar",
      existingPlayer ? { jogador: existingPlayer, atributos: existingAttributes } : null,
      { jogador: jogadorRecord, atributos: atributosRecord }
    );

    await putRecords({
      jogadores: [jogadorRecord],
      atributos: [atributosRecord],
      syncQueue: [
        createSyncQueueRecord("jogadores", "upsert", jogadorId, jogadorRecord),
        createSyncQueueRecord("atributos", "upsert", jogadorId, atributosRecord),
      ],
      auditLog: [auditRecord],
    });

    state.selectedPlayerId = jogadorId;
    state.editingPlayerId = null;
    await refreshCurrentView();
    await syncNow();
  }

  async function updatePlayerStatus(playerId, status) {
    const existingPlayer = await getRecord("jogadores", playerId);

    if (!existingPlayer) {
      return;
    }

    const savedAt = nowIso();
    const updatedPlayer = {
      ...existingPlayer,
      status,
      updatedAt: savedAt,
      revision: (existingPlayer.revision || 0) + 1,
    };
    const action = status === "Inativo" ? "inativar" : "reativar";

    await putRecords({
      jogadores: [updatedPlayer],
      syncQueue: [createSyncQueueRecord("jogadores", "upsert", playerId, updatedPlayer)],
      auditLog: [createAuditRecord("jogadores", playerId, action, existingPlayer, updatedPlayer)],
    });

    state.selectedPlayerId = playerId;
    state.editingPlayerId = null;
    await refreshCurrentView();
    await syncNow();
  }

  async function renderPeladasSection() {
    const [peladas, jogadores, allGames] = await Promise.all([
      readPeladasSorted(),
      readActivePlayers(),
      getAllRecords("jogos"),
    ]);
    let selectedPelada = state.selectedPeladaId
      ? peladas.find((pelada) => pelada.id === state.selectedPeladaId) || null
      : null;

    if (state.selectedPeladaId && !selectedPelada) {
      state.selectedPeladaId = null;
      state.selectedGameSummaryId = null;
      window.history.replaceState(null, "", buildSectionHash("peladas"));
    }

    const gameCountByPeladaId = allGames.reduce((counts, jogo) => {
      counts.set(jogo.peladaId, (counts.get(jogo.peladaId) || 0) + 1);
      return counts;
    }, new Map());
    const gamesByPeladaId = allGames.reduce((map, jogo) => {
      const items = map.get(jogo.peladaId) || [];
      items.push(jogo);
      map.set(jogo.peladaId, items);
      return map;
    }, new Map());

    if (!selectedPelada) {
      const activeView = state.peladasView === "criar" ? "criar" : "gerenciar";
      setSectionTitle("Crie e gerencie suas peladas", "Peladas");

      $("#section-content").innerHTML = `
        <div class="peladas-screen">
          ${renderPeladasModeNav(activeView)}
          ${
            activeView === "criar"
              ? renderCreatePeladaPanel()
              : renderManagePeladasPanel(peladas, gameCountByPeladaId, gamesByPeladaId)
          }
        </div>
      `;

      bindPeladaSectionEvents();
      return;
    }

    const jogos = await readGamesForPelada(selectedPelada.id);
    const selectedGame = state.selectedGameSummaryId
      ? jogos.find((jogo) => jogo.id === state.selectedGameSummaryId) || null
      : null;

    if (state.selectedGameSummaryId && !selectedGame) {
      state.selectedGameSummaryId = null;
      window.history.replaceState(null, "", buildSectionHash("peladas", { peladaId: selectedPelada.id }));
    }

    if (selectedGame) {
      const selectedGameBundle = await readGameBundle(selectedGame.id);
      const gameNumber = getGameNumber(jogos, selectedGame.id);

      setSectionTitle("Pelada", `Resumo do Jogo ${gameNumber}`);
      $("#section-content").innerHTML = renderGameSummaryScreen(selectedPelada, selectedGameBundle, gameNumber);
      bindPeladaSectionEvents();
      return;
    }

    const [allPlayers, allEvents, allEscalacoes] = await Promise.all([
      getAllRecords("jogadores"),
      getAllRecords("eventos"),
      getAllRecords("escalacoes"),
    ]);
    const playerById = new Map(allPlayers.map((player) => [player.id, player]));
    const peladaSummary = buildPeladaClosureSummary(selectedPelada, jogos, allEvents, allEscalacoes, allPlayers);
    const gameIds = new Set(jogos.map((jogo) => jogo.id));
    const eventsByGameId = allEvents
      .filter((evento) => gameIds.has(evento.jogoId) && !evento.cancelado)
      .sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")))
      .reduce((map, evento) => {
        const items = map.get(evento.jogoId) || [];
        items.push(evento);
        map.set(evento.jogoId, items);
        return map;
      }, new Map());

    setSectionTitle("Pelada", selectedPelada.local || "Detalhes da pelada");
    state.selectedGameSummaryId = null;

    $("#section-content").innerHTML = `
      <div class="pelada-detail-flow">
        ${renderPeladaOpenToolbar(selectedPelada, peladaSummary)}
        ${renderGameSetup(selectedPelada, jogadores)}
        ${renderGameHistory(selectedPelada, jogos, eventsByGameId, playerById, peladaSummary)}
      </div>
    `;

    bindPeladaSectionEvents();
  }

  function renderPeladasModeNav(activeView) {
    return `
      <div class="peladas-mode-nav" role="tablist" aria-label="Navegação de peladas">
        <button
          class="peladas-mode-button ${activeView === "criar" ? "active" : ""}"
          type="button"
          role="tab"
          aria-selected="${activeView === "criar"}"
          data-pelada-action="show-create"
        >
          Criar pelada
        </button>
        <button
          class="peladas-mode-button ${activeView === "gerenciar" ? "active" : ""}"
          type="button"
          role="tab"
          aria-selected="${activeView === "gerenciar"}"
          data-pelada-action="show-manage"
        >
          Gerenciar
        </button>
      </div>
    `;
  }

  function renderCreatePeladaPanel() {
    return `
      <section class="data-card pelada-form-card">
        <div class="players-toolbar">
          <div>
            <h3>Criar Pelada</h3>
            <p>Cadastre uma nova rodada para depois montar os jogos.</p>
          </div>
        </div>
        ${renderPeladaForm()}
      </section>
    `;
  }

  function renderManagePeladasPanel(peladas, gameCountByPeladaId, gamesByPeladaId) {
    const featuredPelada = peladas[0] || null;

    return `
      <section class="pelada-workspace peladas-manage-shell">
        ${
          featuredPelada
            ? `
              ${renderPeladaHighlightCard(
                featuredPelada,
                gameCountByPeladaId.get(featuredPelada.id) || 0,
                gamesByPeladaId.get(featuredPelada.id) || []
              )}
              <div class="peladas-created-heading">
                <h3>Peladas criadas</h3>
                <span>${peladas.length} salva${peladas.length === 1 ? "" : "s"}</span>
              </div>
              <div class="pelada-card-grid">${peladas
                .map((pelada) =>
                  renderPeladaCard(
                    pelada,
                    gameCountByPeladaId.get(pelada.id) || 0,
                    gamesByPeladaId.get(pelada.id) || []
                  )
                )
                .join("")}</div>
              <button class="peladas-new-floating" type="button" data-pelada-action="show-create">
                <span aria-hidden="true">+</span>
                Nova pelada
              </button>
            `
            : `
              <div class="empty-state">
                <h3>Nenhuma pelada criada</h3>
                <p>Crie a primeira pelada. Depois, abra o card dela para montar times e iniciar jogos.</p>
              </div>
            `
        }
      </section>
    `;
  }

  function renderPeladaForm() {
    return `
      <form class="pelada-form" id="pelada-form" novalidate>
        <div class="form-errors" id="pelada-form-errors" hidden></div>
        <div class="form-grid">
          <label class="field-label">
            <span>Data *</span>
            <input type="date" name="data" required />
          </label>
          <label class="field-label">
            <span>Local *</span>
            <input type="text" name="local" autocomplete="off" required />
          </label>
          <label class="field-label wide-field">
            <span>Endereço</span>
            <input type="text" name="endereco" autocomplete="off" />
          </label>
          <label class="field-label">
            <span>Horário de início</span>
            <input type="time" name="horarioInicio" />
          </label>
          <label class="field-label">
            <span>Horário de fim</span>
            <input type="time" name="horarioFim" />
          </label>
          <label class="field-label">
            <span>Valor do aluguel</span>
            <input type="number" name="valor" min="0" step="0.01" placeholder="0,00" />
          </label>
          <label class="field-label wide-field">
            <span>Observações</span>
            <textarea name="observacoes" rows="3"></textarea>
          </label>
        </div>
        <div class="form-actions">
          <button class="primary-button" type="submit">Salvar pelada</button>
          <button class="ghost-button" type="reset">Limpar</button>
        </div>
      </form>
    `;
  }

  function getPeladaStatusLabel(pelada, jogos = []) {
    if (pelada?.status) {
      return pelada.status;
    }

    if (jogos.some((jogo) => jogo.status === "Em andamento")) {
      return "Em andamento";
    }

    return "Aberta";
  }

  function getPeladaDateParts(value) {
    const months = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
    const [year, month, day] = String(value || "").split("-");

    if (!year || !month || !day) {
      return { day: "--", month: "---" };
    }

    return {
      day,
      month: months[Number(month) - 1] || month,
    };
  }

  function getPeladaHorarioLabel(pelada) {
    return [pelada?.horarioInicio, pelada?.horarioFim].filter(Boolean).join(" - ") || "Horário aberto";
  }

  function getPeladaGameCountLabel(gameCount) {
    return `${gameCount} jogo${gameCount === 1 ? "" : "s"} criado${gameCount === 1 ? "" : "s"}`;
  }

  function renderPeladaDateTile(pelada, extraClass = "") {
    const dateParts = getPeladaDateParts(pelada?.data);

    return `
      <span class="pelada-date ${extraClass}">
        <strong>${escapeHtml(dateParts.day)}</strong>
        <small>${escapeHtml(dateParts.month)}</small>
      </span>
    `;
  }

  function renderPeladaStatusBadge(status) {
    const statusClass = normalizeToken(status);

    return `<span class="pelada-status-badge status-${escapeHtml(statusClass)}"><i></i>${escapeHtml(status)}</span>`;
  }

  function renderPeladaMetaRow(pelada, gameCount, includeGames = true) {
    return `
      <span class="pelada-meta-row">
        <small>${escapeHtml(getPeladaHorarioLabel(pelada))}</small>
        <small>${escapeHtml(formatCurrency(pelada?.valor))}</small>
        ${includeGames ? `<small>${escapeHtml(getPeladaGameCountLabel(gameCount))}</small>` : ""}
      </span>
    `;
  }

  function renderPeladaHighlightCard(pelada, gameCount = 0, jogos = []) {
    const status = getPeladaStatusLabel(pelada, jogos);

    return `
      <button class="peladas-featured-card" type="button" data-pelada-action="open-pelada" data-pelada-id="${escapeHtml(pelada.id)}">
        <span class="peladas-featured-top">
          <span class="peladas-featured-kicker">Próxima pelada</span>
          ${renderPeladaStatusBadge(status)}
        </span>
        <span class="peladas-featured-main">
          ${renderPeladaDateTile(pelada, "is-featured")}
          <span class="pelada-card-info">
            <strong>${escapeHtml(pelada.local || "Pelada")}</strong>
            ${pelada.endereco ? `<small>${escapeHtml(pelada.endereco)}</small>` : `<small>Local não informado</small>`}
          </span>
        </span>
        ${renderPeladaMetaRow(pelada, gameCount)}
        <span class="peladas-featured-cta">Abrir pelada <b aria-hidden="true">&rsaquo;</b></span>
      </button>
    `;
  }

  function renderPeladaCard(pelada, gameCount = 0, jogos = []) {
    const status = getPeladaStatusLabel(pelada, jogos);

    return `
      <article class="pelada-card">
        <button class="pelada-card-main" type="button" data-pelada-action="open-pelada" data-pelada-id="${escapeHtml(pelada.id)}">
          ${renderPeladaDateTile(pelada)}
          <span class="pelada-card-info">
            <strong>${escapeHtml(pelada.local || "Pelada")}</strong>
            ${pelada.endereco ? `<small>${escapeHtml(pelada.endereco)}</small>` : `<small>Local não informado</small>`}
          </span>
          ${renderPeladaMetaRow(pelada, gameCount, false)}
          ${renderPeladaStatusBadge(status)}
          <span class="pelada-open-cta">Ver detalhes <b aria-hidden="true">&rsaquo;</b></span>
        </button>
      </article>
    `;
  }

  function renderPeladaOpenToolbar(pelada, peladaSummary = null) {
    const horario = [pelada.horarioInicio, pelada.horarioFim].filter(Boolean).join(" - ") || "Horário aberto";
    const status = getPeladaStatusLabel(pelada, peladaSummary?.jogos || []);
    const canFinalize = Boolean(peladaSummary?.canFinalize);
    const finishTitle = peladaSummary?.finishDisabledReason || "Encerrar a pelada e escolher MVP/Bagre.";

    return `
      <div class="pelada-open-toolbar">
        <h3>${escapeHtml(pelada.local || "Pelada")}</h3>
        <div class="pelada-open-actions">
          <button class="ghost-button compact-button" type="button" data-pelada-action="back-list">Voltar para Peladas</button>
          <button
            class="primary-button compact-button"
            type="button"
            data-pelada-action="finish-pelada"
            ${canFinalize ? "" : "disabled"}
            title="${escapeHtml(finishTitle)}"
          >
            Finalizar Pelada
          </button>
          <details class="pelada-details-disclosure">
            <summary>Detalhes da Pelada</summary>
            <div class="pelada-details-mini">
              <span><strong>Data</strong>${escapeHtml(formatDateLabel(pelada.data))}</span>
              <span><strong>Local</strong>${escapeHtml(pelada.local || "-")}</span>
              <span><strong>Endereço</strong>${escapeHtml(pelada.endereco || "-")}</span>
              <span><strong>Horário</strong>${escapeHtml(horario)}</span>
              <span><strong>Valor</strong>${escapeHtml(formatCurrency(pelada.valor))}</span>
              <span><strong>Status</strong>${escapeHtml(status)}</span>
              <span class="wide"><strong>Observações</strong>${escapeHtml(pelada.observacoes || "-")}</span>
            </div>
          </details>
        </div>
      </div>
    `;
  }

  function renderGameSetup(pelada, jogadores) {
    const draft = normalizeGameDraft(jogadores);

    if (pelada.status === "Finalizada") {
      return `
        <section class="data-card game-setup-card">
          <div class="empty-state compact-empty">
            <h3>Pelada finalizada</h3>
            <p>Esta pelada já foi encerrada com MVP e Bagre. O histórico de jogos continua disponível abaixo.</p>
          </div>
        </section>
      `;
    }

    return `
      <section class="data-card game-setup-card">
        <div class="players-toolbar">
          <div>
            <h3>Criar Jogo</h3>
            <p>Monte cada time com botões de escalação e goleiro. Um jogador só pode estar em um lado.</p>
          </div>
        </div>
        <form class="game-form" id="game-form" novalidate>
          <div class="form-errors" id="game-form-errors" hidden></div>
          <div class="team-config-grid">
            <fieldset class="team-config" style="--team-color: #ff5a00;">
              <legend>Time A</legend>
              <label class="field-label">
                <span>Nome</span>
                <input type="text" name="timeANome" value="${escapeHtml(draft.A.nome)}" />
              </label>
              <label class="field-label">
                <span>Cor</span>
                <input type="color" name="timeACor" value="${escapeHtml(draft.A.cor)}" />
              </label>
              <div class="team-selection-actions">
                <button class="ghost-button compact-button" type="button" data-pelada-action="open-lineup" data-team="A">Escalação</button>
                <button class="ghost-button compact-button" type="button" data-pelada-action="open-goalkeeper" data-team="A">Goleiro</button>
              </div>
              ${renderTeamSelectionSummary("A", jogadores)}
            </fieldset>
            <fieldset class="team-config" style="--team-color: #4aa3df;">
              <legend>Time B</legend>
              <label class="field-label">
                <span>Nome</span>
                <input type="text" name="timeBNome" value="${escapeHtml(draft.B.nome)}" />
              </label>
              <label class="field-label">
                <span>Cor</span>
                <input type="color" name="timeBCor" value="${escapeHtml(draft.B.cor)}" />
              </label>
              <div class="team-selection-actions">
                <button class="ghost-button compact-button" type="button" data-pelada-action="open-lineup" data-team="B">Escalação</button>
                <button class="ghost-button compact-button" type="button" data-pelada-action="open-goalkeeper" data-team="B">Goleiro</button>
              </div>
              ${renderTeamSelectionSummary("B", jogadores)}
            </fieldset>
          </div>

          ${renderSelectionAvailability(jogadores)}

          <div class="form-actions">
            <button class="primary-button big-touch" type="submit">Iniciar Jogo</button>
          </div>
        </form>
      </section>
    `;
  }

  function renderSelectionAvailability(jogadores) {
    if (!jogadores.length) {
      return `
        <div class="empty-state">
          <h3>Nenhum jogador ativo</h3>
          <p>Cadastre jogadores ativos na aba Jogadores para montar os times.</p>
        </div>
      `;
    }

    return `
      <div class="selection-help">
        <strong>${escapeHtml(jogadores.length)}</strong>
        jogador${jogadores.length === 1 ? "" : "es"} ativo${jogadores.length === 1 ? "" : "s"} ou convidado${jogadores.length === 1 ? "" : "s"} ${jogadores.length === 1 ? "disponível" : "disponíveis"} para seleção.
      </div>
    `;
  }

  function renderTeamSelectionSummary(teamKey, jogadores) {
    const linePlayers = getDraftPlayers(teamKey, jogadores, "linha");
    const goalkeeper = getDraftPlayers(teamKey, jogadores, "goleiro")[0] || null;

    return `
      <div class="team-selection-summary">
        <span>
          <strong>Goleiro:</strong>
          ${goalkeeper ? escapeHtml(playerDisplayName(goalkeeper)) : "Nenhum jogador selecionado"}
        </span>
        <span>
          <strong>Linha:</strong>
          ${linePlayers.length ? escapeHtml(linePlayers.map(playerDisplayName).join(", ")) : "Nenhum jogador selecionado"}
        </span>
      </div>
    `;
  }

  function getSelectionBlockReason(player, teamKey, selectionType) {
    const draft = state.gameDraft;
    const otherTeam = oppositeTeam(teamKey);

    if (draft[otherTeam].linha.includes(player.id)) {
      return `Já está na escalação do Time ${otherTeam}.`;
    }

    if (draft[otherTeam].goleiro === player.id) {
      return `Já é goleiro do Time ${otherTeam}.`;
    }

    if (selectionType === "linha" && draft[teamKey].goleiro === player.id) {
      return "Já foi escolhido como goleiro deste time.";
    }

    if (selectionType === "goleiro" && draft[teamKey].linha.includes(player.id)) {
      return "Já está na linha deste time.";
    }

    return "";
  }

  function renderTeamSelectionModal(teamKey, selectionType, jogadores) {
    const isGoalkeeperSelection = selectionType === "goleiro";
    const candidates = jogadores.filter(isGoalkeeperSelection ? isGoalkeeperCandidate : isLineupPlayer);
    const selectedLine = new Set(state.gameDraft[teamKey].linha);
    const selectedGoalkeeper = state.gameDraft[teamKey].goleiro;

    return `
      <form class="team-selection-form" id="team-selection-form" data-team="${escapeHtml(teamKey)}" data-selection-type="${escapeHtml(selectionType)}" novalidate>
        <div class="selection-search">
          <label class="field-label">
            <span>Pesquisar jogador</span>
            <input type="search" name="search" placeholder="Digite o nome..." autocomplete="off" />
          </label>
        </div>
        <div class="player-selection-list">
          ${
            isGoalkeeperSelection
              ? `
                <label class="player-selection-option">
                  <input type="radio" name="goalkeeperId" value="" ${selectedGoalkeeper ? "" : "checked"} />
                  <span>
                    <strong>Sem goleiro definido</strong>
                    <small>Goleiro opcional nesta etapa.</small>
                  </span>
                </label>
              `
              : ""
          }
          ${
            candidates.length
              ? candidates
                  .map((player) => {
                    const blockReason = getSelectionBlockReason(player, teamKey, selectionType);
                    const checked = isGoalkeeperSelection
                      ? selectedGoalkeeper === player.id
                      : selectedLine.has(player.id);
                    const inputType = isGoalkeeperSelection ? "radio" : "checkbox";
                    const inputName = isGoalkeeperSelection ? "goalkeeperId" : "playerIds";

                    return `
                      <label class="player-selection-option ${blockReason ? "is-disabled" : ""}" data-player-name="${escapeHtml(normalizeToken(playerDisplayName(player)))}">
                        <input
                          type="${inputType}"
                          name="${inputName}"
                          value="${escapeHtml(player.id)}"
                          ${checked ? "checked" : ""}
                          ${blockReason ? "disabled" : ""}
                        />
                        ${renderPlayerAvatar(player, "player-avatar small")}
                        <span>
                          <strong>${escapeHtml(playerDisplayName(player))}</strong>
                          <small>${escapeHtml(player.posicaoPrincipal || "-")} - ${escapeHtml(player.overall || "-")} OVR${blockReason ? ` - ${blockReason}` : ""}</small>
                        </span>
                      </label>
                    `;
                  })
                  .join("")
              : `
                <div class="empty-state compact-empty">
                  <p>${isGoalkeeperSelection ? "Nenhum goleiro ativo ou convidado encontrado." : "Nenhum jogador de linha ativo ou convidado encontrado."}</p>
                </div>
              `
          }
        </div>
        <div class="form-actions">
          <button class="primary-button big-touch" type="submit">Salvar seleção</button>
          <button class="ghost-button big-touch" type="button" data-modal-close>Cancelar</button>
        </div>
      </form>
    `;
  }

  async function openTeamSelectionModal(teamKey, selectionType) {
    syncGameDraftFromForm();
    const jogadores = await readActivePlayers();
    normalizeGameDraft(jogadores);

    const modal = openLiveModal(
      selectionType === "goleiro" ? `Goleiro - Time ${teamKey}` : `Escalação - Time ${teamKey}`,
      renderTeamSelectionModal(teamKey, selectionType, jogadores)
    );
    const form = modal.querySelector("#team-selection-form");
    const searchInput = form.elements.search;

    searchInput?.addEventListener("input", () => {
      const token = normalizeToken(searchInput.value);
      form.querySelectorAll(".player-selection-option[data-player-name]").forEach((option) => {
        option.hidden = token ? !option.dataset.playerName.includes(token) : false;
      });
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (selectionType === "goleiro") {
        state.gameDraft[teamKey].goleiro = form.elements.goalkeeperId?.value || "";
      } else {
        state.gameDraft[teamKey].linha = Array.from(form.querySelectorAll('input[name="playerIds"]:checked'))
          .filter((input) => !input.disabled)
          .map((input) => input.value);
      }

      normalizeGameDraft(jogadores);
      closeLiveModal();
      await renderCurrentSection();
    });
  }

  function getGameNumber(jogos, jogoId) {
    const index = jogos.findIndex((jogo) => jogo.id === jogoId);
    return index >= 0 ? index + 1 : 1;
  }

  function getEventTeamKey(evento, jogo) {
    if (evento.time === "A" || evento.time === "B") {
      return evento.time;
    }

    if (evento.timeId && evento.timeId === jogo?.timeA?.id) {
      return "A";
    }

    if (evento.timeId && evento.timeId === jogo?.timeB?.id) {
      return "B";
    }

    return "";
  }

  function formatGameEnding(jogo) {
    if (!jogo.formaEncerramento) {
      return "";
    }

    return ` - encerramento por ${jogo.formaEncerramento}`;
  }

  function formatGoalSummaryItem(evento, jogo, playerById) {
    const author = playerNameFromMap(playerById, evento.jogadorId);
    const teamKey = getEventTeamKey(evento, jogo);
    const teamName = teamKey ? teamNameFromGame(jogo, teamKey) : "time beneficiado";

    if (evento.golContra) {
      return `Gol contra de ${author} para o ${teamName}`;
    }

    return author;
  }

  function renderGameGoalsSummary(jogo, events = [], playerById = new Map()) {
    const goals = events.filter((evento) => normalizeEventType(evento.tipo) === "gol");

    if (!goals.length) {
      return `<p class="game-goals-summary"><strong>Gols:</strong> nenhum</p>`;
    }

    const teamKeys = ["A", "B"].filter((teamKey) =>
      goals.some((evento) => getEventTeamKey(evento, jogo) === teamKey)
    );

    if (teamKeys.length <= 1) {
      return `
        <p class="game-goals-summary">
          <strong>Gols:</strong>
          ${goals.map((evento) => escapeHtml(formatGoalSummaryItem(evento, jogo, playerById))).join(", ")}
        </p>
      `;
    }

    return `
      <div class="game-goals-summary">
        <strong>Gols:</strong>
        ${teamKeys
          .map((teamKey) => {
            const teamGoals = goals
              .filter((evento) => getEventTeamKey(evento, jogo) === teamKey)
              .map((evento) => formatGoalSummaryItem(evento, jogo, playerById));

            return `<span>${escapeHtml(teamNameFromGame(jogo, teamKey))}: ${escapeHtml(teamGoals.join(", ") || "nenhum")}</span>`;
          })
          .join("")}
      </div>
    `;
  }

  function renderGameSummaryScreen(pelada, bundle, gameNumber) {
    if (!bundle) {
      return `
        <div class="empty-state">
          <h3>Jogo não encontrado</h3>
          <p>Volte para a pelada e abra o jogo novamente.</p>
          <button class="ghost-button" type="button" data-pelada-action="close-summary">Voltar para a pelada</button>
        </div>
      `;
    }

    return `
      <div class="pelada-detail-flow">
        <section class="data-card game-summary-nav">
          <div>
            <span class="panel-kicker">${escapeHtml(formatDateLabel(pelada.data))}</span>
            <h3>Resumo do Jogo ${escapeHtml(gameNumber)}</h3>
          </div>
          <button class="ghost-button compact-button" type="button" data-pelada-action="close-summary">Voltar para a pelada</button>
        </section>
        ${renderGameSummary(bundle, pelada, gameNumber)}
      </div>
    `;
  }

  function renderPeladaLeaderText(stats, metric, emptyText = "Sem dados") {
    if (!stats || Number(stats[metric] || 0) <= 0) {
      return emptyText;
    }

    return `${playerDisplayName(stats.jogador)} - ${metricLabel(metric, stats[metric], stats)}`;
  }

  function renderPeladaAwardWinner(summary, awardType) {
    const evento = summary.awards?.[awardType];

    if (!evento?.jogadorId) {
      return "Ainda não escolhido";
    }

    return playerDisplayName(summary.playerById.get(evento.jogadorId) || { nome: "Jogador" });
  }

  function renderPeladaHistoryOverview(summary) {
    const status = getPeladaStatusLabel(summary.pelada, summary.jogos);

    return `
      <div class="pelada-history-overview">
        <div class="pelada-award-strip">
          <span><strong>Status</strong>${escapeHtml(status)}</span>
          <span><strong>MVP escolhido</strong>${escapeHtml(renderPeladaAwardWinner(summary, "mvp"))}</span>
          <span><strong>Bagre escolhido</strong>${escapeHtml(renderPeladaAwardWinner(summary, "bagre"))}</span>
        </div>
        <div class="event-summary-grid">
          <span><strong>${escapeHtml(summary.totals.jogosRealizados)}</strong> jogos realizados</span>
          <span><strong>${escapeHtml(summary.totals.gols)}</strong> gols</span>
          <span><strong>${escapeHtml(summary.totals.assistencias)}</strong> assistências</span>
          <span><strong>${escapeHtml(summary.totals.faltas)}</strong> faltas</span>
          <span><strong>${escapeHtml(summary.totals.acoesDefensivas)}</strong> ações defensivas</span>
          <span><strong>${escapeHtml(summary.totals.defesasDificeis)}</strong> defesas difíceis</span>
        </div>
        <div class="pelada-leaders-list">
          <span><strong>Artilheiro</strong>${escapeHtml(renderPeladaLeaderText(summary.leaders.artilheiro, "gols"))}</span>
          <span><strong>Garçom</strong>${escapeHtml(renderPeladaLeaderText(summary.leaders.assistencias, "assistencias"))}</span>
          <span><strong>Maior G/A</strong>${escapeHtml(renderPeladaLeaderText(summary.leaders.participacoesGol, "participacoesGol"))}</span>
          <span><strong>Mais vitórias</strong>${escapeHtml(renderPeladaLeaderText(summary.leaders.vitorias, "vitorias"))}</span>
          <span><strong>Goleiro destaque</strong>${escapeHtml(renderPeladaLeaderText(summary.leaders.goleiroDefesas, "defesasDificeis"))}</span>
        </div>
      </div>
    `;
  }

  function renderPeladaSuggestionCard(title, stats, scoreKey, scoreLabel) {
    if (!stats) {
      return `
        <article class="pelada-suggestion-card">
          <span class="metric-label">${escapeHtml(title)}</span>
          <strong>Sem sugestão</strong>
        </article>
      `;
    }

    return `
      <article class="pelada-suggestion-card">
        <span class="metric-label">${escapeHtml(title)}</span>
        <strong>${escapeHtml(playerDisplayName(stats.jogador))}</strong>
        <small>${escapeHtml(stats.jogador.posicaoPrincipal || "-")} - ${escapeHtml(stats.jogador.overall || "-")} OVR</small>
        <em>${escapeHtml(scoreLabel)}: ${escapeHtml(formatScoreNumber(stats[scoreKey]))}</em>
      </article>
    `;
  }

  function renderAwardPlayerOptions(summary, suggestedId = "", scoreKey = "pontuacao") {
    const candidates = summary.playerScores
      .filter((stats) => stats.jogador && (stats.jogos > 0 || stats.eventos > 0))
      .sort((a, b) => playerDisplayName(a.jogador).localeCompare(playerDisplayName(b.jogador), "pt-BR"));

    if (!candidates.length) {
      return `<option value="">Sem jogadores elegíveis</option>`;
    }

    return `
      <option value="">Escolha manualmente</option>
      ${candidates
        .map((stats) => {
          const suggestion = stats.jogadorId === suggestedId ? " (sugestão)" : "";
          return `
            <option value="${escapeHtml(stats.jogadorId)}">
              ${escapeHtml(playerDisplayName(stats.jogador))} - ${escapeHtml(stats.jogador.posicaoPrincipal || "-")} - ${escapeHtml(formatScoreNumber(stats[scoreKey]))}${escapeHtml(suggestion)}
            </option>
          `;
        })
        .join("")}
    `;
  }

  function renderPeladaFinishModal(summary) {
    const canChoose = summary.playerScores.some((stats) => stats.jogador && (stats.jogos > 0 || stats.eventos > 0));

    return `
      <form class="event-form finish-pelada-form" id="finish-pelada-form" data-pelada-id="${escapeHtml(summary.pelada.id)}" novalidate>
        <div class="form-errors" id="finish-pelada-errors" hidden></div>

        <section class="pelada-finish-block">
          <h3>Resumo geral da pelada</h3>
          <div class="event-summary-grid">
            <span><strong>${escapeHtml(summary.totals.jogosRealizados)}</strong> jogos realizados</span>
            <span><strong>${escapeHtml(summary.totals.gols)}</strong> gols</span>
            <span><strong>${escapeHtml(summary.totals.assistencias)}</strong> assistências</span>
            <span><strong>${escapeHtml(summary.totals.faltas)}</strong> faltas</span>
            <span><strong>${escapeHtml(summary.totals.acoesDefensivas)}</strong> ações defensivas</span>
            <span><strong>${escapeHtml(summary.totals.defesasDificeis)}</strong> defesas difíceis</span>
          </div>
          <div class="pelada-leaders-list">
            <span><strong>Artilheiro</strong>${escapeHtml(renderPeladaLeaderText(summary.leaders.artilheiro, "gols"))}</span>
            <span><strong>Líder de assistências</strong>${escapeHtml(renderPeladaLeaderText(summary.leaders.assistencias, "assistencias"))}</span>
            <span><strong>Maior participação em gol</strong>${escapeHtml(renderPeladaLeaderText(summary.leaders.participacoesGol, "participacoesGol"))}</span>
            <span><strong>Mais vitórias</strong>${escapeHtml(renderPeladaLeaderText(summary.leaders.vitorias, "vitorias"))}</span>
            <span><strong>Goleiro com mais defesas</strong>${escapeHtml(renderPeladaLeaderText(summary.leaders.goleiroDefesas, "defesasDificeis"))}</span>
          </div>
        </section>

        <section class="pelada-finish-block">
          <h3>Sugestões da Pelada</h3>
          <p>O app sugere com base na pontuação, mas a escolha final é manual.</p>
          <div class="pelada-suggestion-grid">
            ${renderPeladaSuggestionCard("Sugestão de MVP da Pelada", summary.suggestions.mvp, "pontuacao", "Pontuação")}
            ${renderPeladaSuggestionCard("Sugestão de Bagre da Pelada", summary.suggestions.bagre, "bagreScore", "Índice negativo")}
          </div>
        </section>

        <div class="form-grid">
          <label class="field-label">
            <span>MVP da Pelada *</span>
            <select name="mvpJogadorId" ${canChoose ? "" : "disabled"}>
              ${renderAwardPlayerOptions(summary, summary.suggestions.mvp?.jogadorId || "", "pontuacao")}
            </select>
          </label>
          <label class="field-label">
            <span>Bagre da Pelada *</span>
            <select name="bagreJogadorId" ${canChoose ? "" : "disabled"}>
              ${renderAwardPlayerOptions(summary, summary.suggestions.bagre?.jogadorId || "", "bagreScore")}
            </select>
          </label>
          <label class="field-label wide-field">
            <span>Observações</span>
            <textarea name="observacoes" rows="3" placeholder="Ex.: escolha confirmada pelo grupo após a última partida."></textarea>
          </label>
        </div>

        <div class="form-actions">
          <button class="primary-button big-touch" type="submit" ${canChoose ? "" : "disabled"}>Confirmar encerramento</button>
          <button class="ghost-button big-touch" type="button" data-modal-close>Cancelar</button>
        </div>
      </form>
    `;
  }

  function renderGameHistory(pelada, jogos, eventsByGameId = new Map(), playerById = new Map(), peladaSummary = null) {
    return `
      <section class="data-card game-history-card">
        <div class="players-toolbar">
          <div>
            <h3>Histórico de Jogos</h3>
            <p>${jogos.length} jogo${jogos.length === 1 ? "" : "s"} criado${jogos.length === 1 ? "" : "s"} nesta pelada.</p>
          </div>
        </div>
        ${peladaSummary ? renderPeladaHistoryOverview(peladaSummary) : ""}
        ${
          jogos.length
            ? `<div class="game-history-grid">${jogos
                .map((jogo, index) =>
                  renderGameHistoryCard(jogo, index + 1, eventsByGameId.get(jogo.id) || [], playerById)
                )
                .join("")}</div>`
            : `
              <div class="empty-state">
                <h3>Nenhum jogo criado</h3>
                <p>Monte Time A e Time B para iniciar o primeiro jogo desta pelada.</p>
              </div>
            `
        }
      </section>
    `;
  }

  function renderGameHistoryCard(jogo, gameNumber, events = [], playerById = new Map()) {
    return `
      <article class="game-history-card-item">
        <button type="button" data-pelada-action="view-game" data-game-id="${escapeHtml(jogo.id)}">
          <span class="game-score-small">Jogo ${escapeHtml(gameNumber)}</span>
          <span class="game-history-main">
            <strong>
              Jogo ${escapeHtml(gameNumber)} — ${escapeHtml(teamNameFromGame(jogo, "A"))}
              ${escapeHtml(jogo.placarA ?? 0)} x ${escapeHtml(jogo.placarB ?? 0)}
              ${escapeHtml(teamNameFromGame(jogo, "B"))}
            </strong>
            <small>${escapeHtml(getGameStatusLabel(jogo))}${escapeHtml(formatGameEnding(jogo))}</small>
            ${renderGameGoalsSummary(jogo, events, playerById)}
          </span>
        </button>
      </article>
    `;
  }

  function renderGameSummary(bundle, pelada, gameNumber = "") {
    const { jogo, playersA, playersB } = bundle;

    return `
      <aside class="game-summary">
        <div class="players-toolbar">
          <div>
            <span class="panel-kicker">${escapeHtml(formatDateLabel(pelada.data))}</span>
            <h3>${gameNumber ? `Resumo do Jogo ${escapeHtml(gameNumber)}` : "Resumo do jogo"}</h3>
          </div>
          ${
            jogo.status === "Em andamento"
              ? `<button class="primary-button compact-button" type="button" data-pelada-action="open-live" data-game-id="${escapeHtml(jogo.id)}">Abrir ao vivo</button>`
              : ""
          }
        </div>
        <div class="summary-score">
          <span>${escapeHtml(teamNameFromGame(jogo, "A"))}</span>
          <strong>${escapeHtml(jogo.placarA ?? 0)} x ${escapeHtml(jogo.placarB ?? 0)}</strong>
          <span>${escapeHtml(teamNameFromGame(jogo, "B"))}</span>
        </div>
        <div class="summary-columns">
          ${renderSummaryTeam(teamNameFromGame(jogo, "A"), playersA)}
          ${renderSummaryTeam(teamNameFromGame(jogo, "B"), playersB)}
        </div>
        ${renderEventSummaryStats(bundle)}
        <div class="future-stats">
          <h3>Eventos registrados</h3>
          ${renderEventTimeline(bundle)}
        </div>
      </aside>
    `;
  }

  function renderEventSummaryStats(bundle) {
    const eventos = bundle.eventos || [];
    const gols = eventos.filter((evento) => normalizeEventType(evento.tipo) === "gol");
    const assistencias = gols.filter((evento) => evento.assistenteId);
    const faltas = eventos.filter((evento) => normalizeEventType(evento.tipo) === "falta");
    const cartoes = eventos.filter((evento) => {
      const eventType = normalizeToken(evento.tipo);
      const cartao = normalizeToken(evento.cartao);
      return (eventType === "falta" || eventType === "cartao") && cartao && cartao !== "nenhum";
    });
    const golsContra = gols.filter((evento) => evento.golContra);
    const acoesDefensivas = eventos.filter((evento) => normalizeToken(evento.tipo) === "acao_defensiva");
    const defesasGoleiro = eventos.filter((evento) => normalizeToken(evento.tipo) === "defesa_goleiro");

    return `
      <div class="event-summary-grid">
        <span><strong>${gols.length}</strong> gols</span>
        <span><strong>${assistencias.length}</strong> assistências</span>
        <span><strong>${faltas.length}</strong> faltas</span>
        <span><strong>${cartoes.length}</strong> cartões</span>
        <span><strong>${acoesDefensivas.length}</strong> ações defensivas</span>
        <span><strong>${defesasGoleiro.length}</strong> defesas</span>
        <span><strong>${golsContra.length}</strong> gols contra</span>
        <span><strong>${escapeHtml(bundle.jogo.formaEncerramento || "-")}</strong> encerramento</span>
      </div>
    `;
  }

  function renderSummaryTeam(title, players) {
    return `
      <div class="summary-team">
        <h3>${escapeHtml(title)}</h3>
        ${
          players.length
            ? `<ul>${players.map((player) => `<li>${escapeHtml(playerDisplayName(player))}</li>`).join("")}</ul>`
            : `<p>Sem jogadores.</p>`
        }
      </div>
    `;
  }

  function bindPeladaSectionEvents() {
    const layout = $("#section-content");
    const peladaForm = $("#pelada-form");
    const gameForm = $("#game-form");

    if (!layout) {
      return;
    }

    peladaForm?.addEventListener("submit", handlePeladaFormSubmit);
    gameForm?.addEventListener("submit", handleGameFormSubmit);
    gameForm?.addEventListener("input", () => syncGameDraftFromForm(gameForm));
    gameForm?.addEventListener("change", () => syncGameDraftFromForm(gameForm));

    layout.addEventListener("click", async (event) => {
      const actionButton = event.target.closest("[data-pelada-action]");

      if (!actionButton) {
        return;
      }

      const action = actionButton.dataset.peladaAction;

      if (action === "show-create") {
        state.selectedPeladaId = null;
        state.selectedGameSummaryId = null;
        state.peladasView = "criar";
        await switchSection("peladas", { peladasView: "criar", historyMode: "replace" });
        return;
      }

      if (action === "show-manage") {
        state.selectedPeladaId = null;
        state.selectedGameSummaryId = null;
        state.peladasView = "gerenciar";
        await switchSection("peladas", { peladasView: "gerenciar", historyMode: "replace" });
        return;
      }

      if (action === "open-pelada" || action === "select") {
        const peladaId = actionButton.dataset.peladaId || "";
        state.selectedGameSummaryId = null;
        state.gameDraft = createEmptyGameDraft();
        await switchSection("peladas", { peladaId });
        return;
      }

      if (action === "back-list") {
        state.selectedPeladaId = null;
        state.selectedGameSummaryId = null;
        state.gameDraft = createEmptyGameDraft();
        await switchSection("peladas", { historyMode: "replace", peladasView: "gerenciar" });
        return;
      }

      if (action === "view-game") {
        const gameId = actionButton.dataset.gameId || "";
        if (state.selectedPeladaId && gameId) {
          await switchSection("peladas", { peladaId: state.selectedPeladaId, gameId });
        }
        return;
      }

      if (action === "close-summary") {
        if (state.selectedPeladaId) {
          await switchSection("peladas", { peladaId: state.selectedPeladaId, historyMode: "replace" });
        }
        return;
      }

      if (action === "finish-pelada") {
        if (actionButton.disabled || !state.selectedPeladaId) {
          return;
        }

        const confirmed = window.confirm("Quer mesmo finalizar esta pelada? Depois disso você escolherá MVP e Bagre da Pelada.");

        if (confirmed) {
          await openPeladaFinishModal(state.selectedPeladaId);
        }
        return;
      }

      if (action === "open-lineup" || action === "open-goalkeeper") {
        const teamKey = actionButton.dataset.team;
        if (["A", "B"].includes(teamKey)) {
          await openTeamSelectionModal(teamKey, action === "open-goalkeeper" ? "goleiro" : "linha");
        }
        return;
      }

      if (action === "open-live") {
        setActiveGameId(actionButton.dataset.gameId);
        await switchSection("ao-vivo");
      }
    });
  }

  async function readPeladaClosureSummary(peladaId) {
    const [pelada, jogos, eventos, escalacoes, jogadores] = await Promise.all([
      getRecord("peladas", peladaId),
      readGamesForPelada(peladaId),
      getAllRecords("eventos"),
      getAllRecords("escalacoes"),
      getAllRecords("jogadores"),
    ]);

    return pelada ? buildPeladaClosureSummary(pelada, jogos, eventos, escalacoes, jogadores) : null;
  }

  async function openPeladaFinishModal(peladaId) {
    const summary = await readPeladaClosureSummary(peladaId);

    if (!summary) {
      return;
    }

    if (!summary.canFinalize) {
      window.alert(summary.finishDisabledReason || "Não é possível finalizar esta pelada agora.");
      return;
    }

    const modal = openLiveModal("Finalizar Pelada", renderPeladaFinishModal(summary));
    const form = modal.querySelector("#finish-pelada-form");

    form?.addEventListener("submit", (event) => handleFinishPeladaSubmit(event, peladaId));
  }

  async function handleFinishPeladaSubmit(event, peladaId) {
    event.preventDefault();

    const form = event.currentTarget;
    const summary = await readPeladaClosureSummary(peladaId);
    const pelada = summary?.pelada;
    const mvpJogadorId = form.elements.mvpJogadorId?.value || "";
    const bagreJogadorId = form.elements.bagreJogadorId?.value || "";
    const observacoes = String(form.elements.observacoes?.value || "").trim();
    const errors = [];

    if (!summary || !pelada) errors.push("Pelada não encontrada.");
    if (summary && !summary.canFinalize) errors.push(summary.finishDisabledReason || "Não é possível finalizar esta pelada agora.");
    if (!mvpJogadorId) errors.push("Escolha manualmente o MVP da Pelada.");
    if (!bagreJogadorId) errors.push("Escolha manualmente o Bagre da Pelada.");
    if (mvpJogadorId && bagreJogadorId && mvpJogadorId === bagreJogadorId) {
      errors.push("MVP e Bagre da Pelada devem ser jogadores diferentes.");
    }

    showFormErrors("finish-pelada-errors", errors);

    if (errors.length) {
      return;
    }

    const savedAt = nowIso();
    const mvpScore = summary.scoreByPlayerId.get(mvpJogadorId)?.pontuacao || 0;
    const bagreScore = summary.scoreByPlayerId.get(bagreJogadorId)?.bagreScore || 0;
    const baseEvent = {
      jogoId: "",
      peladaId,
      timeId: "",
      time: "",
      assistenteId: "",
      jogadorSofreuId: "",
      minuto: "",
      tipoGol: "",
      cartao: "",
      tipoAcaoDefensiva: "",
      tipoDefesaGoleiro: "",
      golContra: false,
      observacoes,
      criadoPor: getDeviceId(),
      createdAt: savedAt,
      updatedAt: savedAt,
      revision: 1,
      cancelado: false,
      escolhidoManual: true,
    };
    const mvpEvent = {
      ...baseEvent,
      id: uid(),
      tipo: "MVP_PELADA",
      jogadorId: mvpJogadorId,
      detalhe: `MVP da Pelada - ${pelada.local || "Pelada"}`,
      pontuacaoCalculada: Number(mvpScore.toFixed(1)),
    };
    const bagreEvent = {
      ...baseEvent,
      id: uid(),
      tipo: "BAGRE_PELADA",
      jogadorId: bagreJogadorId,
      detalhe: `Bagre da Pelada - ${pelada.local || "Pelada"}`,
      pontuacaoCalculada: Number(bagreScore.toFixed(1)),
    };
    const updatedPelada = {
      ...pelada,
      status: "Finalizada",
      finalizadaEm: savedAt,
      mvpJogadorId,
      bagreJogadorId,
      updatedAt: savedAt,
      revision: (pelada.revision || 0) + 1,
    };

    await putRecords({
      peladas: [updatedPelada],
      eventos: [mvpEvent, bagreEvent],
      syncQueue: [
        createSyncQueueRecord("peladas", "upsert", peladaId, updatedPelada),
        createSyncQueueRecord("eventos", "upsert", mvpEvent.id, mvpEvent),
        createSyncQueueRecord("eventos", "upsert", bagreEvent.id, bagreEvent),
      ],
      auditLog: [
        createAuditRecord("peladas", peladaId, "finalizar-pelada", pelada, updatedPelada),
        createAuditRecord("eventos", mvpEvent.id, "criar-mvp-pelada", null, mvpEvent),
        createAuditRecord("eventos", bagreEvent.id, "criar-bagre-pelada", null, bagreEvent),
      ],
    });

    for (const playerId of [mvpJogadorId, bagreJogadorId]) {
      await aplicarEvolucaoPorEventos(playerId);
    }

    closeLiveModal();
    await syncNow();
    await refreshCurrentView();
  }

  function collectPeladaFormData(form) {
    const valorText = String(form.elements.valor?.value || "").replace(",", ".");

    return {
      data: form.elements.data?.value || "",
      local: String(form.elements.local?.value || "").trim(),
      endereco: String(form.elements.endereco?.value || "").trim(),
      horarioInicio: form.elements.horarioInicio?.value || "",
      horarioFim: form.elements.horarioFim?.value || "",
      valor: valorText ? Number(valorText) : "",
      observacoes: String(form.elements.observacoes?.value || "").trim(),
    };
  }

  function validatePeladaForm(data) {
    const errors = [];

    if (!data.data) errors.push("Data é obrigatória.");
    if (!data.local) errors.push("Local é obrigatório.");
    if (data.valor !== "" && (!Number.isFinite(data.valor) || data.valor < 0)) {
      errors.push("Valor deve ser um número válido.");
    }

    return errors;
  }

  function showFormErrors(elementId, errors) {
    const errorsBox = $(`#${elementId}`);

    if (!errorsBox) {
      return;
    }

    if (!errors.length) {
      errorsBox.hidden = true;
      errorsBox.innerHTML = "";
      return;
    }

    errorsBox.hidden = false;
    errorsBox.innerHTML = `
      <strong>Revise os dados:</strong>
      <ul>${errors.map((error) => `<li>${escapeHtml(error)}</li>`).join("")}</ul>
    `;
  }

  async function handlePeladaFormSubmit(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const data = collectPeladaFormData(form);
    const errors = validatePeladaForm(data);
    showFormErrors("pelada-form-errors", errors);

    if (errors.length) {
      return;
    }

    const savedAt = nowIso();
    const peladaRecord = {
      id: uid(),
      ...data,
      status: "Aberta",
      createdAt: savedAt,
      updatedAt: savedAt,
      revision: 1,
    };

    await putRecords({
      peladas: [peladaRecord],
      syncQueue: [createSyncQueueRecord("peladas", "upsert", peladaRecord.id, peladaRecord)],
      auditLog: [createAuditRecord("peladas", peladaRecord.id, "criar", null, peladaRecord)],
    });

    state.selectedPeladaId = null;
    state.selectedGameSummaryId = null;
    state.peladasView = "gerenciar";
    state.gameDraft = createEmptyGameDraft();
    form.reset();
    await switchSection("peladas", { historyMode: "replace", peladasView: "gerenciar" });
    await syncNow();
  }

  function collectGameFormData(form, jogadores) {
    syncGameDraftFromForm(form);
    normalizeGameDraft(jogadores);
    const teamAPlayers = uniqueIds([state.gameDraft.A.goleiro, ...state.gameDraft.A.linha]);
    const teamBPlayers = uniqueIds([state.gameDraft.B.goleiro, ...state.gameDraft.B.linha]);

    return {
      timeA: {
        nome: state.gameDraft.A.nome,
        cor: state.gameDraft.A.cor,
        jogadores: teamAPlayers,
        linha: [...state.gameDraft.A.linha],
        goleiroId: state.gameDraft.A.goleiro,
      },
      timeB: {
        nome: state.gameDraft.B.nome,
        cor: state.gameDraft.B.cor,
        jogadores: teamBPlayers,
        linha: [...state.gameDraft.B.linha],
        goleiroId: state.gameDraft.B.goleiro,
      },
    };
  }

  function validateGameForm(data, selectedPelada, activeGame) {
    const errors = [];

    if (!selectedPelada) errors.push("Selecione ou crie uma pelada.");
    if (activeGame) errors.push("Finalize o jogo em andamento antes de iniciar outro.");
    if (!data.timeA.jogadores.length) errors.push("Escolha pelo menos um jogador para o Time A.");
    if (!data.timeB.jogadores.length) errors.push("Escolha pelo menos um jogador para o Time B.");

    const duplicates = data.timeA.jogadores.filter((playerId) => data.timeB.jogadores.includes(playerId));

    if (duplicates.length) {
      errors.push("O mesmo jogador não pode estar nos dois times.");
    }

    if (data.timeA.goleiroId && data.timeA.goleiroId === data.timeB.goleiroId) {
      errors.push("O mesmo goleiro não pode estar nos dois times.");
    }

    return errors;
  }

  async function handleGameFormSubmit(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const [jogadores, pelada, activeGame] = await Promise.all([
      readActivePlayers(),
      state.selectedPeladaId ? getRecord("peladas", state.selectedPeladaId) : null,
      findActiveGame(),
    ]);
    const data = collectGameFormData(form, jogadores);
    const errors = validateGameForm(data, pelada, activeGame);
    showFormErrors("game-form-errors", errors);

    if (errors.length) {
      return;
    }

    const savedAt = nowIso();
    const jogoId = uid();
    const timeAId = `${jogoId}-A`;
    const timeBId = `${jogoId}-B`;
    const timeA = {
      id: timeAId,
      jogoId,
      time: "A",
      nome: data.timeA.nome,
      cor: data.timeA.cor,
      jogadores: data.timeA.jogadores,
      linha: data.timeA.linha,
      goleiroId: data.timeA.goleiroId,
      createdAt: savedAt,
      updatedAt: savedAt,
      revision: 1,
    };
    const timeB = {
      id: timeBId,
      jogoId,
      time: "B",
      nome: data.timeB.nome,
      cor: data.timeB.cor,
      jogadores: data.timeB.jogadores,
      linha: data.timeB.linha,
      goleiroId: data.timeB.goleiroId,
      createdAt: savedAt,
      updatedAt: savedAt,
      revision: 1,
    };
    const jogoRecord = {
      id: jogoId,
      peladaId: pelada.id,
      timeA: { id: timeAId, nome: timeA.nome, cor: timeA.cor },
      timeB: { id: timeBId, nome: timeB.nome, cor: timeB.cor },
      placarA: 0,
      placarB: 0,
      vencedor: "",
      status: "Em andamento",
      inicio: savedAt,
      fim: "",
      formaEncerramento: "",
      duracaoSegundos: GAME_DURATION_SECONDS,
      totalPausadoMs: 0,
      pausadoEm: "",
      createdAt: savedAt,
      updatedAt: savedAt,
      revision: 1,
    };
    const escalacoes = [
      ...data.timeA.jogadores.map((jogadorId) => ({
        id: `${jogoId}-${jogadorId}`,
        jogoId,
        jogadorId,
        time: "A",
        timeId: timeAId,
        createdAt: savedAt,
        updatedAt: savedAt,
        revision: 1,
      })),
      ...data.timeB.jogadores.map((jogadorId) => ({
        id: `${jogoId}-${jogadorId}`,
        jogoId,
        jogadorId,
        time: "B",
        timeId: timeBId,
        createdAt: savedAt,
        updatedAt: savedAt,
        revision: 1,
      })),
    ];

    await putRecords({
      jogos: [jogoRecord],
      times: [timeA, timeB],
      escalacoes,
      syncQueue: [
        createSyncQueueRecord("jogos", "upsert", jogoId, jogoRecord),
        createSyncQueueRecord("times", "upsert", timeAId, timeA),
        createSyncQueueRecord("times", "upsert", timeBId, timeB),
        ...escalacoes.map((escalacao) =>
          createSyncQueueRecord("escalacoes", "upsert", escalacao.id, escalacao)
        ),
      ],
      auditLog: [createAuditRecord("jogos", jogoId, "iniciar", null, { jogo: jogoRecord, escalacoes })],
    });

    setActiveGameId(jogoId);
    state.selectedGameSummaryId = jogoId;
    state.gameDraft = createEmptyGameDraft();
    await syncNow();
    await switchSection("ao-vivo");
  }

  async function renderLiveSection() {
    setSectionTitle("Jogo", "Partida ao Vivo");
    const activeGame = await findActiveGame();

    if (activeGame && getRemainingGameSeconds(activeGame) <= 0) {
      await finalizeGame(activeGame.id, "Tempo");
      return;
    }

    const bundle = activeGame ? await readGameBundle(activeGame.id) : null;

    if (!bundle) {
      const jogos = await getAllRecords("jogos");
      const latestGame = jogos
        .sort((a, b) => String(b.fim || b.inicio || "").localeCompare(String(a.fim || a.inicio || "")))[0];
      const latestBundle = latestGame ? await readGameBundle(latestGame.id) : null;

      $("#section-content").innerHTML = `
        <div class="empty-state live-empty">
          <h3>Nenhuma partida em andamento</h3>
          <p>Crie uma pelada, monte os times e clique em Iniciar Jogo para abrir o placar ao vivo.</p>
          <div class="form-actions">
            <button class="primary-button" type="button" data-live-action="new-game">Criar jogo</button>
          </div>
        </div>
        ${latestBundle ? renderFinishedLiveSummary(latestBundle) : ""}
      `;
      bindLiveSectionEvents();
      return;
    }

    const { jogo, playersA, playersB } = bundle;
    const remaining = getRemainingGameSeconds(jogo);

    $("#section-content").innerHTML = `
      <div class="live-screen" data-game-id="${escapeHtml(jogo.id)}">
        ${renderLiveTopbar()}
        ${renderLiveScoreCard(bundle, remaining)}
        ${renderLivePitch(bundle)}
        ${state.liveMessage ? `<p class="live-message-bar" id="live-message">${escapeHtml(state.liveMessage)}</p>` : `<p class="live-message-bar" id="live-message" hidden></p>`}
        ${renderLiveEventsCard(bundle)}
        ${renderLiveControlBar(jogo)}
      </div>
    `;

    bindLiveSectionEvents();
    startLiveTimer(jogo.id);
  }

  function renderLiveTopbar() {
    return `
      <div class="live-topbar">
        <button class="live-icon-button" type="button" data-live-action="back-home" aria-label="Voltar">←</button>
        <div class="live-brand-mini">
          <img src="assets/icons/icon.svg" alt="" aria-hidden="true" />
          <strong>Bagre<span>Score</span></strong>
        </div>
        <button class="live-icon-button" type="button" data-live-action="settings" aria-label="Abrir configurações">⚙</button>
      </div>
    `;
  }

  function renderLiveScoreCard(bundle, remaining) {
    const { jogo } = bundle;
    const liveStatus = jogo.status === "Finalizado" ? "ENCERRADO" : jogo.pausadoEm ? "PAUSADO" : "AO VIVO";
    const pelada = bundle.pelada;
    const peladaLabel = "Liga BagreScore";

    return `
      <section class="live-score-card">
        <div class="live-score-meta">
          <span>${escapeHtml(peladaLabel)}</span>
          <strong>${escapeHtml(pelada?.local || "Partida BagreScore")}</strong>
          <span class="live-status-dot ${jogo.status === "Finalizado" ? "is-ended" : ""}">${escapeHtml(liveStatus)}</span>
        </div>
        <div class="live-score-board">
          ${renderLiveTeamBadge(bundle, "A")}
          <div class="live-score-center">
            <strong><span id="live-score-a">${escapeHtml(jogo.placarA ?? 0)}</span> : <span id="live-score-b">${escapeHtml(jogo.placarB ?? 0)}</span></strong>
            <span class="timer" id="live-timer">${escapeHtml(formatClock(remaining))}</span>
            <small class="live-period"><i></i><span id="live-status">${escapeHtml(getGameStatusLabel(jogo))}</span></small>
          </div>
          ${renderLiveTeamBadge(bundle, "B")}
        </div>
      </section>
    `;
  }

  function renderLiveTeamBadge(bundle, teamKey) {
    const jogo = bundle.jogo;
    const name = teamNameFromGame(jogo, teamKey);
    const initials = name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || teamKey;

    return `
      <div class="live-team-badge" style="--team-color: ${escapeHtml(teamColorFromGame(jogo, teamKey))};">
        <span>${escapeHtml(initials)}</span>
        <strong>${escapeHtml(name)}</strong>
      </div>
    `;
  }

  function renderLivePitch(bundle) {
    return `
      <section class="live-pitch-card" aria-label="Campo de futebol">
        <div class="pitch-lines" aria-hidden="true"></div>
        ${renderPitchPlayers(bundle, "A")}
        ${renderPitchPlayers(bundle, "B")}
      </section>
    `;
  }

  function renderPitchPlayers(bundle, teamKey) {
    const players = getLineupPlayers(bundle, teamKey);
    const layout = getLiveTeamLayoutPlayers(players);
    const color = teamColorFromGame(bundle.jogo, teamKey);
    const positions = getPitchPositions(teamKey);
    const nodes = [];

    if (layout.goalkeeper) {
      nodes.push(renderPitchPlayerNode(layout.goalkeeper, teamKey, positions.goalkeeper, color, true));
    }

    layout.linePlayers.forEach((player, index) => {
      nodes.push(renderPitchPlayerNode(player, teamKey, positions.line[index] || positions.line[positions.line.length - 1], color, false));
    });

    return nodes.join("");
  }

  function getLiveTeamLayoutPlayers(players) {
    const goalkeeper = players.find(isGoalkeeperCandidate) || null;
    const linePlayers = players
      .filter((player) => !goalkeeper || player.id !== goalkeeper.id)
      .slice(0, 5);

    return {
      goalkeeper,
      linePlayers,
    };
  }

  function getPitchPositions(teamKey) {
    const positions = {
      A: {
        goalkeeper: { x: 7, y: 50 },
        line: [
          { x: 24, y: 18 },
          { x: 25, y: 38 },
          { x: 25, y: 62 },
          { x: 24, y: 82 },
          { x: 42, y: 50 },
        ],
      },
      B: {
        goalkeeper: { x: 93, y: 50 },
        line: [
          { x: 76, y: 18 },
          { x: 75, y: 38 },
          { x: 75, y: 62 },
          { x: 76, y: 82 },
          { x: 58, y: 50 },
        ],
      },
    };

    return positions[teamKey] || positions.A;
  }

  function renderPitchPlayerNode(player, teamKey, position, color, isGoalkeeper) {
    return `
      <button
        class="pitch-player ${isGoalkeeper ? "is-goalkeeper" : ""}"
        type="button"
        style="--x: ${position.x}; --y: ${position.y}; --team-color: ${escapeHtml(color)};"
        data-live-action="player-actions"
        data-player-id="${escapeHtml(player.id)}"
        data-team="${escapeHtml(teamKey)}"
        data-goalkeeper="${isGoalkeeper ? "true" : "false"}"
      >
        ${renderPlayerAvatar(player, "player-avatar pitch-avatar")}
        <strong>${escapeHtml(shortPlayerName(player))}</strong>
        <small>${escapeHtml(isGoalkeeper ? "GK" : player.posicaoPrincipal || "")}</small>
      </button>
    `;
  }

  function shortPlayerName(player) {
    const name = playerDisplayName(player);
    return name.length > 10 ? `${name.slice(0, 9)}...` : name;
  }

  function renderLiveEventsCard(bundle) {
    return `
      <section class="live-events-card">
        <div class="live-card-heading">
          <h3>Eventos da partida</h3>
          <span>Tempo real</span>
        </div>
        ${renderEventTimeline(bundle)}
      </section>
    `;
  }

  function renderLiveControlBar(jogo) {
    const paused = Boolean(jogo.pausadoEm);

    return `
      <div class="live-control-bar">
        <button class="ghost-button big-touch" type="button" data-live-action="${paused ? "resume" : "pause"}">
          ${paused ? "Retomar" : "Pausar"}
        </button>
        <button class="ghost-button big-touch" type="button" data-live-action="undo">Desfazer</button>
        <button class="danger-button big-touch" type="button" data-live-action="finish">Finalizar jogo</button>
      </div>
    `;
  }

  async function openPlayerActionsPanel(jogoId, playerId) {
    const bundle = await readGameBundle(jogoId);
    const player = [...(bundle?.playersA || []), ...(bundle?.playersB || [])].find((item) => item.id === playerId);

    if (!bundle || !player || bundle.jogo.status === "Finalizado") {
      state.liveMessage = "Não é possível registrar evento neste jogo.";
      await renderCurrentSection();
      return;
    }

    const isGoalkeeper = isGoalkeeperCandidate(player);
    const actions = isGoalkeeper
      ? [
          ["save", "Defesa difícil", "DD"],
          ["assist", "Assistência", "A"],
          ["foul-suffered", "Falta sofrida", "FS"],
          ["foul-committed", "Falta cometida", "FC"],
          ["yellow-card", "Cartão amarelo", "CA"],
          ["red-card", "Cartão vermelho", "CV"],
        ]
      : [
          ["goal", "Gol", "G"],
          ["assist", "Assistência", "A"],
          ["foul-suffered", "Falta sofrida", "FS"],
          ["foul-committed", "Falta cometida", "FC"],
          ["defensive", "Desarme", "D"],
          ["yellow-card", "Cartão amarelo", "CA"],
          ["red-card", "Cartão vermelho", "CV"],
          ["own-goal", "Gol contra", "GC"],
        ];
    const modal = openLiveModal(
      `Ações - ${playerDisplayName(player)}`,
      `
        <div class="player-action-panel" data-player-id="${escapeHtml(player.id)}">
          ${renderPlayerAvatar(player, "player-avatar action-player-avatar")}
          <p>${escapeHtml(teamNameFromGame(bundle.jogo, getLineupTeamForPlayer(bundle, player.id)))} • ${escapeHtml(isGoalkeeper ? "Goleiro" : player.posicaoPrincipal || "Linha")}</p>
          <div class="player-action-grid">
            ${actions
              .map(
                ([action, label, icon], index) => `
                  <button class="${index === 0 ? "primary-button" : "ghost-button"}" type="button" data-player-event-action="${escapeHtml(action)}">
                    <span aria-hidden="true">${escapeHtml(icon)}</span>
                    ${escapeHtml(label)}
                  </button>
                `
              )
              .join("")}
          </div>
        </div>
      `
    );

    modal.querySelectorAll("[data-player-event-action]").forEach((button) => {
      button.addEventListener("click", async () => {
        closeLiveModal();
        await routePlayerEventAction(bundle, player, button.dataset.playerEventAction);
      });
    });
  }

  async function routePlayerEventAction(bundle, player, action) {
    if (action === "goal") {
      openPlayerGoalModal(bundle, player);
      return;
    }

    if (action === "own-goal") {
      openPlayerOwnGoalModal(bundle, player);
      return;
    }

    if (action === "assist") {
      openPlayerAssistModal(bundle, player);
      return;
    }

    if (action === "foul-suffered" || action === "foul-committed") {
      openPlayerFoulQuickModal(bundle, player, action);
      return;
    }

    if (action === "defensive") {
      openPlayerDefensiveQuickModal(bundle, player);
      return;
    }

    if (action === "save") {
      openPlayerGoalkeeperSaveQuickModal(bundle, player);
      return;
    }

    if (action === "yellow-card" || action === "red-card") {
      await saveCardEvent({
        jogo: bundle.jogo,
        bundle,
        jogadorId: player.id,
        cartao: action === "yellow-card" ? "amarelo" : "vermelho",
      });
    }
  }

  function renderYesNoRadios(name, selectedValue = "nao") {
    return `
      <div class="segmented-options compact-segment">
        <label><input type="radio" name="${escapeHtml(name)}" value="sim" ${selectedValue === "sim" ? "checked" : ""} /> Sim</label>
        <label><input type="radio" name="${escapeHtml(name)}" value="nao" ${selectedValue === "nao" ? "checked" : ""} /> Não</label>
      </div>
    `;
  }

  function goalTypeFromQuickForm(form) {
    if (form.elements.isPenalty?.value === "sim") return "penalti";
    if (form.elements.isFreeKick?.value === "sim") return "falta";
    if (form.elements.isHeader?.value === "sim") return "cabeca";
    return "normal";
  }

  function openPlayerGoalModal(bundle, player) {
    const teamKey = getLineupTeamForPlayer(bundle, player.id);
    const assistPlayers = getLineupPlayers(bundle, teamKey).filter((item) => item.id !== player.id);
    const modal = openLiveModal(
      `Gol - ${playerDisplayName(player)}`,
      `
        <form class="event-form player-goal-form" id="player-goal-form" novalidate>
          <div class="form-errors" id="player-goal-errors" hidden></div>
          <label class="quick-question">
            <span>Teve assistência?</span>
            ${renderYesNoRadios("hasAssist", "nao")}
          </label>
          <label class="field-label" id="quick-assist-wrap" hidden>
            <span>Quem deu a assistência?</span>
            <select name="assistenteId">${renderPlayerOptions(assistPlayers, "", "Escolha o assistente")}</select>
          </label>
          <label class="quick-question"><span>Foi pênalti?</span>${renderYesNoRadios("isPenalty", "nao")}</label>
          <label class="quick-question"><span>Foi falta?</span>${renderYesNoRadios("isFreeKick", "nao")}</label>
          <label class="quick-question"><span>Foi de cabeça?</span>${renderYesNoRadios("isHeader", "nao")}</label>
          <label class="field-label">
            <span>Observação</span>
            <textarea name="observacoes" rows="2"></textarea>
          </label>
          <div class="form-actions">
            <button class="primary-button big-touch" type="submit">Confirmar gol</button>
            <button class="ghost-button big-touch" type="button" data-modal-close>Cancelar</button>
          </div>
        </form>
      `
    );
    const form = modal.querySelector("#player-goal-form");
    const assistWrap = modal.querySelector("#quick-assist-wrap");

    form.addEventListener("change", () => {
      assistWrap.hidden = form.elements.hasAssist?.value !== "sim";
    });
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const hasAssist = form.elements.hasAssist?.value === "sim";
      const assistenteId = hasAssist ? form.elements.assistenteId?.value || "" : "";
      const errors = [];

      if (hasAssist && !assistenteId) errors.push("Escolha quem deu a assistência.");
      showFormErrors("player-goal-errors", errors);
      if (errors.length) return;

      await saveGoalEvent({
        jogo: bundle.jogo,
        teamKey,
        jogadorId: player.id,
        assistenteId,
        tipoGol: goalTypeFromQuickForm(form),
        golContra: false,
        observacoes: String(form.elements.observacoes?.value || "").trim(),
      });
    });
  }

  function openPlayerOwnGoalModal(bundle, player) {
    const playerTeam = getLineupTeamForPlayer(bundle, player.id);
    const beneficiaryTeam = oppositeTeam(playerTeam);
    const modal = openLiveModal(
      `Gol contra - ${playerDisplayName(player)}`,
      `
        <form class="event-form" id="own-goal-form" novalidate>
          <p>O gol será somado para ${escapeHtml(teamNameFromGame(bundle.jogo, beneficiaryTeam))}.</p>
          <label class="field-label">
            <span>Observação</span>
            <textarea name="observacoes" rows="2"></textarea>
          </label>
          <div class="form-actions">
            <button class="primary-button big-touch" type="submit">Confirmar gol contra</button>
            <button class="ghost-button big-touch" type="button" data-modal-close>Cancelar</button>
          </div>
        </form>
      `
    );

    modal.querySelector("#own-goal-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      await saveGoalEvent({
        jogo: bundle.jogo,
        teamKey: beneficiaryTeam,
        jogadorId: player.id,
        assistenteId: "",
        tipoGol: "gol_contra",
        golContra: true,
        observacoes: String(event.currentTarget.elements.observacoes?.value || "").trim(),
      });
    });
  }

  function openPlayerAssistModal(bundle, player) {
    const teamKey = getLineupTeamForPlayer(bundle, player.id);
    const scorers = getLineupPlayers(bundle, teamKey).filter((item) => item.id !== player.id);
    const modal = openLiveModal(
      `Assistência - ${playerDisplayName(player)}`,
      `
        <form class="event-form player-goal-form" id="player-assist-form" novalidate>
          <div class="form-errors" id="player-assist-errors" hidden></div>
          <label class="field-label">
            <span>Quem fez o gol?</span>
            <select name="jogadorId">${renderPlayerOptions(scorers, "", "Escolha quem fez o gol")}</select>
          </label>
          <label class="quick-question"><span>Foi pênalti?</span>${renderYesNoRadios("isPenalty", "nao")}</label>
          <label class="quick-question"><span>Foi falta?</span>${renderYesNoRadios("isFreeKick", "nao")}</label>
          <label class="quick-question"><span>Foi de cabeça?</span>${renderYesNoRadios("isHeader", "nao")}</label>
          <div class="form-actions">
            <button class="primary-button big-touch" type="submit">Confirmar assistência</button>
            <button class="ghost-button big-touch" type="button" data-modal-close>Cancelar</button>
          </div>
        </form>
      `
    );
    const form = modal.querySelector("#player-assist-form");

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const scorerId = form.elements.jogadorId?.value || "";
      const errors = [];
      if (!scorerId) errors.push("Escolha quem fez o gol.");
      showFormErrors("player-assist-errors", errors);
      if (errors.length) return;

      await saveGoalEvent({
        jogo: bundle.jogo,
        teamKey,
        jogadorId: scorerId,
        assistenteId: player.id,
        tipoGol: goalTypeFromQuickForm(form),
        golContra: false,
        observacoes: "",
      });
    });
  }

  function openPlayerFoulQuickModal(bundle, player, mode) {
    const allPlayers = [...bundle.playersA, ...bundle.playersB].filter((item) => item.id !== player.id);
    const committed = mode === "foul-committed";
    const modal = openLiveModal(
      committed ? `Falta cometida - ${playerDisplayName(player)}` : `Falta sofrida - ${playerDisplayName(player)}`,
      `
        <form class="event-form" id="player-foul-form" novalidate>
          <div class="form-errors" id="player-foul-errors" hidden></div>
          <label class="field-label">
            <span>${committed ? "Quem sofreu?" : "Quem fez a falta?"}</span>
            <select name="otherPlayerId">${renderPlayerOptions(allPlayers, "", "Escolha o jogador")}</select>
          </label>
          <label class="field-label">
            <span>Cartão</span>
            <select name="cartao">${renderModalOptions(CARD_TYPES, "nenhum", "Selecione")}</select>
          </label>
          <div class="form-actions">
            <button class="primary-button big-touch" type="submit">Salvar falta</button>
            <button class="ghost-button big-touch" type="button" data-modal-close>Cancelar</button>
          </div>
        </form>
      `
    );
    const form = modal.querySelector("#player-foul-form");

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const otherPlayerId = form.elements.otherPlayerId?.value || "";
      const errors = [];
      if (!otherPlayerId) errors.push("Escolha o outro jogador do lance.");
      showFormErrors("player-foul-errors", errors);
      if (errors.length) return;

      await saveFoulEvent({
        jogo: bundle.jogo,
        bundle,
        jogadorId: committed ? player.id : otherPlayerId,
        jogadorSofreuId: committed ? otherPlayerId : player.id,
        cartao: form.elements.cartao?.value || "nenhum",
        observacoes: "",
      });
    });
  }

  function openPlayerDefensiveQuickModal(bundle, player) {
    const teamKey = getLineupTeamForPlayer(bundle, player.id);
    const modal = openLiveModal(
      `Ação defensiva - ${playerDisplayName(player)}`,
      `
        <form class="event-form" id="player-defensive-form" novalidate>
          <label class="field-label">
            <span>Tipo da ação</span>
            <select name="tipoAcaoDefensiva">${renderModalOptions(DEFENSIVE_ACTION_TYPES, "desarme", "Selecione")}</select>
          </label>
          <label class="field-label">
            <span>Observação</span>
            <textarea name="observacoes" rows="2"></textarea>
          </label>
          <div class="form-actions">
            <button class="primary-button big-touch" type="submit">Salvar ação</button>
            <button class="ghost-button big-touch" type="button" data-modal-close>Cancelar</button>
          </div>
        </form>
      `
    );

    modal.querySelector("#player-defensive-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      await saveDefensiveActionEvent({
        jogo: bundle.jogo,
        teamKey,
        jogadorId: player.id,
        tipoAcaoDefensiva: form.elements.tipoAcaoDefensiva?.value || "desarme",
        observacoes: String(form.elements.observacoes?.value || "").trim(),
      });
    });
  }

  function openPlayerGoalkeeperSaveQuickModal(bundle, player) {
    const teamKey = getLineupTeamForPlayer(bundle, player.id);
    const modal = openLiveModal(
      `Defesa difícil - ${playerDisplayName(player)}`,
      `
        <form class="event-form" id="player-save-form" novalidate>
          <label class="field-label">
            <span>Tipo da defesa</span>
            <select name="tipoDefesaGoleiro">${renderModalOptions(GOALKEEPER_SAVE_TYPES, "dificil", "Selecione")}</select>
          </label>
          <label class="field-label">
            <span>Observação</span>
            <textarea name="observacoes" rows="2"></textarea>
          </label>
          <div class="form-actions">
            <button class="primary-button big-touch" type="submit">Salvar defesa</button>
            <button class="ghost-button big-touch" type="button" data-modal-close>Cancelar</button>
          </div>
        </form>
      `
    );

    modal.querySelector("#player-save-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      await saveGoalkeeperSaveEvent({
        jogo: bundle.jogo,
        teamKey,
        jogadorId: player.id,
        tipoDefesaGoleiro: form.elements.tipoDefesaGoleiro?.value || "dificil",
        observacoes: String(form.elements.observacoes?.value || "").trim(),
      });
    });
  }

  function renderFinishedLiveSummary(bundle) {
    const { jogo, playersA, playersB } = bundle;

    return `
      <section class="data-card finished-live-summary">
        <div class="players-toolbar">
          <div>
            <span class="panel-kicker">${escapeHtml(jogo.formaEncerramento || "Finalizado")}</span>
            <h3>Último jogo salvo</h3>
          </div>
          <button class="ghost-button compact-button" type="button" data-live-action="open-history" data-pelada-id="${escapeHtml(jogo.peladaId)}" data-game-id="${escapeHtml(jogo.id)}">Ver na pelada</button>
        </div>
        <div class="summary-score">
          <span>${escapeHtml(teamNameFromGame(jogo, "A"))}</span>
          <strong>${escapeHtml(jogo.placarA ?? 0)} x ${escapeHtml(jogo.placarB ?? 0)}</strong>
          <span>${escapeHtml(teamNameFromGame(jogo, "B"))}</span>
        </div>
        <p>Vencedor: ${escapeHtml(jogo.vencedor || getGameWinner(jogo))}</p>
        <div class="summary-columns">
          ${renderSummaryTeam(teamNameFromGame(jogo, "A"), playersA)}
          ${renderSummaryTeam(teamNameFromGame(jogo, "B"), playersB)}
        </div>
        ${renderEventSummaryStats(bundle)}
        ${renderEventTimeline(bundle)}
      </section>
    `;
  }

  function bindLiveSectionEvents() {
    const liveRoot = $("#section-content");

    if (!liveRoot) {
      return;
    }

    liveRoot.onclick = async (event) => {
      const actionButton = event.target.closest("[data-live-action]");

      if (!actionButton) {
        return;
      }

      const action = actionButton.dataset.liveAction;
      const jogoId = $(".live-screen")?.dataset.gameId || state.activeGameId;

      if (action === "back-home") {
        await switchSection("inicio", { historyMode: "replace" });
        return;
      }

      if (action === "settings") {
        openSettingsDrawer();
        return;
      }

      if (action === "new-game") {
        await switchSection("peladas");
        return;
      }

      if (action === "open-history") {
        const peladaId = actionButton.dataset.peladaId || "";
        const gameId = actionButton.dataset.gameId || "";

        if (peladaId) {
          await switchSection("inicio", { historyMode: "replace" });
          await switchSection("peladas", { peladasView: "gerenciar" });
          await switchSection("peladas", { peladaId });

          if (gameId) {
            await switchSection("peladas", { peladaId, gameId });
          }
        } else {
          await switchSection("peladas");
        }
        return;
      }

      if (action === "open-goal-modal") {
        await openGoalModal(jogoId);
        return;
      }

      if (!jogoId) {
        return;
      }

      if (action === "player-actions") {
        await openPlayerActionsPanel(jogoId, actionButton.dataset.playerId || "");
        return;
      }

      if (action === "open-foul-modal") {
        await openFoulModal(jogoId);
        return;
      }

      if (action === "open-defensive-modal") {
        await openDefensiveActionModal(jogoId);
        return;
      }

      if (action === "open-save-modal") {
        await openGoalkeeperSaveModal(jogoId);
        return;
      }

      if (action === "pause") {
        await pauseGame(jogoId);
        return;
      }

      if (action === "resume") {
        await resumeGame(jogoId);
        return;
      }

      if (action === "undo") {
        await undoLastLiveEvent(jogoId);
        return;
      }

      if (action === "finish") {
        await finalizeGame(jogoId, "Manual");
      }
    };
  }

  function stopLiveTimer() {
    if (state.liveTimerId) {
      window.clearInterval(state.liveTimerId);
      state.liveTimerId = null;
    }
  }

  function startLiveTimer(jogoId) {
    stopLiveTimer();
    updateLiveTimer(jogoId);
    state.liveTimerId = window.setInterval(() => updateLiveTimer(jogoId), 1000);
  }

  async function updateLiveTimer(jogoId) {
    const jogo = await getRecord("jogos", jogoId);

    if (!jogo || jogo.status === "Finalizado") {
      stopLiveTimer();
      return;
    }

    const remaining = getRemainingGameSeconds(jogo);
    const timerElement = $("#live-timer");
    const statusElement = $("#live-status");

    if (timerElement) {
      timerElement.textContent = formatClock(remaining);
    }

    if (statusElement) {
      statusElement.textContent = getGameStatusLabel(jogo);
      statusElement.classList.toggle("offline", Boolean(jogo.pausadoEm));
      statusElement.classList.toggle("online", !jogo.pausadoEm);
    }

    if (remaining <= 0) {
      await finalizeGame(jogoId, "Tempo");
    }
  }

  function openLiveModal(title, bodyHtml) {
    closeLiveModal();

    const modal = document.createElement("div");
    modal.className = "modal-backdrop";
    modal.id = "live-modal";
    modal.innerHTML = `
      <div class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="live-modal-title">
        <div class="modal-header">
          <h3 id="live-modal-title">${escapeHtml(title)}</h3>
          <button class="ghost-button compact-button" type="button" data-modal-close>Fechar</button>
        </div>
        ${bodyHtml}
      </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener("click", (event) => {
      if (event.target === modal || event.target.closest("[data-modal-close]")) {
        closeLiveModal();
      }
    });

    document.addEventListener("keydown", handleModalEscape);
    return modal;
  }

  function closeLiveModal() {
    const modal = $("#live-modal");

    if (modal) {
      modal.remove();
    }

    document.removeEventListener("keydown", handleModalEscape);
  }

  function handleModalEscape(event) {
    if (event.key === "Escape") {
      closeLiveModal();
    }
  }

  async function openGoalModal(jogoId) {
    const bundle = await readGameBundle(jogoId);

    if (!bundle || bundle.jogo.status === "Finalizado") {
      state.liveMessage = "Não é possível registrar gol em jogo finalizado.";
      await renderCurrentSection();
      return;
    }

    const modal = openLiveModal(
      "Adicionar Gol",
      `
        <form class="event-form" id="goal-form" novalidate>
          <div class="form-errors" id="goal-form-errors" hidden></div>

          <fieldset class="event-fieldset">
            <legend>1. Time que recebe o gol no placar *</legend>
            <div class="segmented-options">
              <label><input type="radio" name="goalTeam" value="A" checked /> ${escapeHtml(teamNameFromGame(bundle.jogo, "A"))}</label>
              <label><input type="radio" name="goalTeam" value="B" /> ${escapeHtml(teamNameFromGame(bundle.jogo, "B"))}</label>
            </div>
          </fieldset>

          <div class="form-grid">
            <label class="field-label">
              <span>Tipo do gol *</span>
              <select name="tipoGol">
                ${renderModalOptions(GOAL_TYPES, "normal", "Selecione")}
              </select>
            </label>
            <label class="field-label">
              <span>Jogador *</span>
              <select name="jogadorId"></select>
            </label>
          </div>

          <fieldset class="event-fieldset" id="assist-fieldset">
            <legend>3. Teve assistência?</legend>
            <div class="segmented-options">
              <label><input type="radio" name="hasAssist" value="nao" checked /> Não</label>
              <label><input type="radio" name="hasAssist" value="sim" /> Sim</label>
            </div>
            <label class="field-label" id="assist-select-wrap" hidden>
              <span>Assistente</span>
              <select name="assistenteId"></select>
            </label>
          </fieldset>

          <label class="field-label">
            <span>Observação</span>
            <textarea name="observacoes" rows="3"></textarea>
          </label>

          <div class="form-actions">
            <button class="primary-button big-touch" type="submit">Salvar gol</button>
            <button class="ghost-button big-touch" type="button" data-modal-close>Cancelar</button>
          </div>
        </form>
      `
    );
    const form = modal.querySelector("#goal-form");

    populateGoalModal(form, bundle);
    form.addEventListener("change", () => populateGoalModal(form, bundle));
    form.addEventListener("submit", (event) => handleGoalSubmit(event, bundle.jogo.id));
  }

  function populateGoalModal(form, bundle) {
    const teamKey = form.elements.goalTeam?.value || "A";
    const tipoGol = form.elements.tipoGol?.value || "normal";
    const isOwnGoal = tipoGol === "gol_contra";
    const authorTeam = isOwnGoal ? oppositeTeam(teamKey) : teamKey;
    const authorPlayers = getLineupPlayers(bundle, authorTeam);
    const previousAuthor = form.elements.jogadorId?.value || "";
    const hasPreviousAuthor = authorPlayers.some((player) => player.id === previousAuthor);

    form.elements.jogadorId.innerHTML = renderPlayerOptions(
      authorPlayers,
      hasPreviousAuthor ? previousAuthor : "",
      isOwnGoal ? "Quem fez o gol contra" : "Quem fez o gol"
    );

    const selectedAuthor = form.elements.jogadorId.value;
    const assistWrap = form.querySelector("#assist-select-wrap");
    const assistFieldset = form.querySelector("#assist-fieldset");
    const assistYes = form.querySelector('input[name="hasAssist"][value="sim"]');
    const assistNo = form.querySelector('input[name="hasAssist"][value="nao"]');
    const assistPlayers = getLineupPlayers(bundle, teamKey).filter((player) => player.id !== selectedAuthor);

    if (isOwnGoal) {
      assistNo.checked = true;
      assistYes.disabled = true;
      form.elements.assistenteId.innerHTML = renderPlayerOptions([], "", "Sem assistência");
      assistWrap.hidden = true;
      assistFieldset.classList.add("is-muted");
      return;
    }

    assistYes.disabled = false;
    assistFieldset.classList.remove("is-muted");
    const showAssist = form.elements.hasAssist?.value === "sim";
    assistWrap.hidden = !showAssist;
    form.elements.assistenteId.innerHTML = renderPlayerOptions(assistPlayers, form.elements.assistenteId?.value || "", "Escolha o assistente");
  }

  async function handleGoalSubmit(event, jogoId) {
    event.preventDefault();

    const form = event.currentTarget;
    const bundle = await readGameBundle(jogoId);
    const jogo = bundle?.jogo;
    const teamKey = form.elements.goalTeam?.value || "";
    const tipoGol = form.elements.tipoGol?.value || "";
    const isOwnGoal = tipoGol === "gol_contra";
    const authorTeam = isOwnGoal ? oppositeTeam(teamKey) : teamKey;
    const jogadorId = form.elements.jogadorId?.value || "";
    const hasAssist = form.elements.hasAssist?.value === "sim" && !isOwnGoal;
    const assistenteId = hasAssist ? form.elements.assistenteId?.value || "" : "";
    const errors = [];

    if (!jogo || jogo.status === "Finalizado") errors.push("Não é possível adicionar gol em jogo finalizado.");
    if (!["A", "B"].includes(teamKey)) errors.push("Escolha o time do gol.");
    if (!GOAL_TYPES.some((item) => item.value === tipoGol)) errors.push("Escolha o tipo do gol.");
    if (!jogadorId) errors.push("Escolha o jogador.");
    if (jogadorId && !isPlayerInTeam(bundle, jogadorId, authorTeam)) {
      errors.push(isOwnGoal ? "Gol contra deve ser de jogador do time adversário." : "Jogador deve estar no time escolhido.");
    }
    if (hasAssist && !assistenteId) errors.push("Escolha o assistente.");
    if (assistenteId && !isPlayerInTeam(bundle, assistenteId, teamKey)) {
      errors.push("Assistente deve ser do mesmo time beneficiado pelo gol.");
    }
    if (assistenteId && assistenteId === jogadorId) {
      errors.push("Autor do gol e assistente não podem ser a mesma pessoa.");
    }

    showFormErrors("goal-form-errors", errors);

    if (errors.length) {
      return;
    }

    await saveGoalEvent({
      jogo,
      teamKey,
      jogadorId,
      assistenteId,
      tipoGol,
      golContra: isOwnGoal,
      observacoes: String(form.elements.observacoes?.value || "").trim(),
    });
  }

  async function saveGoalEvent({ jogo, teamKey, jogadorId, assistenteId, tipoGol, golContra, observacoes }) {
    const savedAt = nowIso();
    const placarField = teamKey === "A" ? "placarA" : "placarB";
    const updatedJogo = {
      ...jogo,
      [placarField]: Number(jogo[placarField] || 0) + 1,
      updatedAt: savedAt,
      revision: (jogo.revision || 0) + 1,
    };
    const evento = {
      id: uid(),
      jogoId: jogo.id,
      tipo: "Gol",
      timeId: teamKey === "A" ? jogo.timeA?.id : jogo.timeB?.id,
      time: teamKey,
      jogadorId,
      assistenteId,
      jogadorSofreuId: "",
      minuto: getEventMinute(jogo),
      tipoGol,
      cartao: "",
      golContra,
      observacoes,
      detalhe: `${getGoalTypeLabel(tipoGol)} - ${teamNameFromGame(jogo, teamKey)}`,
      criadoPor: getDeviceId(),
      createdAt: savedAt,
      updatedAt: savedAt,
      revision: 1,
      cancelado: false,
    };

    await putRecords({
      jogos: [updatedJogo],
      eventos: [evento],
      syncQueue: [
        createSyncQueueRecord("jogos", "upsert", jogo.id, updatedJogo),
        createSyncQueueRecord("eventos", "upsert", evento.id, evento),
      ],
      auditLog: [createAuditRecord("eventos", evento.id, "criar-gol", null, evento)],
    });

    const playersToEvolve = [...new Set([jogadorId, assistenteId].filter(Boolean))];

    for (const playerId of playersToEvolve) {
      await aplicarEvolucaoPorEventos(playerId);
    }

    closeLiveModal();
    state.liveMessage = `Gol salvo para ${teamNameFromGame(updatedJogo, teamKey)}.`;
    await syncNow();

    if (Number(updatedJogo[placarField] || 0) >= GOALS_TO_END_GAME) {
      await finalizeGame(jogo.id, "2 gols");
      return;
    }

    await renderCurrentSection();
  }

  async function openFoulModal(jogoId) {
    const bundle = await readGameBundle(jogoId);

    if (!bundle || bundle.jogo.status === "Finalizado") {
      state.liveMessage = "Não é possível registrar falta em jogo finalizado.";
      await renderCurrentSection();
      return;
    }

    const allPlayers = [...bundle.playersA, ...bundle.playersB];
    const modal = openLiveModal(
      "Adicionar Falta",
      `
        <form class="event-form" id="foul-form" novalidate>
          <div class="form-errors" id="foul-form-errors" hidden></div>
          <div class="form-grid">
            <label class="field-label">
              <span>Quem fez a falta *</span>
              <select name="jogadorId">
                ${renderPlayerOptions(allPlayers, "", "Escolha quem fez")}
              </select>
            </label>
            <label class="field-label">
              <span>Quem sofreu a falta *</span>
              <select name="jogadorSofreuId">
                ${renderPlayerOptions(allPlayers, "", "Escolha quem sofreu")}
              </select>
            </label>
            <label class="field-label">
              <span>Cartão</span>
              <select name="cartao">
                ${renderModalOptions(CARD_TYPES, "nenhum", "Selecione")}
              </select>
            </label>
            <label class="field-label wide-field">
              <span>Observação</span>
              <textarea name="observacoes" rows="3"></textarea>
            </label>
          </div>
          <div class="form-actions">
            <button class="primary-button big-touch" type="submit">Salvar falta</button>
            <button class="ghost-button big-touch" type="button" data-modal-close>Cancelar</button>
          </div>
        </form>
      `
    );

    modal.querySelector("#foul-form").addEventListener("submit", (event) =>
      handleFoulSubmit(event, bundle.jogo.id)
    );
  }

  async function handleFoulSubmit(event, jogoId) {
    event.preventDefault();

    const form = event.currentTarget;
    const bundle = await readGameBundle(jogoId);
    const jogo = bundle?.jogo;
    const jogadorId = form.elements.jogadorId?.value || "";
    const jogadorSofreuId = form.elements.jogadorSofreuId?.value || "";
    const cartao = form.elements.cartao?.value || "nenhum";
    const errors = [];

    if (!jogo || jogo.status === "Finalizado") errors.push("Não é possível adicionar falta em jogo finalizado.");
    if (!jogadorId) errors.push("Escolha quem fez a falta.");
    if (!jogadorSofreuId) errors.push("Escolha quem sofreu a falta.");
    if (jogadorId && jogadorSofreuId && jogadorId === jogadorSofreuId) {
      errors.push("Quem fez e quem sofreu não podem ser a mesma pessoa.");
    }
    if (jogadorId && !getLineupTeamForPlayer(bundle, jogadorId)) {
      errors.push("Quem fez a falta precisa estar escalado.");
    }
    if (jogadorSofreuId && !getLineupTeamForPlayer(bundle, jogadorSofreuId)) {
      errors.push("Quem sofreu a falta precisa estar escalado.");
    }

    showFormErrors("foul-form-errors", errors);

    if (errors.length) {
      return;
    }

    await saveFoulEvent({
      jogo,
      bundle,
      jogadorId,
      jogadorSofreuId,
      cartao,
      observacoes: String(form.elements.observacoes?.value || "").trim(),
    });
  }

  async function saveFoulEvent({ jogo, bundle, jogadorId, jogadorSofreuId, cartao, observacoes }) {
    const savedAt = nowIso();
    const timeCometeu = getLineupTeamForPlayer(bundle, jogadorId);
    const timeSofreu = getLineupTeamForPlayer(bundle, jogadorSofreuId);
    const evento = {
      id: uid(),
      jogoId: jogo.id,
      tipo: "Falta",
      timeId: timeCometeu === "A" ? jogo.timeA?.id : jogo.timeB?.id,
      time: timeCometeu,
      jogadorId,
      assistenteId: "",
      jogadorSofreuId,
      minuto: getEventMinute(jogo),
      tipoGol: "",
      cartao,
      golContra: false,
      observacoes,
      detalhe: `Falta - ${getCardLabel(cartao)}`,
      criadoPor: getDeviceId(),
      createdAt: savedAt,
      updatedAt: savedAt,
      revision: 1,
      cancelado: false,
    };
    const falta = {
      id: evento.id,
      jogoId: jogo.id,
      jogadorCometeuId: jogadorId,
      jogadorSofreuId,
      timeCometeu,
      timeSofreu,
      minuto: evento.minuto,
      cartao,
      observacoes,
      createdAt: savedAt,
      updatedAt: savedAt,
      revision: 1,
    };

    await putRecords({
      eventos: [evento],
      faltas: [falta],
      syncQueue: [
        createSyncQueueRecord("eventos", "upsert", evento.id, evento),
        createSyncQueueRecord("faltas", "upsert", falta.id, falta),
      ],
      auditLog: [createAuditRecord("eventos", evento.id, "criar-falta", null, { evento, falta })],
    });

    await aplicarEvolucaoPorEventos(jogadorId);

    closeLiveModal();
    state.liveMessage = "Falta salva.";
    await syncNow();
    await renderCurrentSection();
  }

  async function saveCardEvent({ jogo, bundle, jogadorId, cartao }) {
    const savedAt = nowIso();
    const teamKey = getLineupTeamForPlayer(bundle, jogadorId);
    const evento = {
      id: uid(),
      jogoId: jogo.id,
      tipo: "Cartão",
      timeId: teamKey === "A" ? jogo.timeA?.id : jogo.timeB?.id,
      time: teamKey,
      jogadorId,
      assistenteId: "",
      jogadorSofreuId: "",
      minuto: getEventMinute(jogo),
      tipoGol: "",
      cartao,
      golContra: false,
      observacoes: "",
      detalhe: `Cartão ${getCardLabel(cartao)}`,
      criadoPor: getDeviceId(),
      createdAt: savedAt,
      updatedAt: savedAt,
      revision: 1,
      cancelado: false,
    };

    await putRecords({
      eventos: [evento],
      syncQueue: [createSyncQueueRecord("eventos", "upsert", evento.id, evento)],
      auditLog: [createAuditRecord("eventos", evento.id, "criar-cartao", null, evento)],
    });

    await aplicarEvolucaoPorEventos(jogadorId);

    closeLiveModal();
    state.liveMessage = `${getCardLabel(cartao)} salvo.`;
    await syncNow();
    await renderCurrentSection();
  }

  async function undoLastLiveEvent(jogoId) {
    const [jogo, eventos] = await Promise.all([
      getRecord("jogos", jogoId),
      getAllRecords("eventos"),
    ]);

    if (!jogo || jogo.status === "Finalizado") {
      state.liveMessage = "Não é possível desfazer evento de jogo finalizado.";
      await renderCurrentSection();
      return;
    }

    const lastEvent = eventos
      .filter((evento) => evento.jogoId === jogoId && !evento.cancelado)
      .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))[0];

    if (!lastEvent) {
      state.liveMessage = "Nenhum evento para desfazer.";
      await renderCurrentSection();
      return;
    }

    const savedAt = nowIso();
    const canceledEvent = {
      ...lastEvent,
      cancelado: true,
      canceladoPor: getDeviceId(),
      canceladoEm: savedAt,
      motivoCancelamento: "Desfeito na Partida ao Vivo.",
      updatedAt: savedAt,
      revision: (lastEvent.revision || 0) + 1,
    };
    const records = {
      eventos: [canceledEvent],
      syncQueue: [createSyncQueueRecord("eventos", "upsert", canceledEvent.id, canceledEvent)],
      auditLog: [createAuditRecord("eventos", canceledEvent.id, "desfazer-evento", lastEvent, canceledEvent)],
    };

    if (normalizeToken(lastEvent.tipo) === "gol") {
      const teamKey = lastEvent.time || getEventTeamKey(lastEvent, jogo);
      const placarField = teamKey === "B" ? "placarB" : "placarA";
      const updatedJogo = {
        ...jogo,
        [placarField]: Math.max(0, Number(jogo[placarField] || 0) - 1),
        updatedAt: savedAt,
        revision: (jogo.revision || 0) + 1,
      };

      records.jogos = [updatedJogo];
      records.syncQueue.push(createSyncQueueRecord("jogos", "upsert", jogo.id, updatedJogo));
      records.auditLog.push(createAuditRecord("jogos", jogo.id, "desfazer-gol", jogo, updatedJogo));
    }

    await putRecords(records);
    state.liveMessage = "Último evento desfeito.";
    await syncNow();
    await renderCurrentSection();
  }

  async function openDefensiveActionModal(jogoId) {
    const bundle = await readGameBundle(jogoId);

    if (!bundle || bundle.jogo.status === "Finalizado") {
      state.liveMessage = "Não é possível registrar ação defensiva em jogo finalizado.";
      await renderCurrentSection();
      return;
    }

    const modal = openLiveModal(
      "Desarme",
      `
        <form class="event-form" id="defensive-action-form" novalidate>
          <div class="form-errors" id="defensive-action-errors" hidden></div>

          <fieldset class="event-fieldset">
            <legend>Time do jogador *</legend>
            <div class="segmented-options">
              <label><input type="radio" name="teamKey" value="A" checked /> ${escapeHtml(teamNameFromGame(bundle.jogo, "A"))}</label>
              <label><input type="radio" name="teamKey" value="B" /> ${escapeHtml(teamNameFromGame(bundle.jogo, "B"))}</label>
            </div>
          </fieldset>

          <div class="form-grid">
            <label class="field-label">
              <span>Jogador *</span>
              <select name="jogadorId"></select>
            </label>
            <label class="field-label">
              <span>Tipo da ação *</span>
              <select name="tipoAcaoDefensiva">
                ${renderModalOptions(DEFENSIVE_ACTION_TYPES, "desarme", "Selecione")}
              </select>
            </label>
            <label class="field-label wide-field">
              <span>Observação</span>
              <textarea name="observacoes" rows="3"></textarea>
            </label>
          </div>

          <div class="form-actions">
            <button class="primary-button big-touch" type="submit">Salvar ação defensiva</button>
            <button class="ghost-button big-touch" type="button" data-modal-close>Cancelar</button>
          </div>
        </form>
      `
    );
    const form = modal.querySelector("#defensive-action-form");

    populateTeamPlayerSelect(form, bundle, "jogadorId");
    form.addEventListener("change", () => populateTeamPlayerSelect(form, bundle, "jogadorId"));
    form.addEventListener("submit", (event) => handleDefensiveActionSubmit(event, bundle.jogo.id));
  }

  function populateTeamPlayerSelect(form, bundle, selectName, filterFn = null) {
    const teamKey = form.elements.teamKey?.value || "A";
    const players = getLineupPlayers(bundle, teamKey).filter((player) => !filterFn || filterFn(player));
    const select = form.elements[selectName];
    const previousValue = select?.value || "";
    const selectedValue = players.some((player) => player.id === previousValue) ? previousValue : "";

    if (select) {
      select.innerHTML = renderPlayerOptions(players, selectedValue, "Escolha o jogador");
    }
  }

  async function handleDefensiveActionSubmit(event, jogoId) {
    event.preventDefault();

    const form = event.currentTarget;
    const bundle = await readGameBundle(jogoId);
    const jogo = bundle?.jogo;
    const teamKey = form.elements.teamKey?.value || "";
    const jogadorId = form.elements.jogadorId?.value || "";
    const tipoAcaoDefensiva = form.elements.tipoAcaoDefensiva?.value || "";
    const errors = [];

    if (!jogo || jogo.status === "Finalizado") errors.push("Não é possível registrar ação defensiva em jogo finalizado.");
    if (!["A", "B"].includes(teamKey)) errors.push("Escolha o time.");
    if (!jogadorId) errors.push("Escolha o jogador.");
    if (jogadorId && !isPlayerInTeam(bundle, jogadorId, teamKey)) {
      errors.push("Jogador deve estar escalado no time escolhido.");
    }
    if (!DEFENSIVE_ACTION_TYPES.some((item) => item.value === tipoAcaoDefensiva)) {
      errors.push("Escolha o tipo da ação defensiva.");
    }

    showFormErrors("defensive-action-errors", errors);

    if (errors.length) {
      return;
    }

    await saveDefensiveActionEvent({
      jogo,
      teamKey,
      jogadorId,
      tipoAcaoDefensiva,
      observacoes: String(form.elements.observacoes?.value || "").trim(),
    });
  }

  async function saveDefensiveActionEvent({ jogo, teamKey, jogadorId, tipoAcaoDefensiva, observacoes }) {
    const savedAt = nowIso();
    const actionLabel = getDefensiveActionLabel(tipoAcaoDefensiva);
    const evento = {
      id: uid(),
      jogoId: jogo.id,
      tipo: "Ação Defensiva",
      timeId: teamKey === "A" ? jogo.timeA?.id : jogo.timeB?.id,
      time: teamKey,
      jogadorId,
      assistenteId: "",
      jogadorSofreuId: "",
      minuto: getEventMinute(jogo),
      tipoGol: "",
      cartao: "",
      tipoAcaoDefensiva,
      tipoDefesaGoleiro: "",
      golContra: false,
      observacoes,
      detalhe: `${actionLabel} - ${teamNameFromGame(jogo, teamKey)}`,
      criadoPor: getDeviceId(),
      createdAt: savedAt,
      updatedAt: savedAt,
      revision: 1,
      cancelado: false,
    };

    await putRecords({
      eventos: [evento],
      syncQueue: [createSyncQueueRecord("eventos", "upsert", evento.id, evento)],
      auditLog: [createAuditRecord("eventos", evento.id, "criar-acao-defensiva", null, evento)],
    });

    await aplicarEvolucaoPorEventos(jogadorId);

    closeLiveModal();
    state.liveMessage = `${actionLabel} salvo.`;
    await syncNow();
    await renderCurrentSection();
  }

  async function openGoalkeeperSaveModal(jogoId) {
    const bundle = await readGameBundle(jogoId);

    if (!bundle || bundle.jogo.status === "Finalizado") {
      state.liveMessage = "Não é possível registrar defesa em jogo finalizado.";
      await renderCurrentSection();
      return;
    }

    const modal = openLiveModal(
      "Defesa Difícil",
      `
        <form class="event-form" id="goalkeeper-save-form" novalidate>
          <div class="form-errors" id="goalkeeper-save-errors" hidden></div>

          <fieldset class="event-fieldset">
            <legend>Time do goleiro *</legend>
            <div class="segmented-options">
              <label><input type="radio" name="teamKey" value="A" checked /> ${escapeHtml(teamNameFromGame(bundle.jogo, "A"))}</label>
              <label><input type="radio" name="teamKey" value="B" /> ${escapeHtml(teamNameFromGame(bundle.jogo, "B"))}</label>
            </div>
          </fieldset>

          <div class="form-grid">
            <label class="field-label">
              <span>Goleiro *</span>
              <select name="jogadorId"></select>
            </label>
            <label class="field-label">
              <span>Tipo da defesa *</span>
              <select name="tipoDefesaGoleiro">
                ${renderModalOptions(GOALKEEPER_SAVE_TYPES, "dificil", "Selecione")}
              </select>
            </label>
            <label class="field-label wide-field">
              <span>Observação</span>
              <textarea name="observacoes" rows="3"></textarea>
            </label>
          </div>

          <div class="form-actions">
            <button class="primary-button big-touch" type="submit">Salvar defesa</button>
            <button class="ghost-button big-touch" type="button" data-modal-close>Cancelar</button>
          </div>
        </form>
      `
    );
    const form = modal.querySelector("#goalkeeper-save-form");

    populateTeamPlayerSelect(form, bundle, "jogadorId", isGoalkeeperCandidate);
    form.addEventListener("change", () => populateTeamPlayerSelect(form, bundle, "jogadorId", isGoalkeeperCandidate));
    form.addEventListener("submit", (event) => handleGoalkeeperSaveSubmit(event, bundle.jogo.id));
  }

  async function handleGoalkeeperSaveSubmit(event, jogoId) {
    event.preventDefault();

    const form = event.currentTarget;
    const bundle = await readGameBundle(jogoId);
    const jogo = bundle?.jogo;
    const teamKey = form.elements.teamKey?.value || "";
    const jogadorId = form.elements.jogadorId?.value || "";
    const tipoDefesaGoleiro = form.elements.tipoDefesaGoleiro?.value || "";
    const goalkeeper = [...(bundle?.playersA || []), ...(bundle?.playersB || [])].find((player) => player.id === jogadorId);
    const errors = [];

    if (!jogo || jogo.status === "Finalizado") errors.push("Não é possível registrar defesa em jogo finalizado.");
    if (!["A", "B"].includes(teamKey)) errors.push("Escolha o time.");
    if (!jogadorId) errors.push("Escolha o goleiro.");
    if (jogadorId && !isPlayerInTeam(bundle, jogadorId, teamKey)) {
      errors.push("Goleiro deve estar escalado no time escolhido.");
    }
    if (jogadorId && goalkeeper && !isGoalkeeperCandidate(goalkeeper)) {
      errors.push("Escolha um jogador cadastrado como goleiro ou GK.");
    }
    if (!GOALKEEPER_SAVE_TYPES.some((item) => item.value === tipoDefesaGoleiro)) {
      errors.push("Escolha o tipo da defesa.");
    }

    showFormErrors("goalkeeper-save-errors", errors);

    if (errors.length) {
      return;
    }

    await saveGoalkeeperSaveEvent({
      jogo,
      teamKey,
      jogadorId,
      tipoDefesaGoleiro,
      observacoes: String(form.elements.observacoes?.value || "").trim(),
    });
  }

  async function saveGoalkeeperSaveEvent({ jogo, teamKey, jogadorId, tipoDefesaGoleiro, observacoes }) {
    const savedAt = nowIso();
    const saveLabel = getGoalkeeperSaveLabel(tipoDefesaGoleiro);
    const saveMessage = tipoDefesaGoleiro === "penalti"
      ? "Defesa de pênalti"
      : tipoDefesaGoleiro === "dificil"
        ? "Defesa difícil"
        : `Defesa ${saveLabel.toLowerCase()}`;
    const evento = {
      id: uid(),
      jogoId: jogo.id,
      tipo: "Defesa Goleiro",
      timeId: teamKey === "A" ? jogo.timeA?.id : jogo.timeB?.id,
      time: teamKey,
      jogadorId,
      assistenteId: "",
      jogadorSofreuId: "",
      minuto: getEventMinute(jogo),
      tipoGol: "",
      cartao: "",
      tipoAcaoDefensiva: "",
      tipoDefesaGoleiro,
      golContra: false,
      observacoes,
      detalhe: `${saveMessage} - ${teamNameFromGame(jogo, teamKey)}`,
      criadoPor: getDeviceId(),
      createdAt: savedAt,
      updatedAt: savedAt,
      revision: 1,
      cancelado: false,
    };

    await putRecords({
      eventos: [evento],
      syncQueue: [createSyncQueueRecord("eventos", "upsert", evento.id, evento)],
      auditLog: [createAuditRecord("eventos", evento.id, "criar-defesa-goleiro", null, evento)],
    });

    await aplicarEvolucaoPorEventos(jogadorId);

    closeLiveModal();
    state.liveMessage = `${saveMessage} salva.`;
    await syncNow();
    await renderCurrentSection();
  }

  async function addProvisionalGoal(jogoId, teamKey) {
    if (!["A", "B"].includes(teamKey)) {
      return;
    }

    const jogo = await getRecord("jogos", jogoId);

    if (!jogo || jogo.status !== "Em andamento") {
      return;
    }

    const savedAt = nowIso();
    const placarField = teamKey === "A" ? "placarA" : "placarB";
    const updatedJogo = {
      ...jogo,
      [placarField]: Number(jogo[placarField] || 0) + 1,
      updatedAt: savedAt,
      revision: (jogo.revision || 0) + 1,
    };
    const evento = {
      id: uid(),
      jogoId,
      tipo: "gol",
      jogadorId: "",
      assistenteId: "",
      timeId: teamKey === "A" ? jogo.timeA?.id : jogo.timeB?.id,
      time: teamKey,
      minuto: Math.min(DEFAULT_RULES.duracaoJogoMinutos, Math.floor(getElapsedGameSeconds(jogo) / 60) + 1),
      detalhe: `Gol provisorio - ${teamNameFromGame(jogo, teamKey)}`,
      criadoPor: getDeviceId(),
      createdAt: savedAt,
      updatedAt: savedAt,
      revision: 1,
      provisorio: true,
      cancelado: false,
    };

    await putRecords({
      jogos: [updatedJogo],
      eventos: [evento],
      syncQueue: [
        createSyncQueueRecord("jogos", "upsert", jogoId, updatedJogo),
        createSyncQueueRecord("eventos", "upsert", evento.id, evento),
      ],
      auditLog: [createAuditRecord("jogos", jogoId, "gol-provisorio", jogo, { jogo: updatedJogo, evento })],
    });

    state.liveMessage = `Gol para ${teamNameFromGame(updatedJogo, teamKey)}.`;
    await syncNow();

    if (Number(updatedJogo[placarField] || 0) >= GOALS_TO_END_GAME) {
      await finalizeGame(jogoId, "2 gols");
      return;
    }

    await renderCurrentSection();
  }

  async function pauseGame(jogoId) {
    const jogo = await getRecord("jogos", jogoId);

    if (!jogo || jogo.status !== "Em andamento" || jogo.pausadoEm) {
      return;
    }

    const savedAt = nowIso();
    const updatedJogo = {
      ...jogo,
      pausadoEm: savedAt,
      updatedAt: savedAt,
      revision: (jogo.revision || 0) + 1,
    };

    await putRecords({
      jogos: [updatedJogo],
      syncQueue: [createSyncQueueRecord("jogos", "upsert", jogoId, updatedJogo)],
      auditLog: [createAuditRecord("jogos", jogoId, "pausar", jogo, updatedJogo)],
    });

    state.liveMessage = "Jogo pausado.";
    await syncNow();
    await renderCurrentSection();
  }

  async function resumeGame(jogoId) {
    const jogo = await getRecord("jogos", jogoId);

    if (!jogo || jogo.status !== "Em andamento" || !jogo.pausadoEm) {
      return;
    }

    const savedAt = nowIso();
    const pausedMs = Math.max(0, new Date(savedAt).getTime() - new Date(jogo.pausadoEm).getTime());
    const updatedJogo = {
      ...jogo,
      pausadoEm: "",
      totalPausadoMs: Number(jogo.totalPausadoMs || 0) + pausedMs,
      updatedAt: savedAt,
      revision: (jogo.revision || 0) + 1,
    };

    await putRecords({
      jogos: [updatedJogo],
      syncQueue: [createSyncQueueRecord("jogos", "upsert", jogoId, updatedJogo)],
      auditLog: [createAuditRecord("jogos", jogoId, "retomar", jogo, updatedJogo)],
    });

    state.liveMessage = "Jogo retomado.";
    await syncNow();
    await renderCurrentSection();
  }

  async function finalizeGame(jogoId, formaEncerramento) {
    const jogo = await getRecord("jogos", jogoId);

    if (!jogo || jogo.status === "Finalizado") {
      return;
    }

    const savedAt = nowIso();
    const pausedMs = jogo.pausadoEm
      ? Math.max(0, new Date(savedAt).getTime() - new Date(jogo.pausadoEm).getTime())
      : 0;
    const finalJogo = {
      ...jogo,
      status: "Finalizado",
      fim: savedAt,
      formaEncerramento,
      vencedor: getGameWinner(jogo),
      pausadoEm: "",
      totalPausadoMs: Number(jogo.totalPausadoMs || 0) + pausedMs,
      updatedAt: savedAt,
      revision: (jogo.revision || 0) + 1,
    };
    const escalacoes = (await getAllRecords("escalacoes")).filter(
      (escalacao) => escalacao.jogoId === jogoId
    );
    const statsRecords = await buildResultStats(finalJogo, escalacoes);

    await putRecords({
      jogos: [finalJogo],
      estatisticasCache: statsRecords,
      syncQueue: [
        createSyncQueueRecord("jogos", "upsert", jogoId, finalJogo),
        ...statsRecords.map((record) =>
          createSyncQueueRecord("estatisticasCache", "upsert", record.id, record)
        ),
      ],
      auditLog: [createAuditRecord("jogos", jogoId, "finalizar", jogo, { jogo: finalJogo, estatisticas: statsRecords })],
    });

    for (const playerId of [...new Set(escalacoes.map((escalacao) => escalacao.jogadorId))]) {
      await aplicarEvolucaoPorEventos(playerId);
    }

    stopLiveTimer();
    setActiveGameId(null);
    state.selectedGameSummaryId = jogoId;
    state.liveMessage = `Jogo finalizado por ${formaEncerramento}.`;
    await syncNow();
    await refreshCurrentView();
  }

  async function buildResultStats(jogo, escalacoes) {
    const existingStats = await getAllRecords("estatisticasCache");
    const byId = new Map(existingStats.map((record) => [record.id, record]));
    const savedAt = nowIso();

    return escalacoes.map((escalacao) => {
      const id = `temporada-atual:${escalacao.jogadorId}`;
      const existing = byId.get(id) || {
        id,
        jogadorId: escalacao.jogadorId,
        temporadaId: "temporada-atual",
        metricas: {},
        revision: 0,
      };
      const resultadosPorJogo = {
        ...(existing.metricas?.resultadosPorJogo || {}),
        [jogo.id]: getGameResultForTeam(jogo, escalacao.time),
      };
      const results = Object.values(resultadosPorJogo);
      const vitorias = results.filter((result) => result === "vitoria").length;
      const derrotas = results.filter((result) => result === "derrota").length;
      const empates = results.filter((result) => result === "empate").length;
      const jogos = results.length;

      return {
        ...existing,
        metricas: {
          ...(existing.metricas || {}),
          jogos,
          vitorias,
          derrotas,
          empates,
          aproveitamento: jogos ? Math.round(((vitorias * 3 + empates) / (jogos * 3)) * 100) : 0,
          resultadosPorJogo,
        },
        updatedAt: savedAt,
        revision: (existing.revision || 0) + 1,
      };
    });
  }

  async function renderStatsSection() {
    const statsResult = await calcularEstatisticasJogadores();
    const selectedProfile = state.selectedStatsPlayerId
      ? statsResult.playersStats.find((item) => item.jogadorId === state.selectedStatsPlayerId)
      : null;

    setSectionTitle("Ranking", selectedProfile ? "Perfil do jogador" : "Estatísticas");

    $("#section-content").innerHTML = selectedProfile
      ? renderPlayerStatsProfile(selectedProfile, statsResult)
      : renderStatsDashboard(statsResult);

    bindStatsSectionEvents(statsResult);
  }

  function renderStatsDashboard(statsResult) {
    return `
      <div class="stats-layout">
        ${renderStatsFilters(statsResult)}
        ${renderManualEvolutionCard(statsResult.jogadores)}
        ${renderStatsSummary(statsResult.summary)}
        ${renderLeaderCards(statsResult.playersStats)}
        ${renderMainRanking(statsResult)}
        <section class="ranking-grid">
          ${renderRankingList("Artilharia", statsResult.playersStats, "gols")}
          ${renderRankingList("Assistências", statsResult.playersStats, "assistencias")}
          ${renderRankingList("Participações em gol", statsResult.playersStats, "participacoesGol")}
          ${renderRankingList("Vitórias", statsResult.playersStats, "vitorias")}
          ${renderRankingList("Aproveitamento", statsResult.playersStats, "aproveitamento")}
          ${renderRankingList("Jogos disputados", statsResult.playersStats, "jogos")}
          ${renderRankingList("Gols por jogo", statsResult.playersStats, "golsPorJogo")}
          ${renderRankingList("Assistências por jogo", statsResult.playersStats, "assistenciasPorJogo")}
          ${renderRankingList("Faltas cometidas", statsResult.playersStats, "faltasCometidas")}
          ${renderRankingList("Faltas sofridas", statsResult.playersStats, "faltasSofridas")}
          ${renderRankingList("Ações defensivas", statsResult.playersStats, "acoesDefensivas")}
          ${renderRankingList("Desarmes", statsResult.playersStats, "desarmes")}
          ${renderRankingList("Interceptações", statsResult.playersStats, "interceptacoes")}
          ${renderRankingList("Bloqueios", statsResult.playersStats, "bloqueios")}
          ${renderRankingList("Cortes", statsResult.playersStats, "cortes")}
          ${renderRankingList("Defesas difíceis", statsResult.playersStats, "defesasDificeis")}
          ${renderRankingList("Defesas de pênalti", statsResult.playersStats, "defesasPenalti")}
          ${renderRankingList("Cartões", statsResult.playersStats, "cartoesTotal", "cartoesDetalhe")}
          ${renderSpecialGoalsRanking(statsResult.playersStats)}
          ${renderRankingList("MVPs da Pelada", statsResult.playersStats, "mvpsPelada")}
          ${renderRankingList("Bagres da Pelada", statsResult.playersStats, "bagresPelada")}
        </section>
      </div>
    `;
  }

  function renderManualEvolutionCard(jogadores, selectedPlayerId = "") {
    const sortedPlayers = [...jogadores].sort((a, b) =>
      playerDisplayName(a).localeCompare(playerDisplayName(b), "pt-BR")
    );
    const selectedPlayer = sortedPlayers.find((jogador) => jogador.id === selectedPlayerId) || sortedPlayers[0] || null;

    return `
      <section class="data-card evolution-card">
        <div class="section-heading-inline">
          <div>
            <span class="panel-kicker">Cartinhas</span>
            <h3>Evolução manual</h3>
            <p>Ajuste atributos quando uma avaliação da rodada precisar corrigir a carta.</p>
          </div>
        </div>
        <form class="evolution-form" id="manual-evolution-form" novalidate>
          <div class="form-errors" id="manual-evolution-errors" hidden></div>
          ${state.evolutionMessage ? `<p class="form-feedback">${escapeHtml(state.evolutionMessage)}</p>` : ""}
          <label class="field-label">
            <span>Jogador</span>
            <select name="jogadorId" ${sortedPlayers.length ? "" : "disabled"}>
              ${sortedPlayers.length
                ? sortedPlayers
                    .map(
                      (jogador) => `
                        <option value="${escapeHtml(jogador.id)}" ${jogador.id === selectedPlayer?.id ? "selected" : ""}>
                          ${escapeHtml(playerDisplayName(jogador))} - ${escapeHtml(jogador.posicaoPrincipal || "-")}
                        </option>
                      `
                    )
                    .join("")
                : `<option value="">Cadastre jogadores primeiro</option>`}
            </select>
          </label>
          <label class="field-label">
            <span>Atributo</span>
            <select name="atributo" ${selectedPlayer ? "" : "disabled"}>
              ${selectedPlayer ? renderEvolutionAttributeOptions(selectedPlayer) : `<option value="">Sem atributos</option>`}
            </select>
          </label>
          <label class="field-label">
            <span>Variação</span>
            <input type="number" name="variacao" min="-10" max="10" step="1" value="1" ${selectedPlayer ? "" : "disabled"} />
          </label>
          <label class="field-label wide-field">
            <span>Motivo</span>
            <input type="text" name="motivo" placeholder="Ex.: 2 assistências na rodada" ${selectedPlayer ? "" : "disabled"} />
          </label>
          <button class="primary-button" type="submit" ${selectedPlayer ? "" : "disabled"}>Salvar evolução</button>
        </form>
      </section>
    `;
  }

  function renderEvolutionAttributeOptions(jogador, selectedValue = "") {
    return getActiveAttributeDefinitions(jogador?.tipoJogador, jogador?.posicaoPrincipal)
      .map(
        (attribute) => `
          <option value="${escapeHtml(attribute.key)}" ${attribute.key === selectedValue ? "selected" : ""}>
            ${escapeHtml(attribute.label)}
          </option>
        `
      )
      .join("");
  }

  function renderStatsFilters(statsResult) {
    const filters = state.statsFilters;
    const periodo = filters.periodo || (filters.peladaId ? "pelada" : filters.month ? "month" : "all");
    const sortedPlayers = [...statsResult.jogadores].sort((a, b) =>
      playerDisplayName(a).localeCompare(playerDisplayName(b), "pt-BR")
    );

    return `
      <section class="data-card stats-filter-card">
        <form class="stats-filter-form" id="stats-filter-form">
          <label class="field-label">
            <span>Período</span>
            <select name="periodo">
              <option value="all" ${periodo === "all" ? "selected" : ""}>Todos os tempos</option>
              <option value="pelada" ${periodo === "pelada" ? "selected" : ""}>Por pelada</option>
              <option value="month" ${periodo === "month" ? "selected" : ""}>Por mês</option>
              <option value="season" disabled>Por temporada (em breve)</option>
            </select>
          </label>
          <label class="field-label">
            <span>Pelada</span>
            <select name="peladaId">
              <option value="">Todas</option>
              ${statsResult.peladas
                .map(
                  (pelada) => `
                    <option value="${escapeHtml(pelada.id)}" ${pelada.id === filters.peladaId ? "selected" : ""}>
                      ${escapeHtml(formatDateLabel(pelada.data))} - ${escapeHtml(pelada.local || "Pelada")}
                    </option>
                  `
                )
                .join("")}
            </select>
          </label>
          <label class="field-label">
            <span>Mês</span>
            <input type="month" name="month" value="${escapeHtml(filters.month || "")}" />
          </label>
          <label class="field-label">
            <span>Jogador</span>
            <select name="jogadorId">
              <option value="">Todos</option>
              ${sortedPlayers
                .map(
                  (jogador) => `
                    <option value="${escapeHtml(jogador.id)}" ${jogador.id === filters.jogadorId ? "selected" : ""}>
                      ${escapeHtml(playerDisplayName(jogador))}
                    </option>
                  `
                )
                .join("")}
            </select>
          </label>
          <label class="field-label">
            <span>Posição</span>
            <select name="posicao">
              ${renderOptions(PLAYER_POSITIONS, filters.posicao || "", "Todas")}
            </select>
          </label>
          <label class="field-label">
            <span>Ordenar ranking</span>
            <select name="sortBy">
              ${renderMetricOptions(filters.sortBy)}
            </select>
          </label>
        </form>
      </section>
    `;
  }

  function renderMetricOptions(selected) {
    const options = [
      ["gols", "Gols"],
      ["assistencias", "Assistências"],
      ["participacoesGol", "G/A"],
      ["vitorias", "Vitórias"],
      ["aproveitamento", "Aproveitamento"],
      ["jogos", "Jogos"],
      ["golsPorJogo", "Gols por jogo"],
      ["assistenciasPorJogo", "Assistências por jogo"],
      ["faltasCometidas", "Faltas cometidas"],
      ["acoesDefensivas", "Ações defensivas"],
      ["desarmes", "Desarmes"],
      ["interceptacoes", "Interceptações"],
      ["bloqueios", "Bloqueios"],
      ["cortes", "Cortes"],
      ["defesasDificeis", "Defesas difíceis"],
      ["defesasPenalti", "Defesas de pênalti"],
      ["cartoesTotal", "Cartões"],
      ["mvpsPelada", "MVPs da Pelada"],
      ["bagresPelada", "Bagres da Pelada"],
    ];

    return options
      .map(
        ([value, label]) =>
          `<option value="${value}" ${value === selected ? "selected" : ""}>${label}</option>`
      )
      .join("");
  }

  function renderStatsSummary(summary) {
    const items = [
      ["Jogadores", summary.totalJogadores],
      ["Peladas", summary.totalPeladas],
      ["Jogos finalizados", summary.totalJogosFinalizados],
      ["Gols", summary.totalGols],
      ["Assistências", summary.totalAssistencias],
      ["Faltas", summary.totalFaltas],
      ["Ações defensivas", summary.totalAcoesDefensivas],
      ["Defesas difíceis", summary.totalDefesasDificeis],
      ["Média gols/jogo", formatAverage(summary.mediaGolsPorJogo)],
    ];

    return `
      <section class="stats-summary-grid">
        ${items
          .map(
            ([label, value]) => `
              <article class="metric-card">
                <span class="metric-label">${escapeHtml(label)}</span>
                <strong>${escapeHtml(value)}</strong>
              </article>
            `
          )
          .join("")}
      </section>
    `;
  }

  function renderLeaderCards(playersStats) {
    const leaders = [
      ["Artilheiro", topStats(playersStats, "gols"), "gols"],
      ["Garçom", topStats(playersStats, "assistencias"), "assistencias"],
      ["Maior G/A", topStats(playersStats, "participacoesGol"), "participacoesGol"],
      ["Mais vitórias", topStats(playersStats, "vitorias"), "vitorias"],
      ["Melhor aproveitamento", topStats(playersStats, "aproveitamento", true), "aproveitamento"],
      ["Mais faltas cometidas", topStats(playersStats, "faltasCometidas"), "faltasCometidas"],
      ["Mais ações defensivas", topStats(playersStats, "acoesDefensivas"), "acoesDefensivas"],
    ];

    return `
      <section class="leader-grid">
        ${leaders
          .map(([title, stats, metric]) => renderLeaderCard(title, stats, metric))
          .join("")}
      </section>
    `;
  }

  function topStats(playersStats, metric, requireGames = false) {
    return sortStats(playersStats, metric).find((stats) => !requireGames || stats.jogos > 0) || null;
  }

  function renderLeaderCard(title, stats, metric) {
    if (!stats || Number(stats[metric] || 0) <= 0) {
      return `
        <article class="leader-card">
          <span class="metric-label">${escapeHtml(title)}</span>
          <strong>Sem dados</strong>
        </article>
      `;
    }

    return `
      <button class="leader-card" type="button" data-stats-action="profile" data-player-id="${escapeHtml(stats.jogadorId)}">
        ${renderPlayerAvatar(stats.jogador, "player-avatar small")}
        <span>
          <span class="metric-label">${escapeHtml(title)}</span>
          <strong>${escapeHtml(playerDisplayName(stats.jogador))}</strong>
          <small>${escapeHtml(metricLabel(metric, stats[metric], stats))}</small>
        </span>
      </button>
    `;
  }

  async function renderRankingSection() {
    const statsResult = await calcularEstatisticasJogadores({
      periodo: "all",
      peladaId: "",
      month: "",
      temporadaId: "",
      jogadorId: "",
      posicao: "",
      sortBy: "gols",
    });

    setSectionTitle("Ranking", "Ranking");
    $("#section-content").innerHTML = renderRankingOverview(statsResult);
    bindRankingSectionEvents();
  }

  function renderRankingOverview(statsResult) {
    const podium = [
      ["Maior Overall", getOverallRankingEntries(statsResult, 1)[0]],
      ["Artilheiro", getMetricRankingEntries(statsResult.playersStats, "gols", { limit: 1 })[0]],
      ["Garçom", getMetricRankingEntries(statsResult.playersStats, "assistencias", { limit: 1 })[0]],
      [
        "Melhor aproveitamento",
        getMetricRankingEntries(statsResult.playersStats, "aproveitamento", {
          limit: 1,
          requireGames: true,
        })[0],
      ],
    ];
    const metricRankings = [
      ["Maior Overall", getOverallRankingEntries(statsResult)],
      ["Artilharia", getMetricRankingEntries(statsResult.playersStats, "gols")],
      ["Assistências", getMetricRankingEntries(statsResult.playersStats, "assistencias")],
      ["Participações em gol", getMetricRankingEntries(statsResult.playersStats, "participacoesGol")],
      ["Mais vitórias", getMetricRankingEntries(statsResult.playersStats, "vitorias")],
      [
        "Melhor aproveitamento",
        getMetricRankingEntries(statsResult.playersStats, "aproveitamento", { requireGames: true }),
      ],
      ["Mais jogos", getMetricRankingEntries(statsResult.playersStats, "jogos")],
      [
        "Melhor média de gols",
        getMetricRankingEntries(statsResult.playersStats, "golsPorJogo", { requireGames: true }),
      ],
      ["Mais faltas cometidas", getMetricRankingEntries(statsResult.playersStats, "faltasCometidas")],
      ["Mais faltas sofridas", getMetricRankingEntries(statsResult.playersStats, "faltasSofridas")],
      ["Mais ações defensivas", getMetricRankingEntries(statsResult.playersStats, "acoesDefensivas")],
      ["Mais desarmes", getMetricRankingEntries(statsResult.playersStats, "desarmes")],
      ["Mais bloqueios", getMetricRankingEntries(statsResult.playersStats, "bloqueios")],
      ["Defesas difíceis", getMetricRankingEntries(statsResult.playersStats, "defesasDificeis")],
      ["MVPs da Pelada", getMetricRankingEntries(statsResult.playersStats, "mvpsPelada")],
      ["Bagres da Pelada", getMetricRankingEntries(statsResult.playersStats, "bagresPelada")],
    ];
    const lineAttributeRankings = LINE_ATTRIBUTES.map((attribute) => [
      `Maior ${attribute.label}`,
      getAttributeRankingEntries(statsResult, attribute.key),
    ]);
    const goalkeeperRankings = GOALKEEPER_ATTRIBUTES.map((attribute) => [
      `Maior ${attribute.label}`,
      getAttributeRankingEntries(statsResult, attribute.key),
    ]);

    return `
      <div class="ranking-page">
        <section class="data-card ranking-podium-section">
          <div class="players-toolbar">
            <div>
              <span class="panel-kicker">Top da pelada</span>
              <h3>Pódio Geral</h3>
              <p>Resumo rápido dos líderes usando as estatísticas e cartas já salvas.</p>
            </div>
          </div>
          <div class="ranking-podium-grid">
            ${podium.map(([title, entry]) => renderPodiumCard(title, entry)).join("")}
          </div>
        </section>

        <section class="ranking-board-grid">
          ${metricRankings.map(([title, entries]) => renderTopRankingCard(title, entries)).join("")}
        </section>

        <section class="ranking-group-card">
          <div class="players-toolbar">
            <div>
              <span class="panel-kicker">Cartinhas</span>
              <h3>Rankings por atributo</h3>
            </div>
          </div>
          <div class="ranking-board-grid">
            ${lineAttributeRankings.map(([title, entries]) => renderTopRankingCard(title, entries)).join("")}
          </div>
        </section>

        <section class="ranking-group-card">
          <div class="players-toolbar">
            <div>
              <span class="panel-kicker">Goleiros</span>
              <h3>Rankings de goleiro</h3>
            </div>
          </div>
          <div class="ranking-board-grid">
            ${goalkeeperRankings.map(([title, entries]) => renderTopRankingCard(title, entries)).join("")}
          </div>
        </section>
      </div>
    `;
  }

  function getOverallRankingEntries(statsResult, limit = 3) {
    return statsResult.playersStats
      .filter((stats) => stats.jogador)
      .sort((a, b) =>
        Number(b.jogador.overall || 0) - Number(a.jogador.overall || 0) ||
        playerDisplayName(a.jogador).localeCompare(playerDisplayName(b.jogador), "pt-BR")
      )
      .slice(0, limit)
      .map((stats) => ({
        stats,
        value: `${stats.jogador.overall || 0} OVR`,
      }));
  }

  function getMetricRankingEntries(playersStats, metric, options = {}) {
    const limit = options.limit || 3;
    const allowZero = Boolean(options.allowZero);
    const requireGames = Boolean(options.requireGames);

    return sortStats(playersStats, metric)
      .filter((stats) => {
        if (!stats.jogador) return false;
        if (requireGames && !Number(stats.jogos || 0)) return false;
        if (allowZero) return true;
        return Number(stats[metric] || 0) > 0;
      })
      .slice(0, limit)
      .map((stats) => ({
        stats,
        value: statDisplayValue(stats, metric),
      }));
  }

  function getAttributeRankingEntries(statsResult, attributeKey, limit = 3) {
    return statsResult.playersStats
      .filter((stats) => {
        const jogador = stats.jogador;
        return jogador && getActiveAttributeKeys(jogador.tipoJogador, jogador.posicaoPrincipal).includes(attributeKey);
      })
      .sort((a, b) => {
        const aValue = normalizeAttributeValue(a.jogador.attributes?.[attributeKey]);
        const bValue = normalizeAttributeValue(b.jogador.attributes?.[attributeKey]);

        return bValue - aValue || playerDisplayName(a.jogador).localeCompare(playerDisplayName(b.jogador), "pt-BR");
      })
      .slice(0, limit)
      .map((stats) => ({
        stats,
        value: `${normalizeAttributeValue(stats.jogador.attributes?.[attributeKey])} ${getAttributeLabel(attributeKey)}`,
      }));
  }

  function renderPodiumCard(title, entry) {
    if (!entry) {
      return `
        <article class="ranking-podium-card is-empty">
          <span class="metric-label">${escapeHtml(title)}</span>
          <strong>Sem dados</strong>
        </article>
      `;
    }

    const { stats, value } = entry;
    const jogador = stats.jogador;

    return `
      <button class="ranking-podium-card" type="button" data-ranking-action="profile" data-player-id="${escapeHtml(stats.jogadorId)}">
        ${renderPlayerAvatar(jogador, "player-avatar large")}
        <span>
          <span class="metric-label">${escapeHtml(title)}</span>
          <strong>${escapeHtml(playerDisplayName(jogador))}</strong>
          <small>${escapeHtml(jogador.posicaoPrincipal || "-")} - ${escapeHtml(jogador.overall || "-")} OVR</small>
          <em>${escapeHtml(value)}</em>
        </span>
      </button>
    `;
  }

  function renderTopRankingCard(title, entries) {
    return `
      <section class="data-card top-ranking-card">
        <div>
          <span class="panel-kicker">Top 3</span>
          <h3>${escapeHtml(title)}</h3>
        </div>
        ${renderTopRankingRows(entries)}
      </section>
    `;
  }

  function renderTopRankingRows(entries) {
    if (!entries.length) {
      return `<div class="empty-state compact-empty"><p>Sem dados para este ranking.</p></div>`;
    }

    return `
      <div class="ranking-mini-list">
        ${entries.map((entry, index) => renderTopRankingRow(entry, index + 1)).join("")}
      </div>
    `;
  }

  function renderTopRankingRow(entry, position) {
    const { stats, value } = entry;
    const jogador = stats.jogador;

    return `
      <button class="ranking-mini-row" type="button" data-ranking-action="profile" data-player-id="${escapeHtml(stats.jogadorId)}">
        <span class="ranking-position">${position}º</span>
        ${renderPlayerAvatar(jogador, "player-avatar small")}
        <span class="ranking-player">
          <strong>${escapeHtml(playerDisplayName(jogador))}</strong>
          <small>${escapeHtml(jogador.posicaoPrincipal || "-")} - ${escapeHtml(jogador.overall || "-")} OVR</small>
        </span>
        <strong class="ranking-value">${escapeHtml(value)}</strong>
      </button>
    `;
  }

  function bindRankingSectionEvents() {
    const root = $("#section-content");

    if (!root) {
      return;
    }

    root.onclick = async (event) => {
      const actionButton = event.target.closest("[data-ranking-action]");

      if (!actionButton) {
        return;
      }

      if (actionButton.dataset.rankingAction === "profile") {
        state.selectedStatsPlayerId = actionButton.dataset.playerId || null;
        await switchSection("estatisticas");
      }
    };
  }

  function renderMainRanking(statsResult) {
    const metric = state.statsFilters.sortBy || "gols";
    const sorted = sortStats(statsResult.playersStats, metric);

    return `
      <section class="data-card ranking-main-card">
        <div class="players-toolbar">
          <div>
            <span class="panel-kicker">Ranking principal</span>
            <h3>${escapeHtml(metricTitle(metric))}</h3>
          </div>
        </div>
        ${renderRankingRows(sorted, metric)}
      </section>
    `;
  }

  function renderRankingList(title, playersStats, metric, displayMetric = metric) {
    return `
      <section class="data-card ranking-card">
        <h3>${escapeHtml(title)}</h3>
        ${renderRankingRows(sortStats(playersStats, metric).slice(0, 8), displayMetric, metric)}
      </section>
    `;
  }

  function renderSpecialGoalsRanking(playersStats) {
    const sorted = [...playersStats].sort(
      (a, b) =>
        b.golsPenalti + b.golsFalta + b.golsCabeca + b.golsContra -
          (a.golsPenalti + a.golsFalta + a.golsCabeca + a.golsContra) ||
        playerDisplayName(a.jogador).localeCompare(playerDisplayName(b.jogador), "pt-BR")
    );

    return `
      <section class="data-card ranking-card">
        <h3>Gols especiais</h3>
        ${renderRankingRows(sorted.slice(0, 8), "golsEspeciais")}
      </section>
    `;
  }

  function renderRankingRows(playersStats, displayMetric, sortMetric = displayMetric) {
    const nonEmpty = playersStats.filter((stats) => stats.jogos > 0 || Number(stats[sortMetric] || 0) > 0);

    if (!nonEmpty.length) {
      return `<div class="empty-state compact-empty"><p>Sem dados para este ranking.</p></div>`;
    }

    return `
      <div class="ranking-list">
        ${nonEmpty
          .map((stats, index) => renderRankingRow(stats, index + 1, displayMetric))
          .join("")}
      </div>
    `;
  }

  function renderRankingRow(stats, position, metric) {
    return `
      <button class="ranking-row" type="button" data-stats-action="profile" data-player-id="${escapeHtml(stats.jogadorId)}">
        <span class="ranking-position">${position}º</span>
        ${renderPlayerAvatar(stats.jogador, "player-avatar small")}
        <span class="ranking-player">
          <strong>${escapeHtml(playerDisplayName(stats.jogador))}</strong>
          <small>${escapeHtml(stats.jogador.posicaoPrincipal || "-")} - ${escapeHtml(stats.jogador.overall || "-")} OVR</small>
        </span>
        <strong class="ranking-value">${escapeHtml(statDisplayValue(stats, metric))}</strong>
      </button>
    `;
  }

  function statDisplayValue(stats, metric) {
    if (metric === "golsEspeciais") {
      return `${stats.golsPenalti} PEN / ${stats.golsFalta} FAL / ${stats.golsCabeca} CAB / ${stats.golsContra} GC`;
    }

    if (metric === "cartoesDetalhe") {
      return metricLabel(metric, stats.cartoesTotal, stats);
    }

    return metricLabel(metric, stats[metric] || 0, stats);
  }

  function metricTitle(metric) {
    const titles = {
      gols: "Artilharia",
      assistencias: "Assistências",
      participacoesGol: "Participações em gol",
      vitorias: "Vitórias",
      aproveitamento: "Aproveitamento",
      jogos: "Jogos disputados",
      golsPorJogo: "Gols por jogo",
      assistenciasPorJogo: "Assistências por jogo",
      faltasCometidas: "Faltas cometidas",
      acoesDefensivas: "Ações defensivas",
      desarmes: "Desarmes",
      interceptacoes: "Interceptações",
      bloqueios: "Bloqueios",
      cortes: "Cortes",
      defesasDificeis: "Defesas difíceis",
      defesasPenalti: "Defesas de pênalti",
      cartoesTotal: "Cartões",
      mvpsPelada: "MVPs da Pelada",
      bagresPelada: "Bagres da Pelada",
    };

    return titles[metric] || "Ranking";
  }

  function sortStats(playersStats, metric) {
    return [...playersStats].sort((a, b) => {
      const diff = Number(b[metric] || 0) - Number(a[metric] || 0);
      if (diff) return diff;
      const gamesDiff = Number(b.jogos || 0) - Number(a.jogos || 0);
      if (gamesDiff) return gamesDiff;
      return playerDisplayName(a.jogador).localeCompare(playerDisplayName(b.jogador), "pt-BR");
    });
  }

  function renderPlayerStatsProfile(stats, statsResult) {
    const jogador = stats.jogador;
    const activeDefinitions = getActiveAttributeDefinitions(jogador.tipoJogador, jogador.posicaoPrincipal);

    return `
      <div class="stats-profile">
        <section class="data-card profile-hero">
          <button class="ghost-button compact-button" type="button" data-stats-action="back">Voltar aos rankings</button>
          <div class="profile-hero-main">
            ${renderPlayerAvatar(jogador, "player-avatar large")}
            <div>
              <span class="panel-kicker">${escapeHtml(jogador.posicaoPrincipal || "-")} - ${escapeHtml(jogador.tipoJogador || "Linha")}</span>
              <h3>${escapeHtml(playerDisplayName(jogador))}</h3>
              <p>${escapeHtml(jogador.nome || "")}</p>
              <div class="profile-tags">
                <span>${escapeHtml(jogador.peForte || "-")}</span>
                <span>${escapeHtml(jogador.overall || "-")} OVR</span>
                <span>${escapeHtml(starsText(jogador.estrelas || 1))}</span>
              </div>
            </div>
          </div>
        </section>

        ${renderManualEvolutionCard(statsResult.jogadores, jogador.id)}

        <section class="profile-grid">
          <article class="data-card">
            <h3>Atributos</h3>
            <div class="attribute-bars">
              ${activeDefinitions
                .map((attribute) => {
                  const value = normalizeAttributeValue(jogador.attributes?.[attribute.key]);
                  return `
                    <div class="attribute-bar">
                      <span>${escapeHtml(attribute.label)}</span>
                      <meter min="1" max="99" value="${value}"></meter>
                      <strong>${value}</strong>
                    </div>
                  `;
                })
                .join("")}
            </div>
          </article>

          <article class="data-card">
            <h3>Resumo competitivo</h3>
            ${renderProfileMetricGrid(stats, [
              ["Jogos", "jogos"],
              ["Vitórias", "vitorias"],
              ["Empates", "empates"],
              ["Derrotas", "derrotas"],
              ["Aproveitamento", "aproveitamento"],
              ["Gols", "gols"],
              ["Assistências", "assistencias"],
              ["G/A", "participacoesGol"],
              ["Gols por jogo", "golsPorJogo"],
              ["Assistências por jogo", "assistenciasPorJogo"],
              ["G/A por jogo", "gaPorJogo"],
            ])}
          </article>

          <article class="data-card">
            <h3>Disciplina e especiais</h3>
            ${renderProfileMetricGrid(stats, [
              ["Faltas cometidas", "faltasCometidas"],
              ["Faltas sofridas", "faltasSofridas"],
              ["Amarelos", "cartoesAmarelos"],
              ["Vermelhos", "cartoesVermelhos"],
              ["Gols de pênalti", "golsPenalti"],
              ["Gols de falta", "golsFalta"],
              ["Gols de cabeça", "golsCabeca"],
              ["Gols contra", "golsContra"],
              ["MVPs da Pelada", "mvpsPelada"],
              ["Bagres da Pelada", "bagresPelada"],
            ])}
          </article>

          <article class="data-card">
            <h3>Defesa e goleiro</h3>
            ${renderProfileMetricGrid(stats, [
              ["Ações defensivas", "acoesDefensivas"],
              ["Desarmes", "desarmes"],
              ["Interceptações", "interceptacoes"],
              ["Bloqueios", "bloqueios"],
              ["Cortes", "cortes"],
              ["Defesas difíceis", "defesasDificeis"],
              ["Defesas de pênalti", "defesasPenalti"],
            ])}
          </article>
        </section>

        <section class="data-card">
          <h3>Histórico dos últimos jogos</h3>
          ${renderPlayerGameHistory(stats)}
        </section>

        <section class="data-card">
          <h3>Histórico de prêmios da pelada</h3>
          ${renderPlayerAwardHistory(stats)}
        </section>
      </div>
    `;
  }

  function renderProfileMetricGrid(stats, metrics) {
    return `
      <div class="profile-metric-grid">
        ${metrics
          .map(([label, key]) => {
            const value = key === "aproveitamento"
              ? formatPercent(stats[key])
              : key.endsWith("PorJogo") || key === "gaPorJogo"
                ? formatAverage(stats[key])
                : stats[key] || 0;

            return `
              <span>
                <small>${escapeHtml(label)}</small>
                <strong>${escapeHtml(value)}</strong>
              </span>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function renderPlayerGameHistory(stats) {
    if (!stats.historico.length) {
      return `<div class="empty-state compact-empty"><p>Este jogador ainda não tem jogos finalizados.</p></div>`;
    }

    return `
      <div class="player-history-list">
        ${stats.historico
          .slice(0, 12)
          .map(
            (history) => `
              <article class="player-history-row">
                <span>
                  <strong>${escapeHtml(formatDateLabel(history.data))}</strong>
                  <small>${escapeHtml(history.local || "Pelada")}</small>
                </span>
                <span>${escapeHtml(history.timeNome || `Time ${history.time}`)}</span>
                <span>${escapeHtml(history.placar)}</span>
                <span class="result-badge result-${escapeHtml(history.resultado)}">${escapeHtml(resultLabel(history.resultado))}</span>
                <span>${escapeHtml(history.gols)} G</span>
                <span>${escapeHtml(history.assistencias)} A</span>
                <span>${escapeHtml(history.faltasCometidas)} FC</span>
                <span>${escapeHtml(history.faltasSofridas)} FS</span>
                <span>${escapeHtml(history.acoesDefensivas)} AD</span>
                <span>${escapeHtml(history.defesasDificeis)} DD</span>
              </article>
            `
          )
          .join("")}
      </div>
    `;
  }

  function renderPlayerAwardHistory(stats) {
    if (!stats.premiosPelada.length) {
      return `<div class="empty-state compact-empty"><p>Este jogador ainda não tem MVP ou Bagre da Pelada registrado.</p></div>`;
    }

    return `
      <div class="player-history-list">
        ${stats.premiosPelada
          .slice(0, 12)
          .map(
            (award) => `
              <article class="player-history-row award-history-row">
                <span>
                  <strong>${escapeHtml(formatDateLabel(award.data))}</strong>
                  <small>${escapeHtml(award.local || "Pelada")}</small>
                </span>
                <span>${escapeHtml(award.tipo)}</span>
                <span>${escapeHtml(formatScoreNumber(award.pontuacaoCalculada))} pts</span>
                <span>${escapeHtml(award.observacoes || "-")}</span>
              </article>
            `
          )
          .join("")}
      </div>
    `;
  }

  function populateManualEvolutionAttributes(form, jogadores) {
    if (!form) {
      return;
    }

    const jogadorId = form.elements.jogadorId?.value || "";
    const jogador = jogadores.find((item) => item.id === jogadorId);
    const attributeSelect = form.elements.atributo;

    if (!attributeSelect) {
      return;
    }

    attributeSelect.innerHTML = jogador
      ? renderEvolutionAttributeOptions(jogador, attributeSelect.value)
      : `<option value="">Sem atributos</option>`;
    attributeSelect.disabled = !jogador;
  }

  async function handleManualEvolutionSubmit(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const jogadorId = form.elements.jogadorId?.value || "";
    const atributo = form.elements.atributo?.value || "";
    const variacao = Number(form.elements.variacao?.value || 0);
    const motivo = String(form.elements.motivo?.value || "").trim();
    const errors = [];

    if (!jogadorId) errors.push("Escolha o jogador.");
    if (!atributo) errors.push("Escolha o atributo.");
    if (!Number.isFinite(variacao) || !Number.isInteger(variacao) || variacao === 0) {
      errors.push("Variação deve ser um número inteiro diferente de zero.");
    }
    if (variacao < -10 || variacao > 10) {
      errors.push("Variação deve ficar entre -10 e 10.");
    }
    if (!motivo) errors.push("Informe o motivo da evolução.");

    showFormErrors("manual-evolution-errors", errors);

    if (errors.length) {
      return;
    }

    const evolucoes = await aplicarEvolucaoManual({
      jogadorId,
      atributo,
      variacao,
      motivo,
    });
    const jogador = await getRecord("jogadores", jogadorId);

    state.evolutionMessage = evolucoes.length
      ? `${getAttributeLabel(evolucoes[0].atributo)} ${evolucoes[0].variacao > 0 ? "+" : ""}${evolucoes[0].variacao} aplicado em ${playerDisplayName(jogador || {})}.`
      : "Nenhuma mudança aplicada; o atributo já está no limite.";

    if (state.selectedStatsPlayerId) {
      state.selectedStatsPlayerId = jogadorId;
    }

    await syncNow();
    await refreshCurrentView();
  }

  function bindStatsSectionEvents(statsResult) {
    const root = $("#section-content");
    const form = $("#stats-filter-form");
    const evolutionForm = $("#manual-evolution-form");

    form?.addEventListener("change", async (event) => {
      const formData = new FormData(form);
      const selectedPeriodo = String(formData.get("periodo") || "all");
      const selectedPeladaId = String(formData.get("peladaId") || "");
      const selectedMonth = String(formData.get("month") || "");
      let periodo = selectedPeriodo;

      if (event.target?.name === "peladaId" && selectedPeladaId) {
        periodo = "pelada";
      }

      if (event.target?.name === "month" && selectedMonth) {
        periodo = "month";
      }

      state.statsFilters = {
        periodo,
        peladaId: periodo === "pelada" ? selectedPeladaId : "",
        month: periodo === "month" ? selectedMonth : "",
        temporadaId: "",
        jogadorId: String(formData.get("jogadorId") || ""),
        posicao: String(formData.get("posicao") || ""),
        sortBy: String(formData.get("sortBy") || "gols"),
      };

      state.selectedStatsPlayerId = null;
      await renderCurrentSection();
    });

    evolutionForm?.addEventListener("change", (event) => {
      if (event.target?.name !== "jogadorId") {
        return;
      }

      populateManualEvolutionAttributes(evolutionForm, statsResult.jogadores);
    });

    evolutionForm?.addEventListener("submit", handleManualEvolutionSubmit);
    populateManualEvolutionAttributes(evolutionForm, statsResult.jogadores);

    if (!root) {
      return;
    }

    root.onclick = async (event) => {
      const actionButton = event.target.closest("[data-stats-action]");

      if (!actionButton) {
        return;
      }

      const action = actionButton.dataset.statsAction;

      if (action === "profile") {
        state.selectedStatsPlayerId = actionButton.dataset.playerId || null;
        await renderCurrentSection();
        return;
      }

      if (action === "back") {
        state.selectedStatsPlayerId = null;
        await renderCurrentSection();
      }
    };
  }

  async function renderHistorySection() {
    const [eventos, auditLog] = await Promise.all([getAllRecords("eventos"), getAllRecords("auditLog")]);
    setSectionTitle("Auditoria", "Histórico");

    $("#section-content").innerHTML = `
      <div class="content-grid">
        <article class="data-card">
          <h3>Eventos</h3>
          <p>${eventos.length} evento${eventos.length === 1 ? "" : "s"} registrado${eventos.length === 1 ? "" : "s"}.</p>
          ${renderFields("eventos")}
        </article>
        <article class="data-card">
          <h3>Auditoria local</h3>
          <p>${auditLog.length} entrada${auditLog.length === 1 ? "" : "s"} de auditoria.</p>
        </article>
      </div>
    `;
  }

  async function renderConfigSection(counts = {}) {
    const [config, syncQueue, auditLog] = await Promise.all([
      getRecord("configs", "app"),
      getAllRecords("syncQueue"),
      getAllRecords("auditLog"),
    ]);
    const pendingSync = syncQueue.filter((item) => item.status !== "sincronizado");

    setSectionTitle("Sistema", "Configurações");

    $("#section-content").innerHTML = `
      <div class="content-grid">
        <article class="data-card">
          <h3>Regras do jogo</h3>
          <p>${escapeHtml(config?.regras?.duracaoJogoMinutos || 10)} minutos ou ${escapeHtml(config?.regras?.golsParaEncerrar || 2)} gols para encerrar.</p>
        </article>
        <article class="data-card">
          <h3>Sincronização</h3>
          <p>Apps Script: ${config?.appsScriptUrl ? escapeHtml(config.appsScriptUrl) : "URL pendente"}</p>
          <p>${pendingSync.length} registro${pendingSync.length === 1 ? "" : "s"} pendente${pendingSync.length === 1 ? "" : "s"}.</p>
        </article>
      </div>

      <section class="data-card diagnostics-card">
        <div class="section-heading-inline">
          <div>
            <span class="panel-kicker">Modo Desenvolvedor</span>
            <h3>Diagnóstico do App</h3>
            <p>Informações técnicas da PWA, banco local, fila de sincronização e auditoria.</p>
          </div>
        </div>

        <div class="diagnostics-grid">
          <article>
            <span class="metric-label">Versão do app</span>
            <strong>${escapeHtml(APP_VERSION)}</strong>
          </article>
          <article>
            <span class="metric-label">Rede</span>
            <strong>${navigator.onLine ? "Online" : "Offline"}</strong>
          </article>
          <article>
            <span class="metric-label">Offline/PWA</span>
            <strong>${escapeHtml($("#db-status")?.textContent || "Banco local")}</strong>
          </article>
          <article>
            <span class="metric-label">Fila pendente</span>
            <strong>${pendingSync.length}</strong>
          </article>
          <article>
            <span class="metric-label">Fila total</span>
            <strong>${syncQueue.length}</strong>
          </article>
          <article>
            <span class="metric-label">Auditoria</span>
            <strong>${auditLog.length}</strong>
          </article>
        </div>

        <div class="content-grid diagnostics-lists">
          <article class="nested-diagnostic">
            <h3>Fila de sincronização <span class="count-badge">${syncQueue.length}</span></h3>
            ${renderFields("syncQueue")}
          </article>
          <article class="nested-diagnostic">
            <h3>Auditoria <span class="count-badge">${auditLog.length}</span></h3>
            ${renderFields("auditLog")}
          </article>
        </div>
      </section>

      <section class="collection-grid diagnostics-collections">
        ${STORE_SCHEMAS.map(
          (schema) => `
            <article class="data-card">
              <h3>
                ${escapeHtml(STORE_LABELS[schema.name] || schema.name)}
                <span class="count-badge">${counts[schema.name] || 0}</span>
              </h3>
              ${renderFields(schema.name)}
            </article>
          `
        ).join("")}
      </section>

      <div class="content-grid">
        <article class="data-card">
          <h3>Campos de configuração</h3>
          ${renderFields("configs")}
        </article>
        <article class="data-card">
          <h3>Atualização</h3>
          <p>Use o botão Forçar atualização no topo se precisar limpar cache e carregar a versão mais recente.</p>
        </article>
      </div>
    `;
  }

  function updateNetworkStatus() {
    const status = $("#network-status");
    const homeStatus = $("#home-network-status");
    const onlineDot = $(".online-dot");
    const online = navigator.onLine;

    if (status) {
      status.textContent = online ? "Online" : "Offline";
      status.classList.toggle("online", online);
      status.classList.toggle("offline", !online);
    }

    if (onlineDot) {
      onlineDot.classList.toggle("is-offline", !online);
    }

    if (homeStatus) {
      homeStatus.textContent = online ? "Online" : "Offline";
      homeStatus.classList.toggle("online", online);
      homeStatus.classList.toggle("offline", !online);
    }
  }

  async function updateSyncStatus(message) {
    $("#sync-status").textContent = message;
    await updatePendingCount();
  }

  async function syncNow() {
    const config = await getRecord("configs", "app");
    const pending = await getAllRecords("syncQueue");
    const activePending = pending.filter((item) => item.status !== "sincronizado");

    if (!navigator.onLine) {
      await updateSyncStatus(`${activePending.length} pendente(s), aguardando internet`);
      return;
    }

    if (!config?.appsScriptUrl) {
      await updateSyncStatus(`${activePending.length} pendente(s), URL do Apps Script pendente`);
      return;
    }

    await updateSyncStatus("Sincronização pronta para conectar ao Apps Script");
  }

  async function forceUpdate() {
    $("#force-update").textContent = "Atualizando...";

    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }

    if ("caches" in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
    }

    window.location.reload();
  }

  function openSettingsDrawer() {
    $("#settings-drawer")?.setAttribute("aria-hidden", "false");
    $("#settings-drawer-backdrop")?.removeAttribute("hidden");
    document.body.classList.add("settings-open");
  }

  function closeSettingsDrawer() {
    $("#settings-drawer")?.setAttribute("aria-hidden", "true");
    $("#settings-drawer-backdrop")?.setAttribute("hidden", "");
    document.body.classList.remove("settings-open");
  }

  async function registerServiceWorker() {
    const canUseServiceWorker =
      "serviceWorker" in navigator &&
      (window.location.protocol === "https:" ||
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1");

    if (!canUseServiceWorker) {
      $("#db-status").textContent = "Banco local ativo";
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register("service-worker.js");
      $("#db-status").textContent = registration.active ? "Offline ativo" : "Offline preparando";
    } catch (error) {
      console.error("Falha ao registrar service worker", error);
      $("#db-status").textContent = "Offline indisponível";
    }
  }

  function bindEvents() {
    $$(".quick-action").forEach((button) => {
      button.addEventListener("click", async () => {
        await switchSection(button.dataset.section);
      });
    });

    $("#home-settings-toggle")?.addEventListener("click", openSettingsDrawer);
    $("#settings-drawer-close")?.addEventListener("click", closeSettingsDrawer);
    $("#settings-drawer-backdrop")?.addEventListener("click", closeSettingsDrawer);
    $("#drawer-sync-option")?.addEventListener("click", syncNow);

    document.body.addEventListener("click", async (event) => {
      const sectionButton = event.target.closest("[data-home-section], .drawer-button[data-section]");
      const actionButton = event.target.closest("[data-home-action]");

      if (sectionButton) {
        const section = sectionButton.dataset.homeSection || sectionButton.dataset.section;
        closeSettingsDrawer();
        await switchSection(section);
        return;
      }

      if (!actionButton) {
        return;
      }

      const action = actionButton.dataset.homeAction;

      if (action === "open-pelada") {
        const peladaId = actionButton.dataset.peladaId || "";
        state.selectedGameSummaryId = null;
        state.gameDraft = createEmptyGameDraft();
        await switchSection("peladas", { peladaId });
        return;
      }

      if (action === "open-game-summary") {
        const peladaId = actionButton.dataset.peladaId || "";
        const gameId = actionButton.dataset.gameId || "";
        if (peladaId && gameId) {
          await switchSection("peladas", { peladaId, gameId });
        }
        return;
      }

      if (action === "player-profile") {
        state.selectedStatsPlayerId = actionButton.dataset.playerId || null;
        await switchSection("estatisticas");
      }
    });

    $("#back-home")?.addEventListener("click", async () => {
      await switchSection("inicio", { historyMode: "replace" });
    });
    $("#sync-now").addEventListener("click", syncNow);
    $("#force-update").addEventListener("click", forceUpdate);

    window.addEventListener("hashchange", async () => {
      const route = readRouteFromHash();
      await switchSection(route.section, {
        historyMode: "none",
        peladaId: route.peladaId,
        gameId: route.gameId,
        peladasView: route.peladasView,
      });
    });

    window.addEventListener("online", () => {
      updateNetworkStatus();
      syncNow();
    });
    window.addEventListener("offline", updateNetworkStatus);
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeSettingsDrawer();
      }
    });

    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      state.installPrompt = event;
      $("#install-app").hidden = false;
    });

    $("#install-app").addEventListener("click", async () => {
      if (!state.installPrompt) {
        return;
      }

      state.installPrompt.prompt();
      await state.installPrompt.userChoice;
      state.installPrompt = null;
      $("#install-app").hidden = true;
    });
  }

  async function init() {
    $("#app-version").textContent = APP_VERSION;
    const initialRoute = readRouteFromHash();
    state.currentSection = initialRoute.section;
    state.selectedPeladaId = initialRoute.peladaId || null;
    state.selectedGameSummaryId = initialRoute.gameId || null;
    state.peladasView = initialRoute.peladaId ? "detalhe" : initialRoute.peladasView || "gerenciar";
    setActiveSection(state.currentSection);

    updateNetworkStatus();
    bindEvents();

    try {
      state.db = await openLocalDatabase();
      await seedDefaults();
      $("#db-status").textContent = "Banco local pronto";
      renderDashboardCards(await readDashboardStats());
      await renderCurrentSection();
      await registerServiceWorker();
      await syncNow();
      window.setInterval(syncNow, SYNC_INTERVAL_MS);
    } catch (error) {
      console.error(error);
      $("#db-status").textContent = "Erro no banco local";
      $("#section-content").innerHTML = `
        <div class="empty-state">
          <h3>Falha ao iniciar</h3>
          <p>${escapeHtml(error.message)}</p>
        </div>
      `;
    }
  }

  window.BagreScore = {
    version: APP_VERSION,
    dbName: DB_NAME,
    schemas: STORE_SCHEMAS,
    models: DATA_MODELS,
    defaults: {
      perfis: DEFAULT_PERFIS,
      regras: DEFAULT_RULES,
    },
  };

  document.addEventListener("DOMContentLoaded", init);
})();
