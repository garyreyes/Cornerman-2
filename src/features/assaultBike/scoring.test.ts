import {
  BASE_POINTS,
  drillSummary,
  emptyDrillStats,
  pointsForHit,
  recordTrial,
  SHRINK_OVER_TRIALS,
  trialWindowMs,
} from "./scoring";

describe("trialWindowMs -- the shrinking per-trial deadline", () => {
  test("the first trial gets the difficulty's full starting window", () => {
    expect(trialWindowMs("easy", 0)).toBe(3000);
    expect(trialWindowMs("medium", 0)).toBe(2500);
    expect(trialWindowMs("hard", 0)).toBe(2000);
  });

  test("it bottoms out at the difficulty's floor and never goes below it", () => {
    expect(trialWindowMs("easy", SHRINK_OVER_TRIALS)).toBe(1500);
    expect(trialWindowMs("medium", SHRINK_OVER_TRIALS)).toBe(1200);
    expect(trialWindowMs("hard", SHRINK_OVER_TRIALS)).toBe(900);

    // Far past the shrink range -- a long session must not drive the
    // window to zero, which would make every trial an instant timeout.
    expect(trialWindowMs("hard", 500)).toBe(900);
  });

  test("it shrinks monotonically, never widening mid-session", () => {
    for (const difficulty of ["easy", "medium", "hard"] as const) {
      let previous = Infinity;
      for (let i = 0; i <= SHRINK_OVER_TRIALS + 5; i += 1) {
        const current = trialWindowMs(difficulty, i);
        expect(current).toBeLessThanOrEqual(previous);
        previous = current;
      }
    }
  });

  test("halfway through the shrink range it sits halfway between start and floor", () => {
    // medium: 2500 -> 1200, so the midpoint is 1850.
    expect(trialWindowMs("medium", SHRINK_OVER_TRIALS / 2)).toBe(1850);
  });

  test("a negative index is clamped rather than widening past the start", () => {
    expect(trialWindowMs("medium", -5)).toBe(2500);
  });
});

describe("pointsForHit -- speed-weighted so score isn't just hits x10", () => {
  test("an instant hit earns double the base", () => {
    expect(pointsForHit(0, 2000)).toBe(BASE_POINTS * 2);
  });

  test("a hit landing exactly on the deadline earns only the base", () => {
    expect(pointsForHit(2000, 2000)).toBe(BASE_POINTS);
  });

  test("a half-window hit earns the base plus half the bonus", () => {
    expect(pointsForHit(1000, 2000)).toBe(BASE_POINTS + BASE_POINTS / 2);
  });

  test("a reaction past the window (clock jitter) still earns the base, never less", () => {
    expect(pointsForHit(9999, 2000)).toBe(BASE_POINTS);
  });

  test("a zero-length window does not divide by zero", () => {
    expect(pointsForHit(0, 0)).toBe(BASE_POINTS);
  });
});

describe("recordTrial", () => {
  test("a hit advances trials, hits, score and the reaction total", () => {
    const stats = recordTrial(emptyDrillStats(), { correct: true, reactionMs: 1000 }, 2000);
    expect(stats.trials).toBe(1);
    expect(stats.hits).toBe(1);
    expect(stats.score).toBe(pointsForHit(1000, 2000));
    expect(stats.totalHitReactionMs).toBe(1000);
  });

  test("a wrong tap counts as a trial but scores nothing and never enters the reaction total", () => {
    const stats = recordTrial(emptyDrillStats(), { correct: false, reactionMs: 800 }, 2000);
    expect(stats.trials).toBe(1);
    expect(stats.hits).toBe(0);
    expect(stats.score).toBe(0);
    expect(stats.totalHitReactionMs).toBe(0);
  });

  test("a timeout is a non-hit whose full-window 'reaction' never skews the average", () => {
    const stats = recordTrial(emptyDrillStats(), { correct: false, reactionMs: 2000 }, 2000);
    expect(stats.trials).toBe(1);
    expect(stats.totalHitReactionMs).toBe(0);
    expect(drillSummary(stats).avgReactionMs).toBeNull();
  });

  test("it does not mutate the stats it is given -- rounds accumulate onto a fresh object", () => {
    const before = emptyDrillStats();
    recordTrial(before, { correct: true, reactionMs: 500 }, 2000);
    expect(before).toEqual(emptyDrillStats());
  });

  test("stats accumulate across many trials, as they do across rounds", () => {
    let stats = emptyDrillStats();
    stats = recordTrial(stats, { correct: true, reactionMs: 1000 }, 2000);
    stats = recordTrial(stats, { correct: false, reactionMs: 2000 }, 2000);
    stats = recordTrial(stats, { correct: true, reactionMs: 500 }, 2000);

    expect(stats.trials).toBe(3);
    expect(stats.hits).toBe(2);
    expect(stats.totalHitReactionMs).toBe(1500);
    expect(stats.score).toBe(pointsForHit(1000, 2000) + pointsForHit(500, 2000));
  });
});

describe("drillSummary -- what the end-of-session card reports", () => {
  test("an untouched session reports zeroes and no average, not NaN", () => {
    const summary = drillSummary(emptyDrillStats());
    expect(summary.score).toBe(0);
    expect(summary.trials).toBe(0);
    expect(summary.accuracyPct).toBe(0);
    expect(summary.avgReactionMs).toBeNull();
  });

  test("accuracy is hits over trials, rounded to a whole percent", () => {
    let stats = emptyDrillStats();
    stats = recordTrial(stats, { correct: true, reactionMs: 100 }, 2000);
    stats = recordTrial(stats, { correct: true, reactionMs: 100 }, 2000);
    stats = recordTrial(stats, { correct: false, reactionMs: 2000 }, 2000);

    expect(drillSummary(stats).accuracyPct).toBe(67);
  });

  test("the average reaction covers hits only, so misses can't inflate it", () => {
    let stats = emptyDrillStats();
    stats = recordTrial(stats, { correct: true, reactionMs: 400 }, 2000);
    stats = recordTrial(stats, { correct: true, reactionMs: 600 }, 2000);
    stats = recordTrial(stats, { correct: false, reactionMs: 2000 }, 2000);

    expect(drillSummary(stats).avgReactionMs).toBe(500);
  });
});
