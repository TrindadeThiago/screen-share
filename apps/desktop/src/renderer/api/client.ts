export type ApiErrorCode =
  | 'invalid_request'
  | 'wrong_password'
  | 'room_not_found'
  | 'room_full'
  | 'room_expired'
  | 'server_key_required'
  | 'invalid_token'
  | 'broadcast_busy'
  | 'rate_limited'
  | 'server_error'
  | 'network';

export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export interface JoinResult {
  code: string;
  serverUrl: string;
  token: string;
  expiresAt: string;
}

export interface CreateRoomInput {
  displayName: string;
  password?: string;
  maxParticipants?: number;
  expiresInMinutes?: number;
}

export interface ApiClient {
  createRoom(input: CreateRoomInput): Promise<JoinResult>;
  joinRoom(
    code: string,
    input: { displayName: string; password?: string; rejoinToken?: string },
  ): Promise<JoinResult>;
  /** Pede a vez de transmitir; falha com `broadcast_busy` se outra pessoa transmite. */
  requestBroadcast(code: string, token: string): Promise<void>;
  releaseBroadcast(code: string, token: string): Promise<void>;
  getVersion(): Promise<{ latest: string; downloadUrl: string }>;
}

export const API_URL: string =
  (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_URL ??
  'https://screenshare.example.com';

export function createApiClient(
  baseUrl: string = API_URL,
  fetchFn: typeof fetch = (...a) => fetch(...a),
  serverKey: string | null = null,
): ApiClient {
  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    let res: Response;
    try {
      res = await fetchFn(`${baseUrl}${path}`, {
        ...init,
        headers: { 'content-type': 'application/json', ...init?.headers },
      });
    } catch {
      throw new ApiError(
        'network',
        'Não foi possível conectar ao servidor. Verifique sua internet.',
      );
    }
    if (res.status === 204) return undefined as T;
    if (res.ok) return (await res.json()) as T;
    let body: { error?: ApiErrorCode; message?: string } = {};
    try {
      body = await res.json();
    } catch {
      /* corpo não é JSON */
    }
    throw new ApiError(
      body.error ?? 'server_error',
      body.message ?? 'Erro inesperado do servidor.',
    );
  }

  return {
    createRoom: (input) =>
      request('/rooms', {
        method: 'POST',
        body: JSON.stringify(input),
        ...(serverKey ? { headers: { 'x-server-key': serverKey } } : {}),
      }),
    requestBroadcast: (code, token) =>
      request(`/rooms/${encodeURIComponent(code.trim())}/broadcast`, {
        method: 'POST',
        body: JSON.stringify({ token }),
      }),
    releaseBroadcast: (code, token) =>
      request(`/rooms/${encodeURIComponent(code.trim())}/broadcast/stop`, {
        method: 'POST',
        body: JSON.stringify({ token }),
      }),
    joinRoom: (code, input) =>
      request(`/rooms/${encodeURIComponent(code.trim())}/token`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    getVersion: () => request('/version'),
  };
}
