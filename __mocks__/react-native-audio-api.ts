// react-native-audio-api ships its own official in-memory mock (real class
// behavior, no native binding) specifically for this purpose -- reuse it
// instead of hand-rolling one, unlike the other manual mocks in this folder.
module.exports = require("react-native-audio-api/mock");
