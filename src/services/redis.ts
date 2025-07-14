import 'dotenv/config;';
import { Redis } from 'ioredis';

const redisConnection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
});

export default redisConnection;
