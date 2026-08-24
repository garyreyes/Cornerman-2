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
- 2026-08-24: Sub-phase 4a — Audio engine (`src/features/audio/`):
  `react-native-audio-api` bus (`GainNode` for the independent
  `settings.appVolume` fader → fixed makeup-gain `GainNode` →
  `WaveShaperNode` soft-clip limiter → destination) wired to the
  timer's `TimerEvent`s via `mapEventToCue` (phase-changed to
  work/rest → bell, work-warning → clapper, rest-countdown → tick,
  session-finished → final bell; every other event plays nothing).
  This library has no `DynamicsCompressorNode` yet (confirmed against
  its own README roadmap), so the old app's proven
  masterGain→compressor bus (extraction doc §1.11) couldn't carry over
  as literally planned in `ARCHITECTURE.md` — substituted a
  WaveShaper soft-clip curve as the overlap-clipping guard instead; see
  `PROJECT_FACTS.md`. Bell/clapper/countdown-tick assets are silent
  placeholder WAVs, not final — real sourcing is a manual, by-ear task
  outside what I can do from here, tracked in
  `assets/audio/SOURCING.md`. `mapEventToCue`/`gainForVolume` (pure)
  and the bus-wiring/playback dispatch (native-module-backed, tested
  against the library's own official Jest mock,
  `react-native-audio-api/mock`) are both test-first per the
  correctness-critical rule — one wrong event-to-cue mapping is an
  immediately-noticeable bug mid-workout. 13 new tests, all passing
  (56/56 total).
- 2026-08-24: Sub-phase 5a — Bundled voice-bank lookup + playback
  (`src/features/speech/`), scope expanded per `docs/PRD.md` §10 while
  planning: default punches renamed left/right → lead/rear so names
  survive a mid-session stance switch, `Body Hook` added (`num: 7`),
  and the vocabulary extended to kicks (12, lead/rear paired) and
  defense/movement words (6) beyond the original punch-only word bank.
  `normalizeToKey`/`resolveBundledClip` resolve any text to one of 33
  bundled clips generated by `scripts/generate_voice_bank.py` (Kokoro
  TTS, dev-machine only, never on-device) — `VoiceClip`'s entity design
  changed from punch-keyed to normalized-text-keyed accordingly
  (`ARCHITECTURE.md`), since numbers and defense words need clips with
  no owning `Punch`. Committed WAVs are silent placeholders; this
  environment has no Python to actually run the generation script.
  Test-first for the pure lookup logic and the native playback wiring
  (via `react-native-audio-api`'s own official Jest mock, same pattern
  as Phase 4a). 10 new tests, all passing (66/66 total).
- 2026-08-24: Sub-phase 5b — Pitch-preserving time-stretch. Discovered
  `react-native-audio-api` has a genuine native WSOLA time-stretch built
  in (`createBufferSource({pitchCorrection: true})` + the `playbackRate`
  param) — no hand-rolled phase-vocoder/WSOLA needed, resolving what
  `docs/PRD.md` calls the project's single real unsolved technical
  requirement. One real gap: the library hard-caps `playbackRate` at 4x
  in its C++ core (`WsolaTimeStretcher::MAX_PLAYBACK_RATE`), not the
  originally-discussed 5x. Revised the spec down to 0.25x–4x rather than
  building a dual-buffer workaround for the 4x-5x band, updating
  `docs/user-flows.md`/`ARCHITECTURE.md`/`PRODUCT.md`/
  `src/features/settings/types.ts` to match (`docs/PRD.md` itself never
  hardcoded "5x" — it already said "whatever rate ends up being the
  practical ceiling," so no PRD edit was needed).
  `rateForSpeechRate`/`SpeechEngine.setRate` wire the clamped rate into
  `src/features/speech/service.ts`'s playback. 4 new tests, all passing
  (71/71 total).
- 2026-08-24: Sub-phase 5c — On-device TTS fallback for custom punches.
  Checked before assuming (same discipline as 4a/5b's library-capability
  surprises): neither `expo-speech` nor `react-native-tts` can
  synthesize TTS to a file, only live-play it — the "synthesize once,
  cache as a VoiceClip file" design `ARCHITECTURE.md` assumed isn't
  buildable with any available library, only a custom native module
  (real Swift/Kotlin, unverifiable in this environment). User explicitly
  chose live `expo-speech` playback over that native-module route — an
  unrecognized word (custom punch/kick name, or a number outside the
  bundled 1-6) now falls through to live on-device TTS every time it's
  spoken, through the OS's own audio output rather than the app's
  `AudioContext`/WSOLA bus, with the same `[0.25, 4.0]` rate clamp and
  `appVolume` applied for consistency. `docs/user-flows.md` Flow 4
  revised to drop the now-inapplicable blocking generate/cache step.
  Confirmed the last-punch delete guard (Flow 4's other requirement) was
  already built in Phase 1b — no new work needed there. Test-first for
  the dispatch logic (bundled-vs-fallback routing, rate/volume clamping
  into the `Speech.speak` call); verified `expo-speech` works cleanly
  under Jest without a manual mock before relying on that. 4 new tests,
  all passing (74/74 total).
- 2026-08-24: Sub-phase 5d — Number announce-style + defensive/movement
  cue layer, closing out Phase 5. `comboEngine`'s new
  `resolveAnnounceText` maps a punch to spoken text per the new
  `announceStyle` setting (name vs number), reusing 1-6's bundled
  word-spelled clips rather than always falling through to TTS.
  Reading `timer/service.ts` closely surfaced that only the *first*
  combo's timing was ever built (`firstComboAt`) — no recurring
  gap-timer re-arming exists for combos yet, that's Phase 6's job.
  Extracted the proven clamped-window formula into
  `src/lib/gapTiming.ts`'s `nextGapFireTime` instead of duplicating it
  for defense cues, refactored `firstComboAt` to use it
  (behavior-preserving — all 21 pre-existing timer tests pass
  unchanged), and built `src/features/defenseCues/` on that same
  primitive, deliberately not touching the already-shipped, tested
  `Combo`/`comboEngine` type. New independent
  `defenseCuesEnabled`/`defenseCueGapMinSec`/`defenseCueGapMaxSec`
  settings (15s/30s default). Test-first throughout. 12 new tests, all
  passing (90/90 total). Phase 5 (Speech Pipeline) is now fully
  complete.
- 2026-08-24: Sub-phase 6a — Main Timer screen, the flagship first
  surface. New `src/features/session/` orchestration layer
  (`sessionTick`) coordinates every headless engine from Phases 2-5,
  building the recurring combo-repeat and defense-cue firing loop that
  Phase 5d explicitly flagged as still missing — mirrors `tick()`'s
  pure-decision pattern (returns actions, doesn't call speech/audio
  directly) so the scheduling logic stays testable; the untested
  `useSession.ts` effect loop is the thin consumer that makes the
  actual native calls, same split already used for audio/speech's
  native wiring. `src/app/MainTimerScreen.tsx` covers all states
  (Ready/Warmup/Work/Rest/Paused/Finished, plus the audio-init-error
  banner) against `docs/design-direction.md`'s locked "Corner's
  Stopwatch & Bell" contract, copied verbatim into the screen's opening
  comment per Impeccable's format. New dependencies:
  `react-native-reanimated`/`react-native-worklets` +
  `react-native-svg` for the sweep-ring countdown and bell-strike
  pulse, `@expo-google-fonts/barlow-condensed`/`@expo-google-fonts/inter`
  for the direction contract's exact type choices,
  `react-native-safe-area-context` (replacing RN's deprecated built-in
  `SafeAreaView`). Navigation deliberately deferred — only one real
  screen exists yet; the settings gear is a no-op stub until Phase 8.
  Two new manual Jest mocks needed (`react-native-worklets`,
  `react-native-safe-area-context`) — neither has a JS-only fallback
  under Jest, same established lesson as `react-native-mmkv`/
  `expo-crypto`; both reuse the packages' own official mocks (like
  `react-native-audio-api`'s) rather than hand-rolled fakes. 9 new
  tests for `sessionTick` (test-first, correctness-critical); the
  screen/animation code is judgment/presentation, no tests, per the
  usual split — ends in `/impeccable audit` instead, **not run**: this
  environment has no device/simulator/screenshot capability, so the
  actual visual result has never been seen. 99/99 tests passing, all
  gates green; visual correctness is unverified until the user actually
  looks at it running.
- 2026-08-24: Sub-phase 7a — Native background audio session +
  interruption handling. The declarative half (iOS
  `UIBackgroundModes: audio`, Android foreground service) turned out to
  already be free: `react-native-audio-api`'s own Expo config plugin
  defaults both on and is already listed in `app.json` — no changes
  needed there. Built the runtime half: `src/lib/backgroundAudio.ts`
  activates the iOS audio session with the `playback` category (required
  for playback to continue locked/backgrounded) and turns on interruption
  event delivery via the library's `AudioManager`. New pure, tested
  `decideInterruptionAction` (`src/features/session/service.ts`, 6 new
  tests) is the actual decision logic Phase 2b deferred to "native
  wiring, Phase 7" — began → pause, ended → resume, but critically only
  auto-resumes a pause *it* caused, never one the user triggered
  manually. `useSession.ts` wires it to the already-tested
  `pause`/`resume` timer functions. Also added a minimal "session
  running" lock-screen/notification-shade indicator via
  `PlaybackNotificationManager`, shown on start, updated on pause/resume
  (manual or interruption), hidden on reset/finish — confirmed scope,
  not strictly required for the Android foreground service to survive
  but standard UX for any app claiming background audio. The official
  Jest mock was missing several `AudioManager`/`PlaybackNotificationManager`
  methods this needs; patched `__mocks__/react-native-audio-api.ts` with
  explicit no-op forwards (its static class methods are non-enumerable,
  so a naive object-spread silently dropped them — had to list each one).
  105/105 tests passing, all gates green. Real background-audio behavior
  (does it actually survive a lock screen / phone call on a real device)
  is unverified from this environment, same honesty standard as the
  visual/audio-quality gaps already logged for earlier phases.
- 2026-08-24: Sub-phase 7b — Onboarding screen
  (`src/app/OnboardingScreen.tsx`), first-launch only per
  `docs/user-flows.md` Flow 1: intro explainer → Android 13+
  notification permission request → battery-optimization tip (shown
  only if granted) → done, with a denial proceeding anyway per Flow 1's
  proposed default. iOS skips both permission steps (no runtime prompt
  needed there). Gated by a new `Settings.hasCompletedOnboarding`
  boolean, same zero-migration MMKV pattern as every other Settings
  field (2 new tests: defaults `false` on old saved data,
  `markOnboardingComplete()` round-trips `true`). `App.tsx` now
  conditionally renders `OnboardingScreen` vs. `MainTimerScreen` off
  that flag, reusing the same plain conditional-render pattern already
  in place for the fonts-loading gate — real navigation (`expo-router`)
  stays deliberately deferred to Phase 8, since this is a one-way gate
  with no back-navigation need, not the push/pop stack Settings/
  Punches/Presets will actually require. `App.test.tsx` updated: one
  test for the fresh-install onboarding path, one for Main Timer once
  onboarding is already complete. 108/108 tests passing, all gates
  green; visual correctness for this screen is unverified for the same
  reason as 6a's.
- 2026-08-24: Sub-phase 8a (navigation infrastructure pass, confirmed
  split from the Settings form content) — installed and wired
  `expo-router`, the confirmed real trigger point (Settings/Punches/
  Presets need a genuine push/pop stack with back arrows, unlike 7b's
  one-way onboarding gate). `App.tsx`/`index.ts`/`App.test.tsx` retired;
  `main` is now `expo-router/entry`. `src/app/_layout.tsx` is the new
  root layout (font loading + `SafeAreaProvider` moved here unchanged,
  headerless by default). `MainTimerScreen.tsx`/`OnboardingScreen.tsx`
  became real route files (`src/app/index.tsx`, `src/app/onboarding.tsx`
  — content otherwise unchanged, `onboarding.tsx` now uses
  `router.replace("/")` instead of an `onDone` prop). The gear icon now
  pushes to a real `src/app/settings/` route with its own nested,
  themed-header stack — shipped as a placeholder screen only, proving
  the route is reachable and back-navigable; the real form is a
  following pass. 3 new navigation tests via `expo-router/testing-
  library`'s `renderRouter`, each in its own file (cross-test
  navigation-state interference when multiple `renderRouter` calls
  shared one file — see `PROJECT_FACTS.md`). Also corrected this
  roadmap's stale "0.25x–5x" rate-dial reference to the actual confirmed
  0.25x–4x cap. 109/109 tests passing, all gates green.
- 2026-08-24: Sub-phase 8a (Settings form content pass, closing out 8a) —
  the real form replacing the nav-infra pass's placeholder, in the
  confirmed extraction-doc §1.14 order: Round (rounds + Work/Rest/Warmup
  duration, via a new themed `WheelPicker` wrapping `react-native-wheely`
  — pure-JS, no native module, per PRD §3.1/§8's "iOS-style continuous
  scroll picker" requirement) → Mode (Random/Preset segmented control) →
  Sounds (app volume slider — confirmed there's no bell/clapper "choice"
  of multiple variants, `audio/service.ts`'s `CUE_ASSETS` is one fixed
  asset per cue, so this section is just the volume slider) →
  Combinations, made mode-aware to give the newer `comboLengthMin/Max` +
  `randomPunchPool` fields a home without adding a 7th section: Random
  mode shows a combo-length range + a punch-pool chip multi-select
  (with a "restrict pool" toggle and a last-chip guard), Preset mode
  keeps the existing Presets List summary row → Combo Timing (gap range
  respecting the 0.5s "Blitz" floor per extraction doc §1.7, the
  0.25x–4x speech-rate dial, Name/Number announce-style toggle) →
  Defense Cues (new section, not in the original Flow 3 order since it
  postdates Phase 5d — enabled toggle + gap range, shown only when
  enabled) → Punches (summary row). New dependencies:
  `react-native-wheely` (pure JS) and `@react-native-community/slider`
  (real native view, needs a dev-client rebuild to actually run, same as
  every other native dependency added so far — no `app.json` plugin
  entry needed, it autolinks). New `src/shared/components/` primitives
  (`SectionCard`, `SegmentedControl`, `LabeledSlider`, `RangeSliderPair`,
  `WheelPicker`, `SummaryRow`, `ChipMultiSelect`) — the first real use of
  the `shared/` folder `ARCHITECTURE.md` reserved for this. Also shipped
  minimal placeholder routes for `/settings/punches` and
  `/settings/presets` (same "proves reachable" pattern the nav-infra pass
  used for `/settings` itself), so the new summary rows actually navigate
  instead of dead-ending ahead of 8b/8c. Judgment/presentation work, no
  new tests — updated the one existing navigation test
  (`settings-navigation.test.tsx`) to assert on real form content instead
  of the retired placeholder's body text, and registered the two new
  placeholder routes in its `renderRouter` call so the nested layout's
  screen list matches. 109/109 tests passing, all gates green; visual
  correctness is unverified for the same reason as every screen so far
  (no device/simulator in this environment). Phase 8a is now fully done —
  8b (Punches) is next.
- 2026-08-24: `reviewer` pass on 8a's Settings form content caught three
  real issues, all fixed: `WheelPicker`'s out-of-range fallback silently
  showed index 0 (e.g. "Rounds: 1") instead of the nearest valid value
  when a persisted setting isn't on the wheel's discretized grid — now
  snaps to nearest, matching the codebase's existing graceful-fallback
  pattern (`resolvePunchName`/`effectivePool`); the punch-pool chip
  multi-select's "can't deselect the last one" guard undercounted when
  two punches share a `num` (explicitly allowed, extraction doc §1.6) —
  `randomPunchPool` is now deduped on every write in
  `CombinationsSection.tsx`; `settings/index.tsx`'s `handleChange` read
  `settings` from a stale render closure instead of a functional updater
  like `useSession.ts`'s established pattern — fixed. Also normalized a
  `SafeAreaView` `edges` inconsistency between the new placeholder routes
  and the new real screen. One more finding (Settings' punches/presets
  loaded once on mount, not refreshed on focus) is correctly harmless
  today — 8b/8c have no mutation yet — logged in `PROJECT_FACTS.md` as
  required follow-up when they ship. 109/109 tests passing, all gates
  green after fixes.
- 2026-08-24: Sub-phase 8b — Punches screen, replacing its placeholder.
  `src/app/settings/punches.tsx`: each punch is an inline-editable name
  field (commits on blur) + num badge + non-blocking Preview + Delete
  (`docs/user-flows.md` Flow 4). Preview plays through the real
  `SpeechEngine` (bundled clip or on-device TTS fallback, at the
  current speech rate/volume) via a new `previewEngine.ts`, not a
  simplified stand-in — so it actually sounds like what the user will
  hear mid-session. Adding a punch assigns the next unused `num`
  automatically; there's no `num` picker anywhere in this UI, matching
  how the old app's rename flow only ever wrote the name field
  (extraction doc §1.6). Delete keeps the existing Phase 1b last-punch
  guard (`LastPunchError`), surfaced via `Alert.alert` (blocking, per
  Flow 4's own "Blocked" framing — the app's first use of a native
  alert dialog rather than a themed inline banner; flagged in
  `PROJECT_FACTS.md` for the Phase 8 close critique pass, not fixed
  now). Judgment/presentation + untested native wiring (matches
  `useSession.ts`/`speech/service.ts`'s existing precedent), no new
  tests. 109/109 tests passing, all gates green.
- 2026-08-24: `reviewer` pass on 8b caught one High-severity issue and
  two Medium, all fixed: the Settings screen (`settings/index.tsx`)
  loaded punches/presets once on mount and never refreshed — a gap this
  project's own `PROJECT_FACTS.md` had explicitly flagged as "fix when
  8b/8c ship," now actually reachable since 8b lets a user mutate
  punches and navigate back to Settings underneath. Fixed with a
  `useFocusEffect`-driven refetch (re-exported directly from
  `expo-router`). `previewEngine.ts`'s original "no way to release the
  AudioContext" justification for never closing its engine was
  factually wrong — the library's `AudioContext.close()` exists,
  `SpeechEngine` (this codebase's own wrapper) just never surfaced it;
  added `close()` to the `SpeechEngine` interface and scoped
  `previewEngine.ts` to the Punches screen's own mount/unmount instead
  of the app's process lifetime, so visiting Punches no longer leaves a
  second native AudioContext open forever. Also caught and fixed a real
  unhandled-promise-rejection risk in the pre-existing (Phase 5a)
  `speech/service.ts`'s fire-and-forget bundled-clip playback — added a
  `.catch()`; left `playWord`'s synchronous boolean contract alone
  (changing it would have broken its own well-covered Phase 5 test
  suite for a currently-unobservable edge case, since the committed
  voice-bank WAVs are silent placeholders, not corrupt ones). 109/109
  tests passing, all gates green after fixes.
- 2026-08-24: Sub-phase 8c — Presets List + Preset Editor, closing out
  Phase 8. Restructured the flat `src/app/settings/presets.tsx`
  placeholder into a `presets/` folder (`index.tsx` List, `[id].tsx`
  Editor, `id === "new"` the create-mode sentinel) since
  `docs/user-flows.md` Flow 5 needs two distinct screens, not one.
  Presets List: "+ New Preset", an empty state, and -- a real gap in
  Flow 5 resolved by an explicit user decision rather than a silent
  one, since Flow 5 describes create/edit/delete but never actually
  says how the active preset gets chosen -- a separate radio-style
  control per row sets `Settings.activePresetId`, distinct from tapping
  the row body (which opens the Editor, per Flow 5's literal wording).
  Deleting the active preset clears the selection. Preset Editor: name
  field + an ordered sequence builder (tap-to-append from the current
  Punches list -- deliberately not a toggle/multi-select like
  `ChipMultiSelect`, since a punch can legitimately repeat in a combo --
  plus up/down reorder and remove per entry, no drag-and-drop, no new
  gesture dependency), with an explicit Save button unlike Settings/
  Punches' autosave -- Flow 5 itself lists "save" as its own step, and
  autosaving a new preset's draft on every keystroke would persist
  abandoned entries. `settings/index.tsx`'s focus-refresh now also
  refetches `settings` itself (not just punches/presets), since the new
  List screen's activation control mutates `Settings.activePresetId`
  from a sibling screen. Judgment/presentation, no new tests. 109/109
  tests passing, all gates green. Phase 8 (Settings, Punches, Presets)
  is now done -- next is the Phase close `/impeccable critique` +
  `/impeccable polish` pass, then Phase 9.
- 2026-08-24: `reviewer` pass on 8c caught one real Medium-severity
  issue, fixed: `PresetsListScreen`'s `handleDelete` compared against
  `settings.activePresetId` from a stale render closure instead of a
  functional update, so two rows' controls firing in the same batch
  (e.g. simultaneous multi-touch -- activating one preset while
  deleting another) could let the delete's stale check clobber the
  just-made activation. Fixed by switching `handleActivate`/
  `handleDelete` to functional `setSettings` updaters throughout,
  matching the pattern `settings/index.tsx`'s `handleChange` already
  established. Every other scrutinized area (mode detection on
  remount, the defensive redirect-if-preset-not-found effect, reorder/
  remove logic with duplicate `Punch.num` values, keying, layer
  boundaries, Save gating) checked out correct. 109/109 tests passing,
  all gates green after the fix.
- 2026-08-24: Sub-phase 9a (partial) -- wrote `eas.json`: `development`
  (dev-client, internal distribution, Android APK -- installs directly
  on a device without Play Store, matching this project's dev-client-
  not-Expo-Go requirement) and `preview` profiles for direct-install
  testing builds, plus a minimal `production` profile
  (`autoIncrement: true`) and empty `submit.production` stub for when
  actual store submission is eventually in scope (still explicitly not
  now, per `docs/PRD.md`). `appVersionSource: "remote"` so EAS owns
  version/build-number bumping rather than hand-maintained native
  files -- consistent with this project's gitignored, regenerate-on-
  demand `android`/`ios` folders (confirmed via `git log`/`.gitignore`:
  an `android/` folder already exists locally from an earlier local-
  build attempt, untracked, not touched by this change). No `eas.json`
  or CI/EAS integration existed before this. Config-only, no gates
  apply. **Not done**: linking an actual EAS project (`eas login` + `eas
  build:configure`, which needs the user's own Expo account and writes
  a `projectId` into `app.json`) and the real-device/simulator
  verification 9a also calls for -- both are the user's own action, not
  buildable from here.
- 2026-08-24: First successful real-device (emulator) build and run --
  a genuine milestone, not a code change, but worth logging since it
  took real troubleshooting to get here and produced one actual bug
  fix. Along the way: installed JDK 17 (Android Studio's bundled JBR
  turned out to be JDK 25, incompatible with this AGP/CMake toolchain);
  found and deleted a stray `gradle-daemon-jvm.properties` that
  silently pinned the Gradle daemon to JDK 25 regardless of `JAVA_HOME`;
  hit a genuine Windows path-length limit breaking native CMake builds
  under the old, deeply-nested OneDrive project path, which enabling
  Windows long-paths support did not fix -- moved the whole project to
  `C:\dev\cornerman` (the old copy, verified clean and identical, was
  then deleted). Found and fixed a real, previously-undiscovered bug:
  three router-integration test files
  (`main-timer-ready`/`onboarding-redirect`/`settings-navigation`)
  lived inside `src/app/` since Phase 8a, and Expo Router's route
  scanner has no test-file exception -- it was sweeping them into the
  real app bundle, which then failed trying to bundle Node's `path`
  module. Moved them to `src/appTests/`. See `PROJECT_FACTS.md` for the
  full details on all of the above -- they're durable facts future
  sessions need, not one-off session notes. Onboarding and Main Timer's
  Ready state were visually confirmed against `docs/design-direction.md`
  for the first time, from a real screenshot. All 109 tests still pass,
  all gates green, after the test-file move.
