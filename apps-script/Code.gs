var BAGRESCORE_API_VERSION = "1.0.0";
var BAGRESCORE_DB_PROPERTY = "BAGRESCORE_SPREADSHEET_ID";
var BAGRESCORE_SECRET_PROPERTY = "BAGRESCORE_AUTH_SECRET";
var BAGRESCORE_REVISION_PROPERTY = "BAGRESCORE_GLOBAL_REVISION";
var BAGRESCORE_ADMIN_PIN_PROPERTY = "BAGRESCORE_BOOTSTRAP_ADMIN_PIN";
var BAGRESCORE_SESSION_DAYS = 30;
var BAGRESCORE_MAX_LOGIN_FAILURES = 5;
var BAGRESCORE_LOGIN_LOCK_MINUTES = 10;
var BAGRESCORE_MAX_SYNC_OPERATIONS = 150;
var BAGRESCORE_MAX_PULL_CHANGES = 500;
var BAGRESCORE_PAYLOAD_CHUNK_SIZE = 45000;
var BAGRESCORE_PAYLOAD_CHUNKS = 12;

var BAGRESCORE_SYNC_STORES = [
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
  "estatisticasCache"
];

var BAGRESCORE_ENTITY_HEADERS = [
  "entityId",
  "deleted",
  "entityRevision",
  "serverRevision",
  "serverCreatedAt",
  "serverUpdatedAt",
  "updatedBy",
  "payloadParts"
];

for (var BAGRESCORE_CHUNK_INDEX = 1; BAGRESCORE_CHUNK_INDEX <= BAGRESCORE_PAYLOAD_CHUNKS; BAGRESCORE_CHUNK_INDEX += 1) {
  BAGRESCORE_ENTITY_HEADERS.push("payload" + BAGRESCORE_CHUNK_INDEX);
}

var BAGRESCORE_USER_HEADERS = [
  "id",
  "nome",
  "login",
  "pinHash",
  "salt",
  "perfilId",
  "jogadorId",
  "status",
  "failedAttempts",
  "lockedUntil",
  "revision",
  "serverCreatedAt",
  "serverUpdatedAt"
];

var BAGRESCORE_PROFILE_HEADERS = ["id", "nome", "permissoesJson"];
var BAGRESCORE_SESSION_HEADERS = [
  "tokenHash",
  "usuarioId",
  "deviceId",
  "expiresAt",
  "createdAt",
  "lastSeenAt",
  "revokedAt"
];
var BAGRESCORE_OPERATION_HEADERS = [
  "operationId",
  "deviceId",
  "storeName",
  "entityId",
  "serverRevision",
  "processedAt"
];
var BAGRESCORE_AUDIT_HEADERS = [
  "id",
  "usuarioId",
  "deviceId",
  "acao",
  "storeName",
  "entityId",
  "detalheJson",
  "serverCreatedAt",
  "serverRevision"
];

var BAGRESCORE_DEFAULT_PROFILES = [
  { id: "administrador", nome: "Administrador", permissoes: ["*"] },
  {
    id: "organizador",
    nome: "Organizador",
    permissoes: ["peladas:criar", "times:montar", "jogos:iniciar", "jogos:finalizar", "jogos:alterar"]
  },
  {
    id: "marcador",
    nome: "Marcador",
    permissoes: ["eventos:criar", "gols:registrar", "faltas:registrar"]
  },
  {
    id: "jogador",
    nome: "Jogador",
    permissoes: ["estatisticas:visualizar", "historico:visualizar", "carta:visualizar"]
  },
  { id: "publico", nome: "Público", permissoes: ["publico:visualizar"] }
];

function doGet() {
  return bagreScoreJsonOutput_({
    ok: true,
    service: "BagreScore PAOA API",
    version: BAGRESCORE_API_VERSION,
    serverTime: new Date().toISOString(),
    configured: Boolean(PropertiesService.getScriptProperties().getProperty(BAGRESCORE_DB_PROPERTY))
  });
}

function doPost(e) {
  try {
    var request = bagreScoreParseRequest_(e);
    var action = String(request.action || "").trim();

    if (action === "ping") return bagreScoreHandlePing_();
    if (action === "login") return bagreScoreJsonOutput_(bagreScoreHandleLogin_(request));
    if (action === "me") return bagreScoreJsonOutput_(bagreScoreHandleMe_(request));
    if (action === "logout") return bagreScoreJsonOutput_(bagreScoreHandleLogout_(request));
    if (action === "changePin") return bagreScoreJsonOutput_(bagreScoreHandleChangePin_(request));
    if (action === "listUsers") return bagreScoreJsonOutput_(bagreScoreHandleListUsers_(request));
    if (action === "saveUser") return bagreScoreJsonOutput_(bagreScoreHandleSaveUser_(request));
    if (action === "sync") return bagreScoreJsonOutput_(bagreScoreHandleSync_(request));

    throw new Error("Ação de API inválida.");
  } catch (error) {
    return bagreScoreJsonOutput_({
      ok: false,
      error: error && error.message ? error.message : "Falha inesperada no servidor.",
      serverTime: new Date().toISOString()
    });
  }
}

function setupBagreScore() {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    var properties = PropertiesService.getScriptProperties();
    var spreadsheetId = properties.getProperty(BAGRESCORE_DB_PROPERTY);
    var spreadsheet = spreadsheetId
      ? SpreadsheetApp.openById(spreadsheetId)
      : SpreadsheetApp.create("BagreScore - Base PAOA");

    properties.setProperty(BAGRESCORE_DB_PROPERTY, spreadsheet.getId());
    if (!properties.getProperty(BAGRESCORE_SECRET_PROPERTY)) {
      properties.setProperty(BAGRESCORE_SECRET_PROPERTY, bagreScoreRandomToken_());
    }
    if (!properties.getProperty(BAGRESCORE_REVISION_PROPERTY)) {
      properties.setProperty(BAGRESCORE_REVISION_PROPERTY, "0");
    }

    bagreScoreEnsureSheet_(spreadsheet, "usuarios", BAGRESCORE_USER_HEADERS);
    bagreScoreEnsureSheet_(spreadsheet, "perfis", BAGRESCORE_PROFILE_HEADERS);
    bagreScoreEnsureSheet_(spreadsheet, "sessoes", BAGRESCORE_SESSION_HEADERS);
    bagreScoreEnsureSheet_(spreadsheet, "operacoes", BAGRESCORE_OPERATION_HEADERS);
    bagreScoreEnsureSheet_(spreadsheet, "auditoria", BAGRESCORE_AUDIT_HEADERS);

    BAGRESCORE_SYNC_STORES.forEach(function (storeName) {
      bagreScoreEnsureSheet_(spreadsheet, storeName, BAGRESCORE_ENTITY_HEADERS);
    });

    bagreScoreSeedProfiles_(spreadsheet);
    var bootstrap = bagreScoreSeedAdmin_(spreadsheet);
    bagreScoreSeedCurrentSeason_(spreadsheet);
    var result = {
      ok: true,
      spreadsheetId: spreadsheet.getId(),
      spreadsheetUrl: spreadsheet.getUrl(),
      adminLogin: "admin",
      temporaryPin: bootstrap.temporaryPin || properties.getProperty(BAGRESCORE_ADMIN_PIN_PROPERTY) || "já definido",
      message: "Base criada. Agora implante este projeto como Aplicativo da Web."
    };

    Logger.log(JSON.stringify(result, null, 2));
    return result;
  } finally {
    lock.releaseLock();
  }
}

function getBagreScoreSetupInfo() {
  var properties = PropertiesService.getScriptProperties();
  var spreadsheetId = properties.getProperty(BAGRESCORE_DB_PROPERTY);
  var result = {
    configured: Boolean(spreadsheetId),
    spreadsheetUrl: spreadsheetId ? SpreadsheetApp.openById(spreadsheetId).getUrl() : "",
    adminLogin: "admin",
    temporaryPin: properties.getProperty(BAGRESCORE_ADMIN_PIN_PROPERTY) || "não disponível"
  };
  Logger.log(JSON.stringify(result, null, 2));
  return result;
}

function resetBagreScoreAdminPin() {
  var spreadsheet = bagreScoreGetSpreadsheet_();
  var sheet = spreadsheet.getSheetByName("usuarios");
  var adminRow = bagreScoreFindRowByValue_(sheet, "login", "admin");
  if (!adminRow) throw new Error("Conta admin não encontrada. Execute setupBagreScore().");

  var temporaryPin = bagreScoreGeneratePin_();
  var salt = bagreScoreRandomToken_().slice(0, 24);
  bagreScoreUpdateRowObject_(sheet, adminRow.rowNumber, {
    pinHash: bagreScoreHashPin_(temporaryPin, salt),
    salt: salt,
    failedAttempts: 0,
    lockedUntil: "",
    status: "ativo",
    revision: Number(adminRow.record.revision || 0) + 1,
    serverUpdatedAt: new Date().toISOString()
  });
  PropertiesService.getScriptProperties().setProperty(BAGRESCORE_ADMIN_PIN_PROPERTY, temporaryPin);
  bagreScoreRevokeUserSessions_(adminRow.record.id, "");
  Logger.log("Novo PIN temporário do admin: " + temporaryPin);
  return temporaryPin;
}

function bagreScoreHandlePing_() {
  bagreScoreGetSpreadsheet_();
  return bagreScoreJsonOutput_({
    ok: true,
    service: "BagreScore PAOA API",
    version: BAGRESCORE_API_VERSION,
    serverTime: new Date().toISOString(),
    serverRevision: bagreScoreCurrentGlobalRevision_()
  });
}

function bagreScoreHandleLogin_(request) {
  var spreadsheet = bagreScoreGetSpreadsheet_();
  var sheet = spreadsheet.getSheetByName("usuarios");
  var login = String(request.login || "").trim().toLowerCase();
  var pin = String(request.pin || "").trim();

  if (!login || !pin) throw new Error("Informe usuário e PIN.");

  var found = bagreScoreFindRowByValue_(sheet, "login", login);
  if (!found || String(found.record.status || "").toLowerCase() !== "ativo") {
    throw new Error("Usuário ou PIN inválido.");
  }

  var now = new Date();
  var lockedUntil = found.record.lockedUntil ? new Date(found.record.lockedUntil) : null;
  if (lockedUntil && lockedUntil.getTime() > now.getTime()) {
    throw new Error("Conta temporariamente bloqueada. Tente novamente em alguns minutos.");
  }

  var validPin = bagreScoreSafeEqual_(
    String(found.record.pinHash || ""),
    bagreScoreHashPin_(pin, String(found.record.salt || ""))
  );

  if (!validPin) {
    var failures = Number(found.record.failedAttempts || 0) + 1;
    var nextLockedUntil = failures >= BAGRESCORE_MAX_LOGIN_FAILURES
      ? new Date(now.getTime() + BAGRESCORE_LOGIN_LOCK_MINUTES * 60000).toISOString()
      : "";
    bagreScoreUpdateRowObject_(sheet, found.rowNumber, {
      failedAttempts: failures >= BAGRESCORE_MAX_LOGIN_FAILURES ? 0 : failures,
      lockedUntil: nextLockedUntil,
      serverUpdatedAt: now.toISOString()
    });
    throw new Error("Usuário ou PIN inválido.");
  }

  bagreScoreUpdateRowObject_(sheet, found.rowNumber, {
    failedAttempts: 0,
    lockedUntil: "",
    serverUpdatedAt: now.toISOString()
  });

  var rawToken = bagreScoreRandomToken_();
  var tokenHash = bagreScoreHashValue_(rawToken);
  var expiresAt = new Date(now.getTime() + BAGRESCORE_SESSION_DAYS * 86400000).toISOString();
  var sessions = spreadsheet.getSheetByName("sessoes");
  bagreScoreAppendObject_(sessions, {
    tokenHash: tokenHash,
    usuarioId: found.record.id,
    deviceId: String(request.deviceId || ""),
    expiresAt: expiresAt,
    createdAt: now.toISOString(),
    lastSeenAt: now.toISOString(),
    revokedAt: ""
  });

  var user = bagreScorePublicUser_(spreadsheet, found.record);
  bagreScoreAppendAudit_(spreadsheet, user.id, String(request.deviceId || ""), "login", "usuarios", user.id, {}, 0);

  return {
    ok: true,
    token: rawToken,
    expiresAt: expiresAt,
    user: user,
    serverTime: now.toISOString(),
    serverRevision: bagreScoreCurrentGlobalRevision_()
  };
}

function bagreScoreHandleMe_(request) {
  var auth = bagreScoreRequireSession_(request.token, "");
  return {
    ok: true,
    user: auth.user,
    expiresAt: auth.session.expiresAt,
    serverTime: new Date().toISOString(),
    serverRevision: bagreScoreCurrentGlobalRevision_()
  };
}

function bagreScoreHandleLogout_(request) {
  var auth = bagreScoreRequireSession_(request.token, "");
  bagreScoreUpdateRowObject_(auth.sessionSheet, auth.sessionRow, {
    revokedAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString()
  });
  return { ok: true, serverTime: new Date().toISOString() };
}

function bagreScoreHandleChangePin_(request) {
  var auth = bagreScoreRequireSession_(request.token, "");
  var currentPin = String(request.currentPin || "").trim();
  var newPin = String(request.newPin || "").trim();
  bagreScoreValidatePin_(newPin);

  if (!bagreScoreSafeEqual_(auth.userRecord.pinHash, bagreScoreHashPin_(currentPin, auth.userRecord.salt))) {
    throw new Error("PIN atual incorreto.");
  }

  var salt = bagreScoreRandomToken_().slice(0, 24);
  bagreScoreUpdateRowObject_(auth.userSheet, auth.userRow, {
    pinHash: bagreScoreHashPin_(newPin, salt),
    salt: salt,
    revision: Number(auth.userRecord.revision || 0) + 1,
    serverUpdatedAt: new Date().toISOString()
  });
  PropertiesService.getScriptProperties().deleteProperty(BAGRESCORE_ADMIN_PIN_PROPERTY);
  bagreScoreRevokeUserSessions_(auth.user.id, auth.session.tokenHash);
  return { ok: true, message: "PIN alterado.", serverTime: new Date().toISOString() };
}

function bagreScoreHandleListUsers_(request) {
  var auth = bagreScoreRequireSession_(request.token, "usuarios:gerenciar");
  var rows = bagreScoreReadObjects_(auth.spreadsheet.getSheetByName("usuarios"));
  return {
    ok: true,
    users: rows.map(function (item) { return bagreScorePublicUser_(auth.spreadsheet, item.record); }),
    profiles: BAGRESCORE_DEFAULT_PROFILES,
    serverTime: new Date().toISOString()
  };
}

function bagreScoreHandleSaveUser_(request) {
  var auth = bagreScoreRequireSession_(request.token, "usuarios:gerenciar");
  var input = request.user || {};
  var userSheet = auth.spreadsheet.getSheetByName("usuarios");
  var userId = String(input.id || "").trim() || Utilities.getUuid();
  var name = String(input.nome || "").trim();
  var login = String(input.login || "").trim().toLowerCase();
  var profileId = String(input.perfilId || "jogador").trim();
  var status = String(input.status || "ativo").trim().toLowerCase();
  var foundById = bagreScoreFindRowByValue_(userSheet, "id", userId);
  var foundByLogin = bagreScoreFindRowByValue_(userSheet, "login", login);

  if (!name || !login) throw new Error("Nome e login são obrigatórios.");
  if (!/^[a-z0-9._-]{3,40}$/.test(login)) throw new Error("Login deve ter de 3 a 40 caracteres simples.");
  if (foundByLogin && (!foundById || foundByLogin.record.id !== foundById.record.id)) {
    throw new Error("Este login já está em uso.");
  }
  if (!bagreScoreGetProfile_(auth.spreadsheet, profileId)) throw new Error("Perfil inválido.");
  if (["ativo", "inativo"].indexOf(status) < 0) throw new Error("Status inválido.");
  if (userId === auth.user.id && (status !== "ativo" || profileId !== "administrador")) {
    throw new Error("A conta administrativa em uso não pode remover o próprio acesso.");
  }

  var now = new Date().toISOString();
  var temporaryPin = "";
  var record = foundById ? foundById.record : {};
  var requestedPin = String(input.pin || "").trim();

  if (!foundById || requestedPin) {
    temporaryPin = requestedPin || bagreScoreGeneratePin_();
    bagreScoreValidatePin_(temporaryPin);
    record.salt = bagreScoreRandomToken_().slice(0, 24);
    record.pinHash = bagreScoreHashPin_(temporaryPin, record.salt);
  }

  var nextRecord = {
    id: userId,
    nome: name,
    login: login,
    pinHash: record.pinHash,
    salt: record.salt,
    perfilId: profileId,
    jogadorId: String(input.jogadorId || ""),
    status: status,
    failedAttempts: 0,
    lockedUntil: "",
    revision: Number(record.revision || 0) + 1,
    serverCreatedAt: record.serverCreatedAt || now,
    serverUpdatedAt: now
  };

  if (foundById) {
    bagreScoreReplaceRowObject_(userSheet, foundById.rowNumber, nextRecord);
  } else {
    bagreScoreAppendObject_(userSheet, nextRecord);
  }

  if (status !== "ativo" || requestedPin) bagreScoreRevokeUserSessions_(userId, "");
  bagreScoreAppendAudit_(auth.spreadsheet, auth.user.id, String(request.deviceId || ""), foundById ? "editar-usuario" : "criar-usuario", "usuarios", userId, { perfilId: profileId, status: status }, 0);

  return {
    ok: true,
    user: bagreScorePublicUser_(auth.spreadsheet, nextRecord),
    temporaryPin: temporaryPin,
    serverTime: now
  };
}

function bagreScoreHandleSync_(request) {
  var auth = bagreScoreRequireSession_(request.token, "");
  var operations = Array.isArray(request.operations) ? request.operations.slice(0, BAGRESCORE_MAX_SYNC_OPERATIONS) : [];
  var sinceRevision = Math.max(0, Number(request.sinceRevision || 0));
  var deviceId = String(request.deviceId || auth.session.deviceId || "");
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    var spreadsheet = auth.spreadsheet;
    var operationSheet = spreadsheet.getSheetByName("operacoes");
    var existingOperations = bagreScoreReadObjects_(operationSheet);
    var operationMap = {};
    existingOperations.forEach(function (item) {
      operationMap[String(item.record.operationId)] = item.record;
    });

    var acknowledgements = [];
    var affectedGames = {};

    operations.forEach(function (operation) {
      var operationId = String(operation.id || "").trim();
      var storeName = String(operation.storeName || "").trim();
      var entityId = String(operation.entityId || "").trim();
      var operationType = String(operation.operation || "upsert").trim().toLowerCase();

      if (!operationId || !entityId || BAGRESCORE_SYNC_STORES.indexOf(storeName) < 0) {
        acknowledgements.push({ id: operationId, status: "error", error: "Operação de sincronização inválida." });
        return;
      }

      if (operationMap[operationId]) {
        acknowledgements.push({
          id: operationId,
          status: "ok",
          serverRevision: Number(operationMap[operationId].serverRevision || 0),
          duplicate: true
        });
        return;
      }

      if (!bagreScoreCanSyncStore_(auth.user.permissoes, storeName, operationType)) {
        acknowledgements.push({ id: operationId, status: "error", error: "Seu perfil não permite esta alteração." });
        return;
      }

      try {
        var payload = operation.payload && typeof operation.payload === "object" ? operation.payload : {};
        var result = bagreScoreWriteEntity_(spreadsheet, storeName, entityId, operationType, payload, auth.user.id, deviceId);
        bagreScoreAppendObject_(operationSheet, {
          operationId: operationId,
          deviceId: deviceId,
          storeName: storeName,
          entityId: entityId,
          serverRevision: result.serverRevision,
          processedAt: result.serverUpdatedAt
        });
        operationMap[operationId] = { serverRevision: result.serverRevision };
        acknowledgements.push({ id: operationId, status: "ok", serverRevision: result.serverRevision });

        if (storeName === "eventos" && payload.jogoId) {
          affectedGames[String(payload.jogoId)] = true;
        }
      } catch (operationError) {
        acknowledgements.push({
          id: operationId,
          status: "error",
          error: operationError && operationError.message ? operationError.message : "Falha ao salvar alteração."
        });
      }
    });

    Object.keys(affectedGames).forEach(function (gameId) {
      bagreScoreRecalculateGameScore_(spreadsheet, gameId);
    });

    var pull = bagreScoreListChanges_(spreadsheet, sinceRevision, BAGRESCORE_MAX_PULL_CHANGES);
    return {
      ok: true,
      acks: acknowledgements,
      changes: pull.changes,
      cursor: pull.cursor,
      hasMore: pull.hasMore,
      user: auth.user,
      serverTime: new Date().toISOString(),
      serverRevision: bagreScoreCurrentGlobalRevision_()
    };
  } finally {
    lock.releaseLock();
  }
}

function bagreScoreWriteEntity_(spreadsheet, storeName, entityId, operationType, payload, userId, deviceId) {
  var sheet = spreadsheet.getSheetByName(storeName);
  if (!sheet) throw new Error("Coleção remota não encontrada: " + storeName);

  var found = bagreScoreFindRowByValue_(sheet, "entityId", entityId);
  var now = new Date().toISOString();
  var globalRevision = bagreScoreNextGlobalRevision_();
  var entityRevision = Number(found && found.record.entityRevision || 0) + 1;
  var deleted = operationType === "delete";
  var storedPayload = JSON.parse(JSON.stringify(payload || {}));

  storedPayload.serverCreatedAt = found && found.record.serverCreatedAt || now;
  storedPayload.serverUpdatedAt = now;
  storedPayload.serverRevision = globalRevision;
  storedPayload.revision = entityRevision;
  if (storedPayload.id === undefined && storeName !== "atributos") storedPayload.id = entityId;
  if (storeName === "atributos" && storedPayload.jogadorId === undefined) storedPayload.jogadorId = entityId;

  var chunks = bagreScoreChunkPayload_(JSON.stringify(storedPayload));
  var record = {
    entityId: entityId,
    deleted: deleted,
    entityRevision: entityRevision,
    serverRevision: globalRevision,
    serverCreatedAt: storedPayload.serverCreatedAt,
    serverUpdatedAt: now,
    updatedBy: userId,
    payloadParts: chunks.length
  };

  for (var index = 1; index <= BAGRESCORE_PAYLOAD_CHUNKS; index += 1) {
    record["payload" + index] = chunks[index - 1] || "";
  }

  if (found) {
    bagreScoreReplaceRowObject_(sheet, found.rowNumber, record);
  } else {
    bagreScoreAppendObject_(sheet, record);
  }

  bagreScoreAppendAudit_(spreadsheet, userId, deviceId, deleted ? "delete" : "upsert", storeName, entityId, { entityRevision: entityRevision }, globalRevision);
  return record;
}

function bagreScoreListChanges_(spreadsheet, sinceRevision, limit) {
  var changes = [];

  BAGRESCORE_SYNC_STORES.forEach(function (storeName) {
    var sheet = spreadsheet.getSheetByName(storeName);
    bagreScoreReadObjects_(sheet).forEach(function (item) {
      var record = item.record;
      var serverRevision = Number(record.serverRevision || 0);
      if (serverRevision <= sinceRevision) return;

      var payload = bagreScoreParseEntityPayload_(record);
      changes.push({
        storeName: storeName,
        entityId: String(record.entityId),
        deleted: bagreScoreBoolean_(record.deleted),
        entityRevision: Number(record.entityRevision || 0),
        serverRevision: serverRevision,
        serverCreatedAt: String(record.serverCreatedAt || ""),
        serverUpdatedAt: String(record.serverUpdatedAt || ""),
        payload: payload
      });
    });
  });

  changes.sort(function (a, b) { return a.serverRevision - b.serverRevision; });
  var hasMore = changes.length > limit;
  var selected = changes.slice(0, limit);
  var cursor = selected.length
    ? selected[selected.length - 1].serverRevision
    : bagreScoreCurrentGlobalRevision_();

  return { changes: selected, cursor: cursor, hasMore: hasMore };
}

function bagreScoreRecalculateGameScore_(spreadsheet, gameId) {
  var gameSheet = spreadsheet.getSheetByName("jogos");
  var gameFound = bagreScoreFindRowByValue_(gameSheet, "entityId", gameId);
  if (!gameFound || bagreScoreBoolean_(gameFound.record.deleted)) return;

  var scoreA = 0;
  var scoreB = 0;
  bagreScoreReadObjects_(spreadsheet.getSheetByName("eventos")).forEach(function (item) {
    if (bagreScoreBoolean_(item.record.deleted)) return;
    var eventPayload = bagreScoreParseEntityPayload_(item.record);
    if (String(eventPayload.jogoId || "") !== String(gameId)) return;
    if (eventPayload.cancelado) return;
    var type = bagreScoreNormalizeToken_(eventPayload.tipo);
    if (["gol", "gol_provisorio"].indexOf(type) < 0) return;
    if (String(eventPayload.time || "") === "A") scoreA += 1;
    if (String(eventPayload.time || "") === "B") scoreB += 1;
  });

  var gamePayload = bagreScoreParseEntityPayload_(gameFound.record);
  if (Number(gamePayload.placarA || 0) === scoreA && Number(gamePayload.placarB || 0) === scoreB) return;
  gamePayload.placarA = scoreA;
  gamePayload.placarB = scoreB;
  bagreScoreWriteEntity_(spreadsheet, "jogos", gameId, "upsert", gamePayload, "server", "server");
}

function bagreScoreCanSyncStore_(permissions, storeName, operationType) {
  if (permissions.indexOf("*") >= 0) return true;
  var requirements = {
    jogadores: ["jogadores:criar", "jogadores:editar"],
    atributos: ["atributos:editar"],
    peladas: ["peladas:criar", "jogos:finalizar"],
    jogos: ["jogos:alterar", "jogos:iniciar", "jogos:finalizar", "eventos:criar"],
    times: ["times:montar"],
    escalacoes: ["times:montar"],
    eventos: operationType === "delete" ? ["eventos:excluir"] : ["eventos:criar", "gols:registrar", "faltas:registrar"],
    faltas: ["faltas:registrar"],
    evolucoes: ["atributos:editar", "eventos:criar", "gols:registrar", "faltas:registrar"],
    temporadas: ["configs:editar"],
    estatisticasCache: ["jogos:finalizar", "eventos:criar"]
  };
  return (requirements[storeName] || []).some(function (permission) {
    return permissions.indexOf(permission) >= 0;
  });
}

function bagreScoreRequireSession_(rawToken, requiredPermission) {
  var spreadsheet = bagreScoreGetSpreadsheet_();
  var tokenHash = bagreScoreHashValue_(String(rawToken || ""));
  var sessionSheet = spreadsheet.getSheetByName("sessoes");
  var sessionFound = bagreScoreFindRowByValue_(sessionSheet, "tokenHash", tokenHash);
  if (!sessionFound || sessionFound.record.revokedAt) throw new Error("Sessão inválida. Entre novamente.");
  if (new Date(sessionFound.record.expiresAt).getTime() <= Date.now()) throw new Error("Sessão expirada. Entre novamente.");

  var userSheet = spreadsheet.getSheetByName("usuarios");
  var userFound = bagreScoreFindRowByValue_(userSheet, "id", String(sessionFound.record.usuarioId));
  if (!userFound || String(userFound.record.status || "").toLowerCase() !== "ativo") {
    throw new Error("Conta inativa ou não encontrada.");
  }

  var user = bagreScorePublicUser_(spreadsheet, userFound.record);
  if (requiredPermission && user.permissoes.indexOf("*") < 0 && user.permissoes.indexOf(requiredPermission) < 0) {
    throw new Error("Seu perfil não permite esta ação.");
  }

  bagreScoreUpdateRowObject_(sessionSheet, sessionFound.rowNumber, { lastSeenAt: new Date().toISOString() });
  return {
    spreadsheet: spreadsheet,
    user: user,
    userRecord: userFound.record,
    userSheet: userSheet,
    userRow: userFound.rowNumber,
    session: sessionFound.record,
    sessionSheet: sessionSheet,
    sessionRow: sessionFound.rowNumber
  };
}

function bagreScorePublicUser_(spreadsheet, record) {
  var profile = bagreScoreGetProfile_(spreadsheet, String(record.perfilId || "publico"));
  return {
    id: String(record.id || ""),
    nome: String(record.nome || "Usuário"),
    login: String(record.login || ""),
    perfilId: String(record.perfilId || "publico"),
    perfilNome: profile ? profile.nome : "Público",
    permissoes: profile ? profile.permissoes : [],
    jogadorId: String(record.jogadorId || ""),
    status: String(record.status || "inativo")
  };
}

function bagreScoreGetProfile_(spreadsheet, profileId) {
  var found = bagreScoreFindRowByValue_(spreadsheet.getSheetByName("perfis"), "id", profileId);
  if (!found) return null;
  var permissions = [];
  try { permissions = JSON.parse(found.record.permissoesJson || "[]"); } catch (error) { permissions = []; }
  return { id: found.record.id, nome: found.record.nome, permissoes: permissions };
}

function bagreScoreSeedProfiles_(spreadsheet) {
  var sheet = spreadsheet.getSheetByName("perfis");
  BAGRESCORE_DEFAULT_PROFILES.forEach(function (profile) {
    var record = { id: profile.id, nome: profile.nome, permissoesJson: JSON.stringify(profile.permissoes) };
    var found = bagreScoreFindRowByValue_(sheet, "id", profile.id);
    if (found) bagreScoreReplaceRowObject_(sheet, found.rowNumber, record);
    else bagreScoreAppendObject_(sheet, record);
  });
}

function bagreScoreSeedAdmin_(spreadsheet) {
  var sheet = spreadsheet.getSheetByName("usuarios");
  var found = bagreScoreFindRowByValue_(sheet, "login", "admin");
  if (found) return { created: false, temporaryPin: "" };

  var now = new Date().toISOString();
  var temporaryPin = bagreScoreGeneratePin_();
  var salt = bagreScoreRandomToken_().slice(0, 24);
  bagreScoreAppendObject_(sheet, {
    id: Utilities.getUuid(),
    nome: "Administrador",
    login: "admin",
    pinHash: bagreScoreHashPin_(temporaryPin, salt),
    salt: salt,
    perfilId: "administrador",
    jogadorId: "",
    status: "ativo",
    failedAttempts: 0,
    lockedUntil: "",
    revision: 1,
    serverCreatedAt: now,
    serverUpdatedAt: now
  });
  PropertiesService.getScriptProperties().setProperty(BAGRESCORE_ADMIN_PIN_PROPERTY, temporaryPin);
  return { created: true, temporaryPin: temporaryPin };
}

function bagreScoreSeedCurrentSeason_(spreadsheet) {
  var sheet = spreadsheet.getSheetByName("temporadas");
  if (bagreScoreFindRowByValue_(sheet, "entityId", "temporada-atual")) return;
  var now = new Date().toISOString();
  bagreScoreWriteEntity_(spreadsheet, "temporadas", "temporada-atual", "upsert", {
    id: "temporada-atual",
    nome: "Temporada atual",
    tipo: "aberta",
    inicio: now.slice(0, 10),
    fim: "",
    status: "ativa",
    createdAt: now,
    updatedAt: now,
    revision: 1
  }, "server", "server");
}

function bagreScoreRevokeUserSessions_(userId, exceptTokenHash) {
  var sheet = bagreScoreGetSpreadsheet_().getSheetByName("sessoes");
  bagreScoreReadObjects_(sheet).forEach(function (item) {
    if (String(item.record.usuarioId) !== String(userId)) return;
    if (exceptTokenHash && String(item.record.tokenHash) === String(exceptTokenHash)) return;
    if (!item.record.revokedAt) bagreScoreUpdateRowObject_(sheet, item.rowNumber, { revokedAt: new Date().toISOString() });
  });
}

function bagreScoreAppendAudit_(spreadsheet, userId, deviceId, action, storeName, entityId, detail, serverRevision) {
  bagreScoreAppendObject_(spreadsheet.getSheetByName("auditoria"), {
    id: Utilities.getUuid(),
    usuarioId: userId,
    deviceId: deviceId,
    acao: action,
    storeName: storeName,
    entityId: entityId,
    detalheJson: JSON.stringify(detail || {}),
    serverCreatedAt: new Date().toISOString(),
    serverRevision: Number(serverRevision || 0)
  });
}

function bagreScoreChunkPayload_(json) {
  var chunks = [];
  for (var offset = 0; offset < json.length; offset += BAGRESCORE_PAYLOAD_CHUNK_SIZE) {
    chunks.push(json.slice(offset, offset + BAGRESCORE_PAYLOAD_CHUNK_SIZE));
  }
  if (chunks.length > BAGRESCORE_PAYLOAD_CHUNKS) {
    throw new Error("Registro muito grande para sincronizar. Reduza o tamanho da foto do jogador.");
  }
  return chunks.length ? chunks : ["{}"];
}

function bagreScoreParseEntityPayload_(record) {
  var count = Math.max(0, Number(record.payloadParts || 0));
  var json = "";
  for (var index = 1; index <= count; index += 1) json += String(record["payload" + index] || "");
  if (!json) return {};
  try { return JSON.parse(json); } catch (error) { throw new Error("Registro remoto corrompido: " + record.entityId); }
}

function bagreScoreGetSpreadsheet_() {
  var spreadsheetId = PropertiesService.getScriptProperties().getProperty(BAGRESCORE_DB_PROPERTY);
  if (!spreadsheetId) throw new Error("Servidor não configurado. Execute setupBagreScore() no Apps Script.");
  return SpreadsheetApp.openById(spreadsheetId);
}

function bagreScoreEnsureSheet_(spreadsheet, name, headers) {
  var sheet = spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
  if (sheet.getMaxColumns() < headers.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), headers.length - sheet.getMaxColumns());
  }
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);
  return sheet;
}

function bagreScoreReadObjects_(sheet) {
  if (!sheet || sheet.getLastRow() < 2) return [];
  var lastColumn = sheet.getLastColumn();
  var headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, lastColumn).getValues();
  return values.map(function (row, index) {
    var record = {};
    headers.forEach(function (header, column) { record[String(header)] = row[column]; });
    return { record: record, rowNumber: index + 2 };
  });
}

function bagreScoreFindRowByValue_(sheet, field, value) {
  var expected = String(value || "");
  var rows = bagreScoreReadObjects_(sheet);
  for (var index = 0; index < rows.length; index += 1) {
    if (String(rows[index].record[field] || "") === expected) return rows[index];
  }
  return null;
}

function bagreScoreAppendObject_(sheet, record) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  sheet.appendRow(headers.map(function (header) { return record[String(header)] === undefined ? "" : record[String(header)]; }));
}

function bagreScoreReplaceRowObject_(sheet, rowNumber, record) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var values = headers.map(function (header) { return record[String(header)] === undefined ? "" : record[String(header)]; });
  sheet.getRange(rowNumber, 1, 1, values.length).setValues([values]);
}

function bagreScoreUpdateRowObject_(sheet, rowNumber, changes) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var values = sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0];
  headers.forEach(function (header, index) {
    if (Object.prototype.hasOwnProperty.call(changes, String(header))) values[index] = changes[String(header)];
  });
  sheet.getRange(rowNumber, 1, 1, values.length).setValues([values]);
}

function bagreScoreCurrentGlobalRevision_() {
  return Number(PropertiesService.getScriptProperties().getProperty(BAGRESCORE_REVISION_PROPERTY) || 0);
}

function bagreScoreNextGlobalRevision_() {
  var next = bagreScoreCurrentGlobalRevision_() + 1;
  PropertiesService.getScriptProperties().setProperty(BAGRESCORE_REVISION_PROPERTY, String(next));
  return next;
}

function bagreScoreHashPin_(pin, salt) {
  var secret = PropertiesService.getScriptProperties().getProperty(BAGRESCORE_SECRET_PROPERTY) || "";
  return bagreScoreHashValue_(String(salt || "") + ":" + String(pin || "") + ":" + secret);
}

function bagreScoreHashValue_(value) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(value || ""), Utilities.Charset.UTF_8);
  return bytes.map(function (byte) {
    var normalized = byte < 0 ? byte + 256 : byte;
    return ("0" + normalized.toString(16)).slice(-2);
  }).join("");
}

function bagreScoreSafeEqual_(left, right) {
  left = String(left || "");
  right = String(right || "");
  if (left.length !== right.length) return false;
  var difference = 0;
  for (var index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

function bagreScoreRandomToken_() {
  return Utilities.getUuid().replace(/-/g, "") + Utilities.getUuid().replace(/-/g, "") + String(new Date().getTime());
}

function bagreScoreGeneratePin_() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function bagreScoreValidatePin_(pin) {
  if (!/^\d{4,12}$/.test(String(pin || ""))) throw new Error("O PIN deve conter de 4 a 12 números.");
}

function bagreScoreNormalizeToken_(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function bagreScoreBoolean_(value) {
  return value === true || String(value).toLowerCase() === "true";
}

function bagreScoreParseRequest_(e) {
  var contents = e && e.postData && e.postData.contents ? e.postData.contents : "{}";
  try { return JSON.parse(contents); } catch (error) { throw new Error("Corpo da requisição inválido."); }
}

function bagreScoreJsonOutput_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
