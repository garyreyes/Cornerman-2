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
- **No recurring combo-repeat loop exists yet, even after Phase 5
  (confirmed 2026-08-24, Phase 5d).** `timer/service.ts`'s
  `firstComboAt` only ever computed the *first* combo of a Work phase
  (a single-shot clamped-window calculation) — nothing re-arms it for
  combo #2, #3, etc. within the same phase. This was true before 5d too;
  reading the timer code closely for 5d's defense-cue timer just
  surfaced it explicitly. That recurring loop (and arming
  `defenseCues`' independent gap timer alongside it, only during Work
  phase) is Phase 6's job when the Main Timer screen actually exists to
  drive it — don't assume it's built just because Phase 5 says
  "complete."
- `src/lib/gapTiming.ts`'s `nextGapFireTime(now, minMs, maxMs, random)`
  is the shared clamped-random-window primitive (extraction doc §1.2)
  — `timer/service.ts`'s `firstComboAt` and
  `defenseCues/service.ts`'s `nextDefenseCueFireTime` both delegate to
  it rather than duplicating the formula. Any future "fire again
  somewhere in this random window" need should reuse this, not
  re-derive it a third time.
- Default defense-cue gap range is `15s`-`30s`
  (`defenseCueGapMinSec`/`Max`), deliberately independent of
  `comboGapMinSec`/`Max` — sparse enough not to compete with the primary
  combo call-outs. A proposed, easily-retuned default, not a
  user-confirmed number — flag if it feels wrong once actually heard
  during a workout (Phase 6).
- **This environment has no way to visually verify a React Native
  screen at all — no device, no simulator, no screenshot capability**
  (confirmed 2026-08-24, Phase 6a). The Main Timer screen was built
  entirely by reasoning against `docs/design-direction.md`'s written
  contract, never actually seen rendered. Treat any visual claim about
  it (colors, layout, animation feel) as unverified until a human
  actually looks at it running on a device/simulator — this is the
  same honesty standard already applied to bell/clapper sound quality
  (4a) and TTS voice quality (5a/5c), just for the visual dimension.
  `/impeccable audit` genuinely has not run for this reason, not an
  oversight — don't mark it done without it actually happening.
- **Navigation is deliberately deferred as of 6a** — only one real
  screen exists (Main Timer). `App.tsx` renders it directly; the
  settings gear icon is present (design-contract-required) but wired
  as a no-op. Add real navigation (`expo-router` is the natural fit for
  an Expo project) once Phase 7/8 actually needs a second screen —
  don't build routing infrastructure ahead of that need.
- **Two more native modules needed manual Jest mocks, confirmed 2026-08-24
  (Phase 6a):** `react-native-worklets` (Reanimated v4's native runtime —
  no JS fallback, throws on import under Jest) and
  `react-native-safe-area-context` (`SafeAreaProvider` waits for a real
  `onLayout` that never fires under Jest, so children render as
  nothing without it). Both reuse the packages' own official mocks
  (`react-native-worklets/lib/module/mock`,
  `react-native-safe-area-context/jest/mock`) rather than hand-rolled
  fakes, matching `react-native-audio-api`'s pattern — but
  safe-area-context's official mock ships as a **default** export, so
  `__mocks__/react-native-safe-area-context.tsx` unwraps `mock.default`
  before re-exporting; naively re-exporting the raw `require()` result
  (like the other two mocks do) resolves every named import as
  `undefined` and fails with a cryptic "Element type is invalid" error,
  not an obvious "module not found."
- **`react-native-testing-library`'s `render()` being async (React 19)
  is an easy mistake to repeat** — got this wrong a second time writing
  `App.test.tsx` for 6a despite it already being a documented fix from
  harness-setup, and it produced a genuine multi-minute Jest hang (not
  a fast, obvious error) because `{ findByText } = render(...)`
  silently destructures `undefined` off an unawaited Promise rather
  than throwing immediately. If a component test hangs instead of
  failing fast, check for a missing `await` on `render()` before
  suspecting the component/native-module code.
- **The recurring `@emnapi/*` lockfile-drift issue (hit 4 times across
  this project) is now permanently fixed, not just re-rolled again
  (2026-08-24, Phase 6a).** Root cause, finally traced: `eslint-config-expo`
  → `eslint-import-resolver-typescript` → `unrs-resolver` →
  `@unrs/resolver-binding-wasm32-wasi` (a WASM fallback for ESLint's
  import resolver, nothing to do with the app itself) requires
  `@emnapi/core`/`@emnapi/runtime` via a wide, ambiguous range
  (`^1.7.1 || ^2.0.0-alpha.4`). These are optional, platform-conditional
  packages that don't install on Windows at all (`npm ls` shows nothing
  locally), so **local `npm ci` verification on this Windows machine
  cannot actually catch a Linux-side resolution mismatch** — confirmed
  when a lockfile that passed local `npm ci` twice still failed CI
  twice in a row with the identical error. Fixed for real via a
  `package.json` `overrides` block pinning
  `@emnapi/core`/`@emnapi/runtime`/`@emnapi/wasi-threads` to one exact
  version each, eliminating the ambiguous range (and therefore the
  cross-platform resolution non-determinism) entirely, rather than
  hoping a regenerate happens to land on a matching version again. If
  this recurs, check whether the pinned override versions have gone
  stale against a newer `unrs-resolver`, not whether to regenerate the
  lockfile again.
- **The declarative half of Phase 7's background-audio requirement was
  already done before 7a started, confirmed 2026-08-24.**
  `react-native-audio-api` ships its own Expo config plugin
  (`node_modules/react-native-audio-api/src/plugin/withAudioAPI.ts`)
  that, with zero options (a bare string in `app.json`'s `plugins`
  array, already present since Phase 4a), defaults to
  `iosBackgroundMode: true` (sets `UIBackgroundModes: ['audio']`) and
  `androidForegroundService: true` (adds `FOREGROUND_SERVICE`/
  `FOREGROUND_SERVICE_MEDIA_PLAYBACK` permissions and registers the
  library's own `CentralizedForegroundService`). No `app.json` change
  was needed for this — don't re-add it later assuming it's missing.
- **7a's real remaining work was the runtime half**: activating the iOS
  audio session with the `playback` category (required for playback to
  survive backgrounding/lock — the default `ambient` category does not)
  and detecting audio-focus interruptions, both via the library's
  `AudioManager` singleton (`react-native-audio-api`'s `system/
  AudioManager.ts` — `setAudioSessionOptions`, `setAudioSessionActivity`,
  `observeAudioInterruptions`, `addSystemEventListener('interruption', ...)`
  with payload `{type: 'began'|'ended', shouldResume: boolean}`). Built
  as `src/lib/backgroundAudio.ts`. The exact recommended call sequence
  (once at startup vs. per-play) is inferred from the source/TSDoc, not
  from a fetched setup guide — the library's hosted docs site
  (docs.swmansion.com/react-native-audio-api) 404s on every guessed
  guide path and the GitHub repo has no `docs/` folder either; this is
  read-the-source-directly territory, same as the WSOLA cap in 5b.
- **Auto-resuming a paused timer on `interruption: ended` must never
  override a pause the user triggered manually** (e.g. they tapped
  Pause, then a call arrived) — a real fork surfaced during 7a's
  planning, not an edge case invented after the fact. Solved with a
  `pausedByInterruption` boolean round-tripped through the new pure
  `decideInterruptionAction` (`session/service.ts`): only a pause that
  function itself caused is eligible for auto-resume; a manual pause
  is left alone regardless of what the interruption system reports.
- **A minimal "session running" lock-screen/notification-shade
  indicator (via `PlaybackNotificationManager.show`/`.hide`) is
  confirmed in scope for 7a** — user chose this over deferring it,
  explicitly for standard background-audio-app UX and safer Play Store
  review, even though it's likely not strictly required for the Android
  foreground service to survive (Android generates *some* default
  notification for any running foreground service regardless — inferred
  from platform behavior, not confirmed against this library on a real
  device).
- **The official `react-native-audio-api` Jest mock's `AudioManager` is
  a class with `static` methods — object-spreading it
  (`{...officialMock.AudioManager}`) silently drops every method**,
  since ES6 class methods (including `static` ones) are non-enumerable
  by spec and object spread only copies enumerable own properties. Hit
  this extending `__mocks__/react-native-audio-api.ts` for 7a (needed
  methods the official mock doesn't implement:
  `setAudioSessionActivity`, `setAudioSessionOptions`,
  `observeAudioInterruptions`, and `PlaybackNotificationManager`'s real
  `.show()`/`.hide()` singleton API, which doesn't match the mock's
  unrelated static `.create()` shape at all) — fixed by forwarding each
  method explicitly rather than spreading. If a future native-module
  mock patch silently "loses" a method that's visibly right there in
  the source, check whether it's a class static being spread, not a
  typo.
- **Real-device verification for 7a has not happened** — same
  environment gap as 6a's visual audit, just for background-audio
  survival (locked screen, real phone call) instead of visuals. Treat
  as unverified until tested on a real device; don't assume it works
  just because the JS-level wiring is tested and typechecks.
- **Onboarding (7b) stayed on a plain conditional render in `App.tsx`,
  not `expo-router`, confirmed 2026-08-24** — even though ARCHITECTURE.md
  had flagged "second screen exists" as the trigger point for adding
  real navigation. On inspection, Onboarding is a one-way, show-once-
  ever gate (`docs/user-flows.md` Flow 1) with no back button and no
  revisit path, architecturally nothing like the push/pop stack
  Settings→Punches→Presets will need in Phase 8 (header back arrows,
  drilling in and backing out, per `docs/user-flows.md`'s navigation
  convention). User confirmed keeping it simple. **Phase 8 is still the
  real trigger for installing `expo-router`** — don't skip past it a
  second time.
- **`react-native-audio-api`'s `AudioManager.requestNotificationPermissions()`
  is the exact API Flow 1's "Android 13+ system notification permission
  dialog" step needed** — no separate `expo-notifications` package
  required. iOS has no equivalent runtime prompt for this (background
  audio mode there is a declared capability, not a user permission), so
  `src/lib/backgroundAudio.ts`'s `requestNotificationPermission()`
  resolves `true` immediately on every non-Android platform.
- **A denied notification permission does not persist any "denied" flag
  anywhere** — deliberate simplification during 7b's planning. Phase 8's
  Settings screen (not yet built) is expected to show a persistent note
  about degraded background-audio reliability per Flow 1's proposed
  default, but it should call `AudioManager.checkNotificationPermissions()`
  live when it renders rather than trust a stale onboarding-time
  snapshot — permission state can change later via OS settings outside
  the app, and a live check reflects that correctly where a persisted
  boolean would not. Don't add a persisted flag for this later without
  re-reading this reasoning first.
- **`expo-router` (Phase 8a) supports this project's existing `src/app/`
  convention directly, confirmed against live SDK 57 docs before
  installing** — no restructuring away from `src/` was needed; the
  initial client file is `src/app/_layout.tsx` automatically since the
  project already has a `src/` directory. `main` is `expo-router/entry`;
  `App.tsx`/`index.ts`/`App.test.tsx` are deleted, fully superseded.
- **`expo-router`'s transitive dependency `standard-navigation` needed
  adding to `package.json`'s Jest `transformIgnorePatterns`** — shipped
  as ESM, caused `SyntaxError: Cannot use import statement outside a
  module` under Jest until added to the existing allowlist regex
  (`jest-expo`'s default pattern didn't cover it). If a future
  expo-router-adjacent package throws the same error under Jest, check
  this list first before assuming something is broken.
- **`expo-router/testing-library`'s `renderRouter` needs an explicit
  `await act(async () => { renderRouter(...) })` wrap when the rendered
  tree includes an async state update after mount** (here: `expo-font`'s
  `useFonts` resolving after the initial render) — omitting it doesn't
  error immediately, it manifests as `screen.getByText` failing with
  "render function has not been called" or, worse, silently stale
  reads. This is a different flavor of the already-documented "RNTL's
  `render()` is async" gotcha, not the same bug — `renderRouter` itself
  is NOT a Promise (don't `await` the call directly), but the tree it
  mounts can still have pending async effects that need an `act()`
  flush.
- **Multiple `renderRouter()` calls in the same test FILE showed real
  cross-test interference** (confirmed 2026-08-24) — a later test would
  read the *previous* test's ending route (`getPathname()` returning a
  stale value) even with `clearAll()` in `beforeEach` and `cleanup` in
  `afterEach`; root cause not fully isolated (suspected: React
  Navigation's internal state not being a clean per-render singleton
  under `renderRouter`'s mock context). **Fixed by giving each
  `renderRouter`-based test its own file** (`src/app/onboarding-
  redirect.test.tsx`, `main-timer-ready.test.tsx`, `settings-
  navigation.test.tsx`) rather than one file with three `test()` blocks
  — Jest's per-file module registry sidesteps whatever the shared state
  actually is. If a future router test is flaky only when run alongside
  siblings in the same file, split the file first before debugging
  further.
- **This roadmap's Phase 8a bullet had a stale "0.25x–5x" rate-dial
  reference, corrected 2026-08-24** — the real cap has been 0.25x–4x
  since Phase 5b (`react-native-audio-api`'s WSOLA hard limit); the
  roadmap text just never got updated when that revision happened.
  `docs/PRD.md` was already correct (never hardcoded a number).
