// Playback state: the host's player is the reference; the server stamps every change with its
// own clock, so clients never depend on each other's system clocks.
import type { JamTrack, Playback } from './types';

export const emptyPlayback = (now: number): Playback => ({ track: null, position: 0, playing: false, updatedAt: now, revision: 0 });

/** Where the song is at server time `now` (seconds). */
export function currentPosition(state: Playback, now: number): number {
  if (!state.playing) return state.position;
  const pos = state.position + Math.max(0, (now - state.updatedAt) / 1000);
  return state.track?.duration ? Math.min(pos, state.track.duration) : pos;
}

/** The new state after the host reports its player (a new revision). */
export function applyHostState(prev: Playback, track: JamTrack | null, position: number, playing: boolean, now: number): Playback {
  return { track, position: track ? position : 0, playing: !!track && playing, updatedAt: now, revision: prev.revision + 1 };
}
