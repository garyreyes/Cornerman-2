# Physical-device testing (Android)

Cornerman's core requirement — combos keep calling out while the phone is
backgrounded, locked, or another audio app (Spotify) is playing — cannot be
verified on the Android Studio emulator. It requires real audio-focus
arbitration, real OEM background-kill behavior, and a real lock screen.
This doc is the setup and checklist for testing on a physical device,
written against a **POCO F6 Pro (HyperOS/MIUI)**, currently the primary
test device.

Expo Go cannot run this app (`react-native-audio-api` is a native module,
plus a foreground-service audio config) — see `ARCHITECTURE.md`. A custom
dev client is required; `android/` is already generated and `eas.json` has
a `development` profile for it.

## One-time phone setup (MIUI/HyperOS)

1. Settings → About phone → tap **"OS version"** 7 times to unlock
   Developer options. (HyperOS calls it "OS version", not "Build number".)
2. Settings → Additional settings → Developer options → enable:
   - `USB debugging`
   - `Install via USB` — MIUI-specific; required or installs fail silently
   - `USB debugging (Security settings)` — MIUI-specific; required for the
     dev client to attach properly
   - These two MIUI toggles require being **signed into a Mi account with
     a SIM inserted**; if greyed out, that's why, not a broken setup.
3. Connect via USB-C, set USB mode to **File transfer (MTP)** (not
   charging-only), accept the on-device RSA fingerprint prompt.
4. Verify: `adb devices` lists the phone as `device`, not `unauthorized`.

### If MIUI blocks USB debugging (Mi account/SIM requirement can't be met)

No local Android SDK needed:

```
eas build --profile development --platform android
```

Download the resulting APK on the phone, allow "install unknown apps",
install, then connect with `npx expo start --dev-client --tunnel`.

## First build, then go wireless

```
npx expo run:android
```

First run is slow (5–15 min); it installs the dev client and launches the
app. To untether (most scenarios below need the phone pocketed/locked):

1. Developer options → **Wireless debugging** → on
2. **Pair device with pairing code** → note the code and `IP:PORT` shown
3. `adb pair <ip>:<pairing-port>` with the code
4. Back on the main Wireless debugging screen, note the **different**
   `IP:PORT` shown there → `adb connect <ip>:<debug-port>`
5. Unplug the cable.

Daily loop from here: `npx expo start --dev-client`, open the app on the
phone. JS/TS edits apply over Wi-Fi via Fast Refresh — no rebuild needed.
A native rebuild (`npx expo run:android`) is only required when a native
dependency or an `app.json` plugin changes.

If Metro can't be reached over Wi-Fi, the router likely has AP/client
isolation on — `npx expo start --dev-client --tunnel` works around it
(slower).

## Test scenarios

| # | Scenario | Expected | Notes |
|---|---|---|---|
| 1 | Spotify playing → start a drill | Both audible at once; cues cut through music | Ducking is explicitly out of scope for v1 — music *not* dipping is correct, not a bug. Confirm the in-app volume slider makes cues audible over music. |
| 2 | Drill running → open camera, record video | Combos keep calling out | Highest-risk case — video recording can grab exclusive audio focus. |
| 3 | Drill running → lock screen | Audio continues; lock-screen controls appear and work | Backed by `src/lib/backgroundAudio.ts`. |
| 4 | Incoming phone call mid-drill | Audio pauses on interruption, resumes after | Not a dead/frozen timer. |
| 5 | MIUI autostart **OFF** (default) + screen off 10+ min | App gets killed | Confirms the failure the onboarding step exists to prevent. |
| 6 | MIUI autostart **ON** (via onboarding deep-link) + same test | Survives | |
| 7 | Onboarding battery step → tap the deep-link | Lands on MIUI's Autostart screen, not generic Settings | The target class name in `src/features/onboarding/service.ts` is an undocumented OEM-private activity — may be stale on this HyperOS version; a real possible finding if it falls back to generic Settings. |
| 8 | Battery saver / "Restrict background usage" on | Document actual behavior | |
| 9 | Bluetooth headphones, incl. mid-drill disconnect | Routing correct, no crash on disconnect | |
| 10 | Long round, screen off, phone pocketed | Timing stays accurate, no drift | |

## Results log

Re-run this matrix each release. Record real observed behavior, not
expected — a scenario passing because it was assumed to pass isn't a test.

| Date | Build/version | Device | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| | | POCO F6 Pro | | | | | | | | | | | |

Any failure found here is a follow-up bug, not something to fix inline
during a test pass — log it and file it separately.

## Out of scope

- iOS testing — needs a Mac + Xcode; no `ios/` folder exists yet in this repo.
- Android Studio is still needed for `adb` (platform-tools); only the
  emulator itself is being replaced by real-device testing.
