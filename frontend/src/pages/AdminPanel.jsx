import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Users, Shield, Settings, CheckCircle, XCircle, Clock,
  AlertTriangle, Database, Trash2, Eye, RefreshCw, Plus,
  Keyboard, Filter, ChevronDown, Brain, ListChecks, Loader2
} from 'lucide-react';
import EventTable from '../components/EventTable.jsx';
import StatsCard from '../components/StatsCard.jsx';
import { api } from '../services/api.js';

const EVENT_TYPES = [
  'rainfall', 'thunderstorm', 'flooding', 'heatwave', 'fog',
  'dust_storm', 'strong_winds', 'cyclone', 'other',
];

export default function AdminPanel() {
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('events');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [ingesting, setIngesting] = useState(false);
  const [ingestionMessage, setIngestionMessage] = useState('');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [overrideEvent, setOverrideEvent] = useState(null);
  const [overrideType, setOverrideType] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideSaving, setOverrideSaving] = useState(false);
  const [overrideDone, setOverrideDone] = useState(null);

  const openOverride = (event) => {
    setOverrideEvent(event);
    setOverrideType(event.event_type || 'other');
    setOverrideReason('');
    setOverrideDone(null);
  };

  const closeOverride = () => {
    setOverrideEvent(null);
    setOverrideDone(null);
  };

  const submitOverride = async () => {
    if (!overrideEvent || !overrideReason.trim() || overrideSaving) return;
    setOverrideSaving(true);
    try {
      const res = await api.post(`/api/intelligence/events/${overrideEvent.id}/classify`, {
        event_type: overrideType,
        reason: overrideReason.trim(),
      });
      const audit = await api.get(`/api/intelligence/events/${overrideEvent.id}/audit`);
      setOverrideDone({
        summary: res.data,
        audit_entries: audit.data?.audit_entries || [],
      });
      fetchData();
    } catch (err) {
      setOverrideDone({ error: err.response?.data?.detail || 'Override failed.' });
    }
    setOverrideSaving(false);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [eventsRes, statsRes] = await Promise.allSettled([
        api.get('/api/weather?per_page=100'),
        api.get('/api/weather/stats/general'),
      ]);

      if (eventsRes.status === 'fulfilled') setEvents(eventsRes.value.data.data);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
    } catch (err) {
      console.error('Admin fetch error:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredEvents = useMemo(() => {
    let result = events;

    if (activeTab === 'verification') {
      result = result.filter(e =>
        e.verification_status === 'pending' || e.verification_status === 'needs_review'
      );
    } else if (activeTab === 'suspicious') {
      result = result.filter(e => e.is_fake === true);
    } else if (activeTab === 'verified') {
      result = result.filter(e => e.verification_status === 'verified');
    }

    if (statusFilter !== 'all') {
      result = result.filter(e => e.verification_status === statusFilter);
    }

    return result;
  }, [events, activeTab, statusFilter]);

  const counts = useMemo(() => ({
    all: events.length,
    verification: events.filter(e => e.verification_status === 'pending' || e.verification_status === 'needs_review').length,
    suspicious: events.filter(e => e.is_fake === true).length,
    verified: events.filter(e => e.verification_status === 'verified').length,
  }), [events]);

  const statusCounts = useMemo(() => ({
    all: events.length,
    pending: events.filter(e => e.verification_status === 'pending').length,
    verified: events.filter(e => e.verification_status === 'verified').length,
    rejected: events.filter(e => e.verification_status === 'rejected').length,
    needs_review: events.filter(e => e.verification_status === 'needs_review').length,
  }), [events]);

  const handleVerify = async (eventId, status) => {
    try {
      await api.post(`/api/weather/${eventId}/verify`, { verification_status: status });
      fetchData();
    } catch (err) {
      console.error('Verify error:', err);
    }
  };

  const handleDelete = async (eventId) => {
    if (!confirm('Delete Weather Event?\n\nAre you sure you want to permanently delete this weather event?\nThis action cannot be undone.')) return;
    try {
      await api.delete(`/api/weather/${eventId}`);
      fetchData();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filteredEvents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredEvents.map(e => e.id)));
    }
  };

  const bulkVerify = async (status) => {
    const targets = filteredEvents.filter(e => selectedIds.has(e.id) && e.verification_status === 'pending');
    if (targets.length === 0) return;
    if (!confirm(`Verify ${targets.length} selected event(s) as ${status}?`)) return;

    for (const event of targets) {
      try {
        await api.post(`/api/weather/${event.id}/verify`, { verification_status: status });
      } catch (err) {
        console.error(`Bulk verify error for event ${event.id}:`, err);
      }
    }
    setSelectedIds(new Set());
    fetchData();
  };

  const bulkDelete = async () => {
    const targets = filteredEvents.filter(e => selectedIds.has(e.id));
    if (targets.length === 0) return;
    if (!confirm(`Permanently delete ${targets.length} selected event(s)?`)) return;

    for (const event of targets) {
      try {
        await api.delete(`/api/weather/${event.id}`);
      } catch (err) {
        console.error(`Bulk delete error for event ${event.id}:`, err);
      }
    }
    setSelectedIds(new Set());
    fetchData();
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'v' || e.key === 'V') {
        e.preventDefault();
        bulkVerify('verified');
      }
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        bulkVerify('rejected');
      }
      if (e.key === '?') {
        e.preventDefault();
        setShowShortcuts(s => !s);
      }
      if (e.key === 'Escape') {
        setSelectedIds(new Set());
        setShowShortcuts(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedIds, filteredEvents]);

  const runIngestion = async (useSampleData = false) => {
    setIngesting(true);
    setIngestionMessage('Collecting selected weather sources...');
    try {
      const response = await api.post('/api/ingest/run', {
        sources: ['social', 'web', 'public_api'],
        use_sample_data: useSampleData,
      });
      setIngestionMessage(`Ingestion complete: ${response.data.total_stored} events stored.`);
      await fetchData();
    } catch (err) {
      setIngestionMessage(err.response?.data?.detail || 'Ingestion failed. Check configured API credentials.');
    } finally {
      setIngesting(false);
    }
  };

  const tabs = [
    { id: 'events', label: 'All Incidents', icon: Database, count: counts.all },
    { id: 'verification', label: 'Verification Queue', icon: Shield, count: counts.verification },
    { id: 'suspicious', label: 'Suspicious / Fake Risk', icon: AlertTriangle, count: counts.suspicious },
    { id: 'verified', label: 'Verified Authentic', icon: CheckCircle, count: counts.verified },
  ];

  return (
    <div className="space-y-8" role="main" aria-label="Admin Panel">
      
      {/* Keyboard shortcuts modal */}
      {showShortcuts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowShortcuts(false)}>
          <div className="card max-w-md w-full mx-4 bg-[#0e1017] border border-stone-800 p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-stone-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-sky-400" /> Keyboard Shortcuts
              </h3>
              <button onClick={() => setShowShortcuts(false)} className="text-stone-400 hover:text-white">
                <XCircle className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5"><span className="text-stone-400">Verify selected</span><kbd className="px-2.5 py-1 bg-stone-800 rounded-md text-stone-200 font-mono">V</kbd></div>
              <div className="flex justify-between py-1.5"><span className="text-stone-400">Reject selected</span><kbd className="px-2.5 py-1 bg-stone-800 rounded-md text-stone-200 font-mono">R</kbd></div>
              <div className="flex justify-between py-1.5"><span className="text-stone-400">Deselect all / Close</span><kbd className="px-2.5 py-1 bg-stone-800 rounded-md text-stone-200 font-mono">Esc</kbd></div>
              <div className="flex justify-between py-1.5"><span className="text-stone-400">Toggle shortcuts</span><kbd className="px-2.5 py-1 bg-stone-800 rounded-md text-stone-200 font-mono">?</kbd></div>
            </div>
          </div>
        </div>
      )}

      {/* Editorial Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-stone-800/80">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-[34px] font-extrabold text-[#faf9f6] tracking-tight">
            Admin Panel
          </h1>
          <p className="text-[13px] text-stone-400 mt-1.5 font-normal max-w-2xl leading-relaxed">
            System administration and verification
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setShowShortcuts(true)}
            className="btn-secondary inline-flex items-center gap-2 text-xs py-2 px-4"
          >
            <Keyboard className="w-3.5 h-3.5 text-stone-400" />
            <span>Shortcuts</span>
          </button>
          <button onClick={fetchData} className="btn-secondary inline-flex items-center gap-2 text-xs py-2 px-4" disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Metrics Row (Matching Dashboard StatsCard Proportions) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Records"
          value={stats?.total_events || events.length}
          icon={Database}
          variant="primary"
        />
        <StatsCard
          title="Pending Review"
          value={statusCounts.pending}
          icon={Clock}
          variant="warning"
        />
        <StatsCard
          title="Verified"
          value={statusCounts.verified}
          icon={CheckCircle}
          variant="success"
        />
        <StatsCard
          title="Rejected"
          value={statusCounts.rejected}
          icon={XCircle}
          variant="danger"
        />
      </div>

      {/* Data Ingestion Control Card */}
      <div className="bg-[#13151f]/90 border border-stone-800/90 rounded-3xl p-6 sm:p-7 shadow-editorial">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <Database className="w-4 h-4 text-sky-400" /> Multi-Source Ingestion Engine
            </h2>
            <p className="mt-1 text-xs text-stone-400 leading-relaxed">
              Trigger live collection from Twitter/X feeds, weather web scraping, and public APIs.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button onClick={() => runIngestion(false)} disabled={ingesting} className="btn-primary inline-flex items-center gap-2 text-xs py-2 px-4">
              <RefreshCw className={`w-3.5 h-3.5 ${ingesting ? 'animate-spin' : ''}`} /> Run Ingestion Engine
            </button>
            <button onClick={() => runIngestion(true)} disabled={ingesting} className="btn-secondary text-xs py-2 px-4">
              Load Sample Dataset
            </button>
          </div>
        </div>
        {ingestionMessage && (
          <p className="mt-3 text-xs font-semibold text-sky-400">{ingestionMessage}</p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-800 pb-0">
        <div className="flex gap-2 overflow-x-auto" role="tablist">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => { setActiveTab(tab.id); setSelectedIds(new Set()); }}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                  isActive
                    ? 'border-[#faf9f6] text-[#faf9f6]'
                    : 'border-transparent text-stone-400 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
                {tab.count > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 font-bold">{tab.count}</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 pb-2 sm:pb-0">
          <label htmlFor="admin-status-filter" className="text-xs font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1">
            <Filter className="w-3 h-3" /> Status:
          </label>
          <select
            id="admin-status-filter"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setSelectedIds(new Set()); }}
            className="bg-[#141620] border border-stone-800 text-stone-200 text-xs py-1.5 px-3 rounded-full font-semibold focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
            <option value="needs_review">Needs Review</option>
          </select>
        </div>
      </div>

      {/* Bulk action toolbar */}
      {selectedIds.size > 0 && (
        <div className="card bg-sky-500/10 border border-sky-500/20 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <span className="text-xs font-bold text-sky-300">
            {selectedIds.size} incident(s) selected
          </span>
          <div className="flex gap-2">
            <button onClick={() => bulkVerify('verified')} className="btn-primary text-xs py-2 inline-flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Verify Selected
            </button>
            <button onClick={() => bulkVerify('rejected')} className="btn-danger text-xs py-2 inline-flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5" /> Reject Selected
            </button>
            <button onClick={bulkDelete} className="btn-danger text-xs py-2 inline-flex items-center gap-1">
              <Trash2 className="w-3.5 h-3.5" /> Delete Selected
            </button>
            <button onClick={() => setSelectedIds(new Set())} className="btn-secondary text-xs py-2">
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Table Component */}
      <EventTable
        events={filteredEvents}
        onVerify={handleVerify}
        onDelete={handleDelete}
        onClassify={openOverride}
        loading={loading}
        selectable
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onSelectAll={selectAll}
      />

      {/* AI Classification Override Modal */}
      {overrideEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={closeOverride}>
          <div className="card max-w-lg w-full max-h-[85vh] overflow-y-auto bg-[#0e1017] border border-stone-800 p-6 shadow-editorial" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-stone-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Brain className="w-4 h-4 text-sky-400" /> Human Override for AI Classifier
              </h3>
              <button onClick={closeOverride} className="text-stone-400 hover:text-white">
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-stone-400 mb-4 leading-relaxed">
              Manually reclassify <span className="text-white font-semibold">“{overrideEvent.title}”</span>. The original AI prediction will remain recorded in the immutable audit log.
            </p>

            {!overrideDone ? (
              <div className="space-y-4">
                <div>
                  <label htmlFor="override-type" className="mb-1.5 block text-xs font-bold text-stone-400 uppercase tracking-wider">
                    Target Event Category
                  </label>
                  <select
                    id="override-type"
                    value={overrideType}
                    onChange={(e) => setOverrideType(e.target.value)}
                    className="select w-full text-xs font-medium"
                  >
                    {EVENT_TYPES.map(t => (
                      <option key={t} value={t}>{t.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="override-reason" className="mb-1.5 block text-xs font-bold text-stone-400 uppercase tracking-wider">
                    Justification Reason <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    id="override-reason"
                    rows={3}
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="Enter justification for overriding AI classification..."
                    className="input w-full text-xs leading-relaxed"
                  />
                </div>
                <button
                  onClick={submitOverride}
                  disabled={!overrideReason.trim() || overrideSaving}
                  className="btn-primary w-full inline-flex items-center justify-center gap-2 text-xs py-2.5 disabled:opacity-50"
                >
                  {overrideSaving ? <Loader2 className="w-4 h-4 animate-spin text-[#0f1016]" /> : <Shield className="w-4 h-4" />}
                  Submit Classification Override
                </button>
              </div>
            ) : overrideDone.error ? (
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs font-semibold text-rose-300">
                {overrideDone.error}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs font-semibold text-emerald-300">
                  Event successfully reclassified as <strong>{overrideDone.summary.event_type}</strong>.
                </div>
                <button onClick={closeOverride} className="btn-secondary w-full text-xs py-2.5">
                  Close Window
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
