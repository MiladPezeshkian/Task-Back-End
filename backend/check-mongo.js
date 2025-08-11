const { MongoClient } = require('mongodb');
const url = process.env.MONGO_URL || 'mongodb://localhost:27017/pantodb';
(async () => {
  const client = new MongoClient(url);
  try {
    await client.connect();
    const db = client.db();
    const col = db.collection('signals');
    const docs = await col.find().sort({ createdAt: -1 }).limit(5).toArray();
    console.log('found', docs.length, 'documents:');
    console.dir(docs, { depth: 4 });
  } catch (err) {
    console.error('mongo-check err:', err);
    process.exit(1);
  } finally {
    await client.close();
  }
})();
