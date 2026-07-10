/**
 * Official (Bank Officer) layout — dark theme, sidebar + topbar.
 *
 * Same role-guarded scope as the customer's layout, but the user has
 * role=BANK_OFFICER. The teammmate's original design language is kept
 * (deep navy with violet accents) so the officer feels they're in a
 * different "mode".
 */
import React, { useState } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  BarChart3, ClipboardCheck, AlertTriangle, RefreshCw, History,
  Settings, Power, Menu, X, Bell, Search, Shield,
} from 'lucide-react';


const navItems = [
  { to: '/official/dashboard', icon: BarChart3, label: 'Dashboard' },
  { to: '/official/review', icon: ClipboardCheck, label: 'Review Queue' },
  { to: '/official/fraud', icon: AlertTriangle, label: 'Fraud Alerts' },
  { to: '/official/clearing', icon: RefreshCw, label: 'Clearing House' },
  { to: '/official/audit', icon: History, label: 'Audit Log' },
];

const OfficialLayout = () => {
  const { user, account, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#1B0F4A] flex">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`fixed left-0 top-0 h-full w-72 z-50 flex flex-col transition-transform duration-300 tonal-layering border-r border-white/5 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
        style={{ backgroundImage: 'linear-gradient(180deg, #1C104B 0%, #150B3A 100%)' }}
      >
        <div className="px-6 pt-6 pb-4 border-b border-white/10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white font-bold text-2xl tracking-tighter">SmartCheque</span>
            <button className="md:hidden text-white/40 hover:text-white" onClick={() => setSidebarOpen(false)}>
              <X size={20} />
            </button>
          </div>
          <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#2a0053] bg-[#eedbff] px-3 py-1">
            OFFICIAL MODE
          </div>
        </div>

        <div className="px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#483e79] flex items-center justify-center border border-[#dab9ff]/30">
              <Shield size={18} className="text-[#dab9ff]" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">{user?.full_name || 'Bank Officer'}</p>
              <p className="text-[10px] text-[#867cbb] uppercase tracking-tight">BANK_OFFICER</p>
            </div>
          </div>
          {account?.account_number && (
            <p className="mt-3 text-[10px] text-[#867cbb] font-mono">
              A/C: {account.account_number}
            </p>
          )}
        </div>

        <nav className="flex-1 px-4 py-4 space-y-0.5 overflow-y-auto dark-scrollbar">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/official/dashboard'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 text-sm font-mono transition-all ${
                  isActive
                    ? 'text-[#dab9ff] border-l-2 border-[#dab9ff] bg-[#483e79]/30'
                    : 'text-[#867cbb] hover:text-white hover:bg-white/5 border-l-2 border-transparent'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={16} className={isActive ? 'text-[#dab9ff]' : ''} />
                  {label}
                </>
              )}
            </NavLink>
          ))}

          <div className="pt-6 mt-6 border-t border-white/10 space-y-0.5">
            <NavLink
              to="/official/settings"
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 text-sm font-mono transition-all ${
                  isActive ? 'text-[#dab9ff] border-l-2 border-[#dab9ff] bg-[#483e79]/30' : 'text-[#867cbb] hover:text-white hover:bg-white/5 border-l-2 border-transparent'
                }`
              }
            >
              <Settings size={16} /> Settings
            </NavLink>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-mono text-[#867cbb] hover:text-white hover:bg-white/5 border-l-2 border-transparent transition-all"
            >
              <Power size={16} /> Logout
            </button>
          </div>
        </nav>

        <div className="px-6 py-4 border-t border-white/10">
          <div className="text-[10px] text-[#867cbb] font-mono flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            System Status: <span className="text-green-400">ENCRYPTED</span>
          </div>
        </div>
      </aside>

      <div className="flex-1 md:ml-72 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 h-16 bg-[#1c104b] border-b border-white/10 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button className="md:hidden text-white/60 hover:text-white" onClick={() => setSidebarOpen(true)}>
              <Menu size={22} />
            </button>
            <span className="text-white font-bold text-lg hidden sm:block">Official Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <input
                type="text"
                placeholder="Search cheques…"
                className="bg-white/10 border-b border-[#483e79] text-white placeholder-[#483e79] px-4 py-1.5 font-mono text-sm focus:outline-none focus:border-[#dab9ff] w-56 transition-colors"
                style={{ caretColor: '#F8C400' }}
              />
              <Search className="absolute right-2 top-1/2 -translate-y-1/2 text-[#483e79]" size={14} />
            </div>
            <button className="text-[#867cbb] hover:text-white transition-colors relative">
              <Bell size={20} />
            </button>
            <div className="bg-[#7547ac] text-white px-3 py-1 text-[10px] font-bold uppercase tracking-widest">
              Role: Bank Officer
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto dark-scrollbar">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default OfficialLayout;