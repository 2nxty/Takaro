// Runtime validation of everything clients send. Nothing from a client is trusted as-is.
import { MAX_MESSAGE_SIZE, PROTOCOL_VERSION, type ClientMessage, type ControlAction, type ErrorCode } from '../protocol/messages';
import { PERMISSIONS, type JamTrack, type Permission } from './types';

export class ValidationError extends Error {
  constructor(public code: ErrorCode, message: string) {
    super(message);
  }
}

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const SHORT_ID = /^[A-Za-z0-9_-]{1,64}$/;
const CONTROLS: readonly ControlAction[] = ['play', 'pause', 'seek', 'next', 'previous'];
/** Song positions above this (in seconds) are rejected: 24 hours. */
const MAX_POSITION = 24 * 3600;
/** Cover art only from YouTube / Google image hosts. */
const THUMB_HOSTS = /^https:\/\/([a-z0-9-]+\.)*(ytimg\.com|ggpht\.com|googleusercontent\.com)\//i;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Plain one-line text: control characters removed, whitespace collapsed, length capped. */
export function cleanText(v: unknown, max: number): string {
  if (typeof v !== 'string') return '';
  // eslint-disable-next-line no-control-regex
  const s = v.replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩]/g, ' ').replace(/\s+/g, ' ').trim();
  return [...s].slice(0, max).join('');
}

export function cleanName(v: unknown): string {
  const name = cleanText(v, 32);
  if (!name) throw new ValidationError('bad_message', 'name is required');
  return name;
}

export const isVideoId = (v: unknown): v is string => typeof v === 'string' && VIDEO_ID.test(v);

export function cleanTrack(v: unknown): JamTrack {
  if (!isObj(v) || !isVideoId(v.videoId)) throw new ValidationError('bad_message', 'invalid track');
  const track: JamTrack = {
    videoId: v.videoId,
    title: cleanText(v.title, 200) || v.videoId,
    artist: cleanText(v.artist, 200),
  };
  const album = cleanText(v.album, 200);
  if (album) track.album = album;
  if (typeof v.thumbnail === 'string' && v.thumbnail.length <= 512 && THUMB_HOSTS.test(v.thumbnail)) track.thumbnail = v.thumbnail;
  if (typeof v.duration === 'number' && Number.isFinite(v.duration) && v.duration > 0 && v.duration <= MAX_POSITION) {
    track.duration = Math.round(v.duration);
  }
  return track;
}

function position(v: unknown): number {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > MAX_POSITION) {
    throw new ValidationError('bad_message', 'invalid position');
  }
  return v;
}

function permission(v: unknown): Permission {
  if (!PERMISSIONS.includes(v as Permission)) throw new ValidationError('bad_message', 'invalid permission');
  return v as Permission;
}

function shortId(v: unknown, what: string): string {
  if (typeof v !== 'string' || !SHORT_ID.test(v)) throw new ValidationError('bad_message', `invalid ${what}`);
  return v;
}

/** Parses and validates one client message. Throws ValidationError. */
export function parseClientMessage(raw: string | ArrayBuffer): ClientMessage {
  if (typeof raw !== 'string') throw new ValidationError('bad_message', 'text messages only');
  if (raw.length > MAX_MESSAGE_SIZE) throw new ValidationError('too_large', 'message too large');
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new ValidationError('bad_message', 'invalid JSON');
  }
  if (!isObj(data)) throw new ValidationError('bad_message', 'expected an object');
  if (data.version !== PROTOCOL_VERSION) throw new ValidationError('bad_version', `unsupported protocol version (expected ${PROTOCOL_VERSION})`);
  const v = PROTOCOL_VERSION;
  switch (data.type) {
    case 'create':
      return { version: v, type: 'create', name: cleanName(data.name), permission: data.permission == null ? 'queue' : permission(data.permission) };
    case 'join': {
      const token = data.token == null ? undefined : typeof data.token === 'string' && /^[A-Za-z0-9_-]{20,100}$/.test(data.token) ? data.token : null;
      if (token === null) throw new ValidationError('bad_message', 'invalid token');
      return { version: v, type: 'join', name: cleanName(data.name), ...(token ? { token } : {}) };
    }
    case 'state':
      if (typeof data.playing !== 'boolean') throw new ValidationError('bad_message', 'invalid playing');
      return { version: v, type: 'state', track: data.track == null ? null : cleanTrack(data.track), position: position(data.position), playing: data.playing };
    case 'control': {
      if (!CONTROLS.includes(data.action as ControlAction)) throw new ValidationError('bad_message', 'invalid action');
      const action = data.action as ControlAction;
      if (action === 'seek') return { version: v, type: 'control', action, position: position(data.position) };
      return { version: v, type: 'control', action };
    }
    case 'queue:add':
      return { version: v, type: 'queue:add', track: cleanTrack(data.track) };
    case 'queue:remove':
      return { version: v, type: 'queue:remove', itemId: shortId(data.itemId, 'item id') };
    case 'queue:move':
      if (!Number.isInteger(data.index) || (data.index as number) < 0) throw new ValidationError('bad_message', 'invalid index');
      return { version: v, type: 'queue:move', itemId: shortId(data.itemId, 'item id'), index: data.index as number };
    case 'queue:next':
      return { version: v, type: 'queue:next' };
    case 'settings':
      return { version: v, type: 'settings', permission: permission(data.permission) };
    case 'kick':
      return { version: v, type: 'kick', participantId: shortId(data.participantId, 'participant id') };
    case 'end':
      return { version: v, type: 'end' };
    case 'leave':
      return { version: v, type: 'leave' };
    case 'ping':
      if (typeof data.t !== 'number' || !Number.isFinite(data.t)) throw new ValidationError('bad_message', 'invalid t');
      return { version: v, type: 'ping', t: data.t };
    default:
      throw new ValidationError('bad_message', 'unknown message type');
  }
}
