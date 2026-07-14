import { createContext, useContext } from 'react'

export const GamificationContext = createContext(null)
export function useGamification() { return useContext(GamificationContext) }
