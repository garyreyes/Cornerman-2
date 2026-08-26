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
  `mapEventToCue`. Bell/clapper/countdown-tick assets were silent
  placeholders pending manual sourcing — see `assets/audio/SOURCING.md`.
  13 tests passing (56/56 total).
  - **All three sourced, 2026-08-25**: `clapper.wav`/`countdown-tick.wav`
    (real CC0 Freesound recordings) and `bell.wav` (trimmed from a real
    CC0 Freesound recording — see `PROJECT_FACTS.md` for both). The
    actual gain/limiter tuning by-ear pass, and confirming all three
    genuinely sound right, still needs the user's own ears on a real
    device.

## Phase 5 — Speech Pipeline

*(highest technical risk — new mechanism, no prior art in the old app)*

- [x] **5a. VoiceClip data model + bundled playback** — `done` — scope
  expanded 2026-08-24 (`docs/PRD.md` §10): default punches renamed to
  lead/rear + Body Hook added (`num: 7`); `src/features/speech/`
  resolves any text to a bundled clip by normalized key
  (`normalizeToKey`/`resolveBundledClip`, pure + tested) covering a
  33-word bank (numbers, 9 punches, 12 kicks, 6 defense words) generated
  by `scripts/generate_voice_bank.py` (Kokoro TTS, dev-machine only —
  not run on-device). 10 new tests (66/66 total).
  - [x] **Voice bank actually generated** — `done`, 2026-08-24. All 33
    clips are real Kokoro TTS output now, not silent placeholders —
    verified non-silent via amplitude check. Three real Windows-specific
    bugs fixed along the way (numpy source-build fallback, espeak-ng's
    admin-only Windows install, a UTF-8 bug in kokoro's own package) —
    see `PROJECT_FACTS.md` and the script's own docstring.
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
  - **2026-08-24 redesign**: the gunmetal/brass palette this sub-phase
    shipped was recolored after the user saw it on-device and asked for
    a dark-background/orange-accent world (Claude/VS Code register)
    with real light/dark mode support — see `docs/design-direction.md`'s
    redesign record and `PROJECT_FACTS.md`. The dial motifs (sweep-ring,
    phase badge, lap-dial counter) are unchanged, only palette/type.
  - [x] **Native code-level `/impeccable audit`** — `done` (Main Timer +
    Onboarding), 2026-08-24. Reads from source against the iOS/Android
    platform references directly, no screenshot needed — unlike the
    visual audit below, this one was genuinely runnable in this
    environment. Scored 15/20. Fixed the top 3 findings immediately
    (`userInterfaceStyle`, Reduce Motion, `AudioErrorBanner`'s missing
    screen-reader announcement — see `PROJECT_FACTS.md`). **All 3
    remaining findings closed 2026-08-25**: `predictiveBackGestureEnabled`
    flipped to `true` (confirmed it was just Expo's scaffold default, not
    a project reason), `supportsTablet` flipped to `false` (honest fix —
    no tablet layouts exist), countdown ring gained a real
    `accessibilityLabel` — see `CHANGES.md`/`PROJECT_FACTS.md`.
  - [x] **Genuine visual confirmation** — `done`, 2026-08-25. Real
    screenshots captured and reviewed for all four phase states (Ready,
    Work, Rest, Finished — Rest/Finished were the two never actually
    seen before). Found and fixed a real bug in the process (see Phase
    8 close's `WheelPicker` addendum below) — a fresh cold launch showed
    Settings' Round/Work/Rest wheels stuck on their first list item
    regardless of actual stored value.

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
  - [x] **Visual confirmation** — `done`, 2026-08-25. Real screenshot of
    the intro step ("THE BELL KEEPS RINGING") captured and reviewed; the
    second step ("ONE MORE THING", battery-optimization tip) shares
    100% of its layout/type styles with the captured step (one
    `createStyles` call for both), confirmed via source rather than a
    second screenshot after repeated synthetic-touch timing issues in
    this environment made it hard to land on that exact step. No issues
    found — matches the app's dark/orange world, single obvious primary
    action per screen, correct accessibility labels on both buttons.

## Phase 8 — Settings + Punches + Presets

*(inherits the now-locked `DESIGN.md` — no new visual-world decisions)*

- [x] **8a. Settings screen** — `done` — split into two passes
  (confirmed, matches how Phase 5 was sequenced):
  - [x] **Navigation infrastructure** — `done` — installed and wired
    `expo-router` (the confirmed real trigger point, not 7b's one-way
    onboarding gate): `App.tsx`/`index.ts`/`App.test.tsx` retired,
    replaced by `src/app/_layout.tsx` (root layout — font loading +
    `SafeAreaProvider` moved here unchanged) with `main` set to
    `expo-router/entry`. `MainTimerScreen.tsx`/`OnboardingScreen.tsx`
    became real route files (`src/app/index.tsx`, `src/app/onboarding.tsx`,
    content otherwise unchanged); the gear icon now pushes to a real
    `src/app/settings/` route (its own nested `_layout.tsx` with a
    themed header + back arrow, per `docs/user-flows.md`'s navigation
    convention — index/onboarding stay headerless/full-bleed). Settings
    itself is a placeholder screen only — proves the route is reachable
    and back-navigable, no form content yet. 3 new navigation tests via
    `expo-router/testing-library`'s `renderRouter`, one per file (see
    `PROJECT_FACTS.md` for why one file per test was needed). 109/109
    tests passing, all gates green.
  - [x] **Settings form content** — `done` — the real form: Round
    (rounds + Work/Rest/Warmup via a new `react-native-wheely`-based
    wheel picker) → Mode → Sounds (just the volume slider — confirmed
    there's no bell/clapper "choice" of variants to pick between) →
    Combinations, made mode-aware (Random: combo length + punch pool;
    Preset: the existing Presets List row) so `comboLengthMin`/`Max` +
    `randomPunchPool` didn't need a 7th section → Combo Timing (gap
    range, **0.25x–4x** speech rate dial, announce style) → Defense
    Cues (new section, not in Flow 3's original order) → Punches.
    New `src/shared/components/` primitives (first real use of that
    folder); placeholder `/settings/punches` and `/settings/presets`
    routes shipped so the new summary rows navigate ahead of 8b/8c.
    Judgment/presentation, no new tests. 109/109 tests passing, all
    gates green; visual correctness unverified, same standing gap as
    every other screen.
- [x] **8b. Punches screen** — `done` — add/rename/delete, plus the
  non-blocking **Preview** action (live playback through the real
  `SpeechEngine`) per `docs/user-flows.md` Flow 4. New punches get the
  next unused `num` automatically — no `num` picker, matching how the
  old app's rename flow only ever wrote the name field (extraction doc
  §1.6). New `previewEngine.ts` (scoped to the screen's own mount/
  unmount, not the app's process lifetime — see `PROJECT_FACTS.md`).
  Judgment/presentation + untested native wiring, no new tests.
  109/109 tests passing, all gates green.
  - *Addendum (2026-08-25, real-device feedback):* added delete-recovery
    (Undo banner + "Restore defaults") and a per-row "random draws"
    toggle reusing `randomPunchPool`; gave the name field a visible
    bordered-box affordance since it already was editable but didn't
    read as such. 7 new service tests. See `PROJECT_FACTS.md` for the
    real forks decided here.
- [x] **8c. Presets List + Preset Editor** — `done` — two screens,
  replacing the flat placeholder (`src/app/settings/presets.tsx`
  restructured into a `presets/` folder: `index.tsx` for the List,
  `[id].tsx` for the Editor, `id === "new"` the create-mode sentinel).
  List: "+ New Preset", empty state, and a per-row separate radio
  control for `Settings.activePresetId` — a real gap in
  `docs/user-flows.md` Flow 5 (which never actually says how the active
  preset gets chosen) resolved by explicit user confirmation rather
  than a silent decision, see `PROJECT_FACTS.md`. Editor: name + ordered
  sequence builder (tap-to-append, up/down reorder, remove — not
  drag-and-drop, no new gesture dependency), with an **explicit Save
  button** unlike Settings/Punches' autosave, since Flow 5 itself lists
  "save" as its own step and autosaving a new preset's draft would
  persist abandoned entries. Judgment/presentation, no new tests.
  109/109 tests passing, all gates green.
- [x] **Phase close: `/impeccable critique` + `/impeccable polish`** —
  `done`, 2026-08-25 — Main Timer + full Settings stack judged together
  (dual-agent critique, 30/40, real screenshots from a running emulator),
  then polished. Fixed: `accentDim`/`danger` WCAG contrast failures,
  unconfirmed/unrecoverable preset deletion, a real nested-VirtualizedList
  bug that removed `react-native-wheely` entirely (hand-built on
  Reanimated instead), `CountdownRing` undershooting its own
  design-contract sizing target, an unsorted Punches list + inconsistent
  name casing, four sub-44pt touch targets, an overlapping-hitSlop
  mis-tap risk, and several missing `accessibilityLabel`s. Full report
  in `CHANGES.md` and `.impeccable/critique/`. 136/136 tests passing.
  **Deliberately deferred, not forgotten**: Punches' last-punch-delete
  guard still uses a native `Alert.alert` (the app's only native dialog,
  everywhere else is a themed inline banner) — flagged in
  `PROJECT_FACTS.md`; swapping unicode-glyph icons (⚙▶✕ etc.) for a real
  icon system — a new dependency, judged too big a decision for this
  pass, needs its own follow-up.
  - *Addendum (2026-08-25, closing 6a/7b's visual-confirmation gap):*
    a second real `WheelPicker` bug found on a genuinely fresh app
    launch — Round/Work/Rest wheels showed the first list item instead
    of the actual stored value. Fixed (frozen initial `contentOffset`
    instead of a mount-time `scrollTo`, which was racing the native
    view's first layout and losing). See `PROJECT_FACTS.md` for the
    full trace. 136/136 tests still pass.

## Phase 9 — Platform Builds & Ship Readiness

- [x] **9a. EAS build config, Android** — `done`, 2026-08-26 — `eas.json`
  written (development/preview/production profiles; `developmentClient:
  true` + `distribution: "internal"` + `android.buildType: "apk"` on
  development/preview for direct-install dev-client testing;
  `appVersionSource: "remote"` so EAS owns version/build-number bumping
  rather than hand-maintained native files). `com.gary.cornerman`
  continuity already confirmed (`PROJECT_FACTS.md`, predates this
  sub-phase) and unchanged in `app.json`. EAS project linked (`eas init
  --account pontoy`, writes `projectId`/`owner` into `app.json`). First
  cloud build hit the recurring lockfile-drift bug class (fixed, PR
  #22); second build succeeded
  (`c65cac86-8ea0-4c48-bc5a-65e6e3e831ec`). **Real-device verification
  done**: downloaded the built APK and sideloaded it onto the Android
  emulator (had to uninstall a stale differently-signed dev-client build
  first — `INSTALL_FAILED_UPDATE_INCOMPATIBLE`), confirmed it installs
  and actually launches, Onboarding rendering correctly in the
  dark/orange theme on a genuinely fresh install. **iOS is explicitly
  deferred** — confirmed with the user: Android-only for now due to the
  $99/year Apple Developer Program cost, revisit once there's budget or
  real iOS testers lined up (see `PROJECT_FACTS.md`).
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

- [x] **10a. `WorkoutTemplate`/`RoundConfig` data model + storage** —
  `done`, 2026-08-26 — `src/features/workoutTemplates/` (types + CRUD +
  `resolveRoundCombo`), extending the Phase 1b settings feature; kept as
  a sibling feature calling into `comboEngine`'s existing exported
  functions rather than merging in, same pattern `defenseCues` already
  used. Three built-in templates (Relax/Zone-2, Moderate, Intense) seed
  on first read; the fourth (Assault Bike Cognitive) is deferred to
  Phase 11a, which is where `AssaultBikeConfig` gets built — see
  `PROJECT_FACTS.md`. Test-first per this item's own note; 11 new tests,
  150/150 total, all gates green.
- [x] **10b. Templates Picker screen** — `done`, 2026-08-26 —
  `src/app/templates/` (new top-level nested stack, reached directly
  from Main Timer per Flow 6, not nested under Settings). New
  `TemplatesButton` (☰) sits next to the Settings gear in Main Timer's
  top row. Lists all 10a templates with a name/BUILT-IN tag/summary
  (`summarizeBoxingConfig`) and an Edit icon per row; "+ New Template".
  **Tap-to-start and Edit are deliberately stubbed** (an `InfoBanner`
  "coming soon" message) — same no-op-until-wired precedent
  `SettingsGear` itself used in Phase 6 before Phase 8 built real
  Settings, confirmed with the user rather than shipping a primary
  action that silently does nothing. Round Builder (10c) and wiring the
  timer engine to a `roundPlan` (10d) are what actually make those
  real. Judgment/presentation, no new tests (matches Presets List's own
  precedent); 150/150 tests still pass. Visually confirmed on the
  Android emulator: the screen renders all three built-ins with correct
  summaries and navigates correctly from Main Timer.
- [x] **10c. Round Builder / Template Editor screen** — `done`,
  2026-08-26 — `src/app/templates/[id].tsx` (`id === "new"` sentinel,
  mirroring Preset Editor exactly: explicit Save, same
  try/catch-into-generic-error pattern). Name + base pace (Work/Rest/
  Warmup wheels + combo gap `RangeSliderPair`) at the top; an inline
  scrollable list of expandable `RoundCard`s below (add/reorder/remove/
  edit in place, never a per-round sub-screen, per Flow 6). Each round:
  optional label/note, independently-toggleable work/rest and combo-gap
  overrides (mirrors `CombinationsSection`'s "restrict pool" switch
  pattern -- `undefined` means "use the template's base value"), and a
  `comboSource` editor whose shape changes with the selected type
  (`SegmentedControl`: RANDOM/FIXED/SEQUENCE/PRESET). Reuses
  `PresetSequenceEntry`/`AddToSequenceRow` as-is for the sequence
  builder -- they were already generic number-sequence primitives, not
  Preset-specific, so no duplication needed. Templates Picker's "+ New
  Template" and Edit icon now route here for real (tap-to-start stays
  stubbed -- still needs 10d). Judgment/presentation, no new tests
  (matches Preset Editor's own precedent); 150/150 tests still pass.
  Visually confirmed end-to-end on the Android emulator: built a real
  custom template (name, a sequence-type round with Jab), saved it, and
  confirmed it appears correctly in the Templates Picker list.
- [x] **10d. Wire timer/combo engines to a `roundPlan`** — `done`,
  2026-08-26 — Main Timer now consumes per-round duration/gap/
  comboSource overrides when a template-driven session is active;
  existing Settings-driven quick-start keeps working unchanged (every
  new parameter is additive with a default that reproduces the old
  behavior exactly). Correctness-critical (timer phase transitions,
  combo generation) — test-first throughout, 15 new tests:
  - `timer/service.ts` — `TimerConfig` gained an optional
    `roundOverrides` array (ms, purely additive); new
    `effectiveWorkDurationMs`/`effectiveRestDurationMs` resolve a
    round's own override or fall back to the base, used by both
    `beginWork`/`beginRest`'s `phaseEndAt` math and the 10-second
    work-warning check (which had the exact same "reads the base
    duration instead of the round's actual one" bug already fixed once
    this session for short rounds — caught and fixed here too before
    it could ship).
  - `session/service.ts` — `sessionTick` gained an optional
    `ActiveTemplateSession` parameter; when present, combo generation
    resolves via `workoutTemplates`' `resolveRoundCombo` for the
    current round instead of Settings-driven `generateCombo`, and
    re-arms using that round's own comboGap override or the template's
    base gap.
  - `workoutTemplates/service.ts` — new `toTimerConfig(BoxingConfig)`
    converts a template into the engine's own `TimerConfig`, sibling to
    `useSession.ts`'s existing Settings-driven version.
  - `useSession.ts` — `start()` now optionally takes a `WorkoutTemplate`
    argument, snapshotting a template-driven config exactly like the
    Settings-driven path already did. New `totalRounds`/
    `phaseDurationMs` return values fix a real, previously-latent bug:
    Main Timer was reading `settings.rounds`/`settings.*DurationSec`
    directly for display, which would have shown the *wrong* round
    count and ring duration for any template session (and technically
    already could for any round with a future per-round override).
    Templates Picker's tap-to-start now sets a small transient
    "start this template" signal (`workoutTemplates/pendingStart.ts`)
    and pops back to the already-mounted Main Timer (which stays
    mounted underneath Templates the whole time) rather than pushing a
    fresh instance -- avoids re-initializing native audio/speech
    engines. Caught and fixed a real footgun before it shipped:
    `ControlRow`'s plain Start button passes a `GestureResponderEvent`
    through `onPress`, which would have been passed positionally as
    `start`'s new `template` argument -- the call site now wraps it
    (`onStart={() => start()}`).
  - Judgment/presentation for the UI wiring itself, but the engine/
    session layers are the correctness-critical core; 165/165 tests
    total, lint/typecheck clean. Visually confirmed end-to-end on the
    Android emulator: built a single-round "fixed-punch: Jab" template
    with 0 warmup, started it from the Templates Picker, and watched
    Main Timer show the correct round total (1/1, not Settings'
    leftover value), skip straight to Work, and call "JAB" repeatedly
    (3 combos called), never falling back to random generation.
  - [ ] `/impeccable audit` (Templates Picker + Round Builder) —
    **not run yet**, deferred to the Phase 12 close alongside the
    Assault-Bike screens, per this file's own design-system risk check.

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

Phases 1–8 are all done — 109/109 tests passing, all gates green. Each
Phase 8 sub-phase went through an independent `reviewer` pass before
being marked done; real issues that pass caught are already fixed (see
`CHANGES.md`'s dated entries and `PROJECT_FACTS.md` for the durable
ones).

**A real device is now available and the app has actually been run**
(2026-08-24) — this changes the standing "no device/simulator in this
environment" caveat that applied to every phase before this. The
project also moved to `C:\dev\cornerman` (a Windows path-length issue
broke native builds at the old OneDrive location — see
`PROJECT_FACTS.md`), and a real bug was found and fixed in the process:
three router-integration tests were living inside `src/app/` and Expo
Router's route scanner was sweeping them into the real app bundle
(moved to `src/appTests/`). Onboarding and Main Timer's Ready state
were visually confirmed from a real screenshot and match
`docs/design-direction.md`'s contract closely. **Still not done, even
though a device now exists:** the actual deliberate `/impeccable audit`
process (this was ad hoc verification during build troubleshooting, not
that process), visual confirmation of Settings/Punches/Presets and the
Work/Rest/Finished timer states, and 7a's background-audio survival
(does audio genuinely keep playing through a locked screen or a phone
call). `DESIGN.md` still doesn't exist — per Impeccable's process it
gets written *from* the real, inspected result of a proper audit, not
from incidental screenshots taken mid-troubleshooting.

**2026-08-24, later the same day: the visual world was redesigned.**
Once the gunmetal/brass palette was actually seen running (the
confirmation above), the user didn't like it and asked for a different
direction — dark background + orange accent (Claude/VS Code dark-theme
register) plus real light/dark mode support, not one locked dark world.
This was a pinned user direction, not a `concept-seed` re-roll. The
analog-dial motifs (sweep-ring countdown, engraved-style phase badge,
lap-dial round counter, bell-strike animation) were kept and just
recolored — confirmed explicitly over flattening to a chrome-less
Claude/VSCode-style layout. Barlow Condensed was retired for Inter
(display/label text); JetBrains Mono was added specifically for numeral
readouts (countdown, wheel-picker values, slider values, num badges).
New `src/shared/theme/` (`tokens.ts` + `ThemeContext.tsx`) replaces the
old static `src/features/session/theme.ts`, driven by a new
`Settings.themeMode` field (System/Light/Dark, new Appearance section in
Settings) plus the device's own color scheme. All ~29 files that
consumed the old static theme were converted to a `useTheme()` hook.
109/109 tests still pass, lint/typecheck clean. See
`docs/design-direction.md`'s redesign record and `PROJECT_FACTS.md` for
the full token map and reasoning. **This redesign has not yet been seen
on a real device either** — same standing verification gap as
everything else in this environment.

**Update, 2026-08-25:** the Phase 8 close `/impeccable critique` +
`/impeccable polish` pass described as "what's next" above is now done
(see Phase 8's close entry), and so is 6a/7b's outstanding visual
confirmation gap — real screenshots of every Main Timer phase state and
the Onboarding intro were captured and reviewed against the new
dark/orange palette, closing a second real `WheelPicker` bug in the
process (see the Phase 8 close addendum). **What's actually next:** 7a's
real-device background-audio survival test (locked screen / phone call)
is still the one standing verification gap nothing has closed yet. **9a's
`eas.json` is written** (build profiles for a dev-client build), but
actually linking an EAS project (`eas login`, `eas build:configure`)
and triggering a real build is still the user's own action. Phase 10+
is planned and written down, but confirmed to build *after* Phase 9
ships. As each sub-phase completes, mark it `done` here and log the
matching entry in `CHANGES.md`.
