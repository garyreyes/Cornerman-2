# Cornerman — Roadmap

Status: confirmed with user, 2026-08-23. Decomposes the phase list in
[ARCHITECTURE.md](ARCHITECTURE.md) into sub-phases sized for one
`feature-planner` build-loop pass each, sequenced using real screen
dependencies from [docs/user-flows.md](docs/user-flows.md). Design
direction is already locked ([docs/design-direction.md](docs/design-direction.md)),
so Impeccable checkpoints are woven in rather than left for later.

Status values: `not started` / `in progress` / `done`. Update this file
as each sub-phase completes — it should never drift out of sync with
`CHANGES.md`, which logs the same progress from the "what changed" angle.

---

## Phase 1 — Foundation

- [x] **1a. Harness setup** — `done` — scaffold, lint/typecheck/test
  gates, CI, branch protection. Shipped 2026-08-23 (`e3da0c6`, `b589640`).
- [x] **1b. MMKV storage layer + Settings/Punch/Preset data model** —
  `done` — types, CRUD service, zero-migration defaulting
  (`Object.assign(defaults, parsed)` pattern). Test-first per
  `CLAUDE.md`'s testing standard; 8 tests passing.

## Phase 2 — Timer Engine

*(correctness-critical — test-first per `CLAUDE.md`)*

- [x] **2a. Phase state machine + tick loop** — `done` —
  once-per-second latches for the 10s work warning and rest countdown;
  Ready/Warmup/Work/Rest/Finished transitions. 12 tests passing.
- [x] **2b. True pause/resume + interruption handling** — `done` —
  exact remaining-time preservation on pause (mechanism only; actually
  detecting a call/audio-focus interruption is Phase 7's native wiring,
  per `docs/user-flows.md` Flow 2). 9 tests passing.

## Phase 3 — Combo Engine

*(correctness-critical — test-first per `CLAUDE.md`)*

- [x] **3a. Random + preset combo generation** — `done` — shared
  `Array<{num, name}>` shape contract regardless of mode. Settings
  gained `comboLengthMin/Max` and `randomPunchPool` (user-customizable
  combo length and punch pool, per explicit request). 13 tests passing.
- [x] **3b. Punch resolution + first-combo timing** — `done`, absorbed
  elsewhere rather than built separately: punch-number → live-name
  resolution (`resolvePunchName`) turned out to be a hard dependency of
  3a's shared output shape, so it shipped there instead of separately;
  first-combo timing's clamped gap window was already built in 2a as
  timer-adjacent state (`firstComboAt`). Nothing left to build here.

## Phase 4 — Audio Engine

- [x] **4a. Audio bus + sourced sound assets** — `done` —
  `react-native-audio-api` gain → WaveShaper limiter → destination
  chain (this library has no `DynamicsCompressorNode` yet — see
  `PROJECT_FACTS.md`), wired to timer phase events via
  `mapEventToCue`. Bell/clapper/countdown-tick assets are silent
  placeholders pending manual sourcing — see
  `assets/audio/SOURCING.md`; the actual gain/limiter tuning also
  awaits a real by-ear pass once real assets + a device are in hand.
  13 tests passing (56/56 total).

## Phase 5 — Speech Pipeline

*(highest technical risk — new mechanism, no prior art in the old app)*

- [x] **5a. VoiceClip data model + bundled playback** — `done` — scope
  expanded 2026-08-24 (`docs/PRD.md` §10): default punches renamed to
  lead/rear + Body Hook added (`num: 7`); `src/features/speech/`
  resolves any text to a bundled clip by normalized key
  (`normalizeToKey`/`resolveBundledClip`, pure + tested) covering a
  33-word bank (numbers, 9 punches, 12 kicks, 6 defense words) generated
  by `scripts/generate_voice_bank.py` (Kokoro TTS, dev-machine only —
  not run on-device). Committed WAVs are silent placeholders pending
  that script actually being run (no Python in this environment, same
  gap as Phase 4a's sound assets). 10 new tests (66/66 total).
- [x] **5b. Pitch-preserving time-stretch, 0.25x–4x** — `done` — range
  revised down from an originally-discussed 5x: `react-native-audio-api`
  has a genuine native WSOLA time-stretch built in
  (`createBufferSource({pitchCorrection: true})` + the `playbackRate`
  param), no hand-rolled DSP needed, but it hard-caps at 4x in its C++
  core (confirmed 2026-08-24 reading `WsolaTimeStretcher.h`) — see
  `PROJECT_FACTS.md` for the decision not to build extra complexity
  around that fixed ceiling. `rateForSpeechRate` clamps to [0.25, 4.0];
  `SpeechEngine.setRate`/`playWord` wire it into playback. 4 new tests
  (71/71 total).
- [x] **5c. On-device TTS fallback for custom punches** — `done` —
  "+ caching" dropped from the title: confirmed 2026-08-24 that no
  library (`expo-speech`, `react-native-tts`) can synthesize TTS to a
  file, so there's nothing to cache — a word outside 5a's bundled bank
  falls through to live `expo-speech` playback every call instead, per
  explicit choice over building a custom native module. `docs/user-flows.md`
  Flow 4 revised to match (no blocking generate/cache step, non-blocking
  Preview instead). Last-punch delete guard was already built in Phase
  1b (`LastPunchError`) — nothing new needed there. 4 new tests
  (74/74 total).
- [x] **5d. Number announce-style + defensive/movement cue layer** —
  `done` — `announceStyle: "name" | "number"` setting +
  `comboEngine`'s new `resolveAnnounceText` (sibling to
  `resolvePunchName`; nums 1-6 map to their bundled word-spelled clips,
  outside that range falls through as a plain numeral string). Found
  while reading `timer/service.ts` closely: only the *first* combo's
  timing was ever built (`firstComboAt`, a single-shot clamped-window
  calculation) — no recurring "re-arm the gap timer" mechanism exists
  yet for combos either, that's implicitly Phase 6's job. Extracted the
  proven clamped-window math into a shared, tested primitive
  (`src/lib/gapTiming.ts`'s `nextGapFireTime`) rather than duplicating
  it, refactored `firstComboAt` to use it (behavior-preserving — all 21
  pre-existing timer tests pass unchanged, proving equivalence), and
  built `src/features/defenseCues/` (`pickDefenseCue`,
  `nextDefenseCueFireTime`) on that same primitive — deliberately not
  mixed into `Combo`/`comboEngine`, which stays untouched. New Settings
  fields `defenseCuesEnabled`/`defenseCueGapMinSec`/`defenseCueGapMaxSec`
  (15s/30s default, independent of `comboGapMin`/`Max`). No phase-gating
  logic here — same as `firstComboAt`, arming this only during Work
  phase is Phase 6's job, not built yet. 12 new tests (90/90 total).

## Phase 6 — Main Timer Screen

*(flagship first surface — the locked direction gets built for the first
time here; ends with the Impeccable finish review and `DESIGN.md` written
from the real, shipped result)*

- [x] **6a. Main Timer screen, all states** — `code done, visual
  verification outstanding` — new `src/features/session/` orchestration
  layer (`sessionTick`, mirroring `tick()`'s pure-decision pattern —
  see PROJECT_FACTS.md) wires `timer`+`comboEngine`+`defenseCues`+
  `speech`+`audio` together, re-arming the combo-gap and defense-cue
  timers that PROJECT_FACTS.md flagged as still missing after Phase 5.
  `src/app/MainTimerScreen.tsx` covers Ready/Warmup/Work/Rest/Paused/
  Finished plus the audio-init-error banner (`docs/user-flows.md`
  Flow 2), built against `docs/design-direction.md`'s locked contract
  (copied verbatim as the screen's opening comment, per Impeccable's
  Step 5 format) — gunmetal/brass palette, Barlow Condensed/Inter
  type, Reanimated-driven sweep-ring countdown and bell-strike pulse.
  Navigation deliberately deferred (only one real screen exists yet —
  see PROJECT_FACTS.md); settings gear is a no-op stub until Phase 8.
  9 new tests for `sessionTick` (test-first, correctness-critical); the
  screen/animation code itself is judgment/presentation, no tests, per
  the usual split. All gates green (99/99 total).
  - [ ] `/impeccable audit` — **not run**. This environment has no
    device/simulator/screenshot capability at all (confirmed while
    building this sub-phase) — the actual visual result has never been
    seen, only reasoned through against the written contract. Run this
    yourself once you can see the app rendered on a device or
    simulator; treat the screen as unverified until then, the same
    honesty standard already applied to bell/clapper sound quality
    (4a) and TTS voice quality (5a/5c).

## Phase 7 — Background Audio + Onboarding

- [x] **7a. Native background session config** — `done` — the
  declarative half (iOS `UIBackgroundModes: audio`, Android foreground
  service) was already free via `react-native-audio-api`'s own Expo
  config plugin, defaulted on and already listed in `app.json` — no
  changes needed there. Built the runtime half:
  `src/lib/backgroundAudio.ts` activates the iOS audio session
  (`playback` category) and turns on interruption event delivery; a new
  pure `decideInterruptionAction` (`session/service.ts`, 6 tests,
  test-first) is the actual pause/resume decision Phase 2b deferred —
  auto-pauses on a call/audio-focus interruption and auto-resumes when
  it ends, but never overrides a pause the user triggered manually.
  Wired into `useSession.ts` against the already-tested
  `pause`/`resume` timer functions. Also added a minimal "session
  running" notification (`PlaybackNotificationManager`), confirmed
  scope. 105/105 tests passing, all gates green.
  - [ ] Real-device verification — **not run**. This environment has no
    device/simulator at all (same gap as 6a's visual audit) — whether
    audio genuinely survives a locked screen or a real phone call has
    never been observed, only reasoned through against the library's
    source. Verify once you can run this on a real device.
- [x] **7b. Onboarding/permission screen** — `done` —
  `src/app/OnboardingScreen.tsx`, first-launch only per
  `docs/user-flows.md` Flow 1: intro explainer → Android 13+
  notification permission request (`AudioManager.requestNotification-
  Permissions`, wrapped in `backgroundAudio.ts`) → battery-optimization
  tip (only if granted) → done; a denial proceeds anyway per Flow 1's
  proposed default, no separate screen for it. iOS skips straight
  through (no runtime prompt for this). Gated by a new
  `Settings.hasCompletedOnboarding` boolean (same zero-migration MMKV
  pattern as every other Settings field, 2 new tests), never re-shown
  once true. Navigation fork resolved: kept the plain conditional-render
  pattern `App.tsx` already used for the fonts-loading gate rather than
  installing `expo-router` — Onboarding is a one-way gate with no
  back-navigation need, unlike Phase 8's Settings/Punches/Presets stack,
  which is still the real trigger for adding a router. 108/108 tests
  passing, all gates green.
  - [ ] `/impeccable audit` — **not run**, same standing gap as 6a (no
    device/simulator/screenshot capability in this environment).

## Phase 8 — Settings + Punches + Presets

*(inherits the now-locked `DESIGN.md` — no new visual-world decisions)*

- [ ] **8a. Settings screen** — `not started` — scroll picker for
  durations, independent volume slider, 0.25x–5x rate dial.
- [ ] **8b. Punches screen** — `not started` — add/rename/delete,
  TTS-generation loading/error states.
- [ ] **8c. Presets List + Preset Editor** — `not started`.
- [ ] **Phase close: `/impeccable critique` + `/impeccable polish`** —
  `not started` — all three screens judged together for visual
  consistency, not one at a time.

## Phase 9 — Platform Builds & Ship Readiness

- [ ] **9a. EAS build config, both platforms** — `not started` —
  confirm `com.gary.cornerman` continuity; real-device/simulator
  verification on iOS and Android.
- [ ] **Phase close: full-app `/impeccable polish`** — `not started` —
  whole-app pass, not per-section, before considering this
  production-ready.

---

# Phase 10+ — Workout Templates & Assault-Bike Cognitive Protocol

Added 2026-08-23 (`docs/PRD.md` §9, `ARCHITECTURE.md`'s Phase 10+
entities). **Sequenced after Phase 9 ships**, per explicit confirmation
— this is a real scope expansion, not a revision of the v1 plan above,
and doesn't delay it. Inherits the `DESIGN.md` locked in Phase 6; no new
visual-world decisions here (see risk check below).

## Phase 10 — Workout Templates (boxing round-by-round programming)

- [ ] **10a. `WorkoutTemplate`/`RoundConfig` data model + storage** —
  `not started` — extends the Phase 1b settings feature; per-round
  comboSource resolution (fixed-punch/fixed-sequence/preset/random)
  follows the same resolve-at-call-time pattern as `Preset`.
  Correctness-adjacent (extends already-tested combo
  generation/resolution) — test-first.
- [ ] **10b. Templates Picker screen** — `not started` — built-ins +
  custom, start-directly-on-tap, edit as a separate action.
- [ ] **10c. Round Builder / Template Editor screen** — `not started` —
  inline expandable round cards (add/reorder/edit), not a per-round
  sub-screen.
- [ ] **10d. Wire timer/combo engines to a `roundPlan`** — `not started`
  — Main Timer consumes per-round duration/gap/comboSource overrides
  when a template-driven session is active; existing Settings-driven
  quick-start (Phases 1–9) keeps working unchanged.
  - [ ] `/impeccable audit` (Templates Picker + Round Builder)

## Phase 11 — Assault-Bike Cognitive Protocol

- [ ] **11a. `AssaultBikeConfig` data model + built-in template** —
  `not started`.
- [ ] **11b. Assault-Bike Session screen** — `not started` — work phase
  + rest's three sub-phases (Settle → Drill → Reset); visually distinct
  from the boxing Main Timer.
- [ ] **11c. Visual drill: Odd-One-Out** — `not started` — grid, tap
  detection, live (unlogged) reaction-time display.
- [ ] **11d. Auditory drill: Corner Commands** — `not started` — reuses
  the Phase 5 speech pipeline with real corner-cue vocabulary.
  - [ ] `/impeccable audit`

## Phase 12 — Templates Phase Close

- [ ] **Phase close: `/impeccable critique` + `/impeccable polish`** —
  `not started` — Templates Picker, Round Builder, and Assault-Bike
  Session judged together for visual consistency with each other and
  with the rest of the app.

---

## Design-system risk check (per this skill's own process)

No later phase redefines core visual tokens/theme after Phase 6 —
Phase 6 is where `DESIGN.md` gets written from the real build, and
Phases 8–9 **and 10–12** inherit it rather than introducing new
visual-system decisions. No re-polish-earlier-phases item is needed.

## Handoff

Phases 2-5 (Timer Engine, Combo Engine, Audio Engine, Speech Pipeline),
6a (Main Timer screen + the `session` orchestration layer), and all of
Phase 7 (7a native background-audio session + interruption pause/resume;
7b Onboarding screen) are done — 108/108 tests passing, all gates
green. **What's genuinely outstanding, all requiring a real
device/simulator this environment doesn't have:** `/impeccable audit`
for both real screens (never actually seen rendered, only built against
`docs/design-direction.md`'s written contract) and real-device
verification for 7a's background-audio survival (does audio genuinely
keep playing through a locked screen or a phone call — reasoned through
against the library's source, never observed). Run the app yourself
(`npx expo start`, real device or simulator — this project needs a
dev-client build, not Expo Go, per the native modules already
installed), check both, then run `/impeccable audit`. `DESIGN.md` still
doesn't exist — per Impeccable's process it gets written *from* the
real, inspected result, so it waits on that audit, not on this handoff.
Once that's done, Phase 8 (Settings + Punches + Presets) is next — the
real trigger point for finally adding `expo-router`, per 7b's
navigation-fork decision. Phase 10+ is planned and written down, but
confirmed to build *after* Phase 9 ships. As each sub-phase completes,
mark it `done` here and log the matching entry in `CHANGES.md`.
