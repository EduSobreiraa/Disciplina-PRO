import { ApiProperty } from '@nestjs/swagger'
import { IsIn, IsString, IsUUID, MaxLength, MinLength } from 'class-validator'

export class TeamAssignmentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  membershipId!: string

  @ApiProperty({ enum: ['MEMBER', 'MANAGER'] })
  @IsIn(['MEMBER', 'MANAGER'])
  role!: 'MEMBER' | 'MANAGER'
}

export class MembershipReasonDto {
  @ApiProperty({ minLength: 3, maxLength: 500 })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string
}

export class MembershipRoleDto {
  @ApiProperty({ enum: ['USER', 'MANAGER'] })
  @IsIn(['USER', 'MANAGER'])
  role!: 'USER' | 'MANAGER'
}

export class ReplaceCeoDto extends MembershipReasonDto {
  @ApiProperty({ format: 'uuid', description: 'CEO atual esperado para impedir substituições concorrentes obsoletas' })
  @IsUUID()
  expectedCeoMembershipId!: string

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  successorMembershipId!: string
}
