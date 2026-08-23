# Cornerman — Design Direction

Status: decided with user, 2026-08-23, via `/impeccable new-work`. Seed
key `ca58d365` (mode: operate). This is a decision record, not
`DESIGN.md` — per Impeccable's process, `DESIGN.md` is written at
*finish*, from the actually-built world, once the first real screen
exists and passes review. This file exists so that first build (inside
the `feature-planner` loop) inherits a fully committed direction instead
of defaulting to something generic.

## How this was chosen

Mode: **Operate** (task completion — starting/monitoring a workout, not
persuasion). Physical scene (forces dark-vs-light, per the process — never
a default): home training, evenings, mixed/artificial light. Aesthetic
bound set by the user: no playful/gamified visual language — this is a
serious tool, not a game.

Seven candidate visual systems were drawn from boxing/combat-sports
culture (not generic fitness-app culture), spanning real material
families — corner-man's scorecard, taped gym-gear labels, vintage fight-
poster typography, the ring itself, a judge's tally sheet, a trainer's
analog stopwatch & bell, stenciled gym signage. `concept-seed.mjs --scope
direction --mode operate` assigned **"The Ring"** (ropes/canvas/turnbuckle)
as the roll's pick. Six dealt challengers (jet-age ticket wallet, console-
dashboard atmosphere, nixie-tube lab counter, two truncated/unweighed,
origami-crane sequence) were fused against it on audience-identification
and product-clarity; only the nixie-tube world held competitive. A "MY
PICK" card — **"The Corner's Stopwatch & Bell"** — was added since it
wasn't the roll's assignment. Presented to the user across all four (The
Ring, the pick, the nixie-tube challenger, and the category-standard
standing exit); **the user chose the pick.**

No image-generation tool was available this session, so this ran as the
text/fact-card version of the decision (no rendered comps) — disclosed to
the user before they chose, not after.

## The direction contract

*(To be copied verbatim as the opening comment of the first built screen
— `App.tsx` or `features/timer/components/MainTimer.tsx`, whichever ends
up hosting the Main Timer screen — per Impeccable's Step 5 format.)*

**THESIS:** A timer built to look like what a corner-man actually holds
in their hand mid-fight — an analog stopwatch and a brass ring bell — not
another phone-screen fitness app. Refuses the neon-gradient HIIT-timer
default and the sterile wellness-app opposite alike.

**OWN-WORLD:** Gunmetal/brass instrument-panel dark ground (not book-
cream, not neon-black-with-glow). Brass-amber carries every active/
interactive element — the one accent, restrained-strategy palette,
chosen specifically because it reads clearly in a dim evening room.
Enamel-white for tick marks, dial numerals, and secondary labels.
Numerals and dial-style display type: **Barlow Condensed** (open, road-
sign/stenciled-numeral heritage — literally descended from license-plate
and highway-signage type, which is the real-world "stamped into metal"
character this world calls for). Body/label text: **Inter** — plain,
workhorse, appropriate for an Operate surface where legibility outranks
personality in running text. Motion: sweep-hand-style continuous easing
for the countdown (never a digital blink), a genuine bell-strike moment
at phase changes (round end, rest end) — mechanical and earned, never
bouncy or gamified.

**STORY:** The user glances down mid-round and reads phase, time
remaining, and round count in under a second, the way they'd glance at
a real stopwatch — then looks back up and keeps training. Audio (spoken
combos, bell, clapper) carries the session; the screen exists for the
moments eyes actually land on it.

**FIRST VIEWPORT** (Main Timer, Ready state): Full-bleed gunmetal-dark
ground. Center-dominant stopwatch-face countdown (~40-50% of vertical
space), sweep-ring around the duration. Round counter reads as a small
lap-dial readout ("Round 1/10"); phase badge reads as an engraved-style
plate ("READY"). The Start button is the one obvious primary action —
large, brass-amber, everything else recedes to gunmetal/enamel-white.
Settings gear sits quiet in a top corner, non-competing. Combo card is
absent in Ready state (nothing to show yet) — appears only once Work
phase begins.

**FORM:** "The Corner's Stopwatch & Bell" — the MY PICK card, chosen by
the user over the assigned roll ("The Ring"). Seed key `ca58d365`.

**FINISH:** unreviewed and undocumented is unfinished; this build ends
with the finish review, the verdict, and DESIGN.md.

## What happens next

This direction is now locked for the first build. Per the standing
workflow, the next steps are `roadmap-planner` (to sequence phases,
now informed by both `docs/user-flows.md` and this direction), and then
the `feature-planner` build loop — where the Main Timer screen gets
actually built against this contract, inspected (native simulator/
emulator screenshots), reviewed by the finish reviewer, and `DESIGN.md`
gets written from the real, shipped result.
