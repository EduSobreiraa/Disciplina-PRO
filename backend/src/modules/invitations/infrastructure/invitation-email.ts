import type { InvitationDeliveryMessage } from '../application/invitation-delivery.js'

export function invitationEmail(message: InvitationDeliveryMessage, acceptanceUrl: string, from: string) {
  const link = `${acceptanceUrl}#token=${encodeURIComponent(message.token)}`
  const htmlLink = link.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  return {
    from,
    to: message.email,
    subject: 'Seu convite para o Disciplina PRO',
    text: ['Você recebeu um convite para o Disciplina PRO.', `Abra o link: ${link}`, `Este convite expira em ${message.expiresAt.toISOString()}.`].join('\n\n'),
    html: ['<p>Você recebeu um convite para o Disciplina PRO.</p>', `<p><a href="${htmlLink}">Aceitar convite</a></p>`, `<p>Este convite expira em ${message.expiresAt.toISOString()}.</p>`].join(''),
  }
}
