# Project Facts

Durable, project-specific decisions that should survive across sessions
without being re-explained. Most current decisions live in `docs/PRD.md`
and `ARCHITECTURE.md` (the source-of-truth documents) — this file is for
facts that don't fit neatly into either, appended to as real decisions get
made during feature work.

- `appId`/bundle identifier `com.gary.cornerman` is confirmed to continue
  the existing Play Store listing from the old app — not a fresh listing.
- No Apple Developer Program account exists yet; iOS App Store submission
  is explicitly out of scope until one is obtained.
- Scaffolded with `create-expo-app`'s `blank-typescript` template on Expo
  SDK 57 / React Native 0.86 / React 19 — chosen because `app-architect`
  locked in EAS/dev-client build (not Expo Go) for real background-audio
  support.
- Default seeded punches (first launch): standard orthodox 1-6 — 1 Jab,
  2 Cross, 3 Left Hook, 4 Right Hook, 5 Left Uppercut, 6 Right Uppercut.
- Default Settings: 10 rounds, 180s work / 60s rest, 0s warmup, 1.5-3s
  combo gap, 2-4 punch combo length, no punch-pool restriction (draws
  from all current punches), 1.0x speech rate, full app volume, no
  active preset.
- Combo length (how many punches per Random-mode combo) and which
  punches are eligible to be drawn are both user-customizable settings
  (`comboLengthMin`/`Max`, `randomPunchPool`) — confirmed explicitly,
  not left as a fixed engine constant.
- **Native modules with no JS-only fallback silently no-op under
  `jest-expo`, they don't throw.** `expo-crypto`'s `randomUUID()`
  returned `undefined` in tests with no error — traced only because a
  test asserted two generated IDs differ. Any future native module used
  in testable logic needs the same check: verify it actually returns
  real values under Jest, don't assume jest-expo's default mocking
  covers it. Fixed here with manual mocks: `__mocks__/expo-crypto.ts`
  (delegates to Node's real `crypto.randomUUID`) and
  `__mocks__/react-native-mmkv.ts` (in-memory fake — `react-native-mmkv`
  v4 is a Nitro module with no native binding available under Jest at
  all). Both are auto-applied by Jest for node_modules packages with no
  `jest.mock()` call needed.
- Deferred (from the assault-bike-cognitive-HIIT template discussion,
  2026-08-23): per-round stats/history tracking (bike watts/RPM, drill
  accuracy/reaction time) stays out of v1 per the PRD's existing
  history/stats decision — the protocol itself is in-scope to plan, the
  tracking/analytics layer is not, until revisited explicitly.
- **`react-native-audio-api` (installed v0.13.3) has no
  `DynamicsCompressorNode`** — confirmed against the library's own
  README roadmap, which lists it under "Planned/Coming in x.x.x," not
  shipped. `ARCHITECTURE.md`'s stated plan to carry the old app's
  `masterGain → DynamicsCompressor → destination` bus over "directly"
  (extraction doc §1.11) doesn't hold for this library version. Built
  4a's bus as `appVolume GainNode → fixed makeup-gain GainNode →
  WaveShaperNode (tanh soft-clip curve) → destination` instead — the
  WaveShaper prevents hard digital clipping when cues overlap, serving
  the same protective purpose as the old compressor without matching
  its attack/release/threshold/ratio behavior. If the library ships a
  real compressor node later, swapping it in for the WaveShaper is a
  reasonable revisit.
- **Bell/clapper/countdown-tick audio assets are unsourced as of 4a** —
  `assets/audio/*.wav` are silent generated placeholders so the engine
  has something real to decode, not final assets. Sourcing real
  licensed samples (Freesound CC0 first, AudioJungle fallback) requires
  listening and judging "does this sound authentic," which isn't
  something I can do from here — tracked as a manual task in
  `assets/audio/SOURCING.md` with exact specs and search terms per
  asset. The makeup-gain value in `src/features/audio/service.ts` is
  also a neutral placeholder (not the old app's tuned 2.6x, which was
  calibrated for synthesized tones) pending a real by-ear pass once
  real assets + a device are in hand.
- The rest-phase 3-2-1 countdown is a **tone/beep** (built in 4a),
  confirmed explicitly over spoken numbers — spoken numbers would have
  required Phase 5's speech pipeline to exist first and block 4a on it.
- `react-native-audio-api` ships its own official Jest mock at the
  `react-native-audio-api/mock` subpath (real class behavior, no native
  binding) — reused directly via `__mocks__/react-native-audio-api.ts`
  rather than hand-rolled, unlike the `react-native-mmkv`/`expo-crypto`
  mocks which needed a from-scratch fake.
- **Default punches are lead/rear-named, not left/right, as of 5a
  (2026-08-24)**: Jab, Cross, Lead Hook, Rear Hook, Lead Uppercut, Rear
  Uppercut, Body Hook (`num: 7`, deliberately not interleaved into 1-6
  so the traditional boxing numbering stays intact for the number
  announce-style). Reason: a user switching stance mid-session
  (orthodox/southpaw) makes "Right Hook" ambiguous — it's a different
  physical punch depending on stance — while "Rear Hook" is always
  correct. `num` still isn't required to be unique (extraction doc
  §1.6), so a user can already remap/duplicate numbers however they
  want; renamed defaults are just a better starting point, not a new
  constraint.
- **The app expanded from boxing-only to boxing/kickboxing scope as of
  5a** (`docs/PRD.md` §10) — 12 kicks and 2 extra body-punch variants
  (Body Jab, Body Cross) are in the bundled voice bank, but **not**
  auto-seeded into a fresh install's active punch pool; a user adds them
  via the existing Punches screen if wanted, at which point the name
  resolves to a bundled clip instead of on-device TTS. Confirmed
  decision, not scope creep left unstated.
- **This environment has no Python installed at all** (no `python`,
  `python3`, or `pip` — only the Windows Store alias stub) — confirmed
  while building 5a. `scripts/generate_voice_bank.py` (Kokoro TTS) is
  written but never executed here; it needs to be run on a machine with
  a real Python install, same shape as Phase 4a's audio-asset-sourcing
  gap. Its Kokoro API calls (`KPipeline`, `am_fenrir` voice) are written
  from training-data knowledge, not verified against a live run or
  current docs — check them if generation fails.
- **`VoiceClip` is keyed by normalized text, not `Punch.id`** (revised
  from the original design in `ARCHITECTURE.md` during 5a) — numbers and
  defense/movement words need clips with no owning `Punch`, so
  `src/features/speech/service.ts`'s `normalizeToKey` is the actual
  lookup key everywhere (e.g. "Lead Hook" → `lead_hook`). Only
  `"tts-generated"` clips need real MMKV persistence (Phase 5c, not yet
  built) — `"bundled"` clips are a static compile-time asset map, same
  non-persisted pattern as `SoundAsset`.
- **Defensive/movement call-outs (Phase 5d, not yet built) are a fixed
  6-word set, not user-editable in v1** — same pattern as the bell/
  clapper `SoundAsset`s, not a new CRUD feature parallel to Punches.
  Stated assumption during 5a's planning, not explicitly confirmed by
  the user — revisit if customizable defense cues turn out to matter.
- **Speech rate range is 0.25x-4x, not the originally-discussed 0.25x-5x
  (confirmed 2026-08-24, Phase 5b).** `react-native-audio-api` has a
  real native WSOLA pitch-preserving time-stretch built in
  (`createBufferSource({pitchCorrection: true})` + the `playbackRate`
  `AudioParam`) — this resolves what `docs/PRD.md` calls the project's
  one genuinely unsolved technical requirement, with no hand-rolled DSP
  needed. But its C++ core hard-caps `playbackRate` at a fixed constant
  (`WsolaTimeStretcher::MAX_PLAYBACK_RATE = 4`,
  `common/cpp/audioapi/dsp/WsolaTimeStretcher.h`), enforced via
  `std::clamp` at the native layer — not adjustable from JS. User
  explicitly chose to revise the spec down to 0.25x-4x rather than build
  a workaround (e.g. a second pre-time-compressed buffer per clip for
  the 4x-5x band, switched in above the native ceiling). `docs/PRD.md`
  itself never hardcoded "5x" — it said "whatever rate ends up being the
  practical ceiling," so needed no edit; `ARCHITECTURE.md`,
  `docs/user-flows.md`, `PRODUCT.md`, and
  `src/features/settings/types.ts`'s `speechRate` comment were updated
  to say 4x. `src/features/speech/service.ts`'s `rateForSpeechRate`
  clamps to `[0.25, 4.0]` — if this project ever needs the full 5x
  later, that clamp (and the workaround this fact describes) is where
  to revisit it, not by assuming the native library changed.
- **Custom-punch/fallback speech is live TTS, never cached (confirmed
  2026-08-24, Phase 5c).** Checked before assuming: neither
  `expo-speech` nor `react-native-tts` (the two obvious library
  choices) can synthesize TTS to a file — both are live-playback-only
  wrappers, even though the underlying native platform APIs genuinely
  support it (iOS `AVSpeechSynthesizer.write(toBufferCallback:)`,
  Android `TextToSpeech.synthesizeToFile()`). Reaching that would need a
  real custom native module (Swift + Kotlin, Expo config plugin) —
  explicitly not built: real engineering, unverifiable in this
  sandboxed environment (no device, no native build tooling), for a
  fallback path that only triggers on words outside the 33-word bundled
  bank. User explicitly chose live `expo-speech` playback instead, with
  these accepted, named tradeoffs: a different voice than the bundled
  Kokoro clips (device's system voice, not `am_fenrir`), per-play
  synthesis latency (~100-500ms, re-synthesized every call, no caching),
  and `expo-speech`'s own `rate` param instead of true WSOLA
  pitch-preserving stretch (its docs give no min/max range — "1.0 is
  normal rate" — and behavior above roughly 2-3x is unverified,
  platform/voice-dependent). If audio quality/latency here ever becomes
  a real problem in practice, the native-module route is the fix, not a
  different library — none exists with this capability.
- `expo-speech`'s `Speech.speak` is directly spy-able under Jest with no
  manual mock needed (verified before writing tests, per this project's
  established "don't assume a native module works under Jest" lesson —
  unlike `react-native-mmkv`/`expo-crypto`, which needed one).
