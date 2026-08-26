import { useState } from 'react'
import { ConfirmationDialog } from './ConfirmationDialog'

export function TeamAdministrationPanel({ administration }) {
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [teamToArchive, setTeamToArchive] = useState(null)

  async function create(event) {
    event.preventDefault()
    if (await administration.createTeam(newName.trim())) setNewName('')
  }

  async function rename(event, teamId) {
    event.preventDefault()
    if (await administration.renameTeam(teamId, editingName.trim())) setEditingId(null)
  }

  return <section className="admin-panel"><header><div><span>Times da organização</span><h2>{administration.teams.filter(({ archivedAt }) => !archivedAt).length} ativos</h2></div></header>
    <form className="admin-team-form" onSubmit={(event) => create(event).catch(() => {})}><label htmlFor="new-team">Novo time</label><div><input id="new-team" minLength="2" maxLength="160" required value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Ex.: Operações" /><button className="button" disabled={administration.mutating} type="submit">Criar</button></div></form>
    <div className="admin-list">{administration.teams.length ? administration.teams.map((team) => <article className={team.archivedAt ? 'archived' : ''} key={team.id}><div className="admin-team-mark">#</div><div>{editingId === team.id ? <form className="admin-rename" onSubmit={(event) => rename(event, team.id).catch(() => {})}><input aria-label={`Novo nome de ${team.name}`} minLength="2" maxLength="160" required value={editingName} onChange={(event) => setEditingName(event.target.value)} /><button disabled={administration.mutating} type="submit">Salvar</button><button type="button" onClick={() => setEditingId(null)}>Cancelar</button></form> : <><strong>{team.name}</strong><span>{team.archivedAt ? 'Arquivado' : 'Ativo'}</span></>}</div><div className="admin-team-actions">{!team.archivedAt && editingId !== team.id && <button disabled={administration.mutating} type="button" onClick={() => { setEditingId(team.id); setEditingName(team.name) }}>Renomear</button>}{team.archivedAt ? <button disabled={administration.mutating} type="button" onClick={() => administration.restoreTeam(team.id).catch(() => {})}>Restaurar</button> : <button disabled={administration.mutating} type="button" onClick={() => setTeamToArchive(team)}>Arquivar</button>}</div></article>) : <p className="admin-empty">Nenhum time cadastrado.</p>}</div>
    {teamToArchive && <ConfirmationDialog actionLabel="Arquivar time" description="Os vínculos ativos serão encerrados." onCancel={() => setTeamToArchive(null)} onConfirm={() => administration.archiveTeam(teamToArchive.id).then(() => setTeamToArchive(null)).catch(() => {})} title={`Arquivar ${teamToArchive.name}?`} />}
  </section>
}
