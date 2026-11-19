# Takaro Jam server

The room server behind [Takaro Jam](../README.md#takaro-jam): a Cloudflare Worker with one
**Durable Object per room** (SQLite storage, WebSocket Hibernation). It is independent from the
desktop app and is deployed on its own.

It only ever receives a song's id, title, artist and cover link, the playback position and the
room queue. No audio, cookies or account data.

```
Takaro ──wss──▶ Worker (src/index.ts) ──▶ JamRoom Durable Object (one per room code)
                 /health, /room/<code>,     participants · host · playback · queue
                 /ws/new, /ws/<code>
```

## Layout

```
jam-server/
├─ wrangler.toml              # Worker, Durable Object binding + SQLite migration, rate limit, vars
├─ src/
│  ├─ index.ts                # HTTP routes, code validation, routing to the room's Durable Object
│  ├─ rooms/
│  │  ├─ JamRoom.ts           # Durable Object: sockets (hibernation), storage, alarms, rate limit
│  │  ├─ types.ts             # Room, participant, queue and playback types
│  │  ├─ validation.ts        # Runtime validation / sanitising of every client message
│  │  ├─ permissions.ts       # Who may do what (host / guests by permission level)
│  │  └─ synchronization.ts   # Server-clock playback state
│  ├─ protocol/
│  │  ├─ messages.ts          # Protocol v1 message types
│  │  └─ handlers.ts          # Room logic (runtime-independent, unit-tested)
│  └─ utils/                  # Room codes, ids and reconnect tokens
└─ test/
   ├─ rooms.test.ts           # Room logic (vitest)
   ├─ protocol.test.ts        # Message validation (vitest)
   └─ e2e.mjs                 # Real WebSocket clients against a running Worker
```

## Requirements

- Node.js 20+ and npm
- A Cloudflare account (the Free plan is enough: SQLite-backed Durable Objects and WebSocket
  Hibernation are available on it)

## Local development

```powershell
cd jam-server
npm install
npx wrangler dev            # http://127.0.0.1:8787, ws://127.0.0.1:8787/ws/…
```

Point a Takaro build at it with `TAKARO_JAM_URL=ws://127.0.0.1:8787` (when running or building), or
type the address in **Settings → Jam → Server**.

## Tests

```powershell
npm test                    # unit tests (room logic, permissions, queue, reconnects, validation)
npm run check               # TypeScript
npx wrangler dev            # in another terminal, then:
npm run test:e2e            # several WebSocket clients against the running Worker
```

`node test/e2e.mjs https://jam.example.com` runs the same checks against a deployed Worker.

## Deploy

```powershell
npx wrangler login
npx wrangler deploy
```

`wrangler.toml` publishes the Worker on **`jam.takaro.im`** as a Custom Domain. This needs the
`takaro.im` zone in the same Cloudflare account (its DNS on Cloudflare); `wrangler deploy`
creates the DNS record and the certificate. Without that zone, remove the `routes` line and use
the `*.workers.dev` address that `wrangler deploy` prints. In that case, build Takaro with
`TAKARO_JAM_URL=wss://takaro-jam.<your-subdomain>.workers.dev`.

The SQLite migration (`[[migrations]] new_sqlite_classes = ["JamRoom"]`) runs on the first
deploy. Never rename or remove that class without a new migration.

## Configuration

`[vars]` in `wrangler.toml` (no secrets are needed):

| Variable | Default | Meaning |
|---|---|---|
| `MAX_ROOM_PARTICIPANTS` | `20` | People connected to one room at the same time |
| `MAX_ROOMS_IDLE_SECONDS` | `3600` | A room nobody is connected to is deleted after this |
| `HOST_GRACE_SECONDS` | `60` | How long a disconnected host keeps the room before the guest who joined first takes over |
| `RECONNECT_TTL_SECONDS` | `600` | How long a disconnected participant can come back as themselves |
| `ALLOWED_ORIGINS` | `https://music.youtube.com` | Browser origins allowed to open a room socket (clients without an Origin header are allowed) |

Room creation is limited to 5 rooms per minute per IP (the `CREATE_LIMITER` rate-limit binding).
Each socket may send about 5 messages per second (bursts of 20). Messages over 8 KB are rejected,
and a room queue holds up to 100 songs.

## Logs

```powershell
npx wrangler tail           # live logs of the deployed Worker
```

## Protocol (v1)

JSON messages with `"version": 1`. A socket opened on `/ws/new` must first send
`{"type":"create","name","permission"}`; one on `/ws/<code>` sends `{"type":"join","name","token?"}`.
The `welcome` answer carries the participant id, a reconnect token (only its SHA-256 is stored)
and the room snapshot.

| Client → server | Who |
|---|---|
| `state {track, position, playing}` | host: what its player is doing |
| `control {action: play\|pause\|seek\|next\|previous, position?}` | guests with permission `control` (forwarded to the host) |
| `queue:add {track}` | host; guests with `queue` or `control` |
| `queue:remove {itemId}` | host; guests for their own songs |
| `queue:move {itemId, index}`, `queue:next`, `settings {permission}`, `kick {participantId}`, `end` | host |
| `leave`, `ping {t}` | everyone |

The server sends `welcome`, `participants`, `queue`, `playback` (with a growing `revision` and the
server time), `settings`, `control` (to the host), `queue:play` (to the host), `ended`, `pong` and
`error {code, message}`. `{"version":1,"type":"hb"}` is a keep-alive answered without waking the room.

Permission levels: `host` (only the host controls), `queue` (guests add songs, the default) and
`control` (guests also play, pause, seek and skip).
