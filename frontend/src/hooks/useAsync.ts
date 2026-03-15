import { useState, useEffect, useRef } from 'react';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Runs an async function whenever `deps` change and tracks its loading/error state.
 * Ignores the result of a stale call if the component re-renders before it resolves.
 */
export function useAsync<T>(
  asyncFn: () => Promise<T>,
  deps: unknown[],
): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  // Use a ref so the cleanup function inside useEffect can cancel stale calls.
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    setState({ data: null, loading: true, error: null });

    asyncFn()
      .then((data) => {
        if (!cancelledRef.current) {
          setState({ data, loading: false, error: null });
        }
      })
      .catch((err: unknown) => {
        if (!cancelledRef.current) {
          setState({
            data: null,
            loading: false,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      });

    return () => {
      cancelledRef.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
