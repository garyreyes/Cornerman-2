import { renderRouter, screen, waitFor } from "expo-router/testing-library";

import { clearAll } from "../lib/storage";
import RootLayout from "./_layout";
import Index from "./index";
import Onboarding from "./onboarding";

beforeEach(() => {
  clearAll();
});

test("a fresh install redirects straight to onboarding, before Main Timer is ever reachable", async () => {
  const router = renderRouter({ _layout: RootLayout, index: Index, onboarding: Onboarding });
  await waitFor(() => expect(router.getPathname()).toBe("/onboarding"));
  expect(screen.getByText("THE BELL KEEPS RINGING")).toBeTruthy();
});
