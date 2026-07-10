/**
 * ChequeDetail — view a single cheque with real download links + risk score.
 *
 * Backend endpoints used:
 *   - GET /cheques/my-cheques   and   /cheques/received   to find the cheque
 *     (the API has no single "GET /cheques/{id}" endpoint, so we look it up
 *      in the user's lists — this is enforced by the backend's auth model
 *      anyway: you can only see a cheque you're a party to).
 *   - GET /cheques/{id}/download   → presigned PNG + PDF URLs
 *   - GET /cheques/{id}/risk-details → SHAP explanation
 */
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  listMyCheques, listReceivedCheques, getDownloadUrls, getRiskDetails,
} from '../api/cheques';
import StatusBadge from '../components/StatusBadge';
import Spinner from '../components/Spinner';
import {
  ArrowLeft, CheckCircle, Clock, Lock, Shield, AlertTriangle,
  FileText, Image as ImageIcon,
} from 'lucide-react';
import {
  formatRupeesFromPaise, formatDate, truncateMiddle,
} from '../utils/format';
import { getRiskColors } from '../utils/status';

export default function ChequeDetail({ officialView = false }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [cheque, setCheque] = useState(null);
  const [downloads, setDownloads] = useState(null);
  const [risk, setRisk] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr('');
      try {
        // Search both lists in parallel.
        const [mine, recv] = await Promise.all([
          listMyCheques().catch(() => []),
          listReceivedCheques().catch(() => []),
        ]);
        if (cancelled) return;
        const found = [...mine, ...recv].find((c) => c.id === id);
        if (!found) {
          setErr('Cheque not found in your issued or received list.');
          setLoading(false);
          return;
        }
        setCheque(found);

        // Best-effort: download URLs.
        try {
          const d = await getDownloadUrls(id);
          if (!cancelled) setDownloads(d);
        } catch (_) {
          /* 403/404 → drawer only, that's fine for payees */
        }

        // Best-effort: risk details (auth: drawer or payee).
        try {
          const r = await getRiskDetails(id);
          if (!cancelled) setRisk(r);
        } catch (_) {
          /* no risk score yet — only set after present */
        }

        setLoading(false);
      } catch (e) {
        if (!cancelled) {
          setErr(e?.response?.data?.detail || e?.message || 'Failed to load cheque.');
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${officialView ? 'text-white' : 'text-gray-500'} gap-2`}>
        <Spinner size="md" /> Loading cheque…
      </div>
    );
  }

  if (err || !cheque) {
    return (
      <div className={`flex items-center justify-center h-64 ${officialView ? 'text-white' : 'text-gray-500'}`}>
        <div className="text-center">
          <AlertTriangle className="mx-auto mb-3 text-red-400" size={36} />
          <p className="text-lg font-semibold mb-2">{err || 'Cheque not found'}</p>
          <button onClick={() => navigate(-1)} className="text-[#1F4E79] hover:underline text-sm">← Go back</button>
        </div>
      </div>
    );
  }

  const cardClass = officialView
    ? 'bg-white/5 border-white/10 text-white'
    : 'bg-white border-gray-100 shadow-sm text-[#1F4E79]';

  const labelClass = officialView ? 'text-[#867cbb]' : 'text-gray-400';
  const headingClass = officialView ? 'text-white' : 'text-[#1F4E79]';

  // Build a timeline from real status transitions.
  const timeline = buildTimeline(cheque);

  return (
    <div className={`p-6 lg:p-10 animate-fade-in-up ${officialView ? 'text-white' : 'text-[#1F4E79]'}`}>
      <button
        onClick={() => navigate(-1)}
        className={`flex items-center gap-1.5 text-sm mb-6 hover:underline ${officialView ? 'text-[#867cbb]' : 'text-gray-400'}`}
      >
        <ArrowLeft size={16} /> Back
      </button>

      <div className="flex flex-col xl:flex-row gap-10 items-start">
        {/* Left: Cheque preview */}
        <div className="w-full xl:w-auto flex flex-col items-center gap-5">
          {downloads?.png_download_url ? (
            <div className="w-full max-w-[480px] bg-white rounded-xl border border-gray-200 p-3 shadow-md">
              <img
                src={downloads.png_download_url}
                alt="Smart Square Cheque"
                className="w-full h-auto rounded"
              />
            </div>
          ) : (
            <div className="w-full max-w-[480px] aspect-square bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 text-sm">
              PNG not available
            </div>
          )}

          <div className={`w-full max-w-[480px] px-4 py-3 rounded-xl border text-xs text-center font-mono flex items-center justify-center gap-2 ${
            officialView ? 'bg-white/5 border-white/10 text-[#867cbb]' : 'bg-gray-50 border-gray-200 text-gray-400'
          }`}>
            <Lock size={12} />
            Signed with ECDSA · Encrypted AES-256-GCM + RSA-4096
          </div>

          <div className="flex gap-3 w-full max-w-[480px]">
            {downloads?.png_download_url && (
              <a
                href={downloads.png_download_url}
                target="_blank"
                rel="noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border font-semibold text-sm transition-all hover:scale-[1.02] active:scale-[0.98] bg-[#1F4E79] text-white border-transparent hover:bg-[#163d63]"
              >
                <ImageIcon size={16} /> PNG
              </a>
            )}
            {downloads?.pdf_download_url && (
              <a
                href={downloads.pdf_download_url}
                target="_blank"
                rel="noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border font-semibold text-sm transition-all hover:scale-[1.02] active:scale-[0.98] border-[#1F4E79] text-[#1F4E79] hover:bg-blue-50"
              >
                <FileText size={16} /> PDF
              </a>
            )}
            {!downloads && (
              <div className="flex-1 text-center text-xs text-gray-400 py-2.5">
                Downloads restricted to the drawer.
              </div>
            )}
          </div>
        </div>

        {/* Right: Details */}
        <div className="flex-1 space-y-6 w-full">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className={`text-sm font-mono mb-1 ${labelClass}`}>{truncateMiddle(cheque.id, 8)}</p>
              <h1 className={`text-2xl font-bold ${headingClass}`}>Cheque Detail</h1>
            </div>
            <StatusBadge status={cheque.status} />
          </div>

          <div className={`rounded-2xl p-6 border grid grid-cols-1 sm:grid-cols-2 gap-5 ${cardClass}`}>
            <Field label="Payee" value={cheque.payee_name || '—'} heading={headingClass} labelClass={labelClass} />
            <Field label="Amount" value={formatRupeesFromPaise(cheque.amount_paise)} heading={headingClass} labelClass={labelClass} highlight />
            <Field label="Payee A/C" value={cheque.payee_account_number || '—'} mono heading={headingClass} labelClass={labelClass} />
            <Field label="IFSC" value={cheque.ifsc_code || '—'} mono heading={headingClass} labelClass={labelClass} />
            <Field label="Leaf Serial" value={cheque.leaf_serial || '—'} mono heading={headingClass} labelClass={labelClass} />
            <Field label="Issued" value={formatDate(cheque.issue_timestamp, true)} heading={headingClass} labelClass={labelClass} />
            <Field label="Expires" value={formatDate(cheque.expiry_date)} heading={headingClass} labelClass={labelClass} />
            <Field
              label="Drawer A/C"
              value={cheque.drawer_account_id ? truncateMiddle(cheque.drawer_account_id, 6) : '—'}
              mono heading={headingClass} labelClass={labelClass}
            />
          </div>

          {/* Risk block */}
          {risk && (
            <RiskPanel risk={risk} officialView={officialView} />
          )}

          {/* Status timeline */}
          <div className={`rounded-2xl p-6 border ${cardClass}`}>
            <h3 className={`font-bold text-base mb-5 ${headingClass}`}>Status Timeline</h3>
            <div className="space-y-0">
              {timeline.map((step, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      step.done
                        ? 'bg-green-500'
                        : officialView ? 'bg-[#483e79]' : 'bg-gray-200'
                    }`}>
                      {step.done
                        ? <CheckCircle size={16} className="text-white" />
                        : <Clock size={14} className={officialView ? 'text-[#867cbb]' : 'text-gray-400'} />}
                    </div>
                    {i < timeline.length - 1 && (
                      <div className={`w-0.5 h-8 ${step.done ? 'bg-green-300' : officialView ? 'bg-[#483e79]' : 'bg-gray-200'}`} />
                    )}
                  </div>
                  <div className="pb-6">
                    <p className={`font-semibold text-sm ${
                      step.done
                        ? officialView ? 'text-white' : 'text-[#1F4E79]'
                        : officialView ? 'text-[#867cbb]' : 'text-gray-400'
                    }`}>{step.step}</p>
                    <p className={`text-xs mt-0.5 ${officialView ? 'text-[#867cbb]' : 'text-gray-400'}`}>{step.ts}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, mono, highlight, heading, labelClass }) {
  return (
    <div>
      <p className={`text-[11px] font-bold uppercase tracking-widest mb-1 ${labelClass}`}>{label}</p>
      <p className={`font-semibold text-sm ${mono ? 'font-mono' : ''} ${highlight ? 'text-xl text-[#1F4E79]' : ''} ${heading}`}>
        {value || '—'}
      </p>
    </div>
  );
}

function buildTimeline(cheque) {
  const issued = formatDate(cheque.issue_timestamp, true);
  const status = cheque.status;
  const steps = [
    { step: 'Issued', ts: issued, done: !!issued },
    { step: 'Presented', ts: ['PRESENTED','OTP_PENDING','OTP_APPROVED','CLEARED','REJECTED','EXPIRED'].includes(status) ? issued : '—', done: ['PRESENTED','OTP_PENDING','OTP_APPROVED','CLEARED','REJECTED','EXPIRED'].includes(status) },
    { step: status === 'OTP_PENDING' ? 'Awaiting OTP' : 'OTP Approved', ts: status === 'OTP_PENDING' ? 'pending…' : (status === 'CLEARED' || status === 'OTP_APPROVED' ? issued : '—'), done: status === 'OTP_APPROVED' || status === 'CLEARED' },
    { step: status === 'REJECTED' ? 'Rejected' : status === 'EXPIRED' ? 'Expired' : 'Cleared', ts: status === 'CLEARED' ? issued : '—', done: status === 'CLEARED' },
  ];
  return steps;
}

function RiskPanel({ risk, officialView }) {
  const colors = getRiskColors(risk.risk_score);
  const labelCls = officialView ? 'text-[#867cbb]' : 'text-gray-400';
  const headCls = officialView ? 'text-white' : 'text-[#1F4E79]';
  const cardCls = officialView
    ? 'bg-white/5 border-white/10'
    : 'bg-white border-gray-100 shadow-sm';

  // Sort SHAP features by absolute contribution.
  const features = (risk.shap_explanation || []).slice().sort(
    (a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)
  );
  const maxAbs = features.reduce((m, f) => Math.max(m, Math.abs(f.contribution)), 0.0001);

  return (
    <div className={`rounded-2xl p-6 border ${cardCls}`}>
      <div className="flex items-center gap-2 mb-4">
        <Shield size={18} className={officialView ? 'text-[#dab9ff]' : 'text-[#1F4E79]'} />
        <h3 className={`font-bold text-base ${headCls}`}>Risk Analysis (ML Ensemble)</h3>
        <span className={`ml-auto px-2 py-0.5 text-[10px] font-bold uppercase border ${colors.bg} ${colors.text} ${colors.border}`}>
          {colors.label} · {risk.risk_score}/100
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <Stat label="Risk Score" value={risk.risk_score} highlight={headCls} />
        <Stat label="Fraud Prob" value={risk.fraud_probability != null ? Number(risk.fraud_probability).toFixed(3) : '—'} highlight={headCls} />
        <Stat label="Anomaly" value={risk.anomaly_score != null ? Number(risk.anomaly_score).toFixed(3) : '—'} highlight={headCls} />
        <Stat label="LSTM Err" value={risk.lstm_error != null ? Number(risk.lstm_error).toFixed(3) : '—'} highlight={headCls} />
      </div>

      <p className={`text-[10px] font-bold uppercase tracking-widest ${labelCls} mb-3`}>
        Routing: <span className={headCls}>{risk.routing_decision}</span>
        {risk.is_placeholder && <span className="ml-2 text-amber-600">· (fallback rules — ML models unavailable)</span>}
      </p>

      {features.length > 0 && (
        <div>
          <p className={`text-[10px] font-bold uppercase tracking-widest ${labelCls} mb-2`}>SHAP feature contributions</p>
          <div className="space-y-2">
            {features.slice(0, 8).map((f, i) => {
              const pct = Math.min(100, Math.abs(f.contribution) / maxAbs * 100);
              const isFraud = f.direction === 'fraud';
              const barColor = isFraud ? 'bg-red-500' : 'bg-green-500';
              return (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className={`w-32 truncate ${officialView ? 'text-[#dab9ff]' : 'text-[#1F4E79]'}`}>{f.feature}</span>
                  <div className="flex-1 h-3 bg-gray-100 rounded overflow-hidden">
                    <div
                      className={`${barColor} h-full transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className={`w-16 text-right font-mono ${isFraud ? 'text-red-600' : 'text-green-600'}`}>
                    {isFraud ? '+' : '−'}{Math.abs(f.contribution).toFixed(3)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }) {
  return (
    <div className="bg-gray-50 rounded-lg p-2 text-center">
      <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
      <p className={`text-base font-bold ${highlight}`}>{value}</p>
    </div>
  );
}