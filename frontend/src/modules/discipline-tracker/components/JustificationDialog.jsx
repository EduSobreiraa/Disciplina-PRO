import { useEffect, useRef, useState } from 'react'

export function JustificationDialog({ target, onSave, onClose }) {
  const [text, setText] = useState(target.text ?? '')
  const dialogRef = useRef(null)
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog.open) dialog.showModal()
    return () => { if (dialog.open) dialog.close() }
  }, [])
  return <dialog className="tracker-modal" ref={dialogRef} aria-labelledby="just-title" onCancel={(event) => { event.preventDefault(); onClose() }}><form onSubmit={(event) => { event.preventDefault(); onSave(text) }}><span>Causa real · Lei nº 6</span><h2 id="just-title">Justifique a marca vermelha</h2><p>{target.behaviorName} · dia {target.day}</p><textarea autoFocus value={text} onChange={(event) => setText(event.target.value)} placeholder="O que aconteceu, sem desculpas e sem julgamento?"/><div><button type="button" onClick={onClose}>Cancelar</button><button className="primary" disabled={!text.trim()} type="submit">Salvar causa</button></div></form></dialog>
}
