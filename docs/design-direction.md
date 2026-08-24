# Cornerman — Design Direction

Status: **redesigned** 2026-08-24, superseding the original 2026-08-23
decision below. The user saw the original gunmetal/brass palette
rendered on a real device for the first time and asked for a different
world -- not a hypothetical revisit, a direct reaction to the actual
build. Per Impeccable's redesign process, this is a pinned direction
(the user named it explicitly), which beats a `concept-seed.mjs` roll
outright -- no dice round was run for this pass. Went through three
corrections the same day, each from direct user feedback after seeing
the previous pass rendered: (1) the initial ask, "dark background +
orange accent, like Claude/VS Code," first read as one orange accent
used throughout every mode; (2) the user clarified their actual
Light/Dark modes are literally black-and-white, no color, so orange was
stripped from both -- but that also (wrongly) stripped it from
everywhere, including the "System" option, which just aliased to
whichever of Light/Dark the OS reported; (3) the user pointed out System
specifically should still show the Claude/VS Code look. **The settled
model**: `system` IS the Claude/VS Code-style dark+orange look, fixed
(not OS-linked) and shown by default; `light`/`dark` are explicit,
genuinely monochrome overrides. The original decision record (below the
divider) stays in the file as evidence/anti-reference, not deleted; the
retired palette is what the current one is a reaction against.

## The redesign contract (current)

Two structural questions were asked and answered before any code
changed, since "dark background + orange accent" alone doesn't decide
either:

1. **Keep the analog-dial motifs, recolored** (sweep-ring countdown,
   engraved-style phase badge, lap-dial round counter, bell-strike
   animation) -- confirmed over flattening to a chrome-less Claude/VSCode-
   style layout (cards/lists/no dial imagery). The "stopwatch you glance
   at mid-round" identity survives; only the palette and type changed.
2. **Typography splits by role, not a blanket monospace swap.** Barlow
   Condensed retired entirely in favor of Inter for every stylized
   display/label use (section titles, phase badge text, button labels,
   punch names) -- these are words, not digits. JetBrains Mono is
   reserved specifically for actual numeral readouts: the countdown
   timer, wheel-picker values, slider values, num badges. This is the
   one deliberate "developer tool" touch, not a wholesale font swap.

**THESIS:** A timer that still reads as a tool you glance at mid-round
-- the corner-man's analog-stopwatch dial retained -- recolored out of
the gunmetal/brass instrument-panel world into a code-editor-style
register, with three real appearance modes rather than one locked dark
world.

**OWN-WORLD:** Three distinct palettes behind the Settings > Appearance
toggle, not "two palettes + an OS-linked auto option":
- **System** (default) -- the Claude/VS Code-style look: near-black
  ground, one orange accent (`#EA580C`) carrying every active/
  interactive element. Fixed, not OS-dependent.
- **Light** / **Dark** -- explicit overrides, genuinely monochrome, no
  orange or any other accent hue (`#FFFFFF`/`#171717` light,
  `#121212`/`#F2F2F2` dark). `accent` equals `textPrimary` in each, so a
  filled "accent" button/badge is really an inverted monochrome one
  (Dark: white fill, black label).

`danger` is the one deliberate exception across all three -- red for
real error states, kept even where the rest of the palette is
monochrome. Primary/muted neutral text tokens (`textPrimary`/
`textMuted`) replace the old enamel-white/enamel-muted naming now that
they're genuinely dynamic. Display/label text: Inter. Numerals: JetBrains
Mono (see above). Motion unchanged from the original contract:
sweep-hand-style continuous easing for the countdown (never a digital
blink), a genuine bell-strike moment at phase changes -- mechanical and
earned, never bouncy or gamified.

**STORY:** Unchanged -- the user glances down mid-round and reads phase,
time remaining, and round count in under a second, then looks back up
and keeps training. Audio carries the session; the screen exists for the
moments eyes actually land on it.

**FIRST VIEWPORT:** Unchanged in composition from the original contract
(full-bleed dark ground, center-dominant countdown, lap-dial round
counter, engraved-style phase badge, large accent-colored Start button,
quiet settings gear) -- only the palette and type resolve differently
now (monochrome inverted-fill accent instead of brass, Inter/JetBrains
Mono instead of Barlow Condensed/Inter).

**FORM:** Redesign of "The Corner's Stopwatch & Bell" (original seed key
`ca58d365`) -- pinned by explicit user direction, not a roll.

**FINISH:** unreviewed and undocumented is unfinished; this build ends
with the finish review, the verdict, and `DESIGN.md`. Still outstanding
as of this redesign (same standing gap as before it): real on-device
visual confirmation of the new palette (no simulator/screenshot
capability in this environment), and the deliberate `/impeccable audit`
+ Phase 8 close's `critique`/`polish` passes.

## Implementation

`src/shared/theme/tokens.ts` + `ThemeContext.tsx` (new) replace the old
static `src/features/session/theme.ts` (deleted) -- see
`PROJECT_FACTS.md` for the full token map, the `Settings.themeMode`
field, and why `ThemeProvider` owns theme state at the root rather than
through the usual per-screen `settings`/`onChange` flow.

---

## Original decision (2026-08-23, retired) -- kept as evidence/anti-reference

Status: decided with user, 2026-08-23, via `/impeccable new-work`. Seed
key `ca58d365` (mode: operate). This is a decision record, not
`DESIGN.md` — per Impeccable's process, `DESIGN.md` is written at
*finish*, from the actually-built world, once the first real screen
exists and passes review.

### How this was chosen

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

### The original direction contract (retired -- see above for current)

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
