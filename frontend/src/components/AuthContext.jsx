import { createContext, useContext, useEffect, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)

  useEffect(() => {
    const saved = window.localStorage.getItem('vh-auth')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.token && parsed.username) {
          setUser({ username: parsed.username, role: parsed.role })
          setToken(parsed.token)
        }
      } catch {
        // ignore broken storage
      }
    }
  }, [])

  const saveAuth = (auth) => {
    window.localStorage.setItem('vh-auth', JSON.stringify(auth))
    setUser({ username: auth.username, role: auth.role })
    setToken(auth.token)
  }

  const clearAuth = () => {
    window.localStorage.removeItem('vh-auth')
    setUser(null)
    setToken(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, login: saveAuth, logout: clearAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}



