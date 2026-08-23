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
- [x] **1b. MMKV storage layer + Settings/Punch/Preset data model** —
  `done` — types, CRUD service, zero-migration defaulting
  (`Object.assign(defaults, parsed)` pattern). Test-first per
  `CLAUDE.md`'s testing standard; 8 tests passing.

## Phase 2 — Timer Engine

*(correctness-critical — test-first per `CLAUDE.md`)*

- [x] **2a. Phase state machine + tick loop** — `done` —
  once-per-second latches for the 10s work warning and rest countdown;
  Ready/Warmup/Work/Rest/Finished transitions. 12 tests passing.
- [x] **2b. True pause/resume + interruption handling** — `done` —
  exact remaining-time preservation on pause (mechanism only; actually
  detecting a call/audio-focus interruption is Phase 7's native wiring,
  per `docs/user-flows.md` Flow 2). 9 tests passing.

## Phase 3 — Combo Engine

*(correctness-critical — test-first per `CLAUDE.md`)*

- [x] **3a. Random + preset combo generation** — `done` — shared
  `Array<{num, name}>` shape contract regardless of mode. Settings
  gained `comboLengthMin/Max` and `randomPunchPool` (user-customizable
  combo length and punch pool, per explicit request). 13 tests passing.
- [x] **3b. Punch resolution + first-combo timing** — `done`, absorbed
  elsewhere rather than built separately: punch-number → live-name
  resolution (`resolvePunchName`) turned out to be a hard dependency of
  3a's shared output shape, so it shipped there instead of separately;
  first-combo timing's clamped gap window was already built in 2a as
  timer-adjacent state (`firstComboAt`). Nothing left to build here.

## Phase 4 — Audio Engine

- [x] **4a. Audio bus + sourced sound assets** — `done` —
  `react-native-audio-api` gain → WaveShaper limiter → destination
  chain (this library has no `DynamicsCompressorNode` yet — see
  `PROJECT_FACTS.md`), wired to timer phase events via
  `mapEventToCue`. Bell/clapper/countdown-tick assets are silent
  placeholders pending manual sourcing — see
  `assets/audio/SOURCING.md`; the actual gain/limiter tuning also
  awaits a real by-ear pass once real assets + a device are in hand.
  13 tests passing (56/56 total).

## Phase 5 — Speech Pipeline

*(highest technical risk — new mechanism, no prior art in the old app)*

- [x] **5a. VoiceClip data model + bundled playback** — `done` — scope
  expanded 2026-08-24 (`docs/PRD.md` §10): default punches renamed to
  lead/rear + Body Hook added (`num: 7`); `src/features/speech/`
  resolves any text to a bundled clip by normalized key
  (`normalizeToKey`/`resolveBundledClip`, pure + tested) covering a
  33-word bank (numbers, 9 punches, 12 kicks, 6 defense words) generated
  by `scripts/generate_voice_bank.py` (Kokoro TTS, dev-machine only —
  not run on-device). Committed WAVs are silent placeholders pending
  that script actually being run (no Python in this environment, same
  gap as Phase 4a's sound assets). 10 new tests (66/66 total).
- [ ] **5b. Pitch-preserving time-stretch, 0.25x–5x** — `not started`.
- [ ] **5c. On-device TTS fallback + caching for custom punches** —
  `not started` — loading/error states per `docs/user-flows.md` Flow 4;
  last-punch delete guard belongs here too; also the fallback path for
  any word (including a number) outside 5a's bundled bank.
- [ ] **5d. Number announce-style + defensive/movement cue layer** —
  `not started`, added 2026-08-24 (`docs/PRD.md` §10 use cases 11-12) —
  `announceStyle: "name" | "number"` setting; defense/movement cues as
  an independent random-gap-timed layer during Work phase, deliberately
  not mixed into `Combo`/`comboEngine`. Depends on 5b/5c existing since
  it reuses the full speech pipeline, not just bundled lookup.

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

# Phase 10+ — Workout Templates & Assault-Bike Cognitive Protocol

Added 2026-08-23 (`docs/PRD.md` §9, `ARCHITECTURE.md`'s Phase 10+
entities). **Sequenced after Phase 9 ships**, per explicit confirmation
— this is a real scope expansion, not a revision of the v1 plan above,
and doesn't delay it. Inherits the `DESIGN.md` locked in Phase 6; no new
visual-world decisions here (see risk check below).

## Phase 10 — Workout Templates (boxing round-by-round programming)

- [ ] **10a. `WorkoutTemplate`/`RoundConfig` data model + storage** —
  `not started` — extends the Phase 1b settings feature; per-round
  comboSource resolution (fixed-punch/fixed-sequence/preset/random)
  follows the same resolve-at-call-time pattern as `Preset`.
  Correctness-adjacent (extends already-tested combo
  generation/resolution) — test-first.
- [ ] **10b. Templates Picker screen** — `not started` — built-ins +
  custom, start-directly-on-tap, edit as a separate action.
- [ ] **10c. Round Builder / Template Editor screen** — `not started` —
  inline expandable round cards (add/reorder/edit), not a per-round
  sub-screen.
- [ ] **10d. Wire timer/combo engines to a `roundPlan`** — `not started`
  — Main Timer consumes per-round duration/gap/comboSource overrides
  when a template-driven session is active; existing Settings-driven
  quick-start (Phases 1–9) keeps working unchanged.
  - [ ] `/impeccable audit` (Templates Picker + Round Builder)

## Phase 11 — Assault-Bike Cognitive Protocol

- [ ] **11a. `AssaultBikeConfig` data model + built-in template** —
  `not started`.
- [ ] **11b. Assault-Bike Session screen** — `not started` — work phase
  + rest's three sub-phases (Settle → Drill → Reset); visually distinct
  from the boxing Main Timer.
- [ ] **11c. Visual drill: Odd-One-Out** — `not started` — grid, tap
  detection, live (unlogged) reaction-time display.
- [ ] **11d. Auditory drill: Corner Commands** — `not started` — reuses
  the Phase 5 speech pipeline with real corner-cue vocabulary.
  - [ ] `/impeccable audit`

## Phase 12 — Templates Phase Close

- [ ] **Phase close: `/impeccable critique` + `/impeccable polish`** —
  `not started` — Templates Picker, Round Builder, and Assault-Bike
  Session judged together for visual consistency with each other and
  with the rest of the app.

---

## Design-system risk check (per this skill's own process)

No later phase redefines core visual tokens/theme after Phase 6 —
Phase 6 is where `DESIGN.md` gets written from the real build, and
Phases 8–9 **and 10–12** inherit it rather than introducing new
visual-system decisions. No re-polish-earlier-phases item is needed.

## Handoff

Phase 2 (Timer Engine), Phase 3 (Combo Engine), Phase 4 (Audio Engine),
and 5a (bundled voice-bank lookup + playback) are complete. Next
sub-phase to build is **5b** (pitch-preserving time-stretch, 0.25x–5x).
5d (number announce-style + defensive/movement cue layer) was added
2026-08-24 and comes after 5b/5c. Phase 10+ is planned and written down,
but confirmed to build *after* Phase 9 ships. Run `/feature-planner` for
5b when ready. As each sub-phase completes, mark it `done` here and log
the matching entry in `CHANGES.md`.
