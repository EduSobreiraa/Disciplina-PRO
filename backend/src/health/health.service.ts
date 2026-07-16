import { Injectable } from '@nestjs/common'
import { PrismaService } from '../database/prisma.service.js'

@Injectable()
export class HealthService {
  constructor(private readonly database: PrismaService) {}

  getHealth() {
    return { status: 'ok', service: 'disciplina-pro-api' as const }
  }

  async getReadiness() {
    const checkedAt = await this.database.checkConnection()
    return { status: 'ready', service: 'disciplina-pro-api' as const, database: 'up' as const, checkedAt }
  }
}
