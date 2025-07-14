import axios from 'axios';
import { PaymentRequest } from '../core/types.ts';

const DEFAULT_PROCESSOR_HOST = process.env.DEFAULT_PROCESSOR_HOST;
const FALLBACK_PROCESSOR_HOST = process.env.FALLBACK_PROCESSOR_HOST;

const callProcessor = async (processorHost: string, data: PaymentRequest) => {
  const requestData = {
    ...data,
    requestedAt: new Date().toISOString(),
  };
  try {
    const response = await axios.post(`${processorHost}/payments`, requestData);
    return response.data;
  } catch (error) {
    console.error('Error calling default processor:', error);
    throw error;
  }
};

const callDefaultProcessor = (data: PaymentRequest) =>
  callProcessor(DEFAULT_PROCESSOR_HOST!, data);
const callFallbackProcessor = (data: PaymentRequest) =>
  callProcessor(FALLBACK_PROCESSOR_HOST!, data);

export { callDefaultProcessor, callFallbackProcessor };
