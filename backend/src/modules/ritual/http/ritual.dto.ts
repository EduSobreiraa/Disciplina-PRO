import { ApiProperty } from '@nestjs/swagger'
import { IsBoolean, Matches } from 'class-validator'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export class RitualRangeQueryDto {
  @Matches(ISO_DATE)
  from!: string

  @Matches(ISO_DATE)
  to!: string
}

export class RitualCheckCommandDto {
  @ApiProperty()
  @IsBoolean()
  completed!: boolean
}

export class RitualCheckViewDto {
  @ApiProperty()
  sectionKey!: string

  @ApiProperty()
  itemKey!: string

  @ApiProperty({ type: String, format: 'date-time' })
  completedAt!: Date
}

export class RitualTimerViewDto {
  @ApiProperty({ minimum: 0, maximum: 8 })
  completedCycles!: number

  @ApiProperty({ minimum: 0, maximum: 1800 })
  remainingSeconds!: number

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  runningStartedAt!: Date | null

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  runningUntil!: Date | null
}

export class RitualDayViewDto {
  @ApiProperty({ type: String, format: 'date' })
  date!: string

  @ApiProperty({ type: [RitualCheckViewDto] })
  checks!: RitualCheckViewDto[]

  @ApiProperty({ type: RitualTimerViewDto })
  timer!: RitualTimerViewDto
}

export class RitualStateDto {
  @ApiProperty({ type: [RitualDayViewDto] })
  days!: RitualDayViewDto[]
}
