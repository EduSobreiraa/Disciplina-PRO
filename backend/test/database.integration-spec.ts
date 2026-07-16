import { ConfigModule } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { validateEnvironment } from '../src/config/environment.js'
import { DatabaseModule } from '../src/database/database.module.js'
import { DatabaseService } from '../src/database/database.service.js'

describe('PostgreSQL integration', () => {
  it('connects and executes a real query', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }), DatabaseModule],
    }).compile()
    const database = moduleRef.get(DatabaseService)

    await expect(database.checkConnection()).resolves.toBeInstanceOf(Date)
    await moduleRef.close()
  })
})
