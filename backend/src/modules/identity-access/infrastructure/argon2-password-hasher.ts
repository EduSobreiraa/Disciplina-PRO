import { Injectable } from '@nestjs/common'
import { argon2id, hash, verify } from 'argon2'
import { PasswordHasher } from '../application/password-hasher.js'

@Injectable()
export class Argon2PasswordHasher extends PasswordHasher {
  hash(password: string) {
    return hash(password, { type: argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1 })
  }

  verify(encodedHash: string, password: string) {
    return verify(encodedHash, password.normalize('NFC'))
  }
}
