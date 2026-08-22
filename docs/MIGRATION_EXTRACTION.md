# Cornerman — Migration Extraction

Source: the current Cornerman repo as of 2026-08-23 (vanilla JS, ES modules,
`cornerman.html` + `css/` + `js/*.js`, Capacitor-wrapped for Android). This
document separates what was genuinely hard-won here from what's just
incidental structure, so a rebuild starts from proven requirements instead
of re-discovering them. It feeds `app-architect` for the new project — it
does not replace it.

**Note on this codebase's condition:** unlike a typical migration-extractor
target, this project is not actually messy. `CLAUDE.md` already documents a
clean module split (state/timer/ui/comboEngine/storage/audio/speech, each
with one job), and the code matches that description. The "keep" list below
is long; the "structural debt" list is short and honest about that.

---

## 1. Keep — real business logic

### Timing engine

1. **Discrete-event latches inside a fast poll loop.** The countdown ticks
   every 200ms (`setInterval(tick, 200)`), but the 10-second work warning
   and the rest-phase "3-2-1" countdown must each fire exactly once per
   whole second, not ~5 times as the 200ms loop crosses that boundary. Solved
   with boolean/value latches (`state.tenWarned`, `state.lastRestCountdown`)
   that block re-firing until the phase resets. Any rebuild that still polls
   faster than the events it's reporting needs this same guard.
2. **First combo of a round fires sooner than the general gap range allows.**
   `startPhase("work", ...)` computes the first `nextComboAt` from a
   separately clamped `[500ms, 1500ms]` window instead of the user's full
   gap range, so the first call-out lands "a couple seconds in" regardless
   of whether the user has set a slow (10-20s) gap. A rebuild that just
   reuses the general gap range for the first combo will feel dead on
   startup for slow settings.
3. **Pause/resume preserves exact remaining time**, not phase restart —
   `state.remaining` stores `endTime - now` on pause, and resume recomputes
   `endTime` from it. Keep this if the new version still wants a true pause
   (as opposed to some frameworks' tendency to re-derive from wall-clock
   phase boundaries, which drifts on pause).

### Combo / preset logic

4. **Random and preset combo generation return the identical shape**
   (`Array<{num, name}>`), so nothing downstream (timer, speech, UI) needs
   to know which mode is active. Worth preserving as an explicit interface
   contract in the rebuild, not just an accident of the current code.
5. **Preset sequences resolve punch numbers to live punch names at call
   time**, not at save time — so renaming punch #2 from "Straight" to
   "Cross" automatically updates every preset that references `2`, with no
   migration step. If the referenced punch number was since deleted, it
   falls back to a generic `"Punch " + num` label rather than breaking:
   ```js
   return preset.sequence.map(function (num) {
     return punchByNum[num] || { num: num, name: "Punch " + num };
   });
   ```
6. **Punch number and punch name are deliberately decoupled.** Numbers
   don't have to be unique or sequential; the quick-fill preset dropdown
   only ever writes the name field, never the number. This was a real
   design choice (mix-and-match numbering), not an oversight — don't
   "clean this up" into an enforced 1:1 mapping in the rebuild.
7. **Combo-gap floor of 0.5s is an intentional speed-training ceiling, not
   a bug to clamp away.** This was walked back once already from a more
   extreme ask (see item 9) — 0.5–1s ("Blitz") is the deliberately-chosen
   edge of "genuinely too fast to keep up with," and combos are allowed to
   overlap in-flight speech at that setting (the next `speakCombo()` call
   cancels the previous utterance, so it reads as rapid-fire barking, which
   is the intended effect).

### Speech / audio

8. **`primeSpeech()`** — fires a near-silent, near-instant utterance on
   `start()` before the first real call-out. Some mobile browsers' Web
   Speech engines need to be "woken up" once before they'll reliably speak
   — without this, the first real combo can silently fail to speak on
   first use.
9. **Voice rate is hard-capped around 3x, not user-unlimited.** A user
   originally asked for "10x speed"; this was walked back after confirming
   real TTS engines become unintelligible noise well before that (topping
   out ~2.5–3x). Whatever speed dial the rebuild exposes, don't let a
   "more is better" UI imply arbitrarily high multipliers are usable —
   frequency (item 7) is the real lever for "faster," not raw voice rate.
10. **Pitch-compensation heuristic for the "chipmunk" artifact** —
    `pitchForRate()` nudges `utterance.pitch` down as rate climbs, to
    counter TTS engines that raise pitch as a side effect of naive
    resampling at higher `rate` values. **Explicitly marked unverified** —
    reasoned through, never confirmed against a real affected device. Keep
    the reasoning and the open question, not the fix itself as gospel — see
    §6 open items. The user has explicitly said not to ship a pitch-shift
    workaround as if it were the real fix; the real fix (if the artifact is
    confirmed) is likely pre-recorded audio + real time-stretching.
11. **Shared audio bus**: every tone routes through one
    `masterGain → DynamicsCompressor → destination` chain so overall
    loudness can be boosted (gain 2.6x) without clipping when multiple
    tones overlap (compressor threshold −16dB, ratio 8:1, tuned by ear
    across sessions, not a first guess). A rebuild that creates ad hoc
    gain nodes per sound will re-introduce the clipping problem this
    solved.
12. **Percussive (non-tonal) sounds need noise, not oscillators.** The
    UFC-style "clapper" 10-second warning is synthesized filtered white
    noise (`noiseBurst()` — buffered noise through a bandpass filter with a
    fast decay), because a pure oscillator tone physically cannot produce a
    dry "crack." Same principle applies to the "ring" bell pattern: real
    struck metal rings at inharmonic partials (ratios like 2.4×, 3.1×,
    4.3×, 5.8× the fundamental, each with its own decay), not clean integer
    harmonics — a plain multi-oscillator chord reads as a synth chime, not
    a bell.

### Settings / storage

13. **New settings fields auto-default for existing users with zero
    migration code** — `storage.js` does `Object.assign(settings, parsed)`
    onto `createDefaultSettings()`'s output, so adding a field to the
    defaults object is sufficient; there's no versioned-migration system
    and none has been needed. Worth keeping this pattern (or its equivalent
    in whatever persistence layer the rebuild picks) rather than building a
    formal migration framework this app has never actually required.
14. **Settings-sheet section order is a confirmed product decision, not
    default order**: Round → Mode → Sounds → Combinations (random OR
    presets, depending on mode) → Combo Timing (always visible) → Punches
    (hidden entirely in Presets mode). This was explicitly reorganized and
    user-confirmed at least twice in project history — don't let a rebuild
    silently re-flatten it back to insertion order.

### Native / deployment

15. **`cornerman.html` vs `www/index.html` is a deliberate naming split**,
    not duplication: GitHub Pages serves `cornerman.html` directly (existing
    bookmarks and `manifest.json`'s `start_url` depend on that exact name),
    while Capacitor's native shell requires the file be named exactly
    `index.html`. `build.js` reconciles this by copying+renaming on every
    build. A rebuild that unifies these into one filename will break
    whichever platform assumed the other name.
16. **The build always wipes `www/` before regenerating it**
    (`fs.rmSync(WWW, {recursive:true, force:true})`) so a renamed/deleted
    source file doesn't linger as a stale copy in the shipped bundle. Small,
    but was a real prior bug class.
17. **Service worker cache must be version-bumped on every code-changing
    release** (`CACHE_NAME` in `sw.js`) — it's cache-first for same-origin
    files, so without the bump, users (including the developer, testing)
    keep getting served stale JS/HTML after a successful deploy. This has
    caused real confusion across sessions; whatever the rebuild's caching
    strategy is, it needs an equivalently reliable "this is new content"
    signal, ideally automatic rather than a manually-remembered version bump.
18. **`appId: com.gary.cornerman` is permanent** — already tied to Play
    Store listing setup; changing it breaks that listing. Carries forward
    unchanged into any rebuild that still targets the same Play Store
    listing.
19. **Release keystore lives outside the repo** on the developer's machine,
    never committed. Same constraint applies to any rebuild.
20. **Play Console's $25 registration fee has rejected Philippine e-wallet
    (GCash/Maya) virtual cards as "prepaid."** Needs a real bank-issued card
    — an external/process blocker, not a code issue, but worth carrying
    forward as a known open item so it isn't re-discovered from scratch.
21. **`android/` is fully regeneratable via `npx cap add android`, but
    regenerating it loses anything not in version control** — this already
    happened once: a custom app icon/splash screen from earlier project
    history was lost when `android/` had to be freshly re-scaffolded, and
    `versionCode` restarted at 1 with no way to know if a higher
    `versionCode` was already uploaded to Play Console. **Lesson for the
    rebuild: track `versionCode` and custom native assets (icon/splash)
    somewhere that survives an `android/` wipe** (e.g. noted in a durable
    doc, or keep source icon/splash files outside `android/` and have the
    build step re-apply them), not only inside the gitignored/regeneratable
    native project folder.

---

## 2. Don't carry over — structural debt

This list is short because the module boundaries (`state.js` /`timer.js`
DOM-free / `ui.js` sole-DOM-owner / `comboEngine.js` / `storage.js` /
`audio.js` / `speech.js`) are already the kind of separation `app-architect`
would recommend from scratch. The real debt is process/tooling, not code
organization:

- **No automated test suite.** Regressions have been caught by manual
  "Playwright-tested in a scratch sandbox during that session" one-off runs
  (per `CHANGES.md`, 2026-08-04 entry) rather than a persisted suite that
  runs automatically. Why it's debt: verification doesn't survive past the
  session that did it — the next session re-verifies by hand or not at all.
  Fix in the rebuild: correctness-critical logic (settings persistence,
  round/rest phase transitions, combo-mode switching) gets real automated
  tests per this user's own testing standard, not ad hoc manual passes.
- **No `PROJECT_FACTS.md` / `docs/PRD.md`.** Durable decisions (the
  voice-rate walk-back reasoning, the Blitz-mode intent, the settings
  section order confirmation) live scattered across dated `CHANGES.md`
  prose instead of a structured, queryable place. Why it's debt: finding
  "why is the gap floor 0.5s" means reading changelog archaeology instead
  of one lookup. This extraction document plus the rebuild's own
  `harness-setup` pass should close that gap going forward.
- **Recurring loss of session state between sessions.** `CHANGES.md` itself
  records at least two incidents where `CLAUDE.md`/`CHANGES.md` or the
  entire `android/` directory were referenced as if present but didn't
  actually exist on disk for that checkout. This isn't a code problem, but
  it's a real recurring failure mode worth structurally preventing (e.g. a
  harness/CI check that the docs referenced in `CLAUDE.md` actually exist)
  rather than trusting memory across sessions again.
- **`window.storage.get/set` fallback path in `storage.js` has no known
  provider.** It's referenced defensively (wrapped in try/catch, falls back
  to `localStorage`) but nothing in this repo — not `android/`, not
  `capacitor.config.json` — defines or injects a `window.storage` object.
  Likely either dead speculative code for a native bridge that was never
  wired up, or a leftover from an earlier experiment. **Flagging as a
  question for the user (§6), not silently dropping or silently keeping
  it.**

---

## 3. UI/UX inventory (please confirm)

**Screens/views — 2 total, both in one HTML page (no router):**
1. **Main timer screen** — round-progress lights, phase badge
   (Ready/Work/Rest/Finished), big countdown display, round counter
   ("Round 3/10"), combo card (numbers + spoken-word names), combo-count
   stat, and the Reset/Start-Pause/Settings control row.
2. **Settings sheet** — a bottom sheet that slides up over the main screen
   (not a separate route/page), containing, in this confirmed order: Round
   → Mode → Sounds → Combinations (Random or Presets editor, depending on
   Mode) → Combo Timing → Punches (hidden entirely when Mode = Presets).

**Navigation entry points — 2 total:**
1. Gear icon (opens the Settings sheet)
2. Settings sheet's own close paths: "Done" button and tapping the overlay
   background (both close back to the main screen — there's no
   deeper navigation than this one level)

**Layout convention:** bottom-sheet overlay for settings, not a separate
page/route. This reads as a deliberate one-handed-mobile-during-a-workout
choice (big tap targets, quick access without losing the main timer
underneath) — but it was never stated outright as a product decision
anywhere in the docs I read. **Please confirm: was the bottom-sheet pattern
a deliberate choice for mid-workout one-handed use, or just how it happened
to get built?** This determines whether the rebuild treats it as a locked
requirement or an open layout question.

---

## 4. Tech stack inventory

| Layer | Choice | Worked well? | Pain points |
|---|---|---|---|
| Language/framework | Vanilla JS, ES modules, no bundler, no TypeScript | Yes — zero build complexity, loads instantly, no framework churn | No compile-time type checking; `opts` objects and settings shape are informally documented only in comments |
| Persistence | `localStorage` only (with a dead/unconfirmed `window.storage` fallback, see §2) | Yes for a single-device offline app | None observed — no backend needed for this app's scope |
| Backend/DB | None — fully client-side | N/A | N/A |
| Auth | None — single-user, no accounts | N/A | N/A |
| Hosting (web) | GitHub Pages, serving `cornerman.html` directly | Yes, free and simple for a static PWA | `start_url`/bookmarks tie hosting to a specific filename (see §1.15) |
| Offline | Service worker, cache-first same-origin / network-first cross-origin | Works, but cache-invalidation is a manual version-bump step (see §1.17) | Manual `CACHE_NAME` bump is easy to forget |
| Native wrapper | Capacitor (`@capacitor/android`, `@capacitor/core`, `@capacitor/cli` ^8.4.2) | Works for wrapping the existing web build | `android/` had to be fully re-scaffolded once already, losing custom native assets (see §1.21) |
| Native distribution | Google Play Console, upload keystore stored outside repo | Not yet completed | Blocked on Play Console's $25 fee — PH e-wallet virtual cards rejected as prepaid (see §1.20) |
| Voice | Web Speech API (`SpeechSynthesisUtterance`) | Works, but engine-dependent | "Chipmunk" pitch artifact at high rates on some engines/devices, never confirmed on a real device (see §1.10); silently fails inside in-app browsers (Instagram/Messenger — documented as a real user-facing support issue in `README.md`) |
| Audio | Web Audio API, hand-synthesized tones/noise | Works well, tuned across sessions | None outstanding |
| Visual identity | Custom CSS, dark boxing-gym palette (canvas/chalk/red/gold tokens), Oswald + Inter via Google Fonts | Existing look works and is already token-based in `:root` | Not re-evaluated here — visual direction is a separate step (`design direction` in the personal workflow), not decided by this extraction |

---

## 5. Open questions — answered by user on 2026-08-23

1. **UI/UX inventory (§3)** — confirmed complete as written: 2 screens, 2
   nav entry points, bottom-sheet settings.
2. **Bottom-sheet settings layout** — **open to reconsidering.** Not a
   locked requirement; `app-architect`/design-direction steps are free to
   revisit this layout choice rather than treating it as inherited.
3. **`window.storage.get/set` fallback in `storage.js`** — **drop it.**
   Confirmed dead/speculative code with no real provider anywhere in the
   repo. The rebuild's persistence layer should not carry this forward;
   plain `localStorage` (or whatever the new stack's equivalent is) is
   sufficient, matching what §4 already shows working well.
4. **"Chipmunk" pitch artifact — clarified requirement, not just an open
   question.** The user's actual goal: **the voice itself needs to be able
   to speak combos genuinely faster** (real spoken words-per-second, not
   just a pitch illusion) **without chipmunk-pitching**, as a distinct
   difficulty dial from the inter-combo gap (§1.7, already solved/shipped).
   In other words: two *separate* speed levers are wanted —
   (a) how often a new combo is called (gap — done, ships today) and
   (b) how fast the call-out itself is spoken (rate — still broken).
   `pitchForRate()`'s pitch-compensation heuristic does not solve this: it
   was never verified to fix the artifact, and even if it did, cosmetically
   lowering pitch doesn't make the *words* arrive faster — it was always a
   band-aid on the symptom, not the requirement. **This is the moment to
   invest in the real fix** (e.g. pre-recorded/synthesized audio with true
   time-stretching, or a different TTS approach that supports genuine rate
   changes without the resampling side effect) rather than carrying the
   heuristic forward again. Flag this to `app-architect` as a real
   technical requirement/risk to design around, not a nice-to-have.
5. **Stack** — **open to reconsidering.** Vanilla JS worked well with no
   strong pain points found (§4), but the user does not want it assumed;
   `app-architect` should surface the stack choice as a genuine fork,
   informed by requirement 4 above (whatever solves real-rate speech
   without pitch distortion may itself push the stack choice — e.g. needing
   an audio-processing library or a different TTS integration than the
   plain Web Speech API).

---

## Handoff

This document is written to `docs/MIGRATION_EXTRACTION.md`. Per the
project's planning workflow, the next step is **`app-architect`** for the
actual rebuild — it should read this file first so the new project's
folder structure and entity naming start from these proven requirements
instead of from zero. Since this is a fresh start, it's also the natural
point to apply `harness-setup` and `security-baseline` properly from day
one rather than retrofitting them later.

All §5 questions are now answered (2026-08-23) and the document is
considered final. Per the personal workflow rule to stop after
planning/extraction rather than continue straight into the next phase in
the same turn, **`app-architect` is not being invoked automatically** —
run `/app-architect` (or ask for it) when ready to start the actual
rebuild plan; it should read this file first.
