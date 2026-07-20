(() => {
  "use strict";

  const APP_VERSION = "1.1.6";
  const MIN_SYNC_API_VERSION = "1.5.0";
  const DB_NAME = "bagrescore-local";
  const DB_VERSION = 1;
  const SYNC_INTERVAL_MS = 5000;
  const SYNC_BATCH_SIZE = 100;
  const BAGRE_MIN_PARTICIPATION_RATE = 0.3;
  const AUTH_TOKEN_STORAGE_KEY = "bagrescore:auth-token";
  const AUTH_USER_STORAGE_KEY = "bagrescore:auth-user";
  const REMOTE_SYNC_STORES = new Set([
    "jogadores",
    "atributos",
    "peladas",
    "jogos",
    "times",
    "escalacoes",
    "eventos",
    "faltas",
    "evolucoes",
    "temporadas",
    "estatisticasCache",
  ]);
  const STATS_SOURCE_STORES = new Set(["jogadores", "atributos", "peladas", "jogos", "escalacoes", "eventos"]);
  const statsCalculationCache = new Map();

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
      "tipoRegistro",
      "proximoConfronto",
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
      "numero",
      "timeA",
      "timeB",
      "placarA",
      "placarB",
      "vencedor",
      "inicio",
      "fim",
      "status",
      "formaEncerramento",
      "presetAId",
      "presetBId",
      "filaTimes",
      "fase",
      "decididoNosPenaltis",
      "penaltisA",
      "penaltisB",
      "penaltiIniciaPor",
      "penaltiProximoTime",
      "createdAt",
      "updatedAt",
      "revision",
    ],
    times: ["id", "tipo", "peladaId", "jogoId", "presetId", "ordem", "nome", "cor", "jogadores", "linha", "goleiroId"],
    escalacoes: ["id", "jogoId", "jogadorId", "time", "timeId", "ativo", "entrouEm", "saiuEm", "createdAt", "updatedAt"],
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
      "jogadorSaiuId",
      "jogadorEntrouId",
      "escopoSubstituicao",
      "presetDestinoId",
      "presetOrigemId",
      "presetOrigemPapel",
      "resultadoPenalti",
      "goleiroId",
      "rodadaPenalti",
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
    configs: ["id", "appVersion", "appsScriptUrl", "serverEpoch", "lastServerRevision", "lastSyncAt", "regras", "updatedAt"],
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
    serverEpoch: "Geração da base remota",
    lastServerRevision: "Última revisão do servidor",
    lastSyncAt: "Última sincronização",
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
      nome: "Operador",
      permissoes: [
        "jogadores:criar",
        "jogadores:editar",
        "atributos:editar",
        "peladas:criar",
        "times:montar",
        "jogos:iniciar",
        "jogos:finalizar",
        "jogos:alterar",
        "eventos:criar",
        "eventos:excluir",
        "gols:registrar",
        "faltas:registrar",
        "estatisticas:visualizar",
        "historico:visualizar",
        "carta:visualizar",
      ],
    },
    {
      id: "marcador",
      nome: "Marcador",
      permissoes: ["eventos:criar", "gols:registrar", "faltas:registrar"],
    },
    {
      id: "jogador",
      nome: "Jogador",
      permissoes: ["estatisticas:visualizar", "historico:visualizar", "carta:visualizar", "perfil:editar-proprio"],
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
  const SECTION_HEADINGS = {
    inicio: ["Início", "Resumo da pelada"],
    jogadores: ["Elenco", "Jogadores"],
    peladas: ["Peladas", "Suas rodadas"],
    "ao-vivo": ["Partida", "Ao vivo"],
    ranking: ["Desempenho", "Ranking geral"],
    estatisticas: ["Desempenho", "Estatísticas"],
    historico: ["Partidas", "Histórico"],
    configuracoes: ["Sistema", "Configurações"],
  };
  const GAME_DURATION_SECONDS = DEFAULT_RULES.duracaoJogoMinutos * 60;
  const GOALS_TO_END_GAME = DEFAULT_RULES.golsParaEncerrar;
  const pendingGoalGameIds = new Set();
  const finalizingGameIds = new Set();
  const openingPeladaFinishIds = new Set();
  const finalizingPeladaIds = new Set();
  let sectionSwitchInProgress = false;
  let rankingViewTransitionInProgress = false;
  const GOAL_TYPES = [
    { value: "normal", label: "Normal" },
    { value: "penalti", label: "Pênalti" },
    { value: "falta", label: "Falta" },
    { value: "cabeca", label: "Cabeça" },
    { value: "gol_contra", label: "Gol contra" },
    { value: "outro", label: "Outro" },
  ];
  const QUICK_GOAL_TYPES = [
    { value: "normal", label: "Normal", detail: "Jogada aberta", icon: "N" },
    { value: "penalti", label: "Pênalti", detail: "Cobrança da marca", icon: "P" },
    { value: "falta", label: "Falta", detail: "Cobrança direta", icon: "F" },
    { value: "cabeca", label: "Cabeça", detail: "Finalização aérea", icon: "C" },
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
  const PLAYER_PHOTO_MAX_INPUT_BYTES = 8 * 1024 * 1024;
  const PLAYER_PROFILE_PHOTO_MAX_CHARS = 480000;
  const PLAYER_PHOTO_MAX_SIZE = 720;
  const PLAYER_PHOTO_QUALITY = 0.84;
  const PLAYER_FORM_STEPS = [
    { id: "basicos", label: "Dados básicos" },
    { id: "futebol", label: "Informações futebolísticas" },
    { id: "atributos", label: "Atributos e carta" },
  ];

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
    playerFormOpen: false,
    playerFormStep: "basicos",
    playerSaving: false,
    playersListOpen: false,
    selectedPeladaId: null,
    selectedGameSummaryId: null,
    peladasView: "gerenciar",
    peladaDetailView: "confrontos",
    selectedStatsPlayerId: null,
    selectedProfileTab: "resumo",
    rankingMode: "geral",
    rankingCategory: "overall",
    evolutionMessage: "",
    gameDraft: {
      A: { nome: "Time A", cor: "#ff5a00", linha: [], goleiro: "" },
      B: { nome: "Time B", cor: "#4aa3df", linha: [], goleiro: "" },
    },
    matchPresetIds: { A: "", B: "" },
    matchPersist: { A: false, B: false },
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
    backendUrl: "",
    authToken: "",
    currentUser: null,
    syncInProgress: false,
    remoteUsers: [],
    remoteProfiles: [],
    accountMessage: "",
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

  function runBackgroundTask(task, errorLabel = "Falha em tarefa de segundo plano") {
    Promise.resolve()
      .then(task)
      .catch((error) => console.error(errorLabel, error));
  }

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

  function comparePlayersByNickname(a, b) {
    const nicknameDiff = String(a?.apelido || a?.nome || "")
      .localeCompare(String(b?.apelido || b?.nome || ""), "pt-BR", { sensitivity: "base" });

    if (nicknameDiff) {
      return nicknameDiff;
    }

    const nameDiff = String(a?.nome || "")
      .localeCompare(String(b?.nome || ""), "pt-BR", { sensitivity: "base" });

    if (nameDiff) {
      return nameDiff;
    }

    return String(a?.createdAt || "").localeCompare(String(b?.createdAt || ""));
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
      } else if (firstPart === "finalizadas") {
        peladasView = "finalizadas";
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

    if (section === "peladas" && options.peladasView === "finalizadas") {
      return "#peladas/finalizadas";
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
    if (sectionSwitchInProgress) {
      return;
    }

    const targetSection = normalizeSectionName(sectionName);
    const previousSection = state.currentSection;
    const historyMode = options.historyMode || "push";
    const peladaId = targetSection === "peladas" ? options.peladaId || "" : "";
    const gameId = targetSection === "peladas" ? options.gameId || "" : "";
    const peladasView = targetSection === "peladas" ? options.peladasView || "gerenciar" : "";
    const targetHash = buildSectionHash(targetSection, { peladaId, gameId, peladasView });
    const shouldAnimate = targetSection !== previousSection && options.animate !== false;
    const sectionContent = $("#section-content");

    sectionSwitchInProgress = true;
    setActiveSection(targetSection);

    try {
      if (shouldAnimate) {
        document.body.classList.add("is-section-switching");
        sectionContent?.setAttribute("aria-busy", "true");
        await new Promise((resolve) => window.setTimeout(resolve, 55));
      }

      state.currentSection = targetSection;

      if (targetSection === "configuracoes" && previousSection !== "configuracoes") {
        showSectionLoadingState(targetSection, "Abrindo suas configurações...");
      }

      if (targetSection === "jogadores" && previousSection !== "jogadores" && !options.preservePlayerState) {
        state.playerFormOpen = false;
        state.playerFormStep = "basicos";
        state.playersListOpen = false;
        state.selectedPlayerId = null;
        state.editingPlayerId = null;
      }

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

      await renderCurrentSection();

      if (targetSection !== previousSection) {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      }
    } finally {
      if (shouldAnimate) {
        await new Promise((resolve) => window.requestAnimationFrame(resolve));
        document.body.classList.remove("is-section-switching");
        sectionContent?.removeAttribute("aria-busy");
      }
      sectionSwitchInProgress = false;
    }
  }

  function teamNameFromGame(jogo, teamKey) {
    const team = teamKey === "A" ? jogo?.timeA : jogo?.timeB;
    return team?.nome || `Time ${teamKey}`;
  }

  function teamColorFromGame(jogo, teamKey) {
    const team = teamKey === "A" ? jogo?.timeA : jogo?.timeB;
    return team?.cor || (teamKey === "A" ? "#ff5a00" : "#4a4a4a");
  }

  function getGameWinner(jogo) {
    const winningTeamKey = getWinningTeamKey(jogo);
    if (winningTeamKey) return teamNameFromGame(jogo, winningTeamKey);
    return "Empate";
  }

  function getWinningTeamKey(jogo) {
    const placarA = Number(jogo.placarA || 0);
    const placarB = Number(jogo.placarB || 0);

    if (placarA > placarB) return "A";
    if (placarB > placarA) return "B";

    if (jogo?.decididoNosPenaltis) {
      const penaltisA = Number(jogo.penaltisA || 0);
      const penaltisB = Number(jogo.penaltisB || 0);
      if (penaltisA > penaltisB) return "A";
      if (penaltisB > penaltisA) return "B";
    }

    return "";
  }

  function getGameResultForTeam(jogo, teamKey) {
    const winningTeamKey = getWinningTeamKey(jogo);
    if (!winningTeamKey) return "empate";
    return winningTeamKey === teamKey ? "vitoria" : "derrota";
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
    if (normalizeToken(jogo.fase) === "penaltis") return "Pênaltis";
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
    const lineup = bundle?.escalacoes?.find((item) => item.jogadorId === playerId && item.ativo !== false) ||
      bundle?.escalacoes?.find((item) => item.jogadorId === playerId);
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

  function getPeladaRecordType(pelada) {
    return normalizeToken(pelada?.tipoRegistro) === "teste" ? "teste" : "oficial";
  }

  function isTestPelada(pelada) {
    return getPeladaRecordType(pelada) === "teste";
  }

  function isTeamPreset(time) {
    return normalizeToken(time?.tipo) === "preset" && Boolean(time?.peladaId);
  }

  async function readTeamPresets(peladaId) {
    const times = await getAllRecords("times");
    return times
      .filter((time) => isTeamPreset(time) && time.peladaId === peladaId)
      .sort((a, b) =>
        Number(a.ordem || 0) - Number(b.ordem || 0) ||
        String(a.createdAt || "").localeCompare(String(b.createdAt || ""))
      );
  }

  function teamPresetToDraft(preset, fallbackKey) {
    return {
      nome: preset?.nome || `Time ${fallbackKey}`,
      cor: preset?.cor || (fallbackKey === "A" ? "#ff5a00" : "#4aa3df"),
      linha: uniqueIds(preset?.linha || []).slice(0, 5),
      goleiro: preset?.goleiroId || "",
    };
  }

  function hydrateMatchDraft(presetA, presetB) {
    state.matchPresetIds = {
      A: presetA?.id || "",
      B: presetB?.id || "",
    };
    state.matchPersist = { A: false, B: false };
    state.gameDraft = {
      A: teamPresetToDraft(presetA, "A"),
      B: teamPresetToDraft(presetB, "B"),
    };
  }

  function getSuggestedMatchup(pelada, presets = []) {
    const presetById = new Map(presets.map((preset) => [preset.id, preset]));
    const saved = pelada?.proximoConfronto || {};
    const presetA = presetById.get(saved.timeAId) || presets[0] || null;
    const presetB = presetById.get(saved.timeBId) || presets.find((preset) => preset.id !== presetA?.id) || null;
    const savedQueue = uniqueIds(saved.fila || []).filter(
      (id) => presetById.has(id) && id !== presetA?.id && id !== presetB?.id
    );
    const remaining = presets
      .map((preset) => preset.id)
      .filter((id) => id !== presetA?.id && id !== presetB?.id && !savedQueue.includes(id));

    return {
      presetA,
      presetB,
      fila: [...savedQueue, ...remaining],
    };
  }

  function getPresetCompleteness(preset) {
    const lineCount = uniqueIds(preset?.linha || []).length;
    const hasGoalkeeper = Boolean(preset?.goleiroId);
    return {
      lineCount,
      hasGoalkeeper,
      total: lineCount + (hasGoalkeeper ? 1 : 0),
      complete: lineCount === 5 && hasGoalkeeper,
    };
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

    if (eventType === "substituicao") {
      const outgoing = playerNameFromMap(playerById, evento.jogadorSaiuId);
      const incoming = playerNameFromMap(playerById, evento.jogadorEntrouId);
      const scopeLabel = evento.escopoSubstituicao === "proximos" ? " · mantida nos próximos jogos" : "";
      return `<li class="event-substitution"><strong>${minute}</strong><span><b>↔ ${escapeHtml(incoming)}</b> entrou no lugar de ${escapeHtml(outgoing)}${escapeHtml(scopeLabel)}</span></li>`;
    }

    if (eventType === "penalti_desempate") {
      const kicker = playerNameFromMap(playerById, evento.jogadorId);
      const result = normalizeToken(evento.resultadoPenalti);
      const resultLabel = result === "gol" ? "converteu" : result === "defendido" ? "teve a cobrança defendida" : "mandou para fora";
      return `<li class="event-penalty"><strong>P${escapeHtml(evento.rodadaPenalti || "")}</strong><span>${escapeHtml(kicker)} ${escapeHtml(resultLabel)}</span></li>`;
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
    invalidateStatsCache([storeName]);
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
    invalidateStatsCache(storeNames);
  }

  async function deleteRecords(keysByStore) {
    const storeNames = Object.keys(keysByStore).filter((storeName) => keysByStore[storeName]?.length);

    if (!storeNames.length) {
      return;
    }

    const transaction = state.db.transaction(storeNames, "readwrite");

    storeNames.forEach((storeName) => {
      const store = transaction.objectStore(storeName);
      keysByStore[storeName].forEach((key) => store.delete(key));
    });

    await transactionDone(transaction);
    invalidateStatsCache(storeNames);
  }

  async function mutateRecords({ deletes = {}, puts = {} } = {}) {
    const storeNames = [...new Set([
      ...Object.keys(deletes).filter((storeName) => deletes[storeName]?.length),
      ...Object.keys(puts).filter((storeName) => puts[storeName]?.length),
    ])];

    if (!storeNames.length) return;
    const transaction = state.db.transaction(storeNames, "readwrite");

    storeNames.forEach((storeName) => {
      const store = transaction.objectStore(storeName);
      (deletes[storeName] || []).forEach((key) => store.delete(key));
      (puts[storeName] || []).forEach((record) => store.put(record));
    });

    await transactionDone(transaction);
    invalidateStatsCache(storeNames);
  }

  function invalidateStatsCache(storeNames = []) {
    if (storeNames.some((storeName) => STATS_SOURCE_STORES.has(storeName))) {
      statsCalculationCache.clear();
    }
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
      clientSequence: nextSyncSequence(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
  }

  function nextSyncSequence() {
    const storageKey = "bagrescore:sync-sequence";
    const previous = Number(localStorage.getItem(storageKey) || 0);
    const next = Math.max(previous + 1, Date.now() * 1000);
    localStorage.setItem(storageKey, String(next));
    return next;
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
      createdBy: getActorId(),
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
        criadoPor: getActorId(),
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
    const [jogador, attributesRecord, eventos, peladas] = await Promise.all([
      getRecord("jogadores", jogadorId),
      getRecord("atributos", jogadorId),
      getAllRecords("eventos"),
      getAllRecords("peladas"),
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
    const peladaById = new Map(peladas.map((pelada) => [pelada.id, pelada]));
    const officialEvents = eventos.filter((evento) => !isTestPelada(peladaById.get(evento.peladaId)));
    const changes = buildEventEvolutionChanges(jogadorId, jogador, card.attributes, officialEvents);

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
    const participantsA = gameLineups
      .filter((escalacao) => escalacao.time === "A" || escalacao.timeId === jogo.timeA?.id)
      .map((escalacao) => playerById.get(escalacao.jogadorId))
      .filter(Boolean);
    const participantsB = gameLineups
      .filter((escalacao) => escalacao.time === "B" || escalacao.timeId === jogo.timeB?.id)
      .map((escalacao) => playerById.get(escalacao.jogadorId))
      .filter(Boolean);
    const activeLineups = gameLineups.filter((escalacao) => escalacao.ativo !== false);
    const activeIds = new Set(activeLineups.map((escalacao) => escalacao.jogadorId));
    const playersA = participantsA.filter((player) => activeIds.has(player.id));
    const playersB = participantsB.filter((player) => activeIds.has(player.id));

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
      participantsA,
      participantsB,
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
      penaltisConvertidos: 0,
      penaltisPerdidos: 0,
      penaltisDefendidos: 0,
      disputasPenaltis: 0,
      eventos: 0,
      pontuacao: 0,
      mediaDesempenho: 0,
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

  function comparePeladaBagreCandidates(a, b) {
    return (
      Number(a.mediaDesempenho || 0) - Number(b.mediaDesempenho || 0) ||
      Number(b.golsContra || 0) - Number(a.golsContra || 0) ||
      Number(b.cartoesVermelhos || 0) - Number(a.cartoesVermelhos || 0) ||
      Number(b.cartoesAmarelos || 0) - Number(a.cartoesAmarelos || 0) ||
      Number(b.faltasCometidas || 0) - Number(a.faltasCometidas || 0) ||
      Number(b.derrotas || 0) - Number(a.derrotas || 0) ||
      playerDisplayName(a.jogador).localeCompare(playerDisplayName(b.jogador), "pt-BR")
    );
  }

  function selectPeladaBagreSuggestion(playerScores, suggestedMvp = null) {
    const maximumGamesPlayed = Math.max(0, ...playerScores.map((stats) => Number(stats.jogos || 0)));
    const minimumGames = maximumGamesPlayed > 0
      ? Math.max(1, Math.ceil(maximumGamesPlayed * BAGRE_MIN_PARTICIPATION_RATE))
      : 0;
    const isNotSuggestedMvp = (stats) => stats.jogadorId !== suggestedMvp?.jogadorId;
    const eligibleCandidates = playerScores.filter(
      (stats) => stats.jogador && stats.jogos >= minimumGames && isNotSuggestedMvp(stats)
    );
    const fallbackCandidates = playerScores.filter(
      (stats) => stats.jogador && stats.jogos > 0 && isNotSuggestedMvp(stats)
    );
    const candidates = eligibleCandidates.length ? eligibleCandidates : fallbackCandidates;

    return {
      suggestion: [...candidates].sort(comparePeladaBagreCandidates)[0] || null,
      maximumGamesPlayed,
      minimumGames,
    };
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

          if (cartao === "amarelo") {
            stats.cartoesAmarelos += 1;
            stats.pontuacao -= 1;
          }

          if (cartao === "vermelho") {
            stats.cartoesVermelhos += 1;
            stats.pontuacao -= 2;
          }
        }
      }

      if (eventType === "cartao") {
        const stats = getOrCreatePeladaPlayerScore(scoreByPlayerId, playerById, evento.jogadorId);
        if (stats) {
          if (cartao === "amarelo") {
            stats.cartoesAmarelos += 1;
            stats.pontuacao -= 1;
          }

          if (cartao === "vermelho") {
            stats.cartoesVermelhos += 1;
            stats.pontuacao -= 2;
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
      stats.participacoesGol = stats.gols + stats.assistencias;
      stats.mediaDesempenho = stats.jogos > 0
        ? Number((stats.pontuacao / stats.jogos).toFixed(2))
        : 0;

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
    const bagreSelection = selectPeladaBagreSuggestion(playerScores, suggestedMvp);
    const suggestedBagre = bagreSelection.suggestion;

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
      bagreCriteria: {
        maximumGamesPlayed: bagreSelection.maximumGamesPlayed,
        minimumGames: bagreSelection.minimumGames,
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
      penaltisConvertidos: 0,
      penaltisPerdidos: 0,
      penaltisDefendidos: 0,
      disputasPenaltis: 0,
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

  function getStatsCalculationCacheKey(filters = {}) {
    return JSON.stringify({
      periodo: filters.periodo || "all",
      peladaId: filters.peladaId || "",
      month: filters.month || "",
      temporadaId: filters.temporadaId || "",
      jogadorId: filters.jogadorId || "",
      posicao: filters.posicao || "",
      includeTests: Boolean(filters.includeTests),
    });
  }

  async function calcularEstatisticasJogadores(filters = state.statsFilters) {
    const cacheKey = getStatsCalculationCacheKey(filters);
    const cachedResult = statsCalculationCache.get(cacheKey);

    if (cachedResult) {
      return cachedResult;
    }

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
    const lineupsByGameId = escalacoes.reduce((map, escalacao) => {
      const gameLineups = map.get(escalacao.jogoId) || [];
      gameLineups.push(escalacao);
      map.set(escalacao.jogoId, gameLineups);
      return map;
    }, new Map());
    const statsByPlayerId = new Map(
      filteredPlayers.map((jogador) => [jogador.id, createEmptyPlayerStats(jogador)])
    );
    const historyByPlayerGame = new Map();

    finalizedGames.forEach((jogo) => {
      const pelada = peladaById.get(jogo.peladaId);
      (lineupsByGameId.get(jogo.id) || []).forEach((escalacao) => {
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
            penaltisConvertidos: 0,
            penaltisPerdidos: 0,
            penaltisDefendidos: 0,
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

      if (eventType === "penalti_desempate") {
        const resultado = normalizeToken(evento.resultadoPenalti);
        if (evento.jogadorId && statsByPlayerId.has(evento.jogadorId)) {
          const stats = statsByPlayerId.get(evento.jogadorId);
          const history = historyByPlayerGame.get(`${evento.jogadorId}:${evento.jogoId}`);
          if (resultado === "gol") {
            stats.penaltisConvertidos += 1;
            if (history) history.penaltisConvertidos += 1;
          } else {
            stats.penaltisPerdidos += 1;
            if (history) history.penaltisPerdidos += 1;
          }
        }
        if (resultado === "defendido" && evento.goleiroId && statsByPlayerId.has(evento.goleiroId)) {
          const stats = statsByPlayerId.get(evento.goleiroId);
          const history = historyByPlayerGame.get(`${evento.goleiroId}:${evento.jogoId}`);
          stats.penaltisDefendidos += 1;
          if (history) history.penaltisDefendidos += 1;
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
      stats.disputasPenaltis = stats.penaltisConvertidos + stats.penaltisPerdidos;
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
    const eligiblePeladas = filters.includeTests
      ? peladas
      : peladas.filter((pelada) => !isTestPelada(pelada));

    const result = {
      filters,
      jogadores,
      peladas: eligiblePeladas,
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
        totalPeladas: filters.peladaId
          ? (eligiblePeladas.some((pelada) => pelada.id === filters.peladaId) ? 1 : 0)
          : eligiblePeladas.length,
        totalJogosFinalizados: finalizedGames.length,
        totalGols: golsRegistrados,
        totalAssistencias: assistencias,
        totalFaltas: faltas,
        totalAcoesDefensivas: acoesDefensivas,
        totalDefesasDificeis: defesasDificeis,
        mediaGolsPorJogo: safeDivide(golsRegistrados, finalizedGames.length),
      },
    };
    statsCalculationCache.set(cacheKey, result);
    return result;
  }

  function gameMatchesStatsFilters(jogo, peladaById, filters) {
    const pelada = peladaById.get(jogo.peladaId);
    const referenceDate = pelada?.data || jogo.inicio?.slice(0, 10) || "";

    if (!filters.includeTests && isTestPelada(pelada)) {
      return false;
    }

    if (filters.peladaId && jogo.peladaId !== filters.peladaId) {
      return false;
    }

    if (filters.month && !String(referenceDate).startsWith(filters.month)) {
      return false;
    }

    return true;
  }

  function peladaMatchesStatsFilters(pelada, filters) {
    if (!filters.includeTests && isTestPelada(pelada)) {
      return false;
    }
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
      serverEpoch: "",
      lastServerRevision: 0,
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

    let currentSeason = await getRecord("temporadas", "temporada-atual");
    if (!currentSeason) {
      currentSeason = {
        id: "temporada-atual",
        nome: "Temporada atual",
        tipo: "aberta",
        inicio: createdAt.slice(0, 10),
        fim: "",
        status: "ativa",
        createdAt,
        updatedAt: createdAt,
        revision: 0,
      };
      await putRecord("temporadas", currentSeason);
    }

  }

  async function readCollectionCounts() {
    const entries = await Promise.all(
      STORE_SCHEMAS.map(async (schema) => [schema.name, await countRecords(schema.name)])
    );

    return Object.fromEntries(entries);
  }

  async function readDashboardStats() {
    const statsResult = await calcularEstatisticasJogadores({
      periodo: "all",
      peladaId: "",
      month: "",
      temporadaId: "",
      jogadorId: "",
      posicao: "",
      sortBy: "gols",
    });
    const { jogadores, peladas, eventos, jogos } = statsResult;

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
    const latestBagreStats = getLatestPeladaAwardEntry(statsResult, "bagre_pelada")?.stats || topStats(statsResult.playersStats, "bagresPelada");
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
        bagre: latestBagreStats,
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
      .filter((pelada) => {
        const hasActiveGame = activePeladaIds.has(pelada.id);
        const isOpen = normalizeToken(pelada.status || "Aberta") !== "finalizada";
        const isUpcoming = !pelada.data || String(pelada.data) >= today;

        return hasActiveGame || (isOpen && isUpcoming);
      })
      .sort((a, b) => {
        const activeDiff = Number(activePeladaIds.has(b.id)) - Number(activePeladaIds.has(a.id));
        if (activeDiff) return activeDiff;

        const dateA = String(a.data || "9999-12-31");
        const dateB = String(b.data || "9999-12-31");
        const dateDiff = dateA.localeCompare(dateB);
        if (dateDiff) return dateDiff;

        return String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
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
        ${renderRankingGeneralHomeCard(stats)}
      </div>
    `;
  }

  function renderFeaturedPeladaCard(stats) {
    const pelada = stats.highlightedPelada;

    if (!pelada) {
      const canCreatePelada = hasPermission("peladas:criar");
      return `
        <section class="featured-match-card is-empty" aria-labelledby="home-title">
          <span class="feature-badge">Pelada em destaque</span>
          <span class="featured-empty-icon" aria-hidden="true">+</span>
          <h2 id="home-title">Nenhuma pelada marcada ainda</h2>
          <p>${canCreatePelada ? "Crie a próxima rodada e comece a resenha." : "Quando a próxima rodada for criada, ela aparecerá aqui."}</p>
          <button class="primary-button home-primary-action" type="button" data-home-section="peladas">${canCreatePelada ? "Criar pelada" : "Ver peladas"}</button>
        </section>
      `;
    }

    const games = stats.jogos.filter((jogo) => jogo.peladaId === pelada.id);
    const activeGame = games.find((jogo) => jogo.status === "Em andamento");
    const horario = [pelada.horarioInicio, pelada.horarioFim].filter(Boolean).join(" - ") || "Horário aberto";
    const statusLabel = activeGame ? "Ao vivo" : pelada.status || "Aberta";
    const statusClass = activeGame ? "is-live" : "is-open";
    const peladaName = pelada.nome || pelada.titulo || pelada.local || "Pelada";
    const locationLabel = pelada.endereco || pelada.local || "Local não informado";

    return `
      <section class="featured-match-card" aria-labelledby="home-title">
        <div class="featured-card-head">
          <span class="feature-badge">Pelada em destaque</span>
          <span class="featured-status-chip ${statusClass}">${escapeHtml(statusLabel)}</span>
        </div>
        <div class="featured-card-content">
          <h2 id="home-title">${escapeHtml(peladaName)}</h2>
          <div class="featured-meta" aria-label="Informações da pelada">
            <span><small>Local</small><strong>${escapeHtml(locationLabel)}</strong></span>
            <span><small>Data</small><strong>${escapeHtml(formatDateLabel(pelada.data))}</strong></span>
            <span><small>Horário</small><strong>${escapeHtml(horario)}</strong></span>
            <span><small>Valor</small><strong>${escapeHtml(formatCurrency(pelada.valor))}</strong></span>
          </div>
          <button class="primary-button home-primary-action" type="button" data-home-action="open-pelada" data-pelada-id="${escapeHtml(pelada.id)}">
            Abrir pelada
          </button>
        </div>
      </section>
    `;
  }

  function renderWeeklyHighlights(stats) {
    const cards = [
      ["Artilheiro", stats.highlights.topScorer, "gols", "gol", "gols"],
      ["Garçom", stats.highlights.topAssists, "assistencias", "assistência", "assistências"],
      ["MVP", stats.highlights.mvp, "mvpsPelada", "MVP", "MVPs"],
      ["Bagre da rodada", stats.highlights.bagre, "bagresPelada", "bagre", "bagres"],
    ];

    return `
      <section class="home-section-block">
        <div class="home-section-heading">
          <div>
            <h3>Destaques da semana</h3>
          </div>
        </div>
        <div class="home-highlight-grid">
          ${cards.map(([title, entry, metric, singular, plural]) => renderHomeHighlightCard(title, entry, metric, singular, plural)).join("")}
        </div>
      </section>
    `;
  }

  function renderHomeHighlightCard(title, entry, metric, singular, plural) {
    if (!entry?.jogador) {
      return `
        <article class="home-highlight-card is-empty">
          <span class="highlight-kicker">${escapeHtml(title)}</span>
          <span class="highlight-card-body">
            <span class="highlight-empty-medal" aria-hidden="true">—</span>
            <span class="highlight-card-copy">
              <strong>Aguardando dados</strong>
              <small>Sem registro ainda</small>
            </span>
          </span>
        </article>
      `;
    }

    const value = metric === "overall"
      ? Number(entry.jogador.overall || 0)
      : Number(entry[metric] || 0);

    if (metric !== "overall" && value <= 0) {
      return `
        <article class="home-highlight-card is-empty">
          <span class="highlight-kicker">${escapeHtml(title)}</span>
          <span class="highlight-card-body">
            <span class="highlight-empty-medal" aria-hidden="true">—</span>
            <span class="highlight-card-copy">
              <strong>Aguardando dados</strong>
              <small>Sem registro ainda</small>
            </span>
          </span>
        </article>
      `;
    }

    const unit = value === 1 ? singular : plural;

    return `
      <button class="home-highlight-card" type="button" data-home-action="player-profile" data-player-id="${escapeHtml(entry.jogadorId)}">
        <span class="highlight-kicker">${escapeHtml(title)}</span>
        <span class="highlight-card-body">
          ${renderPlayerAvatar(entry.jogador, "player-avatar home-avatar")}
          <span class="highlight-card-copy">
            <strong class="highlight-player-name">${escapeHtml(playerDisplayName(entry.jogador))}</strong>
            <span class="highlight-stat-line">
              <b class="highlight-stat-value">${escapeHtml(String(value))}</b>
              <small class="highlight-stat-label">${escapeHtml(unit)}</small>
            </span>
          </span>
        </span>
      </button>
    `;
  }

  function renderRankingGeneralHomeCard(stats) {
    const podiumEntries = getOverallRankingEntries(stats.statsResult, 3);
    const podium = [
      { place: 2, entry: podiumEntries[1], className: "is-second" },
      { place: 1, entry: podiumEntries[0], className: "is-first" },
      { place: 3, entry: podiumEntries[2], className: "is-third" },
    ];

    return `
      <section class="home-section-block home-ranking-section">
        <div class="home-section-heading">
          <div>
            <h3>Ranking geral</h3>
          </div>
          <button type="button" data-home-section="ranking">Ver ranking completo</button>
        </div>
        <div class="ranking-general-card home-ranking-podium-card">
          <div class="home-ranking-podium" aria-label="Top 3 do ranking geral">
            ${podium.map((item) => renderHomeRankingPodiumPlace(item)).join("")}
          </div>
        </div>
      </section>
    `;
  }

  function renderHomeRankingPodiumPlace({ place, entry, className }) {
    if (!entry?.stats?.jogador) {
      return `
        <span class="home-ranking-place ${escapeHtml(className)} is-empty">
          ${renderRankingMiniCardFrame()}
          <span class="home-ranking-empty-avatar" aria-hidden="true">—</span>
          <b>Aguardando</b>
          <small>Sem jogador</small>
        </span>
      `;
    }

    const jogador = entry.stats.jogador;

    return `
      <button class="home-ranking-place ${escapeHtml(className)}" type="button" data-home-action="player-profile" data-player-id="${escapeHtml(entry.stats.jogadorId)}" aria-label="${escapeHtml(`${place}º lugar, ${playerDisplayName(jogador)}, ${entry.value}`)}">
        ${renderRankingMiniCardFrame()}
        ${renderPlayerAvatar(jogador, "player-avatar home-ranking-avatar")}
        <b>${escapeHtml(playerDisplayName(jogador))}</b>
        <small>${escapeHtml(jogador.posicaoPrincipal || "Sem posição")}</small>
        <strong>${escapeHtml(entry.value)}</strong>
        <span class="home-ranking-card-label">Maior Overall</span>
      </button>
    `;
  }

  async function renderCurrentSection() {
    if (state.currentSection !== "ao-vivo") {
      stopLiveTimer();
      closeLiveModal();
    }

    const isHome = state.currentSection === "inicio";
    const isStatsProfile = state.currentSection === "estatisticas" && Boolean(state.selectedStatsPlayerId);
    document.body.dataset.section = state.currentSection;
    document.body.classList.toggle("is-internal", !isHome);
    document.body.classList.toggle("stats-profile-mode", isStatsProfile);
    $(".workspace-panel")?.classList.toggle("is-home", isHome);
    const backHome = $("#back-home");
    if (backHome) {
      backHome.hidden = isHome;
    }
    const counts = state.currentSection === "configuracoes"
      ? await readCollectionCounts()
      : {};

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
    runBackgroundTask(updatePendingCount, "Falha ao atualizar contador de sincronização");
  }

  function setSectionTitle(kicker, title) {
    $("#section-kicker").textContent = kicker;
    $("#section-title").textContent = title;
  }

  function showSectionLoadingState(sectionName, message = "Organizando seus dados...") {
    const [kicker, title] = SECTION_HEADINGS[sectionName] || SECTION_HEADINGS.inicio;
    setSectionTitle(kicker, title);
    document.body.dataset.section = sectionName;
    $("#section-content").innerHTML = `
      <div class="app-loading-state" role="status" aria-live="polite">
        <span class="app-loading-mark" aria-hidden="true"></span>
        <strong>Preparando o BagreScore</strong>
        <small>${escapeHtml(message)}</small>
      </div>
    `;
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
      .sort(comparePlayersByNickname);
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

  function renderPlayerPhotoUpload(player = null) {
    const previewPlayer = {
      nome: player?.nome || "",
      apelido: player?.apelido || "",
      foto: player?.foto || "",
    };

    return `
      <div class="photo-upload-field wide-field">
        <input type="hidden" name="foto" value="${escapeHtml(player?.foto || "")}" />
        <div class="photo-upload-preview" data-photo-preview>
          ${renderPlayerAvatar(previewPlayer, "player-avatar photo-upload-avatar")}
          <span>
            <strong>Foto da carta</strong>
            <small>${player?.foto ? "Foto vinculada ao jogador." : "Anexe uma imagem do jogador para usar no ranking, estatísticas e campo ao vivo."}</small>
          </span>
        </div>
        <div class="photo-upload-actions">
          <label class="photo-upload-button">
            <input type="file" name="fotoArquivo" accept="image/*" />
            <span>Anexar foto</span>
          </label>
          <button class="ghost-button compact-button" type="button" data-player-action="remove-photo" ${player?.foto ? "" : "hidden"}>
            Remover foto
          </button>
        </div>
        <small class="photo-upload-hint">A imagem será salva no banco local do app e acompanhará o jogador nas telas principais.</small>
      </div>
    `;
  }

  function normalizePlayerFormStep(step) {
    return PLAYER_FORM_STEPS.some((item) => item.id === step) ? step : PLAYER_FORM_STEPS[0].id;
  }

  function getPlayerFormStepIndex(step) {
    return Math.max(0, PLAYER_FORM_STEPS.findIndex((item) => item.id === normalizePlayerFormStep(step)));
  }

  function renderPlayerFormStepper(activeStep) {
    const activeIndex = getPlayerFormStepIndex(activeStep);

    return `
      <div class="player-form-stepper" aria-label="Etapas do cadastro">
        ${PLAYER_FORM_STEPS.map((step, index) => `
          <span class="${index === activeIndex ? "is-active" : ""} ${index < activeIndex ? "is-done" : ""}" data-step-indicator="${escapeHtml(step.id)}">
            <strong>${escapeHtml(index + 1)}</strong>
            <small>${escapeHtml(step.label)}</small>
          </span>
        `).join("")}
      </div>
    `;
  }

  function renderPlayerFormStepActions(isEditing, activeStep) {
    const isFirstStep = activeStep === PLAYER_FORM_STEPS[0].id;
    const isLastStep = activeStep === PLAYER_FORM_STEPS[PLAYER_FORM_STEPS.length - 1].id;
    const submitLabel = state.playerSaving
      ? "Salvando..."
      : isEditing
        ? "Salvar alterações"
        : "Finalizar cadastro";
    const disabled = state.playerSaving ? `disabled aria-disabled="true"` : "";

    return `
      <div class="form-actions player-wizard-actions">
        ${isFirstStep ? `<button class="ghost-button" type="button" data-player-action="cancel-form">${isEditing ? "Cancelar edição" : "Cancelar"}</button>` : `<button class="ghost-button" type="button" data-player-action="prev-step">Voltar</button>`}
        ${isLastStep ? `<button class="primary-button" type="submit" ${disabled}>${escapeHtml(submitLabel)}</button>` : `<button class="primary-button" type="button" data-player-action="next-step" ${disabled}>Continuar</button>`}
      </div>
    `;
  }

  function renderPlayerForm(player = null, attributesRecord = null) {
    const isEditing = Boolean(player);
    const activeStep = normalizePlayerFormStep(state.playerFormStep);
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
      <form class="player-form player-wizard-form" id="player-form" data-player-id="${escapeHtml(player?.id || "")}" data-player-step="${escapeHtml(activeStep)}" novalidate>
        <div class="form-errors" id="player-form-errors" hidden></div>
        ${renderPlayerFormStepper(activeStep)}

        <section class="form-section player-step-panel ${activeStep === "basicos" ? "is-active-step" : ""}" data-player-step-panel="basicos">
          <h3>1. Dados básicos</h3>
          <div class="form-grid">
            <label class="field-label">
              <span>Nome *</span>
              <input type="text" name="nome" value="${escapeHtml(player?.nome || "")}" autocomplete="off" required />
            </label>
            <label class="field-label">
              <span>Apelido / nome da carta *</span>
              <input type="text" name="apelido" value="${escapeHtml(player?.apelido || "")}" autocomplete="off" required />
            </label>
            ${renderPlayerPhotoUpload(player)}
            <label class="field-label">
              <span>Idade</span>
              <input type="number" name="idade" min="1" max="120" step="1" value="${escapeHtml(idade)}" />
            </label>
          </div>
        </section>

        <section class="form-section player-step-panel ${activeStep === "futebol" ? "is-active-step" : ""}" data-player-step-panel="futebol">
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

        <section class="form-section player-step-panel ${activeStep === "atributos" ? "is-active-step" : ""}" data-player-step-panel="atributos">
          <h3>3. Atributos</h3>
          <div class="attribute-help">
            <span>Use valores de 1 a 99. A ficha mostra atributos de linha ou goleiro conforme o tipo/posição.</span>
          </div>
          ${renderPlayerAttributeFields(LINE_ATTRIBUTES, attributes, "linha", activeGroup)}
          ${renderPlayerAttributeFields(GOALKEEPER_ATTRIBUTES, attributes, "goleiro", activeGroup)}
        </section>

        <section class="form-section player-step-panel ${activeStep === "atributos" ? "is-active-step" : ""}" data-player-step-panel="atributos">
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

        ${renderPlayerFormStepActions(isEditing, activeStep)}
      </form>
    `;
  }

  function renderPlayerCard(player) {
    const statusClass = `status-${String(player.status || "Ativo").toLowerCase()}`;
    const canEditPlayers = hasPermission("jogadores:editar");
    const miniAttributes = getActiveAttributeDefinitions(player.tipoJogador, player.posicaoPrincipal).slice(0, 3);

    return `
      <article class="player-card ${player.status === "Inativo" ? "is-inactive" : ""}" data-player-id="${escapeHtml(player.id)}">
        <button class="player-card-main" type="button" data-player-action="view" data-player-id="${escapeHtml(player.id)}">
          ${renderPlayerAvatar(player)}
          <span class="player-card-info">
            <strong>${escapeHtml(playerDisplayName(player))}</strong>
            <span>${escapeHtml(player.posicaoPrincipal || "-")} · ${escapeHtml(player.tipoJogador || "Linha")} · Pé ${escapeHtml(player.peForte || "-")}</span>
            <span class="player-card-mini-attrs">
              ${miniAttributes.map((attribute) => `<small><b>${escapeHtml(normalizeAttributeValue(player.attributes?.[attribute.key]))}</b> ${escapeHtml(attribute.label)}</small>`).join("")}
            </span>
            <span class="player-status ${statusClass}"><i></i>${escapeHtml(player.status || "Ativo")}</span>
          </span>
          <span class="player-card-overall"><strong>${escapeHtml(player.overall ?? "-")}</strong><small>OVR</small></span>
        </button>
        ${canEditPlayers ? `<div class="player-card-actions">
          <button class="ghost-button compact-button" type="button" data-player-action="edit" data-player-id="${escapeHtml(player.id)}">Editar</button>
          ${
            player.status === "Inativo"
              ? `<button class="ghost-button compact-button" type="button" data-player-action="reactivate" data-player-id="${escapeHtml(player.id)}">Reativar</button>`
              : `<button class="danger-button compact-button" type="button" data-player-action="inactivate" data-player-id="${escapeHtml(player.id)}">Inativar</button>`
          }
          <button class="danger-button compact-button player-delete-button" type="button" data-player-action="delete" data-player-id="${escapeHtml(player.id)}">Excluir</button>
        </div>` : ""}
      </article>
    `;
  }

  function renderPlayersHero(jogadores) {
    return `
      <section class="players-hero">
        <div class="players-hero-copy">
          <span>Elenco BagreScore</span>
          <h2>Jogadores</h2>
        </div>
      </section>
    `;
  }

  function renderPlayersActionCards(jogadores) {
    const openLabel = state.playersListOpen ? "Ocultar elenco" : "Abrir elenco";

    return `
      <div class="players-action-grid">
        ${hasPermission("jogadores:criar") ? `<button class="players-action-card is-primary" type="button" data-player-action="start-create">
          <span>+</span>
          <strong>Cadastrar jogador</strong>
        </button>` : ""}
        <button class="players-action-card" type="button" data-player-action="toggle-roster">
          <span>${escapeHtml(jogadores.length)}</span>
          <strong>Elenco cadastrado</strong>
          <small>${escapeHtml(openLabel)}</small>
        </button>
      </div>
    `;
  }

  function renderPlayersRosterPanel(jogadores, selectedPlayer) {
    if (!state.playersListOpen) {
      return "";
    }

    return `
      <section class="players-list-panel">
        <div class="players-toolbar">
          <div>
            <span class="panel-kicker">Elenco local</span>
            <h3>Jogadores cadastrados</h3>
          </div>
          <button class="ghost-button compact-button" type="button" data-player-action="toggle-roster">Fechar elenco</button>
        </div>
        ${
          jogadores.length
            ? `<div class="player-card-grid">${jogadores.map(renderPlayerCard).join("")}</div>`
            : `
              <div class="empty-state">
                <h3>Nenhum jogador cadastrado</h3>
                <p>Abra o cadastro para criar o primeiro jogador e liberar a seleção em times e eventos.</p>
              </div>
            `
        }
      </section>
    `;
  }

  function scrollToPlayersRoster() {
    window.requestAnimationFrame(() => {
      $(".players-list-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  async function renderPlayersSection() {
    const jogadores = await readPlayersWithAttributes();
    const selectedPlayer =
      jogadores.find((jogador) => jogador.id === state.selectedPlayerId) || null;
    const editingPlayer = jogadores.find((jogador) => jogador.id === state.editingPlayerId) || null;
    const shouldShowForm = hasPermission(editingPlayer ? "jogadores:editar" : "jogadores:criar") &&
      (state.playerFormOpen || Boolean(editingPlayer));

    setSectionTitle("Cadastro", "Jogadores");
    state.selectedPlayerId = selectedPlayer?.id || null;

    $("#section-content").innerHTML = `
      <div class="players-screen">
        ${renderPlayersHero(jogadores)}
        ${renderPlayersActionCards(jogadores)}
        ${
          shouldShowForm
            ? `
              <section class="data-card player-form-card">
                <div class="players-toolbar">
                  <div>
                    <span class="panel-kicker">${editingPlayer ? "Edição da carta" : "Nova carta"}</span>
                    <h3>${editingPlayer ? "Editar jogador" : "Cadastrar jogador"}</h3>
                  </div>
                </div>
                ${renderPlayerForm(editingPlayer)}
              </section>
            `
            : ""
        }
        ${renderPlayersRosterPanel(jogadores, selectedPlayer)}
      </div>
    `;

    bindPlayerSectionEvents();
    updatePlayerFormState();
  }

  function bindPlayerSectionEvents() {
    const layout = $(".players-screen");
    const form = $("#player-form");

    if (!layout) {
      return;
    }

    if (form) {
      form.addEventListener("input", (event) => {
        if (["nome", "apelido"].includes(event.target?.name)) {
          updatePlayerPhotoPreview(form);
        }
        updatePlayerFormState(form);
      });
      form.addEventListener("change", async (event) => {
        if (event.target?.name === "fotoArquivo") {
          await handlePlayerPhotoSelection(form, event.target);
          return;
        }

        normalizePlayerTypeAndPosition(form, event.target);
        updatePlayerFormState(form);
      });
      form.addEventListener("submit", handlePlayerFormSubmit);
    }

    layout.addEventListener("click", async (event) => {
      const actionButton = event.target.closest("[data-player-action]");

      if (!actionButton) {
        return;
      }

      const action = actionButton.dataset.playerAction;
      const playerId = actionButton.dataset.playerId;

      if (action === "remove-photo") {
        if (form) {
          clearPlayerPhoto(form);
        }
        return;
      }

      if (action === "start-create" || action === "new") {
        state.playerSaving = false;
        state.playerFormOpen = true;
        state.playerFormStep = "basicos";
        state.playersListOpen = false;
        state.editingPlayerId = null;
        state.selectedPlayerId = null;
        await renderCurrentSection();
        $("#player-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }

      if (action === "toggle-roster") {
        state.playerSaving = false;
        state.playersListOpen = !state.playersListOpen;
        state.playerFormOpen = false;
        state.playerFormStep = "basicos";
        state.editingPlayerId = null;
        state.selectedPlayerId = null;
        await renderCurrentSection();
        if (state.playersListOpen) {
          scrollToPlayersRoster();
        }
        return;
      }

      if (action === "next-step" && form) {
        advancePlayerFormStep(form, 1);
        return;
      }

      if (action === "prev-step" && form) {
        advancePlayerFormStep(form, -1);
        return;
      }

      if (action === "cancel-form") {
        state.playerSaving = false;
        state.playerFormOpen = false;
        state.playerFormStep = "basicos";
        state.editingPlayerId = null;
        await renderCurrentSection();
        return;
      }

      if (action === "view" && playerId) {
        state.statsFilters = {
          ...state.statsFilters,
          periodo: "all",
          peladaId: "",
          month: "",
          temporadaId: "",
          jogadorId: "",
          posicao: "",
        };
        state.selectedStatsPlayerId = playerId;
        state.selectedProfileTab = "resumo";
        await switchSection("estatisticas");
        return;
      }

      if (action === "edit" && playerId) {
        state.playerSaving = false;
        state.selectedPlayerId = playerId;
        state.editingPlayerId = playerId;
        state.playerFormOpen = true;
        state.playerFormStep = "basicos";
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

      if (action === "delete" && playerId) {
        await deletePlayer(playerId);
        return;
      }

      if (action === "reset-form") {
        state.playerSaving = false;
        state.playerFormOpen = false;
        state.playerFormStep = "basicos";
        state.editingPlayerId = null;
        await renderCurrentSection();
      }
    });
  }

  function advancePlayerFormStep(form, direction) {
    const currentStep = normalizePlayerFormStep(form?.dataset.playerStep || state.playerFormStep);
    const currentIndex = getPlayerFormStepIndex(currentStep);
    const nextIndex = clamp(currentIndex + direction, 0, PLAYER_FORM_STEPS.length - 1);

    if (direction > 0) {
      const errors = validatePlayerWizardStep(form, currentStep);
      showPlayerFormErrors(errors);

      if (errors.length) {
        return;
      }
    }

    setPlayerFormStep(PLAYER_FORM_STEPS[nextIndex].id, form);
  }

  function setPlayerFormStep(step, form = $("#player-form")) {
    const activeStep = normalizePlayerFormStep(step);
    const activeIndex = getPlayerFormStepIndex(activeStep);
    const isEditing = Boolean(form?.dataset.playerId);

    state.playerFormStep = activeStep;

    if (!form) {
      return;
    }

    form.dataset.playerStep = activeStep;
    form.querySelectorAll("[data-player-step-panel]").forEach((panel) => {
      panel.classList.toggle("is-active-step", panel.dataset.playerStepPanel === activeStep);
    });
    form.querySelectorAll("[data-step-indicator]").forEach((indicator) => {
      const index = getPlayerFormStepIndex(indicator.dataset.stepIndicator);
      indicator.classList.toggle("is-active", index === activeIndex);
      indicator.classList.toggle("is-done", index < activeIndex);
    });

    const actions = form.querySelector(".player-wizard-actions");
    if (actions) {
      actions.outerHTML = renderPlayerFormStepActions(isEditing, activeStep);
    }

    showPlayerFormErrors([]);
    updatePlayerFormState(form);
  }

  function validatePlayerWizardStep(form, step) {
    const errors = [];
    const normalizedStep = normalizePlayerFormStep(step);

    if (normalizedStep === "basicos") {
      const nome = String(form.elements.nome?.value || "").trim();
      const apelido = String(form.elements.apelido?.value || "").trim();
      const idadeValue = String(form.elements.idade?.value || "").trim();
      const idade = idadeValue ? Number(idadeValue) : "";

      if (!nome) {
        errors.push("Nome é obrigatório.");
      }

      if (!apelido) {
        errors.push("Apelido / nome da carta é obrigatório.");
      }

      if (idade !== "" && (!Number.isFinite(idade) || idade < 1 || idade > 120)) {
        errors.push("Idade deve ser um número válido.");
      }
    }

    if (normalizedStep === "futebol") {
      const tipoJogador = form.elements.tipoJogador?.value || "";
      const posicaoPrincipal = form.elements.posicaoPrincipal?.value || "";

      if (!PLAYER_TYPES.includes(tipoJogador)) {
        errors.push("Tipo de jogador é obrigatório.");
      }

      if (!PLAYER_POSITIONS.includes(posicaoPrincipal)) {
        errors.push("Posição principal é obrigatória.");
      }

      if (tipoJogador === "Goleiro" && posicaoPrincipal !== "GK") {
        errors.push("Goleiro deve usar a posição principal GK.");
      }

      if (tipoJogador === "Linha" && posicaoPrincipal === "GK") {
        errors.push("Jogador de linha não pode usar GK como posição principal.");
      }
    }

    return errors;
  }

  function updatePlayerPhotoPreview(form = $("#player-form")) {
    if (!form) {
      return;
    }

    const preview = form.querySelector("[data-photo-preview]");
    const removeButton = form.querySelector('[data-player-action="remove-photo"]');
    const previewPlayer = {
      nome: String(form.elements.nome?.value || "").trim(),
      apelido: String(form.elements.apelido?.value || "").trim(),
      foto: String(form.elements.foto?.value || "").trim(),
    };

    if (preview) {
      preview.innerHTML = `
        ${renderPlayerAvatar(previewPlayer, "player-avatar photo-upload-avatar")}
        <span>
          <strong>Foto da carta</strong>
          <small>${previewPlayer.foto ? "Foto vinculada ao jogador." : "Anexe uma imagem do jogador para usar no ranking, estatísticas e campo ao vivo."}</small>
        </span>
      `;
    }

    if (removeButton) {
      removeButton.hidden = !previewPlayer.foto;
    }
  }

  function clearPlayerPhoto(form = $("#player-form")) {
    if (!form) {
      return;
    }

    if (form.elements.foto) {
      form.elements.foto.value = "";
    }

    if (form.elements.fotoArquivo) {
      form.elements.fotoArquivo.value = "";
    }

    updatePlayerPhotoPreview(form);
  }

  async function handlePlayerPhotoSelection(form, input) {
    const file = input?.files?.[0];

    if (!file) {
      return;
    }

    try {
      const photoDataUrl = await readPlayerPhotoFile(file);
      form.elements.foto.value = photoDataUrl;
      updatePlayerPhotoPreview(form);
    } catch (error) {
      window.alert(error?.message || "Não foi possível anexar essa foto.");
      input.value = "";
    }
  }

  async function readPlayerPhotoFile(file) {
    if (!file.type.startsWith("image/")) {
      throw new Error("Escolha um arquivo de imagem válido.");
    }

    if (file.size > PLAYER_PHOTO_MAX_INPUT_BYTES) {
      throw new Error("A foto é muito grande. Use uma imagem de até 8 MB.");
    }

    const dataUrl = await readFileAsDataUrl(file);

    if (file.type === "image/svg+xml") {
      return dataUrl;
    }

    return resizeImageDataUrl(dataUrl);
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
      reader.readAsDataURL(file);
    });
  }

  function resizeImageDataUrl(dataUrl) {
    return new Promise((resolve, reject) => {
      const image = new Image();

      image.onload = () => {
        const maxSide = Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height);
        const scale = maxSide > PLAYER_PHOTO_MAX_SIZE ? PLAYER_PHOTO_MAX_SIZE / maxSide : 1;
        const width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
        const height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");

        if (!context) {
          reject(new Error("Não foi possível preparar a imagem."));
          return;
        }

        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", PLAYER_PHOTO_QUALITY));
      };

      image.onerror = () => reject(new Error("Não foi possível processar essa imagem."));
      image.src = dataUrl;
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

    if (!player.apelido) {
      errors.push("Apelido / nome da carta é obrigatório.");
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
    const playerPermission = state.editingPlayerId ? "jogadores:editar" : "jogadores:criar";
    if (!requirePermission(playerPermission)) return;

    const form = event.currentTarget;

    if (state.playerSaving || form.dataset.submitting === "true") {
      return;
    }

    const currentStep = normalizePlayerFormStep(form.dataset.playerStep || state.playerFormStep);

    if (currentStep !== "atributos") {
      advancePlayerFormStep(form, 1);
      return;
    }

    normalizePlayerTypeAndPosition(form);
    updatePlayerFormState(form);

    const formData = collectPlayerFormData(form);
    const errors = validatePlayerForm(formData);
    showPlayerFormErrors(errors);

    if (errors.length) {
      return;
    }

    state.playerSaving = true;
    form.dataset.submitting = "true";
    form.querySelectorAll("button").forEach((button) => {
      button.disabled = true;
    });
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.textContent = "Salvando...";
    }

    try {
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
      state.playerFormOpen = false;
      state.playerFormStep = "basicos";
      state.playersListOpen = true;
      await refreshCurrentView();
      scrollToPlayersRoster();
      await syncNow();
    } catch (error) {
      console.error(error);
      showPlayerFormErrors(["Não foi possível salvar o jogador. Tente novamente."]);
      form.dataset.submitting = "false";
      form.querySelectorAll("button").forEach((button) => {
        button.disabled = false;
      });
      if (submitButton) {
        submitButton.textContent = formData.playerId ? "Salvar alterações" : "Finalizar cadastro";
      }
    } finally {
      state.playerSaving = false;
    }
  }

  async function updatePlayerStatus(playerId, status) {
    if (!requirePermission("jogadores:editar")) return;
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

  async function deletePlayer(playerId) {
    if (!requirePermission("jogadores:editar")) return;
    const [
      existingPlayer,
      existingAttributes,
      escalacoes,
      eventos,
      faltas,
      evolucoes,
      estatisticasCache,
    ] = await Promise.all([
      getRecord("jogadores", playerId),
      getRecord("atributos", playerId),
      getAllRecords("escalacoes"),
      getAllRecords("eventos"),
      getAllRecords("faltas"),
      getAllRecords("evolucoes"),
      getAllRecords("estatisticasCache"),
    ]);

    if (!existingPlayer) {
      return;
    }

    const linkedEscalacoes = escalacoes.filter((item) => item.jogadorId === playerId);
    const linkedEventos = eventos.filter((item) =>
      [item.jogadorId, item.assistenteId, item.jogadorSofreuId].includes(playerId)
    );
    const linkedFaltas = faltas.filter((item) =>
      [item.jogadorCometeuId, item.jogadorSofreuId].includes(playerId)
    );
    const hasHistoryLinks = linkedEscalacoes.length || linkedEventos.length || linkedFaltas.length;

    if (hasHistoryLinks) {
      window.alert(
        "Esse jogador já tem jogos ou eventos vinculados. Para preservar histórico, placares e estatísticas, use Inativar em vez de Excluir."
      );
      return;
    }

    const playerName = playerDisplayName(existingPlayer);
    const confirmed = window.confirm(
      `Excluir ${playerName} definitivamente deste aparelho? Essa ação remove o cadastro, atributos e evoluções manuais sem vínculo.`
    );

    if (!confirmed) {
      return;
    }

    const playerEvolucoes = evolucoes.filter((item) => item.jogadorId === playerId);
    const playerStatsCache = estatisticasCache.filter((item) => item.jogadorId === playerId);
    const before = {
      jogador: existingPlayer,
      atributos: existingAttributes || null,
      evolucoes: playerEvolucoes,
      estatisticasCache: playerStatsCache,
    };

    await deleteRecords({
      jogadores: [playerId],
      atributos: [playerId],
      evolucoes: playerEvolucoes.map((item) => item.id),
      estatisticasCache: playerStatsCache.map((item) => item.id),
    });

    await putRecords({
      syncQueue: [
        createSyncQueueRecord("jogadores", "delete", playerId, { id: playerId }),
        createSyncQueueRecord("atributos", "delete", playerId, { jogadorId: playerId }),
        ...playerEvolucoes.map((item) =>
          createSyncQueueRecord("evolucoes", "delete", item.id, { id: item.id })
        ),
      ],
      auditLog: [createAuditRecord("jogadores", playerId, "excluir", before, null)],
    });

    if (state.selectedPlayerId === playerId) {
      state.selectedPlayerId = null;
    }

    if (state.editingPlayerId === playerId) {
      state.editingPlayerId = null;
      state.playerFormOpen = false;
      state.playerFormStep = "basicos";
    }

    if (state.selectedStatsPlayerId === playerId) {
      state.selectedStatsPlayerId = null;
    }

    state.playersListOpen = true;
    await refreshCurrentView();
    scrollToPlayersRoster();
    await syncNow();
  }

  async function renderPeladasSection() {
    const [peladas, jogadores, allGames, allTimes] = await Promise.all([
      readPeladasSorted(),
      readActivePlayers(),
      getAllRecords("jogos"),
      getAllRecords("times"),
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
      const canCreatePelada = hasPermission("peladas:criar");
      const activeView = canCreatePelada && state.peladasView === "criar"
        ? "criar"
        : state.peladasView === "finalizadas"
          ? "finalizadas"
          : "gerenciar";
      setSectionTitle("Crie e gerencie suas peladas", "Peladas");

      $("#section-content").innerHTML = `
        <div class="peladas-screen">
          ${renderPeladasModeNav(activeView)}
          ${
            activeView === "criar"
              ? renderCreatePeladaPanel()
              : activeView === "finalizadas"
                ? renderFinalizedPeladasPanel(peladas, gameCountByPeladaId, gamesByPeladaId)
                : renderManagePeladasPanel(peladas, gameCountByPeladaId, gamesByPeladaId)
          }
        </div>
      `;

      bindPeladaSectionEvents();
      return;
    }

    const jogos = await readGamesForPelada(selectedPelada.id);
    const teamPresets = allTimes
      .filter((time) => isTeamPreset(time) && time.peladaId === selectedPelada.id)
      .sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0));
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
    const detailView = state.peladaDetailView === "times" ? "times" : "confrontos";

    $("#section-content").innerHTML = `
      <div class="pelada-detail-flow">
        ${renderPeladaOpenToolbar(selectedPelada, peladaSummary)}
        ${renderPeladaDetailNav(detailView, teamPresets)}
        <div class="pelada-detail-view" data-pelada-detail-view="${escapeHtml(detailView)}">
          ${detailView === "times"
            ? renderTeamPresetsPanel(selectedPelada, teamPresets, jogadores)
            : `
                ${renderGameSetup(selectedPelada, jogadores, teamPresets)}
                ${renderGameHistory(selectedPelada, jogos, eventsByGameId, playerById, peladaSummary)}
              `}
        </div>
      </div>
    `;

    bindPeladaSectionEvents();
  }

  function renderPeladasModeNav(activeView) {
    const canCreate = hasPermission("peladas:criar");

    return `
      <div class="peladas-mode-nav ${canCreate ? "has-three-tabs" : "has-two-tabs"}" role="tablist" aria-label="Navegação de peladas">
        ${canCreate ? `
          <button
            class="peladas-mode-button ${activeView === "criar" ? "active" : ""}"
            type="button"
            role="tab"
            aria-selected="${activeView === "criar"}"
            data-pelada-action="show-create"
          >
            Marcar
          </button>
        ` : ""}
        <button
          class="peladas-mode-button ${activeView === "gerenciar" ? "active" : ""}"
          type="button"
          role="tab"
          aria-selected="${activeView === "gerenciar"}"
          data-pelada-action="show-manage"
        >
          Gerenciar
        </button>
        <button
          class="peladas-mode-button ${activeView === "finalizadas" ? "active" : ""}"
          type="button"
          role="tab"
          aria-selected="${activeView === "finalizadas"}"
          data-pelada-action="show-finalized"
        >
          Finalizadas
        </button>
      </div>
    `;
  }

  function renderPeladaDetailNav(activeView, presets = []) {
    const incomplete = presets.filter((preset) => !getPresetCompleteness(preset).complete).length;

    return `
      <nav class="pelada-detail-tabs" aria-label="Área da pelada">
        <button
          class="${activeView === "confrontos" ? "active" : ""}"
          type="button"
          data-pelada-action="show-detail-confrontos"
          aria-current="${activeView === "confrontos" ? "page" : "false"}"
        >
          <span>Confrontos</span>
        </button>
        <button
          class="${activeView === "times" ? "active" : ""}"
          type="button"
          data-pelada-action="show-detail-times"
          aria-current="${activeView === "times" ? "page" : "false"}"
        >
          <span>Times</span>
          <small class="${incomplete ? "has-warning" : ""}">${escapeHtml(presets.length)}</small>
        </button>
      </nav>
    `;
  }

  function renderCreatePeladaPanel() {
    return `
      <section class="data-card pelada-form-card">
        <div class="players-toolbar">
          <div>
            <h3>Marcar pelada</h3>
          </div>
        </div>
        ${renderPeladaForm()}
      </section>
    `;
  }

  function isFinalizedPelada(pelada) {
    return normalizeToken(pelada?.status) === "finalizada";
  }

  function selectNextOpenPelada(peladas = []) {
    const openPeladas = peladas.filter(
      (pelada) => !isFinalizedPelada(pelada) && !isTestPelada(pelada)
    );
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const dateValue = (pelada) => {
      const parsed = new Date(`${pelada?.data || ""}T${pelada?.horarioInicio || "00:00"}`).getTime();
      return Number.isFinite(parsed) ? parsed : 0;
    };
    const upcoming = openPeladas
      .filter((pelada) => dateValue(pelada) >= startOfToday.getTime())
      .sort((a, b) => dateValue(a) - dateValue(b));

    if (upcoming.length) {
      return upcoming[0];
    }

    return openPeladas.sort((a, b) => dateValue(b) - dateValue(a))[0] || null;
  }

  function renderNoOpenPeladaCard() {
    const canCreate = hasPermission("peladas:criar");

    return `
      <section class="peladas-featured-empty" aria-labelledby="no-open-pelada-title">
        <span class="peladas-featured-kicker">Próxima pelada</span>
        <span class="peladas-empty-calendar" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"/><path d="M12 12v5M9.5 14.5h5"/></svg>
        </span>
        <div>
          <h3 id="no-open-pelada-title">Nenhuma pelada aberta</h3>
          <p>${canCreate ? "Marque a próxima rodada e deixe tudo pronto para os jogos." : "A próxima rodada ainda não foi marcada."}</p>
        </div>
        ${canCreate ? `<button class="primary-button peladas-empty-cta" type="button" data-pelada-action="show-create">Marcar pelada</button>` : ""}
      </section>
    `;
  }

  function renderManagePeladasPanel(peladas, gameCountByPeladaId, gamesByPeladaId) {
    const officialPeladas = peladas.filter((pelada) => !isTestPelada(pelada));
    const testPeladas = peladas.filter(isTestPelada);
    const featuredPelada = selectNextOpenPelada(officialPeladas);

    return `
      <section class="pelada-workspace peladas-manage-shell">
        ${featuredPelada
          ? renderPeladaHighlightCard(
              featuredPelada,
              gameCountByPeladaId.get(featuredPelada.id) || 0,
              gamesByPeladaId.get(featuredPelada.id) || []
            )
          : renderNoOpenPeladaCard()}

        ${testPeladas.length ? `
          <section class="test-records-panel">
            <header>
              <div>
                <span>Ambiente seguro</span>
                <h3>Peladas de teste</h3>
              </div>
              ${hasPermission("eventos:excluir") ? `
                <button class="test-records-clear" type="button" data-pelada-action="delete-all-tests" aria-label="Apagar todas as peladas de teste">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 10v7M14 10v7"/></svg>
                  <span>Limpar testes</span>
                </button>
              ` : ""}
            </header>
            <div class="pelada-card-grid">
              ${testPeladas.map((pelada) =>
                renderPeladaCard(
                  pelada,
                  gameCountByPeladaId.get(pelada.id) || 0,
                  gamesByPeladaId.get(pelada.id) || []
                )
              ).join("")}
            </div>
          </section>
        ` : ""}
      </section>
    `;
  }

  function renderFinalizedPeladasPanel(peladas, gameCountByPeladaId, gamesByPeladaId) {
    const finalizedPeladas = peladas
      .filter((pelada) => !isTestPelada(pelada) && isFinalizedPelada(pelada));

    return `
      <section class="pelada-workspace finalized-records-panel">
        <header class="finalized-records-heading">
          <div>
            <span>Histórico oficial</span>
            <h3>Peladas finalizadas</h3>
          </div>
          <strong>${finalizedPeladas.length}</strong>
        </header>
        ${finalizedPeladas.length
          ? `<div class="pelada-card-grid">${finalizedPeladas
              .map((pelada) =>
                renderPeladaCard(
                  pelada,
                  gameCountByPeladaId.get(pelada.id) || 0,
                  gamesByPeladaId.get(pelada.id) || []
                )
              )
              .join("")}</div>`
          : `<div class="peladas-finished-empty"><span aria-hidden="true">✓</span><p>Nenhuma pelada finalizada ainda.</p></div>`}
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
          <fieldset class="pelada-record-type wide-field">
            <legend>Tipo de registro</legend>
            <label>
              <input type="radio" name="tipoRegistro" value="oficial" checked />
              <span><strong>Oficial</strong><small>Conta nos rankings e na evolução das cartas.</small></span>
            </label>
            <label>
              <input type="radio" name="tipoRegistro" value="teste" />
              <span><strong>Teste</strong><small>Permite simular tudo sem alterar os dados oficiais.</small></span>
            </label>
          </fieldset>
        </div>
        <div class="form-actions">
          <button class="primary-button" type="submit">Marcar pelada</button>
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

  function renderPeladaTypeBadge(pelada) {
    const type = getPeladaRecordType(pelada);
    return `<span class="pelada-type-badge is-${type}">${type === "teste" ? "Modo teste" : "Oficial"}</span>`;
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
        </span>
        <span class="peladas-featured-main">
          ${renderPeladaDateTile(pelada, "is-featured")}
          <span class="pelada-card-info">
            <strong>${escapeHtml(pelada.local || "Pelada")}</strong>
            ${pelada.endereco ? `<small>${escapeHtml(pelada.endereco)}</small>` : `<small>Local não informado</small>`}
          </span>
        </span>
        ${renderPeladaMetaRow(pelada, gameCount)}
        <span class="peladas-featured-footer">
          <span class="pelada-badge-stack">${renderPeladaTypeBadge(pelada)}${renderPeladaStatusBadge(status)}</span>
          <span class="peladas-featured-cta">Abrir pelada <b aria-hidden="true">&rsaquo;</b></span>
        </span>
      </button>
    `;
  }

  function renderPeladaCard(pelada, gameCount = 0, jogos = []) {
    const status = getPeladaStatusLabel(pelada, jogos);
    const statusClass = normalizeToken(status);
    const recordType = getPeladaRecordType(pelada);

    return `
      <article class="pelada-card ${statusClass === "finalizada" ? "is-finalized" : ""} is-record-${escapeHtml(recordType)}">
        <button class="pelada-card-main" type="button" data-pelada-action="open-pelada" data-pelada-id="${escapeHtml(pelada.id)}">
          <span class="pelada-card-accent" aria-hidden="true"></span>
          <span class="pelada-card-body">
            ${renderPeladaDateTile(pelada)}
            <span class="pelada-card-info">
              <strong>${escapeHtml(pelada.local || "Pelada")}</strong>
              ${pelada.endereco ? `<small>${escapeHtml(pelada.endereco)}</small>` : `<small>Local não informado</small>`}
              ${renderPeladaMetaRow(pelada, gameCount, false)}
            </span>
          </span>
          <span class="pelada-card-footer">
            <span class="pelada-card-badges">
              ${renderPeladaTypeBadge(pelada)}
              ${renderPeladaStatusBadge(status)}
            </span>
            <span class="pelada-open-cta" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg>
            </span>
          </span>
        </button>
      </article>
    `;
  }

  function renderPeladaOpenToolbar(pelada, peladaSummary = null) {
    const horario = [pelada.horarioInicio, pelada.horarioFim].filter(Boolean).join(" - ") || "Horário aberto";
    const status = getPeladaStatusLabel(pelada, peladaSummary?.jogos || []);
    const canFinalize = Boolean(peladaSummary?.canFinalize);
    const finishTitle = peladaSummary?.finishDisabledReason || "Encerrar a pelada e escolher MVP/Bagre.";
    const statusClass = normalizeToken(status);
    const recordType = getPeladaRecordType(pelada);

    return `
      <section class="pelada-open-toolbar pelada-open-hero is-record-${escapeHtml(recordType)}">
        <span class="pelada-open-accent" aria-hidden="true"></span>
        <header class="pelada-open-header">
          <div class="pelada-open-title">
            <h3>${escapeHtml(pelada.local || "Pelada")}</h3>
          </div>
        </header>
        <div class="pelada-open-meta">
          <span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5.5" width="17" height="15" rx="2"/><path d="M8 3v5M16 3v5M4 10h16"/></svg>
            <strong>${escapeHtml(formatDateLabel(pelada.data))}</strong>
          </span>
          <span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>
            <strong>${escapeHtml(horario)}</strong>
          </span>
          <span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7.5h16v10H4zM7 12h.01M17 12h.01M12 9.5c1.4 0 2.5 1.1 2.5 2.5s-1.1 2.5-2.5 2.5-2.5-1.1-2.5-2.5 1.1-2.5 2.5-2.5Z"/></svg>
            <strong>${escapeHtml(formatCurrency(pelada.valor))}</strong>
          </span>
        </div>
        <div class="pelada-open-badges">
          ${renderPeladaTypeBadge(pelada)}
          <span class="pelada-open-status status-${escapeHtml(statusClass)}"><i></i>${escapeHtml(status)}</span>
        </div>
        <div class="pelada-open-actions">
          ${hasPermission("jogos:finalizar") ? `<button
            class="primary-button compact-button"
            type="button"
            data-pelada-action="finish-pelada"
            ${canFinalize ? "" : "disabled"}
            title="${escapeHtml(finishTitle)}"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4v16M7 5h10l-2 3 2 3H7"/></svg>
            <span>Finalizar Pelada</span>
          </button>` : ""}
          ${hasPermission("eventos:excluir") ? `
            <button
              class="pelada-delete-button"
              type="button"
              data-pelada-action="delete-pelada"
              data-pelada-id="${escapeHtml(pelada.id)}"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 10v7M14 10v7"/></svg>
              <span>Excluir registro</span>
            </button>
          ` : ""}
        </div>
      </section>
    `;
  }

  function renderTeamPresetsPanel(pelada, presets, jogadores) {
    const canManage = hasPermission("times:montar") && !isFinalizedPelada(pelada);
    const playerById = new Map(jogadores.map((player) => [player.id, player]));

    return `
      <section class="team-presets-section">
        <header class="team-presets-heading">
          <div>
            <span class="panel-kicker">Preparação</span>
            <h3>Times da pelada</h3>
          </div>
          ${canManage && presets.length ? `
            <button class="primary-button compact-button" type="button" data-pelada-action="add-team-preset">
              <span aria-hidden="true">+</span> Criar time
            </button>
          ` : ""}
        </header>
        ${presets.length
          ? `<div class="team-presets-grid">
              ${presets.map((preset, index) => renderTeamPresetCard(preset, index, playerById, canManage)).join("")}
            </div>`
          : `<div class="team-presets-empty">
              <span aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM16 10a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM3 19c0-3 2.1-5 5-5s5 2 5 5M13 15c.8-.7 1.8-1 3-1 2.8 0 4.5 1.9 4.5 4.5"/></svg>
              </span>
              <div><h3>Crie os times antes de começar</h3><p>Adicione Time A, B e C com até 5 jogadores de linha e 1 goleiro.</p></div>
              ${canManage ? `<button class="primary-button" type="button" data-pelada-action="add-team-preset">Criar primeiro time</button>` : ""}
            </div>`}
      </section>
    `;
  }

  function renderTeamPresetCard(preset, index, playerById, canManage) {
    const completeness = getPresetCompleteness(preset);
    const goalkeeper = playerById.get(preset.goleiroId);
    const linePlayers = uniqueIds(preset.linha || []).map((id) => playerById.get(id)).filter(Boolean);

    return `
      <article class="team-preset-card ${completeness.complete ? "is-complete" : "is-incomplete"}" style="--team-color:${escapeHtml(preset.cor || "#ff5a00")}">
        <div class="team-preset-top">
          <span class="team-preset-index">${String(index + 1).padStart(2, "0")}</span>
          <span class="team-preset-status"><i></i>${completeness.complete ? "Completo" : `${completeness.total}/6`}</span>
        </div>
        <div class="team-preset-identity">
          <span class="team-preset-monogram">${escapeHtml(getLiveTeamInitials(preset.nome, "T"))}</span>
          <span><strong>${escapeHtml(preset.nome || "Time")}</strong><small>5 linha + 1 goleiro</small></span>
        </div>
        <div class="team-preset-roster">
          <span class="team-preset-goalkeeper">
            <small>Goleiro</small>
            <strong>${goalkeeper ? escapeHtml(playerDisplayName(goalkeeper)) : "Não definido"}</strong>
          </span>
          <div class="team-preset-line">
            ${linePlayers.length
              ? linePlayers.map((player) => `<span>${renderPlayerAvatar(player, "player-avatar team-preset-avatar")}<small>${escapeHtml(shortPlayerName(player))}</small></span>`).join("")
              : `<small class="team-preset-no-line">Nenhum jogador de linha</small>`}
          </div>
        </div>
        ${canManage ? `
          <div class="team-preset-actions">
            <button type="button" data-pelada-action="edit-team-preset" data-preset-id="${escapeHtml(preset.id)}">Editar time</button>
            <button class="is-danger" type="button" data-pelada-action="delete-team-preset" data-preset-id="${escapeHtml(preset.id)}">Excluir</button>
          </div>
        ` : ""}
      </article>
    `;
  }

  function ensureMatchDraftForPresets(pelada, presets) {
    const presetById = new Map(presets.map((preset) => [preset.id, preset]));
    const currentA = presetById.get(state.matchPresetIds.A);
    const currentB = presetById.get(state.matchPresetIds.B);

    if (!currentA || !currentB || currentA.id === currentB.id) {
      const suggested = getSuggestedMatchup(pelada, presets);
      hydrateMatchDraft(suggested.presetA, suggested.presetB);
    }

    return {
      presetA: presetById.get(state.matchPresetIds.A) || null,
      presetB: presetById.get(state.matchPresetIds.B) || null,
    };
  }

  function renderGameSetup(pelada, jogadores, presets = []) {
    if (!hasPermission("jogos:iniciar")) return "";

    if (pelada.status === "Finalizada") {
      return `
        <section class="data-card game-setup-card">
          <div class="empty-state compact-empty">
            <h3>Pelada finalizada</h3>
            <p>Esta pelada já foi encerrada. Os times e o histórico continuam disponíveis para consulta.</p>
          </div>
        </section>
      `;
    }

    if (presets.length < 2) {
      return `
        <section class="data-card game-setup-card next-match-card is-locked">
          <div class="empty-state compact-empty">
            <span class="panel-kicker">Próximo jogo</span>
            <h3>Faltam times para começar</h3>
            <p>Crie pelo menos dois times da pelada. O confronto será carregado automaticamente.</p>
            ${hasPermission("times:montar") ? `<button class="primary-button compact-button" type="button" data-pelada-action="show-detail-times">Abrir times</button>` : ""}
          </div>
        </section>
      `;
    }

    const { presetA, presetB } = ensureMatchDraftForPresets(pelada, presets);
    const draft = normalizeGameDraft(jogadores);
    const suggested = getSuggestedMatchup(pelada, presets);
    const queueIds = uniqueIds(suggested.fila).filter((id) => id !== presetA?.id && id !== presetB?.id);
    const presetById = new Map(presets.map((preset) => [preset.id, preset]));

    return `
      <section class="data-card game-setup-card next-match-card">
        <div class="next-match-heading">
          <div>
            <span class="panel-kicker">Próximo confronto</span>
            <h3>${escapeHtml(draft.A.nome)} <i>×</i> ${escapeHtml(draft.B.nome)}</h3>
          </div>
          <span class="next-match-ready"><i></i>Pronto</span>
        </div>
        <form class="game-form" id="game-form" novalidate>
          <div class="form-errors" id="game-form-errors" hidden></div>
          <input type="hidden" name="timeANome" value="${escapeHtml(draft.A.nome)}" />
          <input type="hidden" name="timeACor" value="${escapeHtml(draft.A.cor)}" />
          <input type="hidden" name="timeBNome" value="${escapeHtml(draft.B.nome)}" />
          <input type="hidden" name="timeBCor" value="${escapeHtml(draft.B.cor)}" />
          <div class="matchup-selectors">
            <label><span>Lado A</span><select name="presetAId" data-match-preset="A">${renderPresetOptions(presets, presetA?.id, presetB?.id)}</select></label>
            <span class="matchup-versus">VS</span>
            <label><span>Lado B</span><select name="presetBId" data-match-preset="B">${renderPresetOptions(presets, presetB?.id, presetA?.id)}</select></label>
          </div>
          <div class="match-lineup-grid">
            ${renderMatchLineupCard("A", draft.A, jogadores, state.matchPersist.A)}
            ${renderMatchLineupCard("B", draft.B, jogadores, state.matchPersist.B)}
          </div>
          ${queueIds.length ? `
            <div class="waiting-queue">
              <span>Na espera</span>
              ${queueIds.map((id, index) => `<strong><i>${index + 1}</i>${escapeHtml(presetById.get(id)?.nome || "Time")}</strong>`).join("")}
            </div>
          ` : `<div class="waiting-queue is-empty"><span>Sem time na espera</span></div>`}
          <div class="form-actions">
            <button class="primary-button big-touch start-next-game-button" type="submit">
              <span>Iniciar próximo jogo</span><small>${escapeHtml(draft.A.nome)} × ${escapeHtml(draft.B.nome)}</small>
            </button>
          </div>
        </form>
      </section>
    `;
  }

  function renderPresetOptions(presets, selectedId, blockedId) {
    return presets.map((preset) => `
      <option value="${escapeHtml(preset.id)}" ${preset.id === selectedId ? "selected" : ""} ${preset.id === blockedId ? "disabled" : ""}>
        ${escapeHtml(preset.nome || "Time")}
      </option>
    `).join("");
  }

  function renderMatchLineupCard(teamKey, draft, jogadores, persistChanges) {
    const playerById = new Map(jogadores.map((player) => [player.id, player]));
    const goalkeeper = playerById.get(draft.goleiro);
    const linePlayers = uniqueIds(draft.linha).map((id) => playerById.get(id)).filter(Boolean);
    const complete = linePlayers.length === 5 && Boolean(goalkeeper);

    return `
      <article class="match-lineup-card is-${teamKey.toLowerCase()} ${complete ? "is-complete" : "is-incomplete"}" style="--team-color:${escapeHtml(draft.cor)}">
        <header><span>Time ${teamKey}</span><strong>${escapeHtml(draft.nome)}</strong><small>${complete ? "6 jogadores" : `${linePlayers.length + (goalkeeper ? 1 : 0)}/6 · incompleto`}</small></header>
        <div class="match-lineup-goalkeeper">
          <small>GK</small>
          ${goalkeeper ? renderPlayerAvatar(goalkeeper, "player-avatar match-lineup-avatar") : `<i>—</i>`}
          <strong>${goalkeeper ? escapeHtml(shortPlayerName(goalkeeper)) : "Sem goleiro"}</strong>
        </div>
        <div class="match-lineup-players">
          ${linePlayers.map((player) => `<span>${renderPlayerAvatar(player, "player-avatar match-lineup-avatar")}<small>${escapeHtml(shortPlayerName(player))}</small></span>`).join("")}
          ${Array.from({ length: Math.max(0, 5 - linePlayers.length) }, () => `<span class="is-empty"><i>+</i><small>Vaga</small></span>`).join("")}
        </div>
        <div class="match-lineup-actions">
          <button type="button" data-pelada-action="open-lineup" data-team="${teamKey}">Editar escalação</button>
          <button type="button" data-pelada-action="open-goalkeeper" data-team="${teamKey}">Trocar goleiro</button>
        </div>
        <label class="persist-lineup-toggle">
          <input type="checkbox" name="persist${teamKey}" value="1" data-persist-team="${teamKey}" ${persistChanges ? "checked" : ""} />
          <span><strong>Manter nos próximos jogos</strong></span>
        </label>
      </article>
    `;
  }

  function renderLegacyGameSetup(pelada, jogadores) {
    if (!hasPermission("jogos:iniciar")) return "";

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
    const selectedCount = isGoalkeeperSelection ? (selectedGoalkeeper ? 1 : 0) : selectedLine.size;
    const selectionTitle = isGoalkeeperSelection ? "Escolha o goleiro" : "Monte a escalação";
    const selectionDescription = isGoalkeeperSelection
      ? "Mostrando atletas GK ou cadastrados como goleiros. Escolha apenas um para o time."
      : "Mostrando jogadores de linha ativos ou convidados. Marque todos que vão jogar neste time.";

    return `
      <form class="team-selection-form team-selection-form-${escapeHtml(selectionType)}" id="team-selection-form" data-team="${escapeHtml(teamKey)}" data-selection-type="${escapeHtml(selectionType)}" novalidate>
        <div class="selection-modal-intro">
          <span class="selection-team-pill">Time ${escapeHtml(teamKey)}</span>
          <span class="selection-modal-copy">
            <strong>${escapeHtml(selectionTitle)}</strong>
            <small>${escapeHtml(selectionDescription)}</small>
          </span>
          <span class="selection-count-pill">${escapeHtml(selectedCount)} selecionado${selectedCount === 1 ? "" : "s"}</span>
        </div>
        <div class="selection-search">
          <label class="field-label">
            <span>Buscar jogador</span>
            <input type="search" name="search" placeholder="Digite nome ou apelido..." autocomplete="off" />
          </label>
        </div>
        <div class="player-selection-list">
          ${
            isGoalkeeperSelection
              ? `
                <label class="player-selection-option is-clear-option">
                  <input type="radio" name="goalkeeperId" value="" ${selectedGoalkeeper ? "" : "checked"} />
                  <span class="selection-avatar-placeholder">?</span>
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
                    const optionClass = [
                      "player-selection-option",
                      checked ? "is-selected" : "",
                      blockReason ? "is-disabled" : "",
                    ]
                      .filter(Boolean)
                      .join(" ");

                    return `
                      <label class="${escapeHtml(optionClass)}" data-player-name="${escapeHtml(normalizeToken(playerDisplayName(player)))}">
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
                          <small>
                            <b>${escapeHtml(player.posicaoPrincipal || "-")}</b>
                            <em>${escapeHtml(player.overall || "-")} OVR</em>
                            <i>${escapeHtml(player.peForte || "Pé não informado")}</i>
                          </small>
                          ${blockReason ? `<small class="selection-block-reason">${escapeHtml(blockReason)}</small>` : ""}
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

  function renderTeamPresetEditor(preset, players, presets) {
    const assignedElsewhere = new Map();
    presets
      .filter((item) => item.id !== preset?.id)
      .forEach((item) => {
        uniqueIds([item.goleiroId, ...(item.linha || [])]).forEach((playerId) => assignedElsewhere.set(playerId, item.nome || "Outro time"));
      });
    const selectedLine = new Set(preset?.linha || []);
    const goalkeeperId = preset?.goleiroId || "";

    return `
      <form class="team-preset-form" id="team-preset-form" data-preset-id="${escapeHtml(preset?.id || "")}" novalidate>
        <div class="form-errors" id="team-preset-errors" hidden></div>
        <section class="team-preset-form-hero" style="--team-color:${escapeHtml(preset?.cor || "#ff5a00")}">
          <span class="team-preset-form-icon">${escapeHtml(getLiveTeamInitials(preset?.nome, "T"))}</span>
          <div><span>Time da pelada</span><h3>${escapeHtml(preset?.nome || "Novo time")}</h3><p>Até 5 jogadores de linha e 1 goleiro.</p></div>
        </section>
        <div class="team-preset-basics">
          <label class="field-label"><span>Nome do time</span><input name="nome" value="${escapeHtml(preset?.nome || "")}" maxlength="28" placeholder="Ex.: Time A" required /></label>
          <label class="field-label team-color-field"><span>Cor</span><input type="color" name="cor" value="${escapeHtml(preset?.cor || "#ff5a00")}" /></label>
        </div>
        <label class="field-label">
          <span>Goleiro</span>
          <select name="goleiroId">
            <option value="">Escolher goleiro</option>
            ${players.map((player) => {
              const assignedTeam = assignedElsewhere.get(player.id);
              return `<option value="${escapeHtml(player.id)}" ${player.id === goalkeeperId ? "selected" : ""} ${assignedTeam ? "disabled" : ""}>${escapeHtml(playerDisplayName(player))} · ${escapeHtml(player.posicaoPrincipal || "-")}${assignedTeam ? ` · ${escapeHtml(assignedTeam)}` : ""}</option>`;
            }).join("")}
          </select>
        </label>
        <div class="team-preset-player-heading"><span>Jogadores de linha</span><strong data-line-count>${selectedLine.size}/5</strong></div>
        <div class="team-preset-player-list">
          ${players.map((player) => {
            const assignedTeam = assignedElsewhere.get(player.id);
            const checked = selectedLine.has(player.id);
            const blocked = Boolean(assignedTeam) || player.id === goalkeeperId;
            return `
              <label class="team-preset-player-option ${checked ? "is-selected" : ""} ${blocked ? "is-disabled" : ""}" data-player-option>
                <input type="checkbox" name="linhaIds" value="${escapeHtml(player.id)}" ${checked ? "checked" : ""} ${blocked ? "disabled" : ""} />
                ${renderPlayerAvatar(player, "player-avatar small")}
                <span><strong>${escapeHtml(playerDisplayName(player))}</strong><small>${escapeHtml(player.posicaoPrincipal || "-")} · ${escapeHtml(player.overall || "-")} OVR${assignedTeam ? ` · ${escapeHtml(assignedTeam)}` : ""}</small></span>
                <i aria-hidden="true">✓</i>
              </label>
            `;
          }).join("")}
        </div>
        <div class="team-preset-form-note"><strong>Time incompleto?</strong><span>Você pode salvar agora e completar antes de iniciar a partida.</span></div>
        <div class="form-actions">
          <button class="primary-button big-touch" type="submit">Salvar time</button>
          <button class="ghost-button big-touch" type="button" data-modal-close>Cancelar</button>
        </div>
      </form>
    `;
  }

  async function openTeamPresetEditor(presetId = "") {
    if (!state.selectedPeladaId || !requirePermission("times:montar")) return;
    const [players, presets] = await Promise.all([
      readActivePlayers(),
      readTeamPresets(state.selectedPeladaId),
    ]);
    const preset = presets.find((item) => item.id === presetId) || null;
    const modal = openLiveModal(preset ? "Editar time" : "Criar time", renderTeamPresetEditor(preset, players, presets));
    const form = modal.querySelector("#team-preset-form");
    const lineInputs = [...form.querySelectorAll('input[name="linhaIds"]')];
    const countLabel = form.querySelector("[data-line-count]");
    const goalkeeperSelect = form.elements.goleiroId;

    const refreshOptions = () => {
      const goalkeeperId = goalkeeperSelect.value;
      let checkedCount = lineInputs.filter((input) => input.checked).length;
      lineInputs.forEach((input) => {
        const option = input.closest("[data-player-option]");
        const isGoalkeeper = input.value === goalkeeperId;
        if (isGoalkeeper && input.checked) {
          input.checked = false;
          checkedCount -= 1;
        }
        input.disabled = input.dataset.assigned === "true" || isGoalkeeper || (!input.checked && checkedCount >= 5);
        option?.classList.toggle("is-selected", input.checked);
        option?.classList.toggle("is-disabled", input.disabled);
      });
      countLabel.textContent = `${checkedCount}/5`;
    };

    lineInputs.forEach((input) => {
      if (input.disabled && input.value !== goalkeeperSelect.value) input.dataset.assigned = "true";
      input.addEventListener("change", refreshOptions);
    });
    goalkeeperSelect.addEventListener("change", refreshOptions);
    refreshOptions();

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const nome = String(form.elements.nome?.value || "").trim();
      const linha = lineInputs.filter((input) => input.checked && !input.disabled).map((input) => input.value);
      const goleiroId = form.elements.goleiroId?.value || "";
      const errors = [];
      if (!nome) errors.push("Informe o nome do time.");
      if (linha.length > 5) errors.push("Escolha no máximo 5 jogadores de linha.");
      if (goleiroId && linha.includes(goleiroId)) errors.push("O goleiro não pode estar também na linha.");
      showFormErrors("team-preset-errors", errors);
      if (errors.length) return;

      const savedAt = nowIso();
      const record = {
        ...(preset || {}),
        id: preset?.id || uid(),
        tipo: "preset",
        peladaId: state.selectedPeladaId,
        jogoId: "",
        ordem: preset?.ordem || presets.length + 1,
        nome,
        cor: form.elements.cor?.value || "#ff5a00",
        linha: uniqueIds(linha),
        goleiroId,
        jogadores: uniqueIds([goleiroId, ...linha]),
        status: "Ativo",
        createdAt: preset?.createdAt || savedAt,
        updatedAt: savedAt,
        revision: (preset?.revision || 0) + 1,
      };
      await putRecords({
        times: [record],
        syncQueue: [createSyncQueueRecord("times", "upsert", record.id, record)],
        auditLog: [createAuditRecord("times", record.id, preset ? "editar-preset" : "criar-preset", preset, record)],
      });
      closeLiveModal();
      state.matchPresetIds = { A: "", B: "" };
      await renderCurrentSection();
      runBackgroundTask(syncNow, "Falha ao sincronizar time da pelada");
    });
  }

  async function deleteTeamPreset(presetId) {
    if (!state.selectedPeladaId || !requirePermission("times:montar")) return;
    const preset = await getRecord("times", presetId);
    if (!preset || !isTeamPreset(preset)) return;
    if (!window.confirm(`Excluir ${preset.nome || "este time"}?\n\nOs jogos já finalizados continuarão preservados.`)) return;

    const queueRecord = createSyncQueueRecord("times", "delete", preset.id, {});
    await putRecords({
      syncQueue: [queueRecord],
      auditLog: [createAuditRecord("times", preset.id, "excluir-preset", preset, null)],
    });
    await deleteRecords({ times: [preset.id] });
    state.matchPresetIds = { A: "", B: "" };
    await renderCurrentSection();
    runBackgroundTask(syncNow, "Falha ao sincronizar exclusão do time");
  }

  function getGameNumber(jogos, jogoId) {
    const index = jogos.findIndex((jogo) => jogo.id === jogoId);
    const storedNumber = index >= 0 ? Number(jogos[index]?.numero || 0) : 0;
    return storedNumber > 0 ? storedNumber : index >= 0 ? index + 1 : 1;
  }

  function getNextGameNumber(jogos = []) {
    return jogos.reduce(
      (highest, jogo, index) => Math.max(highest, Number(jogo?.numero || 0) || index + 1),
      0
    ) + 1;
  }

  async function resolveGameNumber(jogo) {
    const storedNumber = Number(jogo?.numero || 0);

    if (storedNumber > 0 || !jogo?.peladaId) {
      return storedNumber || 1;
    }

    return getGameNumber(await readGamesForPelada(jogo.peladaId), jogo.id);
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

    const penalties = jogo.decididoNosPenaltis
      ? ` (${jogo.penaltisA || 0} x ${jogo.penaltisB || 0} nos pênaltis)`
      : "";
    return ` - encerramento por ${jogo.formaEncerramento}${penalties}`;
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
      <div class="game-summary-screen">
        <header class="game-summary-header">
          <button class="game-summary-back" type="button" data-pelada-action="close-summary" aria-label="Voltar para a pelada">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
            <span>Pelada</span>
          </button>
          <div class="game-summary-heading">
            <span>${escapeHtml(formatDateLabel(pelada.data))}</span>
            <h2>Resumo do Jogo ${escapeHtml(gameNumber)}</h2>
          </div>
          ${hasPermission("eventos:excluir") && bundle.jogo.status !== "Em andamento" ? `
            <button
              class="game-summary-delete"
              type="button"
              data-pelada-action="delete-game"
              data-game-id="${escapeHtml(bundle.jogo.id)}"
              data-game-number="${escapeHtml(gameNumber)}"
            >
              Excluir jogo
            </button>
          ` : ""}
        </header>
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

  function renderPeladaSuggestionCard(title, stats, scoreKey, scoreLabel) {
    const suggestionType = scoreKey === "mediaDesempenho" ? "bagre" : "mvp";

    if (!stats) {
      return `
        <article class="pelada-suggestion-card is-${suggestionType} is-empty">
          <span class="finish-suggestion-badge">${suggestionType === "mvp" ? "MVP" : "BAGRE"}</span>
          <span class="metric-label">${escapeHtml(title)}</span>
          <strong>Aguardando dados</strong>
        </article>
      `;
    }

    return `
      <article class="pelada-suggestion-card is-${suggestionType}">
        <header>
          <span class="finish-suggestion-badge">${suggestionType === "mvp" ? "MVP" : "BAGRE"}</span>
          <span class="metric-label">${escapeHtml(title)}</span>
        </header>
        <div class="finish-suggestion-player">
          ${renderPlayerAvatar(stats.jogador, "player-avatar finish-suggestion-avatar")}
          <span>
            <strong>${escapeHtml(playerDisplayName(stats.jogador))}</strong>
            <small>${escapeHtml(stats.jogador.posicaoPrincipal || "-")} · ${escapeHtml(stats.jogador.overall || "-")} OVR</small>
          </span>
        </div>
        <em><small>${escapeHtml(scoreLabel)}</small><strong>${escapeHtml(formatScoreNumber(stats[scoreKey]))}</strong></em>
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

        <section class="finish-pelada-hero">
          <span class="finish-pelada-kicker">Encerramento da rodada</span>
          <h3>${escapeHtml(summary.pelada.local || "Pelada")}</h3>
          <time>${escapeHtml(formatDateLabel(summary.pelada.data))}</time>
        </section>

        <section class="pelada-finish-block finish-summary-block">
          <header class="finish-block-heading">
            <span>01</span>
            <div><h3>Resumo da pelada</h3></div>
          </header>
          <div class="finish-metrics-grid">
            <span><small>Jogos</small><strong>${escapeHtml(summary.totals.jogosRealizados)}</strong></span>
            <span><small>Gols</small><strong>${escapeHtml(summary.totals.gols)}</strong></span>
            <span><small>Assistências</small><strong>${escapeHtml(summary.totals.assistencias)}</strong></span>
            <span><small>Faltas</small><strong>${escapeHtml(summary.totals.faltas)}</strong></span>
            <span><small>Ações defensivas</small><strong>${escapeHtml(summary.totals.acoesDefensivas)}</strong></span>
            <span><small>Defesas difíceis</small><strong>${escapeHtml(summary.totals.defesasDificeis)}</strong></span>
          </div>
          <div class="finish-leaders-grid">
            <span><small>Artilheiro</small><strong>${escapeHtml(renderPeladaLeaderText(summary.leaders.artilheiro, "gols"))}</strong></span>
            <span><small>Garçom</small><strong>${escapeHtml(renderPeladaLeaderText(summary.leaders.assistencias, "assistencias"))}</strong></span>
            <span><small>Maior participação</small><strong>${escapeHtml(renderPeladaLeaderText(summary.leaders.participacoesGol, "participacoesGol"))}</strong></span>
            <span><small>Mais vitórias</small><strong>${escapeHtml(renderPeladaLeaderText(summary.leaders.vitorias, "vitorias"))}</strong></span>
            <span><small>Goleiro destaque</small><strong>${escapeHtml(renderPeladaLeaderText(summary.leaders.goleiroDefesas, "defesasDificeis"))}</strong></span>
          </div>
        </section>

        <section class="pelada-finish-block finish-suggestions-block">
          <header class="finish-block-heading">
            <span>02</span>
            <div><h3>Sugestões do BagreScore</h3></div>
          </header>
          <div class="pelada-suggestion-grid">
            ${renderPeladaSuggestionCard("MVP recomendado", summary.suggestions.mvp, "pontuacao", "Pontuação")}
            ${renderPeladaSuggestionCard("Bagre recomendado", summary.suggestions.bagre, "mediaDesempenho", "Média por jogo")}
          </div>
        </section>

        <section class="pelada-finish-block finish-choices-block">
          <header class="finish-block-heading">
            <span>03</span>
            <div><h3>Escolhas finais</h3><p>MVP e Bagre precisam ser jogadores diferentes.</p></div>
          </header>
          <div class="form-grid finish-choice-grid">
            <label class="field-label">
              <span>MVP da Pelada *</span>
              <select name="mvpJogadorId" ${canChoose ? "" : "disabled"}>
                ${renderAwardPlayerOptions(summary, summary.suggestions.mvp?.jogadorId || "", "pontuacao")}
              </select>
            </label>
            <label class="field-label">
              <span>Bagre da Pelada *</span>
              <select name="bagreJogadorId" ${canChoose ? "" : "disabled"}>
                ${renderAwardPlayerOptions(summary, summary.suggestions.bagre?.jogadorId || "", "mediaDesempenho")}
              </select>
            </label>
            <label class="field-label wide-field">
              <span>Observações</span>
              <textarea name="observacoes" rows="3" placeholder="Ex.: escolha confirmada pelo grupo após a última partida."></textarea>
            </label>
          </div>
        </section>

        <div class="form-actions">
          <button class="primary-button big-touch" type="submit" ${canChoose ? "" : "disabled"}>Finalizar pelada</button>
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
          </div>
        </div>
        ${
          jogos.length
            ? `<div class="game-history-grid">${jogos
                .map((jogo) =>
                  renderGameHistoryCard(jogo, getGameNumber(jogos, jogo.id), eventsByGameId.get(jogo.id) || [], playerById)
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
          <span class="game-score-small">
            <small>Jogo</small>
            <strong>${escapeHtml(gameNumber)}</strong>
          </span>
          <span class="game-history-main">
            <strong>${escapeHtml(teamNameFromGame(jogo, "A"))} <em>${escapeHtml(jogo.placarA ?? 0)} x ${escapeHtml(jogo.placarB ?? 0)}</em> ${escapeHtml(teamNameFromGame(jogo, "B"))}</strong>
            <small>${escapeHtml(getGameStatusLabel(jogo))}${escapeHtml(formatGameEnding(jogo))}</small>
            ${renderGameGoalsSummary(jogo, events, playerById)}
          </span>
          <span class="game-history-cta">Ver resumo</span>
        </button>
      </article>
    `;
  }

  function renderGameSummary(bundle, pelada, gameNumber = "") {
    const {
      jogo,
      playersA,
      playersB,
      participantsA = playersA,
      participantsB = playersB,
    } = bundle;
    const winner = getGameWinner(jogo);
    const ending = jogo.formaEncerramento ? `Encerrado por ${jogo.formaEncerramento}` : getGameStatusLabel(jogo);

    return `
      <main class="game-summary game-summary-modern">
        <section class="game-summary-scoreboard">
          <div class="game-summary-status-line">
            <span class="game-summary-status ${jogo.status === "Finalizado" ? "is-finished" : "is-live"}">${escapeHtml(getGameStatusLabel(jogo))}</span>
            <small>${escapeHtml(ending)}</small>
          ${
            jogo.status === "Em andamento"
              ? `<button class="primary-button compact-button" type="button" data-pelada-action="open-live" data-game-id="${escapeHtml(jogo.id)}">Abrir ao vivo</button>`
              : ""
          }
          </div>
          <div class="summary-score">
            <div class="summary-score-team is-a">
              <span>TA</span>
              <strong>${escapeHtml(teamNameFromGame(jogo, "A"))}</strong>
            </div>
            <div class="summary-score-result">
              <small>Placar final</small>
              <strong><b>${escapeHtml(jogo.placarA ?? 0)}</b><i>–</i><b>${escapeHtml(jogo.placarB ?? 0)}</b></strong>
              ${jogo.decididoNosPenaltis ? `<em>Pênaltis · ${escapeHtml(jogo.penaltisA || 0)} – ${escapeHtml(jogo.penaltisB || 0)}</em>` : ""}
              <span>${escapeHtml(winner === "Empate" ? "Partida empatada" : `Vencedor: ${winner}`)}</span>
            </div>
            <div class="summary-score-team is-b">
              <span>TB</span>
              <strong>${escapeHtml(teamNameFromGame(jogo, "B"))}</strong>
            </div>
          </div>
        </section>

        <section class="game-summary-section game-summary-lineups">
          <header><span>Escalações</span><h3>Times da partida</h3></header>
          <div class="summary-columns">
            ${renderSummaryTeam(teamNameFromGame(jogo, "A"), participantsA, "A")}
            ${renderSummaryTeam(teamNameFromGame(jogo, "B"), participantsB, "B")}
          </div>
        </section>

        <section class="game-summary-section game-summary-numbers">
          <header><span>Desempenho</span><h3>Números da partida</h3></header>
          ${renderEventSummaryStats(bundle)}
        </section>

        <section class="game-summary-section future-stats">
          <header><span>Linha do tempo</span><h3>Eventos registrados</h3></header>
          ${renderEventTimeline(bundle)}
        </section>
      </main>
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

  function renderSummaryTeam(title, players, teamKey = "A") {
    return `
      <article class="summary-team is-team-${teamKey.toLowerCase()}">
        <header><span>Time ${escapeHtml(teamKey)}</span><h3>${escapeHtml(title)}</h3></header>
        ${
          players.length
            ? `<ul>${players.map((player) => `
                <li>
                  ${renderPlayerAvatar(player, "player-avatar summary-player-avatar")}
                  <span><strong>${escapeHtml(playerDisplayName(player))}</strong><small>${escapeHtml(player.posicaoPrincipal || player.tipoJogador || "Jogador")}</small></span>
                </li>
              `).join("")}</ul>`
            : `<p>Sem jogadores.</p>`
        }
      </article>
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
    gameForm?.addEventListener("change", async (event) => {
      syncGameDraftFromForm(gameForm);
      const presetSelect = event.target.closest("[data-match-preset]");
      const persistToggle = event.target.closest("[data-persist-team]");

      if (persistToggle) {
        state.matchPersist[persistToggle.dataset.persistTeam] = persistToggle.checked;
      }

      if (presetSelect && state.selectedPeladaId) {
        const teamKey = presetSelect.dataset.matchPreset;
        const presets = await readTeamPresets(state.selectedPeladaId);
        const preset = presets.find((item) => item.id === presetSelect.value);
        if (preset) {
          state.matchPresetIds[teamKey] = preset.id;
          state.gameDraft[teamKey] = teamPresetToDraft(preset, teamKey);
          state.matchPersist[teamKey] = false;
          await renderCurrentSection();
        }
      }
    });

    // O contêiner é reaproveitado entre renderizações. Vincular a delegação
    // mais de uma vez fazia um único toque disparar várias confirmações.
    if (layout.dataset.peladaActionsBound === "true") {
      return;
    }
    layout.dataset.peladaActionsBound = "true";

    layout.addEventListener("click", async (event) => {
      const actionButton = event.target.closest("[data-pelada-action]");

      if (!actionButton) {
        return;
      }

      const action = actionButton.dataset.peladaAction;

      if (action === "add-team-preset") {
        state.peladaDetailView = "times";
        await openTeamPresetEditor();
        return;
      }

      if (action === "edit-team-preset") {
        await openTeamPresetEditor(actionButton.dataset.presetId || "");
        return;
      }

      if (action === "delete-team-preset") {
        await deleteTeamPreset(actionButton.dataset.presetId || "");
        return;
      }

      if (action === "delete-game") {
        await confirmAndDeleteGame(
          actionButton.dataset.gameId || "",
          actionButton.dataset.gameNumber || ""
        );
        return;
      }

      if (action === "delete-pelada") {
        await confirmAndDeletePelada(actionButton.dataset.peladaId || "");
        return;
      }

      if (action === "delete-all-tests") {
        await confirmAndDeleteAllTestPeladas();
        return;
      }

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

      if (action === "show-finalized") {
        state.selectedPeladaId = null;
        state.selectedGameSummaryId = null;
        state.peladasView = "finalizadas";
        await switchSection("peladas", { peladasView: "finalizadas", historyMode: "replace" });
        return;
      }

      if (action === "show-detail-confrontos" || action === "show-detail-times") {
        state.peladaDetailView = action === "show-detail-times" ? "times" : "confrontos";
        await renderCurrentSection();
        return;
      }

      if (action === "open-pelada") {
        const peladaId = actionButton.dataset.peladaId || "";
        state.selectedGameSummaryId = null;
        state.peladaDetailView = "confrontos";
        state.gameDraft = createEmptyGameDraft();
        state.matchPresetIds = { A: "", B: "" };
        state.matchPersist = { A: false, B: false };
        await switchSection("peladas", { peladaId });
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

        const peladaId = state.selectedPeladaId;
        actionButton.disabled = true;
        actionButton.setAttribute("aria-busy", "true");
        const originalLabel = actionButton.textContent;
        actionButton.textContent = "Carregando resumo...";

        try {
          await openPeladaFinishModal(peladaId);
        } finally {
          if (actionButton.isConnected) {
            actionButton.disabled = false;
            actionButton.removeAttribute("aria-busy");
            actionButton.textContent = originalLabel;
          }
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

  function buildEvolutionRollbackUpdates(evolutions, jogadores, atributos, savedAt) {
    const playerById = new Map(jogadores.map((player) => [player.id, player]));
    const attributesByPlayerId = new Map(
      atributos.map((record) => [record.jogadorId, record])
    );
    const changesByPlayerId = new Map();

    evolutions.forEach((evolution) => {
      if (!evolution.jogadorId || !evolution.atributo) return;
      const byAttribute = changesByPlayerId.get(evolution.jogadorId) || new Map();
      byAttribute.set(
        evolution.atributo,
        (byAttribute.get(evolution.atributo) || 0) + Number(evolution.variacao || 0)
      );
      changesByPlayerId.set(evolution.jogadorId, byAttribute);
    });

    const playerUpdates = [];
    const attributeUpdates = [];
    changesByPlayerId.forEach((byAttribute, playerId) => {
      const player = playerById.get(playerId);
      if (!player) return;
      const currentRecord = attributesByPlayerId.get(playerId) || {};
      const currentCard = recalcularOverallJogador({
        ...player,
        attributes: {
          ...defaultAttributes(player.tipoJogador, player.posicaoPrincipal),
          ...currentRecord,
        },
      });
      const nextAttributes = { ...currentCard.attributes };
      byAttribute.forEach((variation, attribute) => {
        if (attribute in nextAttributes) {
          nextAttributes[attribute] = clamp(
            normalizeAttributeValue(nextAttributes[attribute]) - Math.round(variation),
            1,
            99
          );
        }
      });
      const nextCard = recalcularOverallJogador({ ...player, attributes: nextAttributes });
      playerUpdates.push({
        ...player,
        overall: nextCard.overall,
        estrelas: nextCard.estrelas,
        updatedAt: savedAt,
        revision: (player.revision || 0) + 1,
      });
      attributeUpdates.push({
        ...currentRecord,
        jogadorId: playerId,
        ...nextCard.attributes,
        overall: nextCard.overall,
        estrelas: nextCard.estrelas,
        updatedAt: savedAt,
        revision: (currentRecord.revision || 0) + 1,
      });
    });

    return { playerUpdates, attributeUpdates };
  }

  function rebuildStatsCacheWithoutGames(cacheRecords, gameIds, savedAt) {
    return cacheRecords
      .filter((record) =>
        Object.keys(record.metricas?.resultadosPorJogo || {}).some((gameId) => gameIds.has(gameId))
      )
      .map((record) => {
        const resultadosPorJogo = { ...(record.metricas?.resultadosPorJogo || {}) };
        gameIds.forEach((gameId) => delete resultadosPorJogo[gameId]);
        const results = Object.values(resultadosPorJogo);
        const vitorias = results.filter((result) => result === "vitoria").length;
        const derrotas = results.filter((result) => result === "derrota").length;
        const empates = results.filter((result) => result === "empate").length;
        const jogos = results.length;
        return {
          ...record,
          metricas: {
            ...(record.metricas || {}),
            jogos,
            vitorias,
            derrotas,
            empates,
            aproveitamento: jogos
              ? Math.round(((vitorias * 3 + empates) / (jogos * 3)) * 100)
              : 0,
            resultadosPorJogo,
          },
          updatedAt: savedAt,
          revision: (record.revision || 0) + 1,
        };
      });
  }

  async function deletePeladaScope({ peladaId, requestedGameIds = [], removePelada = false }) {
    const [
      peladas,
      jogos,
      times,
      escalacoes,
      eventos,
      faltas,
      evolucoes,
      estatisticasCache,
      jogadores,
      atributos,
    ] = await Promise.all([
      getAllRecords("peladas"),
      getAllRecords("jogos"),
      getAllRecords("times"),
      getAllRecords("escalacoes"),
      getAllRecords("eventos"),
      getAllRecords("faltas"),
      getAllRecords("evolucoes"),
      getAllRecords("estatisticasCache"),
      getAllRecords("jogadores"),
      getAllRecords("atributos"),
    ]);
    const gameIds = new Set(
      removePelada
        ? jogos.filter((game) => game.peladaId === peladaId).map((game) => game.id)
        : requestedGameIds
    );
    const gamesToDelete = jogos.filter((game) => gameIds.has(game.id));

    if (gamesToDelete.some((game) => game.status === "Em andamento")) {
      throw new Error("Finalize o jogo ao vivo antes de excluir este registro.");
    }

    const eventsToDelete = eventos.filter((eventRecord) =>
      gameIds.has(eventRecord.jogoId) ||
      (removePelada && eventRecord.peladaId === peladaId)
    );
    const eventIds = new Set(eventsToDelete.map((eventRecord) => eventRecord.id));
    const lineupsToDelete = escalacoes.filter((lineup) => gameIds.has(lineup.jogoId));
    const teamsToDelete = times.filter((team) =>
      gameIds.has(team.jogoId) ||
      (removePelada && team.peladaId === peladaId)
    );
    const foulsToDelete = faltas.filter((foul) =>
      gameIds.has(foul.jogoId) || eventIds.has(foul.id)
    );
    const evolutionsToDelete = evolucoes.filter((evolution) =>
      gameIds.has(evolution.jogoId) || eventIds.has(evolution.eventoId)
    );
    const savedAt = nowIso();
    const { playerUpdates, attributeUpdates } = buildEvolutionRollbackUpdates(
      evolutionsToDelete,
      jogadores,
      atributos,
      savedAt
    );
    const cacheUpdates = rebuildStatsCacheWithoutGames(estatisticasCache, gameIds, savedAt);
    const currentPelada = peladas.find((pelada) => pelada.id === peladaId);
    const peladaUpdate = !removePelada &&
      currentPelada?.proximoConfronto?.jogoOrigemId &&
      gameIds.has(currentPelada.proximoConfronto.jogoOrigemId)
      ? {
          ...currentPelada,
          proximoConfronto: null,
          updatedAt: savedAt,
          revision: (currentPelada.revision || 0) + 1,
        }
      : null;
    const deletionGroups = {
      jogos: gamesToDelete,
      times: teamsToDelete,
      escalacoes: lineupsToDelete,
      eventos: eventsToDelete,
      faltas: foulsToDelete,
      evolucoes: evolutionsToDelete,
      ...(removePelada && currentPelada ? { peladas: [currentPelada] } : {}),
    };
    const syncRecords = [];

    Object.entries(deletionGroups).forEach(([storeName, records]) => {
      records.forEach((record) => {
        const entityId = storeName === "atributos" ? record.jogadorId : record.id;
        syncRecords.push(
          createSyncQueueRecord(storeName, "delete", entityId, {
            id: entityId,
            jogadorId: record.jogadorId || "",
          })
        );
      });
    });
    playerUpdates.forEach((player) =>
      syncRecords.push(createSyncQueueRecord("jogadores", "upsert", player.id, player))
    );
    attributeUpdates.forEach((record) =>
      syncRecords.push(
        createSyncQueueRecord("atributos", "upsert", record.jogadorId, record)
      )
    );
    cacheUpdates.forEach((record) =>
      syncRecords.push(
        createSyncQueueRecord("estatisticasCache", "upsert", record.id, record)
      )
    );
    if (peladaUpdate) {
      syncRecords.push(
        createSyncQueueRecord("peladas", "upsert", peladaUpdate.id, peladaUpdate)
      );
    }

    await mutateRecords({
      deletes: Object.fromEntries(
        Object.entries(deletionGroups).map(([storeName, records]) => [
          storeName,
          records.map((record) => storeName === "atributos" ? record.jogadorId : record.id),
        ])
      ),
      puts: {
        jogadores: playerUpdates,
        atributos: attributeUpdates,
        estatisticasCache: cacheUpdates,
        ...(peladaUpdate ? { peladas: [peladaUpdate] } : {}),
        syncQueue: syncRecords,
        auditLog: [
          createAuditRecord(
            removePelada ? "peladas" : "jogos",
            removePelada ? peladaId : [...gameIds][0] || peladaId,
            removePelada ? "excluir-pelada-cascata" : "excluir-jogo-cascata",
            {
              peladaId,
              jogos: gamesToDelete.map((game) => game.id),
              eventos: eventsToDelete.map((eventRecord) => eventRecord.id),
            },
            null
          ),
        ],
      },
    });

    return {
      gamesDeleted: gamesToDelete.length,
      eventsDeleted: eventsToDelete.length,
      playersAdjusted: playerUpdates.length,
    };
  }

  function openTypedDeleteModal({
    title,
    eyebrow,
    description,
    phrase,
    confirmLabel,
    onConfirm,
  }) {
    const modal = openLiveModal(
      title,
      `
        <form class="typed-delete-form" id="typed-delete-form" novalidate>
          <section class="typed-delete-warning">
            <span aria-hidden="true">!</span>
            <div>
              <small>${escapeHtml(eyebrow)}</small>
              <strong>Esta ação não pode ser desfeita</strong>
              <p>${escapeHtml(description)}</p>
            </div>
          </section>
          <label class="field-label">
            <span>Digite <b>${escapeHtml(phrase)}</b> para confirmar</span>
            <input name="confirmation" autocomplete="off" autocapitalize="characters" />
          </label>
          <div class="form-errors" id="typed-delete-errors" hidden></div>
          <div class="form-actions">
            <button class="danger-button big-touch" type="submit">${escapeHtml(confirmLabel)}</button>
            <button class="ghost-button big-touch" type="button" data-modal-close>Cancelar</button>
          </div>
        </form>
      `
    );
    const form = modal.querySelector("#typed-delete-form");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const typed = String(form.elements.confirmation?.value || "").trim();
      if (normalizeToken(typed) !== normalizeToken(phrase)) {
        showFormErrors("typed-delete-errors", [`Digite exatamente: ${phrase}`]);
        return;
      }
      const submit = form.querySelector('button[type="submit"]');
      submit.disabled = true;
      submit.textContent = "Excluindo...";
      try {
        await onConfirm();
        closeLiveModal();
      } catch (error) {
        console.error("Falha ao excluir registro", error);
        showFormErrors("typed-delete-errors", [
          error?.message || "Não foi possível excluir o registro.",
        ]);
        submit.disabled = false;
        submit.textContent = confirmLabel;
      }
    });
  }

  async function confirmAndDeleteGame(gameId, gameNumber = "") {
    if (!gameId || !requirePermission("eventos:excluir")) return;
    const game = await getRecord("jogos", gameId);
    if (!game) return;
    const label = gameNumber || game.numero || "";
    const phrase = `EXCLUIR JOGO ${label || "AGORA"}`;
    openTypedDeleteModal({
      title: `Excluir Jogo ${label}`,
      eyebrow: "Limpeza de registro",
      description: "O placar, as escalações e todos os eventos deste jogo serão removidos. Os jogadores e os outros jogos continuam intactos.",
      phrase,
      confirmLabel: "Excluir jogo",
      onConfirm: async () => {
        await deletePeladaScope({
          peladaId: game.peladaId,
          requestedGameIds: [game.id],
          removePelada: false,
        });
        state.selectedGameSummaryId = null;
        await switchSection("peladas", {
          peladaId: game.peladaId,
          historyMode: "replace",
        });
        runBackgroundTask(syncNow, "Falha ao sincronizar exclusão do jogo");
      },
    });
  }

  async function confirmAndDeletePelada(peladaId) {
    if (!peladaId || !requirePermission("eventos:excluir")) return;
    const pelada = await getRecord("peladas", peladaId);
    if (!pelada) return;
    const phrase = isTestPelada(pelada) ? "EXCLUIR TESTE" : "EXCLUIR PELADA";
    openTypedDeleteModal({
      title: isTestPelada(pelada) ? "Excluir pelada de teste" : "Excluir pelada",
      eyebrow: isTestPelada(pelada) ? "Ambiente de teste" : "Registro oficial",
      description: "A pelada e todos os jogos, times, escalações e eventos vinculados serão removidos. Os cadastros dos jogadores serão preservados.",
      phrase,
      confirmLabel: "Excluir pelada",
      onConfirm: async () => {
        await deletePeladaScope({ peladaId, removePelada: true });
        state.selectedPeladaId = null;
        state.selectedGameSummaryId = null;
        state.peladasView = "gerenciar";
        await switchSection("peladas", {
          peladasView: "gerenciar",
          historyMode: "replace",
        });
        runBackgroundTask(syncNow, "Falha ao sincronizar exclusão da pelada");
      },
    });
  }

  async function confirmAndDeleteAllTestPeladas() {
    if (!requirePermission("eventos:excluir")) return;
    const peladas = await getAllRecords("peladas");
    const testPeladas = peladas.filter(isTestPelada);
    if (!testPeladas.length) return;
    openTypedDeleteModal({
      title: "Apagar dados de teste",
      eyebrow: `${testPeladas.length} pelada${testPeladas.length === 1 ? "" : "s"} de teste`,
      description: "Somente registros marcados como teste serão apagados. Peladas oficiais, jogadores, rankings e cartas permanecem intactos.",
      phrase: "APAGAR TESTES",
      confirmLabel: "Apagar todos os testes",
      onConfirm: async () => {
        for (const pelada of testPeladas) {
          await deletePeladaScope({ peladaId: pelada.id, removePelada: true });
        }
        state.selectedPeladaId = null;
        state.selectedGameSummaryId = null;
        state.peladasView = "gerenciar";
        await switchSection("peladas", {
          peladasView: "gerenciar",
          historyMode: "replace",
        });
        runBackgroundTask(syncNow, "Falha ao sincronizar limpeza dos testes");
      },
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
    if (!peladaId || openingPeladaFinishIds.has(peladaId) || finalizingPeladaIds.has(peladaId)) {
      return;
    }

    openingPeladaFinishIds.add(peladaId);

    try {
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
    } finally {
      openingPeladaFinishIds.delete(peladaId);
    }
  }

  async function handleFinishPeladaSubmit(event, peladaId) {
    event.preventDefault();
    if (!requirePermission("jogos:finalizar")) return;

    const form = event.currentTarget;
    if (form.dataset.submitting === "true" || finalizingPeladaIds.has(peladaId)) return;

    form.dataset.submitting = "true";
    finalizingPeladaIds.add(peladaId);
    const buttons = [...form.querySelectorAll("button")];
    const submitButton = form.querySelector('button[type="submit"]');
    const originalSubmitLabel = submitButton?.textContent || "Finalizar pelada";
    let completed = false;

    buttons.forEach((button) => {
      button.disabled = true;
    });
    if (submitButton) submitButton.textContent = "Finalizando...";

    try {
      const summary = await readPeladaClosureSummary(peladaId);
      const pelada = summary?.pelada;
      const mvpJogadorId = form.elements.mvpJogadorId?.value || "";
      const bagreJogadorId = form.elements.bagreJogadorId?.value || "";
      const observacoes = String(form.elements.observacoes?.value || "").trim();
      const errors = [];

      if (!summary || !pelada) errors.push("Pelada não encontrada.");
      if (pelada && isFinalizedPelada(pelada)) {
        completed = true;
        closeLiveModal();
        state.selectedPeladaId = null;
        state.selectedGameSummaryId = null;
        state.peladasView = "gerenciar";
        await switchSection("peladas", { historyMode: "replace", peladasView: "gerenciar" });
        return;
      }
      if (summary && !summary.canFinalize) errors.push(summary.finishDisabledReason || "Não é possível finalizar esta pelada agora.");
      if (!mvpJogadorId) errors.push("Escolha manualmente o MVP da Pelada.");
      if (!bagreJogadorId) errors.push("Escolha manualmente o Bagre da Pelada.");
      if (mvpJogadorId && bagreJogadorId && mvpJogadorId === bagreJogadorId) {
        errors.push("MVP e Bagre da Pelada devem ser jogadores diferentes.");
      }

      showFormErrors("finish-pelada-errors", errors);
      if (errors.length) return;

      const savedAt = nowIso();
      const mvpScore = summary.scoreByPlayerId.get(mvpJogadorId)?.pontuacao || 0;
      const bagrePerformanceAverage = summary.scoreByPlayerId.get(bagreJogadorId)?.mediaDesempenho || 0;
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
        criadoPor: getActorId(),
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
        pontuacaoCalculada: Number(bagrePerformanceAverage.toFixed(2)),
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

      completed = true;
      for (const playerId of [mvpJogadorId, bagreJogadorId]) {
        try {
          await aplicarEvolucaoPorEventos(playerId);
        } catch (error) {
          console.warn("A pelada foi finalizada, mas uma evolução será recalculada depois.", error);
        }
      }

      closeLiveModal();
      state.selectedPeladaId = null;
      state.selectedGameSummaryId = null;
      state.peladasView = "gerenciar";
      await switchSection("peladas", { historyMode: "replace", peladasView: "gerenciar" });
      void syncNow();
    } catch (error) {
      console.error("Falha ao finalizar pelada", error);
      showFormErrors("finish-pelada-errors", ["Não foi possível finalizar a pelada. Tente novamente."]);
    } finally {
      finalizingPeladaIds.delete(peladaId);
      if (!completed && form.isConnected) {
        form.dataset.submitting = "false";
        buttons.forEach((button) => {
          button.disabled = false;
        });
        if (submitButton) submitButton.textContent = originalSubmitLabel;
      }
    }
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
      tipoRegistro: form.elements.tipoRegistro?.value === "teste" ? "teste" : "oficial",
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
    if (!requirePermission("peladas:criar")) return;

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
      proximoConfronto: null,
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
      presetAId: form.elements.presetAId?.value || state.matchPresetIds.A || "",
      presetBId: form.elements.presetBId?.value || state.matchPresetIds.B || "",
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
      persistA: Boolean(form.elements.persistA?.checked || state.matchPersist.A),
      persistB: Boolean(form.elements.persistB?.checked || state.matchPersist.B),
    };
  }

  function resolveMatchQueue(pelada, presets, presetAId, presetBId) {
    const saved = pelada?.proximoConfronto || {};
    const savedPair = new Set([saved.timeAId, saved.timeBId].filter(Boolean));
    const selectedPair = new Set([presetAId, presetBId].filter(Boolean));
    const usesSuggestion = savedPair.size === 2 && selectedPair.size === 2 &&
      [...savedPair].every((id) => selectedPair.has(id));
    const preferred = usesSuggestion ? uniqueIds(saved.fila || []) : [];
    const remaining = presets
      .map((preset) => preset.id)
      .filter((id) => id !== presetAId && id !== presetBId && !preferred.includes(id));
    return [...preferred, ...remaining];
  }

  function buildPersistentPresetUpdates(presets, data, savedAt) {
    return ["A", "B"].flatMap((teamKey) => {
      if (!data[`persist${teamKey}`]) return [];
      const presetId = data[`preset${teamKey}Id`];
      const preset = presets.find((item) => item.id === presetId);
      const team = data[`time${teamKey}`];
      if (!preset || !team) return [];
      return [{
        ...preset,
        nome: team.nome,
        cor: team.cor,
        jogadores: [...team.jogadores],
        linha: [...team.linha],
        goleiroId: team.goleiroId,
        updatedAt: savedAt,
        revision: (preset.revision || 0) + 1,
      }];
    });
  }

  function validateGameForm(data, selectedPelada, activeGame) {
    const errors = [];

    if (!selectedPelada) errors.push("Selecione ou crie uma pelada.");
    if (activeGame) errors.push("Finalize o jogo em andamento antes de iniciar outro.");
    if (data.presetAId && data.presetAId === data.presetBId) errors.push("Escolha dois times diferentes.");
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
    if (!requirePermission("jogos:iniciar")) return;

    const form = event.currentTarget;
    const submitButton = form.querySelector('button[type="submit"]');

    if (submitButton?.disabled) return;
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.classList.add("is-loading");
      submitButton.textContent = "Iniciando...";
    }

    const [jogadores, pelada, activeGame, peladaGames, presets] = await Promise.all([
      readActivePlayers(),
      state.selectedPeladaId ? getRecord("peladas", state.selectedPeladaId) : null,
      findActiveGame(),
      state.selectedPeladaId ? readGamesForPelada(state.selectedPeladaId) : Promise.resolve([]),
      state.selectedPeladaId ? readTeamPresets(state.selectedPeladaId) : Promise.resolve([]),
    ]);
    const data = collectGameFormData(form, jogadores);
    const errors = validateGameForm(data, pelada, activeGame);
    showFormErrors("game-form-errors", errors);

    if (errors.length) {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.classList.remove("is-loading");
        submitButton.textContent = "Iniciar Jogo";
      }
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
      tipo: "jogo",
      peladaId: pelada.id,
      presetId: data.presetAId,
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
      tipo: "jogo",
      peladaId: pelada.id,
      presetId: data.presetBId,
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
      numero: getNextGameNumber(peladaGames),
      tipoRegistro: getPeladaRecordType(pelada),
      presetAId: data.presetAId,
      presetBId: data.presetBId,
      filaTimes: resolveMatchQueue(pelada, presets, data.presetAId, data.presetBId),
      timeA: { id: timeAId, nome: timeA.nome, cor: timeA.cor },
      timeB: { id: timeBId, nome: timeB.nome, cor: timeB.cor },
      placarA: 0,
      placarB: 0,
      vencedor: "",
      status: "Em andamento",
      inicio: savedAt,
      fim: "",
      formaEncerramento: "",
      fase: "regular",
      decididoNosPenaltis: false,
      penaltisA: 0,
      penaltisB: 0,
      penaltiIniciaPor: "",
      penaltiProximoTime: "",
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
         ativo: true,
         entrouEm: savedAt,
         saiuEm: "",
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
         ativo: true,
         entrouEm: savedAt,
         saiuEm: "",
        createdAt: savedAt,
        updatedAt: savedAt,
        revision: 1,
      })),
    ];

    const persistentPresetUpdates = buildPersistentPresetUpdates(presets, data, savedAt);

    await putRecords({
      jogos: [jogoRecord],
      times: [timeA, timeB, ...persistentPresetUpdates],
      escalacoes,
      syncQueue: [
        createSyncQueueRecord("jogos", "upsert", jogoId, jogoRecord),
        createSyncQueueRecord("times", "upsert", timeAId, timeA),
        createSyncQueueRecord("times", "upsert", timeBId, timeB),
        ...persistentPresetUpdates.map((preset) => createSyncQueueRecord("times", "upsert", preset.id, preset)),
        ...escalacoes.map((escalacao) =>
          createSyncQueueRecord("escalacoes", "upsert", escalacao.id, escalacao)
        ),
      ],
      auditLog: [createAuditRecord("jogos", jogoId, "iniciar", null, { jogo: jogoRecord, escalacoes })],
    });

    setActiveGameId(jogoId);
    state.selectedGameSummaryId = jogoId;
    state.gameDraft = createEmptyGameDraft();
    state.matchPresetIds = { A: "", B: "" };
    state.matchPersist = { A: false, B: false };
    state.liveMessage = "";
    await switchSection("ao-vivo", { historyMode: "replace" });
    runBackgroundTask(syncNow, "Falha ao sincronizar início do jogo");
  }

  async function renderLiveSection() {
    setSectionTitle("Jogo", "Partida ao Vivo");
    const activeGame = await findActiveGame();

    if (activeGame && normalizeToken(activeGame.fase) !== "penaltis" && getRemainingGameSeconds(activeGame) <= 0) {
      await finalizeGame(activeGame.id, "Tempo");
      return;
    }

    const bundle = activeGame ? await readGameBundle(activeGame.id) : null;

    if (!bundle) {
      const jogos = await getAllRecords("jogos");
      const latestGame = jogos
        .sort((a, b) => String(b.fim || b.inicio || "").localeCompare(String(a.fim || a.inicio || "")))[0];
      const latestBundle = latestGame ? await readGameBundle(latestGame.id) : null;
      const latestGameNumber = latestGame ? await resolveGameNumber(latestGame) : 0;

      $("#section-content").innerHTML = `
        <div class="live-idle-screen">
          ${renderLiveIdleCard(latestBundle, latestGameNumber)}
        </div>
      `;
      bindLiveSectionEvents();
      return;
    }

    const { jogo, playersA, playersB } = bundle;
    const remaining = getRemainingGameSeconds(jogo);
    const gameNumber = await resolveGameNumber(jogo);

    if (normalizeToken(jogo.fase) === "penaltis") {
      stopLiveTimer();
      $("#section-content").innerHTML = `
        <div class="live-screen penalty-live-screen" data-game-id="${escapeHtml(jogo.id)}">
          ${renderPenaltyShootoutScreen(bundle, gameNumber)}
        </div>
      `;
      bindLiveSectionEvents();
      return;
    }

    $("#section-content").innerHTML = `
      <div class="live-screen" data-game-id="${escapeHtml(jogo.id)}">
        ${renderLiveScoreCard(bundle, remaining, gameNumber)}
        ${renderLivePitch(bundle)}
        ${state.liveMessage ? `
          <p class="live-message-bar" id="live-message">
            <span class="live-message-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="m8.5 12 2.2 2.2 4.8-5"/></svg>
            </span>
            <span>${escapeHtml(state.liveMessage)}</span>
          </p>
        ` : `<p class="live-message-bar" id="live-message" hidden></p>`}
        ${renderLiveEventsCard(bundle)}
        ${renderLiveControlBar(jogo)}
      </div>
    `;

    bindLiveSectionEvents();
    startLiveTimer(jogo.id);
  }

  function renderLiveIdleCard(bundle, gameNumber = 0) {
    if (!bundle) {
      return `
        <section class="live-idle-card">
          <span class="live-idle-kicker">Ao vivo</span>
          <h3>Nenhuma partida em andamento</h3>
          <p>Quando um jogo for iniciado em uma pelada, o placar ao vivo aparece aqui.</p>
        </section>
      `;
    }

    const { jogo, pelada, eventos, playerById } = bundle;
    const goals = eventos.filter((evento) => normalizeToken(evento.tipo) === "gol");
    const goalAuthors = goals.length
      ? goals.slice(0, 4).map((evento) => formatLiveIdleGoal(evento, jogo, playerById)).join(", ")
      : "Nenhum gol registrado";
    const extraGoals = goals.length > 4 ? ` +${goals.length - 4}` : "";
    const dateLabel = formatDateLabel(pelada?.data || jogo.inicio?.slice(0, 10) || jogo.createdAt?.slice(0, 10) || "");
    const winner = jogo.vencedor || getGameWinner(jogo);

    return `
      <section class="live-idle-card has-summary">
        <div class="live-idle-heading">
          <span class="live-idle-heading-copy">
            <span class="live-idle-kicker">${gameNumber ? `Jogo ${escapeHtml(gameNumber)}` : "Último jogo"}</span>
            <small>Última partida registrada</small>
          </span>
          <strong>${escapeHtml(getGameStatusLabel(jogo))}</strong>
        </div>
        <div class="live-idle-score" aria-label="Placar final">
          ${renderLiveIdleTeam(jogo, "A")}
          <span class="live-idle-score-center">
            <small>Placar final</small>
            <strong><span>${escapeHtml(jogo.placarA ?? 0)}</span><i aria-hidden="true">-</i><span>${escapeHtml(jogo.placarB ?? 0)}</span></strong>
            ${jogo.decididoNosPenaltis ? `<em>Pênaltis · ${escapeHtml(jogo.penaltisA || 0)} - ${escapeHtml(jogo.penaltisB || 0)}</em>` : ""}
          </span>
          ${renderLiveIdleTeam(jogo, "B")}
        </div>
        <div class="live-idle-meta">
          <span><small>Local</small><strong>${escapeHtml(pelada?.local || "Pelada")}</strong></span>
          <span><small>Data</small><strong>${escapeHtml(dateLabel)}</strong></span>
          <span><small>Resultado</small><strong>${escapeHtml(winner)}</strong></span>
        </div>
        <div class="live-idle-goals">
          <span>Gols</span>
          <strong>${escapeHtml(goalAuthors)}${escapeHtml(extraGoals)}</strong>
        </div>
        ${hasPermission("jogos:iniciar") ? `<div class="live-idle-actions">
          <button class="primary-button big-touch" type="button" data-live-action="new-game" data-pelada-id="${escapeHtml(jogo.peladaId || "")}">
            Criar nova partida
          </button>
        </div>` : ""}
      </section>
    `;
  }

  function getLiveTeamInitials(name, fallback = "") {
    return String(name || "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || fallback;
  }

  function renderLiveIdleTeam(jogo, teamKey) {
    const name = teamNameFromGame(jogo, teamKey);
    return `
      <span class="live-idle-team" style="--team-color: ${escapeHtml(teamColorFromGame(jogo, teamKey))};">
        <i aria-hidden="true">${escapeHtml(getLiveTeamInitials(name, teamKey))}</i>
        <strong>${escapeHtml(name)}</strong>
      </span>
    `;
  }

  function formatLiveIdleGoal(evento, jogo, playerById) {
    const author = playerNameFromMap(playerById, evento.jogadorId);

    if (evento.golContra) {
      const teamName = teamNameFromGame(jogo, evento.time || getEventTeamKey(evento, jogo));
      return `GC ${author} para ${teamName}`;
    }

    return author;
  }

  function renderLiveScoreCard(bundle, remaining, gameNumber = 1) {
    const { jogo } = bundle;
    const liveStatus = jogo.status === "Finalizado" ? "ENCERRADO" : jogo.pausadoEm ? "PAUSADO" : "AO VIVO";
    const statusClass = jogo.status === "Finalizado" ? "is-ended" : jogo.pausadoEm ? "is-paused" : "is-live";

    return `
      <section class="live-score-card">
        <svg class="live-score-frame" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path class="live-score-frame-main" d="M1 13 7 1h66l6 7h14l6 12v79H1Z"/>
          <path class="live-score-frame-accent" d="M2 13 8 2h64l6 7h14l6 11"/>
          <path class="live-score-frame-detail" d="M1 79h10l5 7h68l5-7h10"/>
        </svg>
        <div class="live-score-content">
          <div class="live-score-meta">
            <span class="live-match-eyebrow">
              <b>Jogo ${escapeHtml(gameNumber)}</b>
            </span>
          </div>
          <div class="live-score-board">
            ${renderLiveTeamBadge(bundle, "A")}
            <div class="live-score-center">
              <span class="live-score-status">
                <span class="live-status-dot ${statusClass}">${escapeHtml(liveStatus)}</span>
              </span>
              <strong><span id="live-score-a">${escapeHtml(jogo.placarA ?? 0)}</span> <i aria-hidden="true">-</i> <span id="live-score-b">${escapeHtml(jogo.placarB ?? 0)}</span></strong>
              <span class="timer" id="live-timer">${escapeHtml(formatClock(remaining))}</span>
            </div>
            ${renderLiveTeamBadge(bundle, "B")}
          </div>
        </div>
      </section>
    `;
  }

  function renderLiveTeamBadge(bundle, teamKey) {
    const jogo = bundle.jogo;
    const name = teamNameFromGame(jogo, teamKey);
    const initials = getLiveTeamInitials(name, teamKey);

    return `
      <div class="live-team-badge" style="--team-color: ${escapeHtml(teamColorFromGame(jogo, teamKey))};">
        <span>${escapeHtml(initials)}</span>
        <strong>${escapeHtml(name)}</strong>
      </div>
    `;
  }

  function getPenaltyEvents(bundle) {
    return (bundle?.eventos || []).filter((evento) => normalizeToken(evento.tipo) === "penalti_desempate");
  }

  function getPenaltyKickerEligibility(bundle, teamKey, events = getPenaltyEvents(bundle)) {
    const players = getLineupPlayers(bundle, teamKey)
      .filter((player, index, items) =>
        player?.id && items.findIndex((item) => item.id === player.id) === index
      );
    const attempts = events.filter((evento) => evento.time === teamKey && evento.jogadorId);
    const attemptCountByPlayer = attempts.reduce((counts, evento) => {
      counts.set(evento.jogadorId, (counts.get(evento.jogadorId) || 0) + 1);
      return counts;
    }, new Map());
    const completedCycles = players.length
      ? Math.min(...players.map((player) => attemptCountByPlayer.get(player.id) || 0))
      : 0;

    return {
      players,
      available: players.filter(
        (player) => (attemptCountByPlayer.get(player.id) || 0) === completedCycles
      ),
      cycle: completedCycles + 1,
    };
  }

  function renderPenaltyShootoutScreen(bundle, gameNumber) {
    const { jogo } = bundle;
    const penaltyEvents = getPenaltyEvents(bundle);
    const starterChosen = ["A", "B"].includes(jogo.penaltiIniciaPor);
    const nextTeam = jogo.penaltiProximoTime || jogo.penaltiIniciaPor || "";

    return `
      <section class="penalty-shootout-shell">
        <header class="penalty-shootout-heading">
          <span>Jogo ${escapeHtml(gameNumber)}</span>
          <strong>Disputa de pênaltis</strong>
        </header>
        <div class="penalty-regular-score">
          ${renderPenaltyTeamSummary(bundle, "A")}
          <span><small>Tempo normal</small><strong>${escapeHtml(jogo.placarA ?? 0)} <i>–</i> ${escapeHtml(jogo.placarB ?? 0)}</strong></span>
          ${renderPenaltyTeamSummary(bundle, "B")}
        </div>
        ${starterChosen
          ? `
            <section class="penalty-score-panel">
              <span class="penalty-score-label">Disputa</span>
              <div class="penalty-score-values"><strong>${escapeHtml(jogo.penaltisA || 0)}</strong><i>×</i><strong>${escapeHtml(jogo.penaltisB || 0)}</strong></div>
              <div class="penalty-attempt-tracks">
                ${renderPenaltyTrack(bundle, "A", penaltyEvents)}
                ${renderPenaltyTrack(bundle, "B", penaltyEvents)}
              </div>
            </section>
            <section class="penalty-next-kick" style="--team-color:${escapeHtml(teamColorFromGame(jogo, nextTeam))}">
              <span>Próxima cobrança</span>
              <strong>${escapeHtml(teamNameFromGame(jogo, nextTeam))}</strong>
              <button class="primary-button big-touch" type="button" data-live-action="penalty-attempt" data-team="${escapeHtml(nextTeam)}">Registrar cobrança</button>
            </section>
          `
          : `
            <section class="penalty-starter-picker">
              <header>
                <span class="panel-kicker">Primeira cobrança</span>
                <h3>Quem começa?</h3>
              </header>
              <div class="penalty-starter-options">
                <button type="button" data-live-action="select-penalty-starter" data-team="A" style="--team-color:${escapeHtml(teamColorFromGame(jogo, "A"))}">
                  <i>${escapeHtml(getLiveTeamInitials(teamNameFromGame(jogo, "A"), "A"))}</i><strong>${escapeHtml(teamNameFromGame(jogo, "A"))}</strong><b>Começar</b>
                </button>
                <button type="button" data-live-action="select-penalty-starter" data-team="B" style="--team-color:${escapeHtml(teamColorFromGame(jogo, "B"))}">
                  <i>${escapeHtml(getLiveTeamInitials(teamNameFromGame(jogo, "B"), "B"))}</i><strong>${escapeHtml(teamNameFromGame(jogo, "B"))}</strong><b>Começar</b>
                </button>
              </div>
            </section>
          `}
        ${penaltyEvents.length ? `
          <section class="penalty-history">
            <header><span>Cobranças</span><strong>${penaltyEvents.length} registrada${penaltyEvents.length === 1 ? "" : "s"}</strong></header>
            ${penaltyEvents.map((evento, index) => {
              const player = bundle.playerById.get(evento.jogadorId);
              const result = normalizeToken(evento.resultadoPenalti);
              const label = result === "gol" ? "Gol" : result === "defendido" ? "Defendido" : "Para fora";
              return `<div><i>${index + 1}</i>${renderPlayerAvatar(player || {}, "player-avatar small")}<span><strong>${escapeHtml(player ? playerDisplayName(player) : "Jogador")}</strong><small>${escapeHtml(teamNameFromGame(jogo, evento.time))}</small></span><em class="is-${escapeHtml(result)}">${escapeHtml(label)}</em></div>`;
            }).join("")}
          </section>
        ` : ""}
      </section>
    `;
  }

  function renderPenaltyTeamSummary(bundle, teamKey) {
    const name = teamNameFromGame(bundle.jogo, teamKey);
    return `
      <span class="penalty-team-summary" style="--team-color:${escapeHtml(teamColorFromGame(bundle.jogo, teamKey))}">
        <i>${escapeHtml(getLiveTeamInitials(name, teamKey))}</i>
        <strong>${escapeHtml(name)}</strong>
      </span>
    `;
  }

  function renderPenaltyTrack(bundle, teamKey, events) {
    const attempts = events.filter((evento) => evento.time === teamKey);
    return `
      <div><span>${escapeHtml(teamNameFromGame(bundle.jogo, teamKey))}</span><strong>
        ${attempts.length
          ? attempts.map((evento) => `<i class="is-${escapeHtml(normalizeToken(evento.resultadoPenalti))}" title="${escapeHtml(evento.resultadoPenalti)}"></i>`).join("")
          : `<small>Aguardando</small>`}
      </strong></div>
    `;
  }

  function renderLivePitch(bundle) {
    return `
      <section class="live-pitch-card" aria-label="Campo de futebol">
        <svg class="pitch-svg" viewBox="0 0 360 600" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="pitch-depth" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="#2d7737"/>
              <stop offset="0.48" stop-color="#205f2d"/>
              <stop offset="1" stop-color="#184824"/>
            </linearGradient>
            <pattern id="pitch-stripes" width="90" height="600" patternUnits="userSpaceOnUse">
              <rect width="45" height="600" fill="rgba(255,255,255,.035)"/>
              <rect x="45" width="45" height="600" fill="rgba(0,0,0,.045)"/>
            </pattern>
            <pattern id="goal-net" width="7" height="7" patternUnits="userSpaceOnUse">
              <path d="M0 0h7v7" fill="none" stroke="rgba(255,255,255,.22)" stroke-width=".7"/>
            </pattern>
            <radialGradient id="pitch-light" cx="50%" cy="42%" r="68%">
              <stop offset="0" stop-color="rgba(136,255,151,.12)"/>
              <stop offset="1" stop-color="rgba(0,0,0,.2)"/>
            </radialGradient>
          </defs>
          <rect x="1" y="1" width="358" height="598" rx="18" fill="url(#pitch-depth)"/>
          <rect x="1" y="1" width="358" height="598" rx="18" fill="url(#pitch-stripes)"/>
          <rect x="1" y="1" width="358" height="598" rx="18" fill="url(#pitch-light)"/>
          <g class="pitch-svg-lines" fill="none" vector-effect="non-scaling-stroke">
            <rect x="13" y="13" width="334" height="574" rx="8"/>
            <path d="M13 300h334"/>
            <circle cx="180" cy="300" r="54"/>
            <circle class="pitch-svg-dot" cx="180" cy="300" r="3"/>
            <path d="M83 13v96h194V13M132 13v44h96V13"/>
            <path d="M83 587v-96h194v96M132 587v-44h96v44"/>
            <path d="M126 109a58 58 0 0 0 108 0M126 491a58 58 0 0 1 108 0"/>
            <circle class="pitch-svg-dot" cx="180" cy="82" r="3"/>
            <circle class="pitch-svg-dot" cx="180" cy="518" r="3"/>
            <path d="M13 32a19 19 0 0 0 19-19M328 13a19 19 0 0 0 19 19M13 568a19 19 0 0 1 19 19M328 587a19 19 0 0 1 19-19"/>
          </g>
          <g class="pitch-svg-goals">
            <rect x="145" y="3" width="70" height="11" rx="2" fill="url(#goal-net)"/>
            <rect x="145" y="586" width="70" height="11" rx="2" fill="url(#goal-net)"/>
          </g>
          <path class="pitch-svg-shine" d="M22 28v196M338 376v196"/>
        </svg>
        <span class="pitch-team-name is-top">${escapeHtml(teamNameFromGame(bundle.jogo, "B"))}</span>
        <span class="pitch-team-name is-bottom">${escapeHtml(teamNameFromGame(bundle.jogo, "A"))}</span>
        ${renderPitchPlayers(bundle, "A")}
        ${renderPitchPlayers(bundle, "B")}
      </section>
    `;
  }

  function renderPitchPlayers(bundle, teamKey) {
    const players = getLineupPlayers(bundle, teamKey);
    const layout = getLiveTeamLayoutPlayers(players);
    const color = teamColorFromGame(bundle.jogo, teamKey);
    const positions = getPitchPositions(teamKey, layout.linePlayers.length);
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

  function getPitchPositions(teamKey, lineCount = 0) {
    const xByCount = {
      0: [],
      1: [50],
      2: [32, 68],
      3: [20, 50, 80],
      4: [17, 39, 61, 83],
      5: [14, 32, 50, 68, 86],
    };
    const teamA = teamKey === "A";
    const xs = xByCount[Math.min(5, Math.max(0, lineCount))] || xByCount[5];
    const baseY = teamA ? 72 : 28;
    const centerY = teamA ? 65 : 35;

    return {
      goalkeeper: { x: 50, y: teamA ? 90 : 10 },
      line: xs.map((x, index) => ({
        x,
        y: lineCount >= 3 && index === Math.floor(lineCount / 2) ? centerY : baseY,
      })),
    };
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
        ${hasPermission("eventos:criar") ? "" : "disabled"}
      >
        ${renderPlayerAvatar(player, "player-avatar pitch-avatar")}
        <span class="pitch-player-label">
          <strong>${escapeHtml(shortPlayerName(player))}</strong>
          <small>${escapeHtml(isGoalkeeper ? "GK" : player.posicaoPrincipal || "")}</small>
        </span>
      </button>
    `;
  }

  function shortPlayerName(player) {
    const name = playerDisplayName(player);
    return name.length > 8 ? `${name.slice(0, 7)}...` : name;
  }

  function renderLiveEventsCard(bundle) {
    return `
      <section class="live-events-card">
        <svg class="live-events-frame" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path d="M1 10 7 1h92v89l-7 9H1Z"/>
        </svg>
        <div class="live-card-heading">
          <h3>Eventos da partida</h3>
          <span><i></i>Tempo real</span>
        </div>
        ${renderEventTimeline(bundle)}
      </section>
    `;
  }

  function renderLiveControlBar(jogo) {
    if (!hasPermission("jogos:alterar")) return "";

    const paused = Boolean(jogo.pausadoEm);

    return `
      <div class="live-control-bar" role="toolbar" aria-label="Controles da partida">
        <button class="ghost-button big-touch live-control-button" type="button" data-live-action="${paused ? "resume" : "pause"}" aria-label="${paused ? "Retomar partida" : "Pausar partida"}">
          <span class="live-control-icon" aria-hidden="true">
            ${paused
              ? `<svg viewBox="0 0 24 24"><path d="m9 6 9 6-9 6z"/></svg>`
              : `<svg viewBox="0 0 24 24"><path d="M8 6v12M16 6v12"/></svg>`}
          </span>
          <span>${paused ? "Retomar" : "Pausar"}</span>
        </button>
        <button class="ghost-button big-touch live-control-button" type="button" data-live-action="undo" aria-label="Desfazer último evento">
          <span class="live-control-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 7 4 12l5 5M5 12h8a6 6 0 0 1 6 6"/></svg></span>
          <span>Desfazer</span>
        </button>
        <button class="danger-button big-touch live-control-button is-finish" type="button" data-live-action="finish" aria-label="Finalizar jogo">
          <span class="live-control-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 4v16M7 5h10l-2 3 2 3H7"/></svg></span>
          <span>Finalizar</span>
        </button>
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
          ["foul-suffered", "Falta sofrida", "FS"],
          ["substitute", "Substituir", "↔"],
          ["yellow-card", "Cartão amarelo", "CA"],
          ["red-card", "Cartão vermelho", "CV"],
        ]
      : [
          ["goal", "Gol", "G"],
          ["foul-suffered", "Falta sofrida", "FS"],
          ["defensive", "Desarme", "D"],
          ["substitute", "Substituir", "↔"],
          ["yellow-card", "Cartão amarelo", "CA"],
          ["red-card", "Cartão vermelho", "CV"],
          ["own-goal", "Gol contra", "GC"],
        ];
    const teamKey = getLineupTeamForPlayer(bundle, player.id);
    const roleLabel = isGoalkeeper ? "Goleiro" : player.posicaoPrincipal || "Linha";
    const teamName = teamNameFromGame(bundle.jogo, teamKey);
    const teamColor = teamColorFromGame(bundle.jogo, teamKey);
    const modal = openLiveModal(
      `Ações - ${playerDisplayName(player)}`,
      `
        <div class="player-action-panel player-action-panel-modern" data-player-id="${escapeHtml(player.id)}" style="--team-color: ${escapeHtml(teamColor)};">
          <div class="player-action-hero">
            ${renderPlayerAvatar(player, "player-avatar action-player-avatar")}
            <span>
              <small>Jogador selecionado</small>
              <strong>${escapeHtml(playerDisplayName(player))}</strong>
              <em>${escapeHtml(teamName)} • ${escapeHtml(roleLabel)}</em>
            </span>
          </div>
          <div class="player-action-grid">
            ${actions
              .map(
                ([action, label, icon], index) => `
                  <button class="player-action-button action-${escapeHtml(action)} ${index === 0 ? "is-primary" : ""}" type="button" data-player-event-action="${escapeHtml(action)}">
                    <span class="player-action-icon" aria-hidden="true">${escapeHtml(icon)}</span>
                    <strong>${escapeHtml(label)}</strong>
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

    if (action === "foul-suffered") {
      openPlayerFoulQuickModal(bundle, player);
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

    if (action === "substitute") {
      await openPlayerSubstitutionModal(bundle, player);
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

  function findPresetContainingPlayer(presets, playerId, ignoredPresetId = "") {
    return presets.find((preset) =>
      preset.id !== ignoredPresetId &&
      uniqueIds([preset.goleiroId, ...(preset.linha || [])]).includes(playerId)
    ) || null;
  }

  function replacePlayerInTeamRecord(team, outgoingId, incomingId) {
    if (!team) return null;
    const wasGoalkeeper = team.goleiroId === outgoingId;
    let nextLine = uniqueIds(team.linha || []).filter((id) => id !== outgoingId && id !== incomingId);

    if (!wasGoalkeeper) {
      const originalPosition = uniqueIds(team.linha || []).indexOf(outgoingId);
      nextLine.splice(originalPosition >= 0 ? originalPosition : nextLine.length, 0, incomingId);
    }

    const nextGoalkeeperId = wasGoalkeeper ? incomingId : team.goleiroId;
    return {
      ...team,
      goleiroId: nextGoalkeeperId,
      linha: uniqueIds(nextLine),
      jogadores: uniqueIds([nextGoalkeeperId, ...nextLine]),
    };
  }

  function removePlayerFromPreset(preset, playerId) {
    if (!preset) return null;
    const nextGoalkeeperId = preset.goleiroId === playerId ? "" : preset.goleiroId;
    const nextLine = uniqueIds(preset.linha || []).filter((id) => id !== playerId);
    return {
      ...preset,
      goleiroId: nextGoalkeeperId,
      linha: nextLine,
      jogadores: uniqueIds([nextGoalkeeperId, ...nextLine]),
    };
  }

  function renderSubstitutionCandidateOptions(candidates, presets, targetPresetId) {
    if (!candidates.length) {
      return `
        <div class="substitution-empty">
          <strong>Nenhum atleta disponível</strong>
          <span>Todos os jogadores ativos já estão em campo.</span>
        </div>
      `;
    }

    return candidates.map((candidate) => {
      const sourcePreset = findPresetContainingPlayer(presets, candidate.id, targetPresetId);
      return `
        <label class="substitution-player-option" data-substitution-player="${escapeHtml(candidate.id)}">
          <input type="radio" name="jogadorEntrouId" value="${escapeHtml(candidate.id)}" required />
          ${renderPlayerAvatar(candidate, "player-avatar small")}
          <span>
            <strong>${escapeHtml(playerDisplayName(candidate))}</strong>
            <small>${escapeHtml(candidate.posicaoPrincipal || "Linha")} · ${escapeHtml(candidate.overall || "-")} OVR</small>
          </span>
          ${sourcePreset ? `<em>Vem do ${escapeHtml(sourcePreset.nome)}</em>` : `<em>Livre</em>`}
          <i aria-hidden="true">✓</i>
        </label>
      `;
    }).join("");
  }

  async function openPlayerSubstitutionModal(bundle, outgoingPlayer) {
    if (!bundle?.jogo || normalizeToken(bundle.jogo.fase) === "penaltis") {
      state.liveMessage = "Substituições ficam bloqueadas durante a disputa de pênaltis.";
      await renderCurrentSection();
      return;
    }

    const [activePlayers, presets] = await Promise.all([
      readActivePlayers(),
      readTeamPresets(bundle.jogo.peladaId),
    ]);
    const teamKey = getLineupTeamForPlayer(bundle, outgoingPlayer.id);
    const targetPresetId = teamKey === "A" ? bundle.jogo.presetAId : bundle.jogo.presetBId;
    const activeOnField = new Set(
      [...(bundle.playersA || []), ...(bundle.playersB || [])].map((player) => player.id)
    );
    const candidates = activePlayers
      .filter((player) => !activeOnField.has(player.id))
      .sort(comparePlayersByNickname);
    const candidateById = new Map(candidates.map((player) => [player.id, player]));
    const modal = openLiveModal(
      `Substituir ${playerDisplayName(outgoingPlayer)}`,
      `
        <form class="substitution-form" id="player-substitution-form" novalidate>
          <section class="substitution-hero" style="--team-color:${escapeHtml(teamColorFromGame(bundle.jogo, teamKey))}">
            <span class="substitution-direction" aria-hidden="true">↔</span>
            <div>
              <small>${escapeHtml(teamNameFromGame(bundle.jogo, teamKey))}</small>
              <strong>Quem entra no lugar de ${escapeHtml(playerDisplayName(outgoingPlayer))}?</strong>
            </div>
          </section>
          <div class="substitution-player-list">
            ${renderSubstitutionCandidateOptions(candidates, presets, targetPresetId)}
          </div>
          <fieldset class="substitution-scope">
            <legend>Por quanto tempo vale a troca?</legend>
            <label>
              <input type="radio" name="escopo" value="jogo" checked />
              <span><strong>Somente neste jogo</strong><small>Os times originais voltam na próxima partida.</small></span>
            </label>
            <label>
              <input type="radio" name="escopo" value="proximos" />
              <span><strong>Manter nos próximos jogos</strong><small>Atualiza o time pelo restante da pelada.</small></span>
            </label>
          </fieldset>
          <div class="substitution-warning" data-substitution-warning hidden></div>
          <div class="form-errors" id="substitution-errors" hidden></div>
          <div class="form-actions">
            <button class="primary-button big-touch" type="submit" ${candidates.length ? "" : "disabled"}>Confirmar substituição</button>
            <button class="ghost-button big-touch" type="button" data-modal-close>Cancelar</button>
          </div>
        </form>
      `
    );
    const form = modal.querySelector("#player-substitution-form");
    const warning = form.querySelector("[data-substitution-warning]");
    const refreshWarning = () => {
      const incomingId = form.elements.jogadorEntrouId?.value || "";
      const sourcePreset = findPresetContainingPlayer(presets, incomingId, targetPresetId);
      const keepNext = form.elements.escopo?.value === "proximos";
      const incomingPlayer = candidateById.get(incomingId);

      if (!incomingPlayer || !sourcePreset) {
        warning.hidden = true;
        warning.innerHTML = "";
        return;
      }

      warning.hidden = false;
      warning.innerHTML = keepNext
        ? `<strong>Atenção ao ${escapeHtml(sourcePreset.nome)}</strong><span>${escapeHtml(playerDisplayName(incomingPlayer))} sairá desse time, que ficará incompleto até você editá-lo.</span>`
        : `<strong>Empréstimo neste jogo</strong><span>${escapeHtml(sourcePreset.nome)} continua salvo como está e será restaurado na próxima partida.</span>`;
    };

    form.addEventListener("change", refreshWarning);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const incomingId = form.elements.jogadorEntrouId?.value || "";
      const incomingPlayer = candidateById.get(incomingId);
      if (!incomingPlayer) {
        showFormErrors("substitution-errors", ["Escolha quem entrará em campo."]);
        return;
      }

      const submit = form.querySelector('button[type="submit"]');
      submit.disabled = true;
      submit.textContent = "Substituindo...";
      await savePlayerSubstitution({
        bundle,
        outgoingPlayer,
        incomingPlayer,
        teamKey,
        scope: form.elements.escopo?.value || "jogo",
        presets,
      });
    });
  }

  async function savePlayerSubstitution({
    bundle,
    outgoingPlayer,
    incomingPlayer,
    teamKey,
    scope,
    presets,
  }) {
    if (!bundle?.jogo?.id || !incomingPlayer?.id || !requirePermission("eventos:criar")) return;
    const latestBundle = await readGameBundle(bundle.jogo.id);

    if (
      !latestBundle ||
      latestBundle.jogo.status === "Finalizado" ||
      normalizeToken(latestBundle.jogo.fase) === "penaltis"
    ) {
      closeLiveModal();
      state.liveMessage = "A substituição não pode mais ser realizada.";
      await renderCurrentSection();
      return;
    }

    const activeOnField = new Set(
      [...(latestBundle.playersA || []), ...(latestBundle.playersB || [])].map((player) => player.id)
    );
    if (activeOnField.has(incomingPlayer.id)) {
      showFormErrors("substitution-errors", ["Esse jogador já está em campo."]);
      return;
    }

    const savedAt = nowIso();
    const timeId = teamKey === "A" ? latestBundle.jogo.timeA?.id : latestBundle.jogo.timeB?.id;
    const outgoingLineup = latestBundle.escalacoes.find((item) =>
      item.jogadorId === outgoingPlayer.id && item.ativo !== false
    );
    const gameTeam = latestBundle.times.find((time) => time.id === timeId);

    if (!outgoingLineup || !gameTeam) {
      closeLiveModal();
      state.liveMessage = "A escalação mudou. Abra o jogador novamente para substituir.";
      await renderCurrentSection();
      return;
    }

    const existingIncomingLineup = latestBundle.escalacoes.find(
      (item) => item.jogadorId === incomingPlayer.id
    );
    const updatedOutgoing = {
      ...outgoingLineup,
      ativo: false,
      saiuEm: savedAt,
      updatedAt: savedAt,
      revision: (outgoingLineup.revision || 0) + 1,
    };
    const updatedIncoming = {
      ...(existingIncomingLineup || {}),
      id: existingIncomingLineup?.id || `${latestBundle.jogo.id}-${incomingPlayer.id}`,
      jogoId: latestBundle.jogo.id,
      jogadorId: incomingPlayer.id,
      time: teamKey,
      timeId,
      ativo: true,
      entrouEm: savedAt,
      saiuEm: "",
      createdAt: existingIncomingLineup?.createdAt || savedAt,
      updatedAt: savedAt,
      revision: (existingIncomingLineup?.revision || 0) + 1,
    };
    const updatedGameTeam = {
      ...replacePlayerInTeamRecord(gameTeam, outgoingPlayer.id, incomingPlayer.id),
      updatedAt: savedAt,
      revision: (gameTeam.revision || 0) + 1,
    };
    const targetPresetId = teamKey === "A"
      ? latestBundle.jogo.presetAId
      : latestBundle.jogo.presetBId;
    const sourcePreset = findPresetContainingPlayer(presets, incomingPlayer.id, targetPresetId);
    const evento = {
      id: uid(),
      jogoId: latestBundle.jogo.id,
      peladaId: latestBundle.jogo.peladaId,
      tipo: "SUBSTITUICAO",
      time: teamKey,
      timeId,
      jogadorId: incomingPlayer.id,
      jogadorSaiuId: outgoingPlayer.id,
      jogadorEntrouId: incomingPlayer.id,
      escopoSubstituicao: scope,
      presetDestinoId: targetPresetId || "",
      presetOrigemId: sourcePreset?.id || "",
      presetOrigemPapel: sourcePreset?.goleiroId === incomingPlayer.id ? "goleiro" : "linha",
      minuto: getEventMinute(latestBundle.jogo),
      detalhe: `${playerDisplayName(incomingPlayer)} entrou no lugar de ${playerDisplayName(outgoingPlayer)}`,
      criadoPor: getActorId(),
      createdAt: savedAt,
      updatedAt: savedAt,
      revision: 1,
      cancelado: false,
    };
    const presetUpdates = [];

    if (scope === "proximos") {
      const targetPreset = presets.find((preset) => preset.id === targetPresetId);

      if (targetPreset) {
        presetUpdates.push({
          ...replacePlayerInTeamRecord(targetPreset, outgoingPlayer.id, incomingPlayer.id),
          updatedAt: savedAt,
          revision: (targetPreset.revision || 0) + 1,
        });
      }

      if (sourcePreset) {
        presetUpdates.push({
          ...removePlayerFromPreset(sourcePreset, incomingPlayer.id),
          updatedAt: savedAt,
          revision: (sourcePreset.revision || 0) + 1,
        });
      }
    }

    await putRecords({
      escalacoes: [updatedOutgoing, updatedIncoming],
      times: [updatedGameTeam, ...presetUpdates],
      eventos: [evento],
      syncQueue: [
        createSyncQueueRecord("escalacoes", "upsert", updatedOutgoing.id, updatedOutgoing),
        createSyncQueueRecord("escalacoes", "upsert", updatedIncoming.id, updatedIncoming),
        createSyncQueueRecord("times", "upsert", updatedGameTeam.id, updatedGameTeam),
        ...presetUpdates.map((preset) =>
          createSyncQueueRecord("times", "upsert", preset.id, preset)
        ),
        createSyncQueueRecord("eventos", "upsert", evento.id, evento),
      ],
      auditLog: [
        createAuditRecord("eventos", evento.id, "substituir-jogador", null, {
          evento,
          escalacoes: [updatedOutgoing, updatedIncoming],
          presets: presetUpdates,
        }),
      ],
    });

    closeLiveModal();
    state.liveMessage = `${playerDisplayName(incomingPlayer)} entrou no lugar de ${playerDisplayName(outgoingPlayer)}.`;
    await renderCurrentSection();
    runBackgroundTask(syncNow, "Falha ao sincronizar substituição");
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
    const selectedType = form.elements.tipoGol?.value || "normal";
    return QUICK_GOAL_TYPES.some((item) => item.value === selectedType) ? selectedType : "normal";
  }

  function renderQuickGoalTypeOptions(selectedValue = "normal") {
    return `
      <fieldset class="event-fieldset goal-method-fieldset">
        <legend>Como foi o gol?</legend>
        <div class="goal-method-options">
          ${QUICK_GOAL_TYPES.map((item) => `
            <label>
              <input type="radio" name="tipoGol" value="${escapeHtml(item.value)}" ${item.value === selectedValue ? "checked" : ""} />
              <span class="goal-method-icon" aria-hidden="true">${escapeHtml(item.icon)}</span>
              <span class="goal-method-copy">
                <strong>${escapeHtml(item.label)}</strong>
              </span>
              <i class="goal-method-check" aria-hidden="true"></i>
            </label>
          `).join("")}
        </div>
      </fieldset>
    `;
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
          ${renderQuickGoalTypeOptions("normal")}
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
      const tipoGol = goalTypeFromQuickForm(form);
      const errors = [];

      if (hasAssist && !assistenteId) errors.push("Escolha quem deu a assistência.");
      if (!QUICK_GOAL_TYPES.some((item) => item.value === tipoGol)) errors.push("Escolha como foi o gol.");
      showFormErrors("player-goal-errors", errors);
      if (errors.length) return;

      await saveGoalEvent({
        jogo: bundle.jogo,
        teamKey,
        jogadorId: player.id,
        assistenteId,
        tipoGol,
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

  function openPlayerFoulQuickModal(bundle, player) {
    const playerTeam = getLineupTeamForPlayer(bundle, player.id);
    const opponentTeam = oppositeTeam(playerTeam);
    const opponentPlayers = getLineupPlayers(bundle, opponentTeam);
    const modal = openLiveModal(
      `Falta sofrida - ${playerDisplayName(player)}`,
      `
        <form class="event-form player-foul-form" id="player-foul-form" novalidate>
          <div class="form-errors" id="player-foul-errors" hidden></div>
          <div class="foul-victim-card">
            ${renderPlayerAvatar(player, "player-avatar foul-victim-avatar")}
            <span>
              <small>Sofreu a falta</small>
              <strong>${escapeHtml(playerDisplayName(player))}</strong>
              <em>${escapeHtml(teamNameFromGame(bundle.jogo, playerTeam))}</em>
            </span>
          </div>
          <label class="field-label">
            <span>Quem cometeu a falta?</span>
            <select name="otherPlayerId">${renderPlayerOptions(opponentPlayers, "", "Escolha o adversário")}</select>
            <small class="field-helper">Somente jogadores do ${escapeHtml(teamNameFromGame(bundle.jogo, opponentTeam))}.</small>
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
      if (!otherPlayerId) errors.push("Escolha o adversário que cometeu a falta.");
      if (otherPlayerId && !isPlayerInTeam(bundle, otherPlayerId, opponentTeam)) {
        errors.push("Quem cometeu a falta precisa ser do time adversário.");
      }
      showFormErrors("player-foul-errors", errors);
      if (errors.length) return;

      await saveFoulEvent({
        jogo: bundle.jogo,
        bundle,
        jogadorId: otherPlayerId,
        jogadorSofreuId: player.id,
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

      if (action === "select-penalty-starter") {
        await selectPenaltyStarter(jogoId, actionButton.dataset.team || "");
        return;
      }

      if (action === "penalty-attempt") {
        await openPenaltyAttemptModal(jogoId, actionButton.dataset.team || "");
        return;
      }

      if (action === "new-game") {
        const peladaId = actionButton.dataset.peladaId || "";
        state.selectedGameSummaryId = null;
        state.peladaDetailView = "confrontos";
        state.gameDraft = createEmptyGameDraft();

        if (peladaId) {
          await switchSection("peladas", { peladaId });
        } else {
          await switchSection("peladas", { peladasView: "gerenciar" });
        }
        return;
      }

      if (!jogoId) {
        return;
      }

      if (action === "player-actions") {
        await openPlayerActionsPanel(jogoId, actionButton.dataset.playerId || "");
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
        if (await confirmManualGameFinish(jogoId)) {
          await finalizeGame(jogoId, "Manual");
        }
      }
    };
  }

  async function startPenaltyShootout(jogo, formaOrigem = "Tempo") {
    if (!jogo?.id || jogo.status === "Finalizado") return;
    const savedAt = nowIso();
    const updatedJogo = {
      ...jogo,
      fase: "penaltis",
      formaEncerramentoPendente: formaOrigem,
      tempoRegularEncerradoEm: savedAt,
      pausadoEm: jogo.pausadoEm || savedAt,
      penaltisA: Number(jogo.penaltisA || 0),
      penaltisB: Number(jogo.penaltisB || 0),
      penaltiIniciaPor: jogo.penaltiIniciaPor || "",
      penaltiProximoTime: jogo.penaltiProximoTime || "",
      updatedAt: savedAt,
      revision: (jogo.revision || 0) + 1,
    };
    await putRecords({
      jogos: [updatedJogo],
      syncQueue: [createSyncQueueRecord("jogos", "upsert", jogo.id, updatedJogo)],
      auditLog: [createAuditRecord("jogos", jogo.id, "iniciar-penaltis", jogo, updatedJogo)],
    });
    state.liveMessage = "Tempo encerrado. Escolha quem começa a disputa de pênaltis.";
    await renderCurrentSection();
    runBackgroundTask(syncNow, "Falha ao sincronizar início dos pênaltis");
  }

  async function selectPenaltyStarter(jogoId, teamKey) {
    if (!["A", "B"].includes(teamKey) || !requirePermission("jogos:alterar")) return;
    const jogo = await getRecord("jogos", jogoId);
    if (!jogo || normalizeToken(jogo.fase) !== "penaltis" || jogo.penaltiIniciaPor) return;
    const savedAt = nowIso();
    const updatedJogo = {
      ...jogo,
      penaltiIniciaPor: teamKey,
      penaltiProximoTime: teamKey,
      updatedAt: savedAt,
      revision: (jogo.revision || 0) + 1,
    };
    await putRecords({
      jogos: [updatedJogo],
      syncQueue: [createSyncQueueRecord("jogos", "upsert", jogo.id, updatedJogo)],
      auditLog: [createAuditRecord("jogos", jogo.id, "escolher-inicio-penaltis", jogo, updatedJogo)],
    });
    await renderCurrentSection();
    runBackgroundTask(syncNow, "Falha ao sincronizar ordem dos pênaltis");
  }

  async function openPenaltyAttemptModal(jogoId, teamKey) {
    const bundle = await readGameBundle(jogoId);
    if (!bundle || normalizeToken(bundle.jogo.fase) !== "penaltis" || bundle.jogo.penaltiProximoTime !== teamKey) return;
    const eligibility = getPenaltyKickerEligibility(bundle, teamKey);
    const players = eligibility.available;
    const goalkeeper = getLiveTeamLayoutPlayers(getLineupPlayers(bundle, oppositeTeam(teamKey))).goalkeeper;
    const modal = openLiveModal(
      `Pênalti - ${teamNameFromGame(bundle.jogo, teamKey)}`,
      `
        <form class="penalty-attempt-form" id="penalty-attempt-form" novalidate>
          <div class="penalty-attempt-intro" style="--team-color:${escapeHtml(teamColorFromGame(bundle.jogo, teamKey))}">
            <span>${escapeHtml(getLiveTeamInitials(teamNameFromGame(bundle.jogo, teamKey), teamKey))}</span>
            <div><small>Próxima cobrança</small><strong>${escapeHtml(teamNameFromGame(bundle.jogo, teamKey))}</strong><p>${goalkeeper ? `No gol: ${escapeHtml(playerDisplayName(goalkeeper))}` : "Sem goleiro definido"}</p></div>
          </div>
          <label class="field-label"><span>Cobrador</span><select name="jogadorId" required>${renderPlayerOptions(players, "", "Escolha o cobrador")}</select></label>
          <fieldset class="penalty-result-picker">
            <legend>Resultado da cobrança</legend>
            <label class="is-goal"><input type="radio" name="resultado" value="gol" checked /><span><i>✓</i><strong>Gol</strong></span></label>
            <label class="is-miss"><input type="radio" name="resultado" value="fora" /><span><i>×</i><strong>Para fora</strong></span></label>
            <label class="is-save"><input type="radio" name="resultado" value="defendido" /><span><i>◆</i><strong>Defendido</strong></span></label>
          </fieldset>
          <div class="form-errors" id="penalty-attempt-errors" hidden></div>
          <div class="form-actions">
            <button class="primary-button big-touch" type="submit">Confirmar cobrança</button>
            <button class="ghost-button big-touch" type="button" data-modal-close>Cancelar</button>
          </div>
        </form>
      `
    );
    modal.querySelector("#penalty-attempt-form")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const jogadorId = form.elements.jogadorId?.value || "";
      if (!jogadorId) {
        showFormErrors("penalty-attempt-errors", ["Escolha o cobrador."]);
        return;
      }
      const result = form.elements.resultado?.value || "gol";
      const submit = form.querySelector('button[type="submit"]');
      submit.disabled = true;
      submit.textContent = "Salvando...";
      await savePenaltyAttempt(bundle, teamKey, jogadorId, result, result === "defendido" ? goalkeeper?.id || "" : "");
    });
  }

  async function savePenaltyAttempt(bundle, teamKey, jogadorId, resultadoPenalti, goalkeeperId) {
    const latestGame = await getRecord("jogos", bundle.jogo.id);
    if (!latestGame || latestGame.status === "Finalizado" || latestGame.penaltiProximoTime !== teamKey) return;
    const existingEvents = (await getAllRecords("eventos"))
      .filter((evento) => evento.jogoId === latestGame.id && !evento.cancelado && normalizeToken(evento.tipo) === "penalti_desempate");
    const latestBundle = await readGameBundle(latestGame.id);
    const eligibility = getPenaltyKickerEligibility(latestBundle, teamKey, existingEvents);
    if (!eligibility.available.some((player) => player.id === jogadorId)) {
      closeLiveModal();
      state.liveMessage = "Este jogador já cobrou nesta sequência. Escolha outro atleta.";
      await renderCurrentSection();
      return;
    }
    const savedAt = nowIso();
    const teamAttempts = existingEvents.filter((evento) => evento.time === teamKey).length;
    const evento = {
      id: uid(),
      jogoId: latestGame.id,
      peladaId: latestGame.peladaId,
      tipo: "PENALTI_DESEMPATE",
      time: teamKey,
      timeId: teamKey === "A" ? latestGame.timeA?.id : latestGame.timeB?.id,
      jogadorId,
      goleiroId: goalkeeperId,
      resultadoPenalti,
      rodadaPenalti: teamAttempts + 1,
      minuto: "P",
      detalhe: `Pênalti ${resultadoPenalti}`,
      criadoPor: getActorId(),
      createdAt: savedAt,
      updatedAt: savedAt,
      revision: 1,
      cancelado: false,
    };
    const allEvents = [...existingEvents, evento];
    const attemptsA = allEvents.filter((item) => item.time === "A").length;
    const attemptsB = allEvents.filter((item) => item.time === "B").length;
    const penaltisA = allEvents.filter((item) => item.time === "A" && normalizeToken(item.resultadoPenalti) === "gol").length;
    const penaltisB = allEvents.filter((item) => item.time === "B" && normalizeToken(item.resultadoPenalti) === "gol").length;
    const pairComplete = attemptsA === attemptsB;
    const hasWinner = pairComplete && penaltisA !== penaltisB;
    const updatedJogo = {
      ...latestGame,
      penaltisA,
      penaltisB,
      decididoNosPenaltis: hasWinner,
      penaltiProximoTime: hasWinner ? "" : oppositeTeam(teamKey),
      updatedAt: savedAt,
      revision: (latestGame.revision || 0) + 1,
    };
    await putRecords({
      jogos: [updatedJogo],
      eventos: [evento],
      syncQueue: [
        createSyncQueueRecord("jogos", "upsert", updatedJogo.id, updatedJogo),
        createSyncQueueRecord("eventos", "upsert", evento.id, evento),
      ],
      auditLog: [createAuditRecord("eventos", evento.id, "registrar-penalti", null, evento)],
    });
    closeLiveModal();
    if (hasWinner) {
      await finalizeGame(updatedJogo.id, "Pênaltis");
      return;
    }
    state.liveMessage = `Cobrança registrada. Agora é a vez do ${teamNameFromGame(updatedJogo, updatedJogo.penaltiProximoTime)}.`;
    await renderCurrentSection();
    runBackgroundTask(syncNow, "Falha ao sincronizar cobrança de pênalti");
  }

  async function confirmManualGameFinish(jogoId) {
    const jogo = await getRecord("jogos", jogoId);

    if (!jogo || jogo.status === "Finalizado") {
      return false;
    }

    const score = `${teamNameFromGame(jogo, "A")} ${jogo.placarA ?? 0} x ${jogo.placarB ?? 0} ${teamNameFromGame(jogo, "B")}`;

    return window.confirm(
      `Finalizar este jogo agora?\n\n${score}\n\nEssa ação encerra a partida manualmente e salva o resultado atual.`
    );
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
          <button class="live-modal-close" type="button" data-modal-close aria-label="Fechar formulário">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17"/></svg>
          </button>
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

  async function saveGoalEvent({ jogo, teamKey, jogadorId, assistenteId, tipoGol, golContra, observacoes }) {
    if (!jogo?.id || pendingGoalGameIds.has(jogo.id)) {
      state.liveMessage = "Este gol jÃ¡ estÃ¡ sendo processado.";
      return;
    }

    pendingGoalGameIds.add(jogo.id);

    try {
      const latestJogo = await getRecord("jogos", jogo.id);

      if (!latestJogo || latestJogo.status === "Finalizado") {
        closeLiveModal();
        state.liveMessage = "A partida jÃ¡ foi finalizada em outro dispositivo.";
        await renderCurrentSection();
        return;
      }

      jogo = latestJogo;
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
        criadoPor: getActorId(),
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

      closeLiveModal();
      state.liveMessage = `Gol salvo para ${teamNameFromGame(updatedJogo, teamKey)}.`;

      const playersToEvolve = [...new Set([jogadorId, assistenteId].filter(Boolean))];

      if (Number(updatedJogo[placarField] || 0) >= GOALS_TO_END_GAME) {
        await finalizeGame(jogo.id, "2 gols");
        return;
      }

      await renderCurrentSection();
      runBackgroundTask(async () => {
        for (const playerId of playersToEvolve) {
          await aplicarEvolucaoPorEventos(playerId);
        }

        await syncLatestMutations();

        const syncedEvent = await getRecord("eventos", evento.id);
        if (syncedEvent?.cancelado) {
        state.liveMessage = "Gol descartado: a partida jÃ¡ havia sido finalizada em outro dispositivo.";
          if (state.currentSection === "ao-vivo") await renderCurrentSection();
        }
      }, "Falha ao concluir processamento do gol");
    } finally {
      pendingGoalGameIds.delete(jogo.id);
    }
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
      criadoPor: getActorId(),
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
    if (!requirePermission("eventos:criar")) return;
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
      criadoPor: getActorId(),
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
    if (!requirePermission("eventos:excluir")) return;
    const [jogo, eventos, allLineups, allTimes] = await Promise.all([
      getRecord("jogos", jogoId),
      getAllRecords("eventos"),
      getAllRecords("escalacoes"),
      getAllRecords("times"),
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

    if (normalizeToken(lastEvent.tipo) === "substituicao") {
      const outgoingLineup = allLineups.find((item) =>
        item.jogoId === jogoId && item.jogadorId === lastEvent.jogadorSaiuId
      );
      const incomingLineup = allLineups.find((item) =>
        item.jogoId === jogoId && item.jogadorId === lastEvent.jogadorEntrouId
      );
      const gameTeam = allTimes.find((time) => time.id === lastEvent.timeId);
      const lineupUpdates = [];
      const teamUpdates = [];

      if (outgoingLineup) {
        lineupUpdates.push({
          ...outgoingLineup,
          ativo: true,
          saiuEm: "",
          updatedAt: savedAt,
          revision: (outgoingLineup.revision || 0) + 1,
        });
      }

      if (incomingLineup) {
        lineupUpdates.push({
          ...incomingLineup,
          ativo: false,
          saiuEm: savedAt,
          updatedAt: savedAt,
          revision: (incomingLineup.revision || 0) + 1,
        });
      }

      if (gameTeam) {
        teamUpdates.push({
          ...replacePlayerInTeamRecord(
            gameTeam,
            lastEvent.jogadorEntrouId,
            lastEvent.jogadorSaiuId
          ),
          updatedAt: savedAt,
          revision: (gameTeam.revision || 0) + 1,
        });
      }

      if (lastEvent.escopoSubstituicao === "proximos") {
        const targetPreset = allTimes.find((time) => time.id === lastEvent.presetDestinoId);
        const sourcePreset = allTimes.find((time) => time.id === lastEvent.presetOrigemId);

        if (targetPreset) {
          teamUpdates.push({
            ...replacePlayerInTeamRecord(
              targetPreset,
              lastEvent.jogadorEntrouId,
              lastEvent.jogadorSaiuId
            ),
            updatedAt: savedAt,
            revision: (targetPreset.revision || 0) + 1,
          });
        }

        if (sourcePreset) {
          const restoredSource = lastEvent.presetOrigemPapel === "goleiro"
            ? {
                ...sourcePreset,
                goleiroId: lastEvent.jogadorEntrouId,
                jogadores: uniqueIds([
                  lastEvent.jogadorEntrouId,
                  ...(sourcePreset.linha || []),
                ]),
              }
            : {
                ...sourcePreset,
                linha: uniqueIds([...(sourcePreset.linha || []), lastEvent.jogadorEntrouId]),
                jogadores: uniqueIds([
                  sourcePreset.goleiroId,
                  ...(sourcePreset.linha || []),
                  lastEvent.jogadorEntrouId,
                ]),
              };
          teamUpdates.push({
            ...restoredSource,
            updatedAt: savedAt,
            revision: (sourcePreset.revision || 0) + 1,
          });
        }
      }

      if (lineupUpdates.length) {
        records.escalacoes = lineupUpdates;
        records.syncQueue.push(...lineupUpdates.map((lineup) =>
          createSyncQueueRecord("escalacoes", "upsert", lineup.id, lineup)
        ));
      }

      if (teamUpdates.length) {
        records.times = teamUpdates;
        records.syncQueue.push(...teamUpdates.map((time) =>
          createSyncQueueRecord("times", "upsert", time.id, time)
        ));
      }
    }

    await putRecords(records);
    state.liveMessage = "Último evento desfeito.";
    await syncNow();
    await renderCurrentSection();
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
      criadoPor: getActorId(),
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
      criadoPor: getActorId(),
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

  async function pauseGame(jogoId) {
    if (!requirePermission("jogos:alterar")) return;
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
    await renderCurrentSection();
    runBackgroundTask(syncNow, "Falha ao sincronizar pausa do jogo");
  }

  async function resumeGame(jogoId) {
    if (!requirePermission("jogos:alterar")) return;
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
    await renderCurrentSection();
    runBackgroundTask(syncNow, "Falha ao sincronizar retomada do jogo");
  }

  function buildNextRotation(pelada, jogo) {
    const winningTeamKey = getWinningTeamKey(jogo);
    if (!pelada || !winningTeamKey || !jogo.presetAId || !jogo.presetBId) return null;
    const winnerId = winningTeamKey === "A" ? jogo.presetAId : jogo.presetBId;
    const loserId = winningTeamKey === "A" ? jogo.presetBId : jogo.presetAId;
    const queue = uniqueIds(jogo.filaTimes || []).filter((id) => id !== winnerId && id !== loserId);
    const nextOpponentId = queue.shift() || loserId;
    const nextQueue = nextOpponentId === loserId ? queue : [...queue, loserId];

    return {
      timeAId: winnerId,
      timeBId: nextOpponentId,
      fila: nextQueue,
      vencedorAnteriorId: winnerId,
      perdedorAnteriorId: loserId,
      jogoOrigemId: jogo.id,
      updatedAt: nowIso(),
    };
  }

  async function finalizeGame(jogoId, formaEncerramento) {
    if (!requirePermission("jogos:finalizar")) return;
    if (finalizingGameIds.has(jogoId)) return;
    finalizingGameIds.add(jogoId);

    try {
    const jogo = await getRecord("jogos", jogoId);

    if (!jogo || jogo.status === "Finalizado") {
      return;
    }

    if (getWinningTeamKey(jogo) === "" && normalizeToken(jogo.fase) !== "penaltis") {
      await startPenaltyShootout(jogo, formaEncerramento);
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
    const [allEscalacoes, pelada] = await Promise.all([
      getAllRecords("escalacoes"),
      getRecord("peladas", jogo.peladaId),
    ]);
    const escalacoes = allEscalacoes.filter((escalacao) => escalacao.jogoId === jogoId);
    const nextRotation = buildNextRotation(pelada, finalJogo);
    const updatedPelada = nextRotation ? {
      ...pelada,
      proximoConfronto: nextRotation,
      updatedAt: savedAt,
      revision: (pelada.revision || 0) + 1,
    } : null;
    const statsRecords = await buildResultStats(finalJogo, escalacoes);

    await putRecords({
      jogos: [finalJogo],
      ...(updatedPelada ? { peladas: [updatedPelada] } : {}),
      estatisticasCache: statsRecords,
      syncQueue: [
        createSyncQueueRecord("jogos", "upsert", jogoId, finalJogo),
        ...(updatedPelada ? [createSyncQueueRecord("peladas", "upsert", updatedPelada.id, updatedPelada)] : []),
        ...statsRecords.map((record) =>
          createSyncQueueRecord("estatisticasCache", "upsert", record.id, record)
        ),
      ],
      auditLog: [createAuditRecord("jogos", jogoId, "finalizar", jogo, { jogo: finalJogo, estatisticas: statsRecords })],
    });

    stopLiveTimer();
    setActiveGameId(null);
    state.selectedGameSummaryId = jogoId;
    state.liveMessage = `Jogo finalizado por ${formaEncerramento}.`;
    await renderCurrentSection();

    runBackgroundTask(async () => {
      for (const playerId of [...new Set(escalacoes.map((escalacao) => escalacao.jogadorId))]) {
        await aplicarEvolucaoPorEventos(playerId);
      }

      await syncLatestMutations();
      renderDashboardCards(await readDashboardStats());
    }, "Falha ao concluir estatísticas do jogo finalizado");
    } finally {
      finalizingGameIds.delete(jogoId);
    }
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

    document.body.classList.toggle("stats-profile-mode", Boolean(selectedProfile));
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
    $("#section-content").innerHTML = renderRankingPremiumOverview(statsResult);
    bindRankingSectionEvents();
  }

  function renderRankingPremiumOverview(statsResult) {
    const viewModel = getRankingViewModel(statsResult);
    const { activeMode } = viewModel;

    return `
      <div class="ranking-premium-page ranking-leaderboard-page">
        <section class="ranking-leaderboard-screen">
          <div class="ranking-leaderboard-top">
            <div>
              <span class="panel-kicker">Leaderboard</span>
              <h2>Ranking</h2>
            </div>
          </div>
          ${renderRankingModeTabs(activeMode)}
          ${renderRankingViewContent(viewModel)}
        </section>
      </div>
    `;
  }

  function getRankingViewModel(statsResult) {
    const groups = buildRankingCategoryGroups(statsResult);
    const activeMode = groups[state.rankingMode] ? state.rankingMode : "geral";
    const categories = groups[activeMode] || [];
    const activeCategoryId = categories.some((category) => category.id === state.rankingCategory)
      ? state.rankingCategory
      : categories[0]?.id || "";
    const activeCategory = categories.find((category) => category.id === activeCategoryId) || categories[0] || null;

    state.rankingMode = activeMode;
    state.rankingCategory = activeCategoryId;

    return { activeMode, categories, activeCategoryId, activeCategory };
  }

  function renderRankingViewContent(viewModel) {
    return `<div class="ranking-view-content" data-ranking-view>${renderRankingViewInner(viewModel)}</div>`;
  }

  function renderRankingViewInner(viewModel) {
    const { categories, activeCategoryId, activeCategory } = viewModel;
    return `
      ${renderRankingCategoryPicker(categories, activeCategoryId)}
      <div class="ranking-board-slot" data-ranking-board>
        ${activeCategory ? renderRankingCategoryPodium(activeCategory) : renderEmptyRankingPodium()}
      </div>
    `;
  }

  function buildRankingCategoryGroups(statsResult) {
    const fullLimit = getRankingFullLimit(statsResult);

    return {
      geral: [
        {
          id: "overall",
          title: "Maior Overall",
          description: "Cartas com maior nota geral.",
          entries: getOverallRankingEntries(statsResult, fullLimit),
        },
        {
          id: "mvp",
          title: "MVP",
          description: "Mais vezes escolhido MVP.",
          entries: getCompactAwardRankingEntries(statsResult.playersStats, "mvpsPelada", "MVP", fullLimit),
        },
        {
          id: "bagre",
          title: "Bagre",
          description: "Mais marcações de Bagre.",
          entries: getCompactAwardRankingEntries(statsResult.playersStats, "bagresPelada", "Bagre", fullLimit),
        },
        {
          id: "artilharia",
          title: "Artilharia",
          description: "Quem mais marcou gols.",
          entries: getMetricRankingEntries(statsResult.playersStats, "gols", { limit: fullLimit }),
        },
        {
          id: "assistencias",
          title: "Assistências",
          description: "Os garçons da pelada.",
          entries: getMetricRankingEntries(statsResult.playersStats, "assistencias", { limit: fullLimit }),
        },
        {
          id: "participacoes",
          title: "Participações em gol",
          description: "Gols + assistências.",
          entries: getMetricRankingEntries(statsResult.playersStats, "participacoesGol", { limit: fullLimit }),
        },
        {
          id: "vitorias",
          title: "Mais vitórias",
          description: "Jogadores com mais jogos vencidos.",
          entries: getMetricRankingEntries(statsResult.playersStats, "vitorias", { limit: fullLimit }),
        },
        {
          id: "aproveitamento",
          title: "Melhor aproveitamento",
          description: "Percentual por vitórias, empates e derrotas.",
          entries: getMetricRankingEntries(statsResult.playersStats, "aproveitamento", { limit: fullLimit, requireGames: true }),
        },
        {
          id: "jogos",
          title: "Mais jogos",
          description: "Quem mais entrou em campo.",
          entries: getMetricRankingEntries(statsResult.playersStats, "jogos", { limit: fullLimit }),
        },
        {
          id: "media-gols",
          title: "Melhor média de gols",
          description: "Gols por jogo disputado.",
          entries: getMetricRankingEntries(statsResult.playersStats, "golsPorJogo", { limit: fullLimit, requireGames: true }),
        },
        {
          id: "faltas-cometidas",
          title: "Mais faltas cometidas",
          description: "Ranking de faltas feitas.",
          entries: getMetricRankingEntries(statsResult.playersStats, "faltasCometidas", { limit: fullLimit }),
        },
        {
          id: "faltas-sofridas",
          title: "Mais faltas sofridas",
          description: "Quem mais sofreu faltas.",
          entries: getMetricRankingEntries(statsResult.playersStats, "faltasSofridas", { limit: fullLimit }),
        },
      ],
      atributos: LINE_ATTRIBUTES.map((attribute) => ({
        id: `atributo-${attribute.key}`,
        title: `Maior ${attribute.label}`,
        description: attribute.description,
        entries: getAttributeRankingEntries(statsResult, attribute.key, fullLimit),
      })),
      goleiros: GOALKEEPER_ATTRIBUTES.map((attribute) => ({
        id: `goleiro-${attribute.key}`,
        title: `Maior ${attribute.label}`,
        description: attribute.description,
        entries: getAttributeRankingEntries(statsResult, attribute.key, fullLimit),
      })),
    };
  }

  function getRankingFullLimit(statsResult) {
    return Math.max(3, statsResult.playersStats.length || 3);
  }

  function getRankingModeDescription(mode) {
    const descriptions = {
      geral: "Escolha uma categoria e veja o pódio em destaque, com o restante da classificação logo abaixo.",
      atributos: "Compare as cartinhas por atributo e descubra os monstros de cada fundamento.",
      goleiros: "Ranking exclusivo dos atributos de goleiro, com pódio e classificação completa.",
    };

    return descriptions[mode] || descriptions.geral;
  }

  function getLatestPeladaAwardEntry(statsResult, awardType) {
    const awardToken = normalizeToken(awardType);
    const event = [...statsResult.eventos]
      .filter((evento) => normalizeToken(evento.tipo) === awardToken && evento.jogadorId)
      .sort((a, b) => getPeladaAwardTimestamp(b, statsResult) - getPeladaAwardTimestamp(a, statsResult))[0];

    if (!event) {
      return null;
    }

    const stats = statsResult.playersStats.find((item) => item.jogadorId === event.jogadorId);
    const pelada = statsResult.peladaById.get(event.peladaId);

    if (!stats) {
      return null;
    }

    return {
      stats,
      value: pelada?.local ? `Última: ${pelada.local}` : "Última pelada",
    };
  }

  function getPeladaAwardTimestamp(evento, statsResult) {
    const pelada = statsResult.peladaById.get(evento.peladaId);
    const value = pelada?.finalizadaEm || pelada?.data || evento.updatedAt || evento.createdAt || "";
    const timestamp = new Date(value).getTime();

    return Number.isFinite(timestamp) ? timestamp : 0;
  }

  function renderRankingModeTabs(activeMode) {
    const modes = [
      ["geral", "Top 3"],
      ["atributos", "Atributos"],
      ["goleiros", "Goleiros"],
    ];

    return `
      <div class="ranking-mode-tabs" role="tablist" aria-label="Tipos de ranking">
        ${modes
          .map(
            ([mode, label]) => `
              <button class="${mode === activeMode ? "active" : ""}" type="button" role="tab" aria-selected="${mode === activeMode ? "true" : "false"}" data-ranking-mode="${escapeHtml(mode)}">
                ${escapeHtml(label)}
              </button>
            `
          )
          .join("")}
      </div>
    `;
  }

  function renderRankingCategoryPicker(categories, activeCategoryId) {
    return `
      <div class="ranking-category-rail" aria-label="Categorias de ranking">
        ${categories.map((category) => renderRankingCategoryButton(category, activeCategoryId)).join("")}
      </div>
    `;
  }

  function renderRankingCategoryButton(category, activeCategoryId) {
    return `
      <button class="ranking-category-button ${category.id === activeCategoryId ? "active" : ""}" type="button" data-ranking-category="${escapeHtml(category.id)}">
        <strong>${escapeHtml(category.title)}</strong>
        <small>${escapeHtml(category.entries.length ? `${category.entries.length} no ranking` : "Sem dados")}</small>
      </button>
    `;
  }

  function renderRankingCategoryPodium(category) {
    const entries = category.entries.slice(0, 3);

    if (!entries.length) {
      return renderEmptyRankingPodium(category);
    }

    const podium = [
      { place: 2, entry: entries[1], className: "is-second" },
      { place: 1, entry: entries[0], className: "is-first" },
      { place: 3, entry: entries[2], className: "is-third" },
    ];

    return `
      <section class="ranking-podium-stage ranking-leaderboard-board">
        <div class="ranking-podium-heading">
          <div>
            <span class="panel-kicker">Top 3 · ${escapeHtml(category.title)}</span>
            <h3>${escapeHtml(category.title)}</h3>
          </div>
        </div>
        <div class="ranking-podium-places">
          ${podium.map((item) => renderRankingPodiumPlace(item.entry, item.className, category)).join("")}
        </div>
        ${renderRankingRemainingList(category, category.entries)}
      </section>
    `;
  }

  function renderEmptyRankingPodium(category = null) {
    return `
      <section class="ranking-podium-stage ranking-leaderboard-board">
        <div class="empty-state compact-empty">
          <h3>${escapeHtml(category?.title || "Sem ranking")}</h3>
          <p>Ainda não há dados suficientes para montar esse pódio.</p>
        </div>
      </section>
    `;
  }

  function renderRankingMiniCardFrame() {
    return `
      <svg class="ranking-mini-card-frame" viewBox="0 0 180 250" preserveAspectRatio="none" aria-hidden="true">
        <path class="ranking-frame-shadow" d="M22 4H137L176 31V205L149 235L90 249L31 235L4 205V31Z"/>
        <path class="ranking-frame-outer" d="M23 7H135L172 34V202L146 230L90 244L34 230L8 202V34Z"/>
        <path class="ranking-frame-inner" d="M27 14H132L164 38V198L141 224L90 237L39 224L16 198V39Z"/>
        <path class="ranking-frame-top" d="M28 18H130L155 36M25 25H126"/>
        <path class="ranking-frame-side is-left" d="M18 46V108L25 118V195L38 214"/>
        <path class="ranking-frame-side is-right" d="M162 46V108L155 118V195L142 214"/>
        <path class="ranking-frame-footer" d="M41 224L90 238L139 224"/>
        <circle class="ranking-frame-node" cx="90" cy="91" r="42"/>
        <path class="ranking-frame-cross" d="M42 91H52M128 91H138M90 43V51M90 131V139"/>
      </svg>
    `;
  }

  function renderRankingPodiumPlace(entry, className, category) {
    if (!entry) {
      return `
        <article class="ranking-podium-place ${escapeHtml(className)} is-empty">
          ${renderRankingMiniCardFrame()}
          <span class="ranking-empty-avatar">–</span>
          <strong>Aguardando</strong>
          <small>Sem jogador</small>
        </article>
      `;
    }

    const { stats, value } = entry;
    const jogador = stats.jogador;
    const position = jogador.posicaoPrincipal || "-";

    return `
      <button class="ranking-podium-place ${escapeHtml(className)}" type="button" data-ranking-action="profile" data-player-id="${escapeHtml(stats.jogadorId)}">
        ${renderRankingMiniCardFrame()}
        ${renderPlayerAvatar(jogador, "player-avatar ranking-podium-avatar")}
        <span class="ranking-podium-name">${escapeHtml(playerDisplayName(jogador))}</span>
        <span class="ranking-podium-position">${escapeHtml(position)}</span>
        <span class="ranking-podium-value"><strong>${escapeHtml(value)}</strong><small>${escapeHtml(category?.title || "Categoria")}</small></span>
      </button>
    `;
  }

  function renderRankingRemainingList(category, entries) {
    return `
      <div class="ranking-rest-board">
        <div class="ranking-rest-heading">
          <div>
            <span>Classificação completa</span>
            <strong>${escapeHtml(category.title)}</strong>
          </div>
          <small>${escapeHtml(entries.length)} jogador${entries.length === 1 ? "" : "es"}</small>
        </div>
        ${
          entries.length
            ? `<div class="ranking-rest-list">${entries.map((entry, index) => renderRankingRestRow(entry, index + 1, category)).join("")}</div>`
            : `<div class="ranking-rest-empty">Nenhum jogador nesta categoria.</div>`
        }
      </div>
    `;
  }

  function renderRankingRestRow(entry, position, category) {
    const { stats, value } = entry;
    const jogador = stats.jogador;

    return `
      <button class="ranking-rest-row ${position <= 3 ? `is-top-${position}` : ""}" type="button" data-ranking-action="profile" data-player-id="${escapeHtml(stats.jogadorId)}">
        <span class="ranking-rest-position">${position}º</span>
        ${renderPlayerAvatar(jogador, "player-avatar small")}
        <span class="ranking-rest-player">
          <strong>${escapeHtml(playerDisplayName(jogador))}</strong>
          <small>${escapeHtml(jogador.posicaoPrincipal || "-")}</small>
        </span>
        <span class="ranking-rest-metric"><small>${escapeHtml(category?.title || "Categoria")}</small><em>${escapeHtml(value)}</em></span>
      </button>
    `;
  }

  function waitForRankingFrame() {
    return new Promise((resolve) => window.requestAnimationFrame(resolve));
  }

  async function transitionRankingView(scope = "category") {
    if (rankingViewTransitionInProgress) return;

    const root = $("#section-content");
    const view = root?.querySelector("[data-ranking-view]");

    if (!root || !view) {
      await renderRankingSection();
      return;
    }

    rankingViewTransitionInProgress = true;

    try {
      const statsResult = await calcularEstatisticasJogadores({
        periodo: "all",
        peladaId: "",
        month: "",
        temporadaId: "",
        jogadorId: "",
        posicao: "",
        sortBy: "gols",
      });
      const viewModel = getRankingViewModel(statsResult);
      const target = scope === "mode" ? view : view.querySelector("[data-ranking-board]");

      if (!target) {
        await renderRankingSection();
        return;
      }

      root.querySelector("[data-ranking-mode-description]")?.replaceChildren(document.createTextNode(getRankingModeDescription(viewModel.activeMode)));
      root.querySelectorAll("[data-ranking-mode]").forEach((button) => {
        const isActive = button.dataset.rankingMode === viewModel.activeMode;
        button.classList.toggle("active", isActive);
        button.setAttribute("aria-selected", String(isActive));
      });

      const stableHeight = target.offsetHeight;
      if (stableHeight) target.style.minHeight = `${stableHeight}px`;
      target.classList.add("is-ranking-leaving");
      await waitForRankingFrame();

      if (scope === "mode") {
        target.innerHTML = renderRankingViewInner(viewModel);
      } else {
        target.innerHTML = viewModel.activeCategory
          ? renderRankingCategoryPodium(viewModel.activeCategory)
          : renderEmptyRankingPodium();
        view.querySelectorAll("[data-ranking-category]").forEach((button) => {
          button.classList.toggle("active", button.dataset.rankingCategory === viewModel.activeCategoryId);
        });
      }

      target.classList.remove("is-ranking-leaving");
      target.classList.add("is-ranking-entering");
      await waitForRankingFrame();
      target.classList.remove("is-ranking-entering");
      target.style.minHeight = "";
    } finally {
      rankingViewTransitionInProgress = false;
    }
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

  function getCompactAwardRankingEntries(playersStats, metric, label, limit) {
    return getMetricRankingEntries(playersStats, metric, { limit }).map((entry) => ({
      ...entry,
      value: `${Number(entry.stats[metric] || 0)} ${label}`,
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

  function bindRankingSectionEvents() {
    const root = $("#section-content");

    if (!root) {
      return;
    }

    root.onclick = async (event) => {
      const modeButton = event.target.closest("[data-ranking-mode]");
      const categoryButton = event.target.closest("[data-ranking-category]");
      const actionButton = event.target.closest("[data-ranking-action]");

      if (modeButton) {
        const nextMode = modeButton.dataset.rankingMode || "geral";
        if (nextMode === state.rankingMode) return;
        state.rankingMode = nextMode;
        state.rankingCategory = "";
        await transitionRankingView("mode");
        return;
      }

      if (categoryButton) {
        const nextCategory = categoryButton.dataset.rankingCategory || "";
        if (nextCategory === state.rankingCategory) return;
        state.rankingCategory = nextCategory;
        await transitionRankingView("category");
        return;
      }

      if (!actionButton) {
        return;
      }

      if (actionButton.dataset.rankingAction === "profile") {
        state.selectedStatsPlayerId = actionButton.dataset.playerId || null;
        state.selectedProfileTab = "resumo";
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
    const activeTab = getActiveProfileTab();

    return `
      <div class="stats-profile player-profile-premium">
        <header class="player-profile-topline">
          <span>Perfil do jogador</span>
        </header>

        <section class="player-card-showcase">
          ${renderPlayerBagreCard(jogador, activeDefinitions)}

          <div class="profile-performance-strip" aria-label="Desempenho do jogador">
            ${renderProfileHeroMetric("Jogos", stats.jogos)}
            ${renderProfileHeroMetric("Vitórias", stats.vitorias)}
            ${renderProfileHeroMetric("Gols", stats.gols)}
            ${renderProfileHeroMetric("Assistências", stats.assistencias)}
          </div>

          <div class="player-card-awards" aria-label="Prêmios em peladas">
            <article class="player-award-stat is-mvp">
              <span class="player-award-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 4h8v4a4 4 0 0 1-8 0Z"/><path d="M8 6H4v1a4 4 0 0 0 4 4M16 6h4v1a4 4 0 0 1-4 4M12 12v5M8 21h8M9 17h6v4H9Z"/></svg></span>
              <span><small>MVPs da pelada</small><strong>${escapeHtml(stats.mvpsPelada || 0)}</strong></span>
            </article>
            <article class="player-award-stat is-bagre">
              <span class="player-award-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 9c2-4 5-5 9-4 2 .5 4 2 5 4-1 5-4 8-8 9-3-1-5-4-6-9Z"/><path d="m19 9 3-2-1 5ZM8 9h.01M8 14c2 1 4 1 6 0"/></svg></span>
              <span><small>Bagres da pelada</small><strong>${escapeHtml(stats.bagresPelada || 0)}</strong></span>
            </article>
          </div>

          <div class="player-card-context">
            <div class="player-context-heading">
              <span>Ficha do atleta</span>
              <strong>${escapeHtml(jogador.nome || playerDisplayName(jogador))}</strong>
              <small>Informações atuais do perfil</small>
            </div>
            <div class="player-context-facts">
              <span><small>Função</small><strong>${escapeHtml(jogador.posicaoPrincipal || "-")} · ${escapeHtml(jogador.tipoJogador || "Linha")}</strong></span>
              <span><small>Pé dominante</small><strong>${escapeHtml(jogador.peForte || "-")}</strong></span>
              <span><small>Nível</small><strong>${escapeHtml(starsText(jogador.estrelas || 1))}</strong></span>
              <span><small>Aproveitamento</small><strong>${escapeHtml(formatPercent(stats.aproveitamento))}</strong></span>
            </div>
          </div>
        </section>

        ${renderPlayerProfileTabs(activeTab)}
        ${renderPlayerProfileTabPanel(activeTab, stats, statsResult, activeDefinitions)}
      </div>
    `;
  }

  function getActiveProfileTab() {
    const tabs = getPlayerProfileTabs().map((tab) => tab.id);
    return tabs.includes(state.selectedProfileTab) ? state.selectedProfileTab : "resumo";
  }

  function getPlayerProfileTabs() {
    return [
      { id: "resumo", label: "Resumo" },
      { id: "atributos", label: "Atributos" },
      { id: "ataque", label: "Ataque" },
      { id: "defesa", label: "Defesa" },
      { id: "disciplina", label: "Disciplina" },
      { id: "historico", label: "Histórico" },
      { id: "evolucao", label: "Evolução" },
    ];
  }

  function renderPlayerBagreCard(jogador, activeDefinitions) {
    return `
      <article class="player-bagre-card" aria-label="Carta BagreScore de ${escapeHtml(playerDisplayName(jogador))}">
        <svg class="player-bagre-frame" viewBox="0 0 360 560" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="bagre-frame-metal" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="#ff6a0a"/>
              <stop offset="0.18" stop-color="#626262"/>
              <stop offset="0.5" stop-color="#171717"/>
              <stop offset="0.82" stop-color="#555"/>
              <stop offset="1" stop-color="#ff5a00"/>
            </linearGradient>
            <linearGradient id="bagre-frame-orange" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#ff8a35"/>
              <stop offset="0.48" stop-color="#ff5a00"/>
              <stop offset="1" stop-color="#9b2d00"/>
            </linearGradient>
            <filter id="bagre-frame-glow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="3" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          <path class="frame-outer" d="M42 4H276L320 27H346L358 43V470L326 512L180 558L34 512L2 470V43L18 25Z"/>
          <path class="frame-metal" d="M43 10H274L318 33H342L351 47V465L319 504L180 548L41 504L9 465V48L23 32Z"/>
          <path class="frame-inner" d="M48 18H270L313 40H335L343 52V458L311 496L180 538L49 496L17 458V54L29 40Z"/>
          <path class="frame-accent frame-accent-left" d="M22 56V205L34 221V446L48 468"/>
          <path class="frame-accent frame-accent-right" d="M338 54V197L326 213V445L312 468"/>
          <path class="frame-shoulder" d="M18 33L54 14H273L316 36"/>
          <path class="frame-footer" d="M51 499L132 525M228 525L309 499"/>
          <path class="frame-tech-left" d="M31 230H47V405H31M38 246H47"/>
          <path class="frame-tech-right" d="M329 224H313V401H329M322 240H313"/>
        </svg>
        <div class="player-bagre-card-top">
          <span class="player-bagre-rating">
            <strong>${escapeHtml(jogador.overall || "-")}</strong>
            <small>${escapeHtml(jogador.posicaoPrincipal || "-")}</small>
          </span>
        </div>
        <div class="player-bagre-portrait">
          ${renderPlayerAvatar(jogador, "player-avatar player-bagre-card-avatar")}
        </div>
        <div class="player-bagre-card-name">
          <strong>${escapeHtml(playerDisplayName(jogador))}</strong>
          <small>${escapeHtml(jogador.tipoJogador || "Linha")}</small>
        </div>
        <div class="player-bagre-card-attrs">
          ${activeDefinitions
            .map((attribute) => {
              const value = normalizeAttributeValue(jogador.attributes?.[attribute.key]);
              return `
                <span>
                  <strong>${value}</strong>
                  <small>${escapeHtml(attribute.label)}</small>
                </span>
              `;
            })
            .join("")}
        </div>
        <span class="player-bagre-brand">BagreScore</span>
      </article>
    `;
  }

  function renderProfileHeroMetric(label, value) {
    return `
      <span>
        <small>${escapeHtml(label)}</small>
        <strong>${escapeHtml(value)}</strong>
      </span>
    `;
  }

  function renderPlayerProfileTabs(activeTab) {
    return `
      <nav class="player-profile-tabs" aria-label="Seções do perfil">
        ${getPlayerProfileTabs()
          .map(
            (tab) => `
              <button class="${tab.id === activeTab ? "active" : ""}" type="button" data-profile-tab="${escapeHtml(tab.id)}" aria-selected="${tab.id === activeTab}">
                ${escapeHtml(tab.label)}
              </button>
            `
          )
          .join("")}
      </nav>
    `;
  }

  function renderPlayerProfileTabPanel(activeTab, stats, statsResult, activeDefinitions) {
    const jogador = stats.jogador;
    const panels = {
      resumo: () => `
        <section class="profile-panel-card">
          <div class="profile-panel-heading">
            <span class="panel-kicker">Visão geral</span>
            <h3>Resumo competitivo</h3>
          </div>
          ${renderProfileMetricGrid(stats, [
            ["Jogos", "jogos"],
            ["Vitórias", "vitorias"],
            ["Empates", "empates"],
            ["Derrotas", "derrotas"],
            ["Aproveitamento", "aproveitamento"],
            ["Gols", "gols"],
            ["Assistências", "assistencias"],
            ["G/A", "participacoesGol"],
          ])}
        </section>
      `,
      atributos: () => `
        <section class="profile-panel-card">
          <div class="profile-panel-heading">
            <span class="panel-kicker">Cartinha</span>
            <h3>Atributos atuais</h3>
          </div>
          <div class="attribute-bars profile-attribute-bars">
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
        </section>
      `,
      ataque: () => `
        <section class="profile-panel-card">
          <div class="profile-panel-heading">
            <span class="panel-kicker">Produção ofensiva</span>
            <h3>Ataque</h3>
          </div>
          ${renderProfileMetricGrid(stats, [
            ["Gols", "gols"],
            ["Assistências", "assistencias"],
            ["Participações", "participacoesGol"],
            ["Gols por jogo", "golsPorJogo"],
            ["Assistências por jogo", "assistenciasPorJogo"],
            ["G/A por jogo", "gaPorJogo"],
            ["Gols de pênalti", "golsPenalti"],
            ["Gols de falta", "golsFalta"],
            ["Gols de cabeça", "golsCabeca"],
          ])}
        </section>
      `,
      defesa: () => `
        <section class="profile-panel-card">
          <div class="profile-panel-heading">
            <span class="panel-kicker">Sem a bola</span>
            <h3>Defesa e goleiro</h3>
          </div>
          ${renderProfileMetricGrid(stats, [
            ["Ações defensivas", "acoesDefensivas"],
            ["Desarmes", "desarmes"],
            ["Interceptações", "interceptacoes"],
            ["Bloqueios", "bloqueios"],
            ["Cortes", "cortes"],
            ["Defesas difíceis", "defesasDificeis"],
            ["Defesas de pênalti", "defesasPenalti"],
          ])}
        </section>
      `,
      disciplina: () => `
        <section class="profile-panel-card">
          <div class="profile-panel-heading">
            <span class="panel-kicker">Controle da pelada</span>
            <h3>Disciplina e prêmios</h3>
          </div>
          ${renderProfileMetricGrid(stats, [
            ["Faltas cometidas", "faltasCometidas"],
            ["Faltas sofridas", "faltasSofridas"],
            ["Amarelos", "cartoesAmarelos"],
            ["Vermelhos", "cartoesVermelhos"],
            ["Gols contra", "golsContra"],
            ["MVPs da Pelada", "mvpsPelada"],
            ["Bagres da Pelada", "bagresPelada"],
          ])}
        </section>
      `,
      historico: () => `
        <section class="profile-panel-card">
          <div class="profile-panel-heading">
            <span class="panel-kicker">Linha do tempo</span>
            <h3>Últimos jogos</h3>
          </div>
          ${renderPlayerGameHistory(stats)}
        </section>
        <section class="profile-panel-card">
          <div class="profile-panel-heading">
            <span class="panel-kicker">Peladas finalizadas</span>
            <h3>Prêmios</h3>
          </div>
          ${renderPlayerAwardHistory(stats)}
        </section>
      `,
      evolucao: () => renderManualEvolutionCard(statsResult.jogadores, jogador.id),
    };

    return `
      <div class="player-profile-panel">
        ${(panels[activeTab] || panels.resumo)()}
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
                <header class="player-history-head">
                  <span class="player-history-date">
                    <strong>${escapeHtml(formatDateLabel(history.data))}</strong>
                    <small>${escapeHtml(history.local || "Pelada")}</small>
                  </span>
                  <span class="result-badge result-${escapeHtml(history.resultado)}">${escapeHtml(resultLabel(history.resultado))}</span>
                </header>
                <div class="player-history-scoreline">
                  <span><small>Jogou pelo</small><strong>${escapeHtml(history.timeNome || `Time ${history.time}`)}</strong></span>
                  <strong>${escapeHtml(history.placar)}</strong>
                </div>
                <div class="player-history-metrics" aria-label="Estatísticas desta partida">
                  <span><strong>${escapeHtml(history.gols)}</strong><small>Gols</small></span>
                  <span><strong>${escapeHtml(history.assistencias)}</strong><small>Assist.</small></span>
                  <span><strong>${escapeHtml(history.faltasCometidas)}</strong><small>Faltas C.</small></span>
                  <span><strong>${escapeHtml(history.faltasSofridas)}</strong><small>Faltas S.</small></span>
                  <span><strong>${escapeHtml(history.acoesDefensivas)}</strong><small>Ações def.</small></span>
                  <span><strong>${escapeHtml(history.defesasDificeis)}</strong><small>Defesas</small></span>
                </div>
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
    if (!requirePermission("atributos:editar")) return;

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

  function bindManualEvolutionForm(statsResult) {
    const evolutionForm = $("#manual-evolution-form");

    if (!evolutionForm || evolutionForm.dataset.eventsBound === "true") {
      return;
    }

    evolutionForm.dataset.eventsBound = "true";
    evolutionForm.addEventListener("change", (event) => {
      if (event.target?.name !== "jogadorId") {
        return;
      }

      populateManualEvolutionAttributes(evolutionForm, statsResult.jogadores);
    });
    evolutionForm.addEventListener("submit", handleManualEvolutionSubmit);
    populateManualEvolutionAttributes(evolutionForm, statsResult.jogadores);
  }

  function switchPlayerProfileTab(profileTab, statsResult, root) {
    const nextTab = getPlayerProfileTabs().some((tab) => tab.id === profileTab) ? profileTab : "resumo";
    const stats = statsResult.playersStats.find((item) => item.jogadorId === state.selectedStatsPlayerId);
    const currentPanel = root?.querySelector(".player-profile-panel");

    if (!stats || !currentPanel) {
      return false;
    }

    state.selectedProfileTab = nextTab;
    root.querySelectorAll("[data-profile-tab]").forEach((button) => {
      const isActive = button.dataset.profileTab === nextTab;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-selected", String(isActive));
    });

    const activeDefinitions = getActiveAttributeDefinitions(stats.jogador.tipoJogador, stats.jogador.posicaoPrincipal);
    currentPanel.outerHTML = renderPlayerProfileTabPanel(nextTab, stats, statsResult, activeDefinitions);
    const nextPanel = root.querySelector(".player-profile-panel");
    nextPanel?.classList.add("is-entering");
    nextPanel?.addEventListener("animationend", () => nextPanel.classList.remove("is-entering"), { once: true });
    bindManualEvolutionForm(statsResult);
    return true;
  }

  function bindStatsSectionEvents(statsResult) {
    const root = $("#section-content");
    const form = $("#stats-filter-form");

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

    bindManualEvolutionForm(statsResult);

    if (!root) {
      return;
    }

    root.onclick = async (event) => {
      const profileTabButton = event.target.closest("[data-profile-tab]");
      const actionButton = event.target.closest("[data-stats-action]");

      if (profileTabButton) {
        switchPlayerProfileTab(profileTabButton.dataset.profileTab || "resumo", statsResult, root);
        return;
      }

      if (!actionButton) {
        return;
      }

      const action = actionButton.dataset.statsAction;

      if (action === "profile") {
        state.selectedStatsPlayerId = actionButton.dataset.playerId || null;
        state.selectedProfileTab = "resumo";
        await renderCurrentSection();
        return;
      }

      if (action === "show-attributes") {
        switchPlayerProfileTab("atributos", statsResult, root);
        window.requestAnimationFrame(() => {
          $(".player-profile-tabs")?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
        return;
      }

      if (action === "edit-player" && hasPermission("jogadores:editar")) {
        const playerId = actionButton.dataset.playerId || state.selectedStatsPlayerId;
        state.selectedPlayerId = playerId;
        state.editingPlayerId = playerId;
        state.playerFormOpen = true;
        state.playerFormStep = "basicos";
        state.playersListOpen = false;
        await switchSection("jogadores", { preservePlayerState: true });
        window.requestAnimationFrame(() => {
          $("#player-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
        return;
      }

      if (action === "back") {
        state.selectedStatsPlayerId = null;
        state.selectedProfileTab = "resumo";
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

  function renderMyPlayerProfile(player) {
    if (!player) return "";

    const goalkeeper = isGoalkeeper(player.tipoJogador, player.posicaoPrincipal);
    const allowedPositions = goalkeeper ? ["GK"] : LINE_POSITIONS;

    return `
      <section class="data-card my-player-profile-card">
        <div class="section-heading-inline">
          <div>
            <span class="panel-kicker">Meu jogador</span>
            <h3>Editar meu perfil</h3>
          </div>
          <span class="status-pill">${escapeHtml(player.overall ?? "-")} OVR</span>
        </div>

        <form class="my-player-profile-form" id="my-player-profile-form" novalidate>
          <input type="hidden" name="foto" value="${escapeHtml(player.foto || "")}" />
          <div class="my-profile-photo-panel">
            <div id="my-profile-avatar-preview">
              ${renderPlayerAvatar(player, "player-avatar my-profile-avatar")}
            </div>
            <div>
              <strong>${escapeHtml(player.nome || "Jogador")}</strong>
              <small>${escapeHtml(player.tipoJogador || "Linha")} · atributos bloqueados</small>
              <div class="my-profile-photo-actions">
                <label class="ghost-button compact-button">
                  <input type="file" name="fotoArquivo" accept="image/*" hidden />
                  Escolher foto
                </label>
                <button class="ghost-button compact-button" type="button" data-my-profile-action="remove-photo" ${player.foto ? "" : "hidden"}>Remover</button>
              </div>
            </div>
          </div>

          <div class="form-grid">
            <label class="field-label">
              <span>Apelido</span>
              <input type="text" name="apelido" minlength="2" maxlength="40" value="${escapeHtml(player.apelido || player.nome || "")}" required />
            </label>
            <label class="field-label">
              <span>Posição</span>
              <select name="posicaoPrincipal" required>
                ${renderOptions(allowedPositions, player.posicaoPrincipal || allowedPositions[0], "Selecione")}
              </select>
            </label>
          </div>

          ${goalkeeper ? `<p class="my-profile-note">Para mudar de goleiro para jogador de linha, peça ao administrador. Isso evita alterações incompatíveis com os atributos da carta.</p>` : ""}
          <button class="primary-button" type="submit">Salvar meu perfil</button>
          <p class="form-feedback" id="my-player-profile-feedback" role="status" hidden></p>
        </form>
      </section>
    `;
  }

  function renderPlayerPinCard() {
    return `
      <section class="data-card player-pin-card">
        <div>
          <span class="panel-kicker">Segurança</span>
          <h3>Alterar meu PIN</h3>
        </div>
        <form class="change-pin-form player-change-pin-form" id="change-pin-form" novalidate>
          <div class="form-grid">
            <label class="field-label">
              <span>PIN atual</span>
              <input type="password" name="currentPin" inputmode="numeric" autocomplete="current-password" minlength="4" maxlength="12" required />
            </label>
            <label class="field-label">
              <span>Novo PIN</span>
              <input type="password" name="newPin" inputmode="numeric" autocomplete="new-password" minlength="4" maxlength="12" required />
            </label>
            <label class="field-label">
              <span>Confirmar novo PIN</span>
              <input type="password" name="confirmPin" inputmode="numeric" autocomplete="new-password" minlength="4" maxlength="12" required />
            </label>
          </div>
          <button class="ghost-button" type="submit">Alterar PIN</button>
          <p class="form-feedback" id="change-pin-feedback" role="status" hidden></p>
        </form>
      </section>
    `;
  }

  function bindMyPlayerSettingsEvents() {
    $("#change-pin-form")?.addEventListener("submit", handleChangePinSubmit);
    $("#my-player-profile-form")?.addEventListener("submit", handleMyPlayerProfileSubmit);
    $("#my-player-profile-form input[name=\"fotoArquivo\"]")?.addEventListener("change", handleMyPlayerProfilePhotoChange);
    $("[data-my-profile-action=\"remove-photo\"]")?.addEventListener("click", handleMyPlayerProfileRemovePhoto);
  }

  async function renderConfigSection(counts = {}) {
    const isPlayerProfile = state.currentUser?.perfilId === "jogador";
    setSectionTitle(isPlayerProfile ? "Minha conta" : "Sistema", isPlayerProfile ? "Meu jogador" : "Configurações");
    const [config, syncQueue, auditLog] = await Promise.all([
      getRecord("configs", "app"),
      getAllRecords("syncQueue"),
      getAllRecords("auditLog"),
    ]);
    const pendingSync = syncQueue.filter((item) => item.status !== "sincronizado");
    const syncErrors = pendingSync.filter((item) => item.status === "erro");
    const linkedPlayer = state.currentUser?.jogadorId
      ? await getRecord("jogadores", state.currentUser.jogadorId)
      : null;
    let accountPlayers = [];

    if (isPlayerProfile) {
      $("#section-content").innerHTML = `
        <div class="player-self-settings">
          ${renderPlayerPinCard()}
          ${renderMyPlayerProfile(linkedPlayer)}
        </div>
      `;
      bindMyPlayerSettingsEvents();
      return;
    }

    if (canManageUsers()) {
      accountPlayers = await getAllRecords("jogadores");
      if (navigator.onLine && state.backendUrl && state.authToken) {
        try {
          const accounts = await callAppsScript("listUsers", { token: state.authToken });
          state.remoteUsers = accounts.users || [];
          state.remoteProfiles = accounts.profiles || [];
        } catch (error) {
          state.accountMessage = `Não foi possível carregar as contas: ${error.message}`;
        }
      }
    }

    $("#section-content").innerHTML = `
      <section class="data-card account-config-card">
        <div class="section-heading-inline">
          <div>
            <span class="panel-kicker">Conta e servidor</span>
            <h3>${state.currentUser ? escapeHtml(state.currentUser.nome) : "Conectar BagreScore"}</h3>
            <p>${state.currentUser
              ? `${escapeHtml(state.currentUser.perfilNome || state.currentUser.perfilId || "Usuário")} · sessão ativa neste aparelho`
              : config?.appsScriptUrl
                ? "Servidor configurado. Entre para sincronizar os dados."
                : "Cole a URL publicada do Apps Script para ativar contas e sincronização."}</p>
          </div>
          ${state.currentUser ? `<span class="status-pill account-online-pill">Conectado</span>` : ""}
        </div>

        ${canManageUsers() || !state.backendUrl ? `<form class="sync-config-form" id="sync-config-form" novalidate>
          <label class="field-label">
            <span>URL publicada do Apps Script</span>
            <input type="url" name="appsScriptUrl" value="${escapeHtml(config?.appsScriptUrl || "")}" placeholder="https://script.google.com/macros/s/.../exec" required />
          </label>
          <button class="primary-button" type="submit">Salvar e conectar</button>
          <p class="form-feedback" id="sync-config-feedback" role="status" hidden></p>
        </form>` : ""}

        ${state.currentUser ? `
          <form class="change-pin-form" id="change-pin-form" novalidate>
            <h3>Alterar meu PIN</h3>
            <div class="form-grid">
              <label class="field-label">
                <span>PIN atual</span>
                <input type="password" name="currentPin" inputmode="numeric" autocomplete="current-password" minlength="4" maxlength="12" required />
              </label>
              <label class="field-label">
                <span>Novo PIN</span>
                <input type="password" name="newPin" inputmode="numeric" autocomplete="new-password" minlength="4" maxlength="12" required />
              </label>
              <label class="field-label">
                <span>Confirmar novo PIN</span>
                <input type="password" name="confirmPin" inputmode="numeric" autocomplete="new-password" minlength="4" maxlength="12" required />
              </label>
            </div>
            <button class="ghost-button" type="submit">Alterar PIN</button>
            <p class="form-feedback" id="change-pin-feedback" role="status" hidden></p>
          </form>
        ` : ""}
      </section>

      ${renderMyPlayerProfile(linkedPlayer)}

      ${canManageUsers() ? renderUserManagement(accountPlayers) : ""}

      ${canManageUsers() ? `
        <section class="data-card server-reset-card">
          <div>
            <span class="panel-kicker">Zona de segurança</span>
            <h3>Zerar dados de teste</h3>
            <p>Apaga jogadores, peladas, jogos, eventos, filas e contas de teste. A conta administrativa atual e os perfis são preservados.</p>
          </div>
          <form class="server-reset-form" id="server-reset-form" novalidate>
            <label class="field-label">
              <span>Digite ZERAR BAGRESCORE</span>
              <input type="text" name="confirmation" autocomplete="off" autocapitalize="characters" required />
            </label>
            <button class="danger-button" type="submit">Zerar todos os dados</button>
            <p class="form-feedback" id="server-reset-feedback" role="alert" hidden></p>
          </form>
        </section>
      ` : ""}

      <div class="content-grid">
        <article class="data-card">
          <h3>Regras do jogo</h3>
          <p>${escapeHtml(config?.regras?.duracaoJogoMinutos || 10)} minutos ou ${escapeHtml(config?.regras?.golsParaEncerrar || 2)} gols para encerrar.</p>
        </article>
        <article class="data-card">
          <h3>Sincronização</h3>
          <p>Apps Script: ${config?.appsScriptUrl ? escapeHtml(config.appsScriptUrl) : "URL pendente"}</p>
          <p>${pendingSync.length} registro${pendingSync.length === 1 ? "" : "s"} pendente${pendingSync.length === 1 ? "" : "s"}.</p>
          <p>Revisão remota: ${escapeHtml(config?.lastServerRevision || 0)} · Última sincronização: ${escapeHtml(config?.lastSyncAt ? new Date(config.lastSyncAt).toLocaleString("pt-BR") : "ainda não concluída")}</p>
          ${syncErrors.length ? `<p class="sync-error-summary">${syncErrors.length} operação${syncErrors.length === 1 ? "" : "ões"} com erro. ${escapeHtml(syncErrors[0]?.syncError || "Verifique as permissões da conta.")}</p>` : ""}
        </article>
      </div>

      <section class="data-card diagnostics-card">
        <div class="section-heading-inline">
          <div>
            <span class="panel-kicker">Modo Desenvolvedor</span>
            <h3>Diagnóstico do App</h3>
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

    $("#sync-config-form")?.addEventListener("submit", handleSyncConfigSubmit);
    bindMyPlayerSettingsEvents();
    $("#user-admin-form")?.addEventListener("submit", handleUserAdminSubmit);
    $(".user-admin-card")?.addEventListener("click", handleUserAdminClick);
    $("#server-reset-form")?.addEventListener("submit", handleServerResetSubmit);
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

  function getActorId() {
    return state.currentUser?.id || getDeviceId();
  }

  function readStoredAuthUser() {
    try {
      return JSON.parse(localStorage.getItem(AUTH_USER_STORAGE_KEY) || "null");
    } catch (error) {
      return null;
    }
  }

  function persistAuthSession(token, user) {
    state.authToken = String(token || "");
    state.currentUser = user || null;

    if (state.authToken) localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, state.authToken);
    else localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);

    if (state.currentUser) localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(state.currentUser));
    else localStorage.removeItem(AUTH_USER_STORAGE_KEY);

    updateAccountUi();
  }

  function clearAuthSession() {
    persistAuthSession("", null);
  }

  function restoreAuthState(config) {
    state.backendUrl = String(config?.appsScriptUrl || "").trim();
    state.authToken = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || "";
    state.currentUser = readStoredAuthUser();

    if (!state.authToken) {
      state.currentUser = null;
    }

    updateAccountUi();

    if (state.backendUrl && !state.authToken) {
      openAuthGate();
    }
  }

  function updateAccountUi() {
    const label = $("#account-label");
    const detail = $("#account-detail");
    const logoutButton = $("#logout-button");

    if (!label || !detail || !logoutButton) return;

    if (state.currentUser) {
      const profileName = state.currentUser.perfilNome || state.currentUser.perfilId || "Usuário";
      label.textContent = "Meu perfil";
      detail.textContent = `${state.currentUser.nome || "Conta conectada"} · ${profileName}`;
      logoutButton.hidden = false;
      return;
    }

    logoutButton.hidden = true;
    label.textContent = "Meu perfil";
    if (state.backendUrl) {
      detail.textContent = "Login necessário para sincronizar";
    } else {
      detail.textContent = "Servidor ainda não configurado";
    }
  }

  function openAuthGate(message = "") {
    const gate = $("#auth-gate");
    const errorBox = $("#auth-error");
    if (!gate) return;
    gate.hidden = false;
    document.body.classList.add("auth-required");
    if (errorBox) {
      errorBox.hidden = !message;
      errorBox.textContent = message;
    }
    window.setTimeout(() => gate.querySelector('input[name="login"]')?.focus(), 20);
  }

  function closeAuthGate() {
    $("#auth-gate")?.setAttribute("hidden", "");
    document.body.classList.remove("auth-required");
    const errorBox = $("#auth-error");
    if (errorBox) {
      errorBox.hidden = true;
      errorBox.textContent = "";
    }
  }

  function hasPermission(permission) {
    if (!state.backendUrl) return true;
    const permissions = state.currentUser?.permissoes || [];
    return permissions.includes("*") || permissions.includes(permission);
  }

  function requirePermission(permission, message = "Seu perfil não permite esta ação.") {
    if (hasPermission(permission)) return true;
    if (!state.currentUser) openAuthGate("Entre na sua conta para continuar.");
    else window.alert(message);
    return false;
  }

  function normalizeAppsScriptUrl(value) {
    const url = String(value || "").trim();
    if (!url) return "";

    let parsed;
    try {
      parsed = new URL(url);
    } catch (error) {
      throw new Error("Informe uma URL válida do Apps Script.");
    }

    if (parsed.protocol !== "https:" || parsed.hostname !== "script.google.com" || !parsed.pathname.endsWith("/exec")) {
      throw new Error("Use a URL publicada do Apps Script terminada em /exec.");
    }

    return parsed.toString();
  }

  function isApiVersionAtLeast(currentVersion, minimumVersion) {
    const current = String(currentVersion || "0").split(".").map((part) => Number(part) || 0);
    const minimum = String(minimumVersion || "0").split(".").map((part) => Number(part) || 0);
    const length = Math.max(current.length, minimum.length);

    for (let index = 0; index < length; index += 1) {
      const difference = Number(current[index] || 0) - Number(minimum[index] || 0);
      if (difference) return difference > 0;
    }

    return true;
  }

  async function callAppsScript(action, payload = {}, urlOverride = "") {
    const url = normalizeAppsScriptUrl(urlOverride || state.backendUrl);
    if (!url) throw new Error("Servidor do Apps Script não configurado.");

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(url, {
        method: "POST",
        redirect: "follow",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action, ...payload }),
        signal: controller.signal,
      });
      const text = await response.text();
      let result;

      try {
        result = JSON.parse(text);
      } catch (error) {
        throw new Error("O servidor não respondeu como esperado. Confira a implantação e as permissões do Apps Script.");
      }

      if (!response.ok || !result.ok) {
        throw new Error(result.error || `Falha no servidor (${response.status}).`);
      }

      return result;
    } catch (error) {
      if (error.name === "AbortError") throw new Error("O servidor demorou para responder.");
      throw error;
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  async function handleAuthLoginSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const submitButton = form.querySelector('button[type="submit"]');
    const errorBox = $("#auth-error");
    const login = String(form.elements.login?.value || "").trim().toLowerCase();
    const pin = String(form.elements.pin?.value || "").trim();

    if (!login || !/^\d{4,12}$/.test(pin)) {
      errorBox.textContent = "Informe o usuário e um PIN de 4 a 12 números.";
      errorBox.hidden = false;
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Entrando...";
    errorBox.hidden = true;

    try {
      const result = await callAppsScript("login", { login, pin, deviceId: getDeviceId() });
      const config = await getRecord("configs", "app");
      if (!config?.serverEpoch && Number(config?.lastServerRevision || 0) === 0 && result.epoch) {
        await putRecord("configs", {
          ...config,
          serverEpoch: result.epoch,
          updatedAt: nowIso(),
        });
      }
      persistAuthSession(result.token, result.user);
      form.reset();
      closeAuthGate();
      await updateSyncStatus(`Conectado como ${result.user.nome}`);
      await syncNow();
      await renderCurrentSection();
    } catch (error) {
      errorBox.textContent = error.message;
      errorBox.hidden = false;
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Entrar";
    }
  }

  async function handleLogout() {
    const token = state.authToken;
    clearAuthSession();
    closeSettingsDrawer();

    if (navigator.onLine && token && state.backendUrl) {
      try {
        await callAppsScript("logout", { token });
      } catch (error) {
        console.warn("Não foi possível encerrar a sessão remota.", error);
      }
    }

    if (state.backendUrl) openAuthGate("Sessão encerrada.");
  }

  async function handleAuthChangeServer() {
    const confirmed = window.confirm("Quer remover a URL atual e voltar ao modo local neste aparelho?");
    if (!confirmed) return;

    const config = await getRecord("configs", "app");
    await putRecord("configs", {
      ...config,
      appsScriptUrl: "",
      serverEpoch: "",
      lastServerRevision: 0,
      updatedAt: nowIso(),
    });
    state.backendUrl = "";
    clearAuthSession();
    closeAuthGate();
    await updateSyncStatus("Modo local ativo");
    await renderCurrentSection();
  }

  async function handleSyncConfigSubmit(event) {
    event.preventDefault();
    if (state.backendUrl && !requirePermission("configs:editar")) return;
    const form = event.currentTarget;
    const submitButton = form.querySelector('button[type="submit"]');
    const feedback = $("#sync-config-feedback");

    try {
      const nextUrl = normalizeAppsScriptUrl(form.elements.appsScriptUrl?.value || "");
      submitButton.disabled = true;
      submitButton.textContent = "Verificando...";
      feedback.hidden = true;

      await callAppsScript("ping", {}, nextUrl);
      const config = await getRecord("configs", "app");
      const changedServer = String(config?.appsScriptUrl || "") !== nextUrl;
      await putRecord("configs", {
        ...config,
        appsScriptUrl: nextUrl,
        serverEpoch: changedServer ? "" : String(config?.serverEpoch || ""),
        lastServerRevision: changedServer ? 0 : Number(config?.lastServerRevision || 0),
        updatedAt: nowIso(),
      });

      state.backendUrl = nextUrl;
      if (changedServer) clearAuthSession();
      updateAccountUi();
      feedback.textContent = "Servidor conectado. Entre com a conta administrativa.";
      feedback.hidden = false;
      if (state.currentUser) await syncNow();
      else openAuthGate();
    } catch (error) {
      feedback.textContent = error.message;
      feedback.hidden = false;
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Salvar e conectar";
    }
  }

  async function handleChangePinSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const feedback = $("#change-pin-feedback");
    const currentPin = String(form.elements.currentPin?.value || "").trim();
    const newPin = String(form.elements.newPin?.value || "").trim();
    const confirmPin = String(form.elements.confirmPin?.value || "").trim();

    if (!/^\d{4,12}$/.test(newPin) || newPin !== confirmPin) {
      feedback.textContent = "O novo PIN deve ter de 4 a 12 números e a confirmação deve ser igual.";
      feedback.hidden = false;
      return;
    }

    try {
      await callAppsScript("changePin", { token: state.authToken, currentPin, newPin });
      form.reset();
      feedback.textContent = "PIN alterado com sucesso.";
      feedback.hidden = false;
    } catch (error) {
      feedback.textContent = error.message;
      feedback.hidden = false;
    }
  }

  function updateMyPlayerProfilePreview(form) {
    if (!form) return;
    const preview = $("#my-profile-avatar-preview");
    const removeButton = $("[data-my-profile-action=\"remove-photo\"]");
    const player = {
      nome: state.currentUser?.nome || "Jogador",
      apelido: String(form.elements.apelido?.value || "").trim(),
      foto: String(form.elements.foto?.value || "").trim(),
    };

    if (preview) preview.innerHTML = renderPlayerAvatar(player, "player-avatar my-profile-avatar");
    if (removeButton) removeButton.hidden = !player.foto;
  }

  async function handleMyPlayerProfilePhotoChange(event) {
    const form = event.currentTarget?.form;
    const feedback = $("#my-player-profile-feedback");

    try {
      const file = event.currentTarget?.files?.[0];
      if (!file || !form) return;
      const photo = await readPlayerPhotoFile(file);
      if (photo.length > PLAYER_PROFILE_PHOTO_MAX_CHARS) {
        throw new Error("A foto ficou muito grande depois do processamento. Escolha uma imagem menor.");
      }
      form.elements.foto.value = photo;
      updateMyPlayerProfilePreview(form);
      if (feedback) feedback.hidden = true;
    } catch (error) {
      if (feedback) {
        feedback.textContent = error.message;
        feedback.hidden = false;
      }
      if (event.currentTarget) event.currentTarget.value = "";
    }
  }

  function handleMyPlayerProfileRemovePhoto(event) {
    const form = event.currentTarget?.closest("form");
    if (!form) return;
    form.elements.foto.value = "";
    if (form.elements.fotoArquivo) form.elements.fotoArquivo.value = "";
    updateMyPlayerProfilePreview(form);
  }

  async function handleMyPlayerProfileSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const feedback = $("#my-player-profile-feedback");
    const submitButton = form.querySelector('button[type="submit"]');
    const nickname = String(form.elements.apelido?.value || "").trim();
    const position = String(form.elements.posicaoPrincipal?.value || "").trim().toUpperCase();
    const photo = String(form.elements.foto?.value || "").trim();

    if (!state.currentUser?.jogadorId) {
      feedback.textContent = "Sua conta ainda não está vinculada a um jogador.";
      feedback.hidden = false;
      return;
    }
    if (nickname.length < 2 || nickname.length > 40 || !PLAYER_POSITIONS.includes(position)) {
      feedback.textContent = "Confira o apelido e a posição escolhida.";
      feedback.hidden = false;
      return;
    }
    if (!navigator.onLine) {
      feedback.textContent = "Conecte-se à internet para alterar seu perfil com segurança.";
      feedback.hidden = false;
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Salvando...";
    feedback.hidden = true;

    try {
      const result = await callAppsScript("updateMyPlayerProfile", {
        token: state.authToken,
        deviceId: getDeviceId(),
        player: {
          apelido: nickname,
          foto: photo,
          posicaoPrincipal: position,
        },
      });

      await putRecord("jogadores", result.player);
      updateMyPlayerProfilePreview(form);
      feedback.textContent = "Perfil atualizado com segurança.";
      feedback.hidden = false;
    } catch (error) {
      feedback.textContent = error.message;
      feedback.hidden = false;
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Salvar meu perfil";
    }
  }

  function canManageUsers() {
    const permissions = state.currentUser?.permissoes || [];
    return permissions.includes("*") || permissions.includes("usuarios:gerenciar");
  }

  function renderUserManagement(players) {
    const availableProfiles = state.remoteProfiles.length ? state.remoteProfiles : DEFAULT_PERFIS;
    const profiles = availableProfiles.filter((profile) => ["administrador", "organizador", "jogador"].includes(profile.id));
    const userRows = state.remoteUsers.length
      ? state.remoteUsers.map((user) => `
          <button class="remote-user-row" type="button" data-user-admin-action="edit" data-user-id="${escapeHtml(user.id)}">
            <span class="remote-user-avatar" aria-hidden="true">${escapeHtml(String(user.nome || "U").slice(0, 1).toUpperCase())}</span>
            <span>
              <strong>${escapeHtml(user.nome)}</strong>
              <small>@${escapeHtml(user.login)} · ${escapeHtml(user.perfilNome || user.perfilId)}</small>
            </span>
            <em class="${user.status === "ativo" ? "is-active" : ""}">${escapeHtml(user.status)}</em>
          </button>
        `).join("")
      : `<p class="account-list-empty">Nenhuma conta remota encontrada.</p>`;

    return `
      <section class="data-card user-admin-card">
        <div class="section-heading-inline">
          <div>
            <span class="panel-kicker">Acessos</span>
            <h3>Contas dos usuários</h3>
            <p>Use Administrador para configurações, Operador para gerenciar peladas e Jogador para acesso pessoal a estatísticas, ranking e carta.</p>
          </div>
          <span class="count-badge">${state.remoteUsers.length}</span>
        </div>

        <form class="user-admin-form" id="user-admin-form" novalidate>
          <input type="hidden" name="id" />
          <div class="form-grid">
            <label class="field-label">
              <span>Nome *</span>
              <input type="text" name="nome" autocomplete="off" required />
            </label>
            <label class="field-label">
              <span>Login *</span>
              <input type="text" name="login" autocomplete="off" autocapitalize="none" placeholder="ex.: juninho" required />
            </label>
            <label class="field-label">
              <span>Perfil *</span>
              <select name="perfilId" required>
                ${profiles.map((profile) => `<option value="${escapeHtml(profile.id)}">${escapeHtml(profile.nome)}</option>`).join("")}
              </select>
            </label>
            <label class="field-label">
              <span>Vincular ao jogador</span>
              <select name="jogadorId">
                <option value="">Sem vínculo</option>
                ${players.map((player) => `<option value="${escapeHtml(player.id)}">${escapeHtml(playerDisplayName(player))}</option>`).join("")}
              </select>
            </label>
            <label class="field-label">
              <span>Status</span>
              <select name="status">
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </label>
            <label class="field-label">
              <span>Definir novo PIN</span>
              <input type="password" name="pin" inputmode="numeric" autocomplete="new-password" minlength="4" maxlength="12" placeholder="Gerado automaticamente" />
            </label>
          </div>
          <div class="form-actions">
            <button class="primary-button" type="submit">Salvar conta</button>
            <button class="ghost-button" type="reset" data-user-admin-action="reset">Limpar</button>
          </div>
          <p class="form-feedback" id="user-admin-feedback" role="status" ${state.accountMessage ? "" : "hidden"}>${escapeHtml(state.accountMessage)}</p>
        </form>

        <div class="remote-user-list">
          ${userRows}
        </div>
      </section>
    `;
  }

  async function handleUserAdminSubmit(event) {
    event.preventDefault();
    if (!canManageUsers()) return;

    const form = event.currentTarget;
    const submitButton = form.querySelector('button[type="submit"]');
    const user = {
      id: String(form.elements.id?.value || ""),
      nome: String(form.elements.nome?.value || "").trim(),
      login: String(form.elements.login?.value || "").trim().toLowerCase(),
      perfilId: String(form.elements.perfilId?.value || "jogador"),
      jogadorId: String(form.elements.jogadorId?.value || ""),
      status: String(form.elements.status?.value || "ativo"),
      pin: String(form.elements.pin?.value || "").trim(),
    };

    if (!user.nome || !/^[a-z0-9._-]{3,40}$/.test(user.login)) {
      state.accountMessage = "Informe o nome e um login com pelo menos três caracteres simples.";
      const feedback = $("#user-admin-feedback");
      feedback.textContent = state.accountMessage;
      feedback.hidden = false;
      return;
    }

    if (user.perfilId === "jogador" && !user.jogadorId) {
      state.accountMessage = "Escolha qual jogador será vinculado a esta conta.";
      const feedback = $("#user-admin-feedback");
      feedback.textContent = state.accountMessage;
      feedback.hidden = false;
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Salvando...";

    try {
      const result = await callAppsScript("saveUser", {
        token: state.authToken,
        deviceId: getDeviceId(),
        user,
      });
      state.accountMessage = result.temporaryPin
        ? `Conta salva. PIN temporário de ${result.user.nome}: ${result.temporaryPin}`
        : `Conta de ${result.user.nome} atualizada.`;
      await renderCurrentSection();
    } catch (error) {
      state.accountMessage = error.message;
      const feedback = $("#user-admin-feedback");
      feedback.textContent = state.accountMessage;
      feedback.hidden = false;
      submitButton.disabled = false;
      submitButton.textContent = "Salvar conta";
    }
  }

  function handleUserAdminClick(event) {
    const button = event.target.closest("[data-user-admin-action]");
    if (!button) return;
    const form = $("#user-admin-form");
    if (!form) return;

    if (button.dataset.userAdminAction === "reset") {
      form.reset();
      form.elements.id.value = "";
      state.accountMessage = "";
      return;
    }

    if (button.dataset.userAdminAction !== "edit") return;
    const user = state.remoteUsers.find((item) => item.id === button.dataset.userId);
    if (!user) return;

    form.elements.id.value = user.id || "";
    form.elements.nome.value = user.nome || "";
    form.elements.login.value = user.login || "";
    form.elements.perfilId.value = user.perfilId || "jogador";
    form.elements.jogadorId.value = user.jogadorId || "";
    form.elements.status.value = user.status || "ativo";
    form.elements.pin.value = "";
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function resetLocalData(serverEpoch = "", options = {}) {
    const preserveAuth = options.preserveAuth !== false;
    const config = await getRecord("configs", "app");
    const storesToClear = STORE_SCHEMAS
      .map((schema) => schema.name)
      .filter((storeName) => storeName !== "configs");
    const transaction = state.db.transaction(storesToClear, "readwrite");

    storesToClear.forEach((storeName) => transaction.objectStore(storeName).clear());
    await transactionDone(transaction);
    invalidateStatsCache(storesToClear);

    await putRecord("configs", {
      ...config,
      appVersion: APP_VERSION,
      serverEpoch: String(serverEpoch || ""),
      lastServerRevision: 0,
      lastSyncAt: "",
      updatedAt: nowIso(),
    });

    localStorage.removeItem("bagrescore:active-game-id");
    state.activeGameId = null;
    state.selectedPeladaId = null;
    state.selectedGameSummaryId = null;
    state.selectedPlayerId = null;
    state.editingPlayerId = null;
    state.remoteUsers = [];
    state.remoteProfiles = [];
    state.accountMessage = "";
    state.gameDraft = createEmptyGameDraft();
    stopLiveTimer();

    if (!preserveAuth) clearAuthSession();
    await seedDefaults();
  }

  async function handleServerResetSubmit(event) {
    event.preventDefault();
    if (!canManageUsers()) return;

    const form = event.currentTarget;
    const confirmation = String(form.elements.confirmation?.value || "").trim();
    const feedback = $("#server-reset-feedback");
    const submitButton = form.querySelector('button[type="submit"]');

    if (confirmation.toUpperCase() !== "ZERAR BAGRESCORE") {
      feedback.textContent = "Digite exatamente ZERAR BAGRESCORE para confirmar.";
      feedback.hidden = false;
      return;
    }

    const confirmed = window.confirm("Esta ação apagará jogadores, peladas, jogos, eventos e todas as contas, exceto o administrador. Deseja continuar?");
    if (!confirmed) return;

    submitButton.disabled = true;
    submitButton.textContent = "Zerando base...";

    try {
      const serverInfo = await callAppsScript("ping");
      if (!isApiVersionAtLeast(serverInfo.version, MIN_SYNC_API_VERSION)) {
        throw new Error(`Apps Script desatualizado (${serverInfo.version || "versão antiga"}). Publique uma nova versão da implantação com o Code.gs ${MIN_SYNC_API_VERSION} antes de zerar a base.`);
      }

      const result = await callAppsScript("resetData", {
        token: state.authToken,
        deviceId: getDeviceId(),
        confirmation,
      });
      await resetLocalData(result.epoch, { preserveAuth: false });
      await updateSyncStatus("Base zerada. Entre novamente como administrador.");
      await switchSection("inicio", { historyMode: "replace" });
      openAuthGate("Base zerada com sucesso. Entre novamente.");
    } catch (error) {
      feedback.textContent = /Ação de API inválida/i.test(error.message)
        ? "O Apps Script publicado ainda é antigo. Em Implantar > Gerenciar implantações, edite o Aplicativo da Web, selecione Nova versão e implante novamente."
        : error.message;
      feedback.hidden = false;
      submitButton.disabled = false;
      submitButton.textContent = "Zerar todos os dados";
    }
  }

  function getStoreRecordKey(storeName, record) {
    const schema = STORE_SCHEMAS.find((item) => item.name === storeName);
    return String(record?.[schema?.keyPath || "id"] || "");
  }

  function shouldApplyRemoteChange(storeName, localRecord, change, protectedEntities) {
    const entityKey = `${storeName}:${change.entityId}`;

    if (protectedEntities.has(entityKey)) {
      return false;
    }

    if (!localRecord) {
      return true;
    }

    const localServerRevision = Number(localRecord.serverRevision || 0);
    const remoteServerRevision = Number(change.serverRevision || 0);

    if (localServerRevision && remoteServerRevision && remoteServerRevision <= localServerRevision) {
      return false;
    }

    if (!["jogos", "peladas"].includes(storeName) || change.deleted) {
      return true;
    }

    const remotePayload = change.payload || {};
    const terminalStatus = storeName === "peladas" ? "finalizada" : "finalizado";
    const localIsFinal = normalizeToken(localRecord.status) === terminalStatus;
    const remoteIsFinal = normalizeToken(remotePayload.status) === terminalStatus;

    // Estados finalizados são terminais: respostas antigas nunca reabrem jogo ou pelada.
    if (localIsFinal && !remoteIsFinal) {
      return false;
    }

    if (remoteIsFinal && !localIsFinal) {
      return true;
    }

    const localUpdatedAt = Date.parse(localRecord.updatedAt || "");
    const remoteUpdatedAt = Date.parse(remotePayload.updatedAt || "");

    if (localUpdatedAt && remoteUpdatedAt && remoteUpdatedAt < localUpdatedAt) {
      return false;
    }

    return true;
  }

  async function applySyncResponse(response, batch, config) {
    const acknowledgements = new Map((response.acks || []).map((ack) => [String(ack.id || ""), ack]));
    const blockedEntities = new Set();
    const queueUpdates = batch.map((item) => {
      const acknowledgement = acknowledgements.get(String(item.id));
      if (!acknowledgement) return item;

      if (acknowledgement.status !== "ok") {
        blockedEntities.add(`${item.storeName}:${item.entityId}`);
      }

      const attempts = Number(item.attempts || 0) + 1;
      return {
        ...item,
        status: acknowledgement.status === "ok" ? "sincronizado" : "erro",
        attempts,
        lastAttemptAt: nowIso(),
        nextAttemptAt: acknowledgement.status === "ok"
          ? ""
          : new Date(Date.now() + Math.min(300000, attempts * 60000)).toISOString(),
        serverRevision: Number(acknowledgement.serverRevision || item.serverRevision || 0),
        syncError: acknowledgement.error || "",
        updatedAt: nowIso(),
      };
    });

    if (queueUpdates.length) {
      await putRecords({ syncQueue: queueUpdates });
    }

    const currentQueue = await getAllRecords("syncQueue");
    const protectedEntities = new Set(
      currentQueue
        .filter((item) => item.status === "pendente")
        .map((item) => `${item.storeName}:${item.entityId}`)
    );

    const changesByStore = new Map();
    (response.changes || []).forEach((change) => {
      if (!REMOTE_SYNC_STORES.has(change.storeName)) return;
      if (blockedEntities.has(`${change.storeName}:${change.entityId}`)) return;
      if (!changesByStore.has(change.storeName)) changesByStore.set(change.storeName, []);
      changesByStore.get(change.storeName).push(change);
    });

    let appliedChanges = 0;

    for (const [storeName, changes] of changesByStore.entries()) {
      const currentRecords = await getAllRecords(storeName);
      const currentById = new Map(
        currentRecords.map((record) => [getStoreRecordKey(storeName, record), record])
      );
      const acceptedChanges = changes.filter((change) =>
        shouldApplyRemoteChange(
          storeName,
          currentById.get(String(change.entityId || "")) || null,
          change,
          protectedEntities
        )
      );

      if (!acceptedChanges.length) {
        continue;
      }

      const transaction = state.db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);

      acceptedChanges.forEach((change) => {
        if (change.deleted) {
          store.delete(change.entityId);
          appliedChanges += 1;
          return;
        }

        store.put({
          ...(change.payload || {}),
          serverCreatedAt: change.serverCreatedAt || change.payload?.serverCreatedAt || "",
          serverUpdatedAt: change.serverUpdatedAt || change.payload?.serverUpdatedAt || "",
          serverRevision: Number(change.serverRevision || 0),
          revision: Number(change.entityRevision || change.payload?.revision || 0),
        });
        appliedChanges += 1;
      });

      await transactionDone(transaction);
    }

    await putRecord("configs", {
      ...config,
      serverEpoch: String(response.epoch || config?.serverEpoch || ""),
      lastServerRevision: Number(response.cursor || config?.lastServerRevision || 0),
      lastSyncAt: response.serverTime || nowIso(),
      updatedAt: nowIso(),
    });

    if (appliedChanges) {
      invalidateStatsCache([...changesByStore.keys()]);
    }
    if (response.user) persistAuthSession(state.authToken, response.user);
    return appliedChanges;
  }

  async function syncNow() {
    if (!state.db || state.syncInProgress) return;

    if (pendingGoalGameIds.size || finalizingGameIds.size) {
      window.setTimeout(syncNow, 180);
      return;
    }

    state.syncInProgress = true;

    try {
      const config = await getRecord("configs", "app");
      state.backendUrl = String(config?.appsScriptUrl || "").trim();
      const pending = await getAllRecords("syncQueue");
      const now = Date.now();
      const activePending = pending
        .filter((item) => item.status === "pendente")
        .filter((item) => !item.nextAttemptAt || new Date(item.nextAttemptAt).getTime() <= now)
        .sort((a, b) =>
          Number(a.clientSequence || 0) - Number(b.clientSequence || 0) ||
          String(a.createdAt || "").localeCompare(String(b.createdAt || "")) ||
          String(a.id || "").localeCompare(String(b.id || ""))
        )
        .slice(0, SYNC_BATCH_SIZE);

      updateAccountUi();

      if (!navigator.onLine) {
        await updateSyncStatus(`${activePending.length} pendente(s), aguardando internet`);
        return;
      }

      if (!state.backendUrl) {
        await updateSyncStatus(`${activePending.length} pendente(s), modo local`);
        return;
      }

      if (!state.authToken) {
        await updateSyncStatus(`${activePending.length} pendente(s), login necessário`);
        openAuthGate();
        return;
      }

      await updateSyncStatus("Sincronizando...");
      const response = await callAppsScript("sync", {
        token: state.authToken,
        deviceId: getDeviceId(),
        epoch: String(config?.serverEpoch || ""),
        sinceRevision: Number(config?.lastServerRevision || 0),
        operations: activePending,
      });

      if (response.resetRequired) {
        await resetLocalData(response.epoch, { preserveAuth: true });
        await updateSyncStatus("Base remota renovada · dados locais de teste removidos");
        await renderCurrentSection();
        window.setTimeout(syncNow, 350);
        return;
      }

      const changedRecords = await applySyncResponse(response, activePending, config);
      const remaining = (await getAllRecords("syncQueue")).filter((item) => item.status !== "sincronizado").length;
      const timeLabel = new Date(response.serverTime || Date.now()).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const backendOutdated = !isApiVersionAtLeast(response.version, MIN_SYNC_API_VERSION);
      await updateSyncStatus(backendOutdated
        ? `Apps Script desatualizado (${response.version || "versão antiga"}) · publique o Code.gs ${MIN_SYNC_API_VERSION}`
        : `${remaining} pendente(s) · sincronizado às ${timeLabel}`);

      if (changedRecords) {
        await renderCurrentSection();
      }

      if (response.hasMore) {
        window.setTimeout(syncNow, 350);
      }
    } catch (error) {
      console.error("Falha de sincronização", error);
      if (/sessão|conta inativa|entre novamente/i.test(error.message)) {
        clearAuthSession();
        openAuthGate(error.message);
      }
      await updateSyncStatus(`Sincronização pendente: ${error.message}`);
    } finally {
      state.syncInProgress = false;
    }
  }

  async function syncLatestMutations() {
    while (state.syncInProgress) {
      await new Promise((resolve) => window.setTimeout(resolve, 50));
    }

    await syncNow();
  }

  async function forceUpdate() {
    const forceUpdateButton = $("#force-update");
    const forceUpdateLabel = $("#force-update-label");
    forceUpdateButton?.classList.add("is-loading");
    if (forceUpdateButton) forceUpdateButton.disabled = true;
    if (forceUpdateLabel) forceUpdateLabel.textContent = "Atualizando...";

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
    $("#drawer-statistics-option")?.addEventListener("click", async () => {
      state.selectedStatsPlayerId = null;
      state.selectedProfileTab = "resumo";
      await switchSection("estatisticas");
      closeSettingsDrawer();
    });
    $("#auth-login-form")?.addEventListener("submit", handleAuthLoginSubmit);
    $("#auth-change-server")?.addEventListener("click", handleAuthChangeServer);
    $("#logout-button")?.addEventListener("click", handleLogout);
    $("#account-button")?.addEventListener("click", async () => {
      if (state.backendUrl && !state.currentUser) {
        closeSettingsDrawer();
        openAuthGate();
        return;
      }
      const accountButton = $("#account-button");
      accountButton?.classList.add("is-loading");
      if (accountButton) accountButton.disabled = true;
      try {
        await switchSection("configuracoes");
        closeSettingsDrawer();
      } finally {
        accountButton?.classList.remove("is-loading");
        if (accountButton) accountButton.disabled = false;
      }
    });

    document.body.addEventListener("click", async (event) => {
      const sectionButton = event.target.closest("[data-home-section], .drawer-button[data-section]");
      const actionButton = event.target.closest("[data-home-action]");

      if (sectionButton) {
        const section = sectionButton.dataset.homeSection || sectionButton.dataset.section;
        const isDrawerSectionButton = sectionButton.matches(".drawer-button[data-section]");
        if (isDrawerSectionButton) {
          sectionButton.classList.add("is-loading");
          sectionButton.disabled = true;
        } else {
          closeSettingsDrawer();
        }
        try {
          await switchSection(section);
          closeSettingsDrawer();
        } finally {
          sectionButton.classList.remove("is-loading");
          sectionButton.disabled = false;
        }
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
        state.peladaDetailView = "confrontos";
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
        state.selectedProfileTab = "resumo";
        await switchSection("estatisticas");
      }
    });

    $("#back-home")?.addEventListener("click", async () => {
      await switchSection("inicio", { historyMode: "replace" });
    });
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
    window.addEventListener("focus", () => syncNow());
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") syncNow();
    });
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
    const [initialKicker, initialTitle] = SECTION_HEADINGS[state.currentSection] || SECTION_HEADINGS.inicio;
    setSectionTitle(initialKicker, initialTitle);
    document.body.dataset.section = state.currentSection;
    setActiveSection(state.currentSection);

    updateNetworkStatus();
    bindEvents();

    try {
      state.db = await openLocalDatabase();
      await seedDefaults();
      restoreAuthState(await getRecord("configs", "app"));
      $("#db-status").textContent = "Banco local pronto";
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
