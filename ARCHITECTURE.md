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
| Audio engine | `react-native-audio-api` (Web Audio API port for RN) | Lets the existing `masterGain → DynamicsCompressor → destination` bus (extraction doc §1.11) and tone/noise synthesis approach carry over directly instead of being reinvented |
| Combo speech | Pre-recorded `VoiceClip` per punch, spliced per combo, played back with pitch-preserving time-stretching (WSOLA/phase-vocoder) for a continuous 0.25x–5x rate | Live TTS distorts pitch at extreme rates by nature (the "chipmunk" artifact, extraction doc §1.10/§5.4) — time-stretching real recorded audio is the only mechanism that hits a wide rate range without it |
| Custom-punch speech fallback | One-time on-device TTS synthesis, cached locally as a `VoiceClip` (`source: "tts-generated"`), then played through the same time-stretch pipeline | Preserves free punch renaming (extraction doc §1.6) without needing a recording for every possible custom name |
| Audio assets (bell/clapper/warning) | Real recorded/licensed samples — Freesound.org (CC0) first, AudioJungle (one-time purchase) fallback | User-confirmed requirement: authentic, not synthesized or AI-generated (PRD §6) |
| Local persistence (Settings/Punch/Preset metadata) | MMKV | Fast, synchronous key-value storage; directly mirrors the old app's zero-migration `Object.assign(defaults, parsed)` pattern (extraction doc §1.13) |
| Audio file storage | App document directory (filesystem) — MMKV holds only metadata/file paths | Binary audio doesn't belong in a JSON-blob key-value store |
| Backend | None — fully local, offline-first | No accounts/login in v1 (PRD §2); nothing needs a server |
| Auth | None in v1 | Single-user, no accounts — see "Deferred decisions" below for what happens if this changes later |
| Hosting/distribution | Google Play Console (existing `com.gary.cornerman` listing, carried forward) + Apple App Store (deferred — no Developer account yet, PRD §6) | Both platforms are in scope for the build; actual submission is explicitly out of scope for this phase |

## Entities

```
Settings 1---1 Preset      (Settings.activePresetId → Preset.id, nullable,
                             meaningful only when mode = "preset")
Preset   *---* Punch       (logical reference only — Preset.sequence: number[]
                             holds Punch.num values, NOT a foreign key;
                             resolved at read time, falls back to a generic
                             "Punch " + num label if the number no longer
                             exists — extraction doc §1.5)
Punch    1---1 VoiceClip   (Punch.id → VoiceClip.punchId; generated on first
                             use if missing)
```

- **`Settings`** — singleton record (one per device, no accounts). Fields:
  `rounds`, `workDuration`, `restDuration`, `warmupDuration`, `mode`
  (`"random" | "preset"`), `activePresetId`, `comboGapMin`, `comboGapMax`,
  `speechRate` (0.25–5.0), `appVolume`. Persisted via MMKV, defaults applied
  via `Object.assign(createDefaultSettings(), parsed)` — same zero-migration
  pattern as the old app.
- **`Punch`** — `{ id: string (uuid), num: number, name: string }`.
  **`id` is the primary key, not `num`** — `num` is explicitly allowed to be
  non-unique and non-sequential (extraction doc §1.6), so nothing may treat
  it as a stable identifier.
- **`Preset`** — `{ id: string (uuid), name: string, sequence: number[] }`
  (sequence values are `Punch.num`, resolved to live names at call time).
- **`VoiceClip`** — `{ id: string (uuid), punchId: string, filePath: string,
  source: "bundled" | "tts-generated" }`. Audio data lives on the
  filesystem; this record is just the pointer + provenance.
- **`SoundAsset`** (bell, clapper, warning) — bundled app resources, not
  user-editable data. Referenced by filename from `Settings`, not modeled
  as its own persisted entity.
- **Timer/session state** (current phase, round number, remaining time,
  paused flag) — runtime-only, lives in app state (Zustand/Context), never
  persisted. This is the direct RN equivalent of the old app's DOM-free
  `state.js`/`timer.js` split.

No indexes: at the scale of a few dozen records total (punches, presets),
array lookups are sufficient — formal indexing would solve a problem this
app doesn't have.

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
    speech/            # VoiceClip lookup, TTS-fallback generation +
                       # caching, time-stretch playback (0.25x-5x)
      service.ts
      types.ts
  shared/              # cross-feature UI primitives (populated once
                       # design direction is set)
  lib/
    storage.ts         # MMKV wrapper - single source of truth for
                       # persistence
    backgroundAudio.ts # native background-session config (iOS
                       # UIBackgroundModes, Android foreground service)
  app/                 # navigation entry, thin screens that assemble
                       # features - no business logic

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
