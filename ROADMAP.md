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
- [ ] **1b. MMKV storage layer + Settings/Punch/Preset data model** —
  `not started` — types, CRUD service, zero-migration defaulting
  (`Object.assign(defaults, parsed)` pattern). Correctness-adjacent per
  `CLAUDE.md`'s testing standard (settings persistence) — write tests
  first.

## Phase 2 — Timer Engine

*(correctness-critical — test-first per `CLAUDE.md`)*

- [ ] **2a. Phase state machine + tick loop** — `not started` —
  once-per-second latches for the 10s work warning and rest countdown;
  Ready/Work/Rest/Finished transitions.
- [ ] **2b. True pause/resume + interruption handling** — `not started`
  — exact remaining-time preservation on pause; auto-pause/resume on a
  call or audio-focus loss (`docs/user-flows.md` Flow 2).

## Phase 3 — Combo Engine

*(correctness-critical — test-first per `CLAUDE.md`)*

- [ ] **3a. Random + preset combo generation** — `not started` — shared
  `Array<{num, name}>` shape contract regardless of mode.
- [ ] **3b. Punch resolution + first-combo timing** — `not started` —
  punch-number → live-name resolution with graceful fallback; first
  combo of a round uses its own clamped gap window, not the general range.

## Phase 4 — Audio Engine

- [ ] **4a. Audio bus + sourced sound assets** — `not started` —
  `react-native-audio-api` gain → compressor → destination chain;
  bell/clapper/warning sourced from Freesound/AudioJungle, wired to
  timer phase events.

## Phase 5 — Speech Pipeline

*(highest technical risk — new mechanism, no prior art in the old app)*

- [ ] **5a. VoiceClip data model + bundled playback** — `not started`.
- [ ] **5b. Pitch-preserving time-stretch, 0.25x–5x** — `not started`.
- [ ] **5c. On-device TTS fallback + caching for custom punches** —
  `not started` — loading/error states per `docs/user-flows.md` Flow 4;
  last-punch delete guard belongs here too.

## Phase 6 — Main Timer Screen

*(flagship first surface — the locked direction gets built for the first
time here; ends with the Impeccable finish review and `DESIGN.md` written
from the real, shipped result)*

- [ ] **6a. Main Timer screen, all states** — `not started` — wired to
  Phases 2–5; built against `docs/design-direction.md`'s contract
  ("The Corner's Stopwatch & Bell").
  - [ ] `/impeccable audit`

## Phase 7 — Background Audio + Onboarding

- [ ] **7a. Native background session config** — `not started` — iOS
  `UIBackgroundModes: audio`, Android foreground service; verified
  against the already-working Phase 6 screen.
- [ ] **7b. Onboarding/permission screen** — `not started` —
  first-launch only, per `docs/user-flows.md` Flow 1.
  - [ ] `/impeccable audit`

## Phase 8 — Settings + Punches + Presets

*(inherits the now-locked `DESIGN.md` — no new visual-world decisions)*

- [ ] **8a. Settings screen** — `not started` — scroll picker for
  durations, independent volume slider, 0.25x–5x rate dial.
- [ ] **8b. Punches screen** — `not started` — add/rename/delete,
  TTS-generation loading/error states.
- [ ] **8c. Presets List + Preset Editor** — `not started`.
- [ ] **Phase close: `/impeccable critique` + `/impeccable polish`** —
  `not started` — all three screens judged together for visual
  consistency, not one at a time.

## Phase 9 — Platform Builds & Ship Readiness

- [ ] **9a. EAS build config, both platforms** — `not started` —
  confirm `com.gary.cornerman` continuity; real-device/simulator
  verification on iOS and Android.
- [ ] **Phase close: full-app `/impeccable polish`** — `not started` —
  whole-app pass, not per-section, before considering this
  production-ready.

---

## Design-system risk check (per this skill's own process)

No later phase redefines core visual tokens/theme after Phase 6 —
Phase 6 is where `DESIGN.md` gets written from the real build, and
Phases 8–9 inherit it rather than introducing new visual-system
decisions. No re-polish-earlier-phases item is needed.

## Handoff

First sub-phase to build is **1b** (MMKV storage layer + data model) —
run `/feature-planner` for it when ready. As each sub-phase completes,
mark it `done` here and log the matching entry in `CHANGES.md`.
