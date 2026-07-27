import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsArray, IsEmail, IsEnum, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator'

enum TenantInvitationRoleDto {
  USER = 'USER',
  MANAGER = 'MANAGER',
}

enum TeamInvitationRoleDto {
  MEMBER = 'MEMBER',
  MANAGER = 'MANAGER',
}

export class InvitationTeamDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  teamId!: string

  @ApiProperty({ enum: TeamInvitationRoleDto })
  @IsEnum(TeamInvitationRoleDto)
  role!: TeamInvitationRoleDto
}

export class CreateInvitationDto {
  @ApiProperty({ format: 'email' })
  @IsEmail()
  email!: string

  @ApiProperty({ enum: TenantInvitationRoleDto })
  @IsEnum(TenantInvitationRoleDto)
  role!: TenantInvitationRoleDto

  @ApiProperty({ type: [InvitationTeamDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvitationTeamDto)
  teams?: InvitationTeamDto[]
}

export class CreateFirstCeoInvitationDto {
  @ApiProperty({ format: 'email' })
  @IsString()
  @IsEmail()
  email!: string
}
