import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, extname, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const ignoredDirectories = new Set(['.git', 'coverage', 'dist', 'node_modules'])

function markdownFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = resolve(directory, entry)
    if (statSync(path).isDirectory()) {
      return ignoredDirectories.has(entry) ? [] : markdownFiles(path)
    }
    return extname(path).toLowerCase() === '.md' ? [path] : []
  })
}

const packages = {
  root: JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')),
  backend: JSON.parse(readFileSync(resolve(root, 'backend/package.json'), 'utf8')),
  frontend: JSON.parse(readFileSync(resolve(root, 'frontend/package.json'), 'utf8')),
}
const allScripts = new Set(Object.values(packages).flatMap(({ scripts = {} }) => Object.keys(scripts)))
const errors = []

for (const file of markdownFiles(root)) {
  const content = readFileSync(file, 'utf8')
  const relativeFile = file.slice(root.length + 1)

  for (const match of content.matchAll(/\[[^\]]*]\(([^)]+)\)/g)) {
    const target = match[1].trim().replace(/^<|>$/g, '')
    const path = target.split('#')[0]
    if (!path || path.startsWith('#') || /^[a-z][a-z\d+.-]*:/i.test(path)) continue
    const resolvedTarget = resolve(dirname(file), decodeURIComponent(path))
    if (!existsSync(resolvedTarget)) errors.push(`${relativeFile}: link local inexistente: ${target}`)
  }

  for (const match of content.matchAll(/npm run ([\w:-]+)(?:\s+--workspace\s+(backend|frontend))?/g)) {
    const [, script, workspace] = match
    const exists = workspace
      ? Boolean(packages[workspace].scripts?.[script])
      : allScripts.has(script)
    if (!exists) errors.push(`${relativeFile}: script npm inexistente: ${script}${workspace ? ` (${workspace})` : ''}`)
  }
}

if (errors.length) {
  console.error(errors.join('\n'))
  process.exitCode = 1
} else {
  console.log('Documentação válida: links locais e comandos npm encontrados.')
}
