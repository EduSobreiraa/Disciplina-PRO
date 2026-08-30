import { generateSecurityMaterial } from '../config/security-material.js'

const keyId = process.argv[2]

if (!keyId) {
  process.stderr.write('Uso: npm run security:generate --workspace backend -- <kid>\n')
  process.exitCode = 2
} else {
  try {
    const material = generateSecurityMaterial(keyId)
    process.stderr.write('Material gerado somente em memória. Cadastre os valores diretamente no secret manager e não os salve no Git.\n')
    for (const [name, value] of Object.entries(material)) process.stdout.write(`${name}=${value}\n`)
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : 'Falha ao gerar material de segurança'}\n`)
    process.exitCode = 2
  }
}
