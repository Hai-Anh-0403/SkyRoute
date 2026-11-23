import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { CreateStayDto, UpdateStayDto } from './dto/admin-stay.dto';
import { StaysService } from './services/stays.service';

@ApiTags('Admin Catalog')
@ApiBearerAuth()
@Roles('admin')
@UseGuards(RolesGuard)
@Controller('admin/stays')
export class AdminStaysController {
  constructor(private readonly staysService: StaysService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a catalog stay (admin only)' })
  @ApiResponse({ status: 201, description: 'Stay created' })
  @ApiResponse({ status: 403, description: 'AUTH_004 Admin role required' })
  createStay(@Body() dto: CreateStayDto) {
    return this.staysService.createStay(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a catalog stay (admin only)' })
  @ApiResponse({ status: 200, description: 'Stay updated' })
  @ApiResponse({ status: 403, description: 'AUTH_004 Admin role required' })
  @ApiResponse({ status: 404, description: 'STAY_001 Stay not found' })
  updateStay(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStayDto,
  ) {
    return this.staysService.updateStay(String(id), dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a catalog stay (admin only)' })
  @ApiResponse({ status: 200, description: 'Stay soft-deleted (isActive=false)' })
  @ApiResponse({ status: 403, description: 'AUTH_004 Admin role required' })
  @ApiResponse({ status: 404, description: 'STAY_001 Stay not found' })
  softDeleteStay(@Param('id', ParseIntPipe) id: number) {
    return this.staysService.softDeleteStay(String(id));
  }
}
