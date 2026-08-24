/** "M:SS" display for the Round/Work/Rest/Warmup duration wheels. */
export function formatSeconds(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/** Inclusive numeric range used to build a WheelPicker's option list. */
export function range(start: number, end: number, step: number): number[] {
  const values: number[] = [];
  for (let v = start; v <= end; v += step) {
    values.push(Math.round(v * 100) / 100);
  }
  return values;
}
