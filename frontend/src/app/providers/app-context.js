import { createContext, useContext } from 'react'

export const AppContext = createContext(null)

// Contexto temporário; será alimentado pela sessão autenticada quando a API existir.
export function useAppContext() {
  return useContext(AppContext)
}
