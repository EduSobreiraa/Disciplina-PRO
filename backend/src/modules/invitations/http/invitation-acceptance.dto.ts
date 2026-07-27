import { ApiProperty } from '@nestjs/swagger'
import { IsString, Length, MaxLength, MinLength } from 'class-validator'

export class AcceptNewIdentityInvitationDto {
  @ApiProperty({ description: 'Token opaco recebido no canal nominal' })
  @IsString()
  @Length(43, 43)
  token!: string

  @ApiProperty({ minLength: 15, maxLength: 128 })
  @IsString()
  @MinLength(15)
  @MaxLength(128)
  password!: string
}

export class AcceptExistingIdentityInvitationDto {
  @ApiProperty({ description: 'Token opaco recebido no canal nominal' })
  @IsString()
  @Length(43, 43)
  token!: string
}
