# Cornerman — Architecture

Status: confirmed with user, 2026-08-23. Source: [docs/PRD.md](docs/PRD.md)
(product truth) and [docs/MIGRATION_EXTRACTION.md](docs/MIGRATION_EXTRACTION.md)
(proven business logic from the existing vanilla-JS app). This file is the
single place the tech stack is recorded — no other document owns it.

## What the app does

A boxing combo timer: configurable round/rest/warmup timing, spoken combo
call-outs at a controllable words-per-second rate, and authentic-sounding
round/rest audio cues — designed to keep running while backgrounded or
screen-locked, so training continues while the phone is put away.

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Language | TypeScript | Extraction doc §4 names lack of compile-time typing as a real pain point in the old app (settings/opts shapes informally documented only in comments) |
| Framework | React Native | Single codebase for iOS + Android, matches existing JS background |
| Build/tooling | EAS Build with a dev client (NOT Expo Go) | Background/locked-screen audio requires custom native config (iOS `UIBackgroundModes: audio`, Android foreground service) that Expo Go cannot run |
| Audio engine | `react-native-audio-api` (Web Audio API port for RN) | Matches the extraction doc §1.11 shared-bus approach in spirit, but this library has no `DynamicsCompressorNode` (confirmed 2026-08-24, Phase 4a — it's on the library's own roadmap, not shipped); the built bus is `appVolume gain → makeup gain → WaveShaper soft-clip limiter → destination` instead. See `PROJECT_FACTS.md`. |
| Combo speech | Pre-generated `VoiceClip` per word, spliced per combo, played back with `react-native-audio-api`'s native WSOLA pitch-preserving time-stretch (`createBufferSource({pitchCorrection: true})` + the `playbackRate` param) for a continuous 0.25x–4x rate | Live TTS distorts pitch at extreme rates by nature (the "chipmunk" artifact, extraction doc §1.10/§5.4) — time-stretching real recorded/generated audio is the only mechanism that hits a wide rate range without it. 4x, not 5x: the library's WSOLA implementation hard-caps `playbackRate` at a fixed native ceiling (`WsolaTimeStretcher::MAX_PLAYBACK_RATE = 4`, confirmed 2026-08-24 reading its C++ source) — revised down from the originally-discussed 5x rather than building extra complexity to work around it; see `PROJECT_FACTS.md`. |
| Bundled voice bank source | Kokoro TTS (open-source, offline, Apache 2.0), batch-generated once on a dev machine via `scripts/generate_voice_bank.py`, not run on-device | Confirmed 2026-08-24, Phase 5a — still "generated ahead of time," same category as a real recording for the pitch-distortion argument above; see `docs/PRD.md` §10 for the 33-word vocabulary |
| Custom-punch speech fallback | Live `expo-speech` playback (`Speech.speak`), re-synthesized every call, through the OS's own audio output — NOT cached, NOT played through the WSOLA pipeline | Revised 2026-08-24, Phase 5c: no available library (`expo-speech`, `react-native-tts`) can synthesize TTS to a file, only a custom native module could (not built — real Swift/Kotlin work, unverifiable in this environment, disproportionate for a fallback path). Still preserves free punch renaming (extraction doc §1.6) without a recording for every custom name; accepted tradeoffs are a different voice than bundled clips, per-play latency, and `expo-speech`'s own `rate` param instead of true pitch-preserving stretch (undocumented behavior above ~2-3x). See `PROJECT_FACTS.md`. |
| Audio assets (bell/clapper/warning) | Real recorded/licensed samples — Freesound.org (CC0) first, AudioJungle (one-time purchase) fallback | User-confirmed requirement: authentic, not synthesized or AI-generated (PRD §6) |
| Local persistence (Settings/Punch/Preset metadata) | MMKV | Fast, synchronous key-value storage; directly mirrors the old app's zero-migration `Object.assign(defaults, parsed)` pattern (extraction doc §1.13) |
| Audio file storage | App document directory (filesystem) — MMKV holds only metadata/file paths | Binary audio doesn't belong in a JSON-blob key-value store |
| Backend | None — fully local, offline-first | No accounts/login in v1 (PRD §2); nothing needs a server |
| Auth | None in v1 | Single-user, no accounts — see "Deferred decisions" below for what happens if this changes later |
| Hosting/distribution | Google Play Console (existing `com.gary.cornerman` listing, carried forward) + Apple App Store (deferred — no Developer account yet, PRD §6) | Both platforms are in scope for the build; actual submission is explicitly out of scope for this phase |
| Screen animation | `react-native-reanimated` v4 (+ `react-native-worklets`) + `react-native-svg` | Confirmed 2026-08-24, Phase 6a — the design contract's continuous sweep-ring countdown and mechanical bell-strike motion need real native-thread animation and precise arc drawing; the plain RN `Animated` API can't do either well |
| Screen typography | `@expo-google-fonts/barlow-condensed` + `@expo-google-fonts/inter` via `expo-font` | The direction contract's exact type choices (Barlow Condensed for dial numerals, Inter for body text) — not a substitutable system-font default |
| Navigation | `expo-router` (file-based routing) — installed Phase 8a, the confirmed real trigger point | Settings/Punches/Presets need a genuine push/pop stack with back arrows (`docs/user-flows.md`'s navigation convention), which a plain conditional render can't provide. `main` is `expo-router/entry`; `App.tsx`/`index.ts` are retired. `src/app/_layout.tsx` is the root layout (headerless by default — index/onboarding are full-bleed); `src/app/settings/_layout.tsx` is a nested stack that opts back into a themed header for the "drilling in and backing out" screens |
| Background audio session | `react-native-audio-api`'s own `AudioManager` (iOS `playback` session category + interruption event observation) + `PlaybackNotificationManager` for a minimal lock-screen indicator | Confirmed 2026-08-24, Phase 7a — the declarative background-mode config (iOS `UIBackgroundModes`, Android foreground service) is already free via this same library's Expo config plugin (defaulted on, already listed in `app.json`); this is the runtime activation + interruption-detection half, closing the gap Phase 2b's `pause`/`resume` deliberately left open |

## Entities

```
Settings 1---1 Preset      (Settings.activePresetId → Preset.id, nullable,
                             meaningful only when mode = "preset")
Preset   *---* Punch       (logical reference only — Preset.sequence: number[]
                             holds Punch.num values, NOT a foreign key;
                             resolved at read time, falls back to a generic
                             "Punch " + num label if the number no longer
                             exists — extraction doc §1.5)
Punch    *---1 VoiceClip   (resolved by normalized text key, e.g. "Lead
                             Hook" -> "lead_hook" -- NOT Punch.id. Numbers
                             and defense/movement words resolve the same
                             way with no owning Punch at all. Generated
                             on first use if missing -- see PRD §10)
```

- **`Settings`** — singleton record (one per device, no accounts). Fields:
  `rounds`, `workDuration`, `restDuration`, `warmupDuration`, `mode`
  (`"random" | "preset"`), `activePresetId`, `comboGapMin`, `comboGapMax`,
  `speechRate` (0.25–4.0), `appVolume`, `announceStyle`
  (`"name" | "number"`, PRD §10), `defenseCuesEnabled`,
  `defenseCueGapMinSec`/`defenseCueGapMaxSec` (independent of
  `comboGapMin`/`Max` — a deliberately separate timing knob, PRD §10 use
  case 12), `hasCompletedOnboarding` (Phase 7b — gates the
  `/onboarding` redirect in `src/app/index.tsx`, never re-shown once
  true). Persisted via MMKV, defaults
  applied via `Object.assign(createDefaultSettings(), parsed)` — same
  zero-migration pattern as the old app.
- **`Punch`** — `{ id: string (uuid), num: number, name: string }`.
  **`id` is the primary key, not `num`** — `num` is explicitly allowed to be
  non-unique and non-sequential (extraction doc §1.6), so nothing may treat
  it as a stable identifier. Default-seeded set uses lead/rear (not
  left/right) naming so a name stays correct across a stance switch — see
  `PROJECT_FACTS.md`.
- **`Preset`** — `{ id: string (uuid), name: string, sequence: number[] }`
  (sequence values are `Punch.num`, resolved to live names at call time).
- **`VoiceClip`** — keyed by **normalized text**, not `Punch.id` (revised
  2026-08-24, Phase 5a — the original punch-keyed design didn't account
  for numbers or defense/movement words needing clips with no owning
  Punch). `{ id: string (uuid), key: string, filePath: string, source:
  "bundled" }` in practice — `"bundled"` clips are a static compile-time
  asset map (`src/features/speech/service.ts`'s `BUNDLED_CLIPS`), not
  persisted. **The `"tts-generated"` (cached) source is not built and
  not currently plannable**: confirmed 2026-08-24, Phase 5c — no
  available library (`expo-speech`, `react-native-tts`) can synthesize
  TTS to a file, only live-play it, so there is nothing to cache. A word
  outside the bundled bank instead falls through to live `expo-speech`
  playback every time it's spoken, through the OS's own audio output,
  not this app's `AudioContext`/WSOLA bus — see `PROJECT_FACTS.md` for
  the tradeoffs accepted and the native-module path not taken.
- **`SoundAsset`** (bell, clapper, warning) — bundled app resources, not
  user-editable data. Referenced by filename from `Settings`, not modeled
  as its own persisted entity. Defense/movement cues (PRD §10, Phase 5d)
  follow this same non-persisted, fixed-set pattern rather than `Punch`'s
  user-editable CRUD.
- **Timer/session state** (current phase, round number, remaining time,
  paused flag) — runtime-only, lives in app state (Zustand/Context), never
  persisted. This is the direct RN equivalent of the old app's DOM-free
  `state.js`/`timer.js` split.

No indexes: at the scale of a few dozen records total (punches, presets),
array lookups are sufficient — formal indexing would solve a problem this
app doesn't have.

## Phase 10+ entities: Workout Templates

Added 2026-08-23, planned for build *after* the v1 boxing-timer roadmap
(Phases 1–9) ships — see `ROADMAP.md` Phase 10+. Purely additive:
`Settings`/`Punch`/`Preset` above are untouched, and the existing
quick-start (Settings-driven) session flow keeps working exactly as
already built.

- **`WorkoutTemplate`** — a saved, user-editable, whole-session config
  bundle. Same relationship to a session that `Preset` has to a combo
  sequence, one level up. `{ id, name, isBuiltIn, workoutType: "boxing" |
  "assault-bike-cognitive", config }` — `config` is one of the two shapes
  below, discriminated by `workoutType`. Built-ins (`isBuiltIn: true`)
  are ordinary editable rows, not specially locked — there's no stated
  need to protect them from edits.

- **`BoxingConfig`** — `{ baseWorkDurationSec, baseRestDurationSec,
  warmupDurationSec, baseComboGapMinSec, baseComboGapMaxSec, roundPlan:
  RoundConfig[] }`. A "uniform" template (e.g. the Relax/Moderate/Intense
  built-ins) is simply a `roundPlan` where every round has the same
  `{ type: "random" }` comboSource and no overrides — the round-by-round
  case and the uniform case are the same data shape, not two systems.

- **`RoundConfig`** — one entry per round, in order:
  `{ label?, note?, workDurationSec?, restDurationSec?, comboGapMinSec?,
  comboGapMaxSec?, comboSource }`. Per-round fields override the
  template's base values when set (e.g. a "championship round" running
  longer than the rest). `note` is a coaching-reminder string displayed
  on screen during that round — **visual only, not spoken aloud** (an
  assumption, not explicitly confirmed — flag if wrong). `comboSource` is
  one of:
  - `{ type: "fixed-punch", punchNum }` — one punch repeated (e.g. jab-only)
  - `{ type: "fixed-sequence", sequence: number[] }` — a fixed combo repeated
  - `{ type: "preset", presetId }` — draws from a saved `Preset`
  - `{ type: "random", punchPool?: number[] }` — random draw from a
    manually chosen subset, or the full punch list when `punchPool` is
    omitted

  All punch references use `Punch.num` (not `id`), matching `Preset`'s
  existing resolve-at-call-time-with-graceful-fallback pattern — one
  resolution mechanism for the whole app, not two.

- **`AssaultBikeConfig`** — `{ roundsTarget, workSec, rest: RestPlan }`,
  where `RestPlan` is discriminated:
  `{ kind: "plain", restSec }` or
  `{ kind: "drill", settleSec, drillSec, resetSec, drillMode, difficulty }`.

  *Revised in Phase 12* from a flat `{ restSec, restPhases, drillMode,
  drillType, difficulty }`. Three changes, each for a stated reason:

  1. **`restSec` dropped** (Phase 11a) — it duplicated the sub-durations
     that the state machine actually reads, with no distinct purpose.
  2. **The rest plan became a union** (Phase 12a) — the four real
     protocols don't share a rest shape. Anaerobic Lactic Capacity (20s
     all-out / 10s easy spin) has no room for a drill, and encoding that
     as `{settleSec: 10, drillSec: 0, resetSec: 0}` would both fake a
     phase that means something else on screen and leave nonsense states
     expressible. `drillMode`/`difficulty` sit inside the drill arm for
     the same reason: a plain rest has no difficulty to set.
  3. **`drillMode` and `drillType` collapsed into one field** (Phase
     12a) — two fields encoded a single choice and could drift apart.

  Two drills ship: **Odd One Out** (uniform grid, one tile differs) and
  **Color Call** (multi-colour grid, one colour named aloud — reuses the
  Phase 5 speech pipeline). Corner Commands, briefly shipped in 11d, was
  removed: calling defensive movements aloud assumed the rider would
  perform them, which means dismounting and remounting mid-rest. The
  other drill variants from the reference protocol remain deferred, not
  designed away. Difficulty is still one fixed value per template rather
  than the reference protocol's per-round auto-scaling — the *trial
  window* self-scales instead (see `assaultBike/scoring.ts`).

  **No bike hardware integration** (confirmed) — the app only runs
  timing and the cognitive drill; watts/RPM stay on the bike's own
  console. **No stats/history persisted** (still confirmed) — Phase 12b
  added a live score and an end-of-session summary card, but both are
  in-memory only: no storage write, no backend, gone when the screen
  unmounts.

## Deferred decisions (written down on purpose, not forgotten)

- **Accounts/multi-user/sync backend.** Not built in v1 (PRD §2, §4). The
  entity model above uses app-generated UUIDs specifically so it could
  later sync to a real backend without renumbering — but no backend, auth
  provider, or sync protocol is chosen yet. Decide this if/when accounts
  become an actual v1 target, not before.
- **App Store submission.** iOS build target is in scope; actual App Store
  release is not, pending an Apple Developer Program account (PRD §6).

## Security baseline (applied to this stack)

- No backend, no auth, no third-party API keys — most of the usual
  checklist doesn't apply to a fully local, offline app.
- MMKV storage is left unencrypted — proportionate, since nothing
  persisted here is sensitive (workout timer settings and punch names, not
  health data or PII).
- The on-device TTS fallback for custom punch names runs entirely locally;
  no network call, keeping the offline-first constraint intact even on
  that path.
- If accounts/sync are added later (see "Deferred decisions"), this
  section must be revisited before any user data leaves the device —
  auth and any new remote data access should go through `security-baseline`
  at that time, not be bolted on informally.

## Folder structure

```
src/
  features/
    timer/            # phase state machine, tick loop, once-per-second
                       # latches, true pause/resume (extraction doc §1.1-3)
      components/
      service.ts
      types.ts
    comboEngine/       # random/preset generation, punch-number -> name
                       # resolution (extraction doc §1.4-7)
      service.ts
      types.ts
    settings/          # settings UI, punch editor, preset editor
      components/
      service.ts
    audio/              # bell/clapper/warning playback via
                       # react-native-audio-api
      components/
      service.ts       # gain -> compressor -> destination bus
                       # (extraction doc §1.11-12)
    speech/            # bundled VoiceClip lookup + pitch-preserving
                       # playback (0.25x-4x); live (uncached) on-device
                       # TTS fallback for anything not bundled -- no
                       # library can synthesize TTS to a file (5c)
      service.ts
      types.ts
    defenseCues/       # fixed 6-word defense/movement cue set (roll,
                       # slip, duck, pivot, check, clinch) -- selection +
                       # independent gap-timing only, not mixed into
                       # comboEngine (PRD §10 use case 12)
      service.ts
      types.ts
    session/           # Phase 6a: the running-session orchestration layer
                       # -- owns what pure engines alone can't (re-arming
                       # comboGapMin/MaxSec after each combo, arming
                       # defenseCues' independent timer), coordinating
                       # timer+comboEngine+defenseCues+speech+audio.
                       # sessionTick mirrors tick()'s pattern: a pure
                       # decision fn returning actions, consumed by the
                       # untested useSession.ts effect loop that makes
                       # the actual native calls.
      components/      # CountdownRing, PhaseBadge, RoundCounter,
                       # ComboCard, ControlRow, SettingsGear,
                       # AudioErrorBanner -- the Main Timer screen's
                       # sub-components, built against
                       # docs/design-direction.md's locked contract
      service.ts        # sessionTick + decideInterruptionAction (Phase
                       # 7a's pure pause/resume decision for native
                       # audio-focus interruptions -- never auto-resumes
                       # a pause the user triggered manually)
      types.ts
      theme.ts         # "The Corner's Stopwatch & Bell" color/font tokens
      useSession.ts    # native audio/speech wiring + the 200ms poll loop
                       # + backgroundAudio.ts's interruption subscription
  shared/              # cross-feature UI primitives (populated once
                       # design direction is set)
  lib/
    storage.ts         # MMKV wrapper - single source of truth for
                       # persistence
    gapTiming.ts        # nextGapFireTime -- shared clamped-random-window
                       # primitive (extraction doc §1.2), used by
                       # timer's firstComboAt and defenseCues alike
    backgroundAudio.ts # Phase 7a -- activates the iOS background audio
                       # session + interruption event observation via
                       # AudioManager, plus a minimal lock-screen/
                       # notification-shade "session running" indicator
                       # via PlaybackNotificationManager. Declarative
                       # config (UIBackgroundModes, Android foreground
                       # service) is separately covered by
                       # react-native-audio-api's own Expo config plugin
                       # (app.json), not this file. Also exports
                       # requestNotificationPermission (Phase 7b's
                       # Android 13+ runtime prompt).
  app/                 # expo-router file-based routes (Phase 8a) -- thin
                       # screens that assemble features, no business logic
    _layout.tsx        # root layout: font loading + SafeAreaProvider
                       # (moved here from the retired App.tsx) + a
                       # headerless Stack (index/onboarding are
                       # full-bleed per docs/design-direction.md)
    index.tsx          # route "/" -- the flagship Main Timer screen
                       # (Phase 6a's content, unchanged); holds the
                       # design-direction.md contract as its opening
                       # comment per Impeccable's Step 5 format.
                       # Redirects to /onboarding first if
                       # Settings.hasCompletedOnboarding is false,
                       # before useSession()'s native engines ever spin up
    onboarding.tsx     # route "/onboarding" -- first-launch-only gate
                       # (Phase 7b, docs/user-flows.md Flow 1), same
                       # locked visual world. router.replace("/") when
                       # done (not push, so there's no back-stack entry
                       # pointing back here)
    settings/
      _layout.tsx      # nested stack, themed header + back arrow --
                       # the "drilling in and backing out" part of the
                       # app (docs/user-flows.md's navigation
                       # convention), unlike index/onboarding's headerless
                       # full-bleed screens
      index.tsx        # route "/settings" -- Phase 8a shipped this as a
                       # placeholder only (proves the gear icon reaches
                       # a real, back-navigable screen); the real form
                       # (docs/user-flows.md Flow 3) is a following pass

```

**Layer rule, enforced by file location, not discipline:**
- Components render and handle interaction only — never call MMKV, the
  filesystem, or a native audio API directly, and never contain business
  rules (timing math, combo resolution, rate calculations).
- `service.ts` files hold business logic and own every outbound call
  (storage, filesystem, native audio APIs). Anything reaching outside the
  component tree lives here.
- `app/` screens stay thin — assemble feature components, call feature
  services, no logic of substance.
- Any entity's data lives in exactly one feature; audio and speech are
  kept as separate features (not merged into one "sound" feature) because
  they have meaningfully different lifecycles — `audio` plays static
  bundled assets, `speech` generates/caches per-punch clips and applies
  runtime time-stretching.

## Open item to confirm before native project setup

`appId: com.gary.cornerman` is permanent and tied to the existing Play
Store listing (extraction doc §1.18) — confirm explicitly when scaffolding
the Android project that this rebuild continues under the same listing
rather than starting a fresh one, since that identifier cannot change
afterward without losing the existing listing.
