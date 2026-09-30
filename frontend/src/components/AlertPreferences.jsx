import React, { useEffect, useState } from 'react';
import { X, MapPin, LocateFixed, Loader2, AlertCircle, SlidersHorizontal } from 'lucide-react';
import { api, getUser, setAuth, getToken } from '../services/api.js';

const RADIUS_OPTIONS = [10, 25, 50, 75, 100];

export default function AlertPreferences({ open, onClose }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  const [prefs, setPrefs] = useState({
    notification_consent: false,
    notification_lat: null,
    notification_lng: null,
    notification_radius_km: 25,
  });

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError('');
    api
      .get('/api/notifications/preferences')
      .then(({ data }) => setPrefs(data))
      .catch(() => setError('Unable to load alert preferences.'))
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;

  const enableAlerts = async () => {
    setError('');
    if (!prefs.notification_lat || !prefs.notification_lng) {
      setError('Enable location first, then turn on weather alerts.');
      return;
    }
    setPrefs((p) => ({ ...p, notification_consent: true }));
  };

  const useCurrentLocation = async () => {
    setLocating(true);
    setError('');
    if (!('geolocation' in navigator)) {
      setError('Geolocation is not supported by this browser.');
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPrefs((p) => ({
          ...p,
          notification_lat: Number(position.coords.latitude.toFixed(5)),
          notification_lng: Number(position.coords.longitude.toFixed(5)),
        }));
        setLocating(false);
      },
      () => {
        setError('Location access was denied. Allow location to receive nearby weather alerts.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const { data } = await api.put('/api/notifications/preferences', {
        notification_consent: prefs.notification_consent,
        notification_lat: prefs.notification_lat,
        notification_lng: prefs.notification_lng,
        notification_radius_km: prefs.notification_radius_km,
      });
      setAuth({ token: getToken(), user: { ...getUser(), ...data } });
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save preferences.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60 dark:bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-[#0e1017] border border-stone-200 dark:border-stone-800 rounded-3xl p-6 sm:p-8 shadow-xl dark:shadow-editorial">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-sky-600 dark:text-sky-400">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-stone-900 dark:text-white tracking-tight">Weather Alert Preferences</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-sky-600 dark:text-sky-400" />
          </div>
        ) : (
          <div className="space-y-5">
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-600 dark:text-red-300 text-xs font-medium">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                {error}
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-2 block">
                Target Monitoring Location
              </label>
              <div className="flex flex-col gap-2">
                <button
                  onClick={useCurrentLocation}
                  disabled={locating}
                  className="btn-secondary inline-flex items-center justify-center gap-2 text-xs py-2.5"
                >
                  {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4 text-sky-600 dark:text-sky-400" />}
                  <span>Use Current Device Location</span>
                </button>
                {prefs.notification_lat != null && (
                  <p className="text-[11px] font-mono text-stone-500 dark:text-stone-400 text-center mt-1">
                    Lat: {prefs.notification_lat.toFixed(4)} · Lng: {prefs.notification_lng.toFixed(4)}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-2 block">Geofence Alert Radius</label>
              <div className="flex gap-2 flex-wrap">
                {RADIUS_OPTIONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setPrefs((p) => ({ ...p, notification_radius_km: r }))}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                      prefs.notification_radius_km === r
                        ? 'bg-[#14161f] text-white dark:bg-[#faf9f6] dark:text-[#0f1016] shadow-sm'
                        : 'bg-stone-100 dark:bg-[#141620] border border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
                    }`}
                  >
                    {r} km
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-stone-50 dark:bg-[#141620] border border-stone-200 dark:border-stone-800 rounded-2xl">
              <div>
                <p className="text-xs font-bold text-stone-900 dark:text-white">Enable Real-Time Alerts</p>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                  High & Critical severity events within radius
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={prefs.notification_consent}
                  onChange={(e) => {
                    if (e.target.checked) enableAlerts();
                    else setPrefs((p) => ({ ...p, notification_consent: false }));
                  }}
                />
                <div className="w-10 h-5 bg-stone-300 dark:bg-stone-800 peer-focus:outline-none rounded-full peer peer-checked:bg-sky-500 after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:after:translate-x-5" />
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-stone-200 dark:border-stone-800">
              <button onClick={onClose} className="btn-secondary text-xs">Cancel</button>
              <button
                onClick={save}
                disabled={saving}
                className="btn-primary text-xs inline-flex items-center gap-2"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save Preferences
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}