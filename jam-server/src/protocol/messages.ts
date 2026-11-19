// Takaro Jam WebSocket protocol, version 1. Every message is a JSON object with `version: 1`.
import type { JamTrack, Permission, Playback, PublicParticipant, QueueItem, RoomSnapshot } from '../rooms/types';

export const PROTOCOL_VERSION = 1;
/** Largest message accepted from a client, in characters. */
export const MAX_MESSAGE_SIZE = 8 * 1024;
/** Keep-alive: answered by the runtime without waking the room (WebSocket auto-response). */
export const HEARTBEAT = '{"version":1,"type":"hb"}';

export type ControlAction = 'play' | 'pause' | 'seek' | 'next' | 'previous';

export type ClientMessage =
  /** First message on a /ws/new socket: become the host of the new room. */
  | { version: 1; type: 'create'; name: string; permission: Permission }
  /** First message on a /ws/<code> socket. `token` (from an earlier welcome) rejoins as the same participant. */
  | { version: 1; type: 'join'; name: string; token?: string }
  /** Host: what its player is doing now. */
  | { version: 1; type: 'state'; track: JamTrack | null; position: number; playing: boolean }
  /** Guest (permission "control"): asks the host's player to do something. */
  | { version: 1; type: 'control'; action: ControlAction; position?: number }
  | { version: 1; type: 'queue:add'; track: JamTrack }
  | { version: 1; type: 'queue:remove'; itemId: string }
  /** Host: moves an item to `index`. */
  | { version: 1; type: 'queue:move'; itemId: string; index: number }
  /** Host: the current song ended; take the next room-queue item (answered with "queue:play"). */
  | { version: 1; type: 'queue:next' }
  | { version: 1; type: 'settings'; permission: Permission }
  | { version: 1; type: 'kick'; participantId: string }
  | { version: 1; type: 'end' }
  | { version: 1; type: 'leave' }
  | { version: 1; type: 'ping'; t: number };

export type ServerMessage =
  | { version: 1; type: 'welcome'; code: string; you: string; token: string; room: RoomSnapshot; serverTime: number }
  | { version: 1; type: 'participants'; participants: PublicParticipant[]; hostId: string }
  | { version: 1; type: 'queue'; queue: QueueItem[] }
  | { version: 1; type: 'playback'; playback: Playback; serverTime: number }
  | { version: 1; type: 'settings'; permission: Permission }
  | { version: 1; type: 'control'; action: ControlAction; position?: number; by: string }
  | { version: 1; type: 'queue:play'; item: QueueItem | null }
  | { version: 1; type: 'ended'; reason: 'host' | 'idle' | 'kicked' }
  | { version: 1; type: 'pong'; t: number; serverTime: number }
  | { version: 1; type: 'error'; code: ErrorCode; message: string };

export type ErrorCode =
  | 'bad_message'
  | 'bad_version'
  | 'too_large'
  | 'rate_limited'
  | 'not_found'
  | 'full'
  | 'not_joined'
  | 'already_joined'
  | 'forbidden'
  | 'host_offline'
  | 'queue_full'
  | 'no_such_item';

/** Distributive Omit, so each union member keeps its own fields. */
type DistributiveOmit<T, K extends keyof any> = T extends unknown ? Omit<T, K> : never;
export type ServerBody = DistributiveOmit<ServerMessage, 'version'>;

export const msg = (body: ServerBody): ServerMessage => ({ version: PROTOCOL_VERSION, ...body }) as ServerMessage;
export const errorMsg = (code: ErrorCode, message: string): ServerMessage => msg({ type: 'error', code, message });
