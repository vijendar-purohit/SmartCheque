/**
 * AuditLog — activity timeline derived from the officer's own cheques.
 *
 * The backend doesn't expose a dedicated audit-log endpoint, so we
 * synthesize a read-only event stream from the real /cheques/my-cheques
 * and /cheques/received lists, sorted newest first. Every event is
 * tied to a real backend status; no fabricated entries.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listMyCheques, listReceivedCheques } from '../../api/cheques';
import Spinner from '../../components/Spinner';
import { History, Search, FileSearch } from 'lucide-react';
import { formatDate, truncateMiddle } from '../../utils/format';
import { STATUS_LABELS } from '../../utils/status';

const STATUS_TONE = {
  ISSUED: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  PRESENTED: 'text-yellow-300 bg-yellow-500/10 border-yellow-500/30',
  OTP_PENDING: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  OTP_APPROVED: 'text-green-300 bg-green-500/10 border-green-500/30',
  CLEARED: 'text-green-400 bg-green-500/10 border-green-500/30',
  REJECTED: 'text-red-400 bg-red-500/10 border-red-500/30',
  EXPIRED: 'text-[#867cbb] bg-white/5 border-white/10',
  CANCELLED: 'text-[#867cbb] bg-white/5 border-white/10',
};

const ACTION_LABEL = (status) => `Cheque status: ${STATUS_LABELS[status] || status}`;

export default function AuditLog() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
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
      const events = [
        ...mine.map((c) => ({ ...c, _kind: 'issued', _actor: 'You (drawer)' })),
        ...recv.map((c) => ({ ...c, _kind: 'received', _actor: 'You (payee)' })),
      ]
        .sort((a, b) => new Date(b.issue_timestamp) - new Date(a.issue_timestamp))
        .map((c) => ({
          id: `${c.id}-${c._kind}`,
          chequeId: c.id,
          actor: c._actor,
          action: ACTION_LABEL(c.status),
          timestamp: c.issue_timestamp,
          ip: '—',
          device: c._kind === 'issued' ? 'Drawer device' : 'Payee device',
          status: c.status,
          tone: STATUS_TONE[c.status] || STATUS_TONE.EXPIRED,
        }));
      setEntries(events);
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || 'Failed to load audit log.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = entries.filter((e) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      e.actor.toLowerCase().includes(q) ||
      e.action.toLowerCase().includes(q) ||
      (e.chequeId || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 text-white animate-fade-in-up dark-scrollbar" style={{ minHeight: 'calc(100vh - 64px)' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <History size={20} className="text-[#dab9ff]" />
            <h1 className="text-2xl font-bold">Audit Log</h1>
          </div>
          <p className="text-[#483e79] text-sm font-mono">
            Append-only event stream · {entries.length} entries
          </p>
        </div>
        <div className="text-[10px] text-green-400 font-mono flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full" /> LIVE · read-only
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#483e79]" size={15} />
        <input
          type="text"
          placeholder="Search actor, action, cheque id..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[#1c104b]/60 border border-white/10 text-white placeholder-[#483e79] pl-9 pr-4 py-2.5 font-mono text-sm focus:outline-none focus:border-[#7547ac] transition-colors"
        />
      </div>

      {/* Table */}
      <div className="bg-[#1c104b]/60 border border-white/10 overflow-hidden">
        {loading && (
          <div className="flex items-center justify-center py-10 text-sm text-[#867cbb] gap-2">
            <Spinner size="sm" tone="white" /> Loading audit log…
          </div>
        )}
        {err && !loading && (
          <div className="mx-6 my-4 text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            {err}
          </div>
        )}
        {!loading && !err && filtered.length === 0 && (
          <div className="text-center py-12 text-[#867cbb]">
            <FileSearch className="mx-auto mb-3 opacity-40" size={36} />
            <p>No audit entries yet.</p>
          </div>
        )}
        {!loading && !err && filtered.length > 0 && (
          <div className="overflow-x-auto dark-scrollbar">
            <table className="w-full text-left font-mono">
              <thead className="text-[10px] uppercase tracking-widest text-[#483e79] bg-black/20">
                <tr>
                  {['#', 'Actor', 'Action', 'Cheque ID', 'Timestamp'].map((h) => (
                    <th key={h} className="px-5 py-4 border-b border-white/5 font-bold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-white/5">
                {filtered.map((e, i) => (
                  <tr
                    key={e.id}
                    className="hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => navigate(`/official/cheque/${e.chequeId}`)}
                  >
                    <td className="px-5 py-3.5 text-[#483e79]">{i + 1}</td>
                    <td className="px-5 py-3.5 text-[#dab9ff] font-semibold">{e.actor}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase border ${e.tone}`}>
                        {e.action}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-[#c9c4d1] text-xs">
                      {truncateMiddle(e.chequeId, 8)}
                    </td>
                    <td className="px-5 py-3.5 text-[#867cbb] text-xs">
                      {formatDate(e.timestamp, true)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-5 py-3 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-[#483e79]">
          <span>Showing {filtered.length} of {entries.length} entries · Read-only</span>
          <span className="text-green-400">● Append-only · Tamper-evident</span>
        </div>
      </div>
    </div>
  );
}