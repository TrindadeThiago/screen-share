import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

export type ErrorCode =
  | 'invalid_request'
  | 'wrong_password'
  | 'room_not_found'
  | 'room_full'
  | 'room_expired'
  | 'rate_limited'
  | 'server_error';

const STATUS: Record<ErrorCode, number> = {
  invalid_request: 400,
  wrong_password: 401,
  room_not_found: 404,
  room_full: 409,
  room_expired: 410,
  rate_limited: 429,
  server_error: 500,
};

const MESSAGE: Record<ErrorCode, string> = {
  invalid_request: 'Dados inválidos. Confira o nome e o código e tente novamente.',
  wrong_password: 'Senha incorreta.',
  room_not_found: 'Sala não encontrada. Confira o código.',
  room_full: 'A sala está lotada.',
  room_expired: 'Esta sala expirou.',
  rate_limited: 'Muitas tentativas. Aguarde um pouco e tente de novo.',
  server_error: 'Erro interno do servidor.',
};

export class AppError extends Error {
  readonly status: number;
  constructor(readonly code: ErrorCode) {
    super(MESSAGE[code]);
    this.status = STATUS[code];
  }
}

export function errorBody(code: ErrorCode) {
  return { error: code, message: MESSAGE[code] };
}

export function errorHandler(
  err: FastifyError | AppError,
  req: FastifyRequest,
  reply: FastifyReply,
) {
  if (err instanceof AppError) return reply.status(err.status).send(errorBody(err.code));
  if ((err as FastifyError).statusCode === 429)
    return reply.status(429).send(errorBody('rate_limited'));
  if ((err as FastifyError).statusCode && (err as FastifyError).statusCode! < 500) {
    return reply.status(400).send(errorBody('invalid_request'));
  }
  req.log.error({ err: { type: err.name } }, 'unhandled error');
  return reply.status(500).send(errorBody('server_error'));
}
