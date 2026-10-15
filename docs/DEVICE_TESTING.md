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
| 2026-09-19 | dev client, local build | POCO F6 Pro | PASS | not tested | **FAIL** | not tested | not tested | not tested | not tested | not tested | not tested | not tested | See below. |
| 2026-10-15 | same 2026-09-19 native build, current working-tree JS (schedule.ts not yet wired) | POCO F6 Pro, unplugged | PASS | not tested | **FAIL** | not tested | not tested | not tested | not tested | not tested | not tested | not tested | Baseline re-run before the background-audio fix. See below. |
| 2026-10-15 | same native build, JS at `8318d7c` (audio queued on the audio clock) | POCO F6 Pro, unplugged | PASS | PASS | PASS | not tested | not tested | not tested | not tested | not tested | not tested | not tested | Boxing only -- Assault Bike not yet converted. See below. |
| 2026-10-15 | brand-mark native build, JS at `c4742d5` | POCO F6 Pro, unplugged, 16% battery | -- | -- | -- | not tested | **PASS (survived)** | not tested | PASS | not tested | not tested | not tested | Scenario 5 expected a kill and didn't get one. See below. |

### 2026-09-19 findings

- **Scenario 1 (Spotify + drill):** PASS — both audible at once, cues cut through music as expected.
- **Scenario 3 (lock screen) — FAIL, critical:** Pressing the **home button** pauses both the round timer and combo call-outs immediately. Pressing the **power button** (screen lock) does the same. This is not "audio ducks" or "cues get quiet" — the drill itself stops advancing. This directly fails the hard requirement in `docs/PRD.md` ("switch to camera or Spotify, or lock the phone" must not interrupt combos) and contradicts `ARCHITECTURE.md`'s statement that `src/lib/backgroundAudio.ts` handles this via EAS dev client + foreground service. Since this reproduces on **home button alone**, before MIUI's autostart killer is even a factor, the root cause is upstream of the MIUI-specific mitigation — likely the foreground service isn't actually starting, isn't held correctly, or the audio session/timer logic is tied to component lifecycle instead of the service.
- Scenarios 2, 5, 6, 10 all depend on background survival and are expected to fail the same way until scenario 3 is fixed — not yet tested individually since the root cause is shared.

### 2026-10-15 findings

- Baseline re-run on battery (cable unplugged after the JS bundle
  loaded), to confirm the failure before wiring in the precomputed
  schedule. Spotify opened first, then Cornerman, then START.
- **Scenario 1:** PASS -- combos, timer, and Spotify all run together in
  the foreground.
- **Scenario 3:** FAIL, unchanged from 2026-09-19 -- both the home button
  and the power button (screen off, app not closed) stop the combos and
  the round timer immediately. Spotify keeps playing. Consistent with
  the measured root cause in `PROJECT_FACTS.md` ("Backgrounded JS timers
  vs the audio clock").
- Not yet tested plugged into a charger/power bank, which relaxes
  Android's background restrictions -- once the fix lands, test both
  unplugged (hardest) and charging.

### 2026-10-15 findings, after the fix (`8318d7c`)

- Boxing session, on battery. User-observed: combos and the timer keep
  going with the **power button** (screen off), the **home button**, and
  switching **Cornerman ↔ Spotify** in both directions -- Spotify keeps
  playing alongside. **Recording video in the camera** mid-drill also
  keeps the combos going (scenario 2, previously the highest-risk case).
- Scenarios 1, 2, 3: PASS. The lock-screen-controls half of scenario 3
  doesn't apply -- the app has no lock-screen play/pause controls.
- Not yet checked: the JS log for errors during the run (the phone was
  unplugged), and the remaining scenarios.

### 2026-10-15 findings, MIUI autostart off (`c4742d5`)

- **Scenario 7:** PASS -- `adb shell am start -n
  com.miui.securitycenter/com.miui.permcenter.autostart.AutoStartManagementActivity`
  (the target in `src/features/onboarding/service.ts`) opens HyperOS's
  real "Background autostart" list, not generic Settings. Cornerman was
  ON there before this test.
- Switching Cornerman's autostart OFF killed the running app at once
  (PID changed) -- MIUI doesn't wait for the app to go to the background.
  Relaunched from Metro afterwards.
- **Scenario 5:** boxing session started 19:19:42, screen locked, cable
  unplugged, phone pocketed at 16% battery. User-observed: combos and
  bells kept going for the full 10+ minutes. **Survived, so the
  "app gets killed" expectation is wrong for this build** -- the audio
  queue alone keeps the process alive without autostart. The JS log and
  PID weren't checked afterwards (phone stayed unplugged until the
  session had long finished).
- Implication, not acted on: the onboarding battery step that pushes
  users to enable autostart may be unnecessary on HyperOS. Scenario 6
  (autostart ON) is now low-risk, since OFF already survives.
- Run at 16% is a harsher test than intended. Future runs: charge to
  50-80%, then unplug -- low battery invites battery saver, which
  confounds the result (scenario 8 covers battery saver deliberately).

Any failure found here is a follow-up bug, not something to fix inline
during a test pass — log it and file it separately.

## Driving and observing the phone from the PC (adb)

Used for the 2026-09-19 spike and both 2026-10-15 runs. `adb` lives in
`%LOCALAPPDATA%\Android\Sdk\platform-tools` and isn't on PATH by default:

```powershell
$env:Path += ";$env:LOCALAPPDATA\Android\Sdk\platform-tools"
adb devices                       # must say "device", not "unauthorized"
adb reverse tcp:8081 tcp:8081     # phone reaches Metro over the cable
npx expo start --dev-client --port 8081
adb shell am start -a android.intent.action.VIEW -d "cornerman://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081" com.gary.cornerman
adb exec-out screencap -p > screen.png
adb logcat -c                     # clear before a test run...
adb logcat -d -s ReactNativeJS:*  # ...and read JS logs/errors after
```

Gotchas found the hard way:

- **No phone in `adb devices`, no USB-mode prompt on the phone:** the
  cable is likely charge-only. Windows lists the phone as `VID_2717`
  (Xiaomi) once a data cable is used.
- Android often doesn't ask about USB mode; it defaults to charging. Pick
  **File transfer** from the USB notification, or set Developer options →
  Default USB configuration.
- The installed dev client doesn't register `exp+cornerman://`; use the
  `cornerman://` link above.
- Once the bundle has loaded, the cable can come out -- the app runs on
  its own. Test screen-off scenarios unplugged: charging relaxes
  Android's background limits (Doze never starts while plugged in).
- `adb logcat -d` waits forever if no device is connected -- check
  `adb devices` first.
- Only one of you drives the phone at a time: remote `adb input` taps and
  real presses at once produced a confusing false signal once.

## Out of scope

- iOS testing — needs a Mac + Xcode; no `ios/` folder exists yet in this repo.
- Android Studio is still needed for `adb` (platform-tools); only the
  emulator itself is being replaced by real-device testing.
