import { Worker } from 'bullmq';
import redisConnection from '../services/redis.ts';
import {
  callDefaultProcessor,
  callFallbackProcessor,
} from '../services/paymentService.ts';
import { PaymentRequest } from '../core/types.ts';
import CircuitBreaker from 'opossum';
import { addPayment } from '../services/reportService.ts';
import paymentQueue from '../services/queue.ts';

const circuitBreakerOptions = {
  timeout: 3000, // Tempo para o Circuit Breaker esperar antes de falhar
  errorThresholdPercentage: 20, // Percentual de falhas para abrir o circuito
  resetTimeout: 5000, // Tempo para o Circuit Breaker esperar antes ir para semi-aberto
  rollingCountTimeout: 1000, // Janela de 1 segundo para contagem
  rollingCountBuckets: 10, // Número de buckets para a contagem
};

const defaultCircuitBreaker = new CircuitBreaker(
  callDefaultProcessor,
  circuitBreakerOptions,
);

const fallbackCircuitBreaker = new CircuitBreaker(
  callFallbackProcessor,
  circuitBreakerOptions,
);

export function initializeWorker() {
  const worker = new Worker<PaymentRequest>(
    'paymentQueue',
    async job => {
      // console.log(`\n--- Processando job #${job.id}, dados:`, job.data);

      try {
        const data = {
          ...job.data,
          requestedAt: new Date().toISOString(),
        };

        // console.log(`Tentando processador default para job #${job.id}`);
        // const result = await callDefaultProcessor(data);
        const result = await defaultCircuitBreaker.fire(data);

        // console.log(`Job #${job.id} processado com sucesso no Default`);
        await addPayment({
          processor: 'default',
          ...data,
        });

        return result;
      } catch (err) {
        // console.error(`ERRO no Default: ${err}`);
        // console.log(`Tentando processador fallback para job #${job.id}...`);

        try {
          const data = {
            ...job.data,
            requestedAt: new Date().toISOString(),
          };
          // const result = await callFallbackProcessor(data);
          const result = await fallbackCircuitBreaker.fire(data);
          // console.log(`Job #${job.id} processado com sucesso no Fallback`);
          await addPayment({
            processor: 'fallback',
            ...data,
          });
          return result;
        } catch (fallbackErr) {
          // console.error(`ERRO no Fallback: ${fallbackErr}`);
          try {
            await paymentQueue.add('retryPayment', job.data);
          } catch (error) {
            // console.error(`ERRO ao adicionar job de retry: ${error}`);
          }
        }
      }
    },
    {
      connection: redisConnection,
      concurrency: 20,
    },
  );

  console.log('Worker iniciado e escutando a fila...');

  return worker;
}
