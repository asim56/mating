import { ApiProperty } from '@nestjs/swagger';

export type DependencyStatus = 'up' | 'down';

export class HealthChecksDto {
  @ApiProperty({ type: String, enum: ['up', 'down'], description: 'Database reachability' })
  database!: DependencyStatus;
}

export class HealthResponseDto {
  @ApiProperty({
    type: String,
    enum: ['ok', 'degraded'],
    example: 'ok',
    description: "'ok' when all dependencies are reachable",
  })
  status!: 'ok' | 'degraded';

  @ApiProperty({ type: String, example: 'api' })
  service!: string;

  @ApiProperty({ type: String, example: '0.0.1', description: 'Deployed API version' })
  version!: string;

  @ApiProperty({ type: String, example: '2026-06-21T08:00:00.000Z' })
  timestamp!: string;

  @ApiProperty({ type: Number, example: 12.34, description: 'Process uptime in seconds' })
  uptimeSeconds!: number;

  @ApiProperty({ type: () => HealthChecksDto })
  checks!: HealthChecksDto;
}
