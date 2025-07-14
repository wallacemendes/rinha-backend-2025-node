import 'dotenv/config';
import { Worker } from 'bullmq';
import redisConnection from '../services/redis.ts';
import {
  callDefaultProcessor,
  callFallbackProcessor,
} from '../services/paymentService.ts';
import { PaymentRequest } from '../core/types.ts';
const CircuitBreaker = require('opossum');

const circuitBreakerOptions = {
  timeout: 5000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
};

const defaultCircuitBreaker = new CircuitBreaker(
  callDefaultProcessor,
  circuitBreakerOptions,
);
const fallbackCircuitBreaker = new CircuitBreaker(
  callFallbackProcessor,
  circuitBreakerOptions,
);

const worker = new Worker<PaymentRequest>(
  'payments',
  async job => {
    console.log(`\n--- Processando job #${job.id}, dados:`, job.data);

    try {
      const result = await defaultCircuitBreaker.fire(job.data);
      console.log(`Job #${job.id} processado com sucesso:`, result);
      return result;
    } catch (err) {
      console.error(`ERRO no Default: ${err}. Tentando Fallback...`);
      try {
        const result = await fallbackCircuitBreaker.fire(job.data);
        console.log(
          `Job #${job.id} processado com sucesso no Fallback:`,
          result,
        );
        return result;
      } catch (fallbackErr) {
        console.error(`ERRO no Fallback: ${fallbackErr}`);
        throw fallbackErr;
      }
    }
  },
  { connection: redisConnection },
);

worker.on('completed', job => console.log(`Job #${job.id} concluído!`));
worker.on('failed', err => console.log(`Job falhou: ${err}`));

console.log('Worker de pagamentos iniciado e escutando a fila...');
