# Changes

Dated log of shipped changes, appended to as features complete.

## Unreleased

- 2026-08-23: Harness setup — Expo/React Native/TypeScript project
  scaffolded (`com.gary.cornerman`), lint/typecheck/test gates wired
  (ESLint via `eslint-config-expo`, `tsc --noEmit`, Jest via `jest-expo`
  + React Native Testing Library), CLAUDE.md/CHANGES.md/PROJECT_FACTS.md
  created. No feature code yet.
- 2026-08-23: Sub-phase 1b — MMKV-backed storage layer
  (`src/lib/storage.ts`) and the Settings/Punch/Preset data model
  (`src/features/settings/`), with zero-migration default-merging
  (extraction doc §1.13's pattern) and a last-punch delete guard.
  Test-first per the correctness-critical rule for settings
  persistence; all 8 tests pass. VoiceClip is out of scope here
  (Phase 5).
- 2026-08-23: Sub-phase 2a — Timer engine phase state machine + tick
  loop (`src/features/timer/`): pure functions (`startTimer`/`tick`)
  with time and randomness injected as arguments rather than read from
  the ambient clock, so the exact 200ms-poll-crossing-a-1s-boundary
  latch bug from extraction doc §1.1 (10s work warning, rest 3-2-1
  countdown) is actually exercised in tests, not just asserted around.
  Covers warmup (new to this rebuild, skipped when 0 as today),
  first-combo timing's clamped [500ms,1500ms] window (§1.2), and a
  large-`now`-jump case (app resumed after suspension) resolving to
  the correct phase without retroactively firing stale countdowns.
  12 tests, all passing. Pause/resume is 2b, not this sub-phase.
- 2026-08-23: Sub-phase 2b — True pause/resume (`pause`/`resume` added
  to `src/features/timer/service.ts`). `resume()` shifts every
  forward-looking timestamp (`phaseEndAt`, and `firstComboAt` if still
  pending) forward by the exact paused duration rather than recomputing
  from wall-clock phase boundaries — the no-drift fix from extraction
  doc §1.3, generalized beyond just `endTime`. Latch state (`tenWarned`,
  `lastRestCountdown`) is untouched by pause, so an already-fired
  warning doesn't refire on resume and a pending one still fires at the
  correct *remaining* time regardless of how long the pause lasted.
  `tick()` is a true no-op while paused. Detecting a real interruption
  (call, audio-focus loss) is native wiring for Phase 7 — this sub-phase
  only builds the mechanism those hooks will call. 9 new tests, all
  passing (30/30 total).
- 2026-08-23: Sub-phases 3a+3b — Combo engine
  (`src/features/comboEngine/service.ts`): `generateRandomCombo`,
  `generatePresetCombo`, and `generateCombo` sharing the identical
  `Array<{num,name}>` shape regardless of mode (extraction doc §1.4),
  with `resolvePunchName`'s graceful fallback for deleted punch numbers
  (§1.5). Settings gained `comboLengthMin`/`comboLengthMax` and
  `randomPunchPool` — combo length and which punches are eligible for
  Random mode are now user-customizable per explicit request, not
  hardcoded. Preset mode with no valid active preset degrades to a
  random combo rather than producing nothing. 3b needed no separate
  implementation: punch resolution turned out to be a hard dependency
  of 3a's output shape, and first-combo timing already shipped in 2a.
  13 new tests, test-first per the correctness-critical rule (43/43
  total passing).
