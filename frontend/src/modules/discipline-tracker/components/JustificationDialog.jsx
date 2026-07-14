import { useState } from 'react'

export function JustificationDialog({ target, onSave, onClose }) {
  const [text, setText] = useState(target.text ?? '')
  return <div className="tracker-modal" role="dialog" aria-modal="true" aria-labelledby="just-title"><form onSubmit={(event) => { event.preventDefault(); onSave(text) }}><span>Causa real · Lei nº 6</span><h2 id="just-title">Justifique a marca vermelha</h2><p>{target.behaviorName} · dia {target.day}</p><textarea autoFocus value={text} onChange={(event) => setText(event.target.value)} placeholder="O que aconteceu, sem desculpas e sem julgamento?"/><div><button type="button" onClick={onClose}>Cancelar</button><button className="primary" disabled={!text.trim()} type="submit">Salvar causa</button></div></form></div>
}
