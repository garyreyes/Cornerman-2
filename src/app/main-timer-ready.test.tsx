import { act, renderRouter, screen, waitFor } from "expo-router/testing-library";

import { markOnboardingComplete } from "../features/settings/service";
import { clearAll } from "../lib/storage";
import RootLayout from "./_layout";
import Index from "./index";
import Onboarding from "./onboarding";

beforeEach(() => {
  clearAll();
});

test("once onboarding is already complete, index renders the Main Timer's Ready state", async () => {
  markOnboardingComplete();
  let router: ReturnType<typeof renderRouter>;
  await act(async () => {
    router = renderRouter({ _layout: RootLayout, index: Index, onboarding: Onboarding });
  });
  await waitFor(() => expect(router.getPathname()).toBe("/"));
  expect(screen.getByText("READY")).toBeTruthy();
});
