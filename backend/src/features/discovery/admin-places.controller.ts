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
import { CreatePlaceDto, UpdatePlaceDto } from './dto/admin-place.dto';
import { DiscoveryService } from './services/discovery.service';

@ApiTags('Admin Catalog')
@ApiBearerAuth()
@Roles('admin')
@UseGuards(RolesGuard)
@Controller('admin/places')
export class AdminPlacesController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a catalog place (admin only)' })
  @ApiResponse({ status: 201, description: 'Place created' })
  @ApiResponse({ status: 403, description: 'AUTH_004 Admin role required' })
  createPlace(@Body() dto: CreatePlaceDto) {
    return this.discoveryService.createPlace(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a catalog place (admin only)' })
  @ApiResponse({ status: 200, description: 'Place updated' })
  @ApiResponse({ status: 403, description: 'AUTH_004 Admin role required' })
  @ApiResponse({ status: 404, description: 'DISC_001 Place not found' })
  updatePlace(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePlaceDto,
  ) {
    return this.discoveryService.updatePlace(String(id), dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a catalog place (admin only)' })
  @ApiResponse({ status: 200, description: 'Place soft-deleted (isActive=false)' })
  @ApiResponse({ status: 403, description: 'AUTH_004 Admin role required' })
  @ApiResponse({ status: 404, description: 'DISC_001 Place not found' })
  softDeletePlace(@Param('id', ParseIntPipe) id: number) {
    return this.discoveryService.softDeletePlace(String(id));
  }
}
