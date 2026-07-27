import { createContext, useContext } from 'react'

export const Projeto66Context = createContext(null)

export function useProjeto66Context() {
  const context = useContext(Projeto66Context)
  if (!context) throw new Error('Projeto66Provider não configurado')
  return context
}
