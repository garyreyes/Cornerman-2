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
