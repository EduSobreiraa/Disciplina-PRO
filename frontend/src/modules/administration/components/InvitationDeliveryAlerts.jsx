const reasons = {
  PERMANENT: 'Falha definitiva ou bloqueio de envio. Confirme o endereço e a causa antes de qualquer reenvio.',
  AMBIGUOUS: 'Não foi possível confirmar o resultado do envio. Verifique antes de reenviar para evitar duplicação.',
  EXHAUSTED: 'A única tentativa automática de reenvio falhou. É necessária uma revisão manual.',
  INTERRUPTED: 'O processamento foi interrompido. Verifique o resultado antes de reenviar.',
}

const notices = {
  PENDING: 'Aviso ao administrador aguardando processamento.',
  CLAIMED: 'Aviso ao administrador em processamento.',
  SENT: 'Aviso aceito pelo provedor de e-mail; recebimento ainda não confirmado.',
  FAILED: 'O envio do aviso ao administrador falhou.',
  BLOCKED: 'Aviso por e-mail bloqueado: verifique destinatário ativo, restrições do laboratório ou supressão.',
  UNCERTAIN: 'Não foi possível confirmar o envio do aviso. Ele não será repetido automaticamente.',
}

export function InvitationDeliveryAlerts({ invitations }) {
  const reviews = invitations.filter(({ deliveryReview }) => deliveryReview)
  if (!reviews.length) return null
  return <section aria-label="Entregas que precisam de revisão">
    {reviews.map(({ id, email, deliveryReview }) => <div key={id} className="admin-delivery failed">
      <strong>Entrega precisa de revisão: {email}</strong>
      <p>{reasons[deliveryReview.reason] ?? 'O envio automático foi interrompido. Revise a entrega antes de reenviar.'}</p>
      <p>{notices[deliveryReview.noticeStatus] ?? 'Consulte o responsável pela operação para verificar o aviso.'}</p>
    </div>)}
  </section>
}
