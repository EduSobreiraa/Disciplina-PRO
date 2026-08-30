import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { chmod, mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { test } from 'node:test'

const repositoryRoot = resolve(import.meta.dirname, '../..')
const backupScript = resolve(import.meta.dirname, 'backup-postgres-to-r2.sh')
const restoreScript = resolve(import.meta.dirname, 'restore-postgres-from-r2.sh')

function execute(script, environment) {
  return new Promise((resolveRun) => {
    const child = spawn(script, [], {
      cwd: repositoryRoot,
      env: { ...process.env, ...environment },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => { stdout += chunk })
    child.stderr.on('data', (chunk) => { stderr += chunk })
    child.on('close', (code) => resolveRun({ code, stdout, stderr }))
  })
}

async function writeExecutable(path, contents) {
  await writeFile(path, contents, 'utf8')
  await chmod(path, 0o755)
}

async function createHarness() {
  const root = await mkdtemp(resolve(tmpdir(), 'disciplina-pro-backup-test-'))
  const bin = resolve(root, 'bin')
  const objectStore = resolve(root, 'object-store')
  await Promise.all([mkdir(bin), mkdir(objectStore)])
  await writeExecutable(resolve(bin, 'pg_dump'), `#!/bin/sh
set -eu
for argument in "$@"; do
  case "$argument" in --file=*) output="\${argument#--file=}" ;; esac
done
printf 'deterministic fixture dump\\n' > "$output"
`)
  await writeExecutable(resolve(bin, 'aws'), `#!/bin/sh
set -eu
root="\${FAKE_R2_DIRECTORY:?}"
if [ "\${FAKE_AWS_FAIL:-}" = 'true' ]; then exit 1; fi
service="$3"
action="$4"
if [ "$service" = 's3' ] && [ "$action" = 'cp' ]; then
  source="$5"
  destination="$6"
  case "$source" in
    s3://*) object="\${source#s3://}"; key="\${object#*/}"; mkdir -p "$(dirname "$destination")"; cp "$root/$key" "$destination" ;;
    *) object="\${destination#s3://}"; key="\${object#*/}"; mkdir -p "$(dirname "$root/$key")"; cp "$source" "$root/$key" ;;
  esac
  exit 0
fi
if [ "$service" = 's3api' ] && [ "$action" = 'head-object' ]; then
  shift 4
  while [ "$#" -gt 0 ]; do
    if [ "$1" = '--key' ]; then key="$2"; break; fi
    shift
  done
  test -f "$root/$key"
  exit 0
fi
exit 64
`)
  await writeExecutable(resolve(bin, 'curl'), `#!/bin/sh
set -eu
: "\${FAKE_HEARTBEAT_MARKER:?}"
for argument in "$@"; do url="$argument"; done
test "$url" = "$BACKUP_HEARTBEAT_URL"
printf 'received\n' > "$FAKE_HEARTBEAT_MARKER"
`)
  await writeExecutable(resolve(bin, 'psql'), `#!/bin/sh
set -eu
case "$*" in
  *current_database*) printf '%s\\n' "$FAKE_DATABASE_NAME" ;;
  *) printf 'ok\\n' ;;
esac
`)
  await writeExecutable(resolve(bin, 'pg_restore'), `#!/bin/sh
set -eu
: "\${FAKE_RESTORE_MARKER:?}"
printf 'restored\\n' > "$FAKE_RESTORE_MARKER"
`)
  return {
    root,
    objectStore,
    environment: {
      PATH: `${bin}:${process.env.PATH}`,
      FAKE_R2_DIRECTORY: objectStore,
      FAKE_DATABASE_NAME: 'disciplina_pro_restore',
      FAKE_RESTORE_MARKER: resolve(root, 'restore.marker'),
      FAKE_HEARTBEAT_MARKER: resolve(root, 'heartbeat.marker'),
      DATABASE_URL: 'postgresql://backup:backup@localhost:5432/disciplina_pro_source',
      R2_ENDPOINT_URL: 'https://r2.test.invalid',
      R2_BUCKET: 'disciplina-pro-test',
      AWS_ACCESS_KEY_ID: 'test-access-key',
      AWS_SECRET_ACCESS_KEY: 'test-secret-key',
      BACKUP_HEARTBEAT_URL: 'https://heartbeat.test.invalid/backup',
    },
  }
}

test('backup uploads a checksum manifest and restore validates it before restoring', async () => {
  const harness = await createHarness()
  try {
    const backup = await execute(backupScript, harness.environment)
    assert.equal(backup.code, 0, backup.stderr)
    const directory = resolve(harness.objectStore, 'disciplina-pro/postgres')
    const objects = await readdir(directory)
    const dump = objects.find((name) => name.endsWith('.dump'))
    assert.ok(dump)
    const checksum = `${dump}.sha256`
    assert.ok(objects.includes(checksum))
    assert.equal(await readFile(harness.environment.FAKE_HEARTBEAT_MARKER, 'utf8'), 'received\n')
    await assert.doesNotReject(async () => {
      const manifest = await readFile(resolve(directory, checksum), 'utf8')
      assert.match(manifest, new RegExp(`^[a-f0-9]{64}  ${dump}\\n$`))
    })

    const restore = await execute(restoreScript, {
      ...harness.environment,
      RESTORE_TARGET_ENVIRONMENT: 'drill',
      RESTORE_CONFIRM: 'RESTORE_DISCARDABLE_DATABASE',
      RESTORE_DATABASE_URL: 'postgresql://restore:restore@localhost:5432/disciplina_pro_restore',
      RESTORE_EXPECTED_DATABASE_NAME: 'disciplina_pro_restore',
      R2_BACKUP_KEY: `disciplina-pro/postgres/${dump}`,
    })
    assert.equal(restore.code, 0, restore.stderr)
    assert.equal(await readFile(harness.environment.FAKE_RESTORE_MARKER, 'utf8'), 'restored\n')
  } finally {
    await rm(harness.root, { recursive: true, force: true })
  }
})

test('backup does not report a heartbeat when the R2 upload fails', async () => {
  const harness = await createHarness()
  try {
    const backup = await execute(backupScript, { ...harness.environment, FAKE_AWS_FAIL: 'true' })
    assert.notEqual(backup.code, 0)
    await assert.rejects(readFile(harness.environment.FAKE_HEARTBEAT_MARKER, 'utf8'), { code: 'ENOENT' })
  } finally {
    await rm(harness.root, { recursive: true, force: true })
  }
})

test('restore refuses a production target before invoking database tooling', async () => {
  const harness = await createHarness()
  try {
    const restore = await execute(restoreScript, {
      ...harness.environment,
      RESTORE_TARGET_ENVIRONMENT: 'production',
      RESTORE_CONFIRM: 'RESTORE_DISCARDABLE_DATABASE',
      RESTORE_DATABASE_URL: 'postgresql://restore:restore@localhost:5432/disciplina_pro_restore',
      RESTORE_EXPECTED_DATABASE_NAME: 'disciplina_pro_restore',
      R2_BACKUP_KEY: 'disciplina-pro/postgres/example.dump',
    })
    assert.notEqual(restore.code, 0)
    assert.match(restore.stderr, /produção é recusada/)
  } finally {
    await rm(harness.root, { recursive: true, force: true })
  }
})
