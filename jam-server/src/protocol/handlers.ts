// Room logic, independent of the Durable Object runtime (so it can be unit-tested).
// The JamRoom Durable Object feeds it validated messages and socket events; it changes the room
// data and says what to send through the `Out` interface.
import { can, canRemove, isHost } from '../rooms/permissions';
import { applyHostState, emptyPlayback } from '../rooms/synchronization';
import type { Participant, PublicParticipant, RoomConfig, RoomData, RoomSnapshot } from '../rooms/types';
import { hashToken, newToken, randomId, sameHash } from '../utils/tokens';
import { errorMsg, msg, type ClientMessage, type ServerMessage } from './messages';

/** Per-socket data (kept in the WebSocket attachment, so it survives hibernation). */
export interface Conn {
  /** Participant id once the socket has sent "create" / "join". */
  pid: string | null;
  /** Opened through /ws/new: its first message must be "create". */
  create: boolean;
}

export interface Out {
  /** To this socket. */
  send(m: ServerMessage): void;
  /** To every socket of one participant. */
  sendTo(pid: string, m: ServerMessage): void;
  /** To every joined socket, except those of `exceptPid`. */
  broadcast(m: ServerMessage, exceptPid?: string): void;
  /** Binds this socket to a participant. */
  attach(pid: string): void;
  close(code: number, reason: string): void;
  closePid(pid: string, code: number, reason: string): void;
  /** Participants that have an open socket now (other than `exceptSocket` = this one, when it's closing). */
  connectedPids(): Set<string>;
}

export interface Result {
  /** The room data changed and must be saved. */
  changed: boolean;
  /** The room is over: delete its storage. */
  deleted?: boolean;
}

const NO_CHANGE: Result = { changed: false };
const CHANGED: Result = { changed: true };

export function newRoom(code: string, now: number): RoomData {
  return {
    code,
    hostId: '',
    permission: 'queue',
    createdAt: now,
    updatedAt: now,
    participants: [],
    queue: [],
    playback: emptyPlayback(now),
    hostLostAt: null,
    emptySince: now,
  };
}

export const publicParticipants = (room: RoomData): PublicParticipant[] =>
  room.participants.map((p) => ({ id: p.id, name: p.name, joinedAt: p.joinedAt, isHost: p.id === room.hostId, connected: p.connected }));

export const snapshot = (room: RoomData): RoomSnapshot => ({
  code: room.code,
  hostId: room.hostId,
  permission: room.permission,
  participants: publicParticipants(room),
  queue: room.queue,
  playback: room.playback,
});

const participantsMsg = (room: RoomData) => msg({ type: 'participants', participants: publicParticipants(room), hostId: room.hostId });
const queueMsg = (room: RoomData) => msg({ type: 'queue', queue: room.queue });

async function addParticipant(room: RoomData, name: string, now: number): Promise<{ p: Participant; token: string }> {
  const token = newToken();
  let id = randomId();
  while (room.participants.some((p) => p.id === id)) id = randomId();
  const p: Participant = { id, name, joinedAt: now, connected: true, lastSeen: now, tokenHash: await hashToken(token) };
  room.participants.push(p);
  return { p, token };
}

/** The connected participant who joined first, other than `except`. */
function oldestConnected(room: RoomData, except?: string): Participant | undefined {
  return room.participants.filter((p) => p.connected && p.id !== except).sort((a, b) => a.joinedAt - b.joinedAt)[0];
}

function setHost(room: RoomData, pid: string, out: Out) {
  room.hostId = pid;
  room.hostLostAt = null;
  out.broadcast(participantsMsg(room));
}

/** Removes a participant for good (left, kicked or expired). */
function removeParticipant(room: RoomData, pid: string, out: Out, now: number): Result {
  room.participants = room.participants.filter((p) => p.id !== pid);
  if (!room.participants.some((p) => p.connected)) room.emptySince ??= now;
  if (room.hostId === pid) {
    const next = oldestConnected(room);
    if (!next) return { changed: true, deleted: true }; // nobody left to host
    setHost(room, next.id, out);
  } else {
    out.broadcast(participantsMsg(room));
  }
  return CHANGED;
}

/** Handles one validated message from a socket. */
export async function handleMessage(room: RoomData | null, conn: Conn, m: ClientMessage, out: Out, cfg: RoomConfig, now: number): Promise<Result> {
  if (m.type === 'ping') {
    out.send(msg({ type: 'pong', t: m.t, serverTime: now }));
    return NO_CHANGE;
  }
  if (!room) {
    out.send(errorMsg('not_found', 'this room does not exist'));
    out.close(4004, 'not found');
    return NO_CHANGE;
  }

  // ── Not joined yet: only create / join ──
  if (!conn.pid) {
    if (m.type === 'create') {
      if (!conn.create || room.hostId) {
        out.send(errorMsg('forbidden', 'this room already exists'));
        return NO_CHANGE;
      }
      const { p, token } = await addParticipant(room, m.name, now);
      room.hostId = p.id;
      room.permission = m.permission;
      room.emptySince = null;
      out.attach(p.id);
      out.send(msg({ type: 'welcome', code: room.code, you: p.id, token, room: snapshot(room), serverTime: now }));
      return CHANGED;
    }
    if (m.type === 'join') {
      if (!room.hostId) {
        // Reserved by a creator that never finished creating it.
        out.send(errorMsg('not_found', 'this room does not exist'));
        out.close(4004, 'not found');
        return NO_CHANGE;
      }
      // Rejoin with a reconnect token: same identity (and host role), if the token is still valid.
      if (m.token) {
        const hash = await hashToken(m.token);
        const p = room.participants.find((x) => sameHash(x.tokenHash, hash));
        if (p) {
          out.closePid(p.id, 4001, 'replaced'); // an older socket of the same participant
          p.connected = true;
          p.lastSeen = now;
          p.name = m.name;
          // A new token on every (re)join: the old one stops working.
          const token = newToken();
          p.tokenHash = await hashToken(token);
          if (room.hostId === p.id) room.hostLostAt = null;
          room.emptySince = null;
          out.attach(p.id);
          out.send(msg({ type: 'welcome', code: room.code, you: p.id, token, room: snapshot(room), serverTime: now }));
          out.broadcast(participantsMsg(room), p.id);
          return CHANGED;
        }
      }
      const connected = room.participants.filter((p) => p.connected).length;
      if (connected >= cfg.maxParticipants) {
        out.send(errorMsg('full', 'this room is full'));
        out.close(4003, 'full');
        return NO_CHANGE;
      }
      const { p, token } = await addParticipant(room, m.name, now);
      room.emptySince = null;
      out.attach(p.id);
      out.send(msg({ type: 'welcome', code: room.code, you: p.id, token, room: snapshot(room), serverTime: now }));
      out.broadcast(participantsMsg(room), p.id);
      return CHANGED;
    }
    out.send(errorMsg('not_joined', 'send "create" or "join" first'));
    return NO_CHANGE;
  }

  const pid = conn.pid;
  if (!room.participants.some((p) => p.id === pid)) {
    // Kicked or expired while this socket stayed open.
    out.send(msg({ type: 'ended', reason: 'kicked' }));
    out.close(4000, 'not a participant');
    return NO_CHANGE;
  }
  const deny = () => {
    out.send(errorMsg('forbidden', `not allowed: ${m.type}`));
    return NO_CHANGE;
  };

  switch (m.type) {
    case 'create':
    case 'join':
      out.send(errorMsg('already_joined', 'already in the room'));
      return NO_CHANGE;

    case 'state': {
      if (!can(room, pid, 'state')) return deny();
      room.playback = applyHostState(room.playback, m.track, m.position, m.playing, now);
      out.broadcast(msg({ type: 'playback', playback: room.playback, serverTime: now }), pid);
      return CHANGED;
    }

    case 'control': {
      if (!can(room, pid, 'control')) return deny();
      if (isHost(room, pid)) return NO_CHANGE; // the host just uses its own player
      if (!out.connectedPids().has(room.hostId)) {
        out.send(errorMsg('host_offline', 'the host is offline'));
        return NO_CHANGE;
      }
      out.sendTo(room.hostId, msg({ type: 'control', action: m.action, ...(m.position != null ? { position: m.position } : {}), by: pid }));
      return NO_CHANGE;
    }

    case 'queue:add': {
      if (!can(room, pid, 'queue:add')) return deny();
      if (room.queue.length >= cfg.maxQueue) {
        out.send(errorMsg('queue_full', 'the queue is full'));
        return NO_CHANGE;
      }
      const name = room.participants.find((p) => p.id === pid)?.name || '';
      room.queue.push({ id: randomId(6), track: m.track, addedBy: pid, addedByName: name, addedAt: now });
      out.broadcast(queueMsg(room));
      return CHANGED;
    }

    case 'queue:remove': {
      const item = room.queue.find((q) => q.id === m.itemId);
      if (!item) {
        out.send(errorMsg('no_such_item', 'no such queue item'));
        return NO_CHANGE;
      }
      if (!canRemove(room, pid, item.addedBy)) return deny();
      room.queue = room.queue.filter((q) => q !== item);
      out.broadcast(queueMsg(room));
      return CHANGED;
    }

    case 'queue:move': {
      if (!can(room, pid, 'queue:move')) return deny();
      const from = room.queue.findIndex((q) => q.id === m.itemId);
      if (from < 0) {
        out.send(errorMsg('no_such_item', 'no such queue item'));
        return NO_CHANGE;
      }
      const [item] = room.queue.splice(from, 1);
      room.queue.splice(Math.min(m.index, room.queue.length), 0, item);
      out.broadcast(queueMsg(room));
      return CHANGED;
    }

    case 'queue:next': {
      if (!can(room, pid, 'queue:next')) return deny();
      const item = room.queue.shift() ?? null;
      out.send(msg({ type: 'queue:play', item }));
      if (!item) return NO_CHANGE;
      out.broadcast(queueMsg(room));
      return CHANGED;
    }

    case 'settings': {
      if (!can(room, pid, 'settings')) return deny();
      room.permission = m.permission;
      out.broadcast(msg({ type: 'settings', permission: room.permission }));
      return CHANGED;
    }

    case 'kick': {
      if (!can(room, pid, 'kick')) return deny();
      if (m.participantId === pid || !room.participants.some((p) => p.id === m.participantId)) return NO_CHANGE;
      out.sendTo(m.participantId, msg({ type: 'ended', reason: 'kicked' }));
      out.closePid(m.participantId, 4000, 'kicked');
      return removeParticipant(room, m.participantId, out, now);
    }

    case 'end': {
      if (!can(room, pid, 'end')) return deny();
      out.broadcast(msg({ type: 'ended', reason: 'host' }));
      for (const p of room.participants) out.closePid(p.id, 4000, 'room ended');
      return { changed: true, deleted: true };
    }

    case 'leave': {
      out.close(1000, 'left');
      const r = removeParticipant(room, pid, out, now);
      if (r.deleted) {
        out.broadcast(msg({ type: 'ended', reason: 'host' }));
        for (const p of room.participants) out.closePid(p.id, 4000, 'room ended');
      }
      return r;
    }
  }
}

/** A participant's last socket closed (network drop, app closed…): they can come back with their token. */
export function handleDisconnect(room: RoomData, pid: string, out: Out, now: number): Result {
  const p = room.participants.find((x) => x.id === pid);
  if (!p || !p.connected) return NO_CHANGE;
  if (out.connectedPids().has(pid)) return NO_CHANGE; // another socket of theirs is still open
  p.connected = false;
  p.lastSeen = now;
  if (room.hostId === pid) room.hostLostAt = now;
  if (!room.participants.some((x) => x.connected)) room.emptySince = now;
  out.broadcast(participantsMsg(room));
  return CHANGED;
}

/** Timed housekeeping (run from the Durable Object alarm): host hand-over, expired participants,
 *  idle rooms. */
export function maintain(room: RoomData, cfg: RoomConfig, out: Out, now: number): Result {
  let changed = false;
  // Idle room: nobody connected for too long → gone.
  if (room.emptySince != null && now - room.emptySince >= cfg.idleMs) {
    out.broadcast(msg({ type: 'ended', reason: 'idle' }));
    return { changed: true, deleted: true };
  }
  // Disconnected participants whose reconnect window passed (the host is kept while the room lives).
  const before = room.participants.length;
  room.participants = room.participants.filter((p) => p.connected || p.id === room.hostId || now - p.lastSeen < cfg.reconnectTtlMs);
  if (room.participants.length !== before) changed = true;
  // Host gone for longer than the grace period → the guest who joined first takes over.
  if (room.hostLostAt != null && now - room.hostLostAt >= cfg.hostGraceMs) {
    const next = oldestConnected(room, room.hostId);
    if (next) {
      const old = room.hostId;
      setHost(room, next.id, out);
      // The old host may still rejoin later, as a guest.
      const oldP = room.participants.find((p) => p.id === old);
      if (oldP && now - oldP.lastSeen >= cfg.reconnectTtlMs) room.participants = room.participants.filter((p) => p.id !== old);
      return CHANGED;
    }
  }
  if (changed) out.broadcast(participantsMsg(room));
  return { changed };
}

/** When the room's alarm should next fire (ms), or null for no alarm. Only set while something is
 *  pending (a disconnected host / participant, or an empty room), so an active room can hibernate. */
export function nextAlarm(room: RoomData, cfg: RoomConfig): number | null {
  const times: number[] = [];
  if (room.emptySince != null) times.push(room.emptySince + cfg.idleMs);
  if (room.hostLostAt != null && room.participants.some((p) => p.connected && p.id !== room.hostId)) {
    times.push(room.hostLostAt + cfg.hostGraceMs);
  }
  for (const p of room.participants) {
    if (!p.connected && p.id !== room.hostId) times.push(p.lastSeen + cfg.reconnectTtlMs);
  }
  return times.length ? Math.min(...times) : null;
}
