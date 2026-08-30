import { createPrivateKey, createPublicKey, sign, verify } from 'node:crypto'
import { generateSecurityMaterial, validateJwtKeyId } from './security-material.js'

describe('security material', () => {
  it('generates a matching RSA key pair and independent 256-bit peppers', () => {
    const material = generateSecurityMaterial('staging-2026-08')
    const publicKeys = JSON.parse(material.JWT_PUBLIC_KEYS_JSON) as Record<string, string>
    const privateKey = createPrivateKey(Buffer.from(material.JWT_PRIVATE_KEY_BASE64, 'base64').toString('utf8'))
    const publicKey = createPublicKey(Buffer.from(publicKeys['staging-2026-08'] ?? '', 'base64').toString('utf8'))
    const payload = Buffer.from('disciplina-pro-security-material-test')
    const signature = sign('sha256', payload, privateKey)

    expect(verify('sha256', payload, publicKey, signature)).toBe(true)
    expect(material.REFRESH_TOKEN_PEPPER).toHaveLength(43)
    expect(material.INVITATION_TOKEN_PEPPER).toHaveLength(43)
    expect(material.REFRESH_TOKEN_PEPPER).not.toBe(material.INVITATION_TOKEN_PEPPER)
  })

  it('rejects unsafe key identifiers', () => {
    expect(() => validateJwtKeyId('../active key')).toThrow('kid')
  })
})
