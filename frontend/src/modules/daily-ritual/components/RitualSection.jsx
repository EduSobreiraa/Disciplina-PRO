import { getSectionProgress } from '../services/ritual-progress'

export function RitualSection({ section, checks, onToggle }) {
  const progress = getSectionProgress(section.items, checks)
  return <article className={`ritual-section ${section.tone}`}><header><span>{section.schedule}</span><h2>{section.title}</h2><div><i style={{ width: `${progress.percent}%` }} /></div><small>{progress.completed}/{progress.total} · {progress.percent}% concluído</small></header>
    <div className="ritual-checklist">{section.items.map(([title, description], index) => { const checked = Boolean(checks?.[index]); return <button className={checked ? 'checked' : ''} type="button" key={title} onClick={() => onToggle(section.key, index)} aria-pressed={checked}><i>{checked ? '✓' : ''}</i><span><strong>{title}:</strong> {description}</span></button> })}</div>
  </article>
}
