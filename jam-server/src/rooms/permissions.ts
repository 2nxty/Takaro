// Who may do what in a room. Always decided by the server from its own state.
import type { Permission, RoomData } from './types';

export type Action = 'state' | 'control' | 'queue:add' | 'queue:remove' | 'queue:move' | 'queue:next' | 'settings' | 'kick' | 'end';

const RANK: Record<Permission, number> = { host: 0, queue: 1, control: 2 };

export const isHost = (room: RoomData, pid: string) => !!pid && room.hostId === pid;

/** May participant `pid` do `action`? (queue:remove of one's own item is checked separately.) */
export function can(room: RoomData, pid: string, action: Action): boolean {
  if (isHost(room, pid)) return true;
  if (!room.participants.some((p) => p.id === pid)) return false;
  switch (action) {
    case 'queue:add':
      return RANK[room.permission] >= RANK.queue;
    case 'control':
      return RANK[room.permission] >= RANK.control;
    default:
      // state, queue:move, queue:next, settings, kick, end: host only
      return false;
  }
}

/** The host removes anything; a guest only what they added themselves. */
export function canRemove(room: RoomData, pid: string, addedBy: string): boolean {
  return isHost(room, pid) || (!!pid && pid === addedBy);
}
