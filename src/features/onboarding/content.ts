import type { DiagramName } from "./components/TourDiagrams";

export interface TourCard {
  id: string;
  title: string;
  body: string;
  diagram: DiagramName;
}

/**
 * The orientation tour: the three things the app does that a user would
 * otherwise have to go looking for.
 *
 * Deliberately not a feature list. Background audio is already the
 * onboarding intro card that precedes this, and the voice/speed/gap
 * controls are left out entirely -- they are ordinary settings a user
 * finds when they want them, and a tour that covers everything is the
 * manual this app is supposed to not need.
 */
export const TOUR_CARDS: readonly TourCard[] = [
  {
    id: "templates",
    title: "EVERY ROUND HAS A JOB",
    body: "A template programs the whole session — round one is jabs, round five is kicks — and the screen tells you the focus while you work. Six are built in, and the Round Builder makes them yours.",
    diagram: "template",
  },
  {
    id: "drills",
    title: "TIRED BODY, SHARP MIND",
    body: "Four assault-bike protocols put a reaction drill inside the rest: tap the odd tile, or the colour you heard. Phone up, drill, phone down — or turn the drill off and just breathe.",
    diagram: "drill",
  },
  {
    id: "punches",
    title: "CALL IT YOUR WAY",
    body: "Twenty-one punches and kicks are ready to call. Rename them, add your own, choose which ones Random draws from, and save the combos you drill most as presets.",
    diagram: "punches",
  },
];
