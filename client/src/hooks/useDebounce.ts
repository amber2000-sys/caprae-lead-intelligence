import { useEffect, useState } from 'react';

/**
 * Delay a rapidly-changing value.
 *
 * Used on the search box so typing "manufacturing" sends one request rather
 * than thirteen.
 */
export function useDebounce<T>(value: T, delayMs = 350): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
