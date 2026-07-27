import { Type } from 'class-transformer'
import { IsArray, IsInt, IsObject, IsString, Matches, MaxLength, MinLength, ValidateNested } from 'class-validator'

export class AbandonEnrollmentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason!: string
}

export class PauseEnrollmentDto extends AbandonEnrollmentDto {}

export class PillarScoreDto {
  @IsString()
  @MaxLength(80)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  pillarKey!: string

  @IsInt()
  score!: number
}

export class DailyRecordDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PillarScoreDto)
  scores!: PillarScoreDto[]
}

export class PrivateResponseDto {
  @IsObject()
  payload!: Record<string, unknown>
}
