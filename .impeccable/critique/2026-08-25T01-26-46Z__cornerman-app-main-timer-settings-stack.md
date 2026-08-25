---
target: Cornerman app (Main Timer + Settings stack)
total_score: 30
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
timestamp: 2026-08-25T01-26-46Z
slug: cornerman-app-main-timer-settings-stack
---
Method: dual-agent (A: Impeccable critique Assessment A · B: Impeccable critique Assessment B)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Ring/numeral/badge give continuous status; Preview playback has no playing/loading indicator |
| 2 | Match System / Real World | 4 | Boxing terminology throughout, no generic-fitness-app translation layer |
| 3 | User Control and Freedom | 3 | Undo on punch delete, Reset always available — undercut by presets having no undo at all |
| 4 | Consistency and Standards | 3 | Component styling highly consistent; Punches vs Presets treat destructive delete completely differently |
| 5 | Error Prevention | 3 | Last-punch guard, disabled Save until valid — preset delete has none of that rigor |
| 6 | Recognition Rather Than Recall | 2 | Punches list renders unsorted (jab/#1 buried at the bottom); two visually near-identical gap-slider pairs live in different sections with no distinguishing description |
| 7 | Flexibility and Efficiency | 3 | Deep configurability (rate 0.25x-4x, gap ranges, pool restriction, presets); no quick-adjust off Main Timer |
| 8 | Aesthetic and Minimalist Design | 3 | Clean, restrained, consistent — but 2 of the 4 named analog-dial motifs (phase badge, round counter) don't visually deliver on their "engraved plate"/"lap-dial" description |
| 9 | Error Recovery | 4 | AudioErrorBanner, preview-failure toast, preset save-failure text, last-punch Alert — all clear and actionable |
| 10 | Help and Documentation | 2 | Zero contextual help anywhere in Settings — bare field labels only |
| **Total** | | **30/40** | **Good** |

## Design Specificity Verdict

**LLM assessment**: Partially specific — the specificity concentrates in about half the pinned surface. The JetBrains Mono numeral treatment (dotted-zero glyph, actually visible in the rendered "3:00") and the sweep-ring's real remaining-duration-driven animation are genuine, verifiable fingerprints a generic timer clone wouldn't reproduce without deliberately choosing the same decisions. Domain vocabulary (JAB/CROSS/HOOK, "combos called," "Restrict punch pool") threads consistently through every screen. But two of the four motifs the design doc calls load-bearing don't deliver distinct visual identity in the actual build: `RoundCounter` ("lap-dial readout") renders as a single plain `<Text>` line with zero dial imagery, and `PhaseBadge` ("engraved-style plate") is a plain 1px-bordered rounded rectangle with no bevel/inset/texture. Strip the boxing copy from those two components and they're indistinguishable from any generic interval timer's phase label and rep counter. The Settings screen's interaction vocabulary (SectionCard + SegmentedControl + LabeledSlider + toggle-and-delete rows) is competent, well-executed, and entirely generic — a different timer app could lift it wholesale.

**Deterministic scan**: The bundled detector (`detect.mjs`) returned 0 findings / exit 0 against `src/`, but this is a tooling mismatch, not a clean bill of health — its ~55 regex rules target web CSS/Tailwind syntax (`font-family:`, `bg-gradient-to-`, HTML tags) and structurally cannot match React Native's camelCase `StyleSheet.create()` objects or JSX host components. No signal either way from the automated scan; the real deterministic evidence came from manual WCAG contrast math and grep-based touch-target/accessibility-label checks instead (see Priority Issues).

**Visual overlays**: Not applicable — this is a native mobile app with no browser/DOM target, so Impeccable's script-injection overlay flow doesn't apply. This was explicitly skipped rather than attempted and silently omitted.

## Overall Impression

The core thesis — a corner-man's analog stopwatch reborn as a dark-editor-register instrument — is real and mostly lands where it matters most: the countdown ring and its numeral. But the execution doesn't cover the full surface it claims. Two of the four "pinned" motifs read as generic defaults on close inspection, a computed-contrast pass found the app's own accent-dim token failing WCAG minimums everywhere it's used as a meaningful signal (not just decoration), and two independent assessments converged unprompted on the same two bugs (a real nested-VirtualizedList architecture problem, and an unsorted Punches list) — that kind of independent convergence is a strong signal these are real, not stylistic nitpicks. The single biggest opportunity: the app is one focused pass away from actually delivering on its own written design contract, not a redesign.

## What's Working

1. **The JetBrains Mono numeral treatment is a genuine, verifiable fingerprint.** The dotted-zero glyph is actually visible in the rendered "3:00" — a specific typographic decision (numerals-only monospace, reserved from all display/label text) that ties directly to the "developer-tool register" thesis rather than being a stock choice.
2. **Reduce Motion is implemented with real engineering thought, not a checkbox.** `CountdownRing` steps `progress.value` every 200ms (matching the numeral's own refresh cadence) instead of jumping once; `PhaseBadge` skips its pulse entirely. Both are independently correct.
3. **The punch-delete recovery pattern gets friction proportionate to risk exactly right**: a 5-second Undo banner for the routine case, a hard confirm dialog reserved for "Restore Defaults." Textbook — light where mistakes are cheap, heavy where they aren't.

## Priority Issues

**[P1] Preset deletion has no confirmation and no undo, unlike its sibling Punches screen**
- **Why it matters**: A preset is a hand-ordered, named punch sequence — real setup effort, arguably more than a single punch rename. Its delete control sits in the same row as edit-body and activate-radio, one mis-tap from permanent, silent loss on a device this app is explicitly designed to be used one-handed with. Punches got a 5-second Undo banner after direct user feedback about exactly this kind of loss on 2026-08-25; Presets never got the same pass.
- **Fix**: Reuse the existing `UndoBanner.tsx` component for preset deletion, matching the Punches pattern exactly.
- **Suggested command**: `/impeccable harden`

**[P1] `accentDim` fails WCAG contrast minimums everywhere it carries real meaning, not just decoration**
- **Why it matters**: Computed WCAG contrast (not estimated): `accentDim` on `background`/`panel` measures 2.80/2.49:1 (System), 2.11/1.88:1 (Dark), 1.48/1.36:1 (Light) — failing the 3:1 non-text-UI minimum in **all three themes**. This token is the WheelPicker's selection-indicator border (the primary visual cue for "this is your selected round/duration value"), the active-vs-inactive differentiator on punch-pool chips ("which punches are actually in my draw pool"), and the "·" separator color in the combo call-out card. In Light mode specifically it's nearly invisible (a #D4D4D4-equivalent border on white). This isn't a nice-to-have — it's the contrast carrying the actual selected-state signal on the app's most-used Settings control.
- **Fix**: Raise `accentDim` toward the ~3:1+ non-text minimum in all three palettes, or stop relying on it alone for state — pair it with a fill/weight change the way the primary Start/Save buttons already invert to full contrast.
- **Suggested command**: `/impeccable colorize`

**[P2] A real nested-VirtualizedList bug is visibly breaking the Settings screen, not just logging a dev warning**
- **Why it matters**: Both independent assessments flagged this from the same screenshot evidence — a red RN warning banner ("VirtualizedLists should never be nested inside plain ScrollViews...") appears fixed at the bottom of every mid/lower-scroll Settings screenshot, obscuring real section headings underneath it. The warning text describes a genuine React Native anti-pattern (almost certainly `WheelPicker`'s `react-native-wheely`, itself FlatList-based, nested inside the page-level `ScrollView`) that breaks virtualization and risks real scroll jank on lower-end Android hardware — this is a production correctness issue wearing a dev-only warning as its only visible symptom.
- **Fix**: Give `WheelPicker` a non-virtualized render path (it only ever shows a handful of rows) or restructure so the Round/Work/Rest/Warmup pickers aren't literally nested inside the outer ScrollView.
- **Suggested command**: `/impeccable harden`

**[P2] `CountdownRing` is hardcoded at a fixed 260dp, undershooting the design contract's own dominance target**
- **Why it matters**: `CountdownRing.tsx` line 17 hardcodes `SIZE = 260` rather than deriving from device dimensions. By dp math against a typical viewport, the ring occupies roughly 28% of screen height — well under `docs/design-direction.md`'s own stated "~40-50% of vertical space" target for what's supposed to be the single most load-bearing visual element in the app. Every Main Timer screenshot shows large unstructured black voids above and below the ring/badge block instead of the ring reading as visually dominant, which works against the product's own "glanceable in under a second" principle.
- **Fix**: Derive `SIZE` from `useWindowDimensions()` — a percentage of the shorter screen dimension, clamped — so the ring actually scales to its own written spec across device sizes.
- **Suggested command**: `/impeccable layout`

**[P2] Punches list renders unsorted, and the seeded "jab" name breaks the app's own casing convention**
- **Why it matters**: Both independent assessments caught this unprompted from the same screenshot. `punches.tsx` renders `punches.map()` with no sort by `num` — the actual rendered order is 2, 3, 4, 5, 6, 7, then **1 ("jab")** last, burying the single most fundamental punch (the one every combo notation starts from) at the bottom of its own list. Separately, "jab" renders lowercase while every seeded sibling ("Cross," "Lead Hook," etc.) is Title Case — a data/save-path inconsistency, reproducible across three separate screens (Combinations chips, Punches list, Preset Editor's punch picker), not a one-off render fluke.
- **Fix**: Sort the Punches list by `num` before rendering; auto-capitalize (or `.trim()` + title-case) punch names on save to match the seeded convention.
- **Suggested command**: `/impeccable clarify`

## Persona Red Flags

**Casey (Distracted, one-handed, phone often set down)**: The CountdownRing's unfilled track uses `colors.panel`, nearly indistinguishable from `colors.background` behind it. At a genuine half-second glance mid-round, the ring reads as "still basically full" until a large chunk of time has elapsed — the depletion signal exists but is low-contrast, meaning the numeral (not the ring, despite being the headline motif) carries almost all of the actual glanceable information. This partially defeats the point of a sweep-ring for exactly the persona this app is built around.

**Riley (Deliberate stress-tester)**: `PresetRow` puts activate (28×28pt), edit-body (full-width tappable), and delete (32×32pt + hitSlop 8) in one horizontal row with zero confirmation on delete — Riley mashing through rows quickly, or genuinely mis-tapping on real hardware, permanently destroys a built preset sequence with no recovery. This is exactly the failure mode this persona exists to surface, and it's the same gap as the P1 above from a different angle.

**Jordan (First-timer)**: Settings has zero contextual help anywhere (Heuristic 10 scored 2/4) — "Combo gap" and "Call-out gap" are two visually near-identical range-slider pairs sitting in different sections (Combo Timing vs. Defense Cues) with no distinguishing description, and "Restrict punch pool," "Defense Cues," and the 0.25x-4x speech-rate dial all assume the reader already knows what they do. With no in-app help affordance anywhere, a first session in Settings is guesswork beyond the bare field labels.

## Minor Observations

- **Real WCAG contrast failure on `danger` (delete/error red) over `panel`**: 4.26:1 in System/Dark modes — fails the 4.5:1 text minimum (passes 3:1 large-text/UI only). Used for destructive-action text; worth a small bump.
- **Four controls measure under the 44×44pt (iOS) / 48×48dp (Android) touch-target minimum**, computed from actual padding values: `SegmentedControl` (~31.6px, Mode + Announce Style toggles), `ChipMultiSelect`/`AddToSequenceRow` chips (~27.6px, punch-pool and preset-sequence chips), and the punch-number `TextInput`s in `PunchRow`/`AddPunchRow` (~30-38px).
- **Overlapping hitSlop risk in `PresetSequenceEntry.tsx`**: three adjacent icon buttons (▲▼✕) each carry `hitSlop={8}` in an 8px gap — the combined 16px encroachment means neighboring hit-zones overlap, a real RN gotcha (`hitSlop` doesn't check for neighbor overlap) that can cause mis-taps between Move-Up/Move-Down/Remove.
- **Two `Switch` controls have no `accessibilityLabel`** (`DefenseCuesSection.tsx`'s "Enabled" switch, `CombinationsSection.tsx`'s "Restrict punch pool" switch) — inconsistent with `PunchRow.tsx`'s own Switch, which does set one correctly. `WheelPicker` (used for Round/Work/Rest/Warmup — the app's primary Settings inputs) and `LabeledSlider` (used app-wide for every slider) have zero accessibility props at all despite both having a `label` already available to attach.
- `ComboCard`'s "·" separator uses the same low-contrast `accentDim` flagged in the P1 above — folds into that same fix.
- `SettingsGear` renders a bare Unicode "⚙" glyph rather than a vector icon from the app's own icon/type system — fine on this device/font, but a platform-rendering risk outside the app's control.
- The Finished state gets the same low-key `PhaseBadge` chip treatment as any mid-round phase change — no distinct positive framing for the single highest-stakes emotional moment in the product (completing a workout), beyond the combo count staying visible.

## Questions to Consider

1. If the corner-man is glancing at this screen for "under a second" mid-round per the design doc's own story, why does the ring occupy roughly a quarter of the screen instead of the ~40-50% the direction contract promised — was that number ever checked against a rendered device, or only against the original mockup composition?
2. Punches got a 5-second Undo banner and a confirm-gated "Restore Defaults" after direct user feedback about exactly this kind of loss — Presets never got the same pass. Was that a deliberate scoping call, or did Presets simply get missed?
3. Of the four "pinned, load-bearing" analog-dial motifs, two (phase badge, round counter) currently render as a plain bordered box and a plain text label. If you swapped them for the plainest default styling, would anyone looking at Main Timer actually notice the "instrument panel" thesis was gone — or is the sweep-ring alone carrying all of that identity right now?
