import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { AppState } from "react-native";

import type { AudioEngine } from "../audio/types";
import type { Combo } from "../comboEngine/types";
import type { SpeechEngine } from "../speech/types";
import {
  rewindPlayback,
  shiftPlaybackForResume,
  startPlayback,
  topUpPlayback,
  type PlaybackQueue,
} from "./playbackQueue";
import type { ScheduledItem, ScheduleInputs } from "./schedule";

interface QueuedHandle {
  atMs: number;
  cancel: () => void;
}

export interface PlaybackControls {
  /** The most recently spoken combo, for the combo card. */
  currentCombo: Combo | null;
  comboCount: number;
  begin(startAtMs: number): void;
  /** Queues more ahead and retires what's now due. Safe to call from
   * anything that wakes JS. */
  topUp(nowMs: number): void;
  /** False when there's nothing running to pause. */
  pause(nowMs: number): boolean;
  resume(pausedAtMs: number, resumedAtMs: number): void;
  /** Re-queues everything after `nowMs` from current inputs and engines --
   * after a settings change or a speech-engine swap. */
  reschedule(nowMs: number): void;
  end(): void;
}

/**
 * Plays a session from its precomputed schedule, queued ahead on the audio
 * clock rather than fired from a JS timer -- the only way audio survives
 * the app being backgrounded or the screen locking (PROJECT_FACTS.md,
 * 2026-09-19 spike). Every queued sound's onEnded tops the queue up again,
 * which keeps working while locked; the display tick and AppState changes
 * top it up too while JS is awake.
 */
export function usePlayback(
  getInputs: () => ScheduleInputs,
  audioEngineRef: RefObject<AudioEngine | null>,
  speechEngineRef: RefObject<SpeechEngine | null>,
): PlaybackControls {
  const queueRef = useRef<PlaybackQueue | null>(null);
  const handlesRef = useRef<QueuedHandle[]>([]);
  const pausedRef = useRef(false);
  const [comboDisplay, setComboDisplay] = useState<{ currentCombo: Combo | null; comboCount: number }>({
    currentCombo: null,
    comboCount: 0,
  });

  // Cancelling a sound can fire its onEnded, which tops up and queues new
  // handles -- so swap the list out first rather than clearing it after.
  // Callers also put the queue in its final state before cancelling, so
  // that top-up never acts on a stale queue.
  const cancelAfter = useCallback((nowMs: number) => {
    const handles = handlesRef.current;
    handlesRef.current = [];
    for (const handle of handles) {
      if (handle.atMs > nowMs) {
        handle.cancel();
      }
    }
  }, []);

  // Declared before handOver so each sound's onEnded can reach topUp
  // without a circular useCallback dependency.
  const topUpRef = useRef<(nowMs: number) => void>(() => {});

  const handOver = useCallback(
    (items: ScheduledItem[]) => {
      const onEnded = () => topUpRef.current(Date.now());
      for (const item of items) {
        const cancel =
          item.kind === "cue"
            ? audioEngineRef.current?.scheduleCue(item.cue, item.atMs, onEnded)
            : speechEngineRef.current?.scheduleUtterance(item.words, item.atMs, onEnded);
        if (cancel) {
          handlesRef.current.push({ atMs: item.atMs, cancel });
        }
      }
    },
    [audioEngineRef, speechEngineRef],
  );

  const topUp = useCallback(
    (nowMs: number) => {
      const queue = queueRef.current;
      if (queue === null || pausedRef.current) {
        return;
      }
      const result = topUpPlayback(queue, getInputs(), nowMs);
      queueRef.current = result.queue;
      handOver(result.toSchedule);
      // Only handles still in the future can ever be cancelled.
      handlesRef.current = handlesRef.current.filter((handle) => handle.atMs > nowMs);

      const spokenCombos = result.played.flatMap((item) => (item.kind === "combo" ? [item.combo] : []));
      if (spokenCombos.length > 0) {
        setComboDisplay((prev) => ({
          currentCombo: spokenCombos[spokenCombos.length - 1]!,
          comboCount: prev.comboCount + spokenCombos.length,
        }));
      }
    },
    [getInputs, handOver],
  );
  useEffect(() => {
    topUpRef.current = topUp;
  }, [topUp]);

  const begin = useCallback(
    (startAtMs: number) => {
      queueRef.current = null;
      cancelAfter(-Infinity);
      const { queue, firstItems } = startPlayback(getInputs(), startAtMs);
      queueRef.current = queue;
      pausedRef.current = false;
      setComboDisplay({ currentCombo: null, comboCount: 0 });
      handOver(firstItems);
      topUp(startAtMs);
    },
    [cancelAfter, getInputs, handOver, topUp],
  );

  const pause = useCallback(
    (nowMs: number) => {
      const queue = queueRef.current;
      if (queue === null || pausedRef.current || (queue.cursor === null && queue.steps.length === 0)) {
        return false;
      }
      topUp(nowMs);
      queueRef.current = rewindPlayback(queueRef.current!, nowMs);
      pausedRef.current = true;
      cancelAfter(nowMs);
      return true;
    },
    [cancelAfter, topUp],
  );

  const resume = useCallback(
    (pausedAtMs: number, resumedAtMs: number) => {
      const queue = queueRef.current;
      if (queue === null || !pausedRef.current) {
        return;
      }
      queueRef.current = shiftPlaybackForResume(queue, pausedAtMs, resumedAtMs);
      pausedRef.current = false;
      topUp(resumedAtMs);
    },
    [topUp],
  );

  const reschedule = useCallback(
    (nowMs: number) => {
      const queue = queueRef.current;
      if (queue === null || pausedRef.current) {
        return;
      }
      queueRef.current = rewindPlayback(queue, nowMs);
      cancelAfter(nowMs);
      topUp(nowMs);
    },
    [cancelAfter, topUp],
  );

  const end = useCallback(() => {
    queueRef.current = null;
    pausedRef.current = false;
    cancelAfter(-Infinity);
    setComboDisplay({ currentCombo: null, comboCount: 0 });
  }, [cancelAfter]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", () => topUpRef.current(Date.now()));
    return () => subscription.remove();
  }, []);

  return { ...comboDisplay, begin, topUp, pause, resume, reschedule, end };
}
