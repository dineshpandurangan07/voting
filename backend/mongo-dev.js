/*
 * VERAVOTE - local development MongoDB server
 *
 * Starts a real mongod process (via mongodb-memory-server) on the default
 * port 27017 so the application connects through MONGO_URI as usual.
 * Data is persisted in ./.mongo-data between runs.
 *
 * Usage:  npm run mongo
 */
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { MongoMemoryServer } = require('mongodb-memory-server');

const DATA_DIR = path.join(__dirname, '.mongo-data');

(async () => {
  const port = Number(process.env.MONGO_PORT || 27017);

  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.warn(`Could not create data directory: ${err.message}`);
  }

  console.log(`Starting VERAVOTE MongoDB on port ${port}...`);

  const mongod = await MongoMemoryServer.create({
    instance: {
      port,
      dbName: 'veravote',
      dbPath: DATA_DIR,
      storageEngine: 'wiredTiger',
    },
  });

  console.log(`MongoDB is running at: ${mongod.getUri()}`);
  console.log(`Data directory: ${DATA_DIR}`);
  console.log('');
  console.log('Press Ctrl+C to stop.');

  const shutdown = async () => {
    await mongod.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
})().catch((err) => {
  console.error(`Failed to start MongoDB: ${err.message}`);
  process.exit(1);
});