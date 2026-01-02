import { useCallback, useEffect, useState } from 'react'

import { loginUser, logoutUser, registerUser, verifySession } from '../utils/profileStorage'

type AuthInfo = {
  profileId: string
  username: string
}

type AuthResult = AuthInfo | null

type UseAuthSessionResult = {
  auth: AuthResult
  busy: boolean
  error: string | null
  checked: boolean
  login: (username: string, password: string) => Promise<AuthInfo>
  register: (username: string, password: string) => Promise<AuthInfo>
  logout: () => Promise<void>
  resetError: () => void
}

export function useAuthSession(): UseAuthSessionResult {
  const [auth, setAuth] = useState<AuthResult>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (checked) return

    setChecked(true)
    verifySession()
      .then((result) => setAuth({ profileId: result.profileId, username: result.username }))
      .catch(() => {})
  }, [checked])

  const wrap = useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
    setBusy(true)
    setError(null)
    try {
      return await fn()
    } catch (err) {
      const status = (err as { status?: number }).status
      const apiMessage = err instanceof Error ? err.message : undefined
      let message = apiMessage || '요청을 처리하지 못했습니다.'

      if (status === 0 || status === undefined) {
        message = '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.'
      } else if (status === 400) {
        message = apiMessage || '입력값을 확인해 주세요.'
      } else if (status === 401) {
        message = apiMessage || '아이디 또는 비밀번호가 올바르지 않습니다.'
      } else if (status === 404) {
        message = apiMessage || '계정을 찾을 수 없습니다.'
      } else if (status === 409) {
        message = apiMessage || '이미 사용 중인 아이디입니다.'
      } else if (status) {
        message = apiMessage || `요청을 처리하지 못했습니다 (코드 ${status}).`
      }

      setError(message)
      throw err
    } finally {
      setBusy(false)
    }
  }, [])

  const login = useCallback(
    (username: string, password: string) =>
      wrap(async () => {
        const result = await loginUser(username, password)
        setAuth({ profileId: result.profileId, username: result.username })
        return { profileId: result.profileId, username: result.username }
      }),
    [wrap],
  )

  const register = useCallback(
    (username: string, password: string) =>
      wrap(async () => {
        await registerUser(username, password)
        const result = await loginUser(username, password)
        setAuth({ profileId: result.profileId, username: result.username })
        return { profileId: result.profileId, username: result.username }
      }),
    [wrap],
  )

  const logout = useCallback(
    () =>
      wrap(async () => {
        await logoutUser()
        setAuth(null)
      }),
    [wrap],
  )

  const resetError = useCallback(() => setError(null), [])

  return { auth, busy, error, checked, login, register, logout, resetError }
}
