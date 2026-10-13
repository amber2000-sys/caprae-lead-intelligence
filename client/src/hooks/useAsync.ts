import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiRequestError } from '../services/api';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * Run an async loader and expose loading / error / data as explicit state.
 *
 * Every screen in this app renders four states — loading, error, empty and
 * content — and this hook is what makes that cheap enough that no screen skips
 * one. A stale-response guard prevents an earlier, slower request from
 * overwriting the result of a later one when filters change quickly.
 */
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const requestId = useRef(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    const id = ++requestId.current;
    let active = true;

    setLoading(true);
    setError(null);

    loader()
      .then((result) => {
        if (!active || id !== requestId.current) return;
        setData(result);
      })
      .catch((err: unknown) => {
        if (!active || id !== requestId.current) return;
        setError(err instanceof ApiRequestError ? err.message : 'Something went wrong. Please try again.');
      })
      .finally(() => {
        if (!active || id !== requestId.current) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  return { data, loading, error, reload };
}
