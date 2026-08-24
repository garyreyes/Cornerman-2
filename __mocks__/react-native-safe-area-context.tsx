// SafeAreaProvider waits for a real onLayout event to know the frame size
// before rendering children -- that never fires under Jest, so children
// render as nothing without this. Reuses the package's own official mock,
// which ships as a default export -- unwrapped here so named imports
// (SafeAreaProvider, SafeAreaView, ...) resolve correctly.
const mock = require("react-native-safe-area-context/jest/mock");
module.exports = mock.default ?? mock;
