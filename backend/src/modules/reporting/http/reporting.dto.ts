import { ApiProperty } from '@nestjs/swagger'
import { IsDateString } from 'class-validator'

export class InactiveMembersQueryDto {
  @ApiProperty({ type: String, format: 'date-time', example: '2026-08-01T00:00:00.000Z' })
  @IsDateString({ strict: true })
  inactiveSince!: string
}
