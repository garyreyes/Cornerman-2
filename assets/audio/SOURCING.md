# Audio asset sourcing checklist

The three `.wav` files next to this doc are **silent placeholders**
(generated, not sourced) — they exist only so the audio engine's code path
has something real to `decodeAudioData()` against. They are NOT final
assets. Swap them in place (same filename) once real ones are sourced; no
code changes are needed to pick up a replacement.

Per `docs/PRD.md` §6 / `ARCHITECTURE.md`: real recorded/licensed samples
only — Freesound.org (filter **CC0**) first, AudioJungle (Envato,
one-time per-SFX purchase) as a fallback if nothing free sounds right. No
AI-generated/stock-slop sounds — this was the #1 complaint about the old
app ("doesn't even sound like a boxing ring").

What made the old app's cues fail, and what to listen for instead (from
`docs/MIGRATION_EXTRACTION.md` §1.12):

| File | Replaces event | What to search for | What "authentic" means here |
|---|---|---|---|
| `bell.wav` | Round start & round end (`phase-changed` → work/rest) | "boxing bell", "ring bell", "struck bell", "gong hit" | Real struck metal rings at **inharmonic** partials (not a clean chord/chime) — should sound like a physical object being hit, with a natural decay tail. |
| `clapper.wav` | 10s work warning | "clapper", "UFC clapper", "wood clap", "dry crack" | A dry, percussive "crack," not a tone or beep — this is the sound of the old app's #1 complaint, so get this one right. |
| `countdown-tick.wav` | Rest 3-2-1 countdown (fires 3x per rest phase) | "short tick", "click", "digital beep short" | Short and clean (<300ms) — fires up to 3x per rest, needs to read as a countdown, not a chime. Confirmed as a **tone/beep**, not spoken numbers (that would be Phase 5's speech pipeline instead). |

Target specs for all three: mono or stereo, 44.1kHz, WAV or MP3, roughly
0.3–1.5s (longer for the bell's natural decay tail is fine). `finalBell`
(session-finished) intentionally reuses `bell.wav` rather than needing a
fourth file — revisit only if a distinct "final bell" sample is wanted
later.

Drop the sourced file in with the same filename as above, confirm the
license terms (CC0 needs no attribution; AudioJungle's per-SFX license
terms should be kept for reference), and that's it — the audio engine
loads whatever is at that path.
