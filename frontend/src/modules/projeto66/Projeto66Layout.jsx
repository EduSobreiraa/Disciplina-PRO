import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { CrisisSupportDialog } from './components/private/CrisisSupportDialog'
import { Projeto66Provider } from './Projeto66Provider'
import { useProjeto66Context } from './projeto66-context'
import './styles/projeto66.css'
import './styles/checklist.css'
import './styles/private-tools.css'
import './styles/navigation.css'

const programLinks = [
  { to: '/app/programas/projeto-66', label: 'Hoje', icon: '⌂', end: true },
  { to: '/app/programas/projeto-66/hoje', label: 'Checklist', icon: '✓' },
  { to: '/app/programas/projeto-66/meditar', label: 'Meditar', icon: '◷' },
  { to: '/app/programas/projeto-66/registrar', label: 'Registrar', icon: '+' },
  { to: '/app/programas/projeto-66/novo-eu', label: 'Novo Eu', icon: '★' },
  { to: '/app/programas/projeto-66/jornada', label: 'Jornada', icon: '🔥' },
  { to: '/app/programas/projeto-66/progresso', label: 'Tracker', icon: '⌁' },
]

function Projeto66Shell() {
  const [crisisOpen, setCrisisOpen] = useState(false)
  const execution = useProjeto66Context()
  if (execution.status === 'loading') return <section className="p66-app"><div className="p66-content"><p>Carregando seu ciclo…</p></div></section>
  if (execution.status === 'error') return <section className="p66-app"><div className="p66-content"><section className="p66-callout"><b>!</b><p>{execution.error.message}</p></section><button className="p66-primary" type="button" onClick={() => execution.reload()}>Tentar novamente</button></div></section>
  return (
    <section className="p66-app">
      <header className="p66-header">
        <div><NavLink className="p66-back" to="/app/programas">‹ Disciplina PRO</NavLink><span>O Incendiário × Spark</span><strong>Protocolo <em>66</em></strong></div>
        <span className="p66-day-badge">{execution.cycle.status === 'ACTIVE' ? `Dia ${execution.cycle.currentDay}` : execution.cycle.status}</span>
      </header>
      <div className="p66-content"><Outlet /></div>
      <button className="p66-crisis-fab" type="button" aria-label="Abrir modo crise" onClick={() => setCrisisOpen(true)}>🆘</button>
      <CrisisSupportDialog open={crisisOpen} onClose={() => setCrisisOpen(false)} />
      <nav className="p66-tabbar" aria-label="Navegação do Projeto 66">
        {programLinks.map((link) => <NavLink key={link.to} to={link.to} end={link.end}><b>{link.icon}</b><span>{link.label}</span></NavLink>)}
      </nav>
    </section>
  )
}

export function Projeto66Layout() {
  return <Projeto66Provider><Projeto66Shell /></Projeto66Provider>
}
