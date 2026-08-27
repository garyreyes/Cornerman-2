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
- 2026-08-24: Visual-world redesign — the user saw the gunmetal/brass
  "Corner's Stopwatch & Bell" palette rendered on-device for the first
  time and asked for a different direction: dark background + orange
  accent (Claude/VS Code dark-theme register), plus real light/dark mode
  support, not one locked dark world. `docs/design-direction.md` rewritten
  as a redesign record (analog-dial motifs -- sweep-ring, phase badge,
  lap-dial round counter -- kept per explicit confirmation, only the
  palette/type changed). New `src/shared/theme/` (`tokens.ts` +
  `ThemeContext.tsx`) replaces the old static `src/features/session/theme.ts`
  with a light/dark-aware token system driven by a new
  `Settings.themeMode` field (`"system" | "light" | "dark"`, defaults to
  `"system"`) plus the device's own `useColorScheme()`. New Appearance
  section (Settings screen, leads the section order) exposes the
  System/Light/Dark toggle. Barlow Condensed retired in favor of Inter
  for display/label text; numerals specifically (countdown readout,
  wheel-picker values, slider values, num badges) now render in JetBrains
  Mono -- the one deliberate monospace touch, not a blanket swap. All ~29
  consuming files converted from a static `theme.colors.X` import to a
  `useTheme()` hook + memoized `createStyles(colors, fonts)` pattern so
  every screen actually re-renders on a mode change. 109/109 tests still
  pass, lint/typecheck clean. **Not done**: real on-device visual
  confirmation of the new palette (same standing gap as every screen
  before it -- this environment still has no simulator/screenshot
  capability) and the deliberate `/impeccable audit`/`critique`/`polish`
  passes, still outstanding from before this redesign.
- 2026-08-24: Palette correction — Light/Dark are now genuinely
  monochrome, no orange or any accent hue in either mode (two corrections
  the same day: first a per-mode-tuned orange, then one shared orange,
  both wrong against the actual ask — the Claude/VS Code reference means
  those modes are literally black-and-white). `accent` now equals
  `textPrimary` per mode; `accentDim` is a plain gray; `danger` stays the
  one deliberate red exception. See `PROJECT_FACTS.md` and
  `docs/design-direction.md` for the full record. 109/109 tests still
  pass, lint/typecheck clean.
- 2026-08-24: Appearance model correction — three real palettes now,
  not two-plus-an-OS-alias. "System" (default) is the fixed Claude/VS
  Code dark+orange look, no longer tied to `useColorScheme()`; "Light"/
  "Dark" stay the genuinely monochrome overrides from the previous
  correction. Also fixed a real bug found while verifying this on-device:
  `react-native-wheely`'s item component is wrapped in a permanently-true
  `React.memo`, so it never re-rendered on an Appearance change — Dark
  mode's wheel-picker numbers (Rounds/Work/Rest/Warmup) were invisible,
  stuck on whatever color they first mounted with. Fixed by keying
  `<Wheely>` on the theme mode to force a remount on change. 109/109
  tests still pass, lint/typecheck clean.
- 2026-08-24: Ran the native code-level `/impeccable audit` for the first
  time (Main Timer + Onboarding) — reads straight from source against
  the iOS/Android platform references, no screenshot needed. Scored
  15/20. Fixed the top 3 findings: `app.json`'s `userInterfaceStyle`
  changed from `"light"` to `"automatic"` (it was fighting the new dark
  appearances at the native-container level); `CountdownRing`/
  `PhaseBadge`'s animations now check `useReducedMotion()` and go
  stepped/skip-the-pulse when it's on; `AudioErrorBanner` now announces
  itself to screen readers on mount. Also needed a real Jest fix along
  the way — `expo-router/testing-library` registers its own
  `jest.mock('react-native-reanimated', ...)` that overrides this
  project's own mock in every router-integration test, so
  `useReducedMotion` had to be patched at the shared
  `react-native-reanimated/mock` subpath instead (new
  `__mocks__/react-native-reanimated/mock.ts`) — see `PROJECT_FACTS.md`
  for the full trace. Deliberately not fixed yet: Android's
  `predictiveBackGestureEnabled: false`, `supportsTablet: true` with no
  real tablet layout, and the countdown's missing `accessibilityLabel`.
  109/109 tests still pass, lint/typecheck clean.
- 2026-08-24: The voice bank is real now — all 33 clips under
  `assets/audio/voice/` are genuine Kokoro TTS output (am_fenrir voice),
  not the silent placeholders committed since Phase 5a. Turns out Python
  is actually installed on this machine (the earlier "no Python at all"
  fact was stale), so `scripts/generate_voice_bank.py` finally got a
  real run. Three real bugs fixed along the way: `pip install` needed
  `--only-binary=:all:` to stop numpy from trying (and failing) to build
  from source; espeak-ng has no non-admin Windows install path at all
  (its only distribution is an admin-elevated MSI, no portable build),
  worked around with the `espeakng-loader` PyPI package instead of a
  system install; and a real Windows-only bug in kokoro's own package
  (opens its config JSON without UTF-8 encoding, crashes on the system's
  cp1252 locale) needed `PYTHONUTF8=1`. Full detail in `PROJECT_FACTS.md`
  and the script's own updated docstring. Verified non-silent via a real
  amplitude check (not just file size). Bell/clapper/countdown-tick are
  still placeholders — Freesound candidates were found and vetted
  (license-checked) but Freesound requires a login to actually download,
  so that step needs a human with an account and ears.
- 2026-08-25: Voice selection — the bundled combo voice bank now ships
  two real voices (Michael, Eric) instead of one, with a new Settings >
  Combo Timing picker to choose between them. `BUNDLED_CLIPS` in
  `speech/service.ts` is now voice-keyed
  (`Record<TtsVoice, Record<string, number>>`); `createSpeechEngine`/
  `resolveBundledClip` take an optional voice param defaulting to
  Michael. Voice is fixed per engine instance (not live-switchable
  mid-utterance, same tier as changing Mode) -- a change takes effect on
  the next session/screen mount. New `Settings.ttsVoice` field, zero-
  migration default. `scripts/generate_voice_bank.py` now loops over a
  `VOICES` list and writes each into its own `assets/audio/voice/<voice>/`
  subfolder — adding a third voice later is just appending to that list
  and re-running the script, no architecture change. Also fixed a real
  UX gap the user caught by ear: the clapper (10s work warning) played
  its single "pak" sample once, but a real corner clapper is three fast
  claps — `audio/service.ts`'s `playCue` now schedules the clapper's
  buffer 3 times, 150ms apart, through the AudioContext's own clock. Both
  voices' full 33-word banks generated and verified non-silent. 114/114
  tests pass (2 new clapper tests + speech test updates for the
  voice-keyed signature), lint/typecheck clean.
- 2026-08-25: Fixed combo call-outs playing garbled and sometimes
  distorted -- the user tested on-device and reported combos not saying
  the whole thing, with occasional distortion. Root cause: `useSession.ts`
  fired `playWord()` once per punch in a combo with zero delay between
  calls, so every word in e.g. "Jab, Cross, Lead Hook" started playing at
  the exact same instant -- the overlapping buffers summed into
  unintelligible/clipped audio. `speech/service.ts` gained
  `playCombo(texts)`, which schedules bundled clips sequentially on the
  AudioContext's own clock (~120ms gap between words, same pattern as the
  clapper's repeat scheduling) and, for any word with no bundled clip
  (e.g. a custom punch name falling to on-device TTS), genuinely awaits
  its `onDone` callback before continuing so the sequence still can't
  overlap itself. `useSession.ts` now calls `playCombo` once per combo
  instead of looping `playWord`. 3 new tests, 117/117 pass, lint/typecheck
  clean.
- 2026-08-25: Punches screen -- delete recovery + a per-punch "random
  draws" toggle, from the same round of on-device feedback. Deleting a
  punch now shows an "X deleted - Undo" banner for 5s (`UndoBanner.tsx`,
  `restorePunch()` re-inserts at the original position); a "Restore
  defaults" button (confirmed via Alert first, since it's destructive to
  custom punches) resets the whole list back to the factory 7 via
  `restoreDefaultPunches()`. Each row also gets a Switch reflecting/
  toggling whether that punch is drawn in Random mode -- this reuses
  `settings.randomPunchPool` (the field Settings > Combinations' existing
  "Restrict punch pool" switch + chip picker already own), just exposed
  as a second, more direct entry point via `toggleRandomPoolMembership()`
  -- not a parallel enable/disable field. Punch numbers stay
  intentionally uneditable, reconfirmed rather than changed (Presets
  reference punches by number). Also gave the name field a visible
  bordered-box style matching `AddPunchRow`'s -- it was already editable
  (tap, commits on blur) but looked like static text, which is what the
  user actually meant by "not editable". 7 new service tests (124/124
  total), lint/typecheck clean.
- 2026-08-25: Punch numbers are now editable, reversing the same-day
  decision above -- the user tried recreating a deleted "Jab" (num 1)
  and found it always landed at the next-unused number instead, with no
  way to put it back at 1. `PunchRow`'s num badge is now an editable
  field (`renumberPunch()`, same commit-on-blur pattern as the name
  field), and `AddPunchRow` gained a matching number field pre-filled
  with the next-unused suggestion but overridable, so adding a punch now
  lets you set both name and number instead of only name. `num` still
  isn't required to be unique. 2 new service tests (126/126 total),
  lint/typecheck clean.
- 2026-08-25: Fixed pause not actually pausing combo/defense-cue
  generation -- the user caught this by watching the combo counter climb
  while the timer showed "PAUSED". Root cause: `sessionTick()` only
  checked `timerState.phase !== "work"`, never `timerState.isPaused`;
  since pausing never changes `phase` (only `tick()` freezes, per
  `timer/service.ts`), the session's own combo/defense-cue scheduling
  kept firing against real wall-clock time for the entire pause, using
  whatever `nextComboAt`/`nextDefenseCueAt` had already been armed.
  `sessionTick` now returns no actions at all while paused, and --
  matching how `timer/service.ts`'s `resume()` already preserves
  `phaseEndAt`/`firstComboAt` exactly -- leaves those timestamps
  untouched rather than resetting them, so a new `shiftSessionForResume()`
  can shift them forward by the exact paused duration on resume (wired
  into both `useSession.ts`'s manual `togglePause` and its
  interruption-recovery resume path). Test-first per this project's
  correctness-critical rule for pause/resume math: 6 new tests written
  first and confirmed failing, then fixed. 132/132 tests pass,
  lint/typecheck clean.
- 2026-08-25: Settings/Punches changes now reach an already-running
  session live, not just the next one -- the user's disabled-punch test
  ("everything except jab, still called out others") traced back to
  `useSession.ts` reading settings/punches/presets once at mount and
  never again, a stale leftover from before Settings/Punches existed.
  Chose the fully-live option (including voice) over two more
  conservative ones when asked. `useSession.ts` now re-reads from
  storage every 200ms tick and applies volume/rate live; `ttsVoice`
  changes rebuild the native speech engine (new engine built and
  confirmed working before the old one is closed, so a failed switch
  can't leave playback broken). Round structure (rounds/durations) stays
  snapshotted per session once started -- retroactively resizing a live
  round wasn't asked for and risks undefined timer states -- but that
  snapshot is now taken fresh at `start()` instead of frozen at app
  launch forever, which was a separate bug this touched in passing.
  Untested by design, matching this hook's existing native-wiring
  precedent (the pure logic it calls already has full coverage).
  132/132 tests pass, lint/typecheck clean.
- 2026-08-25: Fixed a regression from the live-settings change above --
  the user reported total audio silence, then (after a full reload)
  unresponsive Work/Rest/Warmup wheel pickers on the Settings screen.
  Root cause: polling storage every 200ms tick and calling `setSettings`
  unconditionally with the fresh (always-new-object-reference) result
  forced Main Timer to re-render 5x/sec for the app's entire lifetime --
  including while idle and while the Settings screen had focus, since
  Main Timer stays mounted underneath it -- which starved the JS thread
  enough to make the pure-JS scroll wheels unresponsive. Replaced the
  poll loop with `useFocusEffect` (the same pattern
  `app/settings/index.tsx` already uses for its own re-sync): settings
  can only change via navigating to Settings/Punches and back, which is
  exactly a focus transition, so this loses no coverage while doing zero
  background work the rest of the time. `useSession.ts`'s tick loop now
  reads settings/punches/presets from refs updated only on focus, not
  from polled state. 132/132 tests pass, lint/typecheck clean.
- 2026-08-25: Closed 2 of the 3 audit findings deferred from the native
  `/impeccable audit` pass. `predictiveBackGestureEnabled` flipped
  `false` -> `true` in `app.json` -- checked first (per the audit's own
  flag that disabling a system gesture might have a real reason behind
  it) and confirmed via Expo's versioned SDK 57 docs that `false` is
  just Expo's own scaffold default, not a project-specific decision;
  nothing in this app's navigation avoids it. `supportsTablet` flipped
  `true` -> `false` -- the finding was that it claimed tablet support
  with zero actual size-class handling in any screen; the honest fix is
  matching the declaration to reality, not retrofitting tablet layouts
  onto a portrait-locked phone timer app. Countdown ring gained a real
  `accessibilityLabel` (`CountdownRing.tsx`) -- the ring/numeral were
  previously either unlabeled or read digit-by-digit ("2:49"); now the
  whole ring is one `accessible` unit announcing e.g. "2 minutes 49
  seconds remaining". `bell.wav` sourcing (the third open item) is
  separate -- see the next entry. 132/132 tests pass, lint/typecheck
  clean.
- 2026-08-25: `bell.wav` is real audio at last -- closes Phase 4a's
  original audio-sourcing gap. User downloaded Mateusz_Chenc's CC0
  "Boxing Bell Signals" from Freesound, but the raw file is a 32.8s
  compilation of 5 separate bell-strike signals concatenated together
  (confirmed via RMS envelope peak-picking), not a single usable cue --
  dropping it in as-is would have played all 5 through every phase
  transition. Trimmed to just the first strike plus its full natural
  decay tail (0-4.0s, decays below audible by ~3.4s) and wrote that as
  `assets/audio/bell.wav`, 44.1kHz/stereo/16-bit, healthy amplitude
  (~0.6 peak, not clipped). Raw source file left in place
  (`520998__mateusz_chenc__boxing-bell-signals.wav`) in case a different
  one of its other 4 signals is wanted later. Needs the user's own ears
  to confirm it actually sounds right on a real device -- same standing
  verification gap as every other sourced audio asset.
- 2026-08-25: Fixed the bell not ringing at Round 1's start -- a real,
  longstanding gap the user caught by ear immediately after finally
  getting a real bell.wav in place, not a regression from anything
  touched today. `startTimer()` computes the very first `TimerState`
  directly rather than deriving it from `tick()` (there's no prior state
  to transition *from* yet), so it never produced a `TimerEvent` --
  every later phase change fires one via the tick loop and rings the
  bell correctly, but the first one never did, silently, whenever warmup
  is off (the default: `warmupDurationSec: 0`). `useSession.ts`'s
  `start()` now fires the same `"phase-changed"` event `tick()` would
  have for that initial state, so `audioEngineRef`'s existing
  `handleTimerEvent`/`mapEventToCue` mapping (bell on work/rest, nothing
  on warmup/ready/finished) applies uniformly instead of needing special
  first-round logic. 132/132 tests pass, lint/typecheck clean.
- 2026-08-25: Closed Phase 8's close step -- ran a real `/impeccable
  critique` (dual-agent: independent design review + detector/evidence
  pass, screenshots captured directly from a running emulator via adb)
  against the whole app, scoring 30/40, then a full `/impeccable polish`
  pass fixing everything it found:
  - **`accentDim` failed WCAG's 3:1 UI-contrast minimum in all three
    themes** (computed, not estimated) everywhere it carried real
    meaning -- the wheel-picker selection border, active-chip
    differentiator, combo-card separator. Raised in `tokens.ts`
    (system/dark/light all now clear 3:1+ against both `background` and
    `panel`). `danger`-on-`panel` also fixed (was failing 4.5:1 text
    contrast in system/dark).
  - **Preset deletion had no undo or confirmation**, unlike Punches'
    own 5s Undo banner -- added the identical pattern
    (`restorePreset()`, reusing `UndoBanner.tsx`).
  - **A real nested-VirtualizedList bug was visibly breaking the
    Settings screen** -- `react-native-wheely` (FlatList-based) nested
    inside Settings' own ScrollView. Removed the dependency entirely;
    `WheelPicker.tsx` now implements its own scroll/snap/fade logic on
    Reanimated's `Animated.ScrollView`, matching this codebase's existing
    Reanimated usage. Two real bugs were caught and fixed only by
    swiping the rebuilt picker on a real device in both directions
    (typecheck/lint/tests all stayed green through both): a z-index
    inversion that hid the selected value, and a `contentOffset` prop
    fighting the scroll state on every re-render, silently breaking
    scroll-down specifically while scroll-up worked by coincidence.
  - **`CountdownRing` was hardcoded at 260dp**, undershooting
    `docs/design-direction.md`'s own ~40-50%-of-vertical-space target
    (measured ~28% on a typical device) -- now derived from
    `useWindowDimensions()`, clamped by width so it can't overflow on a
    narrow device. Confirmed visibly larger/more dominant on-device.
  - **Punches list rendered unsorted** (num 1/"jab" buried at the
    bottom) and a user-typed custom name stayed lowercase next to
    Title Case defaults -- sorted by `num` for display, and
    `createPunch`/`renamePunch` now capitalize each word on save.
  - Minor observations also addressed: 4 touch targets under the 44/48pt
    minimum (`SegmentedControl`, two chip components, punch-number
    inputs), an overlapping-`hitSlop` mis-tap risk between Preset
    Editor's move-up/down/remove buttons, and missing
    `accessibilityLabel`s on 2 `Switch` controls plus the app's two most-
    used custom inputs (`WheelPicker`, `LabeledSlider` -- the latter via
    a proper `accessibilityRole="adjustable"` + increment/decrement
    pattern for the wheel, matching how `@react-native-community/slider`
    itself handles this). Deliberately deferred: swapping unicode-glyph
    icons (⚙▶✕· etc.) for a real icon system -- a new dependency is a
    bigger decision than a polish-pass minor fix, flagged as a follow-up
    rather than installed unprompted.
  136/136 tests pass, lint/typecheck clean. Full critique persisted at
  `.impeccable/critique/2026-08-25T01-26-46Z__cornerman-app-main-timer-
  settings-stack.md`.
- 2026-08-25: Closed 6a's outstanding "genuine visual confirmation" gap
  and 7b's onboarding audit gap, now that a real emulator is available
  for deliberate verification rather than ad hoc troubleshooting.
  Captured and reviewed real screenshots of all four Main Timer phase
  states (Ready, Work, Rest, Finished) and the Onboarding intro screen --
  Rest and Finished had never actually been seen before this. Along the
  way, found and fixed a second real `WheelPicker` bug: Settings'
  Round/Work/Rest wheels displayed the *first* list item (e.g.
  "Rounds: 1") on load regardless of the actual stored value (e.g. `9`),
  reproduced on repeated genuinely-fresh (force-stopped, not
  Fast-Refreshed) launches. Root cause: the mount-time `scrollTo` call
  was racing the native `ScrollView`'s own first layout pass and losing
  silently, with no retry. Fixed by adding a `contentOffset` prop for
  the initial position, frozen via `useState`'s lazy initializer so it's
  computed once and never refought against the user's own later
  scrolling (the exact bug this component already fixed once before).
  Verified fixed via before/after screenshots on fresh relaunches. See
  `PROJECT_FACTS.md` for the full trace and the durable lesson about
  `scrollTo` vs `contentOffset` on this codebase's Reanimated
  `ScrollView`s. 136/136 tests pass, lint/typecheck clean.
- 2026-08-25: Two more real bugs the user found by ear/eye on-device,
  both fixed:
  - **The 10-second work-warning clapper fired at the very start of any
    work round 10 seconds or shorter**, instead of only ever meaning
    "10 seconds left." `tick()`'s warning check had no lower bound on
    the round's own length, so for e.g. a 5-second work round the
    "10 seconds remaining" threshold was already crossed the instant
    the round began. Fixed by only arming the warning at all when
    `config.workDurationMs > 10_000` -- test-first, 3 new tests
    (never fires for an exactly-10s or shorter round; still fires
    normally just above the threshold).
  - **Warmup silently never took effect, no matter what value was set
    for it** -- the actual root cause of "warmup doesn't appear."
    Traced to a second, subtler version of the exact `WheelPicker` bug
    fixed earlier the same day: the `contentOffset` prop added as that
    fix's initial-position mechanism was a fresh `{x, y}` object literal
    on every render, and RN was re-applying it as a fresh repositioning
    command on any re-render of the row -- e.g. a sibling wheel's
    `onChange` updating shared `settings` state re-rendered every
    `WheelPicker` in that section, fighting/aborting the Warmup wheel's
    own in-progress or just-completed drag before it could commit.
    Fixed by memoizing the `contentOffset` object itself (`useMemo`),
    not just the numeric value inside it. Verified end-to-end on a real
    device: set Warmup via the wheel, confirmed it survived navigating
    away and back *and* a full app force-stop + cold relaunch (genuine
    disk persistence, not just in-memory state), then pressed Start and
    watched the "WARMUP" phase badge actually appear and count down --
    closing the loop the user reported broken. 139/139 tests pass,
    lint/typecheck clean.
- 2026-08-26: Sub-phase 10a -- `WorkoutTemplate`/`RoundConfig`/`BoxingConfig`
  data model + MMKV storage (`src/features/workoutTemplates/`), per
  `ARCHITECTURE.md`'s Phase 10+ entities. `resolveRoundCombo` resolves a
  round's `comboSource` (fixed-punch / fixed-sequence / preset / random)
  to a `Combo` by calling `comboEngine`'s existing exported functions
  rather than duplicating their logic -- kept as a sibling feature, same
  pattern `defenseCues` already used to stay out of `comboEngine` itself.
  Three built-in templates (Relax/Zone-2, Moderate, Intense) seed into
  storage on first read, same as `getPunches`' default-seeding pattern;
  the fourth built-in (Assault Bike Cognitive) is deferred to Phase 11a,
  which is where `AssaultBikeConfig` actually gets built. No Undo/restore
  for templates yet -- unlike Punches/Presets, there's no delete UI yet
  to generate that need. Test-first (correctness-adjacent, extends
  already-tested combo generation, per `ROADMAP.md`'s own note for this
  sub-phase); 11 new tests, 150/150 total, lint/typecheck clean.
- 2026-08-26: Sub-phase 10b -- Templates Picker screen (`src/app/templates/`),
  reached directly from Main Timer (new `TemplatesButton` next to the
  Settings gear), per docs/user-flows.md Flow 6. Lists the Phase 10a
  built-in templates with name/BUILT-IN tag/summary and an Edit icon;
  tap-to-start and Edit are deliberately stubbed to an info banner --
  Round Builder (10c) and wiring the timer engine to a roundPlan (10d)
  don't exist yet, so pretending either action does something real would
  be worse than an honest "coming soon", same precedent the Settings gear
  itself used in Phase 6. Judgment/presentation, no new tests; 150/150
  tests still pass, lint/typecheck clean. Visually confirmed on the
  Android emulator.
- 2026-08-26: 9a closed out -- EAS Android build pipeline fully verified.
  Second cloud build succeeded after the lockfile-drift fix (PR #22); the
  built APK was downloaded and sideloaded onto the Android emulator
  (after uninstalling a differently-signed local dev-client build first --
  `INSTALL_FAILED_UPDATE_INCOMPATIBLE`), confirmed to install and launch
  correctly, Onboarding rendering in the real dark/orange theme on a
  genuinely fresh install. iOS is explicitly deferred (Apple Developer
  Program cost), confirmed with the user -- Android-only for now.
- 2026-08-26: Sub-phase 10c -- Round Builder / Template Editor screen
  (`src/app/templates/[id].tsx`), mirroring Preset Editor's own
  create/edit pattern (`id === "new"` sentinel, explicit Save). Name +
  base pace at the top; an inline scrollable list of expandable
  `RoundCard`s below (add/reorder/remove/edit in place, per
  docs/user-flows.md Flow 6 -- never a per-round sub-screen). Each round
  gets independently-toggleable work/rest and combo-gap overrides plus a
  comboSource editor (random/fixed-punch/fixed-sequence/preset), reusing
  Preset Editor's own sequence-builder components as-is rather than
  duplicating them. The Templates Picker's "+ New Template" and Edit icon
  now route here for real; tap-to-start stays stubbed until 10d wires the
  timer engine to a roundPlan. Judgment/presentation, no new tests;
  150/150 tests still pass, lint/typecheck clean. Visually confirmed
  end-to-end on the Android emulator -- built and saved a real custom
  template and confirmed it lists correctly afterward.
- 2026-08-26: Sub-phase 10d -- wired the timer/combo engines to actually
  run a WorkoutTemplate's roundPlan, closing out Phase 10 (Workout
  Templates). Correctness-critical, test-first, 15 new tests:
  `timer/service.ts` gained an optional, purely-additive
  `roundOverrides` on `TimerConfig` plus
  `effectiveWorkDurationMs`/`effectiveRestDurationMs` (also fixed the
  10-second work-warning check, which had the same "reads the base
  duration instead of the round's actual one" bug already fixed once
  this session for short rounds); `session/service.ts`'s `sessionTick`
  gained an optional `ActiveTemplateSession` that, when present, routes
  combo generation through `resolveRoundCombo` for the current round
  instead of Settings-driven `generateCombo`; `workoutTemplates/service.ts`
  gained `toTimerConfig(BoxingConfig)`. `useSession.ts`'s `start()` now
  optionally takes a `WorkoutTemplate`; fixed a real latent display bug
  along the way (Main Timer was reading `settings.rounds`/
  `settings.*DurationSec` directly, which would show the wrong round
  count/ring duration for any template session) and a real footgun before
  it shipped (`ControlRow`'s Start button passes a `GestureResponderEvent`
  through `onPress`, which would have landed positionally as `start`'s
  new template argument -- the call site now wraps it). Templates
  Picker's tap-to-start is real now, via a small transient signal
  (`workoutTemplates/pendingStart.ts`) consumed on focus by the
  already-mounted Main Timer. 165/165 tests, lint/typecheck clean.
  Visually confirmed end-to-end on the Android emulator: a single-round
  "fixed-punch: Jab" test template correctly showed ROUND 1/1, skipped
  straight to Work (0 warmup), and called "JAB" repeatedly -- never
  falling back to random generation.
- 2026-08-26: Sub-phase 11a -- AssaultBikeConfig data model + built-in
  template. WorkoutTemplate widened from its Phase 10-only boxing shape
  to the real discriminated union ARCHITECTURE.md always specified;
  dropped the architecture doc's flat `restSec` field as redundant with
  `restPhases`' own three sub-durations. The fourth built-in ("Assault
  Bike Cognitive") seeds with real, spec-sourced figures from
  docs/user-flows.md Flow 7 (10s work, 8+30+12=50s rest). Widening the
  union surfaced and fixed a real bug via the type checker:
  `updateWorkoutTemplate` blindly merged a BoxingConfig into whatever
  template matched by id, which would have corrupted the assault-bike
  entry if ever called with its id -- now guarded, with a regression
  test. Templates Picker renders the assault-bike row visibly disabled
  with a "COMING SOON" tag rather than routing to the boxing-only Round
  Builder (which would crash on AssaultBikeConfig); Round Builder and
  useSession.start() both narrow to boxing-only too, the latter as a
  compile-time guarantee via `Extract<WorkoutTemplate, {workoutType:
  "boxing"}>`. 167/167 tests, lint/typecheck clean. Visually confirmed
  on the Android emulator.
- 2026-08-26: Sub-phases 11b+11c -- Assault-Bike Session screen + the
  Odd-One-Out visual drill. New `src/features/assaultBike/` state machine
  (test-first, 9 tests), deliberately not built on the boxing timer engine
  -- every round, including the last, runs its full Settle/Drill/Reset
  cycle before finishing, unlike boxing's skip-the-trailing-rest shortcut.
  New `src/app/assault-bike.tsx` screen reuses RoundCounter/PhaseBadge/
  CountdownRing/AudioErrorBanner as-is; generalized `ControlRow` away
  from hardcoded boxing phase-name checks (which would have hidden Pause
  during Settle/Drill/Reset -- a real bug caught before shipping) to
  explicit show/hide booleans the caller computes. New
  `src/features/oddOneOut/` (test-first, 5 tests) plus the tappable grid
  and live HIT/MISS + reaction-time feedback components; a continuous
  stream of trials runs for the whole Drill window, matching a real Brain
  Endurance Training drill rather than one static puzzle. Templates
  Picker's Assault Bike Cognitive row can now actually be started (Edit
  stays disabled -- still no assault-bike editor). 181/181 tests,
  lint/typecheck clean. Visually confirmed on the Android emulator: full
  phase cycle observed directly, drill grid rendering at the correct
  size with the odd tile visible; also caught and fixed a real bug this
  way (the screen initially rendered under the status bar -- a copied
  SafeAreaView edges prop from a screen with a header, without actually
  turning this screen's own header on). The live HIT/MISS overlay itself
  wasn't separately screenshotted (touch-input lag in this environment
  made timing a tap unreliable across several attempts) -- its logic is
  fully covered by unit tests instead.
- 2026-08-26: Sub-phase 11d -- Corner Commands auditory drill, closing out
  Phase 11 (Assault-Bike Cognitive Protocol) entirely. A real scope
  discovery changed this sub-phase's shape before any code was written:
  defenseCues' existing bundled vocabulary (roll/slip/duck/pivot/check/
  clinch, built for Phase 5d's boxing defense cues) turned out to already
  be exactly the word set this drill needed, so 11d reuses it directly --
  zero new voice-bank generation. Confirmed with the user before building:
  this drill is purely audio-paced, no tap -- the app has no way to see a
  physical shadow-boxing response, so it speaks commands at a
  difficulty-scaled gap and shows the word as text, full stop; "reaction
  time shown live" applies to the visual drill (11c) only. New
  `src/features/cornerCommands/` (test-first, 4 tests) -- the one
  genuinely new piece of logic is a difficulty-scaled gap lookup over the
  same `nextGapFireTime` primitive already shared by combo timing and
  defenseCues itself. New `useCornerCommandsDrill` hook owns its own
  short-lived SpeechEngine, same pattern `previewEngine.ts` already
  established. `assault-bike.tsx` now branches Drill-phase rendering on
  `config.drillMode`. Small cleanup alongside the build: centralized
  `Difficulty` as a named export on `workoutTemplates/types.ts` instead
  of `oddOneOut` owning its own copy. 185/185 tests, lint/typecheck
  clean. Visually confirmed on the Android emulator (temporarily flipped
  the built-in's drillMode to auditory, verified, reverted before
  committing) -- Drill phase correctly showed a real spoken command
  ("DUCK") as text, no errors.
- 2026-08-26: Phase 12 -- the assault bike gets its four real protocols,
  scored drills, and a corrected auditory drill. Four sub-phases, one PR.
  - **12a:** replaced the single generic "Assault Bike Cognitive"
    built-in with the four energy-system protocols from the user's own
    reference table (Aerobic Power, Lactic Capacity, Alactic Power,
    Combat Effort). `BikeRest`/`RestPlan` became discriminated unions so
    Lactic Capacity (20s all-out / 10s easy spin) runs a real
    `work -> rest -> work` cycle instead of faking a drill cycle with
    three zeroed sub-phases -- 10s can't fit "phone up, drill, phone
    down". `DrillMode` and `DrillType` collapsed into one field.
    **Corner Commands (11d) deleted** -- calling defensive movements
    aloud assumed the rider would perform them, which means dismounting
    and remounting mid-rest; confirmed unworkable by the user.
  - **12b:** trials now have a deadline that shrinks over the session
    (start -> floor across 15 trials, then holds), so a timeout is a real
    miss rather than a puzzle waiting forever. Points are speed-weighted
    so `score` isn't just hit count restated. The reported average
    reaction covers hits only -- a timeout's "reaction" is the window
    length and a wrong tap measures how fast you were wrong, so
    averaging either in would make a worse session look faster. Stats
    moved up into `useDrillRun` (in `assaultBike/`) because the drill
    deactivates every round and a drill-owned hook would reset the tally
    12 times a session. New end-of-session summary card.
  - **12c:** new Color Call drill -- a multi-colour grid with one colour
    named aloud, tap the one you heard. Voice-only; printing the colour
    name would turn colour recognition into reading. 12 new voice clips
    (6 colours x 2 voices) via the existing Kokoro script, which gained a
    filename filter first so adding words doesn't regenerate the 33
    working clips. New `DrillModePicker` on the pre-start screen, since
    with no bike template editor there was otherwise no way to reach
    Color Call at all.
  - **12d:** Settle/Reset relabelled **"PHONE UP"/"PHONE DOWN"** -- they
    bracket a drill that needs the phone in hand, and "SETTLE" told a
    rider nothing about that. `docs/user-flows.md` Flow 7 and
    `ARCHITECTURE.md`'s `AssaultBikeConfig` entry rewritten to match
    what shipped, including corrected persistence wording: a live score
    and summary card now exist, but they're in-memory only -- no storage
    write, no backend, gone when the screen unmounts.
  - Engine, scoring and Color Call logic all written test-first (11, 18
    and 12 failing assertions observed before implementation
    respectively). 217/217 tests, lint/typecheck clean.
- 2026-08-26: Phase 12 follow-ups found by actually running it, not by
  reading it.
  - **Stored-shape migration.** `getWorkoutTemplates` returned stored
    rows unmigrated, so any install that had run a Phase 11 build still
    held bike templates in the old `restPhases` shape -- `toBikeConfig`
    would have read a `rest` field that wasn't there and broken the
    session screen on launch. `migrateStoredTemplates` now drops stale
    bike rows and re-seeds the four protocols, leaving boxing templates
    (custom ones included) untouched, and is idempotent so it can't
    append a duplicate set on every read. Written test-first (5 red),
    then confirmed live on the emulator: the stale Phase 11 row was gone
    and all four protocols appeared with correct figures.
  - **`timeoutOutcome` extracted and pinned by tests.** A live run showed
    the score climbing with no taps sent. Screenshots couldn't separate a
    real bug from this machine's known delayed-tap delivery (the same run
    also restarted a session from a tap issued two minutes earlier), so
    the rule "an untouched trial can never score" is now a named function
    with its own tests rather than a literal buried in an effect
    callback. Behaviour unchanged; the guarantee is now checkable.
- 2026-08-26: Audio fixes for two bugs reported from real use -- voices
  sometimes echoing, and the bell arriving late in later rounds. They
  shared a root cause: **nothing ever stopped or disconnected an audio
  source node.**
  - **Echo.** Combos were scheduled on the AudioContext clock with no
    regard for whether the previous one had finished. Settings allows a
    combo gap down to 1s and the "Intense" built-in uses exactly that,
    while a 3-4 punch combo takes ~4s to speak -- so the next combo
    started underneath the previous one. `SpeechEngine` now replaces
    rather than layers: `playWord`/`playCombo` stop what's sounding
    first, and a generation counter abandons an in-flight combo's
    remaining words instead of scheduling them behind the new one (they
    decode asynchronously between words, so stopping current sources
    alone wouldn't catch them). `stop()` is now part of the interface;
    the Color Call drill calls it when a Drill phase ends so a colour
    called at the buzzer doesn't talk over the phase-change bell.
  - **Bell latency.** Source nodes were created, connected and started,
    then never disconnected -- so every bell, clap, tick and spoken word
    left another finished node wired into the output bus for the life of
    the context. Roughly 130 of them accumulate over a 12-round Color
    Call session, and the graph the engine re-renders grew with all of
    them. Sources now self-release via `onEnded`.
  - **A leaked engine per visit.** `AudioEngine` had no `close()` at all,
    and `useBikeSession` never released the one it built -- so every trip
    to the Assault-Bike screen leaked a whole native AudioContext plus its
    decoded cue buffers, for the rest of the process. `close()` added and
    called on unmount, mirroring `SpeechEngine.close`.
  - Cues deliberately still layer with each other: a bell landing over a
    still-ringing clapper is real, and the limiter exists for it. Only
    speech replaces.
  - 11 new tests covering all of it (237/237 total), lint/typecheck clean.
    Smoke-tested on the emulator -- audio focus granted and released
    cleanly, no AudioAPI errors. **The audible result is not verified**;
    that needs a real ear on a real device.
- 2026-08-27: Onboarding gained an orientation tour — three swipeable
  cards covering workout templates, the assault-bike drills, and your own
  punches, each with a small SVG sketch drawn from the app's own motifs
  (the round list, the Odd One Out grid, numbered punch chips) rather than
  screenshots, which go stale the moment a screen changes and would have
  to be captured twice for the light palette.
  - **It runs last, after the permission steps.** The existing intro card
    exists to justify the system dialog it triggers, so putting three
    feature cards between the two would separate the reason from the ask;
    ending on the tour also means the last thing seen before landing is
    what the app does.
  - **Replayable from Settings → Help → "How Cornerman works"**
    (`/settings/tour`, under the Settings stack so it inherits the themed
    header and back arrow). Onboarding runs exactly once ever, so without
    this everything the tour says would be unreachable after the first
    thirty seconds of use — which is precisely when it stops being
    memorable. Skippable from any card in onboarding; no skip on the
    replay, where the back arrow already leaves.
  - Deliberately an orientation, not a manual — the standing UX rule is
    that the app should be usable without one. It covers the three things
    a user would otherwise have to go hunting for and leaves voice, speed,
    gap and announce style to be found when wanted.
  - Two fixes from seeing it on a device: the punch chips laid out from a
    single left-anchored cursor, leaving short rows hanging off one side
    of an otherwise centred card (they now wrap into rows that are each
    centred), and two of the three titles wrapped onto a second line
    carrying one orphaned word at 28px.
  - Presentation work, but the Settings→tour route got a test anyway: it
    is the only path back to the tour, so nothing else in the app would
    reveal it breaking. Its own file, per the documented `renderRouter`
    cross-test interference. 277/277 tests, lint/typecheck clean.
- 2026-08-27: The combo gap became throwing time, and the boxing templates
  got real programming. Three findings from one report -- "I couldn't keep
  up on the sheer quantity of combos even in easy".
  - **The call-out was eating the gap.** `sessionTick` armed the next combo
    from the instant the current one *started* being spoken. Measured from
    the committed voice bank (0.73s mean per word, plus the engine's own
    0.12s inter-word gap), a four-punch combo takes ~3.3s to say -- so a
    3-5s gap left barely a second to actually throw it, and the old
    "Intense" 1-2s gap was shorter than the combo itself, the same overlap
    behind the Phase 12 echo. It now arms from when the call-out ends. The
    estimate (`lib/speechTiming.ts`) is deliberate over feeding back the
    engine's real completion time: that is unknowable ahead of time for a
    custom name falling through to on-device TTS, and would move timing
    into the untested consumer where a combo that never reports completion
    would stall the round. Test-first, 10 red first.
  - **The built-ins called random punches.** All three boxing templates
    gave every round a bare `{type: "random"}` source, so a "Moderate"
    session was unstructured random punches rather than the programming it
    was named after. Replaced by six templates carrying `bagwork.md`'s
    real round-by-round plans -- Easy/Moderate/Intense, each as
    punches-only and punches + kicks, the kick rounds being the only
    difference within a pair. Rounds are 2 min / 60s rest per bagwork's
    own header; the previous 180s came from nowhere. Gaps are 8-12 / 6-9 /
    4-6s, above bagwork's own rest-between-bursts figures on purpose --
    that density proved unthrowable in practice, and tightening one is a
    slider on the template.
  - **Expressing those rounds needed a new `ComboSource`.** bagwork rounds
    name several combos each (Moderate R3 is both `1-2b-3` and `2-3b-2`),
    which nothing existing could hold: `fixed-sequence` is one combo
    forever, `preset` is the same thing behind an id, `random` discards the
    structure. New `combo-pool` draws one whole combo per call-out; a pool
    of one is the rep-to-reflex case Easy's rounds ask for. Editable in the
    Round Builder, and switching a fixed-sequence round to it carries the
    existing sequence over rather than discarding it.
  - **The kicks existed in the voice bank but not in the punch list**, so
    those templates would have announced "punch fourteen". Seeded as
    punches 8-21 (Body Jab/Body Cross plus the 12 kicks), with the random
    pool now defaulting to the punches only -- a boxing quick-start
    shouldn't start calling head kicks just because they exist. Existing
    installs get a one-time backfill that pins a still-`null` pool to what
    they already had, tracked by its own storage key rather than by
    comparing against the defaults, which would resurrect a deleted punch
    on every read forever. A punch created later still joins a restricted
    pool, so only the seeded kicks start out excluded.
  - **The round's focus now shows on screen** (`RoundFocus`). Round-by-round
    focus is the whole point of a workout template, but the label and
    coaching note only ever existed in the Round Builder -- a running
    session never said which round you were in. Nothing renders for a
    Settings-driven quick-start, which has no round plan.
  - `bagwork.md`'s "lead-leg flick" has no clip of its own, so those rounds
    call a Lead Low Kick and carry the flick mechanic in the round note.
  - 276/276 tests, lint/typecheck clean.
- 2026-08-26: Assault-Bike drill picker gained a third choice, **None** --
  alongside Odd One Out and Color Call, for a straight rest with no
  cognitive drill on any protocol that has one. `withoutDrill()`
  collapses a session's Settle/Drill/Reset into the same plain
  `work -> rest -> work` cycle Lactic Capacity already runs, at the exact
  same total duration -- so choosing None never changes how long the
  workout takes, and the state machine simply can't enter "drill" that
  session (no "PHONE UP" for a phone the rider doesn't need). New
  `DrillChoice = DrillMode | "none"` type, distinct from a protocol
  structurally having no drill at all. Engine change written test-first
  (5 red). 242/242 tests, lint/typecheck clean.
