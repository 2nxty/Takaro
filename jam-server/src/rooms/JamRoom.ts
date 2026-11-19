// One Durable Object per Jam room. Uses the WebSocket Hibernation API: while nobody sends
// anything the object is evicted from memory and the sockets stay open; the room data lives in
// the object's SQLite storage and each socket's participant id in its attachment.
import { DurableObject } from 'cloudflare:workers';
import type { Env } from '../index';
import { handleDisconnect, handleMessage, maintain, newRoom, nextAlarm, type Conn, type Out } from '../protocol/handlers';
import { errorMsg, HEARTBEAT, type ServerMessage } from '../protocol/messages';
import type { RoomConfig, RoomData } from './types';
import { parseClientMessage, ValidationError } from './validation';

const KEY = 'room';

const num = (v: string | undefined, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

/** Per-socket rate limit: a token bucket of 20 messages, refilled at 5 per second. */
const BUCKET = 20;
const REFILL_PER_MS = 5 / 1000;
/** Sockets that keep flooding after being told are closed. */
const MAX_STRIKES = 50;

export class JamRoom extends DurableObject<Env> {
  private room: RoomData | null = null;
  private cfg: RoomConfig;
  private buckets = new WeakMap<WebSocket, { tokens: number; at: number; strikes: number }>();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.cfg = {
      maxParticipants: num(env.MAX_ROOM_PARTICIPANTS, 20),
      idleMs: num(env.MAX_ROOMS_IDLE_SECONDS, 3600) * 1000,
      hostGraceMs: num(env.HOST_GRACE_SECONDS, 60) * 1000,
      reconnectTtlMs: num(env.RECONNECT_TTL_SECONDS, 600) * 1000,
      maxQueue: 100,
    };
    // Keep-alives are answered without waking the object.
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair(HEARTBEAT, HEARTBEAT));
    ctx.blockConcurrencyWhile(async () => {
      this.room = (await ctx.storage.get<RoomData>(KEY)) ?? null;
    });
  }

  /** Internal entry point, only reachable through the Worker (index.ts). */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const code = request.headers.get('X-Jam-Code') || '';

    if (url.pathname === '/info') {
      const r = this.room;
      if (!r || !r.hostId) return Response.json({ exists: false }, { status: 404 });
      return Response.json({
        exists: true,
        code: r.code,
        permission: r.permission,
        participants: r.participants.filter((p) => p.connected).length,
        host: r.participants.find((p) => p.id === r.hostId)?.name || null,
      });
    }

    if (request.headers.get('Upgrade') !== 'websocket') return new Response('expected a WebSocket', { status: 426 });
    const create = request.headers.get('X-Jam-Create') === '1';
    if (create) {
      // The Worker picked a random code: if it's taken, it tries another one.
      if (this.room) return new Response('code taken', { status: 409 });
      this.room = newRoom(code, Date.now());
      await this.save();
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    const conn: Conn = { pid: null, create };
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment(conn);
    if (!this.room) {
      // Unknown room: accept, say so, close (a browser can't read an HTTP error on a WebSocket).
      server.send(JSON.stringify(errorMsg('not_found', 'this room does not exist')));
      server.close(4004, 'not found');
    }
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    const conn = (ws.deserializeAttachment() as Conn | null) ?? { pid: null, create: false };
    const out = this.out(ws);
    if (!this.allow(ws)) {
      out.send(errorMsg('rate_limited', 'too many messages'));
      return;
    }
    let m;
    try {
      m = parseClientMessage(raw);
    } catch (e) {
      out.send(errorMsg(e instanceof ValidationError ? e.code : 'bad_message', e instanceof Error ? e.message : 'invalid message'));
      return;
    }
    const result = await handleMessage(this.room, conn, m, out, this.cfg, Date.now());
    if (result.deleted) await this.destroy();
    else if (result.changed) await this.save();
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
    try {
      ws.close(code === 1005 || code === 1006 ? 1000 : code, reason);
    } catch {}
    await this.disconnected(ws);
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.disconnected(ws);
  }

  async alarm(): Promise<void> {
    if (!this.room) return;
    const result = maintain(this.room, this.cfg, this.out(null), Date.now());
    if (result.deleted) await this.destroy();
    else await this.save(result.changed);
  }

  private async disconnected(ws: WebSocket) {
    const conn = ws.deserializeAttachment() as Conn | null;
    if (!this.room || !conn?.pid) return;
    const result = handleDisconnect(this.room, conn.pid, this.out(ws, true), Date.now());
    if (result.changed) await this.save();
  }

  /** Saves the room (when it changed) and sets the housekeeping alarm. */
  private async save(changed = true) {
    if (!this.room) return;
    if (changed) {
      this.room.updatedAt = Date.now();
      await this.ctx.storage.put(KEY, this.room);
    }
    const at = nextAlarm(this.room, this.cfg);
    if (at == null) await this.ctx.storage.deleteAlarm();
    else await this.ctx.storage.setAlarm(Math.max(at, Date.now() + 1000));
  }

  private async destroy() {
    this.room = null;
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.close(4000, 'room ended');
      } catch {}
    }
    await this.ctx.storage.deleteAlarm();
    await this.ctx.storage.deleteAll();
  }

  private allow(ws: WebSocket): boolean {
    const now = Date.now();
    const b = this.buckets.get(ws) ?? { tokens: BUCKET, at: now, strikes: 0 };
    b.tokens = Math.min(BUCKET, b.tokens + (now - b.at) * REFILL_PER_MS);
    b.at = now;
    this.buckets.set(ws, b);
    if (b.tokens >= 1) {
      b.tokens -= 1;
      return true;
    }
    if (++b.strikes > MAX_STRIKES) {
      try {
        ws.close(4008, 'rate limited');
      } catch {}
    }
    return false;
  }

  /** Socket helpers for the room logic. `self` is the socket the event came from (if any). */
  private out(self: WebSocket | null, closing = false): Out {
    // Open sockets; the one being closed (in a close / error handler) never counts.
    const open = () => this.ctx.getWebSockets().filter((ws) => ws.readyState === WebSocket.OPEN && !(closing && ws === self));
    const pidOf = (ws: WebSocket) => (ws.deserializeAttachment() as Conn | null)?.pid ?? null;
    const sendRaw = (ws: WebSocket, m: ServerMessage) => {
      try {
        ws.send(JSON.stringify(m));
      } catch {}
    };
    return {
      send: (m) => self && sendRaw(self, m),
      sendTo: (pid, m) => {
        for (const ws of open()) if (pidOf(ws) === pid) sendRaw(ws, m);
      },
      broadcast: (m, exceptPid) => {
        const text = JSON.stringify(m);
        for (const ws of open()) {
          const pid = pidOf(ws);
          if (!pid || pid === exceptPid) continue;
          try {
            ws.send(text);
          } catch {}
        }
      },
      attach: (pid) => {
        if (!self) return;
        const conn = (self.deserializeAttachment() as Conn | null) ?? { pid: null, create: false };
        self.serializeAttachment({ ...conn, pid });
      },
      close: (code, reason) => {
        try {
          self?.close(code, reason);
        } catch {}
      },
      closePid: (pid, code, reason) => {
        for (const ws of open()) {
          if (ws === self || pidOf(ws) !== pid) continue;
          try {
            ws.close(code, reason);
          } catch {}
        }
      },
      connectedPids: () => {
        const set = new Set<string>();
        for (const ws of open()) {
          const pid = pidOf(ws);
          if (pid) set.add(pid);
        }
        return set;
      },
    };
  }
}

