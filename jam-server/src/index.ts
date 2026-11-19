// Takaro Jam Worker: the public entry point. It validates requests and hands each room's
// WebSockets to that room's Durable Object (one per room code).
//
//   GET /health          → "ok"
//   GET /room/<code>     → { exists, participants, permission, host } (404 if there's no such room)
//   GET /ws/new          → WebSocket: creates a room (first message: "create")
//   GET /ws/<code>       → WebSocket: joins a room (first message: "join")
import { normalizeRoomCode, generateRoomCode } from './utils/room-code';

export { JamRoom } from './rooms/JamRoom';

export interface Env {
  JAM_ROOMS: DurableObjectNamespace;
  CREATE_LIMITER?: { limit(options: { key: string }): Promise<{ success: boolean }> };
  MAX_ROOM_PARTICIPANTS?: string;
  MAX_ROOMS_IDLE_SECONDS?: string;
  HOST_GRACE_SECONDS?: string;
  RECONNECT_TTL_SECONDS?: string;
  ALLOWED_ORIGINS?: string;
}

const allowedOrigins = (env: Env) =>
  (env.ALLOWED_ORIGINS || 'https://music.youtube.com').split(',').map((s) => s.trim()).filter(Boolean);

function cors(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get('Origin');
  if (!origin || !allowedOrigins(env).includes(origin)) return {};
  return { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET, OPTIONS', Vary: 'Origin' };
}

const text = (body: string, status: number, headers: Record<string, string> = {}) =>
  new Response(body, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8', ...headers } });

/** Forwards a request to a room's Durable Object, with the (validated) code in a header. */
function toRoom(env: Env, request: Request, code: string, path: string, extra: Record<string, string> = {}) {
  const stub = env.JAM_ROOMS.get(env.JAM_ROOMS.idFromName(code));
  const headers = new Headers(request.headers);
  headers.set('X-Jam-Code', code);
  headers.delete('X-Jam-Create');
  for (const [k, v] of Object.entries(extra)) headers.set(k, v);
  return stub.fetch(new Request(`https://room${path}`, { method: 'GET', headers }));
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean);
    const h = cors(request, env);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...h, 'Access-Control-Max-Age': '86400' } });
    if (request.method !== 'GET') return text('method not allowed', 405, { Allow: 'GET, OPTIONS', ...h });

    if (parts.length === 1 && parts[0] === 'health') return text('ok', 200, h);

    if (parts.length === 2 && parts[0] === 'room') {
      const code = normalizeRoomCode(parts[1]);
      if (!code) return Response.json({ error: 'invalid room code' }, { status: 400, headers: h });
      const res = await toRoom(env, request, code, '/info');
      return new Response(res.body, { status: res.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...h } });
    }

    if (parts.length === 2 && parts[0] === 'ws') {
      if (request.headers.get('Upgrade') !== 'websocket') return text('expected a WebSocket upgrade', 426);
      const origin = request.headers.get('Origin');
      if (origin && !allowedOrigins(env).includes(origin)) return text('origin not allowed', 403);

      if (parts[1] === 'new') {
        // Room creation, limited per IP address.
        const ip = request.headers.get('CF-Connecting-IP') || 'local';
        if (env.CREATE_LIMITER) {
          const { success } = await env.CREATE_LIMITER.limit({ key: ip });
          if (!success) return text('too many rooms created, try again in a minute', 429);
        }
        for (let i = 0; i < 5; i++) {
          const res = await toRoom(env, request, generateRoomCode(), '/ws', { 'X-Jam-Create': '1' });
          if (res.status !== 409) return res;
        }
        return text('could not allocate a room code', 503);
      }

      const code = normalizeRoomCode(parts[1]);
      if (!code) return text('invalid room code', 400);
      return toRoom(env, request, code, '/ws');
    }

    return text('not found', 404, h);
  },
} satisfies ExportedHandler<Env>;
