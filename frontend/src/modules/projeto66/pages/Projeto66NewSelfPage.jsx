import { useState } from 'react'
import { projeto66PrivateLocalRepository } from '../repositories/projeto66-private.local.repository'

const ALIGNMENT = Object.freeze({ UNANSWERED: 'unanswered', ALIGNED: 'aligned', TRAINING: 'training' })

export function Projeto66NewSelfPage() {
  const initial = projeto66PrivateLocalRepository.loadPrivateState()
  const [definition, setDefinition] = useState(initial.newSelfDefinition)
  const [alignment, setAlignment] = useState(ALIGNMENT.UNANSWERED)
  const [difficultNote, setDifficultNote] = useState('')
  const [message, setMessage] = useState('')
  function saveDefinition() { projeto66PrivateLocalRepository.saveNewSelfDefinition(definition); setMessage('Definição do Novo Eu salva.') }
  function saveCheckin() { projeto66PrivateLocalRepository.saveNewSelfCheckin({ alignment: alignment === ALIGNMENT.ALIGNED, occurredAt: new Date().toISOString() }); setMessage('Check-in privado registrado.') }
  function saveDifficultDay() { projeto66PrivateLocalRepository.saveDifficultDay({ note: difficultNote, occurredAt: new Date().toISOString() }); setDifficultNote(''); setMessage('Dia difícil acolhido e registrado.') }
  return <><header className="p66-page-title"><span>Identidade em construção</span><h1>Novo Eu</h1></header><section className="p66-private-card"><span>🔒 Declaração pessoal</span><h2>Quem você decidiu ser?</h2><textarea value={definition} onChange={(event) => setDefinition(event.target.value)} placeholder="Eu sou o tipo de pessoa que…"/><button className="p66-primary" disabled={!definition.trim()} type="button" onClick={saveDefinition}>Salvar minha definição</button></section><section className="p66-private-card"><span>Check-in de hoje</span><h2>Você agiu como o Novo Eu?</h2><div className="p66-alignment"><button className={alignment === ALIGNMENT.ALIGNED ? 'selected' : ''} type="button" onClick={() => setAlignment(ALIGNMENT.ALIGNED)}>✓ Sim, sustentei</button><button className={alignment === ALIGNMENT.TRAINING ? 'selected' : ''} type="button" onClick={() => setAlignment(ALIGNMENT.TRAINING)}>↺ Ainda estou treinando</button></div><button className="p66-primary" disabled={alignment === ALIGNMENT.UNANSWERED} type="button" onClick={saveCheckin}>Registrar check-in</button></section><section className="p66-private-card difficult"><span>Dia difícil</span><h2>Nomeie sem se julgar</h2><textarea value={difficultNote} onChange={(event) => setDifficultNote(event.target.value)} placeholder="O que tornou este dia difícil?"/><button className="p66-primary" disabled={!difficultNote.trim()} type="button" onClick={saveDifficultDay}>Guardar registro privado</button></section>{message && <div className="p66-saved" role="status">✓ {message}</div>}</>
}
