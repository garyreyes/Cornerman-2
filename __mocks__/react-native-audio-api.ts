// react-native-audio-api ships its own official in-memory mock (real class
// behavior, no native binding) -- reused instead of hand-rolled, unlike the
// other manual mocks in this folder. Its AudioManager/PlaybackNotification-
// Manager stubs don't cover every method this app calls (confirmed Phase
// 7a: setAudioSessionActivity/setAudioSessionOptions/observeAudioInterrup-
// tions, and PlaybackNotificationManager's real singleton API -- show/hide
// -- vs. the mock's unrelated static .create() shape), so those are
// layered on top here as no-ops rather than left to throw under Jest.
const officialMock = require("react-native-audio-api/mock");

// officialMock.AudioManager's methods are static class methods, which are
// non-enumerable by spec -- object-spreading the class silently drops them,
// so each one is forwarded explicitly instead.
const AudioManager = {
  getDevicePreferredSampleRate: () => officialMock.AudioManager.getDevicePreferredSampleRate(),
  observeVolumeChanges: (enabled: boolean) => officialMock.AudioManager.observeVolumeChanges(enabled),
  addSystemEventListener: (event: string, callback: (event: unknown) => void) =>
    officialMock.AudioManager.addSystemEventListener(event, callback),
  removeSystemEventListener: (listener: { remove: () => void }) =>
    officialMock.AudioManager.removeSystemEventListener(listener),
  setAudioSessionActivity: async () => {},
  setAudioSessionOptions: () => {},
  observeAudioInterruptions: () => {},
  disableSessionManagement: () => {},
};

const PlaybackNotificationManager = {
  show: async () => {},
  hide: async () => {},
  enableControl: async () => {},
  isActive: async () => false,
  addEventListener: () => ({ remove: () => {} }),
};

module.exports = {
  ...officialMock,
  AudioManager,
  PlaybackNotificationManager,
  default: { ...officialMock.default, AudioManager, PlaybackNotificationManager },
};
