import { useCallback, useState } from 'react'

type UseAuthFormResult = {
  username: string
  password: string
  isRegisterMode: boolean
  setUsername: (value: string) => void
  setPassword: (value: string) => void
  toggleMode: () => void
  resetFields: () => void
}

export function useAuthForm(): UseAuthFormResult {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isRegisterMode, setIsRegisterMode] = useState(false)

  const toggleMode = useCallback(() => {
    setIsRegisterMode((prev) => !prev)
  }, [])

  const resetFields = useCallback(() => {
    setUsername('')
    setPassword('')
  }, [])

  return { username, password, isRegisterMode, setUsername, setPassword, toggleMode, resetFields }
}
