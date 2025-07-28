import 'dotenv/config';
import { Queue } from 'bullmq';
import { PaymentRequest } from '../core/types.ts';
import redisConnection from './redis.ts';

const paymentQueue = new Queue<PaymentRequest>('paymentQueue', {
  connection: redisConnection,
});

export default paymentQueue;
