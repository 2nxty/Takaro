// Room data kept by each JamRoom Durable Object (persisted as one value in its SQLite storage).

/** What guests may do, chosen by the host:
 *  - "host":    only the host controls playback and the queue
 *  - "queue":   guests can also add songs to the queue (default)
 *  - "control": guests can also play / pause / seek / skip */
export type Permission = 'host' | 'queue' | 'control';
export const PERMISSIONS: readonly Permission[] = ['host', 'queue', 'control'];

export interface JamTrack {
  videoId: string;
  title: string;
  artist: string;
  album?: string;
  thumbnail?: string;
  duration?: number;
}

/** A participant as stored (with the hash of their reconnect token). */
export interface Participant {
  id: string;
  name: string;
  joinedAt: number;
  connected: boolean;
  /** When they last disconnected (or joined). */
  lastSeen: number;
  /** SHA-256 (hex) of the reconnect token. The token itself is never stored. */
  tokenHash: string;
}

/** A participant as sent to clients. */
export interface PublicParticipant {
  id: string;
  name: string;
  joinedAt: number;
  isHost: boolean;
  connected: boolean;
}

export interface QueueItem {
  id: string;
  track: JamTrack;
  addedBy: string; // participant id
  addedByName: string;
  addedAt: number;
}

export interface Playback {
  track: JamTrack | null;
  /** Position in seconds at `updatedAt`. */
  position: number;
  playing: boolean;
  /** Server time (ms) of the last change. */
  updatedAt: number;
  /** Grows with every change: clients ignore older states. */
  revision: number;
}

export interface RoomData {
  code: string;
  hostId: string; // "" until the creator sends "create"
  permission: Permission;
  createdAt: number;
  updatedAt: number;
  participants: Participant[];
  queue: QueueItem[];
  playback: Playback;
  /** Since when the host is disconnected (host hand-over after the grace period). */
  hostLostAt: number | null;
  /** Since when nobody is connected (room deleted after the idle time). */
  emptySince: number | null;
}

export interface RoomSnapshot {
  code: string;
  hostId: string;
  permission: Permission;
  participants: PublicParticipant[];
  queue: QueueItem[];
  playback: Playback;
}

export interface RoomConfig {
  maxParticipants: number;
  idleMs: number;
  hostGraceMs: number;
  reconnectTtlMs: number;
  maxQueue: number;
}
