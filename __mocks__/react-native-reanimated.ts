// react-native-reanimated ships its own official Jest mock (a fully
// simplified, no-native-runtime fake), reused directly rather than the
// real source -- same pattern as react-native-worklets.ts in this folder.
// Its own comment admits useReducedMotion is a known gap ("useReducedMotion:
// ADD ME IF NEEDED" in src/mock.ts) -- patched in here, added for the
// Phase 6a audit's Reduce Motion fix. (Real source had previously worked
// under Jest with no manual mock at all, but resolved `useReducedMotion`
// inconsistently between plain `require()` and the app's actual Babel-
// compiled `import` -- confirmed while debugging this -- so this switches
// the whole module to the officially-intended-for-Jest mock instead of
// patching around that inconsistency.)
const officialMock = require("react-native-reanimated/mock");

module.exports = {
  ...officialMock,
  useReducedMotion: () => false,
};
