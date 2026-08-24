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

beforeEach(() => {
  clearAll();
});

test("the gear icon pushes to a real, back-navigable Settings screen", async () => {
  markOnboardingComplete();
  let router: ReturnType<typeof renderRouter>;
  await act(async () => {
    router = renderRouter({
      _layout: RootLayout,
      index: Index,
      onboarding: Onboarding,
      "settings/_layout": SettingsLayout,
      "settings/index": SettingsIndex,
      "settings/punches": SettingsPunches,
      "settings/presets/index": SettingsPresetsList,
      "settings/presets/[id]": SettingsPresetEditor,
    });
  });
  await waitFor(() => expect(screen.getByText("READY")).toBeTruthy());

  fireEvent.press(screen.getByLabelText("Settings"));

  await waitFor(() => expect(router.getPathname()).toBe("/settings"));
  expect(screen.getByText("ROUND")).toBeTruthy();
});
