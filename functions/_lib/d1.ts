export type Env = {
  DB: D1Database
}

type D1RunResult = { success: boolean }

export async function d1First<T>(db: D1Database, sql: string, binds: unknown[] = []): Promise<T | null> {
  const res = await db.prepare(sql).bind(...binds).first<T>()
  return res ?? null
}

export async function d1All<T>(db: D1Database, sql: string, binds: unknown[] = []): Promise<T[]> {
  const res = await db.prepare(sql).bind(...binds).all<T>()
  return res.results ?? []
}

export async function d1Run(db: D1Database, sql: string, binds: unknown[] = []): Promise<D1RunResult> {
  const res = await db.prepare(sql).bind(...binds).run()
  return { success: Boolean(res.success) }
}
