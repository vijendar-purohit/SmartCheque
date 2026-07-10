/**
 * ClearingHouse — officer view of recently cleared/rejected cheques.
 *
 * Backend endpoints used:
 *   - GET /cheques/my-cheques + /cheques/received  → officer's own settlements
 *
 * NOTE: the backend has no "list all system-wide cleared settlements"
 * endpoint for officers, so we render the officer's own CLEARED +
 * REJECTED + OTP_PENDING + PRESENTED cheques as a settlement queue.
 * The animated batch-runner / fake log has been dropped because it
 * produced fictitious settlement activity.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listMyCheques, listReceivedCheques } from '../../api/cheques';
import StatusBadge from '../../components/StatusBadge';
import Spinner from '../../components/Spinner';
import { RefreshCw, Download, Building2 } from 'lucide-react';
import { formatRupeesFromPaise, formatDate, truncateMiddle } from '../../utils/format';

const SETTLEMENT_STATUSES = ['CLEARED', 'REJECTED', 'OTP_PENDING', 'PRESENTED', 'EXPIRED'];

export default function ClearingHouse() {
  const navigate = useNavigate();
  const [cheques, setCheques] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = async () => {
    setLoading(true);
    setErr('');
    try {
      const [mine, recv] = await Promise.all([
        listMyCheques().catch(() => []),
        listReceivedCheques().catch(() => []),
      ]);
      const all = [...mine, ...recv]
        .filter((c) => SETTLEMENT_STATUSES.includes(c.status))
        .sort((a, b) => new Date(b.issue_timestamp) - new Date(a.issue_timestamp));
      setCheques(all);
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || 'Failed to load settlements.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Roll-up counts.
  const counts = cheques.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {});
  const totalVolumePaise = cheques
    .filter((c) => c.status === 'CLEARED')
    .reduce((s, c) => s + (c.amount_paise || 0), 0);

  return (
    <div className="p-6 text-white animate-fade-in-up dark-scrollbar" style={{ minHeight: 'calc(100vh - 64px)' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">Clearing House</h1>
          <p className="text-[#483e79] text-sm font-mono mt-1">
            Inter-bank settlement queue · {cheques.length} entries
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-[#dab9ff] border border-white/10 font-bold text-sm transition-all disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button
            onClick={() => navigate('/official/audit')}
            className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 text-[#dab9ff] border border-white/10 font-bold text-sm transition-all"
          >
            <Download size={15} /> View Audit Log
          </button>
        </div>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Cleared', value: counts.CLEARED || 0, color: 'border-green-500' },
          { label: 'Rejected', value: counts.REJECTED || 0, color: 'border-red-500' },
          { label: 'Pending OTP', value: counts.OTP_PENDING || 0, color: 'border-yellow-500' },
          { label: 'Cleared Vol', value: `₹${(totalVolumePaise / 100000).toFixed(1)}K`, color: 'border-[#7547ac]' },
        ].map(({ label, value, color }) => (
          <div key={label} className={`bg-[#1c104b] p-4 border-l-2 ${color}`}>
            <p className="text-[#483e79] text-[10px] font-bold uppercase tracking-widest mb-1">
              {label}
            </p>
            <p className="text-2xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-[#1c104b]/60 border border-white/10">
        {loading && (
          <div className="flex items-center justify-center py-10 text-sm text-[#867cbb] gap-2">
            <Spinner size="sm" tone="white" /> Loading settlements…
          </div>
        )}
        {err && !loading && (
          <div className="mx-6 my-4 text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            {err}
          </div>
        )}
        {!loading && !err && cheques.length === 0 && (
          <div className="text-center py-12 text-[#867cbb]">
            <Building2 className="mx-auto mb-3 opacity-40" size={36} />
            <p>No settlements in your purview yet.</p>
          </div>
        )}
        {!loading && !err && cheques.length > 0 && (
          <div className="overflow-x-auto dark-scrollbar">
            <table className="w-full text-left font-mono text-xs">
              <thead className="text-[10px] uppercase tracking-widest text-[#483e79] bg-black/20">
                <tr>
                  {['Cheque ID', 'Payee', 'Drawer', 'Amount', 'Status', 'Issued'].map((h) => (
                    <th key={h} className="px-5 py-3 border-b border-white/5 font-bold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {cheques.map((c) => (
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
                    <td className="px-5 py-3.5 text-[#c9c4d1] font-mono text-[10px]">
                      {c.drawer_account_id ? truncateMiddle(c.drawer_account_id, 6) : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-white font-bold">
                      {formatRupeesFromPaise(c.amount_paise)}
                    </td>
                    <td className="px-5 py-3.5"><StatusBadge status={c.status} /></td>
                    <td className="px-5 py-3.5 text-[#867cbb] text-xs">{formatDate(c.issue_timestamp, true)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}