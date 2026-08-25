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
- **STALE, corrected 2026-08-24: this environment now has a real Python
  install (3.13.3, via the `py` launcher, not the `python`/`pip` PATH
  aliases which still stub out to the Windows Store).** The original
  "no Python installed at all" note (Phase 5a) was accurate at the time
  but no longer is — someone installed it since (exact session unknown).
  Use `py` / `py -m pip`, not `python`, when starting from a fresh
  shell on this machine.
- **`scripts/generate_voice_bank.py` has now actually been run
  end to end and works (2026-08-24)** — the 33 clips committed under
  `assets/audio/voice/` are real Kokoro TTS output, not placeholders,
  verified non-silent (RMS ~0.1, real peaks, not near-zero) via
  `soundfile`. Three real bugs were hit and fixed getting there, all
  explained in the script's own docstring now:
  1. **`pip install kokoro soundfile numpy` alone builds numpy from
     source on Windows and fails.** A brand-new Python patch version
     (3.13.3) can resolve to a numpy version with no prebuilt Windows
     wheel yet, and numpy's from-source build needs a real MSVC
     toolchain this machine doesn't have (the MinGW `cc`/`c++` it falls
     back to fails at the link step, `ld returned 116 exit status`).
     Fixed by installing with `--only-binary=:all:`, which forces pip to
     pick a version that actually has a matching wheel instead of
     silently degrading to a doomed source build.
  2. **espeak-ng (Kokoro's phonemization backend) has no non-admin
     Windows install path at all.** Its only official Windows
     distribution is an admin-elevated MSI installer — no portable zip
     build exists in its GitHub releases. In a non-interactive session
     this means a UAC prompt sits forever with no one to click it; even
     Scoop's `espeak-ng` package is just a thin wrapper around the same
     MSI, so it doesn't help either. **Real fix**: the `espeakng-loader`
     PyPI package (`pip install espeakng-loader`) bundles a real
     espeak-ng shared library + data files as pip-installable wheel
     data — no system install, no admin rights. Wired in via
     `phonemizer.backend.espeak.wrapper.EspeakWrapper.set_library()`/
     `.set_data_path()`, added near the top of
     `generate_voice_bank.py` (guarded by a `try`/`except ImportError`
     so a real system espeak-ng still works if one exists). If this
     script is ever run on a machine with a working system espeak-ng
     already, `espeakng-loader` isn't required — but there's no harm in
     leaving it installed either.
  3. **`kokoro/pipeline.py` has a real bug on Windows**: it opens its
     own config JSON with no explicit `encoding="utf-8"`, so Python
     falls back to the OS locale encoding (cp1252 on this machine) and
     crashes with `UnicodeDecodeError` on a non-ASCII byte in that
     config. This is a bug in kokoro's own package, not anything in this
     repo. Fixed by running with `PYTHONUTF8=1` (Python's global UTF-8
     mode), which changes `open()`'s default encoding process-wide
     without touching the installed package. Check whether a newer
     kokoro release has fixed this upstream before assuming the env var
     is still needed on a future run.
  Total real setup cost worth knowing for next time: the plain
  `pip install kokoro soundfile numpy` (~1GB, torch/spacy/transformers
  pulled in transitively) took roughly 30 minutes on this machine,
  dominated by Windows Defender's real-time scanning of the very large
  number of small files `transformers`/`spacy` install — not a network
  or CPU bottleneck. A Defender exclusion for the venv folder would
  speed this up significantly if this needs to be re-run.
- **The Freesound-CC0 sourcing pass for bell/clapper/countdown-tick
  (2026-08-24) found real candidates but no perfect match yet, and
  confirmed a hard constraint**: Freesound requires a logged-in account
  for any actual file download (anonymous `curl` redirects straight to
  their login page) — candidates can be found and their licenses
  verified from outside a session, but the actual `.wav` download needs
  a human with a Freesound account. Best candidates found: clapper --
  [uEffects' Clapboard sound](https://freesound.org/people/uEffects/sounds/207867/)
  (CC0, 380ms, a real film clapperboard crack, close to a perfect spec
  match); countdown-tick --
  [Sadiquecat's Metronome click](https://freesound.org/people/Sadiquecat/sounds/793346/)
  (CC0, 531ms, tagged one-shot/short). Bell has no clean single-strike
  CC0 match: Benboncan's classic "Boxing Bell.wav" is actually CC-BY 4.0
  (needs attribution) and a 3-strike ~8s sequence, not a single strike;
  craigsmith's CC0 candidate has crowd noise mixed into the same clip;
  Mateusz_Chenc's CC0 candidate is made from an edited bicycle bell, not
  a real struck-metal ring bell. None of these were actually downloaded
  or heard — this needs a human with Freesound access and ears before
  any of them gets dropped into `assets/audio/`.
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
- **Settings form widget choices, confirmed 2026-08-24 (Phase 8a):**
  `react-native-wheely` (pure JS, no native module) for the Round/Work/
  Rest/Warmup duration wheels — user explicitly chose "add a library"
  over hand-building a scroll-wheel, and this one avoids a native
  rebuild dependency a heavier wheel-picker library would need.
  `@react-native-community/slider` — a real native view, needs a
  dev-client rebuild like every other native dependency already in this
  project — used for every slider-shaped control (volume, speech rate,
  and all min/max ranges), rather than a separate dual-thumb range-slider
  library: two of these stacked, with each slider's opposite bound
  clamped live to the other's current value (min's `maximumValue` =
  current max, and vice versa), stand in for a min/max range so the user
  structurally can't drag one past the other — no separate clamp-on-save
  validation needed. Both choices were explicit user picks among named
  alternatives, not defaults.
- **"Combinations" is now a mode-aware section, not Preset-only
  (confirmed 2026-08-24, Phase 8a).** The newer `comboLengthMin`/`Max` +
  `randomPunchPool` fields (Phase 3a, postdating Flow 3's original
  section list) needed a home; rather than add a 7th top-level section,
  Random mode now shows combo length + a punch-pool chip picker in the
  same "Combinations" slot Preset mode uses for the Presets List row —
  same confirmed extraction-doc §1.14 order, mode-dependent content.
  `docs/user-flows.md` Flow 3 itself hasn't been edited to reflect this;
  read this fact as the current source of truth over that doc's original
  wording.
- **"Defense Cues" is a new Settings section, appended after Combo
  Timing and before Punches (confirmed 2026-08-24, Phase 8a)** — it
  postdates Flow 3's originally-confirmed section order (Phase 5d),
  so rather than force it into an existing section it got its own,
  placed low in the order as the newest/most tangential feature.
- **There is no bell/clapper "choice" of multiple sound variants, despite
  Flow 3's wording (confirmed 2026-08-24, Phase 8a).** `audio/service.ts`'s
  `CUE_ASSETS` is exactly one fixed bell asset and one fixed clapper
  asset — the Settings "Sounds" section is just the `appVolume` slider,
  nothing else. If per-cue sound variants ever become a real feature
  (PRD §8 lists "wider variety in sound cues" as a Should-have, not v1),
  that's new `SoundAsset` plumbing, not something this pass silently
  half-built.
- **Settings' punches/presets now refresh on focus, not just on mount
  (fixed 2026-08-24, Phase 8b -- resolves the gap flagged in Phase 8a's
  review).** `src/app/settings/index.tsx` now wraps `getPunches()`/
  `getPresets()` in `useFocusEffect` (imported directly from
  `expo-router`, which re-exports it -- no need for a direct
  `@react-navigation/native` dependency). Became reachable the moment 8b
  shipped real add/rename/delete: Settings stays mounted underneath
  Punches in the stack, so a mount-only load showed stale "N defined"
  summary rows and a stale Random-mode punch-pool chip list after
  navigating back. If 8c's Preset Editor needs the same treatment for
  its own mutations, this is the established pattern to follow.
- **`SpeechEngine` now has a `close()` method (added 2026-08-24, Phase
  8b review).** `react-native-audio-api`'s `AudioContext` always had
  `close()`/`suspend()` -- this codebase's own `SpeechEngine` wrapper
  (`speech/types.ts`/`service.ts`) just never surfaced it, which a
  review caught after `previewEngine.ts` (Punches' Preview action)
  copied `useSession.ts`'s "never close" pattern for an inaccurate
  reason (claiming no release mechanism existed). `useSession.ts`'s own
  engine still deliberately never calls `close()` -- Main Timer is the
  app's one long-lived screen, so there's nothing to release it for --
  but any future short-lived-screen engine (like `previewEngine.ts`,
  now scoped to Punches' own mount/unmount) should call it rather than
  leaking a native AudioContext for the rest of the process lifetime.
- **`Alert.alert` (Punches' last-punch delete guard, Phase 8b) is this
  app's first use of a native OS alert dialog** -- every other error
  state so far (`AudioErrorBanner`) is a custom themed inline banner.
  Functionally correct per Flow 4's "Blocked" framing, but visually
  inconsistent with the rest of the app's fully custom-themed surfaces.
  Deliberately not replaced with a themed modal now -- `ROADMAP.md`'s
  Phase 8 close already has a dedicated `/impeccable critique` step for
  reconciling exactly this kind of cross-screen consistency question
  once 8a/8b/8c all exist; revisit there, not piecemeal.
- **`expo-router@57.0.15` pulls in a real `react-dom@19.2.8` conflict via
  a transitive web-only chain** (`expo-router` → `@expo/ui` → `vaul` →
  `@radix-ui/*`, unrelated to this mobile-only app), which needs
  `react@^19.2.8` — conflicting with this project's pinned
  `react@19.2.3`. `npm install` silently overrides the conflict with a
  warning and succeeds locally, but `npm ci` (what CI actually runs)
  refuses and fails hard — same failure *shape* as the earlier
  `@emnapi` lockfile-drift issue (Phase 6a), though a genuinely
  different root cause this time (a real version conflict, not
  platform-conditional ambiguity). **Fixed** via a `package.json`
  `overrides` entry pinning `react-dom` to `19.2.3` (confirmed to exist
  on npm, matching the installed `react` version exactly — react/
  react-dom are always released in lockstep), verified with a full
  `rm -rf node_modules package-lock.json && npm install` + `npm ci`. If
  a future `expo-router`/Expo SDK bump changes the pinned `react`
  version, this override needs to move in lockstep with it.
- **How the active preset gets chosen was a real, undocumented gap in
  `docs/user-flows.md` Flow 5, resolved by explicit user decision
  (2026-08-24, Phase 8c).** Flow 5 describes creating/editing/deleting
  a preset but never says how `Settings.activePresetId` actually gets
  set. Confirmed choice: a separate radio-style control per row on the
  Presets List (`src/features/settings/components/PresetRow.tsx`), kept
  distinct from tapping the row body (which opens the Editor, per Flow
  5's literal "tap existing -> Preset Editor" wording) -- not
  overloading the same tap with two meanings, and not moving activation
  onto the Settings screen itself. `docs/user-flows.md` itself hasn't
  been edited to reflect this; treat this fact as current over that
  doc's original silence on the question.
- **The Preset Editor uses an explicit Save button, not autosave
  (confirmed 2026-08-24, Phase 8c)** -- deliberately different from
  Settings' and Punches' autosave-on-change pattern. Reason: Flow 5
  itself lists "save" as its own distinct step (unlike Flow 3/Flow 4),
  and autosaving a brand-new preset's draft on every keystroke would
  persist an abandoned/partial preset if the user backs out mid-edit,
  unlike a punch rename where every intermediate typed value is already
  a valid, harmless name.
- **`Alert.alert` (Punches' last-punch delete guard, Phase 8b) is still
  the only native OS dialog in this app as of Phase 8's close** --
  flagged for the Phase 8 close `/impeccable critique` pass to
  reconcile against the rest of the app's fully custom-themed inline
  banners, not fixed piecemeal mid-phase.
- **A local `android/` native folder already exists in this project
  (confirmed 2026-08-24, Phase 9a) -- gitignored, not from this
  session's work.** Untracked (`/android` and `/ios` are both in
  `.gitignore`, standard Expo Continuous Native Generation pattern --
  regenerated on demand via `expo prebuild`/`expo run:android`, never
  committed), dated from an earlier local-build attempt outside this
  conversation. Don't be surprised it's there; don't assume it needs
  regenerating either -- `npm run android` (`expo run:android`) can use
  it as-is. EAS Build itself doesn't use this local folder at all --
  it runs its own fresh `expo prebuild` in the cloud from `app.json`'s
  config plugins, so nothing here needs reconciling with `eas.json`.
- **`eas.json` exists as of Phase 9a, but no EAS project is linked
  yet.** `app.json` has no `extra.eas.projectId` -- that only gets
  written by the user running `eas login` + `eas build:configure`
  themselves (needs their real Expo account; not something to run on
  their behalf). Don't assume EAS builds are actually runnable yet just
  because the config file exists.
- **The project now lives at `C:\dev\cornerman`, not the old OneDrive
  path (moved 2026-08-24, first real device build session).** The old
  path (`OneDrive - De La Salle University - Manila\Desktop\Claude
  Projects\Cornerman\Cornerman-2`, ~89 characters before any project
  file names even start) broke native Android builds: CMake's
  `CMAKE_OBJECT_PATH_MAX` check flagged object-file paths for
  `react-native-worklets`/`react-native-nitro-modules`/
  `react-native-screens` as unsafely long, and Ninja looped forever
  ("manifest 'build.ninja' still dirty after 100 tries") trying to
  regenerate a build graph it could never actually write. Enabling
  Windows' `LongPathsEnabled` registry key (plus a reboot) did **not**
  fix this -- this specific CMake/Ninja toolchain doesn't respect it.
  Moving to a short path was the only fix that worked. The old
  directory was deleted after verifying git history and a clean
  working tree matched exactly. If this repo is ever cloned fresh,
  clone it somewhere short (e.g. `C:\dev\...`), not deep inside
  OneDrive or another long, space-containing path.
- **Test files cannot live inside `src/app/`, confirmed 2026-08-24.**
  `expo-router`'s `_ctx.*.js` builds its route `require.context` with a
  hardcoded regex (`/^(?:\.\/)(?!...+api|...+html|...+middleware)...\.
  [tj]sx?$/`) that matches *every* `.tsx`/`.ts`/`.js` file recursively
  under `EXPO_ROUTER_APP_ROOT` (`src/app`, per `app.json`) -- there is
  no built-in exception for `.test.tsx` files, and no documented config
  option to add one (checked live SDK 57 docs and the installed
  package's source; `getRoutesCore.js`'s own `ignoreList` only runs
  *after* Metro has already tried to bundle the file, too late to
  matter). Three router-integration tests
  (`main-timer-ready`/`onboarding-redirect`/`settings-navigation`) lived
  directly in `src/app/` since Phase 8a's nav-infra pass and were never
  caught, because this was the first time the app was ever actually
  bundled and run -- `npm test` alone never exercises Metro's route
  scanning. Moved to `src/appTests/` (a sibling to `app/`, so `../app/`
  imports work) -- this is the correct home for any future test that
  needs to import real route files via `expo-router/testing-library`.
  Regular unit tests colocated with their source elsewhere in the repo
  (`service.test.ts` next to `service.ts`) are unaffected -- they were
  never inside `src/app/` to begin with.
- **Android Studio's bundled JBR JDK was 25 -- far too new for this
  AGP/CMake toolchain (confirmed 2026-08-24).** A separate JDK 17
  (Eclipse Temurin, installed via `winget install
  EclipseAdoptium.Temurin.17.JDK`) is required. Three things had to
  each be fixed, in order, because each one masked the next:
  1. `JAVA_HOME` (env var) must point at the JDK 17 install, not
     Android Studio's `jbr` folder.
  2. **`android/gradle/gradle-daemon-jvm.properties`, if present, wins
     over everything else** -- Gradle's newer "Daemon JVM criteria"
     file, auto-generated at some point with `toolchainVersion=25`
     baked in, silently overrides `JAVA_HOME`/`org.gradle.java.home`
     entirely and tries to auto-provision JDK 25 for the daemon itself.
     Delete this file if it reappears (e.g. after `expo prebuild`
     regenerates `android/`); don't just re-set env vars and assume
     that's sufficient.
  3. `android/gradle.properties` also has
     `org.gradle.java.home=C:\Program Files\Eclipse
     Adoptium\jdk-17.0.20.8-hotspot` and
     `org.gradle.java.installations.auto-download=false` /
     `auto-detect=false` pinned explicitly, as defense in depth against
     Gradle's toolchain resolver silently fetching yet another stray
     JDK for a worker task. All of this is machine-local (`android/` is
     gitignored) -- redo it if `android/` is ever regenerated on this or
     another machine.
- **The app has now been visually verified for the first time
  (2026-08-24)** -- Onboarding and Main Timer's Ready state both render
  and match `docs/design-direction.md`'s "Corner's Stopwatch & Bell"
  contract closely (gunmetal-dark ground, brass-amber sweep-ring
  countdown, engraved-plate phase badge, lap-dial round counter, large
  brass-amber Start button). This was a real screenshot from a running
  emulator, not reasoning-through-the-contract. Still unverified:
  Settings/Punches/Presets' actual rendered appearance, the Work/Rest/
  Finished states, and 7a's background-audio survival. A full
  `/impeccable audit` has still not been run -- this was ad hoc
  verification during a build-troubleshooting session, not that
  deliberate process.
- **The gunmetal/brass palette above was redesigned the same day it was
  first seen on-device (2026-08-24) -- the user didn't like it once it
  was actually rendered, not a hypothetical revisit.** New direction,
  pinned by explicit user request rather than a `concept-seed.mjs` roll
  (`docs/design-direction.md`'s "beats the roll, always" rule): dark
  background + orange accent in the register of Claude/VS Code's own
  dark themes, plus genuine light/dark mode support (a `Settings.themeMode`
  field: `"system" | "light" | "dark"`, defaulting to `"system"`) rather
  than one locked dark world. Two structural questions were asked and
  answered before touching code, not assumed: (1) the analog-dial motifs
  (sweep-ring countdown, engraved-style phase badge, lap-dial round
  counter, bell-strike animation) are **kept, just recolored** -- the
  user chose this over flattening to a chrome-less Claude/VSCode-style
  layout; (2) Barlow Condensed is **retired** in favor of Inter for
  display/label text, with JetBrains Mono reserved specifically for
  numeral readouts (countdown, wheel-picker values, slider values, num
  badges) -- not a blanket monospace swap, since most "display" usages
  (section titles, phase badge text, button labels, punch names) are
  words, not digits.
- **`src/shared/theme/` (`tokens.ts` + `ThemeContext.tsx`) replaces the
  old static `src/features/session/theme.ts` (deleted).** Old token names
  renamed for clarity now that they're genuinely dynamic:
  `brassAmber`→`accent`, `brassAmberDim`→`accentDim`,
  `enamelWhite`→`textPrimary`, `enamelMuted`→`textMuted`
  (`background`/`panel`/`panelLine`/`danger` kept). Every button's label
  color is `colors.background` (not a separate "on-accent" token) --
  this generalizes correctly to both modes for free, since `background`
  is near-black in dark mode and white in light mode, giving the right
  contrast either way without special-casing.
- **Three real, distinct palettes -- not "2 palettes + an OS-linked auto
  option" -- confirmed 2026-08-24 after three corrections the same day.**
  Pass 1: `accent` tuned to a different orange per mode. Pass 2: unified
  to one shared orange. Pass 3 (still wrong): stripped orange from
  Light/Dark entirely and made "System" alias to whichever of them the
  device's `useColorScheme()` reported -- which meant the Claude/VS Code
  look never actually appeared anywhere. **The actual model**: `system`
  IS the Claude/VS Code-style look (dark ground + `#EA580C` orange
  accent) -- always, not OS-dependent, and what a fresh install shows by
  default. `light`/`dark` are explicit overrides to a genuinely
  monochrome look (`accent` there equals `textPrimary` -- no orange).
  `useColorScheme()` is no longer read at all -- `ThemeMode` is now
  `"system" | "light" | "dark"` directly, the exact same type as
  `Settings.themeMode`, with no separate OS-resolved value in between.
  `danger` stays a real red in all three. `src/shared/theme/tokens.ts`'s
  `isDarkGround(mode)` (true for `system`/`dark`) drives the status bar
  icon color, replacing the old direct `mode === "dark"` check.
- **`ThemeProvider` owns `themeMode` state at the root
  (`src/app/_layout.tsx`) and calls `settings/service.ts`'s
  `getSettings`/`saveSettings` directly** -- a deliberate exception to
  every other Settings field's flow (screen-local state + `onChange`
  prop), because the theme has to be visible to every screen the instant
  it changes, including screens that aren't descendants of the one that
  changed it. `AppearanceSection` (new, Settings screen, section order:
  Appearance → Round → ...) reads/writes through `useTheme()` directly
  rather than the generic `settings`/`handleChange` prop pattern the rest
  of the form uses, for the same reason. This is still a `service.ts`
  call from a component, not a raw MMKV/native call -- consistent with
  `CLAUDE.md`'s layer boundaries, the same pattern `SettingsScreen`'s own
  autosave already used.
- **All ~29 files that consumed the old static `theme` import were
  converted to a `useTheme()` hook + memoized `createStyles(colors,
  fonts)` pattern** (module-scope `StyleSheet.create` can't react to a
  runtime mode change, so every one of them moved from a top-level
  `const styles = StyleSheet.create(...)` to a function called inside the
  component body via `useMemo(() => createStyles(colors, fonts), [colors,
  fonts])`). Mechanical but real -- if a future component still imports
  from a `theme` module directly instead of `useTheme()`, it will not
  respond to a theme-mode change; there is no compatibility shim, the old
  module is deleted.
- **`react-native-wheely`'s `WheelPickerItem` is wrapped in
  `React.memo(..., () => true)` -- a comparator that always returns
  `true`, meaning it deliberately never re-renders after its first mount
  (confirmed 2026-08-24 reading `node_modules/react-native-wheely/lib/
  WheelPickerItem.js`).** A `textStyle`/`selectedIndicatorStyle` color
  change (e.g. switching Appearance mode) is silently ignored by
  already-mounted wheel items -- the numerals stay whatever color they
  first rendered with, which is how Dark mode shipped with invisible
  wheel-picker numbers (stuck on their original color, now indistinguishable
  from the new background). Fixed by keying the `<Wheely>` element itself
  on `mode` (`src/shared/components/WheelPicker.tsx`) so an Appearance
  change forces a full remount instead of relying on the library to
  notice new props -- the only way to get it to actually pick up new
  colors. Any future themed prop passed into this library needs the same
  treatment, not just `itemTextStyle`/`selectedIndicatorStyle`.
- **Ran the native code-level `/impeccable audit` for the first time
  (2026-08-24, Main Timer + Onboarding).** Unlike web `/impeccable audit`,
  the native version reads straight from source against the iOS/Android
  platform references -- no screenshot needed. Scored 15/20 (Good).
  Fixed the three highest-value findings immediately:
  1. `app.json`'s `userInterfaceStyle` was `"light"`, fighting the redesign's
     new dark appearances at the native-container level (permission
     dialogs, keyboard, system chrome would render light even in
     System/Dark) -- changed to `"automatic"`.
  2. `CountdownRing`/`PhaseBadge`'s Reanimated animations never checked
     Reduce Motion -- now call `useReducedMotion()` and, when true,
     `CountdownRing` steps `progress.value` directly every 200ms instead
     of `withTiming`, and `PhaseBadge` skips its scale pulse entirely.
  3. `AudioErrorBanner` (mid-session, sound-just-broke banner) had no
     screen-reader announcement -- added `accessibilityRole="alert"` +
     `accessibilityLiveRegion="assertive"` (Android/TalkBack) and an
     `AccessibilityInfo.announceForAccessibility` call on mount (iOS/
     VoiceOver, which has no live-region prop equivalent).
  **Not yet fixed, deliberately deferred**: Android's
  `predictiveBackGestureEnabled: false` in `app.json` (P1 -- worth
  checking whether it's still needed before flipping it, since disabling
  a system gesture is the kind of thing that might have a real reason
  behind it), `supportsTablet: true` declared with no actual size-class
  handling in these layouts (P2), and the countdown ring's numeral having
  no explicit `accessibilityLabel` (P3). Revisit these before considering
  6a/7b's audit fully closed.
- **`useReducedMotion` needed its own Jest mock, and the fix took two
  attempts to find the real cause (2026-08-24).** First attempt: a
  top-level `__mocks__/react-native-reanimated.ts` patching in
  `useReducedMotion: () => false` on top of `jest.requireActual(...)` --
  worked in an isolated diagnostic test but NOT in the three router-
  integration tests. Root cause, traced by reading
  `node_modules/expo-router/build/testing-library/mocks.js`:
  `expo-router/testing-library` registers its **own**
  `jest.mock('react-native-reanimated', ...)` factory the moment a test
  file imports it (`require('react-native-reanimated/mock')` under the
  hood, unpatched) -- that registration always wins over this project's
  top-level manual mock in any test that imports
  `expo-router/testing-library`, regardless of where a competing
  `jest.mock()`/`jest.doMock()` call is placed (hoisting only reorders
  within one file; the import that triggers expo-router's internal call
  still executes before the render). **Real fix**: a *second* manual
  mock at the subpath both paths actually share --
  `__mocks__/react-native-reanimated/mock.ts` -- patching
  `useReducedMotion` there instead. Jest's `__mocks__` convention does
  support mocking a package subpath this way (mirroring the specifier's
  path under `__mocks__/`), confirmed working. If a future Reanimated
  API gap surfaces only in router-integration tests again, patch it at
  this subpath, not the top-level mock.
- **The combo voice bank ships two voices now, not one (confirmed
  2026-08-25).** The user listened to samples of all 9 of Kokoro's
  American-male voices (am_adam, am_echo, am_eric, am_fenrir, am_liam,
  am_michael, am_onyx -- am_puck/am_santa weren't sampled, judged
  unlikely fits by name before spending generation time) and picked
  Michael + Eric. This isn't a "final pick, ship one voice" decision --
  the user explicitly asked for the app to keep offering a real choice,
  not just default to whichever one voice got picked. `am_michael` is
  the default (`Settings.ttsVoice`'s default value and
  `speech/types.ts`'s `DEFAULT_VOICE`) -- no strong reason for Michael
  over Eric as default beyond being asked about first; revisit if that
  turns out to matter. Adding a third voice later needs three things to
  agree: `speech/types.ts`'s `TtsVoice` union + `VOICE_OPTIONS`,
  `scripts/generate_voice_bank.py`'s `VOICES` list, and a new
  `assets/audio/voice/<voice>/` subfolder generated by running that
  script again.
- **A real corner clapper is three fast claps ("pak pak pak"), not one
  ("pak") -- caught by the user actually hearing the sourced single-clap
  sample in place (2026-08-25).** Rather than needing a pre-mixed 3-clap
  sample (harder to source, impossible to retime), `audio/service.ts`'s
  `playCue` schedules the clapper buffer 3 times through the
  AudioContext's own sample-accurate clock (`CLAPPER_REPEAT_COUNT = 3`,
  `CLAPPER_GAP_SEC = 0.15`), not via JS timers. Every other cue
  (bell/countdownTick/finalBell) still plays exactly once -- this repeat
  behavior is specific to `"clapper"`, not a general multi-play feature.
- **`clapper.wav` and `countdown-tick.wav` are real sourced audio now
  (2026-08-25)** -- uEffects' Clapboard sound and Sadiquecat's Metronome
  click, both CC0, per the Freesound candidates found earlier. Verified
  via `soundfile.info()`: `clapper.wav` is 44.1kHz/mono/16-bit, matching
  `SOURCING.md`'s spec exactly; `countdown-tick.wav` is real audio too
  but recorded at 192kHz/24-bit rather than the spec's 44.1kHz -- not a
  functional problem (the native decoder resamples automatically), just
  a larger file than necessary (~307KB for 0.53s). `bell.wav` is still
  the untouched silent placeholder -- no clean single-strike CC0 bell was
  ever found (see the earlier Freesound-sourcing fact above); still
  open.
- **Metro's persisted haste-map cache can go stale across a folder
  restructure, not just an edited file's contents (found 2026-08-25).**
  After the voice-bank restructure (deleting flat `assets/audio/voice/
  *.wav` files, replacing with `am_michael/`/`am_eric/` subfolders), a
  running Metro instance -- and even a plain restart of it -- kept
  failing to resolve the new nested paths with "Unable to resolve
  module", even though the files genuinely existed on disk with correct
  names. Root cause: Metro's file-map cache persists to disk
  (`%LOCALAPPDATA%/Temp/metro-file-map-*`, `.expo/cache`) across
  restarts and doesn't reliably reconcile a directory-shape change under
  it. Fix: `expo start -c` (or manually delete `.expo/cache` and the
  `metro-file-map-*`/`metro-cache` dirs under `%LOCALAPPDATA%/Temp`)
  whenever a change deletes-and-recreates a nested asset directory, not
  only when editing a file's contents in place.
- **Combo call-outs were playing every word in a combo at the same
  instant, not in sequence (found 2026-08-25 from the user's on-device
  test -- "doesn't say the whole combo" + "sometimes distorted voice").**
  `useSession.ts` called `SpeechEngine.playWord()` once per punch in a
  tight synchronous `forEach`, and `playWord`'s underlying
  `AudioBufferSourceNode.start()` had no time offset, so every word
  started at `context.currentTime` -- overlapping buffers summed into
  garbled, sometimes clipped/distorted audio. Fixed with a new
  `SpeechEngine.playCombo(texts)` that schedules bundled clips
  sequentially on the AudioContext's own clock (`WORD_GAP_SEC = 0.12`
  between words, same pattern as the clapper's `CLAPPER_GAP_SEC`), and
  for a word with no bundled clip (e.g. a custom punch name -- falls to
  on-device TTS, a separate audio pipeline with no shared clock to
  schedule against) genuinely awaits `expo-speech`'s `onDone` callback
  before continuing. Not related to the migration doc's item 7 (combo-
  gap floor of 0.5s intentionally allowing the *next* combo to cancel/
  overlap the *previous* one's speech at Blitz settings) -- that's
  between separate combos and was left as-is; this fix is about words
  *within* one combo, which should never have overlapped at any gap
  setting.
- **Punches screen: "disable" means excluded from Random mode's draw,
  reusing `randomPunchPool` -- not a new `enabled` field on `Punch`
  (decided 2026-08-25).** User explicitly chose this over a dedicated
  on/off field: Settings > Combinations already owns a "Restrict punch
  pool" switch + chip picker writing the same `settings.randomPunchPool:
  number[] | null` field; the Punches screen's per-row Switch
  (`toggleRandomPoolMembership()`) is a second entry point onto that
  same field, not a parallel mechanism. Consequence carried over from the
  existing mechanism, not introduced by this change: once the pool is
  non-null (any punch has been excluded), a punch added afterward isn't
  automatically included -- it must be explicitly toggled on, same as
  the Combinations chip picker already behaved.
- **Deleting a punch is recoverable two ways (decided 2026-08-25, user
  chose "both" over picking just one): a 5s Undo banner, and a "Restore
  defaults" button.** Undo (`restorePunch()`) re-inserts the exact
  deleted `Punch` object (same `id`) at its original list index --
  scoped to only the most recent delete, cleared on any subsequent
  delete/restore. "Restore defaults" (`restoreDefaultPunches()`) is the
  general-case escape hatch once Undo's window has passed; it wipes
  every custom punch back to the factory 7, confirmed via `Alert.alert`
  first since CLAUDE.md treats this as a real destructive action.
- **Punch numbers ARE editable now -- reversed same-day (2026-08-25).**
  First asked explicitly whether to add a number editor and the user said
  keep numbers fixed (matching extraction doc §1.6); after actually using
  the app, hit the real gap that decision missed -- deleting "Jab" (num 1)
  and adding a replacement always landed it at the next-unused number
  (e.g. 8), with no way to put it back at 1. Reversed: `PunchRow`'s num
  badge is now an editable `TextInput` (`renumberPunch(id, num)` in
  settings/service.ts, same commit-on-blur pattern as the name field),
  and `AddPunchRow` gained a matching number field pre-filled with the
  next-unused suggestion but overridable. `num` still isn't required to
  be unique (unchanged design decision) -- a Preset referencing a number
  that moves away from this punch degrades to `resolvePunchName`'s
  existing generic `"Punch " + num` fallback rather than breaking; no
  special Preset-side handling was added, since that fallback already
  covered this gracefully. Lesson: a "confirmed" decision from a
  same-day question can still get reversed by the very next round of
  real usage -- don't treat an earlier answer in this same file as
  necessarily still current without checking the date.
- **Pausing never actually stopped combo/defense-cue generation, only the
  visible countdown (found 2026-08-25 from the user watching "combos
  called" climb while paused).** `sessionTick()` gates on
  `timerState.phase !== "work"` only; pausing doesn't change `phase`
  (`tick()` just freezes and returns the same state unchanged while
  `isPaused`), so `sessionTick` kept comparing real wall-clock `now`
  against the already-armed `nextComboAt`/`nextDefenseCueAt` the entire
  time a session was "paused" -- new combos/cues kept firing and
  `comboCount` kept incrementing, invisibly, underneath the frozen ring.
  Fixed: `sessionTick` now short-circuits to zero actions when
  `timerState.isPaused`, leaving `nextComboAt`/`nextDefenseCueAt`
  untouched (not reset) so the exact remaining gap survives -- a new
  `shiftSessionForResume(session, pausedDurationMs)` shifts them forward
  by the paused duration on resume, the SessionState counterpart to
  `timer/service.ts`'s own `resume()` (which already did this for
  `phaseEndAt`/`firstComboAt`, extraction doc §1.3). Wired into both of
  `useSession.ts`'s resume paths -- the manual pause button and the
  audio-interruption auto-resume handler -- so a phone call mid-session
  gets the same fidelity as a manual pause, not just one of the two
  paths. This bug predates today; it's been present since Phase 7a first
  connected pause/resume to a running session and was never caught until
  real on-device use surfaced it.
- **`useSession.ts` re-syncs `settings`/`punches`/`presets` from storage
  on focus-regain, not once at mount (fixed 2026-08-25, same day as
  found; mechanism corrected same day too -- read on).** User chose
  "fully live, including voice" over two more conservative options when
  asked. First implementation polled `getSettings()`/`getPunches()`/
  `getPresets()` from MMKV every 200ms tick and called `setSettings()`
  unconditionally with the fresh (always-new-reference) result -- this
  forced a real React re-render of Main Timer's whole subtree 5x/sec for
  the app's entire lifetime, including while idle and while a completely
  different screen had focus (Main Timer stays mounted underneath per
  its "one long-lived screen" design). That background render storm
  starved the JS thread badly enough that the Settings screen's pure-JS
  `react-native-wheely` scroll wheels became unresponsive -- the very
  next thing the user reported ("now I cant adjust time durations").
  **Corrected same day** to `useFocusEffect` instead (the exact pattern
  `app/settings/index.tsx` already used for its own Punches/Presets
  re-sync) -- settings can only change via navigating to Settings/
  Punches and back, which is exactly a focus transition, so this is
  fully sufficient, not a lesser compromise. The tick loop reads from
  `settingsRef`/`punchesRef`/`presetsRef` (updated only by the focus
  effect), never from state, so the interval effect stays `[]`-deps and
  never re-subscribes. **Lesson for next time:** "poll storage every
  tick" sounds cheap because the read itself is cheap, but pairing it
  with an unconditional `setState` of a freshly-parsed object turns a
  cheap read into a mandatory full re-render at that same cadence --
  check whether something already re-renders that often before adding a
  poll loop, and prefer syncing on the actual trigger event (here: a
  focus transition) over polling on a fixed clock when nothing requires
  that granularity. appVolume/speechRate are applied live via
  setVolume/setRate, same focus-triggered cadence. `ttsVoice` is the one
  that needed real care:
  a separate effect keyed on the primitive `settings.ttsVoice` (not the
  whole `settings` object, which gets a new reference every tick) rebuilds
  the native speech AudioContext only when the voice value actually
  changes -- builds the replacement first, only closes the previous
  engine once the new one is confirmed working, and on a failed *switch*
  keeps the old (working) engine rather than surfacing the "sound
  unavailable" banner for a problem that isn't that. The one thing that
  deliberately stayed snapshot-once: round *structure*
  (rounds/work/rest/warmup duration) is captured into `configRef` fresh
  each time `start()` is pressed (itself a fix -- it was previously frozen
  at whatever settings existed when the app first launched, forever) but
  held fixed for that session once running, since retroactively resizing
  a moving round would require re-deriving `phaseEndAt`/`firstComboAt`
  from underneath an in-progress timer -- nobody asked for that and it
  risks genuinely undefined timer states. Matches this project's existing
  precedent of leaving native-wiring hooks like this one untested (see
  the doc comment at the top of `useSession.ts`); the underlying pure
  logic it calls (`sessionTick`, `tick`) still carries the real test
  coverage.
