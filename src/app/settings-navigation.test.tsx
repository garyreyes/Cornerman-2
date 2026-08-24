import { act, fireEvent, renderRouter, screen, waitFor } from "expo-router/testing-library";

import { markOnboardingComplete } from "../features/settings/service";
import { clearAll } from "../lib/storage";
import RootLayout from "./_layout";
import Index from "./index";
import Onboarding from "./onboarding";
import SettingsLayout from "./settings/_layout";
import SettingsIndex from "./settings/index";

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
    });
  });
  await waitFor(() => expect(screen.getByText("READY")).toBeTruthy());

  fireEvent.press(screen.getByLabelText("Settings"));

  await waitFor(() => expect(router.getPathname()).toBe("/settings"));
  expect(screen.getByText("SETTINGS")).toBeTruthy();
});
