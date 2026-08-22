import { render } from "@testing-library/react-native";

import App from "./App";

test("renders the placeholder screen", async () => {
  const { getByText } = await render(<App />);
  expect(getByText(/Open up App.tsx/i)).toBeTruthy();
});
