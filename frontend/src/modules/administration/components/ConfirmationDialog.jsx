import { useEffect, useRef } from 'react'

export function ConfirmationDialog({ actionLabel, description, onCancel, onConfirm, title }) {
  const cancelRef = useRef(null)
  const openerRef = useRef(null)

  useEffect(() => {
    openerRef.current = document.activeElement
    cancelRef.current?.focus()
    function onKeyDown(event) {
      if (event.key === 'Escape') onCancel()
      if (event.key !== 'Tab') return
      const buttons = [...document.querySelectorAll('.admin-dialog button:not(:disabled)')]
      const first = buttons[0]
      const last = buttons.at(-1)
      if (!first || !last) return
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('keydown', onKeyDown); openerRef.current?.focus?.() }
  }, [onCancel])

  return <div className="admin-dialog-backdrop"><section aria-describedby="confirmation-description" aria-labelledby="confirmation-title" aria-modal="true" className="admin-dialog" role="alertdialog"><span className="eyebrow">Confirmar ação</span><h3 id="confirmation-title">{title}</h3><p id="confirmation-description">{description}</p><div><button ref={cancelRef} type="button" onClick={onCancel}>Cancelar</button><button className="button" type="button" onClick={onConfirm}>{actionLabel}</button></div></section></div>
}
