/**
 * Own file, not a second test inside settings-navigation.test.tsx --
 * multiple renderRouter calls in one file leak navigation state between
 * tests in this setup (PROJECT_FACTS.md).
 *
 * Worth covering despite the tour being presentation work: onboarding
 * shows it exactly once and never again, so this Settings row is the only
 * route back to it. If it breaks, nothing else in the app reveals that.
 */
import { act, fireEvent, renderRouter, screen, waitFor } from "expo-router/testing-library";

import { markOnboardingComplete } from "../features/settings/service";
import { clearAll } from "../lib/storage";
import RootLayout from "../app/_layout";
import Index from "../app/index";
import Onboarding from "../app/onboarding";
import SettingsLayout from "../app/settings/_layout";
import SettingsIndex from "../app/settings/index";
import SettingsPresetEditor from "../app/settings/presets/[id]";
import SettingsPresetsList from "../app/settings/presets/index";
import SettingsPunches from "../app/settings/punches";
import SettingsTour from "../app/settings/tour";

beforeEach(() => {
  clearAll();
});

test("the tour stays reachable from Settings after onboarding has been completed", async () => {
  markOnboardingComplete();
  let router: ReturnType<typeof renderRouter>;
  await act(async () => {
    router = renderRouter(
      {
        _layout: RootLayout,
        index: Index,
        onboarding: Onboarding,
        "settings/_layout": SettingsLayout,
        "settings/index": SettingsIndex,
        "settings/punches": SettingsPunches,
        "settings/presets/index": SettingsPresetsList,
        "settings/presets/[id]": SettingsPresetEditor,
        "settings/tour": SettingsTour,
      },
      { initialUrl: "/settings" },
    );
  });
  await waitFor(() => expect(screen.getByText("How Cornerman works")).toBeTruthy());

  fireEvent.press(screen.getByText("How Cornerman works"));

  await waitFor(() => expect(router.getPathname()).toBe("/settings/tour"));
  expect(screen.getByText("EVERY ROUND HAS A JOB")).toBeTruthy();
});
