import { Type } from 'class-transformer'
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Matches, MaxLength, Min, MinLength, ValidateNested } from 'class-validator'
import { TrackerMarkStatus } from '../../../generated/prisma/client.js'
import { ApiProperty } from '@nestjs/swagger'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export class TrackerRangeQueryDto {
  @Matches(ISO_DATE)
  from!: string

  @Matches(ISO_DATE)
  to!: string
}

export class TrackerBehaviorDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string
}

export class TrackerMarkDto {
  @IsEnum(TrackerMarkStatus)
  status!: TrackerMarkStatus
}

export class TrackerJustificationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  text!: string
}

export class TrackerBehaviorViewDto {
  @ApiProperty({ format: 'uuid' })
  id!: string

  @ApiProperty()
  name!: string

  @ApiProperty()
  position!: number

  @ApiProperty()
  active!: boolean
}

export class TrackerMarkViewDto {
  @ApiProperty({ format: 'uuid' })
  id!: string

  @ApiProperty({ format: 'uuid' })
  behaviorId!: string

  @ApiProperty({ type: String, format: 'date-time' })
  trackedOn!: Date

  @ApiProperty({ enum: TrackerMarkStatus })
  status!: TrackerMarkStatus

  @ApiProperty({ nullable: true, type: String, description: 'Conteúdo privado disponível somente ao próprio membro' })
  justification!: string | null
}

export class TrackerStateDto {
  @ApiProperty({ type: [TrackerBehaviorViewDto] })
  behaviors!: TrackerBehaviorViewDto[]

  @ApiProperty({ type: [TrackerMarkViewDto] })
  marks!: TrackerMarkViewDto[]
}

export class TrackerBackupBehaviorDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  key!: string

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string

  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  position!: number

  @ApiProperty()
  @IsBoolean()
  active!: boolean
}

export class TrackerBackupMarkDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  behaviorKey!: string

  @ApiProperty({ format: 'date' })
  @Matches(ISO_DATE)
  trackedOn!: string

  @ApiProperty({ enum: TrackerMarkStatus })
  @IsEnum(TrackerMarkStatus)
  status!: TrackerMarkStatus

  @ApiProperty({ nullable: true, required: false, description: 'Conteúdo privado permitido somente em marcas FAILED' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  justification?: string | null
}

export class TrackerBackupDataDto {
  @ApiProperty({ type: [TrackerBackupBehaviorDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => TrackerBackupBehaviorDto)
  behaviors!: TrackerBackupBehaviorDto[]

  @ApiProperty({ type: [TrackerBackupMarkDto] })
  @IsArray()
  @ArrayMaxSize(10_000)
  @ValidateNested({ each: true })
  @Type(() => TrackerBackupMarkDto)
  marks!: TrackerBackupMarkDto[]
}

export class RestoreTrackerBackupDto {
  @ApiProperty({ example: 'disciplina-pro-tracker' })
  @IsString()
  type!: string

  @ApiProperty({ example: 2 })
  @IsNumber()
  version!: number

  @ApiProperty({ type: TrackerBackupDataDto })
  @ValidateNested()
  @Type(() => TrackerBackupDataDto)
  data!: TrackerBackupDataDto
}

export class TrackerBackupDto extends RestoreTrackerBackupDto {
  @ApiProperty({ type: String, format: 'date-time' })
  exportedAt!: string
}
