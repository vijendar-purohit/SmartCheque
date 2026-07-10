/**
 * SettingsPage — user profile, KYC, security.
 *
 * Pulls real data from /auth/me via useAuth(). Backend has no endpoints
 * for editing the profile or changing the password from this view, so
 * the form inputs are read-only (showing what the backend returned) and
 * the "Save Changes" button has been replaced with a status banner
 * confirming the data is live from the API.
 */
import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  User, Lock, Bell, Shield, Check, Info, Mail, Phone,
} from 'lucide-react';

const SettingsPage = ({ officialView = false }) => {
  const { user, account } = useAuth();

  const cardClass = officialView
    ? 'bg-[#1c104b]/60 border border-white/10 rounded-none p-6'
    : 'bg-white border border-gray-100 rounded-2xl p-6 shadow-sm';

  const labelClass = officialView ? 'text-[#483e79]' : 'text-gray-500';
  const headingClass = officialView ? 'text-white' : 'text-[#1F4E79]';
  const inputClass = officialView
    ? 'w-full bg-transparent border-b border-[#483e79] text-white outline-none py-2 font-mono text-sm'
    : 'w-full px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 text-sm';

  const kyc = user?.kyc_status || 'PENDING';
  const kycTone = kyc === 'VERIFIED'
    ? (officialView ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-green-50 text-green-700 border-green-200')
    : (officialView ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' : 'bg-yellow-50 text-yellow-700 border-yellow-200');

  return (
    <div className={`p-6 lg:p-10 animate-fade-in-up ${officialView ? 'text-white dark-scrollbar' : ''}`} style={{ minHeight: 'calc(100vh - 64px)' }}>
      <h1 className={`text-2xl font-bold mb-1 ${headingClass}`}>Settings</h1>
      <p className={`text-sm mb-8 ${labelClass}`}>
        Profile information is loaded from your live backend session.
      </p>

      <div className="max-w-2xl space-y-6">
        {/* Profile */}
        <div className={cardClass}>
          <div className="flex items-center gap-2 mb-5">
            <User size={18} className={officialView ? 'text-[#dab9ff]' : 'text-[#1F4E79]'} />
            <h2 className={`font-bold ${headingClass}`}>Profile Information</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[
              { label: 'Full Name', value: user?.full_name || '—' },
              { label: 'Email', value: user?.email || '—' },
              { label: 'Mobile', value: user?.mobile || '—' },
              { label: 'Role', value: user?.role || '—' },
              { label: 'Account Number', value: account?.account_number || '—', mono: true },
              { label: 'Branch IFSC', value: account?.ifsc || '—', mono: true },
            ].map(({ label, value, mono }) => (
              <div key={label} className="space-y-1">
                <label className={`text-[11px] font-bold uppercase tracking-wider ${labelClass}`}>{label}</label>
                <input type="text" readOnly value={value} className={`${inputClass} ${mono ? 'font-mono' : ''} cursor-default`} />
              </div>
            ))}
          </div>

          <div className={`mt-5 inline-flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest border ${kycTone}`}>
            <Shield size={12} /> KYC: {kyc}
          </div>
        </div>

        {/* Security & 2FA */}
        <div className={cardClass}>
          <div className="flex items-center gap-2 mb-5">
            <Shield size={18} className={officialView ? 'text-[#dab9ff]' : 'text-[#1F4E79]'} />
            <h2 className={`font-bold ${headingClass}`}>Security</h2>
          </div>
          <div className={`p-3 rounded-lg text-xs flex items-start gap-2 ${officialView ? 'bg-white/5 text-[#c9c4d1] border border-white/10' : 'bg-gray-50 text-gray-600 border border-gray-100'}`}>
            <Info size={14} className="mt-0.5 flex-shrink-0" />
            <div>
              <p>Every cheque you issue is signed with an ECC secp256k1 key, encrypted with AES-256-GCM, and wrapped with the bank's RSA-4096 public key.</p>
              <p className="mt-1">JWT tokens are held in memory and never persisted to localStorage — your session ends when you close the tab.</p>
            </div>
          </div>
        </div>

        {/* Notification channels (read-only) */}
        <div className={cardClass}>
          <div className="flex items-center gap-2 mb-5">
            <Bell size={18} className={officialView ? 'text-[#dab9ff]' : 'text-[#1F4E79]'} />
            <h2 className={`font-bold ${headingClass}`}>Notification Channels</h2>
          </div>
          <div className="space-y-3">
            {[
              { icon: Mail, label: 'Email', value: user?.email || '—', status: user?.email ? 'Linked' : 'Not linked' },
              { icon: Phone, label: 'Mobile (SMS/OTP)', value: user?.mobile || '—', status: user?.mobile ? 'Linked' : 'Not linked' },
              { icon: Lock, label: 'WebAuthn', value: 'Optional', status: 'Not enrolled' },
            ].map(({ icon: Icon, label, value, status }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon size={16} className={officialView ? 'text-[#dab9ff]' : 'text-[#1F4E79]'} />
                  <div>
                    <p className={`font-semibold text-sm ${headingClass}`}>{label}</p>
                    <p className={`text-xs ${labelClass}`}>{value}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 border ${
                  status === 'Linked'
                    ? (officialView ? 'border-green-500/30 text-green-400 bg-green-500/10' : 'border-green-200 text-green-700 bg-green-50')
                    : (officialView ? 'border-white/10 text-[#867cbb] bg-white/5' : 'border-gray-200 text-gray-500 bg-gray-50')
                }`}>{status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Status banner */}
        <div className={`p-4 rounded-xl flex items-center gap-3 text-sm ${
          officialView
            ? 'bg-green-500/10 border border-green-500/30 text-green-300'
            : 'bg-green-50 border border-green-200 text-green-800'
        }`}>
          <Check size={18} />
          <p>Account data is live from <span className="font-mono">/auth/me</span>. Changes to profile fields require backend support — contact your bank administrator.</p>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;