import { ConfigModule } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { validateEnvironment } from '../src/config/environment.js'
import { PrismaModule } from '../src/database/prisma.module.js'
import { PrismaService } from '../src/database/prisma.service.js'

describe('PostgreSQL integration', () => {
  it('connects and executes a real query', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }), PrismaModule],
    }).compile()
    const database = moduleRef.get(PrismaService)

    await expect(database.checkConnection()).resolves.toBeInstanceOf(Date)
    await moduleRef.close()
  })
})
