// react-native-worklets (react-native-reanimated v4's native runtime) has
// no JS-only fallback under Jest -- its native module init throws
// immediately on import (PROJECT_FACTS.md's established lesson: verify,
// don't assume, a native module works under Jest). Reuses the package's
// own official mock rather than hand-rolling one.
module.exports = require("react-native-worklets/lib/module/mock");
