import 'dotenv/config';
import Fastify from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import {
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import {
  paymentRequestBodySchema,
  paymentSummarySchema,
} from '../core/schemas.ts';
import paymentQueue from '../services/queue.ts';

import { initializeWorker } from '../workers/paymentWorker.ts';
import { clearAllPayments, getPayments } from '../services/reportService.ts';

const app = Fastify({
  logger: false,
  trustProxy: true,
  keepAliveTimeout: 60000,
}).withTypeProvider<ZodTypeProvider>();

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

app.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

app.post(
  '/payments',
  {
    schema: {
      body: paymentRequestBodySchema,
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['success', 'failure'] },
            message: { type: 'string' },
          },
        },
      },
    },
  },
  async (request, reply) => {
    await paymentQueue.add('processPayment', request.body);

    app.log.info(`Job ${request.body.correlationId} enfileirado com sucesso.`);

    return reply.status(202).send({
      status: 'success',
      message: `Payment job ${request.body.correlationId} has been queued for processing.`,
    });
  },
);

app.post('/purge-payments', {
  handler: async request => {
    try {
      await clearAllPayments(true);
      app.log.info('All payment data has been purged from Redis');
    } catch (error) {
      request.log.error(`Error purging payment data: ${error}`);
    }
  },
});

app.get('/payments-summary', {
  schema: {
    response: {
      200: paymentSummarySchema,
    },
  },
  handler: async (request, reply) => {
    const { from, to } = request.query as { from?: string; to?: string };
    try {
      return await getPayments(from, to);
    } catch (error) {
      request.log.error(`Error generating payment summary: ${error}`);
      return {
        default: {
          totalRequests: 0,
          totalAmount: 0,
        },
        fallback: {
          totalRequests: 0,
          totalAmount: 0,
        },
      };
    }
  },
});

let worker: any = null;

const start = async () => {
  try {
    const port = process.env.API_PORT
      ? parseInt(process.env.API_PORT, 10)
      : 3000;

    await app.listen({ port, host: process.env.API_HOST || '0.0.0.0' });

    const shouldStartWorker = process.env.ENABLE_WORKER !== 'false';

    if (shouldStartWorker) {
      worker = initializeWorker();
      app.log.info('Worker integrado inicializado com sucesso');
    }

    app.log.info(`Servidor iniciado na porta ${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

const shutdown = async () => {
  app.log.info('Iniciando shutdown controlado...');

  if (worker) {
    app.log.info('Fechando conexão do worker...');
    await worker.close();
  }

  await app.close();
  app.log.info('Servidor encerrado com sucesso');

  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

start();
