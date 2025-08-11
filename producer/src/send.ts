#!/usr/bin/env ts-node

import * as amqp from 'amqplib';
import * as fs from 'fs';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const argv = yargs(hideBin(process.argv))
  .option('file', { type: 'string', description: 'Path to sample json file', default: '../backend/x-ray.json' })
  .option('count', { type: 'number', description: 'Number of messages to send', default: 1 })
  .option('interval', { type: 'number', description: 'Interval between messages (ms)', default: 0 })
  .option('queue', { type: 'string', description: 'Queue name', default: 'x-ray' })
  .option('url', { type: 'string', description: 'RabbitMQ URL', default: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672' })
  .help()
  .argv as any;

async function loadSample(path: string) {
  const p = path;
  if (!fs.existsSync(p)) throw new Error('sample file not found: ' + p);
  const txt = fs.readFileSync(p, 'utf8');
  return JSON.parse(txt);
}

async function main() {
  const url = argv.url;
  const queue = argv.queue;
  const count = Number(argv.count || 1);
  const interval = Number(argv.interval || 0);
  const file = String(argv.file);

  console.log('[producer] Connecting to', url);
  const conn = await amqp.connect(url);
  const ch = await conn.createChannel();
  await ch.assertQueue(queue, { durable: true });
  console.log('[producer] Connected, queue asserted:', queue);

  const sample = await loadSample(file);

  for (let i = 0; i < count; i++) {
    const payload = sample;
    ch.sendToQueue(queue, Buffer.from(JSON.stringify(payload)), { persistent: true });
    console.log('[producer] sent', i + 1, 'to', queue);
    if (i < count - 1 && interval > 0) {
      await new Promise((res) => setTimeout(res, interval));
    }
  }

  await ch.close();
  await conn.close();
  console.log('[producer] done. Sent', count, 'messages.');
  process.exit(0);
}

main().catch((err) => {
  console.error('[producer] error', err);
  process.exit(1);
});
