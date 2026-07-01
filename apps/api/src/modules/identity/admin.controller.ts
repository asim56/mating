import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

import { type AuthenticatedUser, Roles } from '../../common';
import type { UserRole } from '@mating/shared';
import { AdminService } from './admin.service';

class UpdateStatusDto {
  @IsIn(['active', 'suspended'])
  status!: 'active' | 'suspended';

  @IsOptional()
  @IsString()
  reason?: string;
}

class GrantRoleDto {
  @IsString()
  role!: UserRole;
}

class ListUsersQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  limit?: number;
}

@ApiTags('admin/users')
@ApiBearerAuth()
@Controller('admin/users')
@Roles('super_admin', 'support_agent')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get()
  @ApiOperation({ summary: 'Search/list accounts' })
  list(@Query() query: ListUsersQueryDto) {
    return this.admin.listUsers(query);
  }

  @Patch(':id/status')
  @Roles('super_admin', 'support_agent')
  updateStatus(
    @Req() req: { user?: AuthenticatedUser },
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.admin.updateStatus(req.user!.id, id, dto.status, dto.reason);
  }

  @Post(':id/revoke-sessions')
  @Roles('super_admin', 'support_agent')
  revokeSessions(@Req() req: { user?: AuthenticatedUser }, @Param('id') id: string) {
    return this.admin.revokeSessions(req.user!.id, id);
  }

  @Post(':id/roles')
  @Roles('super_admin')
  grantRole(
    @Req() req: { user?: AuthenticatedUser },
    @Param('id') id: string,
    @Body() dto: GrantRoleDto,
  ) {
    return this.admin.grantRole(req.user!.id, id, dto.role);
  }

  @Delete(':id/roles/:role')
  @Roles('super_admin')
  revokeRole(
    @Req() req: { user?: AuthenticatedUser },
    @Param('id') id: string,
    @Param('role') role: UserRole,
  ) {
    return this.admin.revokeRole(req.user!.id, id, role);
  }
}
