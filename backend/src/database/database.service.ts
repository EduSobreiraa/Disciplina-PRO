import { Injectable, OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Pool } from 'pg'
import type { Environment } from '../config/environment.js'

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly pool: Pool

  constructor(config: ConfigService<Environment, true>) {
    this.pool = new Pool({ connectionString: config.get('DATABASE_URL', { infer: true }), max: 5 })
  }

  async checkConnection() {
    const result = await this.pool.query<{ currentTime: Date }>('SELECT NOW() AS "currentTime"')
    return result.rows[0]?.currentTime
  }

  async onModuleDestroy() {
    await this.pool.end()
  }
}
