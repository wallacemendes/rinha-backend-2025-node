import axios from 'axios';
import http from 'http';
import https from 'https';
import { ProcessorPaymentRequest } from '../core/types.ts';

const DEFAULT_PROCESSOR_HOST = process.env.DEFAULT_PROCESSOR_HOST;
const FALLBACK_PROCESSOR_HOST = process.env.FALLBACK_PROCESSOR_HOST;

const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 45,
  maxFreeSockets: 15,
});

const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 45,
  maxFreeSockets: 15,
});

const apiClient = axios.create({
  httpAgent,
  httpsAgent,
});

const callProcessor = async (
  processorHost: string,
  data: ProcessorPaymentRequest,
) => {
  try {
    // console.log(`Calling processor at ${processorHost} with data:`, data);
    const response = await apiClient.post(`${processorHost}/payments`, data);
    return response.data;
  } catch (error) {
    // console.error('Error calling processor:', error);
    throw error;
  }
};

const callDefaultProcessor = (data: ProcessorPaymentRequest) =>
  callProcessor(DEFAULT_PROCESSOR_HOST!, data);
const callFallbackProcessor = (data: ProcessorPaymentRequest) =>
  callProcessor(FALLBACK_PROCESSOR_HOST!, data);

export { callDefaultProcessor, callFallbackProcessor };
