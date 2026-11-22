import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../shared/decorators/public.decorator';
import { FilterStaysDto } from './dto/stays-query.dto';
import { StaysService } from './services/stays.service';

@ApiTags('Stays')
@Controller('stays')
export class StaysController {
  constructor(private readonly staysService: StaysService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List active stays with city, type, and price filters' })
  @ApiResponse({ status: 200, description: 'Paginated list of stays' })
  listStays(@Query() query: FilterStaysDto) {
    return this.staysService.listStays(query);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get active stay detail by ID' })
  @ApiResponse({ status: 200, description: 'Stay details' })
  @ApiResponse({ status: 404, description: 'STAY_001 Stay not found' })
  getStayById(@Param('id', ParseIntPipe) id: number) {
    return this.staysService.getStayById(String(id));
  }
}
