#!/usr/bin/env python3
"""Generates Cornerman's bundled voice-bank clips using Kokoro TTS.

This is a one-time, dev-machine-only content-generation tool -- it is not
part of the shipped app and Kokoro/PyTorch never run on-device. Its output
(assets/audio/voice/*.wav) replaces the silent placeholder WAVs committed
there so the app has something real to decode.

NOTE: this script was written without a working Python environment to
verify it against (this sandbox has no Python installed at all -- see
PROJECT_FACTS.md). The Kokoro API calls below are written from
documentation/training knowledge of the `kokoro` package, not tested end
to end. Check them against Kokoro's actual current README
(https://github.com/hexgrad/kokoro) if generation fails or produces
unexpected output, and fix forward rather than assuming this script is
correct as committed.

Setup:

    python -m venv .venv
    source .venv/bin/activate        # .venv\\Scripts\\activate on Windows
    pip install kokoro soundfile numpy
    # espeak-ng system dependency (used for phonemization):
    #   macOS:          brew install espeak-ng
    #   Ubuntu/Debian:  apt install espeak-ng
    #   Windows:        https://github.com/espeak-ng/espeak-ng/releases

Run from the repo root:

    python scripts/generate_voice_bank.py

Then review the printed summary and commit the real assets/audio/voice/
output in place of the placeholders.
"""

import os

import numpy as np
import soundfile as sf
from kokoro import KPipeline

VOICE = "am_fenrir"
LANG_CODE = "a"  # American English
SPEED = 1.0
SAMPLE_RATE = 24000  # Kokoro's native output rate
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "assets", "audio", "voice")
SILENCE_THRESHOLD = 0.01

# filename (without extension) -> spoken text. Order mirrors
# docs/PRD.md's addendum on the punch/kick/defense vocabulary.
WORDS = {
    # Numbers -- feeds the announceStyle: "number" setting (Phase 5d)
    "one": "One",
    "two": "Two",
    "three": "Three",
    "four": "Four",
    "five": "Five",
    "six": "Six",
    # Punches -- lead/rear stance-relative naming (PROJECT_FACTS.md)
    "jab": "Jab",
    "cross": "Cross",
    "lead_hook": "Lead hook",
    "rear_hook": "Rear hook",
    "body_hook": "Body hook",
    "body_jab": "Body jab",
    "body_cross": "Body cross",
    "lead_uppercut": "Lead uppercut",
    "rear_uppercut": "Rear uppercut",
    # Kicks
    "lead_high_kick": "Lead high kick",
    "rear_high_kick": "Rear high kick",
    "lead_body_kick": "Lead body kick",
    "rear_body_kick": "Rear body kick",
    "lead_low_kick": "Lead low kick",
    "rear_low_kick": "Rear low kick",
    "lead_calf_kick": "Lead calf kick",
    "rear_calf_kick": "Rear calf kick",
    "lead_inside_kick": "Lead inside kick",
    "rear_inside_kick": "Rear inside kick",
    "lead_push_kick": "Lead push kick",
    "rear_push_kick": "Rear push kick",
    # Defense / movement -- Phase 5d's independent cue layer
    "roll": "Roll",
    "slip": "Slip",
    "duck": "Duck",
    "pivot": "Pivot",
    "check": "Check",
    "clinch": "Clinch",
}


def trim_silence(audio: np.ndarray, threshold: float = SILENCE_THRESHOLD) -> np.ndarray:
    """Trims leading/trailing near-silence for tight playback timing."""
    above = np.where(np.abs(audio) > threshold)[0]
    if len(above) == 0:
        return audio
    return audio[above[0] : above[-1] + 1]


def main() -> None:
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    pipeline = KPipeline(lang_code=LANG_CODE)

    results = []
    for filename, text in WORDS.items():
        chunks = [audio for _, _, audio in pipeline(text, voice=VOICE, speed=SPEED)]
        audio = np.concatenate(chunks) if len(chunks) > 1 else chunks[0]
        audio = trim_silence(audio)

        out_path = os.path.join(OUTPUT_DIR, f"{filename}.wav")
        sf.write(out_path, audio, SAMPLE_RATE)

        results.append((f"{filename}.wav", os.path.getsize(out_path), len(audio) / SAMPLE_RATE))

    print(f"\nGenerated {len(results)} clips into {os.path.abspath(OUTPUT_DIR)}\n")
    print(f"{'File':<24}{'Size':>10}{'Duration':>10}")
    for name, size_bytes, duration_sec in results:
        print(f"{name:<24}{size_bytes:>9,}B{duration_sec:>9.2f}s")


if __name__ == "__main__":
    main()
