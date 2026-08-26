import { useState } from 'react'
import { useCountdownTimer } from '../hooks/useCountdownTimer'
import { useProjeto66Cycle } from '../hooks/useProjeto66Cycle'
import { PROJETO66_ACTIVITY_KEYS } from '../data/projeto66-contract'

const modes = [{ minutes: 5, label: 'Respiração' }, { minutes: 10, label: 'Quebra' }, { minutes: 15, label: 'Novo Eu' }]
const format = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`

export function Projeto66MeditationPage() {
  const execution = useProjeto66Cycle()
  const [mode, setMode] = useState(modes[1])
  const [note, setNote] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const timer = useCountdownTimer(mode.minutes * 60)
  function selectMode(next) { setMode(next); timer.reset(next.minutes * 60); setSaved(false) }
  async function save() {
    setSaving(true)
    setSaveError(null)
    try {
      await execution.savePrivateResponse(PROJETO66_ACTIVITY_KEYS.meditation, {
        mode: mode.label,
        durationMinutes: mode.minutes,
        note,
        completedAt: new Date().toISOString(),
      })
      setSaved(true)
    } catch {
      setSaveError('Não foi possível salvar sua meditação.')
    } finally {
      setSaving(false)
    }
  }
  return <><header className="p66-page-title"><span>Presença e reprogramação</span><h1>Meditar</h1></header><div className="p66-mode-row">{modes.map((item) => <button className={mode.minutes === item.minutes ? 'active' : ''} key={item.minutes} type="button" onClick={() => selectMode(item)}><b>{item.minutes}</b><span>min · {item.label}</span></button>)}</div><section className={`p66-meditation ${timer.running ? 'running' : ''}`}><div className="p66-breath-orb"><i /></div><small>{timer.running ? 'Respire com o círculo' : mode.label}</small><strong>{format(timer.seconds)}</strong><button type="button" onClick={timer.toggle}>{timer.running ? 'Pausar' : timer.complete ? 'Concluído' : 'Iniciar'}</button><button className="secondary" type="button" onClick={() => timer.reset(mode.minutes * 60)}>Reiniciar</button></section><section className="p66-private-card"><span>🔒 Registro pessoal</span><h2>O que você observou?</h2><label htmlFor="meditation-note">Observações da meditação</label><textarea id="meditation-note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Pensamentos, sensações e percepções…"/><button className="p66-primary" type="button" disabled={!timer.complete || saved || saving} onClick={save}>{saved ? 'Meditação registrada' : saving ? 'Salvando…' : saveError ? 'Tentar novamente' : 'Salvar no histórico privado'}</button>{saveError && <p className="p66-action-error" role="alert">{saveError}</p>}</section></>
}
