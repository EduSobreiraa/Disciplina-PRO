import { Link } from 'react-router-dom'
import { useProgramCatalog } from './hooks/useProgramCatalog'

export function ProgramsPage() {
  const catalog = useProgramCatalog()

  return (
    <>
      <section className="page-heading"><span className="eyebrow">Arsenal de desenvolvimento</span><h1>Programas <em>Spark</em></h1><p>Escolha uma jornada habilitada pela sua empresa e entre em campo.</p></section>
      {catalog.status === 'loading' && <section className="program-state" role="status">Carregando programas habilitados…</section>}
      {catalog.status === 'error' && <section className="program-state error" role="alert"><strong>Não foi possível carregar o catálogo.</strong><span>{catalog.error?.message}</span><button className="button" type="button" onClick={() => catalog.reload().catch(() => {})}>Tentar novamente</button></section>}
      {catalog.status === 'ready' && catalog.programs.length === 0 && <section className="program-state"><strong>Nenhum programa disponível.</strong><span>Sua organização ainda não habilitou uma jornada para você.</span></section>}
      <section className="program-grid">
        {catalog.programs.map((program) => (
          <article className="program-card" key={program.id}>
            <div className="program-card-top"><span className="tag">{program.enrollment ? 'Inscrito' : 'Disponível'}</span><strong>{program.version.durationDays}</strong></div>
            <h2>{program.version.title}</h2><p>{program.summary}</p>
            <footer><span>{program.version.durationDays} dias</span><Link to={`/app/programas/${program.slug}`}>Entrar no programa →</Link></footer>
          </article>
        ))}
      </section>
    </>
  )
}
