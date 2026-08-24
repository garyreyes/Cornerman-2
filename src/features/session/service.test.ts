import { startTimer, tick } from "../timer/service";
import type { TimerConfig } from "../timer/types";
import { createDefaultSettings } from "../settings/service";
import type { Punch, Settings } from "../settings/types";
import { createSession, sessionTick } from "./service";

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

describe("sessionTick -- determinism", () => {
  test("identical inputs and random source produce identical output", () => {
    const now = 1_000_000;
    const timerState = startTimer(config, now, () => 0.3);
    const a = sessionTick(createSession(), timerState, settings, punches, [], now, () => 0.3);
    const b = sessionTick(createSession(), timerState, settings, punches, [], now, () => 0.3);
    expect(a).toEqual(b);
  });
});
