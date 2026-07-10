/**
 * VerifyCheque — Deposit Cheque flow (PDF-upload first, UUID fallback).
 *
 * Primary path:
 *   1. Drawer issues a cheque → downloads the PDF (filename: {cheque_id}.pdf)
 *   2. Drawer shares the PDF via the device share sheet (WhatsApp, Gmail, etc.)
 *   3. Payee receives the PDF → drops it here on the Deposit Cheque screen
 *   4. Frontend extracts the cheque UUID from the filename and calls
 *      POST /cheques/{id}/present as before.
 *
 * Fallback: a manual UUID input below the upload area, for cases where the
 * payee received only the cheque ID text instead of the PDF (existing flow).
 *
 * Response handling:
 *   - status=CLEARED         → green card with new balance, no OTP needed
 *   - status=OTP_PENDING     → yellow card showing the demo_otp_code
 *   - 4xx error              → red card with the failure reason
 */
import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { presentCheque, getRiskDetails } from '../../api/cheques';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../../components/Spinner';
import {
  CheckCircle, XCircle, AlertTriangle, Key, ArrowRight, Shield, FileSearch,
  Upload, FileText, X,
} from 'lucide-react';
import { formatRupeesFromPaise } from '../../utils/format';

export default function VerifyCheque() {
  const { refreshBalance } = useAuth();
  const navigate = useNavigate();

  // Upload state
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfId, setPdfId] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Manual UUID fallback
  const [manualId, setManualId] = useState('');

  // Submission / result
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null); // {kind: 'cleared'|'otp'|'error', ...}
  const [errText, setErrText] = useState('');

  // Locator for a UUID-shaped token anywhere in a filename. The drawer
  // shares the PDF with name `SmartCheque-{uuid}.pdf`, but some chat apps
  // rename attachments (e.g. `IMG_xxxxx.pdf`), so we look for the
  // uuid substring rather than relying on a clean prefix.
  const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

  const extractChequeIdFromFilename = (name) => {
    const base = name.replace(/\.pdf$/i, '');
    const match = base.match(UUID_RE);
    return match ? match[0].toLowerCase() : null;
  };

  /**
   * Validate file + extract the cheque ID from its filename.
   * Backend PDF naming convention is `SmartCheque-{cheque_id}.pdf`, but we
   * also tolerate messenger-app renaming by scanning for the UUID token.
   */
  const acceptPdfFile = (file) => {
    setErrText('');
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setErrText('Only PDF files are accepted.');
      return;
    }
    const id = extractChequeIdFromFilename(file.name);
    if (!id) {
      setErrText(
        'Could not find a Cheque ID inside that PDF filename. '
        + 'Use the manual Cheque ID entry below.',
      );
      return;
    }
    setPdfFile(file);
    setPdfId(id);
  };

  const onFileInput = (e) => {
    const file = e.target.files?.[0];
    if (file) acceptPdfFile(file);
    // Allow the same file to be re-selected later.
    e.target.value = '';
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) acceptPdfFile(file);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const onDragLeave = () => setDragOver(false);

  const clearPdf = () => {
    setPdfFile(null);
    setPdfId('');
    setErrText('');
  };

  /**
   * Decide which cheque ID to submit:
   *   1. The one derived from the uploaded PDF, if any.
   *   2. Otherwise the manual entry field.
   */
  const resolveChequeId = () => {
    if (pdfId) return pdfId.trim();
    const m = manualId.trim();
    return m || '';
  };

  const submit = async (e) => {
    e.preventDefault();
    setErrText('');
    setResult(null);

    const id = resolveChequeId();
    // Cheque IDs are UUIDs. We allow either a full UUID (from a clean PDF
    // filename) or whatever the user typed (the backend will 422 on garbage).
    const looksLikeUuid = UUID_RE.test(id);
    if (!id || (!looksLikeUuid && id.length < 8)) {
      setErrText('Drop a Smart Cheque PDF or enter a valid Cheque ID.');
      return;
    }

    setBusy(true);
    try {
      const data = await presentCheque(id);

      // Optional: also fetch risk-details for context (best-effort).
      let risk = null;
      try {
        risk = await getRiskDetails(id);
      } catch (_) { /* drawer/payee auth may not include this */ }

      // Refresh account balance (transfer may have happened).
      // We refresh on CLEARED and OTP_PENDING both — even OTP approval
      // can move money, so the dashboard will hit refresh again then.
      await refreshBalance().catch(() => {});

      if (data.status === 'CLEARED') {
        setResult({ kind: 'cleared', data, risk });
      } else if (data.status === 'OTP_PENDING') {
        setResult({ kind: 'otp', data, risk });
      } else {
        setResult({ kind: 'error', message: `Unexpected status: ${data.status}`, data, risk });
      }
    } catch (err) {
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail || err?.message || 'Failed to present cheque.';
      setResult({
        kind: 'error',
        message: typeof detail === 'string' ? detail : JSON.stringify(detail),
        status,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-6 lg:p-10 animate-fade-in-up">
      <h1 className="text-2xl font-bold text-[#1F4E79] mb-1">Deposit Cheque</h1>
      <p className="text-gray-500 mb-8">
        Drop the Smart Cheque PDF you received from your drawer, or enter the
        Cheque ID manually.
      </p>

      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileSearch size={20} className="text-[#1F4E79]" />
            <h2 className="font-bold text-[#1F4E79]">Present Cheque for Clearing</h2>
          </div>

          <form onSubmit={submit} className="space-y-5">
            {/* ── PDF dropzone ─────────────────────────────────────── */}
            {!pdfFile ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
                  dragOver
                    ? 'border-[#1F4E79] bg-blue-50'
                    : 'border-gray-300 bg-gray-50 hover:border-[#1F4E79] hover:bg-blue-50/40'
                }`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
                }}
              >
                <div className="w-12 h-12 mx-auto rounded-full bg-[#1F4E79]/10 flex items-center justify-center mb-3">
                  <Upload className="text-[#1F4E79]" size={22} />
                </div>
                <p className="font-semibold text-[#1F4E79] text-sm">
                  Drop PDF here or tap to select from files
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Accepts <span className="font-semibold">.pdf</span> only · the
                  filename must be the cheque ID (as shared by the drawer).
                </p>
                <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1F4E79] text-white text-xs font-bold">
                  <FileText size={14} /> Select Cheque PDF
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={onFileInput}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="rounded-2xl border border-[#1F4E79]/30 bg-blue-50/40 p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#1F4E79] text-white flex items-center justify-center flex-shrink-0">
                  <FileText size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-[#1F4E79] truncate" title={pdfFile.name}>
                    {pdfFile.name}
                  </p>
                  <p className="text-[10px] text-gray-500 font-mono mt-0.5 truncate">
                    Cheque ID: {pdfId}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={clearPdf}
                  className="p-1.5 hover:bg-white rounded-lg text-gray-500 hover:text-red-600 transition-colors flex-shrink-0"
                  title="Remove file"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* ── Manual fallback ───────────────────────────────────── */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  Or enter Cheque ID manually
                </span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              <input
                type="text"
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                placeholder="Paste Cheque ID (UUID)"
                className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent outline-none font-mono text-sm"
              />
            </div>

            {/* ── Submit ────────────────────────────────────────────── */}
            <button
              type="submit"
              disabled={busy || (!pdfId && !manualId.trim())}
              className="w-full py-3 bg-[#1F4E79] text-white font-bold rounded-xl hover:bg-[#163d63] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {busy ? (
                <><Spinner size="sm" tone="white" /> Presenting…</>
              ) : (
                <><Shield size={16} /> Deposit Cheque</>
              )}
            </button>

            {errText && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                {errText}
              </div>
            )}
          </form>
        </div>

        {/* ── Result cards ── */}
        {result?.kind === 'cleared' && (
          <div className="rounded-2xl border-2 border-green-200 bg-green-50 p-6 animate-fade-in-up">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="text-green-600" size={28} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-xl text-green-800">Cheque Cleared!</h3>
                <p className="text-sm text-green-700 mt-1">
                  Funds have been transferred to your account.
                </p>
                {result.data?.transaction?.amount_paise != null && (
                  <p className="text-lg font-bold text-green-800 mt-2">
                    +{formatRupeesFromPaise(result.data.transaction.amount_paise)} credited
                  </p>
                )}
                {result.data?.risk_score != null && (
                  <p className="text-xs text-green-700 mt-2">
                    Risk score: <span className="font-semibold">{result.data.risk_score}/100</span> (auto-cleared)
                  </p>
                )}
                <button
                  onClick={() => navigate(`/customer/cheque/${resolveChequeId()}`)}
                  className="mt-4 px-4 py-2 bg-green-600 text-white font-bold rounded-lg text-sm hover:bg-green-700 transition-colors inline-flex items-center gap-2"
                >
                  View Cheque Detail <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {result?.kind === 'otp' && (
          <div className="rounded-2xl border-2 border-yellow-200 bg-yellow-50 p-6 animate-fade-in-up">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                <Key className="text-yellow-600" size={26} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-xl text-yellow-800">Awaiting Drawer Approval</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  The risk engine flagged this cheque for OTP confirmation. An OTP has
                  been sent to the drawer's registered mobile.
                </p>
                {result.data?.demo_otp_code && (
                  <div className="mt-4 inline-block">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-700">
                      Demo OTP (testing only)
                    </p>
                    <div className="mt-1 bg-white border-2 border-dashed border-yellow-300 rounded-xl px-5 py-3">
                      <p className="font-mono text-3xl font-bold text-yellow-800 tracking-[0.4em] text-center">
                        {result.data.demo_otp_code}
                      </p>
                    </div>
                    <p className="text-[10px] text-yellow-700 mt-2">
                      In production this is sent to the drawer via SMS / email. The drawer
                      must open their dashboard → My Cheques → Approve/Reject OTP.
                    </p>
                  </div>
                )}
                {result.data?.risk_score != null && (
                  <p className="text-xs text-yellow-700 mt-3">
                    Risk score: <span className="font-semibold">{result.data.risk_score}/100</span>
                  </p>
                )}
                <button
                  onClick={() => navigate('/customer/received')}
                  className="mt-4 px-4 py-2 bg-yellow-500 text-white font-bold rounded-lg text-sm hover:bg-yellow-600 transition-colors inline-flex items-center gap-2"
                >
                  Go to Received Cheques <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {result?.kind === 'error' && (
          <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-6 animate-fade-in-up">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <XCircle className="text-red-600" size={28} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-xl text-red-800">Could not deposit cheque</h3>
                <p className="text-sm text-red-700 mt-1">
                  {result.message}
                </p>
                {result.status && (
                  <p className="text-xs text-red-600 mt-2 font-mono">HTTP {result.status}</p>
                )}
                <ul className="mt-3 text-xs text-red-700 list-disc list-inside space-y-1">
                  <li>Make sure the PDF or Cheque ID matches a real cheque you were issued.</li>
                  <li>Only the payee (the account holder whose number matches the cheque) can deposit a cheque.</li>
                  <li>Already-deposited or rejected cheques cannot be deposited again.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Info tip */}
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <AlertTriangle size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700">
            <p className="font-semibold">How verification works:</p>
            <p className="mt-1">
              The backend decrypts the cheque payload with the bank's RSA-4096 private
              key, verifies the SHA-256 hash matches QR-A, validates the cross-reference
              checksums between QR-A/B/C, then runs the ML ensemble (XGBoost +
              IsolationForest + LSTM autoencoder) to produce a risk score. Routing:
              ≤30 → AUTO_CLEAR, 31–70 → OTP_REQUIRED, &gt;70 → OTP_PLUS_REVIEW.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
