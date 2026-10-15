/**
 * Maps a wall-clock time (Date.now() ms) onto an AudioContext's own clock
 * (seconds), so a sound can be queued ahead and still fire while JS is
 * asleep in the background. Anything already due plays immediately.
 */
export function audioClockTime(atWallMs: number, nowWallMs: number, contextTimeSec: number): number {
  return contextTimeSec + Math.max(0, atWallMs - nowWallMs) / 1000;
}
