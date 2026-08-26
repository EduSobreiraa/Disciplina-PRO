import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'

const execute = promisify(execFile)

export default async function globalSetup() {
  const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
  await execute('npm', ['run', 'test:e2e:seed', '--workspace', 'backend'], {
    cwd: repositoryRoot,
    env: { ...process.env, NODE_ENV: 'test', E2E_DATABASE_RESET: 'reset-disciplina-pro-browser-e2e' },
  })
}
