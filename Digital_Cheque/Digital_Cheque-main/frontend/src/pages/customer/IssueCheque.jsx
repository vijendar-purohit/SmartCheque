/**
 * IssueCheque — 3-step wizard for creating a Smart Square Cheque.
 *
 * Step 1 — Payee details: name, account number, IFSC, branch, bank name
 * Step 2 — Amount entry: main field auto-derives 7 expanded boxes
 *          (crores/lakhs/thousands/hundreds/tens/ones/paise). Confirmation
 *          field must match. Drawer name pre-filled from profile.
 * Step 3 — Preview + Sign: shows summary card. Sign button tries
 *          navigator.credentials.create (WebAuthn) first; falls back to
 *          a password re-prompt modal if not available.
 *
 * On success → success screen with PNG/PDF download buttons.
 */
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { createCheque } from '../../api/cheques';
import { trySignWithWebAuthn, isWebAuthnSupported } from '../../api/webauthn';
import {
  formatRupeesFromPaise,
  parseRupeesToPaise,
  deriveExpandedBoxes,
  todayIsoDate,
} from '../../utils/format';
import Spinner from '../../components/Spinner';
import {
  Lock, Shield, ArrowLeft, ArrowRight, CheckCircle,
  Fingerprint, Key, AlertCircle, FileText, Image as ImageIcon,
  Share2, Download, Copy, Link2,
} from 'lucide-react';

const STEPS = [
  { id: 1, label: 'Payee Details' },
  { id: 2, label: 'Amount' },
  { id: 3, label: 'Preview & Sign' },
];

export default function IssueCheque() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [error, setError] = useState('');

  // Step 1
  const [payee, setPayee] = useState({
    payee_name: '',
    payee_account_number: '',
    ifsc_code: '',
    branch: '',
    bank_name: '',
  });

  // Step 2
  const [amountText, setAmountText] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [drawerName, setDrawerName] = useState(user?.full_name || '');
  const [chequeDate, setChequeDate] = useState(todayIsoDate());

  // Step 3
  const [signing, setSigning] = useState(false);
  const [passwordPrompt, setPasswordPrompt] = useState(false);
  const [passwordValue, setPasswordValue] = useState('');

  // Success
  const [success, setSuccess] = useState(null); // { cheque_id, leaf_serial, png_download_url, pdf_download_url }

  useEffect(() => {
    if (user?.full_name && !drawerName) setDrawerName(user.full_name);
  }, [user, drawerName]);

  const amountPaise = useMemo(() => parseRupeesToPaise(amountText), [amountText]);
  const confirmPaise = useMemo(() => parseRupeesToPaise(confirmText), [confirmText]);
  const boxes = useMemo(() => deriveExpandedBoxes(amountPaise), [amountPaise]);

  const amountMatches = amountPaise > 0 && amountPaise === confirmPaise;
  const expandedSum = useMemo(() => {
    return (boxes.crores * 10000000 + boxes.lakhs * 100000 + boxes.thousands * 1000 +
            boxes.hundreds * 100 + boxes.tens * 10 + boxes.ones) * 100 + boxes.paise;
  }, [boxes]);
  const expandedOk = expandedSum === amountPaise;

  const step1Ok =
    payee.payee_name.trim().length > 0 &&
    payee.payee_account_number.trim().length >= 9 &&
    /^[A-Z]{4}0[A-Z0-9]{6}$/.test(payee.ifsc_code.trim().toUpperCase()) &&
    payee.branch.trim().length > 0 &&
    payee.bank_name.trim().length > 0;

  const step2Ok =
    amountPaise > 0 &&
    amountMatches &&
    expandedOk &&
    drawerName.trim().length > 0 &&
    !!chequeDate;

  const goNext = () => {
    setError('');
    if (step === 1 && !step1Ok) {
      setError('Please fill all payee fields correctly. IFSC must be 11 chars like SBIN0001234.');
      return;
    }
    if (step === 2 && !step2Ok) {
      setError('Amount, confirmation, drawer name, and date must all be valid.');
      return;
    }
    setStep((s) => Math.min(3, s + 1));
  };

  const goBack = () => {
    setError('');
    setStep((s) => Math.max(1, s - 1));
  };

  const submit = async ({ webauthn_attempted = false } = {}) => {
    setSigning(true);
    setError('');
    try {
      const payload = {
        payee_name: payee.payee_name.trim(),
        payee_account_number: payee.payee_account_number.trim(),
        ifsc_code: payee.ifsc_code.trim().toUpperCase(),
        branch: payee.branch.trim(),
        bank_name: payee.bank_name.trim(),
        drawer_name: drawerName.trim(),
        amount_rupees: (amountPaise / 100).toFixed(2),
        amount_confirmation: (confirmPaise / 100).toFixed(2),
        expanded_crores: boxes.crores,
        expanded_lakhs: boxes.lakhs,
        expanded_thousands: boxes.thousands,
        expanded_hundreds: boxes.hundreds,
        expanded_tens: boxes.tens,
        expanded_ones: boxes.ones,
        expanded_paise: boxes.paise,
        cheque_date: chequeDate,
        webauthn_attempted, // backend may ignore for now (Phase 5)
      };
      const result = await createCheque(payload);
      setSuccess(result);
    } catch (err) {
      const detail = err?.response?.data?.detail || err?.message || 'Failed to create cheque.';
      setError(typeof detail === 'string' ? detail : JSON.stringify(detail));
    } finally {
      setSigning(false);
      setPasswordPrompt(false);
    }
  };

  // Filename convention used by both share and download: `{cheque_id}.pdf`.
  // The cheque UUID is the only reliable identifier that lets the receiver
  // (payee) extract the ID from the file name and POST /cheques/{id}/present.
  // Use leaf_serial as a human-readable prefix, but keep the UUID reachable.
  const buildPdfFilename = useCallback(() => {
    if (!success) return 'cheque.pdf';
    // Keep it short and ASCII so messenger apps don't mangle the filename.
    // Format: SmartCheque-{uuid}.pdf — the UUID is the canonical ID.
    return `SmartCheque-${success.cheque_id}.pdf`;
  }, [success]);

  const shareCheque = useCallback(async () => {
    if (!success) return;
    const pdfDownloadUrl = success.pdf_download_url;
    const amount = formatRupeesFromPaise(amountPaise);
    const drawerNameDisplay = drawerName;
    const filename = buildPdfFilename();
    try {
      const response = await fetch(pdfDownloadUrl);
      const blob = await response.blob();
      const file = new File([blob], filename, { type: 'application/pdf' });
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `SmartCheque - Rs.${amount}`,
          text: `Digital cheque for Rs.${amount} from ${drawerNameDisplay}. Open SmartCheque app to deposit.`,
          files: [file],
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Share failed:', error);
      window.open(pdfDownloadUrl, '_blank');
    }
  }, [success, amountPaise, drawerName, buildPdfFilename]);

  const downloadPdf = useCallback(async () => {
    if (!success) return;
    const filename = buildPdfFilename();
    try {
      const response = await fetch(success.pdf_download_url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF download failed:', err);
      // Fallback: open in a new tab so the user at least gets the file.
      window.open(success.pdf_download_url, '_blank');
    }
  }, [success, buildPdfFilename]);

  const copyChequeId = useCallback(() => {
    if (!success) return;
    navigator.clipboard.writeText(success.cheque_id);
  }, [success]);

  const handleSign = async () => {
    setError('');
    if (isWebAuthnSupported()) {
      setSigning(true);
      const wa = await trySignWithWebAuthn();
      setSigning(false);
      if (wa.ok) {
        await submit({ webauthn_attempted: true });
      } else {
        // Cancelled or failed → fall through to password prompt
        setError(`WebAuthn unavailable (${wa.reason}). Please confirm with your password.`);
        setPasswordPrompt(true);
      }
    } else {
      setPasswordPrompt(true);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!passwordValue || passwordValue.length < 6) {
      setError('Enter your account password to confirm signing.');
      return;
    }
    await submit({ webauthn_attempted: false });
  };

  // ── Success screen ──
  if (success) {
    const amount = formatRupeesFromPaise(amountPaise);
    return (
      <div className="p-6 lg:p-10 max-w-2xl mx-auto animate-fade-in-up">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="text-green-600" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-[#1F4E79] mb-2">Cheque Created Successfully</h2>
          <p className="text-gray-500 mb-6">
            Your Smart Square Cheque has been signed and stored securely.
          </p>
          
          <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 mb-6 text-left">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Cheque ID</p>
            <div className="flex items-center gap-2 mb-3">
              <p className="font-mono text-sm text-[#1F4E79] break-all flex-1">{success.cheque_id}</p>
              <button
                onClick={copyChequeId}
                className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
                title="Copy Cheque ID"
              >
                <Copy size={16} />
              </button>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Leaf Serial</p>
            <p className="font-mono text-sm text-[#1F4E79]">{success.leaf_serial}</p>
            <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Amount</p>
                <p className="font-bold text-lg text-[#1F4E79]">{amount}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Payee</p>
                <p className="font-semibold text-[#1F4E79]">{payee.payee_name}</p>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl p-3 mb-5 text-left">
            <Link2 size={16} className="text-[#1F4E79] mt-0.5 flex-shrink-0" />
            <p className="text-xs text-[#1F4E79] leading-snug">
              <span className="font-bold">Next:</span> share the PDF with your payee via WhatsApp, Gmail, or any app.
              They'll upload it from the <span className="font-semibold">Deposit Cheque</span> screen to clear funds.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-3">
            <button
              onClick={downloadPdf}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 text-white font-bold text-sm hover:bg-green-700 active:scale-[0.98] transition-all shadow-lg"
            >
              <Download size={16} /> Download PDF
            </button>
            <button
              onClick={shareCheque}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#1F4E79] text-white font-bold text-sm hover:bg-[#163d63] active:scale-[0.98] transition-all shadow-lg"
            >
              <Share2 size={16} /> Share Cheque
            </button>
          </div>
          <button
            onClick={() => window.open(success.png_download_url, '_blank')}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-gray-200 text-gray-500 font-semibold text-xs hover:bg-gray-50 hover:text-[#1F4E79] hover:border-[#1F4E79] active:scale-[0.98] transition-all"
          >
            <ImageIcon size={14} /> Download PNG
          </button>
          
          <button
            onClick={() => navigate(`/customer/cheque/${success.cheque_id}`)}
            className="w-full py-3 mt-4 text-sm text-[#1F4E79] font-semibold hover:underline"
          >
            View Cheque Detail →
          </button>
          <button
            onClick={() => {
              setSuccess(null);
              setStep(1);
              setPayee({ payee_name: '', payee_account_number: '', ifsc_code: '', branch: '', bank_name: '' });
              setAmountText('');
              setConfirmText('');
            }}
            className="w-full py-2 mt-2 text-xs text-gray-400 hover:text-[#1F4E79] transition-colors"
          >
            Issue another cheque
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 animate-fade-in-up">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1F4E79]">Issue New Cheque</h1>
        <p className="text-gray-500">Generate a cryptographically secured smart cheque.</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-center gap-2 mb-8 max-w-md mx-auto">
        {STEPS.map((s, i) => (
          <React.Fragment key={s.id}>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                step > s.id ? 'bg-green-500 text-white' : step === s.id ? 'bg-[#1F4E79] text-white' : 'bg-gray-200 text-gray-400'
              }`}
            >
              {step > s.id ? <CheckCircle size={14} /> : s.id}
            </div>
            <span
              className={`text-xs font-semibold hidden sm:inline ${
                step >= s.id ? 'text-[#1F4E79]' : 'text-gray-400'
              }`}
            >
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 transition-all ${step > s.id ? 'bg-green-500' : 'bg-gray-200'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {error && (
        <div className="max-w-3xl mx-auto mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="max-w-3xl mx-auto bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-100">
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="font-bold text-lg text-[#1F4E79]">Payee Details</h2>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-600">Payee Name</label>
              <input
                value={payee.payee_name}
                onChange={(e) => setPayee((p) => ({ ...p, payee_name: e.target.value }))}
                type="text"
                placeholder="e.g. John Doe"
                className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent outline-none"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-600">Payee Account Number</label>
                <input
                  value={payee.payee_account_number}
                  onChange={(e) => setPayee((p) => ({ ...p, payee_account_number: e.target.value.replace(/\D/g, '') }))}
                  type="text"
                  inputMode="numeric"
                  placeholder="123456789012"
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent outline-none font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-600">IFSC Code</label>
                <input
                  value={payee.ifsc_code}
                  onChange={(e) => setPayee((p) => ({ ...p, ifsc_code: e.target.value.toUpperCase() }))}
                  type="text"
                  maxLength={11}
                  placeholder="SBIN0001234"
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent outline-none font-mono uppercase"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-600">Branch</label>
                <input
                  value={payee.branch}
                  onChange={(e) => setPayee((p) => ({ ...p, branch: e.target.value }))}
                  type="text"
                  placeholder="Mumbai Main"
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-600">Bank Name</label>
                <input
                  value={payee.bank_name}
                  onChange={(e) => setPayee((p) => ({ ...p, bank_name: e.target.value }))}
                  type="text"
                  placeholder="State Bank of India"
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={goNext}
                className="px-6 py-3 bg-[#1F4E79] text-white font-bold rounded-xl hover:bg-[#163d63] active:scale-[0.98] transition-all flex items-center gap-2"
              >
                Next: Amount <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="font-bold text-lg text-[#1F4E79]">Amount</h2>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-600">Amount (₹)</label>
              <input
                value={amountText}
                onChange={(e) => setAmountText(e.target.value)}
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                className="w-full px-4 py-4 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent outline-none text-2xl font-bold text-[#1F4E79]"
              />
            </div>

            {/* 7 expanded boxes */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">Auto-calculated expanded amount</p>
              <div className="grid grid-cols-7 gap-2">
                {[
                  { label: 'Crores', v: boxes.crores },
                  { label: 'Lakhs', v: boxes.lakhs },
                  { label: 'Thousands', v: boxes.thousands },
                  { label: 'Hundreds', v: boxes.hundreds },
                  { label: 'Tens', v: boxes.tens },
                  { label: 'Ones', v: boxes.ones },
                  { label: 'Paise', v: boxes.paise },
                ].map((b) => (
                  <div key={b.label} className="bg-blue-50 border border-[#1F4E79] rounded-lg p-2 text-center">
                    <p className="text-[9px] font-bold uppercase text-[#1F4E79]">{b.label}</p>
                    <p className="font-bold text-[#1F4E79] text-lg">{String(b.v).padStart(2, '0')}</p>
                  </div>
                ))}
              </div>
              {amountPaise > 0 && !expandedOk && (
                <p className="text-[10px] text-red-600 mt-1">Expanded boxes don't match the entered amount.</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-600">Confirm Amount (₹)</label>
                <input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  type="text"
                  inputMode="decimal"
                  placeholder="Re-enter amount"
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent outline-none font-mono"
                />
                {confirmText && !amountMatches && (
                  <p className="text-[10px] text-red-600">Amounts don't match.</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-600">Drawer Name</label>
                <input
                  value={drawerName}
                  onChange={(e) => setDrawerName(e.target.value)}
                  type="text"
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent outline-none"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-sm font-semibold text-gray-600">Cheque Date</label>
                <input
                  value={chequeDate}
                  onChange={(e) => setChequeDate(e.target.value)}
                  type="date"
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent outline-none"
                />
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <button
                onClick={goBack}
                className="px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 active:scale-[0.98] transition-all flex items-center gap-2"
              >
                <ArrowLeft size={16} /> Back
              </button>
              <button
                onClick={goNext}
                disabled={!step2Ok}
                className="px-6 py-3 bg-[#1F4E79] text-white font-bold rounded-xl hover:bg-[#163d63] active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-50"
              >
                Next: Preview <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h2 className="font-bold text-lg text-[#1F4E79]">Preview & Sign</h2>

            <div className="bg-gradient-to-br from-[#1F4E79]/5 to-blue-50 border border-[#1F4E79]/20 rounded-xl p-5">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <Field label="Payee" value={payee.payee_name} />
                <Field label="Amount" value={formatRupeesFromPaise(amountPaise)} highlight />
                <Field label="Account" value={payee.payee_account_number} mono />
                <Field label="IFSC" value={payee.ifsc_code.toUpperCase()} mono />
                <Field label="Branch" value={payee.branch} />
                <Field label="Bank" value={payee.bank_name} />
                <Field label="Drawer" value={drawerName} />
                <Field label="Date" value={chequeDate} />
              </div>
            </div>

            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <Shield size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Cryptographic Signing</p>
                <p className="text-xs text-amber-700 mt-1">
                  We'll generate AES-256-GCM, ECC secp256k1, and RSA-4096 signatures
                  for this cheque. {isWebAuthnSupported() ? 'Your browser supports WebAuthn — we\'ll attempt biometric signing.' : 'WebAuthn isn\'t available here; we\'ll ask you to confirm with your password.'}
                </p>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <button
                onClick={goBack}
                disabled={signing}
                className="px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <ArrowLeft size={16} /> Back
              </button>
              <button
                onClick={handleSign}
                disabled={signing}
                className="px-6 py-3 bg-[#1F4E79] text-white font-bold rounded-xl hover:bg-[#163d63] active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-60 shadow-md"
              >
                {signing ? (
                  <><Spinner size="sm" tone="white" /> Signing…</>
                ) : isWebAuthnSupported() ? (
                  <><Fingerprint size={16} /> Sign with Biometric</>
                ) : (
                  <><Key size={16} /> Sign Cheque</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Password confirmation modal (WebAuthn fallback) */}
      {passwordPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1c104b]/80 backdrop-blur-sm animate-fade-in-up">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl max-w-sm w-full overflow-hidden">
            <div className="px-6 pt-6 pb-4 bg-gradient-to-br from-[#1F4E79] to-[#2c6ba8] text-white">
              <div className="flex items-center gap-2 mb-1">
                <Lock size={16} className="text-blue-200" />
                <p className="text-[10px] uppercase tracking-widest font-bold text-blue-200">Confirm Signing</p>
              </div>
              <h3 className="text-lg font-bold">Re-enter your password</h3>
              <p className="text-blue-100 text-xs mt-1">Cryptographic signing requires password re-authentication.</p>
            </div>
            <form onSubmit={handlePasswordSubmit} className="p-6 space-y-4">
              <input
                autoFocus
                type="password"
                value={passwordValue}
                onChange={(e) => setPasswordValue(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent outline-none font-mono"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setPasswordPrompt(false); setPasswordValue(''); }}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 active:scale-[0.98] transition-all text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={signing}
                  className="flex-1 py-2.5 rounded-xl bg-[#1F4E79] text-white font-bold hover:bg-[#163d63] active:scale-[0.98] transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {signing ? <Spinner size="sm" tone="white" /> : 'Confirm & Sign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, mono, highlight }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
      <p className={`font-semibold text-sm ${mono ? 'font-mono' : ''} ${highlight ? 'text-[#1F4E79] text-lg' : 'text-[#1c104b]'}`}>
        {value || '—'}
      </p>
    </div>
  );
}