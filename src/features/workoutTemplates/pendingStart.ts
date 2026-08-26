/**
 * Transient, in-memory-only "start this template" signal from the
 * Templates Picker back to the already-mounted Main Timer screen.
 *
 * Tapping a template row navigates via `router.back()` rather than
 * `router.push("/")` -- Main Timer stays mounted underneath Templates the
 * whole time (React Navigation's normal stack behavior), so popping back
 * to it reuses the existing screen instance instead of re-initializing
 * native audio/speech engines. But `back()` carries no params, so there's
 * no route-param channel to tell that already-mounted instance "start
 * this template" -- this fills that one gap. useSession.ts consumes it
 * inside the same `useFocusEffect` that already re-syncs settings/
 * punches/presets on focus, so it's checked at exactly the moment Main
 * Timer becomes visible again. Get-and-clear by design: never persisted,
 * never fires twice for one tap.
 */
let pendingTemplateId: string | null = null;

export function setPendingTemplateStart(id: string): void {
  pendingTemplateId = id;
}

export function consumePendingTemplateStart(): string | null {
  const id = pendingTemplateId;
  pendingTemplateId = null;
  return id;
}
