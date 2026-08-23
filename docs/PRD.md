# Cornerman — Product Requirements Document

Status: confirmed with user, 2026-08-23. Source input: [docs/MIGRATION_EXTRACTION.md](MIGRATION_EXTRACTION.md)
(what the existing vanilla-JS app already does and what's proven to work).
This document is the single source of product truth for the rebuild —
later planning steps (`app-architect`, `user-flow-mapper`, design
direction, `/impeccable init`) read this rather than re-asking.

---

## 1. Problem statement

Three problems, not one, are driving this rebuild simultaneously:

1. **Process debt** — the current app has no automated tests, no
   `PROJECT_FACTS.md`/PRD, and has lost session context between sessions
   more than once (see extraction doc §2). The logic is sound; the
   scaffolding around it isn't.
2. **A real unsolved technical requirement** — combos need to be spoken
   genuinely faster (real words-per-second), not just pitch-shifted, and
   this was never actually fixed in the current app (extraction doc §5.4).
3. **Real frustrations with the product itself in actual training use**:
   - The layout is messy and needs a real redesign, not incidental
     structure.
   - The bell/clapper sounds don't sound authentic ("doesn't even sound
     like a boxing ring type") and aren't loud enough during real use.
   - The app can't survive being backgrounded — switching to camera or
     Spotify, or locking the phone, stops it, when the entire point is to
     keep training while it calls out combos unattended.
   - Setting round/rest duration in fixed 15-second increments is
     clunky; wants an iOS-style continuous scroll picker instead.

This is a rebuild in the full sense: same proven core logic (extraction
doc §1), rebuilt product experience, rebuilt process discipline.

---

## 2. User types

**Single user type for v1: the developer, training solo.** Same as the
current app — no accounts, no multi-user model. This is a deliberate
decision, not an oversight: the app is being redesigned and rebuilt
regardless, but real Play Store/App Store distribution to other people
is explicitly not the driver for this version.

**Constraint on how this gets built, not a v1 feature:** the
architecture should leave room for an accounts/multi-user model later
(e.g. don't hard-code single-user assumptions so deep that adding
accounts means a rewrite) — but no login, no accounts, no per-user data
model ships in v1.

---

## 3. Core use cases

1. **Configure and start a timed round session.** Set number of rounds,
   work duration, rest duration (via an iOS-style continuous scroll
   picker, not fixed increments), warmup, combo mode (random or preset),
   combo gap range, and speech rate — then start.
2. **Train hands-free while backgrounded.** Lock the phone, or switch to
   the camera app or Spotify, and the timer keeps running: round/rest
   phases still transition, the bell/clapper still sounds, and combos are
   still spoken aloud, without the app in the foreground.
3. **Hear combos called out clearly at real speed.** Spoken call-outs
   need to support a genuinely faster words-per-second rate as a
   separate dial from how often a new combo is called (the gap), without
   the "chipmunk" pitch artifact the current Web Speech API approach
   risks at high rates.
4. **Hear authentic, loud round/rest audio cues.** The 10-second warning
   clapper and the round-end bell need to sound like real boxing-gym
   sounds (not synthesized approximations), and need their own
   independent in-app volume control so they stay loud and clear even
   when Spotify or another music app is playing quietly in the
   background.
5. **Adjust settings through a cleaner, less messy interface.** Same
   underlying settings (round/mode/sounds/combinations/timing/punches,
   per extraction doc §1.14's confirmed order) but a genuinely redesigned
   layout/UX — the bottom-sheet pattern itself is open to
   reconsideration, not a locked requirement.
6. **Keep training through interruptions.** A phone call or another app
   taking audio focus pauses the timer exactly where it is (true
   pause/resume, matching extraction doc §1.3) and resumes automatically
   once the interruption ends.
7. **Use the app fully offline.** No network dependency for any core
   training flow.

---

## 4. Explicitly out of scope for v1

**Won't have (this version):**
- User accounts / login / multi-user data (architecture should allow it
  later; not built now)
- Workout history, stats tracking, streaks, or session logging
- Social or sharing features
- Coach/trainer mode (someone else remotely configuring your workout)
- Wearable integration (watch, heart-rate monitor)
- Data migration/import from the old app's `localStorage` — the rebuild
  starts fresh with new defaults
- Automatic audio ducking of other apps (e.g. auto-lowering Spotify's
  volume when a cue fires) — solved instead by an independent in-app
  volume slider (see §3.4)
- Actual App Store / Play Store submission and release — the goal is to
  ship eventually, but not as part of this build phase (no Apple
  Developer account yet; existing Play Console listing already carries
  its own known blocker per extraction doc §1.20)

**Could have (liked, deliberately deferred, not v1):** workout
history/stats/profiles, social/sharing, coach mode, wearable
integration — all explicitly desired for a future version, just not
this one.

---

## 5. Success metrics

Since this is a personal tool, not a product with customers to count,
success is measured by real-use reliability and actual adoption over the
old app:

1. **Background reliability** — across real workout sessions, backgrounded/
   locked-screen audio (bell, clapper, spoken combos) never silently
   drops out.
2. **Speech quality** — combo call-outs are clearly intelligible at a
   genuinely faster rate than the current app supports, with no
   chipmunk/pitch artifact, at whatever rate ends up being the practical
   ceiling for the chosen TTS/audio approach.
3. **Actual replacement** — the rebuild is what actually gets used for
   real workouts going forward, not left running alongside or reverted
   to the old app.
4. **Perceived UX quality** — the app reads as genuinely cleaner and more
   user-friendly than the current layout, judged subjectively by the
   user in real use (no numeric target — this is a real but qualitative
   bar).

---

## 6. Constraints

- **Platforms: iOS and Android, both.** The current app is Android-only
  (`com.gary.cornerman`); iOS is new scope for this rebuild.
- **Offline-first.** Must be fully usable with no network connection.
- **Background audio is a hard requirement**, which rules out
  approaches that can't get real OS-level background audio session
  support — this is a load-bearing constraint on the stack choice
  `app-architect` will need to make explicitly, not a detail to default
  past.
- **No Apple Developer Program account yet.** Shipping to the App Store
  is the eventual goal but is explicitly not happening in this build
  phase — treat as a known future blocker, the same way the extraction
  doc already logs the Play Console PH-card issue (§1.20).
- **Audio assets must be real/licensed, not AI-generated "slop."**
  Preferred sourcing: Freesound.org (filter CC0) first; AudioJungle
  (Envato, one-time per-SFX purchase) as a fallback if nothing free
  sounds right. No ongoing subscription cost for audio assets.
- **No timeline/deadline.** Open-ended personal project — build it
  right rather than rushing to a date.
- **`appId: com.gary.cornerman` stays permanent** if this rebuild
  continues under the same Play Store listing (per extraction doc §1.18)
  — confirm this explicitly at `app-architect` time if the Android
  identity is carried forward.

---

## 7. Edge cases / failure states

| Use case | Failure scenario | Required behavior |
|---|---|---|
| Backgrounded training (§3.2) | Phone call arrives, or another app takes audio focus | Timer auto-pauses (true pause, preserving exact remaining time per extraction doc §1.3) and auto-resumes once the interruption ends |
| Backgrounded training (§3.2) | Aggressive OS-level battery optimization kills background execution anyway (known real-world issue on some Android OEMs) | Not solvable in-app beyond correct platform setup; acceptable to surface a one-time onboarding tip (e.g. "disable battery optimization for this app") rather than pretend it's guaranteed on every device |
| Settings/session start | User picks an invalid/edge duration on the scroll picker (e.g. 0) | Picker enforces a sane minimum, same spirit as the existing gap floor (extraction doc §1.7) being an intentional limit, not a bug |
| Speech (§3.3) | Device/OS lacks a TTS voice capable of the target rate | Degrade to the best available rate on that device rather than failing silently or crashing |
| Volume (§3.4) | Device media volume is at zero or muted | In-app volume slider only controls the app's own relative output; it cannot un-mute the device — this is an accepted platform limitation, not a bug to solve around |
| Fresh start (§4) | User expects old presets/punches to appear | None carry over by design (confirmed decision) — new defaults on first launch |

---

## 8. Feature prioritization (MoSCoW)

**Must have (v1):**
- Round/rest timer core (phase transitions, once-per-second warning/
  countdown latches, true pause/resume) — carried over proven logic
  from extraction doc §1.1–§1.3
- Random combo mode + preset combo mode with live punch-name resolution
  and decoupled punch numbering — carried over from extraction doc §1.4–§1.6
- Combo-gap frequency control, including the intentional 0.5s "Blitz"
  floor — carried over from extraction doc §1.7
- Genuinely faster spoken combo rate without chipmunk pitch artifact
  (the real, previously-unsolved requirement — extraction doc §5.4)
- Background/locked-screen audio continuation (bell, clapper, spoken
  combos) via real OS background audio session support
- Auto-pause/resume on call or audio-focus interruption
- Authentic-sounding, louder bell and clapper cues, sourced from real
  recorded samples (not synthesized)
- Independent in-app volume slider for the app's own sounds, separate
  from device media volume
- iOS-style continuous scroll picker for round/rest/warmup duration
  (replacing fixed 15s-increment controls)
- Redesigned, cleaner, more user-friendly layout — bottom-sheet settings
  pattern open to reconsideration, not locked
- Settings persistence with zero-migration auto-defaulting, matching the
  proven pattern in extraction doc §1.13
- Full offline usability
- iOS + Android native builds

**Should have (v1, but not launch-blocking on day one):**
- Wider variety in sound cues beyond bell/clapper (explicitly named as
  the least important of the audio complaints)
- Settings section reorganization beyond the current confirmed order
  (extraction doc §1.14), if the redesign calls for it

**Could have (explicitly desired, deferred to a future version):**
- Workout history / stats / streaks
- Social / sharing features
- Coach/trainer mode
- Wearable integration
- Accounts / multi-user support (architecture should allow, not built)
- **Workout templates + assault-bike cognitive protocol — now actually
  planned, see §9.** Unlike the other items on this list, this one has a
  real architecture (`ARCHITECTURE.md`'s Phase 10+ entities) and a
  roadmap slot (`ROADMAP.md` Phase 10+) — deferred in sequence (after
  v1 ships), not deferred in the sense of "someday, unplanned."

**Won't have (v1):**
- Any data migration from the old app
- Automatic ducking of other apps' audio
- App Store / Play Store submission as part of this build phase

---

## 9. Addendum: Workout templates + assault-bike cognitive protocol

Added 2026-08-23. A real scope expansion surfaced after v1 planning was
already confirmed, not a revision of it — v1 (§1–§8 above) is unchanged
and still ships first (`ROADMAP.md` Phases 1–9); this is Phase 10+.

**Use case 8 — Run a structured, round-by-round programmed workout.**
Instead of one uniform combo behavior for a whole session, a
`WorkoutTemplate` can specify a different focus per round (e.g. round 1
jab-only at technical pace, round 2 a fixed 1-2, round 3 the user's real
saved combos, round 4 a manually-picked body-work punch pool, round 9 a
longer "championship round"), with an optional on-screen coaching note
per round. Four built-ins ship (Relax/Zone-2, Moderate, Intense, Assault
Bike Cognitive); users can also create and edit their own — see
`ARCHITECTURE.md`'s Phase 10+ entities for the full data model.

**Use case 9 — Run an assault-bike cognitive-motor HIIT session.** A
different workout modality entirely (10s all-out bike intervals, 50s
rest split into settle/cognitive-drill/reset sub-phases), pairing
physical fatigue with a reaction/decision task (visual grid or spoken
corner-command drills) — Brain Endurance Training, not combo timing.
Scoped for the first build to one visual drill (Odd-One-Out) and one
auditory drill (Corner Commands), fixed difficulty rather than
per-round auto-scaling, and explicitly **no bike hardware integration**
(app handles timing + drill only) and **no stats/history logging**
(reaction time/accuracy is live-display-only) — both confirmed
decisions, not oversights, consistent with §4's existing history/stats
deferral.

**Out of scope for this addendum specifically:** the other 12 drill
variants from the reference protocol, `mixed` drill mode, per-round
difficulty auto-scaling, and any bike sensor connectivity — all
explicitly deferred, not designed away (see `ARCHITECTURE.md`).

---

## Handoff

`docs/PRD.md` is written and confirmed. Per the project's planning
workflow, the next step is **`app-architect`**, which should read this
file (and `docs/MIGRATION_EXTRACTION.md`) before naming entities or
proposing a folder structure — in particular, it needs to treat the
background-audio requirement (§6) as a genuine technical fork affecting
the stack choice, not a detail to default past. Per the personal
workflow rule to stop after planning rather than continue straight into
the next phase in the same turn, **`app-architect` is not being invoked
automatically** — run it (or ask for it) when ready.
