import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import * as amqp from 'amqplib';
import { SignalsService } from '../signals/signals.service';

@Injectable()
export class RabbitmqService implements OnModuleInit, OnModuleDestroy {
  private connection: amqp.Connection | null = null;
  private channel: amqp.Channel | null = null;
  private readonly queueName = 'x-ray';
  private readonly logger = new Logger(RabbitmqService.name);

  constructor(private readonly signalsService: SignalsService) {}

  async onModuleInit() {
    const url = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
    try {
      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();
      await this.channel.assertQueue(this.queueName, { durable: true });
      this.logger.log('Connected and queue asserted: ' + this.queueName);

      await this.channel.consume(this.queueName, async (msg) => {
        if (!msg) return;
        try {
          const content = msg.content.toString();
          const parsed = JSON.parse(content);

          // Save to DB via SignalsService
          await this.signalsService.createFromMessage(parsed);

          // Also log short summary
          const deviceIds = Object.keys(parsed || {});
          deviceIds.forEach((id) => {
            const entry = parsed[id] || {};
            const time = entry && entry.time;
            const dataLen = Array.isArray(entry && entry.data) ? entry.data.length : 0;
            this.logger.log('[x-ray consumer] deviceId=' + id + ' time=' + time + ' dataLength=' + dataLen);
          });

          this.channel?.ack(msg);
        } catch (err) {
          this.logger.error('[x-ray consumer] parse/process error:', err);
          this.channel?.nack(msg, false, false);
        }
      }, { noAck: false });

      this.logger.log('Consumer started for queue: ' + this.queueName);
    } catch (err) {
      this.logger.error('[RabbitmqService] Connection error:', err);
      throw err;
    }
  }

  async publishToQueue(message: any, queue = this.queueName) {
    if (!this.channel) throw new Error('Channel not initialized');
    const buf = Buffer.from(JSON.stringify(message));
    await this.channel.assertQueue(queue, { durable: true });
    return this.channel.sendToQueue(queue, buf, { persistent: true });
  }

  async onModuleDestroy() {
    try {
      await this.channel?.close();
      await this.connection?.close();
      this.logger.log('[RabbitmqService] Connection closed');
    } catch (err) {
      this.logger.warn('[RabbitmqService] Error on close:', err);
    }
  }
}
