/**
 * ReviewQueue — officer view of cheques needing attention.
 *
 * Shows OTP_PENDING + PRESENTED + REJECTED + EXPIRED cheques from the
 * officer's own issued/received lists (backend has no system-wide
 * "list all" endpoint for officers, so we use the officer's own
 * perspective).
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listMyCheques, listReceivedCheques, getRiskDetails } from '../../api/cheques';
import StatusBadge from '../../components/StatusBadge';
import Spinner from '../../components/Spinner';
import { Shield, Search } from 'lucide-react';
import { formatRupeesFromPaise, formatDate, truncateMiddle } from '../../utils/format';
import { getRiskColors } from '../../utils/status';

const REVIEW_STATUSES = ['OTP_PENDING', 'PRESENTED', 'REJECTED', 'EXPIRED', 'ISSUED'];

export default function ReviewQueue() {
  const navigate = useNavigate();
  const [cheques, setCheques] = useState([]);
  const [risks, setRisks] = useState({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    setErr('');
    try {
      const [mine, recv] = await Promise.all([
        listMyCheques().catch(() => []),
        listReceivedCheques().catch(() => []),
      ]);
      const all = [...mine, ...recv].filter((c) => REVIEW_STATUSES.includes(c.status));
      setCheques(all);
      const risky = await Promise.all(
        all.map(async (c) => {
          try { return [c.id, await getRiskDetails(c.id)]; }
          catch (_) { return [c.id, null]; }
        })
      );
      const map = {};
      for (const [id, r] of risky) if (r) map[id] = r;
      setRisks(map);
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || 'Failed to load review queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = cheques.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (c.id || '').toLowerCase().includes(q) ||
      (c.payee_name || '').toLowerCase().includes(q) ||
      (c.leaf_serial || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 text-white animate-fade-in-up dark-scrollbar" style={{ minHeight: 'calc(100vh - 64px)' }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">Review Queue</h1>
          <p className="text-[#483e79] text-sm font-mono mt-1">
            Cheques in your purview needing attention · {cheques.length} total
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#483e79]" size={15} />
          <input
            type="text"
            placeholder="Search id, payee, leaf…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-[#1c104b]/60 border border-white/10 text-white placeholder-[#483e79] pl-9 pr-4 py-2.5 font-mono text-sm focus:outline-none focus:border-[#7547ac] transition-colors w-60"
          />
        </div>
      </div>

      <div className="bg-[#1c104b]/60 border border-white/10">
        {loading && (
          <div className="flex items-center justify-center py-10 text-sm text-[#867cbb] gap-2">
            <Spinner size="sm" tone="white" /> Loading…
          </div>
        )}
        {err && !loading && (
          <div className="mx-6 my-4 text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            {err}
          </div>
        )}
        {!loading && !err && filtered.length === 0 && (
          <div className="text-center py-12 text-[#867cbb]">
            <Shield className="mx-auto mb-3 opacity-40" size={36} />
            <p>No cheques need review right now.</p>
          </div>
        )}
        {!loading && !err && filtered.length > 0 && (
          <div className="overflow-x-auto dark-scrollbar">
            <table className="w-full text-left font-mono">
              <thead className="text-[10px] uppercase tracking-widest text-[#483e79] bg-black/20">
                <tr>
                  {['Cheque ID', 'Payee', 'Amount', 'Status', 'Risk', 'Issued'].map((h) => (
                    <th key={h} className="px-5 py-4 border-b border-white/5 font-bold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-white/5">
                {filtered.map((c) => {
                  const r = risks[c.id];
                  const riskColors = r ? getRiskColors(r.risk_score) : null;
                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-white/5 transition-colors cursor-pointer"
                      onClick={() => navigate(`/official/cheque/${c.id}`)}
                    >
                      <td className="px-5 py-3.5 text-[#dab9ff] font-bold text-xs">
                        {truncateMiddle(c.id, 8)}
                        <div className="text-[10px] text-[#483e79]">{c.leaf_serial}</div>
                      </td>
                      <td className="px-5 py-3.5 text-[#c9c4d1]">{c.payee_name || '—'}</td>
                      <td className="px-5 py-3.5 text-white font-bold">
                        {formatRupeesFromPaise(c.amount_paise)}
                      </td>
                      <td className="px-5 py-3.5"><StatusBadge status={c.status} /></td>
                      <td className="px-5 py-3.5">
                        {riskColors ? (
                          <span className={`px-2 py-0.5 text-[10px] font-bold uppercase border ${riskColors.bg} ${riskColors.text} ${riskColors.border}`}>
                            {riskColors.label} ({r.risk_score})
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#483e79]">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-[#867cbb] text-xs">{formatDate(c.issue_timestamp)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}