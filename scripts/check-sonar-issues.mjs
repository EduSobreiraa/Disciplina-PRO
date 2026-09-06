const projectKey = 'EduSobreiraa_Disciplina-PRO'
const organization = 'edusobreiraa'
const token = process.env.SONAR_TOKEN
const branch = process.env.SONAR_BRANCH ?? 'main'

if (!token) throw new Error('SONAR_TOKEN é obrigatório para consultar issues do projeto privado')

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
