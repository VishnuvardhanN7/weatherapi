import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CloudSun, BarChart3, Settings, LogOut,
  Menu, X, Bell, LogIn, SlidersHorizontal, Sun, Moon
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { api } from '../services/api.js';
import NotificationDrawer from './NotificationDrawer.jsx';
import AlertPreferences from './AlertPreferences.jsx';

const TOP_NAV_ITEMS = [
  { id: 'dashboard', path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'events', path: '/events', label: 'Weather Events', icon: CloudSun },
  { id: 'analytics', path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'admin', path: '/admin', label: 'Admin Panel', icon: Settings, adminOnly: true },
];

export default function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const isAdmin = user?.role === 'admin';

  const fetchUnread = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const { data } = await api.get('/api/notifications/unread-count');
      setUnreadCount(data.unread_count || 0);
    } catch {
      /* ignore */
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }
    fetchUnread();
    const timer = setInterval(fetchUnread, 60000);
    return () => clearInterval(timer);
  }, [isAuthenticated, fetchUnread]);

  const handleLogout = () => {
    logout();
    setNotifOpen(false);
    setProfileDropdownOpen(false);
    navigate('/');
  };

  const navItems = TOP_NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);
  const initials = (user?.full_name || user?.username || 'U').slice(0, 1).toUpperCase();

  const handleNavClick = (item) => {
    setMobileOpen(false);
    navigate(item.path);
  };

  return (
    <div className="min-h-screen bg-[#F7F7F5] dark:bg-[#0b0c10] text-[#14161f] dark:text-[#e7e5df] flex flex-col font-sans selection:bg-stone-700 selection:text-white transition-colors duration-200">
      <a href="#main-content" className="skip-link">Skip to main content</a>

      {/* Redesigned Minimal Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#0b0c10]/95 backdrop-blur-md border-b border-stone-200 dark:border-stone-800/60 px-4 sm:px-6 lg:px-8 py-3.5 transition-all duration-300">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4">
          
          {/* LEFT: Brand Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-[#14161f] dark:bg-[#faf9f6] flex items-center justify-center text-white dark:text-[#0f1016] shadow-sm group-hover:scale-105 transition-transform duration-300">
                <CloudSun className="w-5 h-5 text-white dark:text-[#0f1016]" />
              </div>
              <span className="text-[16px] font-extrabold tracking-tight text-stone-900 dark:text-white">
                ATMOS
              </span>
            </Link>
          </div>

          {/* CENTER: Horizontal Centered Navigation */}
          <nav className="hidden lg:flex items-center justify-center gap-2" aria-label="Main navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || (item.path === '/dashboard' && location.pathname === '/');
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item)}
                  className={clsx(
                    'flex items-center gap-2 px-4 py-2 rounded-full text-[14px] transition-all duration-200 whitespace-nowrap',
                    isActive
                      ? 'bg-[#14161f] dark:bg-[#faf9f6] text-white dark:text-[#0f1016] shadow-sm font-bold'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800/40 font-medium'
                  )}
                >
                  <Icon className={clsx('w-[17px] h-[17px] stroke-[1.75]', isActive ? 'text-white dark:text-[#0f1016]' : 'text-stone-500 dark:text-stone-400')} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* RIGHT: Minimal Control Icons & Avatar */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-full text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800/50 transition-all duration-200"
              title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              aria-label={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            >
              {theme === 'dark' ? (
                <Moon className="w-[18px] h-[18px] stroke-[1.75]" />
              ) : (
                <Sun className="w-[18px] h-[18px] stroke-[1.75]" />
              )}
            </button>

            {/* Notifications Button */}
            {isAuthenticated && (
              <button
                onClick={() => setNotifOpen(true)}
                className="relative p-2.5 rounded-full text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800/50 transition-all duration-200"
                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
              >
                <Bell className="w-[18px] h-[18px] stroke-[1.75]" />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500" />
                )}
              </button>
            )}

            {/* Alert Preferences */}
            {isAuthenticated && (
              <button
                onClick={() => setPrefsOpen(true)}
                className="p-2.5 rounded-full text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800/50 transition-all duration-200"
                title="Alert Settings"
                aria-label="Alert preferences"
              >
                <SlidersHorizontal className="w-[18px] h-[18px] stroke-[1.75]" />
              </button>
            )}

            {/* User Profile Avatar */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setProfileDropdownOpen((v) => !v)}
                  className="w-8 h-8 rounded-full bg-stone-200 hover:bg-stone-300 dark:hover:bg-white text-[#0f1016] text-[12px] font-extrabold flex items-center justify-center transition-all duration-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
                  aria-label="User profile"
                  title={user?.full_name || user?.username}
                >
                  {initials}
                </button>

                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-[#13151f] border border-stone-200 dark:border-stone-800 rounded-2xl shadow-lg dark:shadow-editorial p-2 z-50">
                    <div className="px-3 py-2 border-b border-stone-100 dark:border-stone-800 mb-1">
                      <p className="text-xs font-bold text-stone-900 dark:text-white truncate">{user?.full_name || user?.username}</p>
                      <p className="text-[10px] text-stone-500 dark:text-stone-400 capitalize">{user?.role || 'User'}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="px-3.5 py-2 rounded-full bg-[#14161f] text-white dark:bg-[#faf9f6] dark:text-[#0f1016] text-[13px] font-bold hover:bg-black dark:hover:bg-white transition-all duration-200 inline-flex items-center gap-1.5 shadow-sm">
                <LogIn className="w-[16px] h-[16px]" /> Sign In
              </Link>
            )}

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="lg:hidden p-2.5 rounded-full text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800/50"
              aria-label="Toggle navigation"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="fixed right-0 top-0 h-full w-64 bg-white dark:bg-[#0e1017] border-l border-stone-200 dark:border-stone-800 p-5 flex flex-col justify-between z-50">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-stone-200 dark:border-stone-800 mb-4">
                <span className="font-bold text-stone-900 dark:text-white text-sm">Navigation</span>
                <button onClick={() => setMobileOpen(false)} className="p-1 text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item)}
                      className={clsx(
                        'w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all',
                        isActive
                          ? 'bg-[#14161f] text-white dark:bg-[#faf9f6] dark:text-[#0f1016]'
                          : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-white'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-stone-200 dark:border-stone-800">
              {isAuthenticated ? (
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 p-2.5 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 font-semibold text-xs"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 text-xs"
                >
                  <LogIn className="w-4 h-4" /> Sign In
                </Link>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main id="main-content" className="flex-1 max-w-[1600px] w-full mx-auto p-4 sm:p-6 lg:p-8" tabIndex={-1}>
        {children}
      </main>

      {/* Notifications & Preferences Drawers */}
      <NotificationDrawer open={notifOpen} onClose={() => setNotifOpen(false)} />
      <AlertPreferences open={prefsOpen} onClose={() => setPrefsOpen(false)} />
    </div>
  );
}
