# Cornerman — Project Instructions

Read [ARCHITECTURE.md](ARCHITECTURE.md) and [docs/PRD.md](docs/PRD.md)
first, every session — they're the source of truth for the stack, entity
model, and product scope. [docs/MIGRATION_EXTRACTION.md](docs/MIGRATION_EXTRACTION.md)
documents proven business logic carried forward from the previous
vanilla-JS version of this app; treat its numbered items as load-bearing
requirements, not incidental history.

## Stack note

**Expo SDK 57 / React Native 0.86 / React 19** — bleeding-edge versions.
Before writing any code against Expo APIs, check the exact versioned docs
at https://docs.expo.dev/versions/v57.0.0/ rather than relying on
training-data knowledge of older Expo versions, which may already be
stale for APIs that changed in this release line.

## Layer boundaries (enforced by folder location, not discipline)

- **Components** (`features/*/components/`) render and handle interaction
  only. They never call MMKV, the filesystem, or a native audio API
  directly, and never contain business logic (timing math, combo
  resolution, rate/time-stretch calculations).
- **`service.ts`** files hold business logic and own every outbound call
  (storage, filesystem, native audio APIs, TTS synthesis). Anything
  reaching outside the component tree lives here.
- **`app/`** screens stay thin — assemble feature components, call
  feature services, no logic of substance.
- Any entity's data lives in exactly one feature (see `ARCHITECTURE.md`
  for the Settings/Punch/Preset/VoiceClip ownership map).

## Irreversible / high-blast-radius actions — confirm before proceeding

- **`appId: com.gary.cornerman`** (in `app.json`) is permanent once
  anything is uploaded to the Play Store or App Store under it — never
  change it without explicit user confirmation.
- **Native project regeneration** (`npx expo prebuild` / re-running EAS
  native scaffolding) can lose custom native assets not tracked in
  version control — this already happened once in the old app's history
  (extraction doc §1.21). Confirm before regenerating `android/`/`ios/`
  if either has been hand-modified.
- **Deleting or overwriting a `VoiceClip` audio asset** — these are
  either licensed/sourced samples or one-time TTS-generated clips; losing
  one silently degrades the speech pipeline. Confirm before bulk-deleting
  anything under the audio asset store.
- Any git push, force-push, branch deletion, or change to branch
  protection settings — this project has a real GitHub remote
  (`origin/main`) and these are shared-state actions even for a
  single-contributor repo.

## Testing standard

Correctness-critical logic — timer phase transitions, pause/resume exact
remaining-time math, combo generation/resolution, settings persistence —
gets a real automated test written before the implementation, per this
project's test-first rule. "Done" means the real test command was run and
its output observed passing, not "this should work."

Judgment/presentation work (layout, copy, styling, animation) does not
get tests — it goes through the normal build → review path instead.

## Gates (must pass before merge)

```
npm run lint        # eslint . (via eslint-config-expo)
npm run typecheck    # tsc --noEmit
npm run test          # jest (jest-expo preset)
```

All three run in CI on every pull request and are required to pass before
merge to `main` (see `.github/workflows/ci.yml`). A pre-commit hook also
runs lint + typecheck locally before a commit is allowed.

## Where project docs live

- `docs/PRD.md` — product requirements (single source of product truth)
- `docs/MIGRATION_EXTRACTION.md` — proven logic from the old app
- `ARCHITECTURE.md` — stack, entities, folder structure (single source of
  technical truth)
- `CHANGES.md` — dated log of shipped changes
- `PROJECT_FACTS.md` — durable project-specific decisions not covered by
  the above
