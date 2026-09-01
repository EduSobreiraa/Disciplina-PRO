import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAppContext } from '../../app/providers/app-context'
import { achievementDefinitions, levelPresentation } from './data/gamification-rules'
import { getXpIncrease } from './data/xp-notification'
import { GamificationContext } from './gamification-context'
import { createGamificationHttpRepository } from './repositories/gamification.http.repository'
import './styles/xp-notification.css'

const emptyProjection = {
  balance: 0,
  level: { level: 1, key: 'recruit', name: 'Recruta', minimum: 0 },
  nextLevel: { level: 2, key: 'soldier', name: 'Soldado', minimum: 500 },
  progress: 0,
  transactions: [],
  achievements: [],
}

export function GamificationProvider({ children }) {
  const session = useAppContext()
  const [state, setState] = useState({ status: 'idle', projection: emptyProjection, error: null })
  const [xpNotice, setXpNotice] = useState(null)
  const previousBalance = useRef(null)
  const noticeTimer = useRef(null)
  const repository = useMemo(() => createGamificationHttpRepository({
    baseUrl: '/api',
    getTenantId: () => session.tenant?.id,
    authorizedFetch: session.sessionClient.authorizedFetch,
  }), [session.sessionClient, session.tenant?.id])

  const clearXpNotice = useCallback(() => {
    if (noticeTimer.current !== null) window.clearTimeout(noticeTimer.current)
    noticeTimer.current = null
    setXpNotice(null)
  }, [])

  const acceptProjection = useCallback((projection) => {
    const increase = getXpIncrease(previousBalance.current, projection.balance)
    previousBalance.current = projection.balance
    setState({ status: 'ready', projection, error: null })
    if (increase === 0) return
    if (noticeTimer.current !== null) window.clearTimeout(noticeTimer.current)
    setXpNotice({ amount: increase })
    noticeTimer.current = window.setTimeout(() => {
      noticeTimer.current = null
      setXpNotice(null)
    }, 3_200)
  }, [])

  const reload = useCallback(async () => {
    if (!session.authenticated || !session.tenant) {
      previousBalance.current = null
      clearXpNotice()
      setState({ status: 'idle', projection: emptyProjection, error: null })
      return emptyProjection
    }
    setState((current) => ({ ...current, status: 'loading', error: null }))
    try {
      const projection = await repository.loadMine()
      acceptProjection(projection)
      return projection
    } catch (error) {
      setState((current) => ({ ...current, status: 'error', error }))
      throw error
    }
  }, [acceptProjection, clearXpNotice, repository, session.authenticated, session.tenant])

  useEffect(() => {
    let active = true
    if (!session.authenticated || !session.tenant) {
      previousBalance.current = null
      clearXpNotice()
      setState({ status: 'idle', projection: emptyProjection, error: null })
      return () => { active = false }
    }
    setState((current) => ({ ...current, status: 'loading', error: null }))
    const refresh = () => repository.loadMine()
      .then((projection) => { if (active) acceptProjection(projection) })
      .catch((error) => { if (active) setState((current) => ({ ...current, status: 'error', error })) })
    refresh()
    const interval = window.setInterval(refresh, 30_000)
    const onVisibility = () => { if (document.visibilityState === 'visible') refresh() }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      active = false
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [acceptProjection, clearXpNotice, repository, session.authenticated, session.tenant])

  useEffect(() => () => {
    if (noticeTimer.current !== null) window.clearTimeout(noticeTimer.current)
  }, [])

  const value = useMemo(() => {
    const projection = state.projection
    return {
      status: state.status,
      error: state.error,
      xp: projection.balance,
      level: { ...projection.level, ...(levelPresentation[projection.level.key] ?? { medal: '🏅' }) },
      nextLevel: projection.nextLevel,
      progress: projection.progress,
      transactions: projection.transactions,
      achievements: projection.achievements,
      achievementDefinitions,
      reload,
    }
  }, [reload, state])
  return (
    <GamificationContext.Provider value={value}>
      {children}
      {xpNotice && (
        <div className="xp-gain-toast" role="status" aria-live="polite" aria-atomic="true">
          <span aria-hidden="true">◆</span>
          <div><strong>+{xpNotice.amount} XP</strong><small>Progresso confirmado</small></div>
        </div>
      )}
    </GamificationContext.Provider>
  )
}
