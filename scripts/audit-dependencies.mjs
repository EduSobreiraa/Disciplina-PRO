import { spawnSync } from 'node:child_process'

const acceptedAdvisories = new Map([
  [
    'GHSA-qwww-vcr4-c8h2',
    {
      packages: new Set(['react-router', 'react-router-dom']),
      reason: 'O frontend usa BrowserRouter/Vite e não habilita o modo RSC afetado.',
    },
  ],
])

const severityWeight = {
  info: 0,
  low: 1,
  moderate: 2,
  high: 3,
  critical: 4,
}

const audit = spawnSync(
  process.platform === 'win32' ? 'npm.cmd' : 'npm',
  ['audit', '--workspaces', '--audit-level=high', '--json'],
  { encoding: 'utf8' },
)

if (audit.error || !audit.stdout) {
  console.error(audit.error?.message ?? audit.stderr ?? 'npm audit não retornou um relatório.')
  process.exit(1)
}

let report
try {
  report = JSON.parse(audit.stdout)
} catch {
  console.error(audit.stderr || audit.stdout)
  process.exit(1)
}

if (report.error) {
  console.error(report.error.summary || report.error.detail || report.message)
  process.exit(1)
}

const vulnerabilities = report.vulnerabilities ?? {}

function advisoryIdsFor(name, visited = new Set()) {
  if (visited.has(name)) return new Set()
  visited.add(name)

  const ids = new Set()
  for (const cause of vulnerabilities[name]?.via ?? []) {
    if (typeof cause === 'string') {
      for (const id of advisoryIdsFor(cause, visited)) ids.add(id)
      continue
    }

    const match = cause.url?.match(/GHSA-[\w-]+/i)
    if (match) ids.add(match[0])
  }
  return ids
}

const blocking = []
const accepted = []

for (const [name, vulnerability] of Object.entries(vulnerabilities)) {
  if ((severityWeight[vulnerability.severity] ?? 0) < severityWeight.high) continue

  const advisoryIds = advisoryIdsFor(name)
  const isAccepted =
    advisoryIds.size > 0 &&
    [...advisoryIds].every((id) => acceptedAdvisories.get(id)?.packages.has(name))

  const destination = isAccepted ? accepted : blocking
  destination.push({ name, severity: vulnerability.severity, advisoryIds })
}

for (const item of accepted) {
  const ids = [...item.advisoryIds].join(', ')
  const reason = [...item.advisoryIds]
    .map((id) => acceptedAdvisories.get(id)?.reason)
    .filter(Boolean)
    .join(' ')
  console.warn(`Exceção registrada: ${item.name} (${ids}). ${reason}`)
}

if (blocking.length > 0) {
  for (const item of blocking) {
    console.error(
      `Vulnerabilidade ${item.severity}: ${item.name} (${[...item.advisoryIds].join(', ') || 'sem GHSA identificado'})`,
    )
  }
  process.exit(1)
}

console.log(`Auditoria aprovada: ${accepted.length} ocorrência(s) aceita(s), nenhuma vulnerabilidade alta nova.`)
