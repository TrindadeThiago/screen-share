import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AppError } from '../errors.js';
import { timingSafeEqual } from 'node:crypto';
import {
  createRoom,
  joinRoom,
  releaseBroadcast,
  requestBroadcast,
  type RoomDeps,
} from '../services/rooms.js';

const name = z.string().trim().min(1).max(32);
const createSchema = z.object({
  displayName: name,
  password: z.string().min(4).max(64).optional(),
  maxParticipants: z.number().int().min(2).max(10).optional(),
  expiresInMinutes: z.number().int().min(15).max(1440).optional(),
});
const token = z.string().min(1).max(4096);
const joinSchema = z.object({
  displayName: name,
  password: z.string().max(64).optional(),
  rejoinToken: token.optional(),
});
const broadcastSchema = z.object({ token });

function sameKey(given: unknown, expected: string): boolean {
  if (typeof given !== 'string') return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function roomRoutes(deps: RoomDeps, tokenRateMax: number) {
  return async (app: FastifyInstance) => {
    app.post('/rooms', async (req, reply) => {
      if (deps.roomCreationKey && !sameKey(req.headers['x-server-key'], deps.roomCreationKey))
        throw new AppError('server_key_required');
      const parsed = createSchema.safeParse(req.body);
      if (!parsed.success) throw new AppError('invalid_request');
      return reply.status(201).send(await createRoom(deps, parsed.data));
    });

    app.post<{ Params: { code: string } }>(
      '/rooms/:code/token',
      { config: { rateLimit: { max: tokenRateMax, timeWindow: '1 minute' } } },
      async (req) => {
        const parsed = joinSchema.safeParse(req.body);
        if (!parsed.success) throw new AppError('invalid_request');
        return joinRoom(deps, req.params.code, parsed.data);
      },
    );

    app.post<{ Params: { code: string } }>('/rooms/:code/broadcast', async (req, reply) => {
      const parsed = broadcastSchema.safeParse(req.body);
      if (!parsed.success) throw new AppError('invalid_request');
      await requestBroadcast(deps, req.params.code, parsed.data.token);
      return reply.status(204).send();
    });

    app.post<{ Params: { code: string } }>('/rooms/:code/broadcast/stop', async (req, reply) => {
      const parsed = broadcastSchema.safeParse(req.body);
      if (!parsed.success) throw new AppError('invalid_request');
      await releaseBroadcast(deps, req.params.code, parsed.data.token);
      return reply.status(204).send();
    });
  };
}
