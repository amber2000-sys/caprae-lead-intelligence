import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../services/api';
import type { BuyBox } from '../types';

interface BuyBoxContextValue {
  buyBox: BuyBox | null;
  loading: boolean;
  error: string | null;
  /** Bumped whenever the Buy Box changes, so dependent screens refetch their scores. */
  version: number;
  refresh: () => Promise<void>;
  save: (payload: Partial<BuyBox>) => Promise<string>;
  reset: () => Promise<void>;
}

const BuyBoxContext = createContext<BuyBoxContextValue | null>(null);

/**
 * The Buy Box is global state: it changes every score on every screen, so it is
 * held once at the app root rather than refetched per page. `version` is the
 * signal dependent screens watch — changing criteria must visibly re-rank the
 * data, and that only works if everything downstream knows the criteria moved.
 */
export function BuyBoxProvider({ children }: { children: ReactNode }) {
  const [buyBox, setBuyBox] = useState<BuyBox | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setBuyBox(await api.getBuyBox());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your Buy Box.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = useCallback(async (payload: Partial<BuyBox>) => {
    const { buyBox: saved, message } = await api.saveBuyBox(payload);
    setBuyBox(saved);
    setVersion((v) => v + 1);
    return message;
  }, []);

  const reset = useCallback(async () => {
    setBuyBox(await api.resetBuyBox());
    setVersion((v) => v + 1);
  }, []);

  const value = useMemo(
    () => ({ buyBox, loading, error, version, refresh, save, reset }),
    [buyBox, loading, error, version, refresh, save, reset]
  );

  return <BuyBoxContext.Provider value={value}>{children}</BuyBoxContext.Provider>;
}

export function useBuyBox(): BuyBoxContextValue {
  const context = useContext(BuyBoxContext);
  if (!context) throw new Error('useBuyBox must be used inside a BuyBoxProvider');
  return context;
}
