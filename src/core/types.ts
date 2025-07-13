export interface PaymentRequest {
  correlationId: string;
  amount: number;
}

export interface PaymentSummary {
  default: ProcessorSummary;
  fallback: ProcessorSummary;
}

interface ProcessorSummary {
  totalRequests: number;
  totalAmount: number;
}
