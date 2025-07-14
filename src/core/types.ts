import { z } from 'zod';
import { paymentRequestBodySchema, paymentSummarySchema } from './schemas.ts';

type PaymentRequest = z.infer<typeof paymentRequestBodySchema>;
type PaymentSummary = z.infer<typeof paymentSummarySchema>;

export { PaymentRequest, PaymentSummary };
