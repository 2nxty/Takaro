// End-to-end test against a running Worker (default: `npx wrangler dev` on localhost:8787) with
// several independent WebSocket clients:  node test/e2e.mjs [http://host:port]
// Covers creation, join, playback sync, queue, permissions, reconnect and room end.
const BASE = (process.argv[2] || 'http://127.0.0.1:8787').replace(/\/$/, '');
const WS = BASE.replace(/^http/, 'ws');

let failures = 0;
const ok = (cond, label) => {
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${label}`);
  if (!cond) failures++;
};

class Client {
  constructor(path) {
    this.inbox = [];
    this.waiters = [];
    this.ws = new WebSocket(`${WS}${path}`);
    this.ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      this.inbox.push(m);
      this.waiters = this.waiters.filter((w) => !(w.test(m) && (w.resolve(m), true)));
    };
    this.closed = new Promise((r) => (this.ws.onclose = (e) => r(e.code)));
    this.opened = new Promise((r, j) => {
      this.ws.onopen = r;
      this.ws.onerror = j;
    });
  }
  send(m) {
    this.ws.send(JSON.stringify({ version: 1, ...m }));
  }
  /** Next message (already received or future) matching `type` (and `pred`). */
  next(type, pred = () => true, ms = 4000) {
    const test = (m) => m.type === type && pred(m);
    const i = this.inbox.findIndex(test);
    if (i >= 0) return Promise.resolve(this.inbox.splice(i, 1)[0]);
    return new Promise((resolve, reject) => {
      const w = {
        test,
        resolve: (m) => {
          this.inbox.splice(this.inbox.indexOf(m), 1);
          clearTimeout(t);
          resolve(m);
        },
      };
      const t = setTimeout(() => reject(new Error(`timeout waiting for ${type}`)), ms);
      this.waiters.push(w);
    });
  }
  close() {
    this.ws.close(1000);
  }
}

const track = (videoId, title) => ({ videoId, title, artist: 'Artist', thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` });

async function main() {
  ok((await (await fetch(`${BASE}/health`)).text()) === 'ok', 'GET /health');
  ok((await fetch(`${BASE}/room/ZZZZZZ`)).status === 404, 'GET /room of an unknown room → 404');
  ok((await fetch(`${BASE}/room/bad`)).status === 400, 'GET /room with an invalid code → 400');

  // Unknown room over WebSocket: an error message, then closed.
  const lost = new Client('/ws/ZZZZZZ');
  ok((await lost.next('error')).code === 'not_found', 'join unknown room → not_found');
  ok((await lost.closed) === 4004, 'unknown room socket closed with 4004');

  // Create
  const host = new Client('/ws/new');
  await host.opened;
  host.send({ type: 'create', name: 'Host', permission: 'queue' });
  const hw = await host.next('welcome');
  ok(/^[A-HJ-KM-NP-Z2-9]{6}$/.test(hw.code), `room created: ${hw.code}`);
  const info = await (await fetch(`${BASE}/room/${hw.code.toLowerCase()}`)).json();
  ok(info.exists && info.participants === 1 && info.permission === 'queue', 'GET /room shows the room');

  // Clock sync
  const t = Date.now();
  host.send({ type: 'ping', t });
  const pong = await host.next('pong');
  ok(pong.t === t && typeof pong.serverTime === 'number', `ping/pong (rtt ${Date.now() - t} ms)`);

  // Join
  const guest = new Client(`/ws/${hw.code}`);
  await guest.opened;
  guest.send({ type: 'join', name: 'Guest' });
  const gw = await guest.next('welcome');
  ok(gw.room.hostId === hw.you && gw.room.participants.length === 2, 'guest joined and sees the host');
  ok((await host.next('participants')).participants.length === 2, 'host sees the guest');

  // Playback sync
  host.send({ type: 'state', track: track('dQw4w9WgXcQ', 'Song 1'), position: 12.5, playing: true });
  const pb = await guest.next('playback');
  ok(pb.playback.track.videoId === 'dQw4w9WgXcQ' && pb.playback.position === 12.5 && pb.playback.playing && pb.playback.revision === 1,
    'guest receives the host playback state');
  host.send({ type: 'state', track: track('dQw4w9WgXcQ', 'Song 1'), position: 20, playing: false });
  ok((await guest.next('playback')).playback.playing === false, 'pause reaches the guest');

  // Guests can't drive playback
  guest.send({ type: 'state', track: track('aaaaaaaaaaa', 'x'), position: 1, playing: true });
  ok((await guest.next('error')).code === 'forbidden', 'guest state update rejected');
  guest.send({ type: 'control', action: 'pause' });
  ok((await guest.next('error')).code === 'forbidden', 'guest control rejected at permission "queue"');

  // Queue: guest adds, host takes it next
  guest.send({ type: 'queue:add', track: track('9bZkp7q19f0', 'Song 2') });
  const q = await host.next('queue');
  ok(q.queue.length === 1 && q.queue[0].addedByName === 'Guest', 'guest added a song, host sees who added it');
  host.send({ type: 'queue:next' });
  const play = await host.next('queue:play');
  ok(play.item?.track.videoId === '9bZkp7q19f0', 'host takes the guest song next');
  ok(!!(await guest.next('queue', (m) => m.queue.length === 0)), 'queue update reaches the guest');

  // Permission "control": guest pause/seek reach the host
  host.send({ type: 'settings', permission: 'control' });
  ok((await guest.next('settings')).permission === 'control', 'guest sees the new permission');
  guest.send({ type: 'control', action: 'seek', position: 61 });
  const ctl = await host.next('control');
  ok(ctl.action === 'seek' && ctl.position === 61 && ctl.by === gw.you, 'guest seek forwarded to the host');

  // Reconnect with the token: same identity
  guest.close();
  await guest.closed;
  const drop = await host.next('participants', (m) => m.participants.some((p) => p.id === gw.you && !p.connected));
  ok(!!drop, 'host sees the guest disconnected');
  const guest2 = new Client(`/ws/${hw.code}`);
  await guest2.opened;
  guest2.send({ type: 'join', name: 'Guest', token: gw.token });
  const gw2 = await guest2.next('welcome');
  ok(gw2.you === gw.you && gw2.room.playback.revision === 2, 'guest reconnected as the same participant, with the current state');

  // Host reconnects and keeps the room
  host.close();
  await host.closed;
  const host2 = new Client(`/ws/${hw.code}`);
  await host2.opened;
  host2.send({ type: 'join', name: 'Host', token: hw.token });
  const hw2 = await host2.next('welcome');
  ok(hw2.you === hw.you && hw2.room.hostId === hw.you, 'host reconnected and is still the host');

  // Flood → rate limited
  for (let i = 0; i < 40; i++) guest2.send({ type: 'ping', t: i });
  ok(!!(await guest2.next('error', (m) => m.code === 'rate_limited')), 'flooding is rate limited');

  // Room end
  host2.send({ type: 'end' });
  ok((await guest2.next('ended', () => true, 8000)).reason === 'host', 'guest told the room ended');
  ok((await (await fetch(`${BASE}/room/${hw.code}`)).status) === 404, 'ended room is gone');

  console.log(failures ? `\n${failures} failed` : '\nall passed');
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
