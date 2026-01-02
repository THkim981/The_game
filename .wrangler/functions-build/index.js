var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// _lib/http.ts
function json(data, init) {
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(data), { ...init, headers });
}
__name(json, "json");
function readBearerToken(request) {
  const raw = request.headers.get("Authorization") ?? "";
  const match2 = raw.match(/^Bearer\s+(.+)$/i);
  return match2?.[1]?.trim() || null;
}
__name(readBearerToken, "readBearerToken");
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

// _lib/crypto.ts
function toHex(bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let out = "";
  for (const b of u8) out += b.toString(16).padStart(2, "0");
  return out;
}
__name(toHex, "toHex");
function randomHex(byteLength) {
  const u8 = new Uint8Array(byteLength);
  crypto.getRandomValues(u8);
  return toHex(u8);
}
__name(randomHex, "randomHex");
async function hashPasswordPbkdf2Sha512(password, saltHex) {
  const passwordBytes = new TextEncoder().encode(password);
  const saltBytes = new Uint8Array(saltHex.match(/.{1,2}/g)?.map((h) => Number.parseInt(h, 16)) ?? []);
  const keyMaterial = await crypto.subtle.importKey("raw", passwordBytes, "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltBytes,
      iterations: 1e5,
      hash: "SHA-512"
    },
    keyMaterial,
    64 * 8
  );
  return toHex(bits);
}
__name(hashPasswordPbkdf2Sha512, "hashPasswordPbkdf2Sha512");

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
    `INSERT INTO profiles (id, userId, createdAt, updatedAt)
     VALUES (?, NULL, ?, ?)
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
async function registerUser(env, username, password) {
  const existing = await d1First(env.DB, "SELECT id FROM users WHERE username = ?", [username]);
  if (existing) throw new Error("Username already exists");
  const salt = randomHex(16);
  const passwordHash = await hashPasswordPbkdf2Sha512(password, salt);
  const now = Date.now();
  await d1Run(env.DB, "INSERT INTO users (username, passwordHash, salt, createdAt) VALUES (?, ?, ?, ?)", [
    username,
    passwordHash,
    salt,
    now
  ]);
  const created = await d1First(env.DB, "SELECT id, username FROM users WHERE username = ?", [username]);
  if (!created) throw new Error("Failed to create user");
  return { userId: created.id, username: created.username };
}
__name(registerUser, "registerUser");
async function loginUser(env, username, password) {
  const user = await d1First(
    env.DB,
    "SELECT id, username, passwordHash, salt FROM users WHERE username = ?",
    [username]
  );
  if (!user) throw new Error("Invalid username or password");
  const hash = await hashPasswordPbkdf2Sha512(password, user.salt);
  if (hash !== user.passwordHash) throw new Error("Invalid username or password");
  const token = randomHex(32);
  const now = Date.now();
  const expiresAt = now + 30 * 365 * 24 * 60 * 60 * 1e3;
  await d1Run(env.DB, "INSERT INTO sessions (token, userId, createdAt, expiresAt) VALUES (?, ?, ?, ?)", [
    token,
    user.id,
    now,
    expiresAt
  ]);
  const profileId = `user_${user.id}`;
  await d1Run(
    env.DB,
    `INSERT INTO profiles (id, userId, createdAt, updatedAt)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET userId = excluded.userId, updatedAt = excluded.updatedAt`,
    [profileId, user.id, now, now]
  );
  return { token, userId: user.id, username: user.username, profileId };
}
__name(loginUser, "loginUser");
async function verifySession(env, token) {
  const session = await d1First(
    env.DB,
    `SELECT s.userId as userId, s.expiresAt as expiresAt, u.username as username
     FROM sessions s
     JOIN users u ON s.userId = u.id
     WHERE s.token = ?`,
    [token]
  );
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    await d1Run(env.DB, "DELETE FROM sessions WHERE token = ?", [token]);
    return null;
  }
  const profileId = `user_${session.userId}`;
  return { userId: session.userId, username: session.username, profileId };
}
__name(verifySession, "verifySession");
async function logoutSession(env, token) {
  await d1Run(env.DB, "DELETE FROM sessions WHERE token = ?", [token]);
}
__name(logoutSession, "logoutSession");
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
  if (request.method.toUpperCase() !== "POST") return json({ error: "Not found" }, { status: 404 });
  const body = await readJson(request);
  const username = body?.username;
  const password = body?.password;
  if (!username || !password) {
    return json({ error: "\uC544\uC774\uB514\uC640 \uBE44\uBC00\uBC88\uD638\uB97C \uC785\uB825\uD558\uC138\uC694" }, { status: 400 });
  }
  try {
    const result = await loginUser(env, String(username).trim(), String(password));
    return json({
      success: true,
      token: result.token,
      userId: result.userId,
      username: result.username,
      profileId: result.profileId
    });
  } catch (err) {
    return json({ error: err?.message || "Invalid username or password" }, { status: 401 });
  }
}, "onRequest");

// api/logout.ts
var onRequest7 = /* @__PURE__ */ __name(async ({ request, env }) => {
  if (isPreflight(request)) return new Response(null, { status: 204 });
  if (request.method.toUpperCase() !== "POST") return json({ error: "Not found" }, { status: 404 });
  const token = readBearerToken(request);
  if (token) await logoutSession(env, token);
  return json({ success: true });
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
  if (request.method.toUpperCase() !== "POST") return json({ error: "Not found" }, { status: 404 });
  const body = await readJson(request);
  const username = body?.username;
  const password = body?.password;
  if (!username || typeof username !== "string" || username.trim().length < 3) {
    return json({ error: "\uC544\uC774\uB514\uB294 3\uC790 \uC774\uC0C1\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4" }, { status: 400 });
  }
  if (!password || typeof password !== "string" || password.length < 4) {
    return json({ error: "\uBE44\uBC00\uBC88\uD638\uB294 4\uC790 \uC774\uC0C1\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4" }, { status: 400 });
  }
  try {
    const result = await registerUser(env, username.trim(), password);
    return json({ success: true, userId: result.userId, username: result.username });
  } catch (err) {
    return json({ error: err?.message || "Register failed" }, { status: 400 });
  }
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
  if (request.method.toUpperCase() !== "GET") return json({ error: "Not found" }, { status: 404 });
  const token = readBearerToken(request);
  if (!token) return json({ error: "No token" }, { status: 401 });
  const session = await verifySession(env, token);
  if (!session) return json({ error: "Invalid or expired token" }, { status: 401 });
  return json({ success: true, userId: session.userId, username: session.username, profileId: session.profileId });
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

// ../.wrangler/tmp/pages-ytufTs/functionsRoutes-0.6844671549857786.mjs
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
export {
  pages_template_worker_default as default
};
