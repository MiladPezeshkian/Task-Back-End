import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SignalsService } from './signals.service';
import { Signal, SignalSchema } from './schemas/signal.schema';
import { SignalsController } from './signals.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: Signal.name, schema: SignalSchema }])],
  providers: [SignalsService],
  exports: [SignalsService],
  controllers: [SignalsController],
})
export class SignalsModule {}
