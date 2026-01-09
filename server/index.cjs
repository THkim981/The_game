const path = require('node:path')
const fs = require('node:fs')
const express = require('express')
const cors = require('cors')

const {
  ensureProfile,
  getStats,
  upsertStats,
  upsertBestTime,
  getSave,
  upsertSave,
  addSnapshot,
  getSnapshots,
  resetProfile,
  upsertAnonBestScore,
  getAnonRanking,
  registerUser,
  loginUser,
  verifySession,
  logoutSession,
} = require('./db.cjs')

const app = express()

app.use(cors())
app.use(express.json({ limit: '2mb' }))

function sanitizeProfileId(input) {
  const raw = String(input ?? '').trim()
  // allow simple ids only
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32)
  return cleaned.length > 0 ? cleaned : null
}

function sanitizeAnonUserId(input) {
  const raw = String(input ?? '').trim().toLowerCase()
  return /^[a-f0-9]{32}$/.test(raw) ? raw : null
}

function handlePostScore(req, res) {
  const userId = sanitizeAnonUserId(req.body?.userId)
  const score = req.body?.score
  const nickname = req.body?.nickname
  if (!userId) return res.status(400).json({ error: 'Invalid userId' })
  if (typeof score !== 'number' || !Number.isFinite(score) || score < 0) {
    return res.status(400).json({ error: 'Invalid score' })
  }

  const toNum = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)
  const meta = {
    luck: toNum(req.body?.luck),
    activeGambleMultiplier: toNum(req.body?.activeGambleMultiplier),
    elapsedSeconds: toNum(req.body?.elapsedSeconds),
    prestigeElapsedSeconds: toNum(req.body?.prestigeElapsedSeconds),
    prestige: toNum(req.body?.prestige),
    cash: toNum(req.body?.cash),
    gold: toNum(req.body?.gold),
    insight: toNum(req.body?.insight),
    heat: toNum(req.body?.heat),
    safeUpgradeLevel: toNum(req.body?.safeUpgradeLevel),
  }

  try {
    const result = upsertAnonBestScore(userId, score, nickname)
    res.json({ ok: true, bestScoreSeconds: result.bestScoreSeconds })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
}

function handleGetRanking(req, res) {
  const limit = Math.max(1, Math.min(50, Number(req.query.limit ?? 10)))
  const offset = Math.max(0, Math.min(100000, Number(req.query.offset ?? 0)))
  res.json({ ranking: getAnonRanking(limit, offset) })
}

function handlePostNickname(req, res) {
  const userId = sanitizeAnonUserId(req.body?.userId)
  const nickname = req.body?.nickname
  if (!userId) return res.status(400).json({ error: 'Invalid userId' })

  try {
    // Reuse score upsert logic: updates nickname even if score doesn't change.
    // Passing Infinity would fail validation; instead, insert/update nickname-only row via DB helper.
    const { upsertAnonNickname } = require('./db.cjs')
    const result = upsertAnonNickname(userId, nickname)
    res.json({ ok: true, nickname: result.nickname })
  } catch (err) {
    res.status(400).json({ error: err.message || 'Invalid nickname' })
  }
}

// Spec endpoints
app.post('/score', handlePostScore)
app.get('/ranking', handleGetRanking)
app.post('/nickname', handlePostNickname)

// Backwards-compatible aliases under /api
app.post('/api/score', handlePostScore)
app.get('/api/ranking', handleGetRanking)
app.post('/api/nickname', handlePostNickname)

app.post('/api/register', (req, res) => {
  const { username, password } = req.body ?? {}
  if (!username || typeof username !== 'string' || username.trim().length < 3) {
    return res.status(400).json({ error: '아이디는 3자 이상이어야 합니다' })
  }
  if (!password || typeof password !== 'string' || password.length < 4) {
    return res.status(400).json({ error: '비밀번호는 4자 이상이어야 합니다' })
  }

  try {
    const result = registerUser(username.trim(), password)
    res.json({ success: true, userId: result.userId, username: result.username })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.post('/api/login', (req, res) => {
  const { username, password } = req.body ?? {}
  if (!username || !password) {
    return res.status(400).json({ error: '아이디와 비밀번호를 입력하세요' })
  }

  try {
    const result = loginUser(username.trim(), password)
    res.json({
      success: true,
      token: result.token,
      userId: result.userId,
      username: result.username,
      profileId: result.profileId,
    })
  } catch (err) {
    res.status(401).json({ error: err.message })
  }
})

app.post('/api/logout', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (token) logoutSession(token)
  res.json({ success: true })
})

app.get('/api/verify', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'No token' })

  const session = verifySession(token)
  if (!session) return res.status(401).json({ error: 'Invalid or expired token' })

  res.json({ success: true, userId: session.userId, username: session.username, profileId: session.profileId })
})

app.get('/api/profile/:id/stats', (req, res) => {
  const profileId = sanitizeProfileId(req.params.id)
  if (!profileId) return res.status(400).json({ error: 'Invalid profileId' })
  ensureProfile(profileId)
  res.json(getStats(profileId))
})

app.put('/api/profile/:id/stats', (req, res) => {
  const profileId = sanitizeProfileId(req.params.id)
  if (!profileId) return res.status(400).json({ error: 'Invalid profileId' })
  ensureProfile(profileId)

  const body = req.body ?? {}
  const patch = {}
  if (typeof body.lastActiveGambleMultiplier === 'number') patch.lastActiveGambleMultiplier = body.lastActiveGambleMultiplier
  if (typeof body.lastPrestige === 'number') patch.lastPrestige = body.lastPrestige
  if (typeof body.lastPermLuck === 'number') patch.lastPermLuck = body.lastPermLuck
  if (typeof body.lastCash === 'number') patch.lastCash = body.lastCash
  if (typeof body.bestTimeTo1e100Seconds === 'number') patch.bestTimeTo1e100Seconds = body.bestTimeTo1e100Seconds

  const next = upsertStats(profileId, patch)
  res.json(next)
})

app.post('/api/profile/:id/best-time', (req, res) => {
  const profileId = sanitizeProfileId(req.params.id)
  if (!profileId) return res.status(400).json({ error: 'Invalid profileId' })
  const seconds = req.body?.seconds
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0) {
    return res.status(400).json({ error: 'Invalid seconds' })
  }
  ensureProfile(profileId)
  res.json(upsertBestTime(profileId, seconds))
})

app.get('/api/profile/:id/save', (req, res) => {
  const profileId = sanitizeProfileId(req.params.id)
  if (!profileId) return res.status(400).json({ error: 'Invalid profileId' })
  ensureProfile(profileId)
  res.json({ state: getSave(profileId) })
})

app.put('/api/profile/:id/save', (req, res) => {
  const profileId = sanitizeProfileId(req.params.id)
  if (!profileId) return res.status(400).json({ error: 'Invalid profileId' })
  const state = req.body?.state
  if (!state || typeof state !== 'object') return res.status(400).json({ error: 'Missing state' })
  ensureProfile(profileId)
  const meta = upsertSave(profileId, state)
  const cash = typeof state?.resources?.cash === 'number' ? state.resources.cash : 0
  addSnapshot(profileId, state, cash)
  res.json({ ok: true, ...meta })
})

app.get('/api/profile/:id/snapshots', (req, res) => {
  const profileId = sanitizeProfileId(req.params.id)
  if (!profileId) return res.status(400).json({ error: 'Invalid profileId' })
  ensureProfile(profileId)
  const limit = Math.max(1, Math.min(20, Number(req.query.limit ?? 10)))
  res.json({ snapshots: getSnapshots(profileId, limit) })
})

app.post('/api/profile/:id/reset', (req, res) => {
  const profileId = sanitizeProfileId(req.params.id)
  if (!profileId) return res.status(400).json({ error: 'Invalid profileId' })

  try {
    resetProfile(profileId)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message || 'Reset failed' })
  }
})

// Production: serve built frontend
const distDir = path.join(process.cwd(), 'dist')
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir))
  app.get(/.*/, (req, res) => res.sendFile(path.join(distDir, 'index.html')))
}

const port = Number(process.env.PORT ?? 3001)
app.listen(port, () => {
  console.log(`[server] listening on http://localhost:${port}`)
})
