# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

Ships as a native build on both iOS and Android (required for real
background-audio support — see Capabilities and Constraints), so both
platform references are relevant for native mechanics (safe areas,
gestures, permission flows, audio session behavior). **The visual design
language itself is explicitly unified, not per-OS** — one consistent
custom look and interaction set on both platforms, confirmed by the user
during init specifically to avoid a split identity (e.g. the iOS-style
scroll picker is used on both platforms, not gated to iOS).

## Users

Single user type: the developer, training solo (boxing/combat shadow-
work with a bag or pads). No accounts or multi-user model in this
version — the app is built for one person's own workouts. Architecture
leaves room for accounts later, but no other audience is designed for now.

## Product Purpose

A boxing combo timer: configurable round/rest/warmup timing, spoken
combo call-outs at a controllable rate, and authentic round/rest audio
cues — built to keep running while the phone is backgrounded or locked,
so training continues uninterrupted while the phone is put away (camera,
music app, or locked screen).

This is a full rebuild of an existing working app (vanilla JS/Capacitor),
driven by three things at once: real process debt in the old codebase, a
genuinely unsolved technical requirement (fast spoken call-outs without
pitch distortion), and real product frustrations hit in actual training
use (messy layout, weak/inauthentic sounds, no background operation,
clunky duration input).

## Positioning

Not competing on a feature checklist against generic interval-timer apps
— the mechanism a generic timer can't truthfully copy is genuinely
hands-free operation during a real workout: spoken, unattended combo
call-outs continuing reliably through backgrounding, locking, and
interruptions, at a speech rate that goes well beyond what on-device TTS
can normally do without distortion (0.25x–5x via pre-recorded clips +
pitch-preserving time-stretch, not live TTS).

## Operating Context

Used mid-workout, one-handed or hands-free, phone often set down or
pocketed while the user is actively training (shadow boxing, bag work).
The user is not looking at the screen for most of a session — audio
(spoken combos, bell, clapper) carries the actual information; the visual
UI matters most at the configure-and-start moment before a session, and
at a glance during it. Often used alongside another app playing music
(e.g. Spotify) at a lower volume, with Cornerman's own cues needing to
stay clearly audible on top of that.

## Capabilities and Constraints

- Fully offline — no network dependency for any core training flow.
- Background/locked-screen audio is a hard requirement, not a nice-to-
  have — this is why the app is a native React Native build via EAS/dev-
  client rather than a web app or Expo-Go-only project.
- No accounts, no login, no server — all data lives on-device (MMKV +
  filesystem for audio assets).
- No Apple Developer Program account yet — iOS build is in scope for
  this work, but App Store submission is explicitly out of scope for
  this build phase.
- `com.gary.cornerman` is the permanent app identifier, continuing an
  existing Play Store listing from the old app.
- Combo speech uses pre-recorded/cached voice clips + real time-
  stretching, not live TTS, specifically to hit a 0.25x–5x rate range
  without the pitch ("chipmunk") distortion live TTS produces at extreme
  rates. Bell/clapper/warning sounds are real recorded/licensed samples,
  not synthesized and not AI-generated.
- Explicitly out of scope for this version (desired later, not now):
  workout history/stats/streaks, social/sharing, coach/trainer mode,
  wearable integration, and any data migration from the old app (this
  rebuild starts fresh).

## Brand Commitments

Product name: **Cornerman**. No other binding brand assets (logo,
established color identity, tagline) exist yet — the old app had a
"dark boxing-gym palette (canvas/chalk/red/gold tokens), Oswald + Inter"
visual identity, but this was explicitly never confirmed as a deliberate
brand decision and the user has called the old layout "messy." Treat the
old visual identity as evidence/anti-reference only, not a constraint to
preserve — the actual visual direction is decided in `new-work`, not here.

## Evidence on Hand

- `docs/MIGRATION_EXTRACTION.md` — documents proven business logic and
  real lessons from the old app (timing engine behavior, combo/preset
  logic, audio tuning history, native/deployment gotchas). Treat as
  factual project history, not marketing evidence.
- `docs/PRD.md` — full requirements: user types, use cases, out-of-scope,
  success metrics, constraints, edge cases, MoSCoW prioritization.
- `docs/user-flows.md` — complete 7-screen inventory, navigation
  convention, and every error/empty state already mapped.
- `ARCHITECTURE.md` — stack, entities, folder structure (owns the tech
  stack; not repeated here — see Stack note below).
- No testimonials, case studies, press, or user-facing marketing content
  exist or are needed — this is a personal-use app, not a marketed product.

## Product Principles

1. **Audio is the real interface.** Most of a session happens without
   eyes on the screen — spoken combos, bell, and clapper are the primary
   information channel, not a secondary enhancement to a visual timer.
2. **Never require staying in the app.** Background/locked-screen
   reliability isn't a feature among others — it's the thing that makes
   the rest of the app worth using during an actual workout.
3. **No learning curve, ever** — per the standing UX floor: one obvious
   primary action per screen, recognition over recall, generous
   whitespace, low chrome. A user who has trained with this app for years
   should never need to think about the interface.
4. **Real over synthesized, when it's audible.** Bell/clapper cues and
   combo speech both moved toward real recorded audio specifically
   because synthesized/live-TTS approximations were judged inauthentic
   in actual use — this preference should hold across future audio work too.
5. **Configuration stays out of the way of training.** Settings, punch
   editing, and preset building are all real, sometimes multi-step flows
   — but none of them sit on the critical path between opening the app
   and starting a workout.

## Accessibility & Inclusion

No formal accessibility standard has been established for this version
(single personal user, not a broad audience). The one concrete,
confirmed need is physical/situational, not assistive-tech-driven:
the app must be usable one-handed and largely eyes-free mid-workout,
which already shapes the product principles above.
