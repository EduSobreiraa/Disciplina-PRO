import { useEffect, useRef, useState } from 'react'

export function useCountdownTimer(initialSeconds) {
  const [seconds, setSeconds] = useState(initialSeconds)
  const [running, setRunning] = useState(false)
  const endAt = useRef(null)

  useEffect(() => {
    if (!running) return undefined
    const interval = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000))
      setSeconds(remaining)
      if (remaining === 0) setRunning(false)
    }, 250)
    return () => window.clearInterval(interval)
  }, [running]) // o tempo restante é capturado apenas ao iniciar/retomar

  function reset(nextSeconds = initialSeconds) { setRunning(false); setSeconds(nextSeconds) }
  function toggle() {
    if (!running) endAt.current = Date.now() + seconds * 1000
    setRunning((value) => !value)
  }
  return { seconds, running, complete: seconds === 0, toggle, reset }
}
