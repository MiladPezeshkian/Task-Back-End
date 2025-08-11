import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Signal, SignalDocument } from './schemas/signal.schema';

interface FindOpts {
  deviceId?: string;
  from?: number;
  to?: number;
  page?: number;
  limit?: number;
}

@Injectable()
export class SignalsService {
  private readonly logger = new Logger(SignalsService.name);
  constructor(@InjectModel(Signal.name) private signalModel: Model<SignalDocument>) {}

  async createFromMessage(parsed: Record<string, any>) {
    if (!parsed || typeof parsed !== 'object') return [];

    // مشخص‌سازی نوع آرایه برای جلوگیری از خطای TS
    const results: SignalDocument[] = [];
    for (const deviceId of Object.keys(parsed)) {
      const entry = parsed[deviceId] || {};
      const time = typeof entry.time === 'number' ? entry.time : Date.now();
      const dataLength = Array.isArray(entry.data) ? entry.data.length : (entry.data ? 1 : 0);

      const doc = await this.signalModel.create({
        deviceId,
        time,
        dataLength,
        raw: entry,
      });

      results.push(doc as SignalDocument);
      this.logger.log('Saved signal for device=' + deviceId + ' time=' + time + ' dataLength=' + dataLength);
    }
    return results;
  }

  async create(payload: Partial<Signal>) {
    return this.signalModel.create(payload as any);
  }

  async find(opts: FindOpts = {}) {
    const q: any = {};
    if (opts.deviceId) q.deviceId = opts.deviceId;
    if (opts.from !== undefined || opts.to !== undefined) {
      q.time = {};
      if (opts.from !== undefined) q.time.$gte = opts.from;
      if (opts.to !== undefined) q.time.$lte = opts.to;
    }
    const page = opts.page && opts.page > 0 ? opts.page : 1;
    const limit = opts.limit && opts.limit > 0 ? opts.limit : 20;
    const skip = (page - 1) * limit;
    return this.signalModel.find(q).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec();
  }

  async count(opts: FindOpts = {}) {
    const q: any = {};
    if (opts.deviceId) q.deviceId = opts.deviceId;
    if (opts.from !== undefined || opts.to !== undefined) {
      q.time = {};
      if (opts.from !== undefined) q.time.$gte = opts.from;
      if (opts.to !== undefined) q.time.$lte = opts.to;
    }
    return this.signalModel.countDocuments(q).exec();
  }

  async findById(id: string) {
    return this.signalModel.findById(id).lean().exec();
  }

  async deleteById(id: string) {
    const r = await this.signalModel.deleteOne({ _id: id }).exec();
    return r.deletedCount && r.deletedCount > 0;
  }

  async findRecent(limit = 20) {
    return this.signalModel.find().sort({ createdAt: -1 }).limit(limit).lean().exec();
  }
}
