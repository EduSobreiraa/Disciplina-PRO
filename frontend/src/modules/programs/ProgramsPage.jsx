import { Link } from 'react-router-dom'
import { programs } from './programs.mock'

export function ProgramsPage() {
  return (
    <>
      <section className="page-heading"><span className="eyebrow">Arsenal de desenvolvimento</span><h1>Programas <em>Spark</em></h1><p>Escolha uma jornada habilitada pela sua empresa e entre em campo.</p></section>
      <section className="program-grid">
        {programs.map((program) => (
          <article className="program-card" key={program.id}>
            <div className="program-card-top"><span className="tag">Disponível</span><strong>66</strong></div>
            <h2>{program.name}</h2><p>{program.description}</p>
            <footer><span>{program.duration} · 3 fases</span><Link to={`/app/programas/${program.id}`}>Entrar no programa →</Link></footer>
          </article>
        ))}
      </section>
    </>
  )
}
