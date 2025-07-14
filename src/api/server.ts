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

const app = Fastify({
  logger: true,
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

app.get('/payments-summary', {
  schema: {
    response: {
      200: paymentSummarySchema,
    },
  },
  handler: async (request, reply) => {
    // Handler implementation
  },
});

const start = async () => {
  try {
    const port = process.env.API_PORT
      ? parseInt(process.env.API_PORT, 10)
      : 3000;
    const host = process.env.API_HOST || '0.0.0.0';
    await app.listen({ port, host });
    app.log.info(`Server listening on ${host}:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
