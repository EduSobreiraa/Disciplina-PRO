import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsArray, IsEnum, IsInt, IsObject, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator'
import { ACTIVITY_FREQUENCIES, ACTIVITY_TYPES, type ActivityFrequency, type ActivityType, type ProgramExecutionConfiguration } from '../domain/program-policy.js'

const KEY = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export class ProgramActivityDto {
  @IsString() @MaxLength(80) @Matches(KEY) key!: string
  @IsString() @MaxLength(160) title!: string
  @IsString() @MaxLength(10_000) description!: string
  @IsInt() @Min(1) position!: number
  @ApiProperty({ enum: ACTIVITY_TYPES }) @IsEnum(ACTIVITY_TYPES) type!: ActivityType
  @ApiProperty({ enum: ACTIVITY_FREQUENCIES }) @IsEnum(ACTIVITY_FREQUENCIES) frequency!: ActivityFrequency
  @IsObject() configuration!: Record<string, unknown>
}

export class ProgramPhaseDto {
  @IsString() @MaxLength(80) @Matches(KEY) key!: string
  @IsString() @MaxLength(160) title!: string
  @IsString() @MaxLength(10_000) description!: string
  @IsInt() @Min(1) position!: number
  @IsArray() @ValidateNested({ each: true }) @Type(() => ProgramActivityDto) activities!: ProgramActivityDto[]
}

export class ProgramVersionDto {
  @IsString() @MaxLength(160) title!: string
  @IsString() @MaxLength(10_000) description!: string
  @IsInt() @Min(1) @Max(3_650) durationDays!: number
  @IsOptional() @IsObject() executionConfiguration?: ProgramExecutionConfiguration
  @IsArray() @ValidateNested({ each: true }) @Type(() => ProgramPhaseDto) phases!: ProgramPhaseDto[]
}

export class ProgramIdentityDto {
  @IsString() @MaxLength(80) @Matches(KEY) slug!: string
  @IsString() @MaxLength(160) name!: string
  @IsString() @MaxLength(4_000) summary!: string
}

export class CreateProgramDto extends ProgramIdentityDto {
  @ValidateNested() @Type(() => ProgramVersionDto) version!: ProgramVersionDto
}
