import { render } from "@testing-library/react-native";

import App from "./App";

test("renders the Main Timer screen in Ready state once fonts load", async () => {
  const { findByText } = await render(<App />);
  expect(await findByText("READY")).toBeTruthy();
});
