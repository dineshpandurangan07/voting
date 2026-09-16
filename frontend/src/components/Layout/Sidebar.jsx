import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Vote, Users, UserCheck, BarChart3, Shield, ScrollText,
  Bell, Settings, LifeBuoy, LogOut, X, ShieldCheck, ChevronDown,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const adminLinks = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['super_admin', 'election_officer', 'auditor'] },
  { to: '/elections', icon: Vote, label: 'Elections', roles: ['super_admin', 'election_officer'] },
  { to: '/voters', icon: Users, label: 'Voters', roles: ['super_admin', 'election_officer'] },
  { to: '/candidates', icon: UserCheck, label: 'Candidates', roles: ['super_admin', 'election_officer'] },
  { to: '/analytics', icon: BarChart3, label: 'Analytics', roles: ['super_admin', 'election_officer', 'auditor'] },
  { to: '/security', icon: Shield, label: 'Security', roles: ['super_admin', 'election_officer', 'auditor'] },
  { to: '/audit-logs', icon: ScrollText, label: 'Audit Logs', roles: ['super_admin', 'auditor'] },
  { to: '/notifications', icon: Bell, label: 'Notifications', roles: ['super_admin', 'election_officer', 'auditor'] },
  { to: '/settings', icon: Settings, label: 'Settings', roles: ['super_admin', 'election_officer', 'auditor'] },
];

export default function Sidebar({ mobileOpen, onClose, isMobile }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const roleLabel = {
    super_admin: 'Super Admin',
    election_officer: 'Election Officer',
    auditor: 'Auditor',
    voter: 'Voter',
  }[user?.role] || user?.role;

  const sidebar = (
    <div className="flex flex-col h-full w-64 bg-sidebar text-gray-300 shrink-0 select-none">
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-gray-800/60">
        <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center shrink-0">
          <ShieldCheck size={18} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-white text-base leading-tight tracking-wide">VERAVOTE</p>
          <p className="text-[10px] text-gray-500 leading-tight">Digital Voting Protocol</p>
        </div>
        {isMobile && (
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-700/50 transition-colors">
            <X size={16} />
          </button>
        )}
      </div>

      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        {user?.role === 'voter' ? (
          <>
            <NavItem to="/voter-dashboard" icon={LayoutDashboard} label="Dashboard" />
            <NavItem to="/notifications" icon={Bell} label="Notifications" />
            <NavItem to="/profile" icon={Settings} label="My Profile" />
          </>
        ) : (
          adminLinks.filter((l) => l.roles.includes(user?.role)).map((l) => <NavItem key={l.to} {...l} />)
        )}
      </nav>

      <div className="p-3 border-t border-gray-800/60 space-y-0.5">
        <AppLink icon={LifeBuoy} label="Support" onClick={() => alert('Support: support@veravote.local')} />
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-gray-700/40 hover:text-white transition-colors">
          <LogOut size={18} />
          Logout
        </button>

        <div className="relative mt-2">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="w-full flex items-center gap-3 rounded-lg p-2 hover:bg-gray-700/40 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white font-semibold text-xs shrink-0">
              {user ? String(user.name).charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-gray-400 truncate">{roleLabel}</p>
            </div>
            <ChevronDown size={14} className="text-gray-500" />
          </button>
          <AnimatePresence>
            {profileOpen && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="absolute bottom-full left-0 right-0 mb-1 rounded-xl bg-sidebar-light border border-gray-700 p-1.5 shadow-2xl"
              >
                <button onClick={() => { setProfileOpen(false); navigate('/profile'); }} className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-gray-700/50 transition-colors">
                  My Profile
                </button>
                <button onClick={() => { setProfileOpen(false); navigate('/settings'); }} className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-gray-700/50 transition-colors">
                  Settings
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={onClose}
            />
            <motion.div
              initial={{ x: -260 }} animate={{ x: 0 }} exit={{ x: -260 }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="fixed inset-y-0 left-0 z-50"
            >
              {sidebar}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  return sidebar;
}

function NavItem({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      end={to === '/elections' ? false : true}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${isActive ? 'bg-primary-600 text-white font-medium' : 'text-gray-400 hover:bg-gray-700/40 hover:text-white'}`
      }
    >
      <Icon size={18} />
      {label}
    </NavLink>
  );
}

function AppLink({ icon: Icon, label, onClick }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-700/40 hover:text-white transition-colors">
      <Icon size={18} />
      {label}
    </button>
  );
}