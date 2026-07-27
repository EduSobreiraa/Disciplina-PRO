import { ApiProperty } from '@nestjs/swagger'
import { IsString, MaxLength, MinLength } from 'class-validator'

export class CreateTenantDto {
  @ApiProperty({ example: 'Empresa Exemplo', maxLength: 160 })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string

  @ApiProperty({ example: 'empresa-exemplo', maxLength: 80 })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  slug!: string

  @ApiProperty({ example: 'America/Bahia', maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  timeZone!: string
}

export class TenantReasonDto {
  @ApiProperty({ example: 'Solicitação administrativa confirmada', minLength: 3, maxLength: 500 })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string
}
