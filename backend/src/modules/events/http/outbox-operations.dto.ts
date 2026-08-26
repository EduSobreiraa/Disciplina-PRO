import { ApiProperty } from '@nestjs/swagger'

export class OutboxOperationsMetricsDto {
  @ApiProperty({ example: 3 }) pending!: number
  @ApiProperty({ example: 1 }) processing!: number
  @ApiProperty({ example: 0 }) failed!: number
  @ApiProperty({ example: 0, description: 'Deliveries PROCESSING cuja lease já expirou.' }) expiredProcessing!: number
  @ApiProperty({ example: 4, description: 'Soma de pending e processing.' }) openDeliveries!: number
  @ApiProperty({ example: '2026-08-22T12:00:00.000Z', nullable: true }) oldestPendingOccurredAt!: Date | null
  @ApiProperty({ example: 120, nullable: true, description: 'Idade do evento pendente mais antigo.' }) oldestPendingAgeSeconds!: number | null
  @ApiProperty({ example: 3 }) maximumAttempts!: number
  @ApiProperty({ example: '2026-08-22T12:02:00.000Z' }) observedAt!: Date
}
