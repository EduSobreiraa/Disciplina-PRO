import { readFileSync } from 'node:fs'

const sonarProperties = new Map(
  readFileSync(new URL('../sonar-project.properties', import.meta.url), 'utf8')
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const separator = line.indexOf('=')
      return [line.slice(0, separator), line.slice(separator + 1)]
    }),
)

const projectKey = process.env.SONAR_PROJECT_KEY ?? sonarProperties.get('sonar.projectKey')
const organization = process.env.SONAR_ORGANIZATION ?? sonarProperties.get('sonar.organization')
const token = process.env.SONAR_TOKEN
const branch = process.env.SONAR_BRANCH ?? 'main'

if (!token) throw new Error('SONAR_TOKEN é obrigatório para consultar issues do projeto privado')
if (!projectKey || !organization) {
  throw new Error('sonar.projectKey e sonar.organization são obrigatórios em sonar-project.properties')
}

const query = new URLSearchParams({
  componentKeys: projectKey,
  organization,
  branch,
  issueStatuses: 'OPEN,CONFIRMED',
  sinceLeakPeriod: 'true',
  ps: '100',
})
const response = await fetch(`https://sonarcloud.io/api/issues/search?${query}`, {
  headers: { Authorization: `Basic ${Buffer.from(`${token}:`).toString('base64')}` },
})
if (!response.ok) throw new Error(`Consulta de issues do Sonar falhou com HTTP ${response.status}`)

const result = await response.json()
for (const issue of result.issues) {
  const component = issue.component.replace(`${projectKey}:`, '')
  console.error(`${issue.severity} ${issue.rule} ${component}:${issue.line ?? '-'} ${issue.message}`)
}

if (result.total > 0) throw new Error(`Sonar encontrou ${result.total} issue(s) aberta(s) no código novo`)
console.log('Sonar sem issues abertas no código novo.')
