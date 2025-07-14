import { z } from 'zod';

const paymentRequestBodySchema = z.object({
  correlationId: z.uuid(),
  amount: z.number(),
});

const ProcessorSummarySchema = z.object({
  totalRequests: z.int(),
  totalAmount: z.number(),
});

const paymentSummarySchema = z.object({
  default: ProcessorSummarySchema,
  fallback: ProcessorSummarySchema,
});

export { paymentRequestBodySchema, paymentSummarySchema };
