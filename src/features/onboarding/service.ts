import * as IntentLauncher from "expo-intent-launcher";
import * as Device from "expo-device";
import { Linking, Platform } from "react-native";

export interface OemIntentTarget {
  packageName: string;
  className: string;
}

/**
 * Explicit-intent targets for the OEM settings screens that actually stop
 * background apps from being killed on that manufacturer's Android skin --
 * separate from (and not reached by) the standard Android battery-
 * optimization dialog. Undocumented, OEM-private activities, not a stable
 * public API, so a stale class name on a newer OS version is expected
 * eventually -- openBackgroundSettings() below always falls back to the
 * generic Settings page rather than surfacing a failure. Sourced from the
 * community-maintained dontkillmyapp.com list. Keyed by manufacturer/brand
 * substrings actually seen on real devices (POCO/Redmi ship as their own
 * brand but run the same MIUI/HyperOS autostart manager as Xiaomi).
 */
export const OEM_BACKGROUND_SETTINGS_TARGETS: Record<string, OemIntentTarget> = {
  xiaomi: {
    packageName: "com.miui.securitycenter",
    className: "com.miui.permcenter.autostart.AutoStartManagementActivity",
  },
  poco: {
    packageName: "com.miui.securitycenter",
    className: "com.miui.permcenter.autostart.AutoStartManagementActivity",
  },
  redmi: {
    packageName: "com.miui.securitycenter",
    className: "com.miui.permcenter.autostart.AutoStartManagementActivity",
  },
  huawei: {
    packageName: "com.huawei.systemmanager",
    className: "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity",
  },
  honor: {
    packageName: "com.huawei.systemmanager",
    className: "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity",
  },
  oppo: {
    packageName: "com.coloros.safecenter",
    className: "com.coloros.safecenter.permission.startup.StartupAppListActivity",
  },
  realme: {
    packageName: "com.coloros.safecenter",
    className: "com.coloros.safecenter.permission.startup.StartupAppListActivity",
  },
  oneplus: {
    packageName: "com.oneplus.security",
    className: "com.oneplus.security.chainlaunch.view.ChainLaunchAppListActivity",
  },
  vivo: {
    packageName: "com.vivo.permissionmanager",
    className: "com.vivo.permissionmanager.activity.BgStartUpManagerActivity",
  },
  asus: {
    packageName: "com.asus.mobilemanager",
    className: "com.asus.mobilemanager.autostart.AutoStartActivity",
  },
  samsung: {
    packageName: "com.samsung.android.lool",
    className: "com.samsung.android.sm.ui.battery.BatteryActivity",
  },
};

/**
 * Resolves which OEM-specific settings screen (if any) applies to this
 * device, from expo-device's raw manufacturer/brand strings -- pure so the
 * brand-matching itself is unit-testable without touching expo-device or
 * expo-intent-launcher. Checks both fields because a sub-brand (POCO,
 * Redmi, Honor, Realme) can report the parent manufacturer in one field
 * and the sub-brand name in the other depending on device/region, and
 * matches case-insensitively since OEMs report inconsistent casing
 * ("Xiaomi" vs "xiaomi").
 */
export function resolveOemBackgroundSettingsTarget(
  manufacturer: string | null,
  brand: string | null,
): OemIntentTarget | null {
  const candidates = [manufacturer, brand]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .map((value) => value.toLowerCase());

  for (const [key, target] of Object.entries(OEM_BACKGROUND_SETTINGS_TARGETS)) {
    if (candidates.some((candidate) => candidate.includes(key))) {
      return target;
    }
  }
  return null;
}

/**
 * Best-effort deep link straight to this device's background-app-killer
 * settings screen (MIUI Autostart, EMUI Startup Manager, etc.) instead of
 * leaving every user to hunt for it manually -- see PROJECT_FACTS.md for
 * the POCO/MIUI report this closes the loop on. Always resolves, never
 * throws: tries the OEM-specific screen first when the device matches a
 * known target, then falls back to the generic per-app Settings page
 * (Android's app-info screen; iOS's Settings root), which always exists.
 */
export async function openBackgroundSettings(): Promise<void> {
  if (Platform.OS === "android") {
    const target = resolveOemBackgroundSettingsTarget(Device.manufacturer, Device.brand);
    if (target !== null) {
      try {
        await IntentLauncher.startActivityAsync("android.intent.action.MAIN", {
          packageName: target.packageName,
          className: target.className,
        });
        return;
      } catch {
        // Stale class name for this OS version/region, or the OEM's own
        // settings app isn't present -- fall through to the generic page.
      }
    }
  }
  Linking.openSettings();
}
