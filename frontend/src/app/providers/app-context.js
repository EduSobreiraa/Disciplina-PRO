import { createContext, useContext } from 'react'

export const AppContext = createContext(null)

export function useAppContext() {
  const context = useContext(AppContext)
  if (!context) throw new Error('AppProvider não configurado')
  return context
}
