import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

// Connect to Redis. Defaults to localhost:6379 if not specified
const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

redisClient.on('error', (err) => {
  console.error('Redis connection error:', err);
});

redisClient.on('connect', () => {
  console.log('Connected to Redis');
});

export default redisClient;
