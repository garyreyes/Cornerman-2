import { OEM_BACKGROUND_SETTINGS_TARGETS, resolveOemBackgroundSettingsTarget } from "./service";

describe("resolveOemBackgroundSettingsTarget", () => {
  it("matches on manufacturer", () => {
    expect(resolveOemBackgroundSettingsTarget("Xiaomi", null)).toEqual(OEM_BACKGROUND_SETTINGS_TARGETS.xiaomi);
  });

  it("matches on brand when manufacturer doesn't carry the OEM name -- the reported POCO X5 case", () => {
    expect(resolveOemBackgroundSettingsTarget(null, "POCO")).toEqual(OEM_BACKGROUND_SETTINGS_TARGETS.poco);
  });

  it("is case-insensitive", () => {
    expect(resolveOemBackgroundSettingsTarget("HUAWEI", null)).toEqual(OEM_BACKGROUND_SETTINGS_TARGETS.huawei);
  });

  it("prefers manufacturer but falls back to brand", () => {
    expect(resolveOemBackgroundSettingsTarget("unknown corp", "realme")).toEqual(
      OEM_BACKGROUND_SETTINGS_TARGETS.realme,
    );
  });

  it("returns null for a manufacturer with no known aggressive-killer settings screen", () => {
    expect(resolveOemBackgroundSettingsTarget("Google", "Pixel")).toBeNull();
  });

  it("returns null when both fields are null -- Device.manufacturer/brand can't be determined", () => {
    expect(resolveOemBackgroundSettingsTarget(null, null)).toBeNull();
  });

  it("every known OEM target has a non-empty package and class name", () => {
    for (const target of Object.values(OEM_BACKGROUND_SETTINGS_TARGETS)) {
      expect(target.packageName.length).toBeGreaterThan(0);
      expect(target.className.length).toBeGreaterThan(0);
    }
  });
});
