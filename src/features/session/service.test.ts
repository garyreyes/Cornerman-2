import { pause as pauseTimer, startTimer, tick } from "../timer/service";
import type { TimerConfig } from "../timer/types";
import { createDefaultSettings } from "../settings/service";
import type { Preset, Punch, Settings } from "../settings/types";
import type { RoundConfig } from "../workoutTemplates/types";
import { createSession, decideInterruptionAction, sessionTick, shiftSessionForResume } from "./service";
import type { ActiveTemplateSession } from "./types";

const config: TimerConfig = {
  totalRounds: 2,
  workDurationMs: 180_000,
  restDurationMs: 60_000,
  warmupDurationMs: 0,
};

const punches: Punch[] = [
  { id: "p1", num: 1, name: "Jab" },
  { id: "p2", num: 2, name: "Cross" },
];

const presets: Preset[] = [{ id: "preset1", name: "1-2", sequence: [1, 2] }];

const settings: Settings = {
  ...createDefaultSettings(),
  comboGapMinSec: 1.5,
  comboGapMaxSec: 3,
  comboLengthMin: 2,
  comboLengthMax: 2,
  defenseCuesEnabled: false,
};

describe("createSession", () => {
  test("starts with everything unarmed and empty", () => {
    expect(createSession()).toEqual({
      nextComboAt: null,
      nextDefenseCueAt: null,
      currentCombo: null,
      comboCount: 0,
    });
  });
});

describe("sessionTick -- combo scheduling", () => {
  test("seeds nextComboAt from timerState.firstComboAt when Work phase begins, no action yet", () => {
    const now = 1_000_000;
    const timerState = startTimer(config, now, () => 0.5); // firstComboAt = now + 1000
    const session = createSession();

    const { session: after, actions } = sessionTick(session, timerState, settings, punches, [], now);

    expect(after.nextComboAt).toBe(timerState.firstComboAt);
    expect(actions).toEqual([]);
  });

  test("fires a speak-combo action once now reaches nextComboAt, and re-arms using comboGapMin/MaxSec", () => {
    const now = 1_000_000;
    const timerState = startTimer(config, now, () => 0); // firstComboAt = now + 500
    let session = createSession();
    ({ session } = sessionTick(session, timerState, settings, punches, [], now));

    const dueNow = timerState.firstComboAt!;
    const { session: after, actions } = sessionTick(session, timerState, settings, punches, [], dueNow, () => 0);

    expect(actions).toEqual([
      { type: "speak-combo", combo: [{ num: 1, name: "Jab" }, { num: 1, name: "Jab" }] },
    ]);
    expect(after.comboCount).toBe(1);
    expect(after.currentCombo).toEqual(actions[0]!.type === "speak-combo" ? actions[0].combo : null);
    // Re-armed using comboGapMinSec (1.5s), not the first-combo [500,1500]ms window.
    expect(after.nextComboAt).toBe(dueNow + settings.comboGapMinSec * 1000);
  });

  test("does not fire a burst of stale combos after a large jump in now -- fires exactly one and reschedules forward", () => {
    const now = 1_000_000;
    const timerState = startTimer(config, now, () => 0);
    let session = createSession();
    ({ session } = sessionTick(session, timerState, settings, punches, [], now));

    const farFuture = timerState.firstComboAt! + 60_000; // way past several possible combo gaps
    const { session: after, actions } = sessionTick(session, timerState, settings, punches, [], farFuture, () => 0);

    expect(actions).toHaveLength(1);
    expect(after.nextComboAt).toBe(farFuture + settings.comboGapMinSec * 1000);
  });

  test("clears nextComboAt/currentCombo count tracking when leaving Work phase, but keeps currentCombo visible", () => {
    const now = 1_000_000;
    const timerState = startTimer(config, now, () => 0);
    let session = createSession();
    ({ session } = sessionTick(session, timerState, settings, punches, [], now));
    ({ session } = sessionTick(session, timerState, settings, punches, [], timerState.firstComboAt!, () => 0));
    expect(session.currentCombo).not.toBeNull();

    const { state: restState } = tick(timerState, config, now + config.workDurationMs);
    const { session: after, actions } = sessionTick(session, restState, settings, punches, [], now + config.workDurationMs);

    expect(restState.phase).toBe("rest");
    expect(after.nextComboAt).toBeNull();
    expect(after.currentCombo).toEqual(session.currentCombo); // last combo stays visible into Rest
    expect(actions).toEqual([]);
  });
});

describe("sessionTick -- template-driven combo generation (Phase 10d)", () => {
  test("with no activeTemplate (the default), combo generation is unaffected -- Settings-driven quick-start behaves exactly as before", () => {
    const now = 1_000_000;
    const timerState = startTimer(config, now, () => 0);
    let session = createSession();
    ({ session } = sessionTick(session, timerState, settings, punches, [], now));
    const { actions } = sessionTick(session, timerState, settings, punches, [], timerState.firstComboAt!, () => 0);
    expect(actions).toEqual([{ type: "speak-combo", combo: [{ num: 1, name: "Jab" }, { num: 1, name: "Jab" }] }]);
  });

  test("with an activeTemplate, the current round's own comboSource resolves the combo, not Settings-driven random generation", () => {
    const now = 1_000_000;
    const timerState = startTimer(config, now, () => 0); // round 1
    const roundPlan: RoundConfig[] = [{ comboSource: { type: "fixed-punch", punchNum: 2 } }];
    const activeTemplate: ActiveTemplateSession = { roundPlan, baseComboGapMinSec: 4, baseComboGapMaxSec: 4 };

    let session = createSession();
    ({ session } = sessionTick(session, timerState, settings, punches, [], now, Math.random, activeTemplate));
    const { actions } = sessionTick(
      session,
      timerState,
      settings,
      punches,
      [],
      timerState.firstComboAt!,
      () => 0,
      activeTemplate,
    );

    // fixed-punch always resolves to that one punch, never the Settings-driven random draw.
    expect(actions).toEqual([{ type: "speak-combo", combo: [{ num: 2, name: "Cross" }] }]);
  });

  test("a round's own comboGapMinSec/MaxSec override drives re-arming, not the template's base or Settings", () => {
    const now = 1_000_000;
    const timerState = startTimer(config, now, () => 0);
    const roundPlan: RoundConfig[] = [
      { comboSource: { type: "random" }, comboGapMinSec: 9, comboGapMaxSec: 9 },
    ];
    const activeTemplate: ActiveTemplateSession = { roundPlan, baseComboGapMinSec: 2, baseComboGapMaxSec: 2 };

    let session = createSession();
    ({ session } = sessionTick(session, timerState, settings, punches, [], now, Math.random, activeTemplate));
    const dueNow = timerState.firstComboAt!;
    const { session: after } = sessionTick(session, timerState, settings, punches, [], dueNow, () => 0, activeTemplate);

    expect(after.nextComboAt).toBe(dueNow + 9_000);
  });

  test("falls back to the template's base combo gap when the round itself has no gap override", () => {
    const now = 1_000_000;
    const timerState = startTimer(config, now, () => 0);
    const roundPlan: RoundConfig[] = [{ comboSource: { type: "random" } }];
    const activeTemplate: ActiveTemplateSession = { roundPlan, baseComboGapMinSec: 6, baseComboGapMaxSec: 6 };

    let session = createSession();
    ({ session } = sessionTick(session, timerState, settings, punches, [], now, Math.random, activeTemplate));
    const dueNow = timerState.firstComboAt!;
    const { session: after } = sessionTick(session, timerState, settings, punches, [], dueNow, () => 0, activeTemplate);

    expect(after.nextComboAt).toBe(dueNow + 6_000);
  });

  test("a preset comboSource resolves against the presets array passed into sessionTick", () => {
    const now = 1_000_000;
    const timerState = startTimer(config, now, () => 0);
    const roundPlan: RoundConfig[] = [{ comboSource: { type: "preset", presetId: "preset1" } }];
    const activeTemplate: ActiveTemplateSession = { roundPlan, baseComboGapMinSec: 3, baseComboGapMaxSec: 3 };

    let session = createSession();
    ({ session } = sessionTick(session, timerState, settings, punches, presets, now, Math.random, activeTemplate));
    const { actions } = sessionTick(
      session,
      timerState,
      settings,
      punches,
      presets,
      timerState.firstComboAt!,
      () => 0,
      activeTemplate,
    );

    expect(actions).toEqual([
      { type: "speak-combo", combo: [{ num: 1, name: "Jab" }, { num: 2, name: "Cross" }] },
    ]);
  });
});

describe("sessionTick -- respects isPaused", () => {
  test("fires no actions and leaves nextComboAt untouched while paused, even long after it was due", () => {
    const now = 1_000_000;
    const timerState = startTimer(config, now, () => 0);
    let session = createSession();
    ({ session } = sessionTick(session, timerState, settings, punches, [], now));
    const armedAt = session.nextComboAt;

    const pausedState = pauseTimer(timerState, now + 200);
    // Real time keeps advancing well past the armed combo time and several
    // gap cycles beyond it -- this is the exact bug report: "paused" but
    // combos kept getting called out (comboCount climbing) the whole time.
    const farFuture = timerState.firstComboAt! + 60_000;
    const { session: after, actions } = sessionTick(session, pausedState, settings, punches, [], farFuture, () => 0);

    expect(actions).toEqual([]);
    expect(after.nextComboAt).toBe(armedAt);
    expect(after.comboCount).toBe(0);
  });

  test("defense cues are equally silent while paused", () => {
    const enabled: Settings = { ...settings, defenseCuesEnabled: true, defenseCueGapMinSec: 15, defenseCueGapMaxSec: 30 };
    const now = 1_000_000;
    const timerState = startTimer(config, now, () => 0);
    let session = createSession();
    ({ session } = sessionTick(session, timerState, enabled, punches, [], now, () => 0));
    const armedAt = session.nextDefenseCueAt;

    const pausedState = pauseTimer(timerState, now + 200);
    const { session: after, actions } = sessionTick(session, pausedState, enabled, punches, [], now + 999_999, () => 0);

    expect(actions).toEqual([]);
    expect(after.nextDefenseCueAt).toBe(armedAt);
  });

  test("resuming right where it left off: not-yet-due does not fire immediately", () => {
    const now = 1_000_000;
    const timerState = startTimer(config, now, () => 0); // firstComboAt = now + 500
    let session = createSession();
    ({ session } = sessionTick(session, timerState, settings, punches, [], now));

    const pausedState = pauseTimer(timerState, now + 100);
    // Paused before the combo was due -- while paused, real time blows past
    // it, but sessionTick must not fire until an actual (resumed) tick says
    // it's due.
    ({ session } = sessionTick(session, pausedState, settings, punches, [], now + 5_000, () => 0));
    expect(session.nextComboAt).toBe(timerState.firstComboAt);
  });
});

describe("shiftSessionForResume", () => {
  test("shifts non-null nextComboAt/nextDefenseCueAt forward by the paused duration, same fidelity as timer/service.ts's resume()", () => {
    const session = { nextComboAt: 1_000, nextDefenseCueAt: 2_000, currentCombo: null, comboCount: 3 };

    const shifted = shiftSessionForResume(session, 500);

    expect(shifted).toEqual({ nextComboAt: 1_500, nextDefenseCueAt: 2_500, currentCombo: null, comboCount: 3 });
  });

  test("leaves null timestamps null (e.g. defense cues disabled, or not in Work phase)", () => {
    const session = { nextComboAt: null, nextDefenseCueAt: null, currentCombo: null, comboCount: 0 };

    expect(shiftSessionForResume(session, 500)).toEqual(session);
  });

  test("a zero paused duration is a no-op", () => {
    const session = { nextComboAt: 1_000, nextDefenseCueAt: null, currentCombo: null, comboCount: 1 };

    expect(shiftSessionForResume(session, 0)).toEqual(session);
  });
});

describe("sessionTick -- defense cue scheduling", () => {
  test("never arms or fires when settings.defenseCuesEnabled is false", () => {
    const now = 1_000_000;
    const timerState = startTimer(config, now, () => 0);
    let session = createSession();
    ({ session } = sessionTick(session, timerState, settings, punches, [], now));
    ({ session } = sessionTick(session, timerState, settings, punches, [], now + 999_999, () => 0));

    expect(session.nextDefenseCueAt).toBeNull();
  });

  test("arms nextDefenseCueAt using the independent defenseCueGap range when enabled", () => {
    const enabled: Settings = { ...settings, defenseCuesEnabled: true, defenseCueGapMinSec: 15, defenseCueGapMaxSec: 30 };
    const now = 1_000_000;
    const timerState = startTimer(config, now, () => 0);
    const session = createSession();

    const { session: after } = sessionTick(session, timerState, enabled, punches, [], now, () => 0);

    expect(after.nextDefenseCueAt).toBe(now + 15_000);
  });

  test("fires a speak-defense-cue action once due, and re-arms", () => {
    const enabled: Settings = { ...settings, defenseCuesEnabled: true, defenseCueGapMinSec: 15, defenseCueGapMaxSec: 30 };
    const now = 1_000_000;
    const timerState = startTimer(config, now, () => 0);
    let session = createSession();
    ({ session } = sessionTick(session, timerState, enabled, punches, [], now, () => 0));

    const dueAt = session.nextDefenseCueAt!;
    const { session: after, actions } = sessionTick(session, timerState, enabled, punches, [], dueAt, () => 0);

    expect(actions.some((a) => a.type === "speak-defense-cue")).toBe(true);
    expect(after.nextDefenseCueAt).toBe(dueAt + 15_000);
  });
});

describe("decideInterruptionAction", () => {
  test("began while running: pauses and marks the pause as ours", () => {
    expect(decideInterruptionAction({ type: "began", shouldResume: false }, false, false)).toEqual({
      shouldPause: true,
      shouldResume: false,
      pausedByInterruption: true,
    });
  });

  test("began while already manually paused: no action, does not claim the pause", () => {
    expect(decideInterruptionAction({ type: "began", shouldResume: false }, true, false)).toEqual({
      shouldPause: false,
      shouldResume: false,
      pausedByInterruption: false,
    });
  });

  test("began while already interruption-paused (overlapping interruption): no action, keeps the flag", () => {
    expect(decideInterruptionAction({ type: "began", shouldResume: false }, true, true)).toEqual({
      shouldPause: false,
      shouldResume: false,
      pausedByInterruption: true,
    });
  });

  test("ended, shouldResume, and the pause was ours: resumes and clears the flag", () => {
    expect(decideInterruptionAction({ type: "ended", shouldResume: true }, true, true)).toEqual({
      shouldPause: false,
      shouldResume: true,
      pausedByInterruption: false,
    });
  });

  test("ended but the system says not to resume: leaves it paused, clears the flag", () => {
    expect(decideInterruptionAction({ type: "ended", shouldResume: false }, true, true)).toEqual({
      shouldPause: false,
      shouldResume: false,
      pausedByInterruption: false,
    });
  });

  test("ended but the pause was the user's, not ours: never auto-resumes a manual pause", () => {
    expect(decideInterruptionAction({ type: "ended", shouldResume: true }, true, false)).toEqual({
      shouldPause: false,
      shouldResume: false,
      pausedByInterruption: false,
    });
  });
});

describe("sessionTick -- determinism", () => {
  test("identical inputs and random source produce identical output", () => {
    const now = 1_000_000;
    const timerState = startTimer(config, now, () => 0.3);
    const a = sessionTick(createSession(), timerState, settings, punches, [], now, () => 0.3);
    const b = sessionTick(createSession(), timerState, settings, punches, [], now, () => 0.3);
    expect(a).toEqual(b);
  });
});
