import { ApiProperty } from '@nestjs/swagger'

export class MissionMetricsDto {
  @ApiProperty({ minimum: 0 }) perfectDays!: number
  @ApiProperty({ minimum: 0 }) perfectStreak!: number
  @ApiProperty({ minimum: 0, maximum: 100 }) monthPercent!: number
  @ApiProperty({ minimum: 0, maximum: 100 }) minimumBehaviorPercent!: number
  @ApiProperty({ minimum: 0 }) weeklyXp!: number
  @ApiProperty({ minimum: 0 }) markedDays!: number
  @ApiProperty({ minimum: 0 }) totalGreens!: number
  @ApiProperty({ minimum: 0 }) completedRitualSections!: number
}

export class MissionsViewDto {
  @ApiProperty({ type: MissionMetricsDto }) metrics!: MissionMetricsDto
}
