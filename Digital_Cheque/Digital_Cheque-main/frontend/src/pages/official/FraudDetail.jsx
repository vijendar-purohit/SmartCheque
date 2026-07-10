/**
 * FraudDetail — officer deep-dive on a single flagged cheque.
 *
 * Backend endpoints used:
 *   - GET /cheques/{id}/risk-details  → SHAP explanation + routing decision
 *
 * Renders a risk gauge, ML ensemble stats, and a horizontal SHAP bar chart
 * using the real backend response (no mock data).
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRiskDetails } from '../../api/cheques';
import Spinner from '../../components/Spinner';
import {
  ArrowLeft, AlertTriangle, Shield, FileText,
} from 'lucide-react';
import { getRiskColors } from '../../utils/status';

export default function FraudDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [risk, setRisk] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr('');
      try {
        const r = await getRiskDetails(id);
        if (!cancelled) setRisk(r);
      } catch (e) {
        if (!cancelled) {
          setErr(e?.response?.data?.detail || e?.message || 'Failed to load risk details.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-white gap-2">
        <Spinner size="md" tone="white" /> Loading risk analysis…
      </div>
    );
  }

  if (err || !risk) {
    return (
      <div className="p-6 text-white">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-[#483e79] text-sm mb-6 hover:text-[#dab9ff]">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg p-4 text-sm">
          {err || 'No risk data for this cheque yet — present the cheque first to generate a risk score.'}
        </div>
        <button
          onClick={() => navigate(`/official/cheque/${id}`)}
          className="mt-4 text-[#dab9ff] hover:underline text-sm"
        >
          Open cheque detail →
        </button>
      </div>
    );
  }

  const colors = getRiskColors(risk.risk_score);
  const riskPct = risk.risk_score;
  const features = (risk.shap_explanation || []).slice().sort(
    (a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)
  );
  const maxAbs = features.reduce((m, f) => Math.max(m, Math.abs(f.contribution)), 0.0001);

  const gaugeColor = riskPct >= 70 ? '#ef4444' : riskPct >= 40 ? '#f59e0b' : '#22c55e';

  return (
    <div className="p-6 text-white animate-fade-in-up dark-scrollbar" style={{ minHeight: 'calc(100vh - 64px)' }}>
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-[#483e79] text-sm mb-6 hover:text-[#dab9ff] transition-colors"
      >
        <ArrowLeft size={16} /> Back
      </button>

      {/* Header with Gauge */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-8">
        <div className="flex-shrink-0 text-center">
          <div className="relative w-28 h-28">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#2d1f60" strokeWidth="10" />
              <circle cx="50" cy="50" r="40" fill="none"
                stroke={gaugeColor}
                strokeWidth="10"
                strokeDasharray={`${riskPct * 2.513} 251.3`}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-white">{riskPct}</span>
              <span className="text-[9px] text-[#483e79] uppercase">Risk Score</span>
            </div>
          </div>
          <span className={`text-xs font-bold uppercase mt-1 block ${colors.text}`}>
            {colors.label} Risk
          </span>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={18} className="text-red-400" />
            <h1 className="text-2xl font-bold">Fraud Investigation</h1>
          </div>
          <p className="text-[#483e79] font-mono text-xs mb-2">Cheque {id}</p>
          <p className="text-[#c9c4d1] text-sm">
            Routing:{' '}
            <span className="text-white font-semibold">{risk.routing_decision || '—'}</span>
            {risk.is_placeholder && (
              <span className="ml-2 text-amber-400 text-xs">(fallback rules — ML models unavailable)</span>
            )}
          </p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Risk Score', value: risk.risk_score },
          { label: 'Fraud Prob', value: risk.fraud_probability != null ? Number(risk.fraud_probability).toFixed(3) : '—' },
          { label: 'Anomaly', value: risk.anomaly_score != null ? Number(risk.anomaly_score).toFixed(3) : '—' },
          { label: 'LSTM Err', value: risk.lstm_error != null ? Number(risk.lstm_error).toFixed(3) : '—' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-[#1c104b] p-4 border-l-2 border-[#7547ac]">
            <p className="text-[#483e79] text-[10px] font-bold uppercase tracking-widest mb-1">
              {label}
            </p>
            <p className="text-2xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* SHAP bar chart */}
      <div className="bg-[#1c104b]/60 border border-white/10 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={16} className="text-[#dab9ff]" />
          <h3 className="text-white font-bold">SHAP Feature Contributions</h3>
        </div>
        {features.length === 0 ? (
          <p className="text-[#867cbb] text-sm">No SHAP features returned.</p>
        ) : (
          <div className="space-y-3">
            {features.slice(0, 10).map((f, i) => {
              const pct = Math.min(100, Math.abs(f.contribution) / maxAbs * 100);
              const isFraud = f.direction === 'fraud';
              return (
                <div key={i} className="flex items-center gap-3 text-xs">
                  <span className="w-40 truncate text-[#dab9ff]">{f.feature}</span>
                  <div className="flex-1 h-4 bg-white/5 rounded overflow-hidden border border-white/5">
                    <div
                      className={`${isFraud ? 'bg-red-500' : 'bg-green-500'} h-full transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className={`w-20 text-right font-mono ${isFraud ? 'text-red-400' : 'text-green-400'}`}>
                    {isFraud ? '+' : '−'}{Math.abs(f.contribution).toFixed(3)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Action buttons (advisory only — backend doesn't expose approve/reject for officers) */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => navigate(`/official/cheque/${id}`)}
          className="flex items-center gap-2 px-6 py-3 font-bold text-sm bg-[#7547ac] hover:bg-[#5B2C91] text-white transition-all"
        >
          <FileText size={16} /> Open Full Cheque Detail
        </button>
        <button
          onClick={() => navigate('/official/review')}
          className="flex items-center gap-2 px-6 py-3 font-bold text-sm text-[#483e79] border border-white/10 hover:text-white hover:bg-white/5 transition-all"
        >
          <ArrowLeft size={16} /> Back to Review Queue
        </button>
      </div>
    </div>
  );
}