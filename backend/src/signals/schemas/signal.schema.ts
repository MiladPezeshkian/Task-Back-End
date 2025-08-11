import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SignalDocument = Signal & Document;

@Schema({ timestamps: true })
export class Signal {
  @Prop({ required: true, index: true })
  deviceId: string;

  @Prop()
  time: number;

  @Prop()
  dataLength: number;

  @Prop({ type: Object })
  raw: any;
}

export const SignalSchema = SchemaFactory.createForClass(Signal);
