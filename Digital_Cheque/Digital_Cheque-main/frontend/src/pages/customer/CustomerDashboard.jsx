/**
 * CustomerDashboard — home for individual/corporate users.
 *
 * Pulls real data from:
 *   /auth/me               → balance + account number
 *   /cheques/my-cheques    → cheques the user issued
 *   /cheques/received      → cheques the user received
 *
 * Sorted by issue_timestamp. Status badges are real backend statuses.
 */
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCombinedCheques } from '../../hooks/useCheques';
import StatusBadge from '../../components/StatusBadge';
import Spinner from '../../components/Spinner';
import {
  Wallet, Clock, FileText, Plus, Filter, TrendingUp, Shield, Send, Download, RefreshCw,
} from 'lucide-react';
import { formatRupeesFromPaise, formatDate, truncateMiddle } from '../../utils/format';

const CustomerDashboard = () => {
  const { user, account, refreshMe } = useAuth();
  const navigate = useNavigate();
  const { combined, loading, error, refresh } = useCombinedCheques();
  const recent = combined.slice(0, 6);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  const activeCount = combined.filter((c) =>
    ['ISSUED', 'PRESENTED', 'OTP_PENDING', 'PENDING_COSIGN'].includes(c.status)
  ).length;
  const pendingCount = combined.filter((c) => c.status === 'OTP_PENDING').length;

  const balanceRupees = account?.balance != null
    ? formatRupeesFromPaise(Math.round(account.balance * 100))
    : '—';

  const handleRefreshBalance = () => {
    refreshMe();
  };

  return (
    <div className="p-6 lg:p-10 space-y-8 animate-fade-in-up">
      {/* Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1F4E79]">Overview</h1>
          <p className="text-gray-500">
            Welcome back, {user?.full_name?.split(' ')[0] || 'there'}. Your account is active.
          </p>
          {account?.account_number && (
            <p className="text-xs text-gray-400 font-mono mt-1">
              A/C: <span className="text-[#1F4E79] font-semibold">{account.account_number}</span>
              {account?.ifsc && <span className="ml-2">· IFSC: {account.ifsc}</span>}
            </p>
          )}
        </div>
        <button
          onClick={() => navigate('/customer/issue')}
          className="hidden md:flex items-center gap-2.5 bg-[#1F4E79] text-white font-bold px-6 py-3 rounded-xl shadow-lg hover:bg-[#163d63] active:scale-[0.98] transition-all"
        >
          <Plus size={20} /> Issue New Cheque
        </button>
      </div>

      {/* Action cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => navigate('/customer/issue')}
          className="bg-gradient-to-br from-[#1F4E79] to-[#2c6ba8] text-white rounded-2xl p-6 flex items-center justify-between text-left hover:shadow-lg transition-all group"
        >
          <div>
            <p className="text-xs uppercase tracking-widest text-blue-200 font-bold">Action</p>
            <h3 className="text-2xl font-bold mt-1">Send Cheque</h3>
            <p className="text-sm text-blue-100 mt-1">Issue a cryptographically signed cheque</p>
          </div>
          <Send size={32} className="text-blue-200 group-hover:translate-x-1 transition-transform" />
        </button>
        <button
          onClick={() => navigate('/customer/verify')}
          className="bg-white border border-gray-100 rounded-2xl p-6 flex items-center justify-between text-left hover:shadow-lg transition-all group"
        >
          <div>
            <p className="text-xs uppercase tracking-widest text-gray-400 font-bold">Action</p>
            <h3 className="text-2xl font-bold text-[#1F4E79] mt-1">Deposit Cheque</h3>
            <p className="text-sm text-gray-500 mt-1">Present a received cheque for clearing</p>
          </div>
          <Download size={32} className="text-[#1F4E79] group-hover:translate-x-1 transition-transform" />
        </button>
      </section>

      {/* Stat cards */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {[
          { label: 'Balance', value: balanceRupees, icon: Wallet, color: 'bg-blue-100 text-blue-600' },
          { label: 'Active Cheques', value: activeCount, icon: FileText, color: 'bg-purple-100 text-purple-600' },
          { label: 'Pending OTP', value: pendingCount, icon: Clock, color: 'bg-yellow-100 text-yellow-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-5">
            <div className={`w-12 h-12 ${color} rounded-full flex items-center justify-center flex-shrink-0`}>
              <Icon size={22} />
            </div>
            <div className="flex-1">
              <p className="text-gray-500 text-sm font-medium">{label}</p>
              <div className="flex items-center gap-2">
                <h3 className="text-2xl font-bold text-[#1F4E79]">{value}</h3>
                {label === 'Balance' && (
                  <button
                    onClick={handleRefreshBalance}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
                    title="Refresh balance"
                  >
                    <RefreshCw size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Cheques table */}
      <section className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white">
          <h2 className="font-bold text-xl text-[#1F4E79]">Recent Cheques</h2>
          <div className="flex gap-2">
            <button
              onClick={refresh}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
              title="Refresh"
            >
              <Filter size={18} />
            </button>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-10 text-sm text-gray-400 gap-2">
            <Spinner size="sm" /> Loading cheques…
          </div>
        )}

        {error && !loading && (
          <div className="mx-6 my-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
            {error}
          </div>
        )}

        {!loading && !error && recent.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <FileText className="mx-auto mb-3 text-gray-300" size={36} />
            <p>No cheques yet. Issue your first smart cheque to get started.</p>
          </div>
        )}

        {!loading && !error && recent.length > 0 && (
          <>
            {/* Desktop table */}
            <div className="overflow-x-auto hidden sm:block">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['Type', 'Counterparty', 'Amount', 'Status', 'Date', ''].map((h) => (
                      <th key={h} className="px-6 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recent.map((cheque) => {
                    const isReceived = cheque._kind === 'received';
                    return (
                      <tr
                        key={cheque.id}
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/customer/cheque/${cheque.id}`)}
                      >
                        <td className="px-6 py-4">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                            isReceived ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {isReceived ? 'Received' : 'Issued'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-medium text-[#1F4E79]">
                            {isReceived ? `From drawer` : (cheque.payee_name || '—')}
                          </p>
                          <p className="text-[10px] font-mono text-gray-400">{truncateMiddle(cheque.id, 6)}</p>
                        </td>
                        <td className="px-6 py-4 font-bold text-[#1F4E79]">
                          {formatRupeesFromPaise(cheque.amount_paise)}
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={cheque.status} />
                        </td>
                        <td className="px-6 py-4 text-gray-400 text-sm">{formatDate(cheque.issue_timestamp)}</td>
                        <td className="px-6 py-4 text-right text-[#1F4E79] text-xs font-semibold">View →</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-gray-50">
              {recent.map((cheque) => {
                const isReceived = cheque._kind === 'received';
                return (
                  <div
                    key={cheque.id}
                    className="p-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/customer/cheque/${cheque.id}`)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-[10px] font-mono text-gray-400">{truncateMiddle(cheque.id, 6)}</p>
                        <p className="font-semibold text-[#1F4E79]">
                          {isReceived ? 'From drawer' : cheque.payee_name}
                        </p>
                      </div>
                      <StatusBadge status={cheque.status} size="sm" />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-[#1F4E79]">{formatRupeesFromPaise(cheque.amount_paise)}</span>
                      <span className="text-xs text-gray-400">{formatDate(cheque.issue_timestamp)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div className="px-6 py-3.5 bg-white border-t border-gray-100 text-center">
          <button onClick={() => navigate('/customer/cheques')} className="text-[#1F4E79] font-bold text-sm hover:underline">
            View All Transaction History →
          </button>
        </div>
      </section>

      {/* Bottom promo card */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-8">
        <div
          className="rounded-2xl overflow-hidden relative min-h-[180px] p-6 flex flex-col justify-between"
          style={{ background: 'linear-gradient(135deg, #1F4E79 0%, #2c6ba8 100%)' }}
        >
          <div className="relative z-10">
            <h4 className="text-white font-bold text-xl mb-2">Cryptographic Security</h4>
            <p className="text-blue-100 text-sm max-w-xs mb-4">
              Every SmartCheque is secured with AES-256-GCM encryption, ECC secp256k1
              signatures, and RSA-4096 OAEP.
            </p>
            <button className="bg-white/20 text-white border border-white/30 px-4 py-2 rounded-lg font-bold text-sm hover:bg-white/30 transition-all backdrop-blur-sm">
              Learn About ECDSA
            </button>
          </div>
          <Shield size={140} className="absolute -right-8 -bottom-8 opacity-10 text-white" />
        </div>

        <div className="bg-white p-6 rounded-2xl flex flex-col justify-between border border-gray-100 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={20} className="text-[#1F4E79]" />
              <h4 className="font-bold text-xl text-[#1F4E79]">Account Health</h4>
            </div>
            <p className="text-gray-500 text-sm">KYC status: <span className="font-bold text-[#1F4E79]">{user?.kyc_status || 'PENDING'}</span></p>
          </div>
          <div className="mt-6 space-y-3">
            {[
              { label: 'Email Verified', pct: user?.email ? 100 : 0 },
              { label: 'Mobile Linked', pct: user?.mobile ? 100 : 0 },
              { label: 'KYC', pct: user?.kyc_status === 'VERIFIED' ? 100 : 30 },
            ].map(({ label, pct }) => (
              <div key={label}>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{label}</span>
                  <span className="font-semibold text-[#1F4E79]">{pct}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#1F4E79] rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default CustomerDashboard;