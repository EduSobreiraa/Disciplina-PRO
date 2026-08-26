import { useEffect, useState } from 'react'
import { useProjeto66Cycle } from '../hooks/useProjeto66Cycle'
import { PROJETO66_ACTIVITY_KEYS } from '../data/projeto66-contract'

const ALIGNMENT = Object.freeze({ UNANSWERED: 'unanswered', ALIGNED: 'aligned', TRAINING: 'training' })

export function Projeto66NewSelfPage() {
  const execution = useProjeto66Cycle()
  const loadPrivateResponse = execution.loadPrivateResponse
  const [definition, setDefinition] = useState('')
  const [alignment, setAlignment] = useState(ALIGNMENT.UNANSWERED)
  const [difficultNote, setDifficultNote] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(null)
  const [saveError, setSaveError] = useState(null)
  useEffect(() => {
    let active = true
    loadPrivateResponse(PROJETO66_ACTIVITY_KEYS.newSelfDefinition)
      .then((payload) => { if (active && typeof payload?.definition === 'string') setDefinition(payload.definition) })
      .catch(() => undefined)
    return () => { active = false }
  }, [loadPrivateResponse])
  async function saveDefinition() {
    await save('definition', () => execution.savePrivateResponse(PROJETO66_ACTIVITY_KEYS.newSelfDefinition, { definition, updatedAt: new Date().toISOString() }), 'Definição do Novo Eu salva.')
  }
  async function saveCheckin() {
    await save('checkin', () => execution.savePrivateResponse(PROJETO66_ACTIVITY_KEYS.newSelfCheckin, { alignment: alignment === ALIGNMENT.ALIGNED, occurredAt: new Date().toISOString() }), 'Check-in privado registrado.')
  }
  async function saveDifficultDay() {
    await save('difficult', () => execution.savePrivateResponse(PROJETO66_ACTIVITY_KEYS.difficultDay, { note: difficultNote, occurredAt: new Date().toISOString() }), 'Dia difícil acolhido e registrado.', () => setDifficultNote(''))
  }
  async function save(key, operation, successMessage, afterSave) {
    setSaving(key)
    setSaveError(null)
    try {
      await operation()
      afterSave?.()
      setMessage(successMessage)
    } catch {
      setSaveError(key)
    } finally {
      setSaving(null)
    }
  }
  return <><header className="p66-page-title"><span>Identidade em construção</span><h1>Novo Eu</h1></header><section className="p66-private-card"><span>🔒 Declaração pessoal</span><h2>Quem você decidiu ser?</h2><label htmlFor="new-self-definition">Declaração do Novo Eu</label><textarea id="new-self-definition" value={definition} onChange={(event) => setDefinition(event.target.value)} placeholder="Eu sou o tipo de pessoa que…"/><button className="p66-primary" disabled={!definition.trim() || saving === 'definition'} type="button" onClick={saveDefinition}>{saving === 'definition' ? 'Salvando…' : saveError === 'definition' ? 'Tentar novamente' : 'Salvar minha definição'}</button></section><section className="p66-private-card"><span>Check-in de hoje</span><h2>Você agiu como o Novo Eu?</h2><div className="p66-alignment"><button className={alignment === ALIGNMENT.ALIGNED ? 'selected' : ''} type="button" onClick={() => setAlignment(ALIGNMENT.ALIGNED)}>✓ Sim, sustentei</button><button className={alignment === ALIGNMENT.TRAINING ? 'selected' : ''} type="button" onClick={() => setAlignment(ALIGNMENT.TRAINING)}>↺ Ainda estou treinando</button></div><button className="p66-primary" disabled={alignment === ALIGNMENT.UNANSWERED || saving === 'checkin'} type="button" onClick={saveCheckin}>{saving === 'checkin' ? 'Salvando…' : saveError === 'checkin' ? 'Tentar novamente' : 'Registrar check-in'}</button></section><section className="p66-private-card difficult"><span>Dia difícil</span><h2>Nomeie sem se julgar</h2><label htmlFor="difficult-day-note">Registro do dia difícil</label><textarea id="difficult-day-note" value={difficultNote} onChange={(event) => setDifficultNote(event.target.value)} placeholder="O que tornou este dia difícil?"/><button className="p66-primary" disabled={!difficultNote.trim() || saving === 'difficult'} type="button" onClick={saveDifficultDay}>{saving === 'difficult' ? 'Salvando…' : saveError === 'difficult' ? 'Tentar novamente' : 'Guardar registro privado'}</button></section>{saveError && <p className="p66-action-error" role="alert">Não foi possível salvar o conteúdo privado.</p>}{message && <div className="p66-saved" role="status">✓ {message}</div>}</>
}
