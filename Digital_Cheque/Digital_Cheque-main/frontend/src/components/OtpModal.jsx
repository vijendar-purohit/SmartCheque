/**
 * OtpModal — drawer approves/rejects an OTP_PENDING cheque.
 *
 * Props:
 *   open: bool
 *   cheque: { id, payee_name, amount_paise, issue_timestamp, ... }
 *   onClose(): void
 *   onResolved({ status, message }): void   ← called after success
 *
 * Calls POST /cheques/{id}/otp/respond with {otp_code, response}.
 */
import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Shield } from 'lucide-react';
import Spinner from './Spinner';
import { respondToOtp } from '../api/cheques';
import { formatRupeesFromPaise, formatDate } from '../utils/format';
import { useAuth } from '../context/AuthContext';

export default function OtpModal({ open, cheque, onClose, onResolved }) {
  const { refreshBalance } = useAuth();
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (open) {
      setOtp('');
      setErr('');
      setBusy(false);
    }
  }, [open]);

  if (!open || !cheque) return null;

  const submit = async (response /* 'APPROVE' | 'REJECT' */) => {
    if (response === 'APPROVE' && otp.length < 6) {
      setErr('Enter the 6-digit OTP first.');
      return;
    }
    setBusy(true);
    setErr('');
    try {
      const data = await respondToOtp(cheque.id, otp, response);
      if (response === 'APPROVE') {
        await refreshBalance().catch(() => {});
      }
      onResolved?.({ response, ...data });
    } catch (e) {
      const detail = e?.response?.data?.detail || e?.message || 'Failed to submit OTP.';
      setErr(detail);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1c104b]/80 backdrop-blur-sm animate-fade-in-up">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100">
        <div className="px-7 pt-7 pb-4 bg-gradient-to-br from-[#1c104b] to-[#7547ac] text-white">
          <div className="flex items-center gap-2 mb-1">
            <Shield size={16} className="text-[#dab9ff]" />
            <p className="text-[10px] uppercase tracking-widest font-bold text-[#dab9ff]">Drawer Verification</p>
          </div>
          <h3 className="text-xl font-bold">Approve or Reject Cheque</h3>
          <p className="text-[#dab9ff] text-xs mt-1">Enter the OTP sent to you, then choose an action.</p>
        </div>

        <div className="px-7 py-6 space-y-5">
          <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Payee</p>
                <p className="font-semibold text-[#1c104b]">{cheque.payee_name || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Amount</p>
                <p className="font-bold text-[#1c104b]">{formatRupeesFromPaise(cheque.amount_paise)}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Cheque ID</p>
                <p className="font-mono text-xs text-gray-600 break-all">{cheque.id}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Issued</p>
                <p className="text-xs text-gray-600">{formatDate(cheque.issue_timestamp, true)}</p>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-gray-400">One-time password</label>
            <input
              autoFocus
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-full text-center text-2xl tracking-[0.5em] font-mono font-bold px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#7547ac] focus:ring-2 focus:ring-[#7547ac]/20 outline-none"
            />
          </div>

          {err && (
            <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 font-medium">
              {err}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => submit('REJECT')}
              className="flex-1 py-3 rounded-xl border border-red-200 text-red-600 font-bold text-sm hover:bg-red-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {busy ? <Spinner size="sm" tone="violet" /> : <XCircle size={16} />}
              Reject
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => submit('APPROVE')}
              className="flex-1 py-3 rounded-xl bg-green-600 text-white font-bold text-sm hover:bg-green-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {busy ? <Spinner size="sm" tone="white" /> : <CheckCircle size={16} />}
              Approve
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="w-full text-sm text-gray-400 hover:text-[#1c104b] transition-colors py-1"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}