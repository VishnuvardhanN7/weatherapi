import React, { useEffect, useState, useCallback, useRef } from 'react';
import { X, Bell, CheckCheck, MapPin, ShieldAlert, Info, Settings, Loader2 } from 'lucide-react';
import { api } from '../services/api.js';

const TYPE_ICONS = {
  alert: MapPin,
  verification: ShieldAlert,
  system: Info,
};

const TYPE_COLORS = {
  alert: 'text-rose-600 dark:text-rose-400',
  verification: 'text-amber-600 dark:text-amber-400',
  system: 'text-sky-600 dark:text-sky-400',
};

export default function NotificationDrawer({ open, onClose }) {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const drawerRef = useRef(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, countRes] = await Promise.all([
        api.get('/api/notifications?per_page=50'),
        api.get('/api/notifications/unread-count'),
      ]);
      setItems(listRes.data.data || []);
      setUnread(countRes.data.unread_count || 0);
    } catch {
      /* logged out / offline */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    refresh();
    const timer = setInterval(refresh, 45000);
    return () => clearInterval(timer);
  }, [open, refresh]);

  useEffect(() => {
    if (open && drawerRef.current) {
      drawerRef.current.focus();
    }
  }, [open]);

  const markRead = async (id) => {
    try {
      await api.post(`/api/notifications/${id}/read`);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setUnread((u) => Math.max(0, u - 1));
    } catch {
      /* ignore */
    }
  };

  const markAllRead = async () => {
    try {
      await api.post('/api/notifications/read-all');
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnread(0);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && open) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const filtered = filter === 'unread'
    ? items.filter((n) => !n.is_read)
    : filter === 'alerts'
    ? items.filter((n) => n.type === 'alert')
    : items;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Notifications">
      <div className="absolute inset-0 bg-black/60 dark:bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <aside
        ref={drawerRef}
        tabIndex={-1}
        className="absolute right-0 top-0 h-full w-full max-w-md bg-white dark:bg-[#0e1017] border-l border-stone-200 dark:border-stone-800 flex flex-col outline-none shadow-2xl"
      >
        <div className="flex items-center justify-between p-5 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-600 dark:text-sky-400">
              <Bell className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-stone-900 dark:text-white tracking-tight">System Alerts & Notifications</h2>
            {unread > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20">
                {unread} new
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300 inline-flex items-center gap-1 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
            <button onClick={onClose} className="p-2 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex gap-2 px-5 py-3 border-b border-stone-200 dark:border-stone-800" role="tablist">
          {[
            { id: 'all', label: 'All' },
            { id: 'unread', label: 'Unread' },
            { id: 'alerts', label: 'Alerts' },
          ].map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={filter === tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all ${
                filter === tab.id
                  ? 'bg-[#14161f] text-white dark:bg-[#faf9f6] dark:text-[#0f1016] shadow-sm'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
          {loading && (
            <Loader2 className="w-3.5 h-3.5 text-stone-500 animate-spin ml-auto self-center" />
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-stone-500 p-8 text-center">
              <Bell className="w-10 h-10 mb-3 opacity-30 text-stone-400" />
              <p className="text-xs font-semibold">
                {filter === 'unread' ? 'No unread notifications' : 'No notification history'}
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            {filtered.map((n) => {
              const Icon = TYPE_ICONS[n.type] || Info;
              const iconColor = TYPE_COLORS[n.type] || 'text-stone-400';
              return (
                <div
                  key={n.id}
                  onClick={() => !n.is_read && markRead(n.id)}
                  role="button"
                  tabIndex={0}
                  className={`p-4 rounded-2xl transition-all cursor-pointer border ${
                    n.is_read
                      ? 'bg-stone-50 dark:bg-[#13151f]/40 border-stone-200 dark:border-stone-800/40 opacity-70'
                      : 'bg-white dark:bg-[#13151f] border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 shadow-sm'
                  }`}
                >
                  <div className="flex gap-3">
                    <div className="mt-0.5 shrink-0">
                      <Icon className={`w-4 h-4 ${iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-stone-900 dark:text-white">{n.title}</p>
                      <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 leading-relaxed">{n.message}</p>
                      <p className="text-[10px] font-medium text-stone-400 dark:text-stone-500 mt-2">
                        {new Date(n.created_at).toLocaleString()}
                      </p>
                    </div>
                    {!n.is_read && (
                      <span className="w-2 h-2 mt-1 rounded-full bg-red-500 flex-shrink-0" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </aside>
    </div>
  );
}
