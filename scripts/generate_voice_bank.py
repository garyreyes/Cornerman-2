#!/usr/bin/env python3
"""Generates Cornerman's bundled voice-bank clips using Kokoro TTS.

This is a one-time, dev-machine-only content-generation tool -- it is not
part of the shipped app and Kokoro/PyTorch never run on-device. Its output
(assets/audio/voice/<voice>/*.wav, one full 33-word subfolder per entry in
VOICES below) replaces the silent placeholder WAVs originally committed
flat under assets/audio/voice/ so the app has something real to decode.

Multi-voice, confirmed 2026-08-24: the user picked Michael + Eric after
listening to samples of all 9 of Kokoro's American-male voices (am_adam,
am_echo, am_eric, am_fenrir, am_liam, am_michael, am_onyx, am_puck,
am_santa -- am_puck/am_santa weren't sampled, judged unlikely fits by
name/character before spending generation time on them). Settings >
Combo Timing lets the user pick between whichever voices are listed in
VOICES -- adding a third later is just appending to that list and
re-running this script, no architecture change needed.

CONFIRMED WORKING end to end on Windows/Python 3.13 (2026-08-24) -- the
33 real clips currently committed under assets/audio/voice/ were produced
by this exact script. Two real bugs were hit and fixed along the way,
both explained inline below (the espeakng-loader wiring and
PYTHONUTF8=1); if generation ever fails again, suspect a genuine
Kokoro/dependency change before assuming this script regressed.

Setup:

    python -m venv .venv
    source .venv/bin/activate        # .venv\\Scripts\\activate on Windows
    pip install --only-binary=:all: kokoro soundfile numpy espeakng-loader
    # `--only-binary=:all:` matters on a brand-new Python version: pip can
    # otherwise resolve numpy to an old version with no prebuilt wheel yet
    # and fall back to a from-source build, which fails on Windows without
    # a real MSVC toolchain (confirmed 2026-08-24 -- see PROJECT_FACTS.md).
    #
    # espeak-ng (phonemization backend) -- espeakng-loader above bundles a
    # real espeak-ng shared library + data as pip-installable wheel data,
    # no system install needed. This matters on Windows specifically:
    # espeak-ng's only official Windows distribution is an admin-elevated
    # MSI installer (no portable zip build exists), which blocks entirely
    # in a non-interactive/remote session with no one to click the UAC
    # prompt -- confirmed 2026-08-24, see PROJECT_FACTS.md. Scoop's
    # "espeak-ng" package is itself just a wrapper around that same MSI,
    # so it doesn't help either. If a genuine system espeak-ng is
    # available on your platform, `pip install kokoro soundfile numpy`
    # (no espeakng-loader) works fine too -- this wiring only kicks in
    # when the loader package is importable.

Run from the repo root, with PYTHONUTF8=1 set (required on Windows --
see below):

    PYTHONUTF8=1 python scripts/generate_voice_bank.py
    # PowerShell: $env:PYTHONUTF8=1; python scripts/generate_voice_bank.py

Then review the printed summary and commit the real assets/audio/voice/
output in place of the placeholders.

WINDOWS BUG (confirmed 2026-08-24): kokoro/pipeline.py's KPipeline.__init__
opens its own config JSON with `open(path)` and no explicit encoding, so
Python falls back to the OS locale encoding -- cp1252 on this machine,
not UTF-8 -- and crashes with `UnicodeDecodeError: 'charmap' codec can't
decode byte 0x9d` on a non-ASCII byte in that config. This is a bug in
kokoro's own package, not this script; PYTHONUTF8=1 (Python's global
UTF-8 mode) works around it without touching the installed package. Check
whether a newer kokoro release has fixed this before assuming the env
var is still needed.
"""

import os

import numpy as np
import soundfile as sf
from kokoro import KPipeline

try:
    import espeakng_loader
    from phonemizer.backend.espeak.wrapper import EspeakWrapper

    EspeakWrapper.set_library(espeakng_loader.get_library_path())
    EspeakWrapper.set_data_path(espeakng_loader.get_data_path())
except ImportError:
    pass  # falls back to phonemizer's normal system espeak-ng discovery

# Every voice offered in Settings > Combo Timing's voice picker. Keys must
# match src/features/speech/types.ts's TtsVoice union and VOICE_OPTIONS
# exactly -- that's the app-side source of truth for what's selectable.
VOICES = ["am_michael", "am_eric"]
LANG_CODE = "a"  # American English
SPEED = 1.0
SAMPLE_RATE = 24000  # Kokoro's native output rate
VOICE_DIR = os.path.join(os.path.dirname(__file__), "..", "assets", "audio", "voice")
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
    pipeline = KPipeline(lang_code=LANG_CODE)

    for voice in VOICES:
        out_dir = os.path.join(VOICE_DIR, voice)
        os.makedirs(out_dir, exist_ok=True)

        results = []
        for filename, text in WORDS.items():
            chunks = [audio for _, _, audio in pipeline(text, voice=voice, speed=SPEED)]
            audio = np.concatenate(chunks) if len(chunks) > 1 else chunks[0]
            audio = trim_silence(audio)

            out_path = os.path.join(out_dir, f"{filename}.wav")
            sf.write(out_path, audio, SAMPLE_RATE)

            results.append((f"{filename}.wav", os.path.getsize(out_path), len(audio) / SAMPLE_RATE))

        print(f"\n{voice}: generated {len(results)} clips into {os.path.abspath(out_dir)}\n")
        print(f"{'File':<24}{'Size':>10}{'Duration':>10}")
        for name, size_bytes, duration_sec in results:
            print(f"{name:<24}{size_bytes:>9,}B{duration_sec:>9.2f}s")


if __name__ == "__main__":
    main()
