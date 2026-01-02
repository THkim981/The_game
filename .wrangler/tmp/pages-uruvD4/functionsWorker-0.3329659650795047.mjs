var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// _lib/http.ts
function json(data, init) {
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(data), { ...init, headers });
}
__name(json, "json");
function isPreflight(request) {
  return request.method.toUpperCase() === "OPTIONS";
}
__name(isPreflight, "isPreflight");

// _lib/d1.ts
async function d1First(db, sql, binds = []) {
  const res = await db.prepare(sql).bind(...binds).first();
  return res ?? null;
}
__name(d1First, "d1First");
async function d1All(db, sql, binds = []) {
  const res = await db.prepare(sql).bind(...binds).all();
  return res.results ?? [];
}
__name(d1All, "d1All");
async function d1Run(db, sql, binds = []) {
  const res = await db.prepare(sql).bind(...binds).run();
  return { success: Boolean(res.success) };
}
__name(d1Run, "d1Run");

// _lib/api.ts
function sanitizeProfileId(input) {
  const raw = String(input ?? "").trim();
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32);
  return cleaned.length > 0 ? cleaned : null;
}
__name(sanitizeProfileId, "sanitizeProfileId");
function sanitizeAnonUserId(input) {
  const raw = String(input ?? "").trim().toLowerCase();
  return /^[a-f0-9]{32}$/.test(raw) ? raw : null;
}
__name(sanitizeAnonUserId, "sanitizeAnonUserId");
function numberOrUndefined(v) {
  return typeof v === "number" && Number.isFinite(v) ? v : void 0;
}
__name(numberOrUndefined, "numberOrUndefined");
async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
__name(readJson, "readJson");
async function ensureProfile(env, profileId) {
  const now = Date.now();
  await d1Run(
    env.DB,
    `INSERT INTO profiles (id, createdAt, updatedAt)
     VALUES (?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET updatedAt = excluded.updatedAt`,
    [profileId, now, now]
  );
}
__name(ensureProfile, "ensureProfile");
function defaultStats() {
  return {
    version: 1,
    updatedAt: Date.now(),
    lastActiveGambleMultiplier: 1,
    lastPrestige: 0,
    lastPermLuck: 0,
    lastCash: 0,
    bestTimeTo1e100Seconds: null
  };
}
__name(defaultStats, "defaultStats");
async function getStats(env, profileId) {
  const row = await d1First(env.DB, "SELECT * FROM profile_stats WHERE profileId = ?", [profileId]);
  if (!row) return defaultStats();
  return {
    version: 1,
    updatedAt: row.updatedAt,
    lastActiveGambleMultiplier: row.lastActiveGambleMultiplier,
    lastPrestige: row.lastPrestige,
    lastPermLuck: row.lastPermLuck,
    lastCash: row.lastCash ?? 0,
    bestTimeTo1e100Seconds: row.bestTimeTo1e100Seconds ?? null
  };
}
__name(getStats, "getStats");
async function upsertStats(env, profileId, statsPatch) {
  const prev = await getStats(env, profileId);
  const merged = {
    ...prev,
    ...statsPatch,
    version: 1,
    updatedAt: Date.now()
  };
  await d1Run(
    env.DB,
    `INSERT INTO profile_stats (
        profileId, updatedAt, lastActiveGambleMultiplier, lastPrestige, lastPermLuck, lastCash, bestTimeTo1e100Seconds
     ) VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(profileId) DO UPDATE SET
       updatedAt = excluded.updatedAt,
       lastActiveGambleMultiplier = excluded.lastActiveGambleMultiplier,
       lastPrestige = excluded.lastPrestige,
       lastPermLuck = excluded.lastPermLuck,
       lastCash = excluded.lastCash,
       bestTimeTo1e100Seconds = excluded.bestTimeTo1e100Seconds`,
    [
      profileId,
      merged.updatedAt,
      merged.lastActiveGambleMultiplier,
      merged.lastPrestige,
      merged.lastPermLuck,
      merged.lastCash,
      merged.bestTimeTo1e100Seconds
    ]
  );
  return merged;
}
__name(upsertStats, "upsertStats");
async function upsertBestTime(env, profileId, seconds) {
  const prev = await getStats(env, profileId);
  const nextBest = prev.bestTimeTo1e100Seconds == null ? seconds : Math.min(prev.bestTimeTo1e100Seconds, seconds);
  return upsertStats(env, profileId, { bestTimeTo1e100Seconds: nextBest });
}
__name(upsertBestTime, "upsertBestTime");
async function getSave(env, profileId) {
  const row = await d1First(env.DB, "SELECT stateJson FROM game_saves WHERE profileId = ?", [profileId]);
  if (!row) return null;
  try {
    return JSON.parse(row.stateJson);
  } catch {
    return null;
  }
}
__name(getSave, "getSave");
async function upsertSave(env, profileId, state) {
  const now = Date.now();
  await d1Run(
    env.DB,
    `INSERT INTO game_saves (profileId, savedAt, stateJson)
     VALUES (?, ?, ?)
     ON CONFLICT(profileId) DO UPDATE SET
       savedAt = excluded.savedAt,
       stateJson = excluded.stateJson`,
    [profileId, now, JSON.stringify(state)]
  );
  return { savedAt: now };
}
__name(upsertSave, "upsertSave");
async function addSnapshot(env, profileId, state, cash) {
  const now = Date.now();
  await d1Run(
    env.DB,
    `INSERT INTO profile_snapshots (profileId, savedAt, cash, stateJson)
     VALUES (?, ?, ?, ?)`,
    [profileId, now, cash, JSON.stringify(state)]
  );
  await d1Run(
    env.DB,
    `DELETE FROM profile_snapshots
     WHERE id NOT IN (
       SELECT id FROM profile_snapshots WHERE profileId = ? ORDER BY savedAt DESC LIMIT 10
     ) AND profileId = ?`,
    [profileId, profileId]
  );
  return { savedAt: now };
}
__name(addSnapshot, "addSnapshot");
function safeParse(jsonText) {
  try {
    return JSON.parse(jsonText);
  } catch {
    return null;
  }
}
__name(safeParse, "safeParse");
async function getSnapshots(env, profileId, limit = 10) {
  const safeLimit = Math.max(1, Math.min(20, Number(limit) || 10));
  const rows = await d1All(
    env.DB,
    `SELECT id, savedAt, cash, stateJson FROM profile_snapshots
     WHERE profileId = ?
     ORDER BY savedAt DESC
     LIMIT ?`,
    [profileId, safeLimit]
  );
  return rows.map((r) => ({ id: r.id, savedAt: r.savedAt, cash: r.cash, state: safeParse(r.stateJson) }));
}
__name(getSnapshots, "getSnapshots");
async function resetProfile(env, profileId) {
  await ensureProfile(env, profileId);
  await d1Run(env.DB, "DELETE FROM game_saves WHERE profileId = ?", [profileId]);
  await d1Run(env.DB, "DELETE FROM profile_stats WHERE profileId = ?", [profileId]);
  await d1Run(env.DB, "DELETE FROM profile_snapshots WHERE profileId = ?", [profileId]);
  await d1Run(env.DB, "DELETE FROM anon_users WHERE user_id = ?", [String(profileId ?? "").trim().toLowerCase()]);
  return { ok: true };
}
__name(resetProfile, "resetProfile");
async function upsertAnonBestScore(env, userId, seconds) {
  const cleaned = String(userId ?? "").trim().toLowerCase();
  if (!/^[a-f0-9]{32}$/.test(cleaned)) throw new Error("Invalid userId");
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds < 0) throw new Error("Invalid score");
  const now = Date.now();
  const prev = await d1First(env.DB, "SELECT best_score FROM anon_users WHERE user_id = ?", [cleaned]);
  const prevBest = prev?.best_score;
  if (prevBest != null && typeof prevBest === "number" && seconds >= prevBest) {
    return { ok: true, updated: false, bestScoreSeconds: prevBest, updatedAt: now };
  }
  await d1Run(
    env.DB,
    `INSERT INTO anon_users (user_id, best_score, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       best_score = excluded.best_score,
       updated_at = excluded.updated_at`,
    [cleaned, seconds, now]
  );
  return { ok: true, updated: true, bestScoreSeconds: seconds, updatedAt: now };
}
__name(upsertAnonBestScore, "upsertAnonBestScore");
async function getAnonRanking(env, limit = 10) {
  const safeLimit = Math.max(1, Math.min(50, Number(limit) || 10));
  const rows = await d1All(
    env.DB,
    `SELECT user_id, best_score, updated_at
     FROM anon_users
     WHERE best_score IS NOT NULL
     ORDER BY best_score ASC, updated_at ASC
     LIMIT ?`,
    [safeLimit]
  );
  return rows.map((r) => ({ userId: r.user_id, bestScoreSeconds: r.best_score, updatedAt: r.updated_at }));
}
__name(getAnonRanking, "getAnonRanking");

// api/profile/[id]/best-time.ts
var onRequest = /* @__PURE__ */ __name(async ({ request, env, params }) => {
  if (isPreflight(request)) return new Response(null, { status: 204 });
  if (request.method.toUpperCase() !== "POST") return json({ error: "Not found" }, { status: 404 });
  const profileId = sanitizeProfileId(params?.id);
  if (!profileId) return json({ error: "Invalid profileId" }, { status: 400 });
  const body = await readJson(request);
  const seconds = body?.seconds;
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds < 0) {
    return json({ error: "Invalid seconds" }, { status: 400 });
  }
  await ensureProfile(env, profileId);
  return json(await upsertBestTime(env, profileId, seconds));
}, "onRequest");

// api/profile/[id]/reset.ts
var onRequest2 = /* @__PURE__ */ __name(async ({ request, env, params }) => {
  if (isPreflight(request)) return new Response(null, { status: 204 });
  if (request.method.toUpperCase() !== "POST") return json({ error: "Not found" }, { status: 404 });
  const profileId = sanitizeProfileId(params?.id);
  if (!profileId) return json({ error: "Invalid profileId" }, { status: 400 });
  try {
    return json(await resetProfile(env, profileId));
  } catch (err) {
    return json({ error: err?.message || "Reset failed" }, { status: 500 });
  }
}, "onRequest");

// api/profile/[id]/save.ts
var onRequest3 = /* @__PURE__ */ __name(async ({ request, env, params }) => {
  if (isPreflight(request)) return new Response(null, { status: 204 });
  const profileId = sanitizeProfileId(params?.id);
  if (!profileId) return json({ error: "Invalid profileId" }, { status: 400 });
  const method = request.method.toUpperCase();
  if (method === "GET") {
    await ensureProfile(env, profileId);
    return json({ state: await getSave(env, profileId) });
  }
  if (method === "PUT") {
    const body = await readJson(request);
    const state = body?.state;
    if (!state || typeof state !== "object") return json({ error: "Missing state" }, { status: 400 });
    await ensureProfile(env, profileId);
    const meta = await upsertSave(env, profileId, state);
    const cash = numberOrUndefined(state?.resources?.cash) ?? 0;
    await addSnapshot(env, profileId, state, cash);
    return json({ ok: true, ...meta });
  }
  return json({ error: "Not found" }, { status: 404 });
}, "onRequest");

// api/profile/[id]/snapshots.ts
var onRequest4 = /* @__PURE__ */ __name(async ({ request, env, params }) => {
  if (isPreflight(request)) return new Response(null, { status: 204 });
  if (request.method.toUpperCase() !== "GET") return json({ error: "Not found" }, { status: 404 });
  const profileId = sanitizeProfileId(params?.id);
  if (!profileId) return json({ error: "Invalid profileId" }, { status: 400 });
  await ensureProfile(env, profileId);
  const url = new URL(request.url);
  const limit = url.searchParams.get("limit") ?? "10";
  return json({ snapshots: await getSnapshots(env, profileId, Number(limit)) });
}, "onRequest");

// api/profile/[id]/stats.ts
var onRequest5 = /* @__PURE__ */ __name(async ({ request, env, params }) => {
  if (isPreflight(request)) return new Response(null, { status: 204 });
  const profileId = sanitizeProfileId(params?.id);
  if (!profileId) return json({ error: "Invalid profileId" }, { status: 400 });
  const method = request.method.toUpperCase();
  if (method === "GET") {
    await ensureProfile(env, profileId);
    return json(await getStats(env, profileId));
  }
  if (method === "PUT") {
    await ensureProfile(env, profileId);
    const body = await readJson(request);
    const patch = {};
    if (typeof body?.lastActiveGambleMultiplier === "number") patch.lastActiveGambleMultiplier = body.lastActiveGambleMultiplier;
    if (typeof body?.lastPrestige === "number") patch.lastPrestige = body.lastPrestige;
    if (typeof body?.lastPermLuck === "number") patch.lastPermLuck = body.lastPermLuck;
    if (typeof body?.lastCash === "number") patch.lastCash = body.lastCash;
    if (typeof body?.bestTimeTo1e100Seconds === "number") patch.bestTimeTo1e100Seconds = body.bestTimeTo1e100Seconds;
    return json(await upsertStats(env, profileId, patch));
  }
  return json({ error: "Not found" }, { status: 404 });
}, "onRequest");

// api/login.ts
var onRequest6 = /* @__PURE__ */ __name(async ({ request, env }) => {
  if (isPreflight(request)) return new Response(null, { status: 204 });
  void env;
  return json({ error: "Not found" }, { status: 404 });
}, "onRequest");

// api/logout.ts
var onRequest7 = /* @__PURE__ */ __name(async ({ request, env }) => {
  if (isPreflight(request)) return new Response(null, { status: 204 });
  void env;
  return json({ error: "Not found" }, { status: 404 });
}, "onRequest");

// api/ranking.ts
var onRequest8 = /* @__PURE__ */ __name(async ({ request, env }) => {
  if (isPreflight(request)) return new Response(null, { status: 204 });
  if (request.method.toUpperCase() !== "GET") return json({ error: "Not found" }, { status: 404 });
  const url = new URL(request.url);
  const limit = Math.max(1, Math.min(50, Number(url.searchParams.get("limit") ?? 10)));
  const ranking = await getAnonRanking(env, limit);
  return json({ ranking });
}, "onRequest");

// api/register.ts
var onRequest9 = /* @__PURE__ */ __name(async ({ request, env }) => {
  if (isPreflight(request)) return new Response(null, { status: 204 });
  void env;
  return json({ error: "Not found" }, { status: 404 });
}, "onRequest");

// api/score.ts
var onRequest10 = /* @__PURE__ */ __name(async ({ request, env }) => {
  if (isPreflight(request)) return new Response(null, { status: 204 });
  if (request.method.toUpperCase() !== "POST") return json({ error: "Not found" }, { status: 404 });
  const body = await readJson(request);
  const userId = sanitizeAnonUserId(body?.userId);
  const score = body?.score;
  if (!userId) return json({ error: "Invalid userId" }, { status: 400 });
  if (typeof score !== "number" || !Number.isFinite(score) || score < 0) {
    return json({ error: "Invalid score" }, { status: 400 });
  }
  try {
    const result = await upsertAnonBestScore(env, userId, score);
    return json({ ok: true, bestScoreSeconds: result.bestScoreSeconds });
  } catch (err) {
    return json({ error: err?.message || "Invalid score" }, { status: 400 });
  }
}, "onRequest");

// api/verify.ts
var onRequest11 = /* @__PURE__ */ __name(async ({ request, env }) => {
  if (isPreflight(request)) return new Response(null, { status: 204 });
  void env;
  return json({ error: "Not found" }, { status: 404 });
}, "onRequest");

// ranking.ts
async function getAnonRanking2(env, limit = 10) {
  const safeLimit = Math.max(1, Math.min(50, Number(limit) || 10));
  const rows = await d1All(
    env.DB,
    `SELECT user_id, best_score, updated_at
     FROM anon_users
     WHERE best_score IS NOT NULL
     ORDER BY best_score ASC, updated_at ASC
     LIMIT ?`,
    [safeLimit]
  );
  return rows.map((r) => ({
    userId: r.user_id,
    bestScoreSeconds: r.best_score,
    updatedAt: r.updated_at
  }));
}
__name(getAnonRanking2, "getAnonRanking");
var onRequest12 = /* @__PURE__ */ __name(async (context) => {
  const { request, env } = context;
  if (isPreflight(request)) return new Response(null, { status: 204 });
  const url = new URL(request.url);
  if (request.method.toUpperCase() !== "GET") return json({ error: "Not found" }, { status: 404 });
  const limit = Math.max(1, Math.min(50, Number(url.searchParams.get("limit") ?? 10)));
  const ranking = await getAnonRanking2(env, limit);
  return json({ ranking });
}, "onRequest");

// score.ts
function sanitizeAnonUserId2(input) {
  const raw = String(input ?? "").trim().toLowerCase();
  return /^[a-f0-9]{32}$/.test(raw) ? raw : null;
}
__name(sanitizeAnonUserId2, "sanitizeAnonUserId");
async function readJson2(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
__name(readJson2, "readJson");
async function upsertAnonBestScore2(env, userId, seconds) {
  const cleaned = String(userId ?? "").trim().toLowerCase();
  if (!/^[a-f0-9]{32}$/.test(cleaned)) throw new Error("Invalid userId");
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds < 0) throw new Error("Invalid score");
  const now = Date.now();
  const prev = await d1First(env.DB, "SELECT best_score FROM anon_users WHERE user_id = ?", [
    cleaned
  ]);
  const prevBest = prev?.best_score;
  if (prevBest != null && typeof prevBest === "number" && seconds >= prevBest) {
    return { ok: true, updated: false, bestScoreSeconds: prevBest, updatedAt: now };
  }
  await d1Run(
    env.DB,
    `INSERT INTO anon_users (user_id, best_score, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       best_score = excluded.best_score,
       updated_at = excluded.updated_at`,
    [cleaned, seconds, now]
  );
  return { ok: true, updated: true, bestScoreSeconds: seconds, updatedAt: now };
}
__name(upsertAnonBestScore2, "upsertAnonBestScore");
var onRequest13 = /* @__PURE__ */ __name(async (context) => {
  const { request, env } = context;
  if (isPreflight(request)) return new Response(null, { status: 204 });
  if (request.method.toUpperCase() !== "POST") return json({ error: "Not found" }, { status: 404 });
  const body = await readJson2(request);
  const userId = sanitizeAnonUserId2(body?.userId);
  const score = body?.score;
  if (!userId) return json({ error: "Invalid userId" }, { status: 400 });
  if (typeof score !== "number" || !Number.isFinite(score) || score < 0) {
    return json({ error: "Invalid score" }, { status: 400 });
  }
  try {
    const result = await upsertAnonBestScore2(env, userId, score);
    return json({ ok: true, bestScoreSeconds: result.bestScoreSeconds });
  } catch (err) {
    return json({ error: err?.message || "Invalid score" }, { status: 400 });
  }
}, "onRequest");

// ../.wrangler/tmp/pages-uruvD4/functionsRoutes-0.06119764281714768.mjs
var routes = [
  {
    routePath: "/api/profile/:id/best-time",
    mountPath: "/api/profile/:id",
    method: "",
    middlewares: [],
    modules: [onRequest]
  },
  {
    routePath: "/api/profile/:id/reset",
    mountPath: "/api/profile/:id",
    method: "",
    middlewares: [],
    modules: [onRequest2]
  },
  {
    routePath: "/api/profile/:id/save",
    mountPath: "/api/profile/:id",
    method: "",
    middlewares: [],
    modules: [onRequest3]
  },
  {
    routePath: "/api/profile/:id/snapshots",
    mountPath: "/api/profile/:id",
    method: "",
    middlewares: [],
    modules: [onRequest4]
  },
  {
    routePath: "/api/profile/:id/stats",
    mountPath: "/api/profile/:id",
    method: "",
    middlewares: [],
    modules: [onRequest5]
  },
  {
    routePath: "/api/login",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest6]
  },
  {
    routePath: "/api/logout",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest7]
  },
  {
    routePath: "/api/ranking",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest8]
  },
  {
    routePath: "/api/register",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest9]
  },
  {
    routePath: "/api/score",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest10]
  },
  {
    routePath: "/api/verify",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest11]
  },
  {
    routePath: "/ranking",
    mountPath: "/",
    method: "",
    middlewares: [],
    modules: [onRequest12]
  },
  {
    routePath: "/score",
    mountPath: "/",
    method: "",
    middlewares: [],
    modules: [onRequest13]
  }
];

// ../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");

// ../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");

// ../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// ../.wrangler/tmp/bundle-hI7BPh/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = pages_template_worker_default;

// ../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// ../.wrangler/tmp/bundle-hI7BPh/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=functionsWorker-0.3329659650795047.mjs.map
