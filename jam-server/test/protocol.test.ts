// Message validation: versions, sizes, types and field checks.
import { describe, expect, it } from 'vitest';
import { MAX_MESSAGE_SIZE } from '../src/protocol/messages';
import { parseClientMessage, ValidationError } from '../src/rooms/validation';

const code = (raw: string) => {
  try {
    parseClientMessage(raw);
    return 'ok';
  } catch (e) {
    return e instanceof ValidationError ? e.code : 'other';
  }
};

describe('protocol', () => {
  it('rejects other protocol versions', () => {
    expect(code(JSON.stringify({ version: 2, type: 'ping', t: 1 }))).toBe('bad_version');
    expect(code(JSON.stringify({ type: 'ping', t: 1 }))).toBe('bad_version');
  });
  it('rejects oversized and malformed messages', () => {
    expect(code('x'.repeat(MAX_MESSAGE_SIZE + 1))).toBe('too_large');
    expect(code('{nope')).toBe('bad_message');
    expect(code('[]')).toBe('bad_message');
    expect(code(JSON.stringify({ version: 1, type: 'hack' }))).toBe('bad_message');
  });
  it('validates fields', () => {
    expect(code(JSON.stringify({ version: 1, type: 'create', name: '  ' }))).toBe('bad_message');
    expect(code(JSON.stringify({ version: 1, type: 'create', name: 'a', permission: 'admin' }))).toBe('bad_message');
    expect(code(JSON.stringify({ version: 1, type: 'join', name: 'a', token: 'x' }))).toBe('bad_message');
    expect(code(JSON.stringify({ version: 1, type: 'state', track: null, position: -1, playing: true }))).toBe('bad_message');
    expect(code(JSON.stringify({ version: 1, type: 'control', action: 'seek' }))).toBe('bad_message');
    expect(code(JSON.stringify({ version: 1, type: 'control', action: 'explode' }))).toBe('bad_message');
    expect(code(JSON.stringify({ version: 1, type: 'queue:move', itemId: 'a', index: -2 }))).toBe('bad_message');
    expect(code(JSON.stringify({ version: 1, type: 'kick', participantId: '<script>' }))).toBe('bad_message');
  });
  it('accepts valid messages and cleans text', () => {
    const m = parseClientMessage(JSON.stringify({ version: 1, type: 'create', name: '  Ana\n\tB  '.padEnd(80, 'x') })) as any;
    expect(m.permission).toBe('queue');
    expect([...m.name].length).toBeLessThanOrEqual(32);
    expect(m.name.startsWith('Ana B')).toBe(true);
    expect(code(JSON.stringify({ version: 1, type: 'control', action: 'pause' }))).toBe('ok');
    expect(code(JSON.stringify({ version: 1, type: 'state', track: { videoId: 'dQw4w9WgXcQ', title: 't', artist: 'a',
      thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg' }, position: 3.2, playing: true }))).toBe('ok');
  });
});
