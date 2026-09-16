import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { notificationsAPI } from '../../api/api';

export default function TopNav({ onMenuClick }) {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    const fetchUnread = async () => {
      try {
        const res = await notificationsAPI.getUnreadCount();
        if (mounted) setUnread(res.data?.data?.unreadCount ?? 0);
      } catch {
        // ignore
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  const roleLabel = {
    super_admin: 'Super Admin',
    election_officer: 'Election Officer',
    auditor: 'Auditor',
    voter: 'Voter',
  }[user?.role] || user?.role;

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <Menu size={20} />
        </button>
        <div className="hidden sm:block">
          <p className="text-sm text-gray-400">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate('/notifications')}
          className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Bell size={19} className="text-gray-500" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>

        <button
          onClick={() => navigate('/profile')}
          className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors ml-1"
        >
          <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white font-semibold text-xs">
            {user ? String(user.name).charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-sm font-medium text-gray-800 leading-tight">{user?.name}</p>
            <p className="text-xs text-gray-400 leading-tight">{roleLabel}</p>
          </div>
        </button>
      </div>
    </header>
  );
}