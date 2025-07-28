import { Payment, PaymentSummary } from '../core/types.ts';
import redisConnection from './redis.ts';

const PROCESSOR_INDEX_PREFIX = 'paymentProcessor:';

const addPayment = async (payment: Payment): Promise<void> => {
  try {
    const paymentData = JSON.stringify(payment);
    const pipeline = redisConnection.pipeline();
    const score = new Date(payment.requestedAt).getTime();

    pipeline.zadd(
      `${PROCESSOR_INDEX_PREFIX}${payment.processor}`,
      score,
      paymentData,
    );

    await pipeline.exec();

    // console.log(
    //   `Payment ${payment.correlationId} added to processed payments collection`,
    // );
  } catch (error) {
    console.error('Failed to add payment to Redis:', error);
    throw new Error('Failed to store payment information');
  }
};

const getPayments = async (
  from?: string,
  to?: string,
): Promise<PaymentSummary> => {
  try {
    const [defaultPayments, fallbackPayments] = await Promise.all([
      redisConnection.zrangebyscore(
        `${PROCESSOR_INDEX_PREFIX}default`,
        from ? new Date(from).getTime() : '-inf',
        to ? new Date(to).getTime() : '+inf',
      ),
      redisConnection.zrangebyscore(
        `${PROCESSOR_INDEX_PREFIX}fallback`,
        from ? new Date(from).getTime() : '-inf',
        to ? new Date(to).getTime() : '+inf',
      ),
    ]);

    let totalAmountDefault = 0;
    let totalAmountFallback = 0;

    defaultPayments.forEach(payment => {
      const parsedPayment = JSON.parse(payment) as Payment;
      totalAmountDefault += parsedPayment.amount;
    });

    fallbackPayments.forEach(payment => {
      const parsedPayment = JSON.parse(payment) as Payment;
      totalAmountFallback += parsedPayment.amount;
    });
    return {
      default: {
        totalRequests: defaultPayments.length,
        totalAmount: totalAmountDefault,
      },
      fallback: {
        totalRequests: fallbackPayments.length,
        totalAmount: totalAmountFallback,
      },
    };
  } catch (error) {
    console.error('Failed to retrieve payment data:', error);
    throw new Error('Failed to retrieve payment information');
  }
};

const clearAllPayments = async (flushAll: boolean = false): Promise<void> => {
  try {
    if (flushAll) {
      await redisConnection.flushall();
      console.log('Complete Redis database has been flushed');
    }
  } catch (error) {
    console.error('Failed to clear payment data:', error);
    throw new Error('Failed to clear payment information');
  }
};

export { addPayment, clearAllPayments, getPayments };
