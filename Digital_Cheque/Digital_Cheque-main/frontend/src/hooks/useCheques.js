/**
 * useCheques — fetches and caches a user's cheque lists.
 *
 * Two separate buckets:
 *   - issued:  GET /cheques/my-cheques   (drawer's cheques)
 *   - received: GET /cheques/received   (payee's cheques)
 *
 * Returns {issued, received, loading, error, refresh()}.
 * Used by CustomerDashboard, MyCheques, OtpModal.
 */
import { useCallback, useEffect, useState } from 'react';
import * as chequesApi from '../api/cheques';
import { useAuth } from '../context/AuthContext';

export function useCheques() {
  const { isAuthenticated } = useAuth();
  const [issued, setIssued] = useState([]);
  const [received, setReceived] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setIssued([]);
      setReceived([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [a, b] = await Promise.all([
        chequesApi.listMyCheques().catch((e) => {
          // Some roles (BANK_OFFICER) might not own any cheques — that's fine.
          if (e?.response?.status === 404) return [];
          throw e;
        }),
        chequesApi.listReceivedCheques().catch((e) => {
          if (e?.response?.status === 404) return [];
          throw e;
        }),
      ]);
      setIssued(a || []);
      setReceived(b || []);
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || 'Failed to load cheques.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { issued, received, loading, error, refresh };
}

/** Combined, sorted-by-date view for dashboards. */
export function useCombinedCheques() {
  const { issued, received, loading, error, refresh } = useCheques();

  const combined = (() => {
    const tag = (c, kind) => ({ ...c, _kind: kind });
    const all = [...issued.map((c) => tag(c, 'issued')), ...received.map((c) => tag(c, 'received'))];
    return all.sort((a, b) => {
      const da = new Date(a.issue_timestamp || 0).getTime();
      const db = new Date(b.issue_timestamp || 0).getTime();
      return db - da;
    });
  })();

  return { combined, issued, received, loading, error, refresh };
}