import { Controller, Get, Query, Param, NotFoundException, Delete, Post, Body } from '@nestjs/common';
import { SignalsService } from './signals.service';
import { QuerySignalsDto } from './dto/query-signals.dto';
import { CreateSignalDto } from './dto/create-signal.dto';

@Controller('signals')
export class SignalsController {
  constructor(private readonly signalsService: SignalsService) {}

  @Get()
  async find(@Query() query: QuerySignalsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const results = await this.signalsService.find({
      deviceId: query.deviceId,
      from: query.from,
      to: query.to,
      page,
      limit,
    });
    const total = await this.signalsService.count({
      deviceId: query.deviceId,
      from: query.from,
      to: query.to,
    });
    return { total, page, limit, results };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const doc = await this.signalsService.findById(id);
    if (!doc) throw new NotFoundException('Signal not found');
    return doc;
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const ok = await this.signalsService.deleteById(id);
    if (!ok) throw new NotFoundException('Signal not found or not deleted');
    return { deleted: true };
  }

  // optional: create manually
  @Post()
  async create(@Body() dto: CreateSignalDto) {
    const doc = await this.signalsService.create(dto);
    return doc;
  }
}
