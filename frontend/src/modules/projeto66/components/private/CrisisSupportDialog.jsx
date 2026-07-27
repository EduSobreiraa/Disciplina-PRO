import { useState } from 'react'
import { useProjeto66Cycle } from '../../hooks/useProjeto66Cycle'
import { PROJETO66_ACTIVITY_KEYS } from '../../data/projeto66-contract'

const phrases = ['Você não é sua reação automática.', 'O velho eu quer reagir. O novo eu escolhe.', 'Respire. Cada segundo é uma vitória.', 'Você está quebrando o padrão agora.']

export function CrisisSupportDialog({ open, onClose }) {
  const execution = useProjeto66Cycle()
  const [breaths, setBreaths] = useState(0)
  if (!open) return null
  async function finish(outcome) {
    await execution.savePrivateResponse(PROJETO66_ACTIVITY_KEYS.crisisSupport, { outcome, breaths, occurredAt: new Date().toISOString() })
    setBreaths(0)
    onClose()
  }
  return <div className="p66-crisis" role="dialog" aria-modal="true" aria-labelledby="crisis-title"><span>🫁</span><small>Modo crise · conteúdo privado</small><h2 id="crisis-title">Pare. Respire. Escolha.</h2><p>{phrases[Math.min(breaths, phrases.length - 1)]}</p><button className="p66-breath" type="button" onClick={() => setBreaths((value) => value + 1)}><b>{breaths < 4 ? 'Inspirar e soltar' : 'Estou no controle'}</b><small>{breaths} respirações conscientes</small></button><div><button type="button" onClick={() => finish('overcame')}>Venci o impulso</button><button type="button" onClick={() => finish('withdrew')}>Sair por agora</button></div></div>
}
