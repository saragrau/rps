import { useState, useEffect, useCallback } from 'react';
import { subscribeToLiveMatches } from '../api/client';
import type { MatchResult } from '../api/types';

/**
 * Subscribes to the /api/live SSE stream and prepends incoming matches to a list.
 *
 * @param maxItems  Cap the list length to avoid unbounded growth (default 200).
 */
export function useLiveMatches(maxItems = 200): {
  liveMatches: MatchResult[];
  connected: boolean;
} {
  const [liveMatches, setLiveMatches] = useState<MatchResult[]>([]);
  const [connected, setConnected] = useState(false);

  const onMatch = useCallback(
    (match: MatchResult) => {
      setLiveMatches((prev) => [match, ...prev].slice(0, maxItems));
    },
    [maxItems],
  );

  useEffect(() => {
    const unsubscribe = subscribeToLiveMatches(onMatch, {
      onOpen: () => setConnected(true),
      onClose: () => setConnected(false),
    });
    return unsubscribe;
  }, [onMatch]);

  return { liveMatches, connected };
}
