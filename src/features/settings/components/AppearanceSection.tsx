import { SectionCard } from "../../../shared/components/SectionCard";
import { SegmentedControl } from "../../../shared/components/SegmentedControl";
import { useTheme } from "../../../shared/theme/ThemeContext";
import type { ThemeModeSetting } from "../types";

const THEME_OPTIONS: { value: ThemeModeSetting; label: string }[] = [
  { value: "system", label: "SYSTEM" },
  { value: "light", label: "LIGHT" },
  { value: "dark", label: "DARK" },
];

/**
 * The one new section from the dark/orange redesign (docs/design-direction.md).
 * Driven by ThemeContext directly rather than the screen's own `settings`
 * state/`onChange` prop -- theme mode has to be visible instantly to every
 * screen in the app the moment it changes, not just this one after its
 * next autosave round-trip, so it's the one Settings field with its own
 * dedicated read/write path.
 */
export function AppearanceSection() {
  const { mode, setThemeModeSetting } = useTheme();
  return (
    <SectionCard title="APPEARANCE">
      <SegmentedControl options={THEME_OPTIONS} value={mode} onChange={setThemeModeSetting} />
    </SectionCard>
  );
}
