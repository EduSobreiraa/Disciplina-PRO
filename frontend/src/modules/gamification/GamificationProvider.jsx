import { useCallback, useMemo, useState } from 'react'
import { GamificationContext } from './gamification-context'
import { gamificationLocalRepository } from './repositories/gamification.local.repository'
import { appendAward, appendReversal, summarizeGamification, unlockAchievements } from './services/gamification'

export function GamificationProvider({ children }) {
  const [state, setState] = useState(() => gamificationLocalRepository.load())
  const commit = useCallback((mutator) => {
    setState((current) => gamificationLocalRepository.save(unlockAchievements(mutator(current))))
  }, [])
  const setReward = useCallback((eventType, sourceKey, active = true) => { commit((current) => active ? appendAward(current, eventType, sourceKey) : appendReversal(current, sourceKey)) }, [commit])
  const summary = useMemo(() => summarizeGamification(state), [state])
  return <GamificationContext.Provider value={{ state, ...summary, setReward }}>{children}</GamificationContext.Provider>
}
