import { useState } from 'react'
import { useCountdownTimer } from '../hooks/useCountdownTimer'
import { projeto66PrivateLocalRepository } from '../repositories/projeto66-private.local.repository'

const modes = [{ minutes: 5, label: 'Respiração' }, { minutes: 10, label: 'Quebra' }, { minutes: 15, label: 'Novo Eu' }]
const format = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`

export function Projeto66MeditationPage() {
  const [mode, setMode] = useState(modes[1])
  const [note, setNote] = useState('')
  const [saved, setSaved] = useState(false)
  const timer = useCountdownTimer(mode.minutes * 60)
  function selectMode(next) { setMode(next); timer.reset(next.minutes * 60); setSaved(false) }
  function save() { projeto66PrivateLocalRepository.saveMeditation({ mode: mode.label, durationMinutes: mode.minutes, note, completedAt: new Date().toISOString() }); setSaved(true) }
  return <><header className="p66-page-title"><span>Presença e reprogramação</span><h1>Meditar</h1></header><div className="p66-mode-row">{modes.map((item) => <button className={mode.minutes === item.minutes ? 'active' : ''} key={item.minutes} type="button" onClick={() => selectMode(item)}><b>{item.minutes}</b><span>min · {item.label}</span></button>)}</div><section className={`p66-meditation ${timer.running ? 'running' : ''}`}><div className="p66-breath-orb"><i /></div><small>{timer.running ? 'Respire com o círculo' : mode.label}</small><strong>{format(timer.seconds)}</strong><button type="button" onClick={timer.toggle}>{timer.running ? 'Pausar' : timer.complete ? 'Concluído' : 'Iniciar'}</button><button className="secondary" type="button" onClick={() => timer.reset(mode.minutes * 60)}>Reiniciar</button></section><section className="p66-private-card"><span>🔒 Registro pessoal</span><h2>O que você observou?</h2><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Pensamentos, sensações e percepções…"/><button className="p66-primary" type="button" disabled={!timer.complete || saved} onClick={save}>{saved ? 'Meditação registrada' : 'Salvar no histórico privado'}</button></section></>
}
