/**
 * Simple Node script to publish a message to the x-ray queue.
 * Usage: ts-node src/rabbitmq/publisher.ts
 * But we'll run via `node` after transpile or use ts-node if installed.
 */
const amqp = require('amqplib');
const fs = require('fs');

(async () => {
  try {
    const url = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
    const conn = await amqp.connect(url);
    const ch = await conn.createChannel();
    const q = 'x-ray';
    await ch.assertQueue(q, { durable: true });

    // read sample file (expecting x-ray.json in project root)
    const samplePath = process.env.SAMPLE_PATH || './x-ray.json';
    const content = fs.existsSync(samplePath) ? fs.readFileSync(samplePath, 'utf8') : JSON.stringify({"sample":"data"});
    const msg = JSON.parse(content);

    ch.sendToQueue(q, Buffer.from(JSON.stringify(msg)), { persistent: true });
    console.log('[publisher] sent sample to queue', q);
    await ch.close();
    await conn.close();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
