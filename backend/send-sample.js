const amqp = require('amqplib');
const fs = require('fs');

(async () => {
  try {
    const url = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
    const conn = await amqp.connect(url);
    const ch = await conn.createChannel();
    const q = 'x-ray';
    await ch.assertQueue(q, { durable: true });

    const content = fs.readFileSync('./x-ray.json','utf8');
    const msg = JSON.parse(content);

    ch.sendToQueue(q, Buffer.from(JSON.stringify(msg)), { persistent: true });
    console.log('[send-sample] sent sample to queue', q);
    await ch.close();
    await conn.close();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
