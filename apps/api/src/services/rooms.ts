import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import type { Db } from '../db.js';
import { AppError } from '../errors.js';
import type { MediaGateway } from '../livekit.js';
import { formatCode, generateRoomCode, normalizeCode } from '../room-code.js';
import { issueToken } from './tokens.js';

export interface RoomDeps {
  db: Db;
  media: MediaGateway;
  now: () => number;
  apiKey: string;
  apiSecret: string;
  livekitUrl: string;
  tokenTtlSeconds: number;
}

export interface CreateRoomInput {
  displayName: string;
  password?: string;
  maxParticipants?: number;
  expiresInMinutes?: number;
}

export interface JoinResult {
  code: string;
  serverUrl: string;
  token: string;
  expiresAt: string;
}

interface RoomRow {
  code: string;
  expires_at: number;
  max_participants: number;
  password_hash: string | null;
  state: 'active' | 'expired';
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 32);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(':');
  const expected = Buffer.from(hashHex!, 'hex');
  const actual = scryptSync(password, Buffer.from(saltHex!, 'hex'), expected.length);
  return timingSafeEqual(actual, expected);
}

async function result(
  d: RoomDeps,
  code: string,
  name: string,
  expiresAt: number,
): Promise<JoinResult> {
  const token = await issueToken({
    apiKey: d.apiKey,
    apiSecret: d.apiSecret,
    room: code,
    identity: randomUUID(),
    name,
    ttlSeconds: d.tokenTtlSeconds,
  });
  return {
    code: formatCode(code),
    serverUrl: d.livekitUrl,
    token,
    expiresAt: new Date(expiresAt).toISOString(),
  };
}

export async function createRoom(d: RoomDeps, input: CreateRoomInput): Promise<JoinResult> {
  const max = input.maxParticipants ?? 10;
  const minutes = input.expiresInMinutes ?? 720;
  const createdAt = d.now();
  const expiresAt = createdAt + minutes * 60_000;
  const passwordHash = input.password ? hashPassword(input.password) : null;
  const insert = d.db.prepare(
    'INSERT INTO rooms (code, created_at, expires_at, max_participants, password_hash) VALUES (?,?,?,?,?)',
  );
  for (let attempt = 0; ; attempt++) {
    const code = generateRoomCode();
    try {
      insert.run(code, createdAt, expiresAt, max, passwordHash);
      return await result(d, code, input.displayName, expiresAt);
    } catch (e) {
      if (attempt < 3 && (e as { code?: string }).code === 'SQLITE_CONSTRAINT_PRIMARYKEY') continue;
      throw e;
    }
  }
}

export async function joinRoom(
  d: RoomDeps,
  rawCode: string,
  input: { displayName: string; password?: string },
): Promise<JoinResult> {
  const code = normalizeCode(rawCode);
  if (!code) throw new AppError('room_not_found');
  const row = d.db.prepare('SELECT * FROM rooms WHERE code = ?').get(code) as RoomRow | undefined;
  if (!row) throw new AppError('room_not_found');
  if (row.state === 'expired' || d.now() >= row.expires_at) {
    d.db.prepare("UPDATE rooms SET state = 'expired' WHERE code = ?").run(code);
    throw new AppError('room_expired');
  }
  if (row.password_hash && !(input.password && verifyPassword(input.password, row.password_hash))) {
    throw new AppError('wrong_password');
  }
  if ((await d.media.countParticipants(code)) >= row.max_participants)
    throw new AppError('room_full');
  return result(d, code, input.displayName, row.expires_at);
}
