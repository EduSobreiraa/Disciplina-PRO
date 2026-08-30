import { generateKeyPairSync, randomBytes } from 'node:crypto'

export interface SecurityMaterial {
  JWT_ACTIVE_KID: string
  JWT_PRIVATE_KEY_BASE64: string
  JWT_PUBLIC_KEYS_JSON: string
  REFRESH_TOKEN_PEPPER: string
  INVITATION_TOKEN_PEPPER: string
}

export function validateJwtKeyId(keyId: string) {
  if (!/^[A-Za-z0-9._-]{1,64}$/u.test(keyId)) {
    throw new Error('O kid deve usar apenas letras, números, ponto, hífen ou underscore e possuir até 64 caracteres')
  }
  return keyId
}

export function generateSecurityMaterial(keyId: string): SecurityMaterial {
  const validatedKeyId = validateJwtKeyId(keyId)
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  })
  const encodedPublicKey = Buffer.from(publicKey, 'utf8').toString('base64')

  return {
    JWT_ACTIVE_KID: validatedKeyId,
    JWT_PRIVATE_KEY_BASE64: Buffer.from(privateKey, 'utf8').toString('base64'),
    JWT_PUBLIC_KEYS_JSON: JSON.stringify({ [validatedKeyId]: encodedPublicKey }),
    REFRESH_TOKEN_PEPPER: randomBytes(32).toString('base64url'),
    INVITATION_TOKEN_PEPPER: randomBytes(32).toString('base64url'),
  }
}
