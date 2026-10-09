import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AppError } from '../errors.js';
import { createRoom, joinRoom, type RoomDeps } from '../services/rooms.js';

const name = z.string().trim().min(1).max(32);
const createSchema = z.object({
  displayName: name,
  password: z.string().min(4).max(64).optional(),
  maxParticipants: z.number().int().min(2).max(10).optional(),
  expiresInMinutes: z.number().int().min(15).max(1440).optional(),
});
const joinSchema = z.object({ displayName: name, password: z.string().max(64).optional() });

export function roomRoutes(deps: RoomDeps, tokenRateMax: number) {
  return async (app: FastifyInstance) => {
    app.post('/rooms', async (req, reply) => {
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
  };
}
