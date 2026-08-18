'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** Travel time between two stations, and how long the tour dwells on each. */
export const TOUR_TRAVEL_MS = 1000;
export const TOUR_DWELL_MS = 2800;
export const TOUR_CELEBRATE_MS = 3600;

export interface TourState {
  /** Index of the station the tour is currently travelling to / resting on. */
  index: number;
  playing: boolean;
  /** True once the marker has arrived — this is what reveals the station. */
  arrived: boolean;
  celebrating: boolean;
}

interface UseTourOptions {
  stationCount: number;
  onArrive: (index: number) => void;
  onLeave: () => void;
}

/**
 * Drives the automated story tour.
 *
 * Timing is setTimeout-based rather than tied to the marker animation's
 * completion, so a throttled/background tab (where rAF stalls) can't wedge
 * the tour mid-step — the marker animation is decorative on top of this.
 */
export function useTour({ stationCount, onArrive, onLeave }: UseTourOptions) {
  const [state, setState] = useState<TourState>({
    index: -1,
    playing: false,
    arrived: false,
    celebrating: false,
  });

  const onArriveRef = useRef(onArrive);
  const onLeaveRef = useRef(onLeave);
  useEffect(() => {
    onArriveRef.current = onArrive;
    onLeaveRef.current = onLeave;
  });

  const play = useCallback(() => {
    setState((s) =>
      // Resume where the visitor paused rather than restarting the story.
      s.index >= 0 && !s.celebrating
        ? { ...s, playing: true }
        : { index: 0, playing: true, arrived: false, celebrating: false }
    );
  }, []);

  const pause = useCallback(() => {
    setState((s) => ({ ...s, playing: false }));
  }, []);

  const stop = useCallback(() => {
    setState({ index: -1, playing: false, arrived: false, celebrating: false });
    onLeaveRef.current();
  }, []);

  const { index, playing } = state;

  useEffect(() => {
    if (!playing || index < 0 || index >= stationCount) return;

    const arriveTimer = window.setTimeout(() => {
      setState((s) => (s.playing ? { ...s, arrived: true } : s));
      onArriveRef.current(index);
    }, TOUR_TRAVEL_MS);

    const advanceTimer = window.setTimeout(() => {
      setState((s) => {
        if (!s.playing) return s;
        if (index >= stationCount - 1) {
          return { ...s, playing: false, celebrating: true };
        }
        return { ...s, index: index + 1, arrived: false };
      });
    }, TOUR_TRAVEL_MS + TOUR_DWELL_MS);

    return () => {
      window.clearTimeout(arriveTimer);
      window.clearTimeout(advanceTimer);
    };
  }, [playing, index, stationCount]);

  // Clear the celebration burst after it has played.
  useEffect(() => {
    if (!state.celebrating) return;
    const timer = window.setTimeout(() => setState((s) => ({ ...s, celebrating: false })), TOUR_CELEBRATE_MS);
    return () => window.clearTimeout(timer);
  }, [state.celebrating]);

  return { ...state, play, pause, stop };
}
