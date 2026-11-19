// Room logic: creation, joining, permissions, queue, playback, disconnects, host hand-over, cleanup.
import { describe, expect, it } from 'vitest';
import { handleDisconnect, handleMessage, maintain, newRoom, nextAlarm, type Conn, type Out } from '../src/protocol/handlers';
import type { ClientMessage, ServerMessage } from '../src/protocol/messages';
import { currentPosition } from '../src/rooms/synchronization';
import type { RoomConfig, RoomData } from '../src/rooms/types';
import { parseClientMessage } from '../src/rooms/validation';
import { generateRoomCode, normalizeRoomCode } from '../src/utils/room-code';

const cfg: RoomConfig = { maxParticipants: 3, idleMs: 3600_000, hostGraceMs: 60_000, reconnectTtlMs: 600_000, maxQueue: 3 };
const track = (videoId: string) => ({ videoId, title: `T ${videoId}`, artist: 'A' });

/** A fake room with sockets: each client records what it received. */
class Harness {
  room: RoomData = newRoom('ABCDEF', 0);
  sockets: { conn: Conn; inbox: ServerMessage[]; open: boolean }[] = [];
  now = 1000;

  socket(create = false) {
    const s = { conn: { pid: null, create } as Conn, inbox: [] as ServerMessage[], open: true };
    this.sockets.push(s);
    return s;
  }

  out(self: Harness['sockets'][number] | null, closing = false): Out {
    const open = () => this.sockets.filter((s) => s.open && !(closing && s === self));
    return {
      send: (m) => self?.inbox.push(m),
      sendTo: (pid, m) => open().filter((s) => s.conn.pid === pid).forEach((s) => s.inbox.push(m)),
      broadcast: (m, except) => open().filter((s) => s.conn.pid && s.conn.pid !== except).forEach((s) => s.inbox.push(m)),
      attach: (pid) => self && (self.conn.pid = pid),
      close: () => self && (self.open = false),
      closePid: (pid) => open().filter((s) => s !== self && s.conn.pid === pid).forEach((s) => (s.open = false)),
      connectedPids: () => new Set(open().map((s) => s.conn.pid).filter((p): p is string => !!p)),
    };
  }

  async send(s: Harness['sockets'][number], m: { type: ClientMessage['type'] } & Record<string, unknown>) {
    const parsed = parseClientMessage(JSON.stringify({ version: 1, ...m }));
    const r = await handleMessage(this.room, s.conn, parsed, this.out(s), cfg, this.now);
    return r;
  }

  drop(s: Harness['sockets'][number]) {
    s.open = false;
    return handleDisconnect(this.room, s.conn.pid!, this.out(s, true), this.now);
  }

  last(s: Harness['sockets'][number], type?: string) {
    const list = type ? s.inbox.filter((m) => m.type === type) : s.inbox;
    return list[list.length - 1] as any;
  }
}

async function roomWithGuest(permission = 'queue') {
  const h = new Harness();
  const host = h.socket(true);
  await h.send(host, { type: 'create', name: 'Host', permission });
  h.now += 10;
  const guest = h.socket();
  await h.send(guest, { type: 'join', name: 'Guest' });
  return { h, host, guest };
}

describe('room codes', () => {
  it('generates valid, normalizable codes', () => {
    for (let i = 0; i < 200; i++) {
      const c = generateRoomCode();
      expect(c).toMatch(/^[A-HJ-KM-NP-Z2-9]{6}$/);
      expect(normalizeRoomCode(c.toLowerCase())).toBe(c);
    }
  });
  it('rejects invalid codes', () => {
    expect(normalizeRoomCode('ABC')).toBeNull();
    expect(normalizeRoomCode('ABCDE0')).toBeNull(); // 0 is not in the alphabet
    expect(normalizeRoomCode('abc-def')).toBe('ABCDEF');
    expect(normalizeRoomCode('../../x')).toBeNull();
  });
});

describe('create and join', () => {
  it('the creator becomes host and gets a token', async () => {
    const h = new Harness();
    const host = h.socket(true);
    await h.send(host, { type: 'create', name: 'Ana', permission: 'control' });
    const w = h.last(host, 'welcome');
    expect(w.you).toBe(h.room.hostId);
    expect(w.token).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    expect(h.room.permission).toBe('control');
    expect(h.room.participants[0].tokenHash).not.toBe(w.token);
  });

  it('a joiner cannot create, nor claim host', async () => {
    const { h, guest } = await roomWithGuest();
    const g2 = h.socket(false);
    await h.send(g2, { type: 'create', name: 'X', permission: 'control' });
    expect(h.last(g2, 'error').code).toBe('forbidden');
    expect(h.room.hostId).not.toBe(guest.conn.pid);
  });

  it('joining an unfinished room fails', async () => {
    const h = new Harness();
    const s = h.socket();
    await h.send(s, { type: 'join', name: 'Bo' });
    expect(h.last(s, 'error').code).toBe('not_found');
  });

  it('the room has a participant limit', async () => {
    const { h } = await roomWithGuest();
    const g2 = h.socket();
    await h.send(g2, { type: 'join', name: 'G2' });
    const g3 = h.socket();
    await h.send(g3, { type: 'join', name: 'G3' });
    expect(h.last(g3, 'error').code).toBe('full');
  });

  it('others see the new participant', async () => {
    const { host } = await roomWithGuest();
    expect(host.inbox.filter((m) => m.type === 'participants').length).toBe(1);
  });

  it('messages before joining are rejected', async () => {
    const h = new Harness();
    h.room.hostId = 'x';
    const s = h.socket();
    await h.send(s, { type: 'queue:add', track: track('aaaaaaaaaaa') });
    expect(h.last(s, 'error').code).toBe('not_joined');
  });
});

describe('permissions', () => {
  it('guests cannot send playback state', async () => {
    const { h, guest } = await roomWithGuest('control');
    await h.send(guest, { type: 'state', track: track('aaaaaaaaaaa'), position: 1, playing: true });
    expect(h.last(guest, 'error').code).toBe('forbidden');
    expect(h.room.playback.revision).toBe(0);
  });

  it('"host": guests cannot add to the queue', async () => {
    const { h, guest } = await roomWithGuest('host');
    await h.send(guest, { type: 'queue:add', track: track('aaaaaaaaaaa') });
    expect(h.last(guest, 'error').code).toBe('forbidden');
  });

  it('"queue": guests add but cannot control', async () => {
    const { h, guest, host } = await roomWithGuest('queue');
    await h.send(guest, { type: 'queue:add', track: track('aaaaaaaaaaa') });
    expect(h.room.queue).toHaveLength(1);
    await h.send(guest, { type: 'control', action: 'pause' });
    expect(h.last(guest, 'error').code).toBe('forbidden');
    expect(h.last(host, 'control')).toBeUndefined();
  });

  it('"control": guest pause / seek / next reach the host', async () => {
    const { h, guest, host } = await roomWithGuest('control');
    await h.send(guest, { type: 'control', action: 'seek', position: 42 });
    expect(h.last(host, 'control')).toMatchObject({ action: 'seek', position: 42, by: guest.conn.pid });
    await h.send(guest, { type: 'control', action: 'next' });
    expect(h.last(host, 'control').action).toBe('next');
  });

  it('only the host changes settings, kicks and ends', async () => {
    const { h, guest, host } = await roomWithGuest('control');
    await h.send(guest, { type: 'settings', permission: 'host' });
    expect(h.room.permission).toBe('control');
    await h.send(host, { type: 'settings', permission: 'host' });
    expect(h.last(guest, 'settings').permission).toBe('host');
    await h.send(guest, { type: 'end' });
    expect(h.last(guest, 'error').code).toBe('forbidden');
    await h.send(host, { type: 'kick', participantId: guest.conn.pid! });
    expect(h.last(guest, 'ended').reason).toBe('kicked');
    expect(guest.open).toBe(false);
    expect(h.room.participants).toHaveLength(1);
  });
});

describe('queue', () => {
  it('add, remove own, host removes any, move, next', async () => {
    const { h, guest, host } = await roomWithGuest();
    await h.send(guest, { type: 'queue:add', track: track('aaaaaaaaaaa') });
    await h.send(host, { type: 'queue:add', track: track('bbbbbbbbbbb') });
    await h.send(guest, { type: 'queue:add', track: track('ccccccccccc') });
    await h.send(guest, { type: 'queue:add', track: track('ddddddddddd') });
    expect(h.last(guest, 'error').code).toBe('queue_full');
    const [a, b, c] = h.room.queue;
    expect(a.addedByName).toBe('Guest');
    await h.send(guest, { type: 'queue:remove', itemId: b.id });
    expect(h.last(guest, 'error').code).toBe('forbidden');
    await h.send(guest, { type: 'queue:move', itemId: c.id, index: 0 });
    expect(h.room.queue[0].id).toBe(a.id);
    await h.send(host, { type: 'queue:move', itemId: c.id, index: 0 });
    expect(h.room.queue.map((q) => q.id)).toEqual([c.id, a.id, b.id]);
    await h.send(guest, { type: 'queue:remove', itemId: a.id });
    expect(h.room.queue.map((q) => q.id)).toEqual([c.id, b.id]);
    await h.send(host, { type: 'queue:remove', itemId: b.id });
    expect(h.last(guest, 'queue').queue.map((q: any) => q.id)).toEqual([c.id]);
    // next: the host takes the first item; guests can't.
    await h.send(guest, { type: 'queue:next' });
    expect(h.room.queue).toHaveLength(1);
    await h.send(host, { type: 'queue:next' });
    expect(h.last(host, 'queue:play').item.id).toBe(c.id);
    expect(h.room.queue).toHaveLength(0);
    await h.send(host, { type: 'queue:next' });
    expect(h.last(host, 'queue:play').item).toBeNull();
  });

  it('rejects invalid tracks', () => {
    expect(() => parseClientMessage(JSON.stringify({ version: 1, type: 'queue:add', track: { videoId: 'bad' } }))).toThrow();
    const t = parseClientMessage(JSON.stringify({ version: 1, type: 'queue:add',
      track: { videoId: 'aaaaaaaaaaa', title: 'x\u0000y', artist: 'z', thumbnail: 'https://evil.example/a.png' } })) as any;
    expect(t.track.title).toBe('x y');
    expect(t.track.thumbnail).toBeUndefined();
  });
});

describe('playback', () => {
  it('host state is stamped with server time and a new revision', async () => {
    const { h, guest, host } = await roomWithGuest();
    await h.send(host, { type: 'state', track: track('aaaaaaaaaaa'), position: 10, playing: true });
    const p = h.last(guest, 'playback');
    expect(p.playback).toMatchObject({ position: 10, playing: true, revision: 1, updatedAt: h.now });
    expect(currentPosition(h.room.playback, h.now + 2500)).toBeCloseTo(12.5);
    h.now += 5000;
    await h.send(host, { type: 'state', track: track('aaaaaaaaaaa'), position: 15, playing: false });
    expect(h.last(guest, 'playback').playback.revision).toBe(2);
    expect(currentPosition(h.room.playback, h.now + 99999)).toBe(15);
    // The host doesn't get its own state back.
    expect(h.last(host, 'playback')).toBeUndefined();
  });
});

describe('disconnects, reconnects and host hand-over', () => {
  it('a guest reconnects as the same participant with their token', async () => {
    const { h, guest } = await roomWithGuest();
    const { you, token } = h.last(guest, 'welcome');
    h.drop(guest);
    expect(h.room.participants.find((p) => p.id === you)!.connected).toBe(false);
    const again = h.socket();
    await h.send(again, { type: 'join', name: 'Guest', token });
    expect(h.last(again, 'welcome').you).toBe(you);
    // The old token was replaced.
    const thief = h.socket();
    await h.send(thief, { type: 'join', name: 'Thief', token });
    expect(h.last(thief, 'welcome').you).not.toBe(you);
  });

  it('a wrong token just joins as someone new', async () => {
    const { h, host } = await roomWithGuest();
    const s = h.socket();
    await h.send(s, { type: 'join', name: 'X', token: 'A'.repeat(43) });
    expect(h.last(s, 'welcome').you).not.toBe(host.conn.pid);
  });

  it('the host keeps the room during a short drop', async () => {
    const { h, host } = await roomWithGuest();
    const { you, token } = h.last(host, 'welcome');
    h.drop(host);
    expect(h.room.hostLostAt).toBe(h.now);
    h.now += 30_000;
    maintain(h.room, cfg, h.out(null), h.now);
    expect(h.room.hostId).toBe(you);
    const again = h.socket();
    await h.send(again, { type: 'join', name: 'Host', token });
    expect(h.room.hostId).toBe(you);
    expect(h.room.hostLostAt).toBeNull();
  });

  it('after the grace period the oldest guest becomes host', async () => {
    const { h, host, guest } = await roomWithGuest();
    h.now += 10;
    const g2 = h.socket();
    await h.send(g2, { type: 'join', name: 'G2' });
    h.drop(host);
    expect(nextAlarm(h.room, cfg)).toBe(h.now + cfg.hostGraceMs);
    h.now += cfg.hostGraceMs;
    maintain(h.room, cfg, h.out(null), h.now);
    expect(h.room.hostId).toBe(guest.conn.pid);
    expect(h.last(g2, 'participants').hostId).toBe(guest.conn.pid);
  });

  it('the host leaving hands the room over at once; the last one leaving ends it', async () => {
    const { h, host, guest } = await roomWithGuest();
    await h.send(host, { type: 'leave' });
    expect(h.room.hostId).toBe(guest.conn.pid);
    const r = await h.send(guest, { type: 'leave' });
    expect(r.deleted).toBe(true);
  });

  it('end: everyone is told and the room is deleted', async () => {
    const { h, host, guest } = await roomWithGuest();
    const r = await h.send(host, { type: 'end' });
    expect(r.deleted).toBe(true);
    expect(h.last(guest, 'ended').reason).toBe('host');
  });

  it('expired guests are removed; idle rooms are deleted; active rooms have no alarm', async () => {
    const { h, guest, host } = await roomWithGuest();
    expect(nextAlarm(h.room, cfg)).toBeNull(); // everyone connected: nothing scheduled
    h.drop(guest);
    h.now += cfg.reconnectTtlMs;
    maintain(h.room, cfg, h.out(null), h.now);
    expect(h.room.participants).toHaveLength(1);
    h.drop(host);
    expect(h.room.emptySince).toBe(h.now);
    h.now += cfg.idleMs;
    expect(maintain(h.room, cfg, h.out(null), h.now).deleted).toBe(true);
  });
});
