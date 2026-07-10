/**
 * Unified Login / Register page.
 *
 * Single form (per the user's spec). Toggle between Login and Register.
 * On Register we collect full_name / email / password / mobile / role.
 * On success, the backend returns the user with role — we redirect based
 * on role: BANK_OFFICER → /official/dashboard, others → /customer/dashboard.
 *
 * Visual style matches the teammate's design (gradient + dark mode), but
 * consolidated to a single card so the same form is shared.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardPathForRole } from '../api/auth';
import Spinner from '../components/Spinner';
import {
  Lock, ShieldCheck, Eye, EyeOff, ChevronRight, Building2, UserPlus, LogIn,
} from 'lucide-react';

const ROLE_OPTIONS = [
  { value: 'INDIVIDUAL', label: 'Individual' },
  { value: 'CORPORATE', label: 'Corporate' },
  { value: 'BANK_OFFICER', label: 'Bank Officer' },
];

export default function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Common fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register-only fields
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [role, setRole] = useState('INDIVIDUAL');

  const reset = () => {
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    reset();
    setLoading(true);
    try {
      let resp;
      if (mode === 'login') {
        resp = await login(email.trim(), password);
      } else {
        resp = await register({
          full_name: fullName.trim(),
          email: email.trim(),
          password,
          mobile: mobile.trim(),
          role,
        });
      }
      const path = dashboardPathForRole(resp?.user?.role);
      navigate(path, { replace: true });
    } catch (err) {
      const detail = err?.response?.data?.detail || err?.message || 'Authentication failed.';
      setError(typeof detail === 'string' ? detail : JSON.stringify(detail));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-8 h-16 bg-white/80 backdrop-blur border-b border-gray-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#1F4E79] flex items-center justify-center">
            <span className="text-white font-bold text-sm">SC</span>
          </div>
          <span className="font-bold text-xl text-[#1F4E79] tracking-tight">SmartCheque</span>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-sm text-gray-500">
          <a href="#" className="hover:text-[#1F4E79] transition-colors">Security</a>
          <a href="#" className="hover:text-[#1F4E79] transition-colors">About</a>
        </nav>
      </header>

      <main className="flex-grow flex items-center justify-center pt-20 pb-12 px-4 min-h-[calc(100vh-64px)] relative">
        {/* Subtle grid bg */}
        <div
          className="absolute inset-0 opacity-[0.02] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(#1F4E79 1px, transparent 1px), linear-gradient(90deg, #1F4E79 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="max-w-md w-full relative z-10 animate-fade-in-up">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#1F4E79] bg-blue-50 px-3 py-1 rounded-full mb-4">
              <ShieldCheck size={12} /> Secure Digital Banking
            </div>
            <h2 className="text-3xl font-bold text-[#1F4E79] mb-2">
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="text-gray-500">
              {mode === 'login'
                ? 'Sign in to issue or deposit smart cheques.'
                : 'Join the cryptographically secured cheque network.'}
            </p>
          </div>

          {/* Toggle pills */}
          <div className="flex p-1 bg-gray-100 rounded-xl w-fit mx-auto gap-1 mb-6">
            {[
              { id: 'login', label: 'Login', icon: LogIn },
              { id: 'register', label: 'Register', icon: UserPlus },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => { setMode(id); setError(''); }}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                  mode === id ? 'bg-white shadow text-[#1F4E79]' : 'text-gray-500 hover:text-[#1F4E79]'
                }`}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7 space-y-5">
            {mode === 'register' && (
              <>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-600">Full Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Alex Sterling"
                    className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-600">Mobile Number</label>
                  <input
                    type="tel"
                    required
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="9876543210"
                    pattern="[0-9]{10,15}"
                    className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent outline-none"
                  />
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-600">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-600">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent outline-none pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-600 flex items-center gap-1.5">
                  <Building2 size={14} /> Account Type
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#1F4E79] focus:border-transparent outline-none cursor-pointer"
                >
                  {ROLE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            )}

            {error && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#1F4E79] text-white font-bold rounded-xl hover:bg-[#163d63] active:scale-[0.98] transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Spinner size="sm" tone="white" /> {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                </>
              ) : (
                <>
                  {mode === 'login' ? <LogIn size={18} /> : <UserPlus size={18} />}
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
                  <ChevronRight size={16} />
                </>
              )}
            </button>

            <div className="text-center text-sm text-gray-500 pt-1">
              {mode === 'login' ? (
                <>Don't have an account?{' '}
                  <button type="button" onClick={() => { setMode('register'); setError(''); }} className="text-[#1F4E79] font-bold hover:underline">
                    Register
                  </button>
                </>
              ) : (
                <>Already have an account?{' '}
                  <button type="button" onClick={() => { setMode('login'); setError(''); }} className="text-[#1F4E79] font-bold hover:underline">
                    Sign in
                  </button>
                </>
              )}
            </div>
          </form>

          {/* Security footer */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <Lock className="text-gray-400" size={14} />
            <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
              Protected by ECDSA + AES-256-GCM + RSA-4096
            </span>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-gray-100 flex flex-col md:flex-row justify-between items-center px-8 py-4">
        <div>
          <span className="font-bold text-[#1F4E79]">SmartCheque</span>
          <p className="text-[10px] text-gray-400 mt-0.5">© 2024. Cryptographically Secured.</p>
        </div>
        <div className="flex gap-6 text-xs text-gray-400 mt-3 md:mt-0">
          <a href="#" className="hover:text-[#1F4E79] transition-colors">Security Architecture</a>
          <a href="#" className="hover:text-[#1F4E79] transition-colors">ECDSA Specs</a>
          <a href="#" className="hover:text-[#1F4E79] transition-colors">AES-256-GCM</a>
          <a href="#" className="hover:text-[#1F4E79] transition-colors">Privacy Policy</a>
        </div>
      </footer>
    </div>
  );
}