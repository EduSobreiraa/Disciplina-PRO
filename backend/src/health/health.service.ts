import { Injectable } from '@nestjs/common'
import { DatabaseService } from '../database/database.service.js'

@Injectable()
export class HealthService {
  constructor(private readonly database: DatabaseService) {}

  getHealth() {
    return { status: 'ok', service: 'disciplina-pro-api' as const }
  }

  async getReadiness() {
    const checkedAt = await this.database.checkConnection()
    return { status: 'ready', service: 'disciplina-pro-api' as const, database: 'up' as const, checkedAt }
  }
}
