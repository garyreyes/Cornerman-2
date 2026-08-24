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
