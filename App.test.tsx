import { render } from "@testing-library/react-native";

import { markOnboardingComplete } from "./src/features/settings/service";
import { clearAll } from "./src/lib/storage";
import App from "./App";

beforeEach(() => {
  clearAll();
});

test("shows onboarding on a fresh install, before Main Timer is ever reachable", async () => {
  const { findByText } = await render(<App />);
  expect(await findByText("THE BELL KEEPS RINGING")).toBeTruthy();
});

test("renders the Main Timer screen in Ready state once onboarding is already complete", async () => {
  markOnboardingComplete();
  const { findByText } = await render(<App />);
  expect(await findByText("READY")).toBeTruthy();
});
