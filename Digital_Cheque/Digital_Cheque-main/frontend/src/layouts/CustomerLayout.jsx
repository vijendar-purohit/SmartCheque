/**
 * Customer layout — sidebar + topbar wrapper for individual/corporate users.
 *
 * Sidebar shows the user's name + their role badge. Topbar shows the
 * account balance pulled from /auth/me.
 */
import React, { useState } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, CreditCard, Wallet, Download, QrCode, Settings,
  LogOut, Bell, Menu, X, Plus, ChevronDown,
} from 'lucide-react';
import { formatRupeesFromPaise } from '../utils/format';

const navItems = [
  { to: '/customer/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/customer/issue', icon: CreditCard, label: 'Issue Cheque' },
  { to: '/customer/cheques', icon: Wallet, label: 'My Cheques' },
  { to: '/customer/received', icon: Download, label: 'Received Cheques' },
  { to: '/customer/verify', icon: QrCode, label: 'Verify a Cheque' },
];

const CustomerLayout = () => {
  const { user, account, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const balanceRupees = account?.balance != null
    ? formatRupeesFromPaise(Math.round(account.balance * 100))
    : '—';

  const initials = (user?.full_name || user?.email || 'A')
    .split(/\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || 'A';

  return (
    <div className="min-h-screen bg-[#f7fafd] flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-100 shadow-lg z-50 flex flex-col transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1F4E79] flex items-center justify-center">
              <span className="text-white font-bold text-sm">SC</span>
            </div>
            <span className="font-bold text-[#1F4E79] text-sm">SmartCheque</span>
          </div>
          <button className="md:hidden text-gray-400" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        {/* User card */}
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1F4E79] to-[#5b8bbd] flex items-center justify-center text-white font-bold text-sm">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-[#1F4E79] text-sm truncate">{user?.full_name || 'Customer'}</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">{user?.role || 'INDIVIDUAL'}</p>
            </div>
          </div>
          {account?.account_number && (
            <p className="mt-3 text-[10px] text-gray-400 font-mono">
              A/C: <span className="text-[#1F4E79] font-semibold">{account.account_number}</span>
            </p>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-50 text-[#1F4E79] font-semibold'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-[#1F4E79]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} className={isActive ? 'text-[#1F4E79]' : ''} />
                  {label}
                </>
              )}
            </NavLink>
          ))}

          <div className="pt-4 mt-4 border-t border-gray-100 space-y-1">
            <NavLink
              to="/customer/settings"
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive ? 'bg-blue-50 text-[#1F4E79]' : 'text-gray-500 hover:bg-gray-50 hover:text-[#1F4E79]'
                }`
              }
            >
              <Settings size={18} /> Settings
            </NavLink>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all"
            >
              <LogOut size={18} /> Logout
            </button>
          </div>
        </nav>

        {/* Issue button */}
        <div className="px-3 pb-4">
          <button
            onClick={() => { navigate('/customer/issue'); setSidebarOpen(false); }}
            className="w-full bg-[#1F4E79] text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#163d63] transition-colors shadow-md"
          >
            <Plus size={18} /> New Cheque
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        {/* Top header */}
        <header className="sticky top-0 z-30 h-16 bg-white/90 backdrop-blur border-b border-gray-100 flex items-center justify-between px-6">
          <button className="md:hidden text-gray-500 hover:text-[#1F4E79]" onClick={() => setSidebarOpen(true)}>
            <Menu size={22} />
          </button>
          <div className="hidden md:flex items-center gap-2">
            <p className="text-xs text-gray-400 font-mono">Balance:</p>
            <p className="text-sm font-bold text-[#1F4E79]">{balanceRupees}</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-2 rounded-full hover:bg-gray-100 text-gray-500" title="Notifications">
              <Bell size={20} />
            </button>
            <button
              onClick={() => navigate('/customer/settings')}
              className="flex items-center gap-2 hover:bg-gray-50 px-3 py-1.5 rounded-xl transition-all"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#1F4E79] to-[#5b8bbd] flex items-center justify-center text-white text-xs font-bold">
                {initials}
              </div>
              <span className="text-sm font-semibold text-[#1F4E79] hidden sm:block">{user?.full_name?.split(' ')[0]}</span>
              <ChevronDown size={14} className="text-gray-400 hidden sm:block" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>

      {/* Mobile FAB */}
      <button
        onClick={() => navigate('/customer/issue')}
        className="fixed bottom-6 right-6 bg-[#F8C400] text-[#1F4E79] h-14 px-5 rounded-full shadow-xl flex items-center gap-2.5 font-bold text-sm hover:scale-105 active:scale-95 transition-all z-30 md:hidden"
      >
        <Plus size={20} />
        Issue New Cheque
      </button>
    </div>
  );
};

export default CustomerLayout;