# Changes

Dated log of shipped changes, appended to as features complete.

## Unreleased

- 2026-08-23: Harness setup — Expo/React Native/TypeScript project
  scaffolded (`com.gary.cornerman`), lint/typecheck/test gates wired
  (ESLint via `eslint-config-expo`, `tsc --noEmit`, Jest via `jest-expo`
  + React Native Testing Library), CLAUDE.md/CHANGES.md/PROJECT_FACTS.md
  created. No feature code yet.
- 2026-08-23: Sub-phase 1b — MMKV-backed storage layer
  (`src/lib/storage.ts`) and the Settings/Punch/Preset data model
  (`src/features/settings/`), with zero-migration default-merging
  (extraction doc §1.13's pattern) and a last-punch delete guard.
  Test-first per the correctness-critical rule for settings
  persistence; all 8 tests pass. VoiceClip is out of scope here
  (Phase 5).
