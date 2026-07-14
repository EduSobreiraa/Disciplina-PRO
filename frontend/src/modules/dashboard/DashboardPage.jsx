import { Link } from 'react-router-dom'

export function DashboardPage() {
  return (
    <>
      <section className="page-heading">
        <span className="eyebrow">Painel de comando</span>
        <h1>Bom dia, <em>Eduardo.</em></h1>
        <p>Disciplina não se cobra no fim do mês. Conquista-se uma decisão por vez.</p>
      </section>
      <section className="metric-grid" aria-label="Resumo">
        <article className="metric-card red"><span>Programas ativos</span><strong>0</strong><small>1 programa disponível</small></article>
        <article className="metric-card green"><span>Disciplina geral</span><strong>—</strong><small>Comece sua primeira jornada</small></article>
        <article className="metric-card gold"><span>XP acumulado</span><strong>0</strong><small>Nível 1 · Recruta</small></article>
        <article className="metric-card ember"><span>Sequência atual</span><strong>0 <b>dias</b></strong><small>Sua próxima decisão conta</small></article>
      </section>
      <section className="featured-program">
        <div>
          <span className="eyebrow">Programa Spark · Disponível</span>
          <h2>Projeto <em>66</em></h2>
          <p>Quebre padrões automáticos, construa uma nova forma de agir e consolide sua identidade por meio da execução diária.</p>
          <div className="program-meta"><span>3 fases</span><span>66 dias</span><span>Jornada individual</span></div>
          <Link className="button" to="/app/programas/projeto66">Acessar programa</Link>
        </div>
        <div className="program-seal"><span>Projeto</span><strong>66</strong><small>O Incendiário</small></div>
      </section>
      <section className="dashboard-lower"><article><span className="eyebrow">Atividade recente</span><h2>A sala ainda está em silêncio.</h2><p>Inicie um programa para registrar suas primeiras ações.</p></article><article><span className="eyebrow">Próxima conquista</span><div className="achievement-row"><b>🌱</b><div><h2>Primeira atividade</h2><p>Conclua uma atividade obrigatória.</p></div></div></article></section>
    </>
  )
}
