import { z } from 'zod';
import { paymentRequestBodySchema, paymentSummarySchema } from './schemas.ts';

type PaymentRequest = z.infer<typeof paymentRequestBodySchema>;
type PaymentSummary = z.infer<typeof paymentSummarySchema>;
type ProcessorPaymentRequest = PaymentRequest & {
  requestedAt: string;
};

interface Payment {
  processor: 'default' | 'fallback';
  amount: number;
  requestedAt: string;
  correlationId: string;
}

export { PaymentRequest, PaymentSummary, ProcessorPaymentRequest, Payment };
