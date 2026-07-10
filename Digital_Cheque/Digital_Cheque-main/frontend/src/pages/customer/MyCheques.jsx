/**
 * MyCheques — list view for issued or received cheques.
 *
 * Uses real backend data:
 *   - prop `received=false` (default) → /cheques/my-cheques  (drawer)
 *   - prop `received=true`           → /cheques/received    (payee)
 *
 * OTP_PENDING rows in the issued list open OtpModal for approve/reject.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCheques } from '../../hooks/useCheques';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/StatusBadge';
import Spinner from '../../components/Spinner';
import OtpModal from '../../components/OtpModal';
import {
  Wallet, Filter, ChevronRight,
} from 'lucide-react';
import { formatRupeesFromPaise, formatDate, truncateMiddle } from '../../utils/format';

export default function MyCheques({ received = false }) {
  const { issued, received: receivedList, loading, error, refresh } = useCheques();
  const { refreshMe } = useAuth();
  const navigate = useNavigate();

  const cheques = received ? receivedList : issued;

  const [otpModal, setOtpModal] = useState({ open: false, cheque: null });
  const [resolved, setResolved] = useState(null);

  const openOtp = (cheque) => setOtpModal({ open: true, cheque });
  const closeOtp = () => setOtpModal({ open: false, cheque: null });

  const onResolved = async (data) => {
    setResolved({ data, at: Date.now() });
    closeOtp();
    await refresh();
    await refreshMe(); // balance may have changed
  };

  return (
    <div className="p-6 lg:p-10 animate-fade-in-up">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#1F4E79]">
            {received ? 'Received Cheques' : 'My Issued Cheques'}
          </h1>
          <p className="text-gray-500">
            {received ? 'Cheques issued to you by others.' : 'All cheques you have issued.'}
          </p>
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#1F4E79] transition-colors"
        >
          <Filter size={16} /> Refresh
        </button>
      </div>

      {resolved && (
        <div
          className={`mb-4 p-4 rounded-xl border text-sm flex items-start gap-3 ${
            resolved.data.status === 'CLEARED'
              ? 'bg-green-50 border-green-200 text-green-800'
              : resolved.data.status === 'REJECTED'
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}
        >
          <ChevronRight size={16} className="mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold">
              {resolved.data.response === 'APPROVE' ? 'Cheque approved' : 'Cheque rejected'} — status now {resolved.data.status}.
            </p>
            {resolved.data.message && <p className="text-xs mt-0.5">{resolved.data.message}</p>}
          </div>
          <button onClick={() => setResolved(null)} className="ml-auto text-xs underline">Dismiss</button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
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

        {!loading && !error && cheques.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Wallet className="mx-auto mb-3 text-gray-300" size={40} />
            <p>No cheques yet.</p>
            {!received && (
              <button
                onClick={() => navigate('/customer/issue')}
                className="mt-4 text-[#1F4E79] font-semibold hover:underline"
              >
                Issue your first cheque →
              </button>
            )}
          </div>
        )}

        {!loading && !error && cheques.length > 0 && (
          <>
            {/* Desktop */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['Cheque', received ? 'Drawer A/C' : 'Payee', 'Amount', 'Status', 'Date', 'Actions'].map((h) => (
                      <th key={h} className="px-6 py-3.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {cheques.map((c) => (
                    <tr
                      key={c.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/customer/cheque/${c.id}`)}
                    >
                      <td className="px-6 py-4">
                        <p className="font-mono text-xs text-gray-500">{truncateMiddle(c.id, 6)}</p>
                        <p className="font-mono text-[10px] text-gray-400">{c.leaf_serial}</p>
                      </td>
                      <td className="px-6 py-4">
                        {received ? (
                          <p className="font-mono text-sm text-[#1F4E79]">{truncateMiddle(c.drawer_account_id, 6)}</p>
                        ) : (
                          <p className="font-medium text-[#1F4E79]">{c.payee_name}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 font-bold text-[#1F4E79]">
                        {formatRupeesFromPaise(c.amount_paise)}
                      </td>
                      <td className="px-6 py-4"><StatusBadge status={c.status} /></td>
                      <td className="px-6 py-4 text-gray-400 text-sm">{formatDate(c.issue_timestamp)}</td>
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        {!received && c.status === 'OTP_PENDING' && (
                          <button
                            onClick={() => openOtp(c)}
                            className="px-3 py-1.5 bg-yellow-500 text-white text-xs font-bold rounded-lg hover:bg-yellow-600 transition-colors"
                          >
                            Approve / Reject
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="sm:hidden divide-y divide-gray-50">
              {cheques.map((c) => (
                <div
                  key={c.id}
                  className="p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/customer/cheque/${c.id}`)}
                >
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <p className="font-mono text-[10px] text-gray-400">{truncateMiddle(c.id, 6)}</p>
                      <p className="font-semibold text-[#1F4E79]">
                        {received ? 'From drawer' : c.payee_name}
                      </p>
                    </div>
                    <StatusBadge status={c.status} size="sm" />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[#1F4E79]">{formatRupeesFromPaise(c.amount_paise)}</span>
                    <span className="text-xs text-gray-400">{formatDate(c.issue_timestamp)}</span>
                  </div>
                  {!received && c.status === 'OTP_PENDING' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); openOtp(c); }}
                      className="mt-3 w-full py-2 bg-yellow-500 text-white text-xs font-bold rounded-lg hover:bg-yellow-600 transition-colors"
                    >
                      Approve / Reject OTP
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <OtpModal
        open={otpModal.open}
        cheque={otpModal.cheque}
        onClose={closeOtp}
        onResolved={onResolved}
      />
    </div>
  );
}