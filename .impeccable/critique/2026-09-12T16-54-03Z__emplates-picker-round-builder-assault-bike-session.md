---
target: "Phase 14 close: Templates Picker + Round Builder + Assault-Bike Session"
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
timestamp: 2026-09-12T16-54-03Z
slug: emplates-picker-round-builder-assault-bike-session
---
Method: dual-agent (A: general-purpose design-review subagent · B: degraded — detector ran inline, live-emulator visual evidence captured directly in this session rather than via a second isolated subagent, since driving a multi-minute native state machine screenshot-by-screenshot needed the accumulated visual context from each prior tap)

⚠️ DEGRADED (partial): Assessment B (detector + visual evidence) ran in the parent context rather than as a fully isolated second subagent. The deterministic detector (`detect.mjs`) genuinely ran and returned clean; the visual evidence is real screenshots from a freshly-built dev client on a booted Android emulator (Pixel_10, API level per current AVD), not reasoning-through-the-contract. Declaring this openly per this skill's own reporting rule.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | Ring, phase badge, round counter, trial timer bar, and live score readout all give continuous, glanceable status — confirmed live across Work/PHONE UP/Drill/PHONE DOWN/Finished. |
| 2 | Match Between System & Real World | 3 | "PHONE UP"/"PHONE DOWN" are excellent, confirmed on-device; Round Builder's abbreviated combo-source labels (RANDOM/FIXED/SEQ/COMBOS/PRESET) read as jargon shorthand, also confirmed on-device — cramped and uneven. |
| 3 | User Control and Freedom | 3 | Reset/back always reachable; no confirm before an in-progress Assault-Bike session's live score is discarded via back-nav. |
| 4 | Consistency and Standards | 2 | Assault-Bike hand-duplicates header theming that two `_layout.tsx` files centralize; confirmed on-device: Templates Picker renders a fully-disabled Edit icon on every Bike template *visually identical* to the working Edit icon on every boxing template — no dimming, no different affordance, nothing to tell a user the tap will silently do nothing. |
| 5 | Error Prevention | 3 | WheelPicker/RangeSliderPair structurally prevent invalid ranges; Round Builder's save gating is solid. |
| 6 | Recognition Rather Than Recall | 4 | Collapsed RoundCard always shows its own summary; DrillModePicker defaults sensibly from the template. |
| 7 | Flexibility and Efficiency of Use | 3 | Per-round override toggles and per-session drill choice (confirmed: Odd One Out / Color Call / None, all reachable from the pre-start screen) are good progressive disclosure. |
| 8 | Aesthetic and Minimalist Design | 2 | Confirmed on-device: the 5-way segmented control is visibly cramped (uneven gaps between RANDOM/FIXED/SEQ, "COMBOS" and "PRESET" nearly touching); Round Builder stacks bordered container inside bordered container beyond the app's own "low chrome" floor rule. |
| 9 | Help Recognize/Diagnose/Recover from Errors | 2 | Round Builder's save-error text has no live-region announcement, unlike `AudioErrorBanner`'s equivalent treatment elsewhere in the app. |
| 10 | Help and Documentation | 2 | No in-context help for comboSource types; the onboarding tour never covers Round Builder or Assault-Bike. |

**Total: 28/40 — Acceptable.** (70% — just at the Good/Acceptable boundary; several of the deductions are concrete and cheap to fix, not systemic.)

## Design Specificity Verdict

**LLM assessment (Assessment A):** This is not a generic timer skin. "PHONE UP"/"PHONE DOWN" gives a physical instruction instead of a phase name, the lap-dial counter and engraved-plate badge are still present and recolored (not replaced), and the two drill modes are genuinely bespoke to the "can't leave the saddle" constraint. Round Builder's combo-source editor is the one place the surface language goes generic (abstract config-panel jargon) even though the underlying model is boxing-specific.

**Live visual confirmation:** Holds up on-device. The dark/orange palette, JetBrains Mono numerals on the countdown ring, and Inter labels are consistent across all three screens exactly as `docs/design-direction.md` specifies. The Odd One Out grid's odd tile really does pop via a flat color-fill against otherwise-identical dark tiles — visually confirmed, and it does read as "spot the different one," matching the drill's intent.

**Deterministic scan:** `detect.mjs --json` against all three screen files returned zero findings (clean exit). No false positives to reconcile since nothing fired — but this detector appears largely web/CSS-oriented and may simply have limited purchase on React Native `StyleSheet` code; treat the clean result as "nothing it knows how to check," not as a clean bill of health on its own.

## Overall Impression

The three screens are visually coherent with the rest of the app and with each other — same palette, same type roles, same phase-badge/ring motif reused correctly on the bike screen. The biggest opportunity is Round Builder's combo-source picker: it's the single most form-dense moment in the app, and it's currently the one place a component is visibly used past its intended range (a 2-way toggle carrying 5 options). Fixing that one control would do more for this phase-close than any other single change.

## What's Working

1. **The theme-token system genuinely propagates with zero drift.** Confirmed across every screenshot captured (pre-start, Work, PHONE UP, Drill, PHONE DOWN, Finished, both Round Builder states) — no hardcoded colors slipping through outside the one documented Color Call exception (not itself re-tested here, but not touched by this pass).
2. **"PHONE UP"/"PHONE DOWN" is a genuinely well-considered, non-generic UX decision**, confirmed live — it reads instantly as an instruction, not a status label, exactly as intended.
3. **The Drill state machine's visual feedback loop (grid → tap → MISS/HIT → next trial) is fast and legible on real hardware timing**, not just in theory — trial windows visibly shrink turn to turn as designed.

## Priority Issues

**[P1] Round Builder's combo-source picker breaks Miller's Law on the app's most form-dense screen — confirmed on-device, visibly cramped.**
Why it matters: `SegmentedControl` is built and documented for 2-value toggles elsewhere in the app (Mode, Announce Style); pushed to 5 values here, the real rendered result has uneven internal spacing — "RANDOM" and "FIXED" sit close together, then a noticeably wider gap opens before "SEQ", and "COMBOS"/"PRESET" crowd the right edge. This isn't a hypothetical readability concern; it's visible on a real device screenshot.
Fix: split into a two-step choice (broad category, then specific mode) or switch to a chip/list picker with room to breathe — `PresetSourceEditor`'s own pattern lower in the same file is a ready model.
Screen: Round Builder (`src/features/workoutTemplates/components/RoundCard.tsx`).

**[P1] Header theming is centralized in two places and hand-duplicated in a third.**
`settings/_layout.tsx` and `templates/_layout.tsx` define the themed-header `screenOptions` once at the layout level; `assault-bike.tsx` copies the same four properties inline. Why it matters: the next header tweak lands in two files and silently misses this screen — a real drift risk, not an aesthetic nit.
Fix: extract a shared `useThemedHeaderOptions()` hook all three consumers call.
Screen: Assault-Bike Session (`src/app/assault-bike.tsx`).

**[P2] A fully disabled Edit icon renders identically to a working one — confirmed live, not just in source.**
On the real Templates Picker screenshot, every Bike template's Edit pencil is pixel-identical to every boxing template's Edit pencil, but the bike ones are `clickable="false"` in the actual view hierarchy — tapping it does nothing at all, silently. A user has zero visual cue that this icon behaves differently row to row.
Why it matters: this is heuristic #1 (visibility of system status) and #5 (error prevention) failing together — an interactive-looking control that quietly isn't, with no dimming, label, or explanation.
Fix: either dim/mute the icon for rows where editing isn't supported (matching how disabled controls render elsewhere, e.g. the greyed-out reorder arrows already used in Round Builder's own round list), or replace it with a small "Built-in" tag the way `comingSoon` templates were once handled in Phase 11.
Screen: Templates Picker (`src/app/templates/index.tsx`).

**[P2] Round Builder's "section title" renders at three different sizes on one screen** (SectionCard 15px, "ROUNDS" header 13px, "COMBO SOURCE" header 12px — same font, same accent color, same conceptual role). Fix: name and fix three concrete sizes in the token/style layer so the hierarchy is documented, not accidental.
Screen: Round Builder.

**[P2] Round Builder's save error is a second-class error state** — plain `<Text>`, no live-region announcement, unlike `AudioErrorBanner`'s equivalent treatment elsewhere. Fix: reuse that pattern.
Screen: Round Builder.

**[P3] No confirmation before losing an in-progress Assault-Bike session.** The header back arrow is always active, including mid-drill; pressing it silently discards the live score. Fix: gate the back action behind a lightweight confirm while a session is running and not yet finished.
Screen: Assault-Bike Session.

**[P3] The Drill grid's real-estate empties completely during MISS/HIT feedback** (confirmed on-device: the 3×3 grid area goes fully blank for the ~1-2s feedback window, then repopulates for the next trial) — momentarily reads like a rendering gap rather than a deliberate pause, especially the first time seen.
Screen: Assault-Bike Session.

## Persona Red Flags

**Distracted / one-handed mid-workout athlete** (PRODUCT.md's named primary persona):
- `DrillModePicker`'s options sit right at the pre-start decision point this persona hits one-handed, between sets — worth the same touch-target audit `SegmentedControl` already got after an on-device check flagged it.
- The back-arrow-discards-session issue (P3) is exactly this persona's failure mode: a stray touch, not a decision, during exactly the moment they're least likely to be looking at the screen.

**Precision tweaker configuring a template in advance** (the persona Round Builder is built for):
- The 5-way segmented-control misuse (P1) directly hits this persona hardest — it's the first decision inside every expanded round, confirmed visibly cramped on a real screen, not just described as risky in the abstract.
- The three-way section-title size drift (P2) makes the screen's own information hierarchy harder to scan precisely.

**Confused first-timer / returning after months** (secondary, but non-zero given the onboarding tour exists specifically because prior UX read as opaque):
- Nothing in Round Builder or Assault-Bike links back to the tour — a lapsed user landing directly on Round Builder's comboSource editor has no in-context bridge back to an explanation.

## Minor Observations

- Templates Picker has no empty-state branch (unlike the structurally parallel Presets List) — currently unreachable since built-ins guarantee non-empty, but a defensive-coding asymmetry between two otherwise-identical screens.
- The Finished summary's hero score renders in the same large orange numeral style whether the score is 126 or 0 — a genuinely zero-score session (confirmed live: `0`, `0%`, `0/126`) reads a little starker than it needs to in that treatment, worth a look at whether a distinct "no hits yet" framing would land better, though this is a real, accurate number and not a bug.
- `RoundCard`'s section headers have no `accessibilityRole="header"`, so a screen-reader user can't jump between subsections of an expanded card.

## Questions to Consider

1. If `SegmentedControl` is documented as a 2-value toggle, was pushing it to 5 values a conscious tradeoff against building a proper picker, or did it just grow past the component's intended range one option at a time?
2. Given a fully disabled Edit icon on Bike templates is now confirmed to render identically to a working one, was hiding bike-template editing behind silent disablement a deliberate "not built yet" placeholder, or should it read differently to a user who has no idea an editor doesn't exist for these four rows?
3. Assault-Bike's Finished state gets a full scored summary; Main Timer's Finished state gets none. Is that asymmetry intentional (bike sessions are drill-scored, boxing sessions structurally aren't), or does boxing's "quiet ending" undersell a completed round the way the bike screen's ending doesn't?
