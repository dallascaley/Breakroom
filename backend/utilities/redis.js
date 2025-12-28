const { createClient } = require('redis');

let pubClient = null;
let subClient = null;

const createRedisClients = async () => {
  const redisUrl = `redis://:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`;

  console.log('Connecting to Redis at:', process.env.REDIS_HOST);

  pubClient = createClient({ url: redisUrl });
  subClient = pubClient.duplicate();

  pubClient.on('error', (err) => console.error('Redis Pub Client Error:', err));
  subClient.on('error', (err) => console.error('Redis Sub Client Error:', err));

  pubClient.on('connect', () => console.log('Redis Pub Client connected'));
  subClient.on('connect', () => console.log('Redis Sub Client connected'));

  await Promise.all([
    pubClient.connect(),
    subClient.connect()
  ]);

  return { pubClient, subClient };
};

const getRedisClients = () => {
  if (!pubClient || !subClient) {
    throw new Error('Redis clients not initialized. Call createRedisClients() first.');
  }
  return { pubClient, subClient };
};

module.exports = {
  createRedisClients,
  getRedisClients
};
