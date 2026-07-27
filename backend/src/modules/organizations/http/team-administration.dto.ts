import { ApiProperty } from '@nestjs/swagger'
import { IsString, MaxLength, MinLength } from 'class-validator'

export class TeamNameDto {
  @ApiProperty({ example: 'Operações' })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string
}
