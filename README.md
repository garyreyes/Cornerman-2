# Cornerman

**Built by a fighter, for fighters.**

Cornerman is a boxing and kickboxing training timer for Android and iOS. No
account, no backend, no ads — just a round timer that calls your combos out
loud so you can keep your eyes up and your hands up, the way a real corner
would.

## Why this exists

New fighters can't really throw combos on command. Ask a beginner for "1-2"
and "lead hook, body hook" back to back at mitt-work pace, or mid-round in
sparring, and it's the same blank half-second every time — the brain hasn't
built the wiring yet to hear a combo and just throw it. Cornerman calls
combos out loud on a timer so that wiring gets built in training, before it
has to happen live.

The other half of it is cardio. Watching how fighters like Ilia Topuria
train — and hearing coaches like John Kavanagh talk about pairing physical
exhaustion with a cognitive task instead of just grinding out rounds — made
it obvious that "hard cardio" and "smart cardio" aren't the same thing.
Cornerman's assault-bike sessions do the same pairing: all-out bike
intervals followed by a rest that isn't just rest — it's a reaction drill
while your legs are still burning.

And built-in templates exist so a newer fighter can pick **Easy** and get a
real, structured round plan instead of being handed a blank "random combos"
toggle and no idea what to do with it.

Past all of that — this is also just a tool I use myself, every session.

## What it does

- **Round timer** with warmup, work, rest, and configurable round count —
  runs in the background with the screen off or another app open.
- **Combo call-outs**, spoken out loud (bundled TTS voice bank, no internet
  required), from your own saved combos, presets, or a programmed template.
- **Six built-in bagwork templates** — Easy, Moderate, and Intense, each as
  punches-only or punches + kicks — carrying real round-by-round gym
  programming, not uniform random combos.
- **Assault-bike cognitive sessions** — short all-out bike intervals paired
  with a reaction/decision drill (a visual Odd-One-Out grid or spoken Corner
  Commands) during the rest window, modeled on Brain Endurance Training.
- **Defense cue call-outs** (slip, roll, check) on their own timer, layered
  into a round.
- **Fully custom** punches, kicks, combos, and templates — the built-ins are
  a starting point, not a ceiling.
- **Everything local.** No account, no server, no analytics — your data
  never leaves your phone.

## Tech stack

- [Expo](https://expo.dev) SDK 57 / React Native 0.86 / React 19, TypeScript
- [`expo-router`](https://docs.expo.dev/router/introduction/) for
  file-based navigation
- [`react-native-audio-api`](https://github.com/software-mansion/react-native-audio-api)
  for the audio engine, WSOLA time-stretching, and background/foreground-
  service playback
- A bundled Kokoro TTS voice bank for combo/cue call-outs — no network calls
- [`react-native-mmkv`](https://github.com/mrousavy/react-native-mmkv) for
  local storage
- Jest (`jest-expo` preset) + ESLint + TypeScript, enforced in CI on every PR

See [ARCHITECTURE.md](ARCHITECTURE.md) and [docs/PRD.md](docs/PRD.md) for
the full technical and product picture.

## Running it locally (developers)

```bash
git clone https://github.com/garyreyes/Cornerman-2.git
cd Cornerman-2
npm install
npx expo run:android   # or: npx expo run:ios
```

Requires a working React Native/Android (or Xcode) dev environment — this
project uses native modules, so it can't run inside Expo Go.

```bash
npm run lint        # eslint
npm run typecheck    # tsc --noEmit
npm run test          # jest
```

## Installing on Android

Cornerman isn't on the Play Store yet. Until it is, the way to get it onto
a phone is a self-built APK:

1. Install the EAS CLI and log in: `npm i -g eas-cli && eas login`
2. From the project root: `eas build --profile preview --platform android`
3. Once the build finishes, download the `.apk` from the link EAS gives you
   (directly onto the phone, or to a computer and then transfer it over).
4. Open the file on the phone. Android will prompt to allow installs from
   that source ("Install unknown apps") — allow it, then install.

A Play Store listing is in progress.

**A note for some phones:** a few Android manufacturers (Xiaomi/POCO/Redmi,
Huawei/Honor, Oppo/Realme, OnePlus, Vivo) aggressively kill background apps
by default, which can cut combo call-outs mid-round. Cornerman's onboarding
detects this and deep-links straight to the right settings screen — if you
skipped it, it's also under **Settings → Help → Allow background
activity**.
