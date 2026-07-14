import { panelLaws, scoreBands } from '../data/discipline-content'
import '../styles/discipline-content.css'

export function ProtocolPage() {
  return <><header className="page-title"><span className="eyebrow">Sala de Guerra</span><h1>Protocolo de <em>disciplina</em></h1><p>O painel não mede intenção. Mede comportamento entregue e responsabilidade registrada.</p></header>
    <h2 className="content-section-title">Critérios de pontuação</h2><section className="score-bands">{scoreBands.map((band) => <article className={band.tone} key={band.range}><strong>{band.range}</strong><div><h3>{band.status}</h3><p>{band.consequence}</p></div></article>)}</section>
    <h2 className="content-section-title">As seis leis do painel</h2><section className="panel-laws">{panelLaws.map(([title, description], index) => <article key={title}><b>{index + 1}</b><div><h3>{title}</h3><p>{description}</p></div></article>)}</section>
    <aside className="protocol-note">▸ Adapte os horários ao turno, mantendo a sequência: abertura → execução → fechamento.</aside>
  </>
}
