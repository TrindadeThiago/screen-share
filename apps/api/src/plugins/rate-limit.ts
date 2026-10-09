import rateLimit from '@fastify/rate-limit';
import type { FastifyInstance } from 'fastify';
import { errorBody } from '../errors.js';

export async function registerRateLimit(app: FastifyInstance, globalMax: number) {
  await app.register(rateLimit, {
    global: true,
    max: globalMax,
    timeWindow: '1 minute',
    errorResponseBuilder: () =>
      Object.assign(new Error(errorBody('rate_limited').message), { statusCode: 429 }),
  });
}
