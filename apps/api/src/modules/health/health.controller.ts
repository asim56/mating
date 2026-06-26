import { Controller, Get, HttpCode, HttpStatus, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { HealthResponseDto } from './dto/health-response.dto';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Liveness + readiness check with version and dependency status' })
  @ApiResponse({ status: 200, description: 'All dependencies reachable', type: HealthResponseDto })
  @ApiResponse({ status: 503, description: 'A required dependency is unreachable' })
  async getHealth(): Promise<HealthResponseDto> {
    const result = await this.healthService.getStatus();

    if (result.status !== 'ok') {
      throw new ServiceUnavailableException(result);
    }

    return result;
  }
}
