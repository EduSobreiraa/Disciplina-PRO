import { useEffect, useRef, useState } from 'react'
import { useProjeto66Cycle } from '../../hooks/useProjeto66Cycle'
import { PROJETO66_ACTIVITY_KEYS } from '../../data/projeto66-contract'

const phrases = ['Você não é sua reação automática.', 'O velho eu quer reagir. O novo eu escolhe.', 'Respire. Cada segundo é uma vitória.', 'Você está quebrando o padrão agora.']

export function CrisisSupportDialog({ open, onClose }) {
  const execution = useProjeto66Cycle()
  const [breaths, setBreaths] = useState(0)
  const [savingOutcome, setSavingOutcome] = useState('')
  const [saveError, setSaveError] = useState(null)
  const dialogRef = useRef(null)
  const initialFocusRef = useRef(null)
  const previousFocusRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    previousFocusRef.current = document.activeElement
    const dialog = dialogRef.current
    if (!dialog.open) dialog.showModal()
    initialFocusRef.current?.focus()
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        setSaveError(null)
        setSavingOutcome('')
        onClose()
        return
      }
      if (event.key !== 'Tab' || !dialog) return
      const focusable = [...dialog.querySelectorAll('button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])')]
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable.at(-1)
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (dialog.open) dialog.close()
      previousFocusRef.current?.focus?.()
    }
  }, [onClose, open])

  if (!open) return null
  async function finish(outcome) {
    if (execution.cycle.status !== 'ACTIVE') {
      setSaveError('Inicie seu ciclo para registrar este momento de forma privada.')
      return
    }
    setSavingOutcome(outcome)
    setSaveError(null)
    try {
      await execution.savePrivateResponse(PROJETO66_ACTIVITY_KEYS.crisisSupport, { outcome, breaths, occurredAt: new Date().toISOString() })
      setBreaths(0)
      onClose()
    } catch {
      setSaveError('Não foi possível registrar este momento. Tente novamente.')
    } finally {
      setSavingOutcome('')
    }
  }
  return <dialog ref={dialogRef} className="p66-crisis" aria-labelledby="crisis-title" onCancel={(event) => { event.preventDefault(); onClose() }}><span>🫁</span><small>Modo crise · conteúdo privado</small><h2 id="crisis-title">Pare. Respire. Escolha.</h2><p>{phrases[Math.min(breaths, phrases.length - 1)]}</p><button disabled={Boolean(savingOutcome)} ref={initialFocusRef} className="p66-breath" type="button" onClick={() => setBreaths((value) => value + 1)}><b>{breaths < 4 ? 'Inspirar e soltar' : 'Estou no controle'}</b><small>{breaths} respirações conscientes</small></button>{saveError && <p className="p66-crisis-error" role="alert">{saveError}</p>}<div><button disabled={Boolean(savingOutcome)} type="button" onClick={() => finish('overcame')}>{savingOutcome === 'overcame' ? 'Registrando…' : 'Venci o impulso'}</button><button disabled={Boolean(savingOutcome)} type="button" onClick={() => { setSaveError(null); setSavingOutcome(''); onClose() }}>Sair por agora</button></div></dialog>
}
