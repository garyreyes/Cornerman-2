export type RandomFn = () => number;

/**
 * Returns a fire time randomly placed within [now+minMs, now+maxMs].
 * General form of the clamped-window math extraction doc §1.2 proved for
 * first-combo timing (originally inline in timer/service.ts's
 * beginWork) -- extracted here so anything needing "fire again somewhere
 * in this random window" (combo repeats, defense/movement cues) shares
 * one tested primitive instead of re-deriving the formula.
 */
export function nextGapFireTime(
  now: number,
  minMs: number,
  maxMs: number,
  random: RandomFn = Math.random,
): number {
  return now + minMs + random() * (maxMs - minMs);
}
