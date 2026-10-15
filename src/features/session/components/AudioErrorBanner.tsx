import { InlineErrorBanner } from "../../../shared/components/InlineErrorBanner";

const MESSAGE = "Sound unavailable — check volume/permissions";

/**
 * "The timer still runs visually ... even if sound genuinely cannot
 * start, with a small persistent banner ... rather than blocking the
 * whole session" -- docs/user-flows.md's proposed default for this edge
 * case (audio engine init failure). A thin, fixed-message wrapper over the
 * shared `InlineErrorBanner` (promoted from this component during the
 * Phase 14 critique once Round Builder's save error needed the same
 * announced-alert treatment) -- callers are unchanged.
 */
export function AudioErrorBanner() {
  return <InlineErrorBanner message={MESSAGE} />;
}
