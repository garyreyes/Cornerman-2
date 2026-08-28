/**
 * The six boxing built-ins, carrying bagwork.md's actual round-by-round
 * programming rather than the unstructured random draw the original three
 * shipped with -- a "Moderate" session used to call random punches, which
 * is nothing like the template it was named after.
 *
 * Each difficulty ships twice: punches only, and punches + kicks. The
 * kick rounds are the only difference between a pair; every other round
 * is identical, so the two read as the same session with the kicks turned
 * on rather than as two unrelated workouts.
 *
 * Round durations follow bagwork.md's own header (2 min rounds, 60s rest)
 * -- the original built-ins used 180s, which no template table ever asked
 * for.
 */

import type { BoxingConfig, RoundConfig } from "./types";

// bagwork.md's notation, resolved against the seeded punch list. `b` means
// to the body: `1b` is the Body Jab, `2b` the Body Cross, `3b` the Body
// Hook (which predates the other two and kept its original num 7).
const JAB = 1;
const CROSS = 2;
const LEAD_HOOK = 3;
const LEAD_UPPERCUT = 5;
const REAR_UPPERCUT = 6;
const BODY_HOOK = 7; // 3b
const BODY_JAB = 8; // 1b
const BODY_CROSS = 9; // 2b

const LEAD_LOW_KICK = 10;
const REAR_LOW_KICK = 11;
const LEAD_CALF_KICK = 12;
const REAR_CALF_KICK = 13;
const LEAD_BODY_KICK = 14;
const REAR_BODY_KICK = 15;
const LEAD_PUSH_KICK = 18; // teep

/**
 * bagwork.md's "lead-leg flick" (Takeru's harassment kick) has no clip of
 * its own in the voice bank, so it is called as a Lead Low Kick and the
 * flick mechanic lives in the round's own coaching note instead -- the
 * note now renders on screen during the round.
 */
const FLICK = LEAD_LOW_KICK;

function round(label: string, note: string, combos: number[][]): RoundConfig {
  return { label, note, comboSource: { type: "combo-pool", combos } };
}

/** bagwork.md's Round 6/8/10 "Flow" rounds explicitly link everything that
 * came before, so they draw from the union of the round plan so far
 * rather than repeating a hand-written list that could drift out of sync
 * with the rounds above it. */
function flowRound(label: string, note: string, earlier: RoundConfig[]): RoundConfig {
  const combos = earlier.flatMap((r) => (r.comboSource.type === "combo-pool" ? r.comboSource.combos : []));
  // Deduped: a combo appearing in two earlier rounds would otherwise be
  // drawn twice as often as the rest, which is a weighting nobody asked
  // for -- a flow round means "any of these", evenly.
  const seen = new Set<string>();
  return round(
    label,
    note,
    combos.filter((c) => {
      const key = c.join(",");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }),
  );
}

// --- Rounds shared by both variants of a difficulty -------------------

const easyJab = round("Jab", "Full extension, snap back. Same spot every rep.", [
  [JAB],
  [JAB, JAB],
  [BODY_JAB],
]);
const easyOneTwo = round("1-2", "Reset the guard fully between every rep. Sharp exhale.", [[JAB, CROSS]]);
const easyReflex = round("Combo To Reflex", "Nothing else this round. Hunt the identical spot each time.", [
  [LEAD_HOOK, CROSS, LEAD_HOOK],
]);
const easyBody = round("Body", "Frame and bump the bag, let it swing, land as it returns.", [
  [LEAD_HOOK, BODY_HOOK],
]);

const modJab = round("Jab + Feints", "Add a feint before every third jab.", [[JAB], [JAB, JAB], [BODY_JAB]]);
const modOneTwo = round("1-2", "Feint first, commit second.", [[JAB, CROSS]]);
const modHeadBody = round("Head-Body-Head", "Never the same level twice in a row.", [
  [JAB, BODY_CROSS, LEAD_HOOK],
  [CROSS, BODY_HOOK, CROSS],
]);
const modPocket = round("Pocket Combos", "Stay in range after the combo — do not drift out.", [
  [JAB, CROSS, LEAD_UPPERCUT, CROSS],
  [JAB, REAR_UPPERCUT, LEAD_HOOK],
  [LEAD_HOOK, CROSS, LEAD_HOOK],
]);
const modPressure = round("Pressure", "Reset at an ANGLE, never straight back.", [
  [JAB, JAB, CROSS],
  [JAB, CROSS, LEAD_HOOK],
  [JAB, BODY_CROSS, CROSS],
]);

const intJab = round("Jab", "Technical opener — do not blow the round.", [[JAB], [JAB, JAB], [BODY_JAB]]);
const intOneTwo = round("1-2", "Build power-hand timing off the jab.", [[JAB, CROSS]]);
const intHeadBody = round("Head-Body-Head", "Alternate levels on every single shot.", [
  [JAB, BODY_CROSS, LEAD_HOOK],
  [CROSS, BODY_HOOK, CROSS],
  [JAB, CROSS, BODY_HOOK, CROSS],
]);
const intPunchCombos = round("Pure Punch Combos", "Pocket work. Stay planted, stay in range.", [
  [JAB, CROSS, LEAD_UPPERCUT, CROSS],
  [JAB, REAR_UPPERCUT, LEAD_HOOK],
  [LEAD_HOOK, CROSS, LEAD_HOOK],
  [CROSS, LEAD_HOOK, CROSS],
]);
const intPressure = round("Pressure", "Never walk a straight line. Cut off, do not chase.", [
  [JAB, JAB, CROSS],
  [JAB, CROSS, LEAD_HOOK],
  [JAB, BODY_CROSS, CROSS],
  [CROSS, LEAD_HOOK, CROSS],
]);
const intTeardrop = round("Teardrop · Body Accuracy", "Punch-shield substitute. Accuracy, guard never drops.", [
  [BODY_CROSS],
  [BODY_HOOK],
  [JAB, BODY_CROSS],
  [LEAD_UPPERCUT, BODY_CROSS],
]);

// --- The rounds that differ between punches and punches + kicks -------

const easyKickRound = round("Kicks", "Lead-leg flick only. Pendulum step, snap and retract — NOT power.", [
  [FLICK],
]);
const easyPunchSubstitute = round("Uppercuts", "Same rep-to-reflex rule. Turn the hip, do not reach.", [
  [JAB, REAR_UPPERCUT, LEAD_HOOK],
]);

const modKickEntry = round("Kicks · Entry", "The flick is bait. Follow it into the pocket.", [
  [FLICK, FLICK, JAB, CROSS],
]);
const modFusion = round("Punch to Kick Fusion", "Fluid transition, no pause between hands and kick.", [
  [JAB, CROSS, REAR_CALF_KICK],
  [LEAD_HOOK, CROSS, REAR_LOW_KICK],
]);
const modUppercuts = round("Uppercut Entries", "Get inside first, then turn it over.", [
  [JAB, LEAD_UPPERCUT, CROSS],
  [CROSS, LEAD_UPPERCUT, CROSS],
  [JAB, REAR_UPPERCUT, LEAD_HOOK],
]);
const modBodyAttack = round("Body Attack", "Dig in, then come back upstairs.", [
  [JAB, BODY_CROSS, LEAD_HOOK],
  [LEAD_HOOK, BODY_HOOK, CROSS],
  [BODY_JAB, CROSS, LEAD_HOOK],
]);

const intKicksOnly = round("Kicks Only", "Volume over power. Pendulum step throughout.", [
  [FLICK],
  [LEAD_CALF_KICK],
  [REAR_CALF_KICK],
  [LEAD_PUSH_KICK],
  [LEAD_BODY_KICK],
  [REAR_BODY_KICK],
]);
const intFusion = round("Punch to Kick Fusion", "Hands flow into kicks, no telegraph.", [
  [JAB, CROSS, REAR_CALF_KICK],
  [JAB, CROSS, LEAD_HOOK, REAR_BODY_KICK],
]);
const intUppercuts = round("Uppercuts", "Volume in the pocket. Short, tight, no winding up.", [
  [JAB, LEAD_UPPERCUT, CROSS],
  [CROSS, REAR_UPPERCUT, LEAD_HOOK],
  [LEAD_UPPERCUT, CROSS, LEAD_UPPERCUT],
  [JAB, REAR_UPPERCUT, LEAD_HOOK],
]);
const intDoubleBody = round("Double Body Attack", "Two to the body before anything comes back up.", [
  [JAB, BODY_CROSS, LEAD_HOOK],
  [CROSS, BODY_HOOK, CROSS],
  [BODY_JAB, CROSS, BODY_CROSS],
]);

const intFinishKicks = round("Finish", "Finish like you smell blood. Hands, kicks and pressure together.", [
  [JAB, CROSS, LEAD_UPPERCUT, CROSS, REAR_CALF_KICK],
  [JAB, CROSS, LEAD_HOOK, REAR_BODY_KICK],
  [LEAD_HOOK, CROSS, LEAD_HOOK, REAR_LOW_KICK],
]);
const intFinishPunches = round("Finish", "Finish like you smell blood. Hardest combos, max output.", [
  [JAB, CROSS, LEAD_UPPERCUT, CROSS, LEAD_HOOK],
  [JAB, CROSS, LEAD_HOOK, BODY_CROSS, CROSS],
  [LEAD_HOOK, CROSS, LEAD_HOOK, CROSS],
]);

// --- Round plans -------------------------------------------------------

function easyPlan(fifth: RoundConfig): RoundConfig[] {
  const first = [easyJab, easyOneTwo, easyReflex, easyBody, fifth];
  return [...first, flowRound("Flow", "Link everything from this session. Technical, no rush.", first)];
}

function moderatePlan(fifth: RoundConfig, sixth: RoundConfig): RoundConfig[] {
  const first = [modJab, modOneTwo, modHeadBody, modPocket, fifth, sixth, modPressure];
  return [...first, flowRound("Flow", "Everything. Moderate output, keep the form clean.", first)];
}

function intensePlan(fifth: RoundConfig, sixth: RoundConfig, finish: RoundConfig): RoundConfig[] {
  const first = [intJab, intOneTwo, intHeadBody, intPunchCombos, fifth, sixth, intPressure, intTeardrop];
  return [
    ...first,
    flowRound("Championship", "Full two minutes, max output. This round IS the conditioning.", first),
    finish,
  ];
}

/**
 * Gaps are throwing time now, not "time since the call-out started" --
 * session/service.ts arms the next combo from when the current one
 * finishes being spoken. That fix is what makes these numbers mean what
 * they say; the previous 1-2s "Intense" gap was shorter than a four-punch
 * call-out takes to speak.
 *
 * They sit above bagwork.md's own rest-between-bursts figures (6-9 / 4-5
 * / 2-3) on purpose: the density in that table proved unthrowable in
 * practice even on Easy. Tightening one is a slider on the template, so
 * the forgiving end is the better default.
 */
function config(rounds: RoundConfig[], gapMinSec: number, gapMaxSec: number): BoxingConfig {
  return {
    baseWorkDurationSec: 120,
    baseRestDurationSec: 60,
    warmupDurationSec: 60,
    baseComboGapMinSec: gapMinSec,
    baseComboGapMaxSec: gapMaxSec,
    roundPlan: rounds,
  };
}

export const BUILT_IN_BOXING_TEMPLATES: readonly { name: string; config: BoxingConfig }[] = [
  { name: "Easy · Punches", config: config(easyPlan(easyPunchSubstitute), 8, 12) },
  { name: "Easy · Punches + Kicks", config: config(easyPlan(easyKickRound), 8, 12) },
  { name: "Moderate · Punches", config: config(moderatePlan(modUppercuts, modBodyAttack), 6, 9) },
  { name: "Moderate · Punches + Kicks", config: config(moderatePlan(modKickEntry, modFusion), 6, 9) },
  {
    name: "Intense · Punches",
    config: config(intensePlan(intUppercuts, intDoubleBody, intFinishPunches), 4, 6),
  },
  {
    name: "Intense · Punches + Kicks",
    config: config(intensePlan(intKicksOnly, intFusion, intFinishKicks), 4, 6),
  },
];
