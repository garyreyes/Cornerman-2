# Project Facts

Durable, project-specific decisions that should survive across sessions
without being re-explained. Most current decisions live in `docs/PRD.md`
and `ARCHITECTURE.md` (the source-of-truth documents) — this file is for
facts that don't fit neatly into either, appended to as real decisions get
made during feature work.

- `appId`/bundle identifier `com.gary.cornerman` is confirmed to continue
  the existing Play Store listing from the old app — not a fresh listing.
- No Apple Developer Program account exists yet; iOS App Store submission
  is explicitly out of scope until one is obtained.
- Scaffolded with `create-expo-app`'s `blank-typescript` template on Expo
  SDK 57 / React Native 0.86 / React 19 — chosen because `app-architect`
  locked in EAS/dev-client build (not Expo Go) for real background-audio
  support.
