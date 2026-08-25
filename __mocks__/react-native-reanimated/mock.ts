// This is the actual module both this project's own
// __mocks__/react-native-reanimated.ts AND expo-router/testing-library's
// internal jest.mock('react-native-reanimated', ...) factory delegate to
// via require("react-native-reanimated/mock") -- expo-router registers
// its own mock for the top-level module the moment a test file imports
// "expo-router/testing-library" (see
// node_modules/expo-router/build/testing-library/mocks.js), which wins
// over this project's top-level mock in every router-integration test
// (main-timer-ready/onboarding-redirect/settings-navigation), so patching
// useReducedMotion has to happen at this shared subpath instead -- the
// one place both paths actually converge.
const actual = jest.requireActual("react-native-reanimated/mock");

module.exports = {
  ...actual,
  useReducedMotion: () => false,
};
