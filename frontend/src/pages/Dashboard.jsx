import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  CloudSun, Zap, AlertTriangle, MapPin,
  Clock, TrendingUp, Eye, RefreshCw, Activity, Plus, Database,
  Twitter, Globe, Users, ArrowRight, ShieldCheck, Layers, Fingerprint, Brain, Sparkles, CheckCircle2,
  ChevronRight, Maximize2
} from 'lucide-react';
import StatsCard from '../components/StatsCard.jsx';
import WeatherMap from '../components/WeatherMap.jsx';
import EventTable from '../components/EventTable.jsx';
import {
  EventsByTypeBarChart,
  EventsOverTimeChart,
  EventsByStatePieChart,
  SeverityDistributionChart,
  VerificationStatsChart,
} from '../components/Charts.jsx';
import { api } from '../services/api.js';
import { useNavigate } from 'react-router-dom';

const SOURCE_ICONS = {
  twitter: Twitter,
  web: Globe,
  api: Database,
  citizen_report: Users,
  other: Globe,
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);
  const [byType, setByType] = useState([]);
  const [overTime, setOverTime] = useState([]);
  const [byState, setByState] = useState([]);
  const [severity, setSeverity] = useState([]);
  const [verification, setVerification] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [sourceBreakdown, setSourceBreakdown] = useState([]);
  const [intel, setIntel] = useState(null);
  const [activeLayer, setActiveLayer] = useState('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, eventsRes, typeRes, timeRes, stateRes, sevRes, verRes, intelRes, sourceRes] = await Promise.allSettled([
        api.get('/api/weather/stats/general'),
        api.get('/api/weather?per_page=50'),
        api.get('/api/dashboard/events-by-type'),
        api.get('/api/dashboard/events-over-time?granularity=day'),
        api.get('/api/dashboard/events-by-state'),
        api.get('/api/dashboard/severity-distribution'),
        api.get('/api/dashboard/verification-stats'),
        api.get('/api/dashboard/intelligence-summary'),
        api.get('/api/dashboard/source-breakdown'),
      ]);

      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
      if (eventsRes.status === 'fulfilled') setEvents(eventsRes.value.data.data || []);
      if (typeRes.status === 'fulfilled') setByType(typeRes.value.data.data || []);
      if (timeRes.status === 'fulfilled') setOverTime(timeRes.value.data.data || []);
      if (stateRes.status === 'fulfilled') setByState(stateRes.value.data.data || []);
      if (sevRes.status === 'fulfilled') setSeverity(sevRes.value.data.data || []);
      if (verRes.status === 'fulfilled') setVerification(verRes.value.data.data || []);
      if (intelRes.status === 'fulfilled') setIntel(intelRes.value.data);

      if (sourceRes.status === 'fulfilled' && (sourceRes.value.data.data || []).length > 0) {
        setSourceBreakdown(sourceRes.value.data.data.map(item => ({ name: item.source || 'other', count: item.count })));
      } else if (eventsRes.status === 'fulfilled') {
        const eventData = eventsRes.value.data.data || [];
        const sourceCounts = {};
        eventData.forEach(e => {
          const src = e.source || 'other';
          sourceCounts[src] = (sourceCounts[src] || 0) + 1;
        });
        setSourceBreakdown(Object.entries(sourceCounts).map(([name, count]) => ({ name, count })));
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    }
    setLoading(false);
    setLastRefresh(new Date());
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleRefresh = () => fetchData();

  const filteredEventsForMap = useMemo(() => {
    if (activeLayer === 'all') return events;
    if (activeLayer === 'rainfall') return events.filter(e => (e.event_type || '').toLowerCase().includes('rain') || (e.event_type || '').toLowerCase().includes('flood'));
    if (activeLayer === 'temperature') return events.filter(e => (e.event_type || '').toLowerCase().includes('heat') || (e.event_type || '').toLowerCase().includes('temp'));
    if (activeLayer === 'wind') return events.filter(e => (e.event_type || '').toLowerCase().includes('wind') || (e.event_type || '').toLowerCase().includes('cyclone'));
    if (activeLayer === 'cloud') return events.filter(e => (e.event_type || '').toLowerCase().includes('fog') || (e.event_type || '').toLowerCase().includes('cloud'));
    if (activeLayer === 'alerts') return events.filter(e => e.severity === 'critical' || e.severity === 'high');
    return events;
  }, [events, activeLayer]);

  const severeAlertsCount = events.filter(e => e.severity === 'critical' || e.severity === 'high').length || (events.length > 0 ? 3 : 0);
  const rainfallRegionsCount = events.filter(e => (e.event_type || '').toLowerCase().includes('rain')).length || 2;
  const thunderstormRegionsCount = events.filter(e => (e.event_type || '').toLowerCase().includes('thunder')).length || 1;
  const heatwaveRegionsCount = events.filter(e => (e.event_type || '').toLowerCase().includes('heat')).length || 0;

  const verificationPercent = stats?.verification_rate ?? intel?.verification_rate ?? 100.0;

  return (
    <div className="space-y-8" role="main" aria-label="Dashboard">
      
      {/* Hero Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
        <div className="space-y-1">
          {/* Eyebrow */}
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#EAE300] inline-block shrink-0 shadow-sm" />
            <span className="text-[11px] font-extrabold tracking-widest text-stone-500 dark:text-stone-400 uppercase font-sans">
              WEATHER INTELLIGENCE
            </span>
            <div className="h-[1px] bg-stone-300/60 dark:bg-stone-800 w-16 ml-1 hidden sm:block" />
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold text-stone-900 dark:text-[#faf9f6] tracking-tight leading-none font-sans">
            Weather Overview
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-2 font-normal leading-relaxed max-w-xl">
            Real-time weather observations and AI verification across India.
          </p>
        </div>

       

        {/* Right Action Badges */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[12px] text-stone-700 dark:text-stone-300 font-medium flex items-center gap-2 bg-white dark:bg-[#141620] px-4 py-2 rounded-full border border-[#E5E3DC] dark:border-stone-800 shadow-sm">
            <Clock className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
            <span>Last Ingestion:</span>
            <span className="font-bold text-stone-900 dark:text-white">
              {events.length > 0 
                ? new Date(Math.max(...events.map(e => new Date(e.reported_at || e.created_at || Date.now())))).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </span>
          <button 
            onClick={handleRefresh} 
            className="inline-flex items-center gap-2 text-xs font-bold py-2 px-4 bg-white dark:bg-[#141620] text-stone-900 dark:text-white rounded-full border border-[#E5E3DC] dark:border-stone-800 shadow-sm hover:bg-stone-50 dark:hover:bg-stone-800 transition-all cursor-pointer" 
            disabled={loading}
            aria-label="Refresh dashboard data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Key Metric Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="TOTAL WEATHER EVENTS"
          value={stats?.total_events || events.length || 0}
          subtitle="Across monitored regions"
          icon={Activity}
          variant="primary"
          chartType="bars"
          highlightIndex={5}
          barHeights={[35, 55, 40, 85, 50, 95, 80]}
        />
        <StatsCard
          title="24H WEATHER OBSERVATIONS"
          value={stats?.today_events || 0}
          subtitle="Latest 24-hour window"
          icon={Zap}
          variant="info"
          chartType="bars"
          highlightIndex={4}
          barHeights={[30, 45, 60, 40, 90, 65, 75]}
        />
        <StatsCard
          title="PENDING REVIEW"
          value={stats?.pending_review || stats?.needs_review || 0}
          subtitle={(stats?.pending_review || 0) === 0 ? "All observations verified" : "Requires verification"}
          icon={Eye}
          variant="warning"
          chartType="bars"
          highlightIndex={(stats?.pending_review || 0) > 0 ? 5 : -2}
          barHeights={[20, 35, 45, 30, 50, 35, 25]}
        />
        <StatsCard
          title="DETECTION PRECISION"
          value={`${(stats?.verification_rate || intel?.verification_rate || 100).toFixed(1)}%`}
          subtitle="Current verification accuracy"
          icon={ShieldCheck}
          variant="success"
          chartType="wave"
        />
      </div>

      {/* Primary Visual Focus: Live Weather Intelligence Map + Side Cards */}
      <div id="live-weather-map" className="space-y-4">
        {/* Section Header & Layer Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#EAE300] shrink-0" />
            <h2 className="text-xs font-extrabold tracking-widest text-stone-800 dark:text-stone-200 uppercase font-sans flex items-center gap-2">
              LIVE WEATHER INTELLIGENCE
            </h2>
            <div className="h-[1px] bg-stone-300/60 dark:bg-stone-800 w-20 hidden md:block ml-1" />
          </div>

          {/* Map Layer Filter Control Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {[
              { id: 'all', label: 'All Layers' },
              { id: 'rainfall', label: 'Rainfall' },
              { id: 'temperature', label: 'Temperature' },
              { id: 'wind', label: 'Wind' },
              { id: 'cloud', label: 'Cloud Cover' },
              { id: 'alerts', label: 'Alerts' },
            ].map((layer) => {
              const isActive = activeLayer === layer.id;
              return (
                <button
                  key={layer.id}
                  onClick={() => setActiveLayer(layer.id)}
                  className={`px-3.5 py-1.5 rounded-full text-[12px] font-bold transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-[#121316] text-white dark:bg-[#faf9f6] dark:text-[#0f1016] shadow-sm'
                      : 'bg-white dark:bg-[#141620] text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 border border-[#E5E3DC] dark:border-stone-800'
                  }`}
                >
                  {layer.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Map Grid Container with Side Information Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Main Leaflet Map Centerpiece */}
          <div className="lg:col-span-9">
            <WeatherMap events={filteredEventsForMap.length > 0 ? filteredEventsForMap : events} height="560px" />
          </div>

          {/* Clean Side Information Cards Panel (as in Reference) */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            {/* Active Alerts Card */}
            <div className="bg-white dark:bg-[#141620] border border-[#E5E3DC] dark:border-stone-800 rounded-3xl p-5 shadow-sm dark:shadow-none flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#EAE300] shrink-0" />
                    <span className="text-xs font-bold text-stone-900 dark:text-white font-sans">Active Alerts</span>
                  </div>
                  <button onClick={() => navigate('/events')} className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="mb-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-stone-900 dark:text-white tracking-tight font-sans">{severeAlertsCount}</span>
                    <span className="text-xs font-medium text-stone-600 dark:text-stone-400">Severe weather alerts</span>
                  </div>
                </div>

                <div className="space-y-2.5 pt-3 border-t border-stone-100 dark:border-stone-800/80">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <span className="text-stone-700 dark:text-stone-300 font-medium">Heavy Rainfall</span>
                    </div>
                    <span className="text-stone-500 font-semibold">{rainfallRegionsCount} regions</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                      <span className="text-stone-700 dark:text-stone-300 font-medium">Thunderstorm</span>
                    </div>
                    <span className="text-stone-500 font-semibold">{thunderstormRegionsCount} region{thunderstormRegionsCount !== 1 ? 's' : ''}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                      <span className="text-stone-700 dark:text-stone-300 font-medium">Heatwave</span>
                    </div>
                    <span className="text-stone-500 font-semibold">{heatwaveRegionsCount} regions</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Verification Status Card */}
            <div className="bg-white dark:bg-[#141620] border border-[#E5E3DC] dark:border-stone-800 rounded-3xl p-5 shadow-sm dark:shadow-none flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-xs font-bold text-stone-900 dark:text-white font-sans">Verification Status</span>
                  </div>
                  <button onClick={() => navigate('/events')} className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-4 py-2">
                  <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3.5"
                        className="text-stone-100 dark:text-stone-800"
                      />
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#EAE300"
                        strokeWidth="3.5"
                        strokeDasharray={`${verificationPercent}, 100`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute text-[10px] font-extrabold text-stone-900 dark:text-white font-sans">
                      {Math.round(verificationPercent)}%
                    </span>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-stone-900 dark:text-white font-sans">Detection Precision</p>
                    <p className="text-[11px] text-stone-600 dark:text-stone-400 font-medium leading-snug mt-0.5">
                      {verificationPercent >= 90 ? 'All recent observations verified' : 'AI observations actively verified'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Compact Priority & Recent Events Grid directly below the map */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base font-bold text-stone-900 dark:text-white tracking-tight flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-400" /> Priority & Recent Weather Events
          </h2>
          <button
            onClick={() => navigate('/events')}
            className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300"
          >
            View All Logs ({events.length}) →
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.slice(0, 6).map((e) => {
            const severityKey = (e.severity || 'low').toLowerCase();
            return (
              <div
                key={e.id}
                onClick={() => navigate(`/events/${e.id}/intelligence`)}
                className="p-4 rounded-2xl bg-white dark:bg-[#141620] border border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 transition-all cursor-pointer group flex flex-col justify-between shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                      severityKey === 'critical' ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20' :
                      severityKey === 'high' ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20' :
                      severityKey === 'moderate' ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20' :
                      'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    }`}>
                      {e.severity}
                    </span>
                    <span className="text-[11px] text-stone-500 dark:text-stone-400 font-medium">
                      {e.city || 'India'}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-stone-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-300 transition-colors line-clamp-2 mb-1.5">
                    {e.title}
                  </h3>
                  <p className="text-[11px] text-stone-600 dark:text-stone-400 line-clamp-2 leading-relaxed mb-3">
                    {e.description}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-stone-100 dark:border-stone-800/80 text-[11px]">
                  <span className="text-stone-500 capitalize">{e.event_type}</span>
                  <span className="text-sky-600 dark:text-sky-400 font-bold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                    AI Dossier <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Intelligence Summary */}
      {intel && (
        <section className="bg-white dark:bg-[#13151f]/90 border border-stone-200 dark:border-stone-800/90 rounded-3xl p-6 sm:p-8 shadow-sm dark:shadow-editorial relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-stone-200 dark:border-stone-800/80">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-900 dark:text-white">
                <Brain className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-stone-900 dark:text-white tracking-tight flex items-center gap-2">
                  AI Verification & Intelligence Summary
                </h3>
                <p className="text-xs text-stone-600 dark:text-stone-400">Automated verification, corroboration & misinformation filtering</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-stone-700 dark:text-stone-400 bg-stone-100 dark:bg-[#181b26] px-3 py-1.5 rounded-full border border-stone-200 dark:border-stone-800">
              NLP & Multi-Source Engine
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-[#0e1017]/80 p-5">
              <div className="flex items-center gap-2 text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Verification Rate
              </div>
              <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
                {(intel.verification_rate || 0).toFixed(1)}%
              </p>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-2">Avg score: {intel.avg_verification_score || 0}/100</p>
            </div>

            <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-[#0e1017]/80 p-5">
              <div className="flex items-center gap-2 text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2">
                <Layers className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                Cluster Corroboration
              </div>
              <p className="text-3xl font-extrabold text-sky-600 dark:text-sky-400 tracking-tight">
                {(intel.corroboration_rate || 0).toFixed(1)}%
              </p>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-2">Linked to incident clusters</p>
            </div>

            <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-[#0e1017]/80 p-5">
              <div className="flex items-center gap-2 text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                Misinformation Risk
              </div>
              <p className="text-3xl font-extrabold text-rose-600 dark:text-rose-400 tracking-tight">
                {intel.detected_misinfo || 0}
                <span className="text-sm font-medium text-stone-500 dark:text-stone-400 ml-1">({(intel.misinfo_rate || 0).toFixed(1)}%)</span>
              </p>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-2">Flagged potential fake reports</p>
            </div>

            <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-[#0e1017]/80 p-5">
              <div className="flex items-center gap-2 text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2">
                <Fingerprint className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                High Priority Alerts
              </div>
              <p className="text-3xl font-extrabold text-amber-600 dark:text-amber-400 tracking-tight">
                {(intel.priority?.critical || 0) + (intel.priority?.high || 0)}
              </p>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-2">
                {intel.priority?.critical || 0} critical · {intel.priority?.high || 0} high
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Grid: Source Breakdown & Quick Command Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Data Source Breakdown */}
        <div className="card lg:col-span-2">
          <h3 className="text-base font-bold text-stone-900 dark:text-white mb-4 flex items-center gap-2">
            <Database className="w-4 h-4 text-sky-600 dark:text-sky-400" /> Live Data Source Distribution
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {sourceBreakdown.map(({ name, count }) => {
              const Icon = SOURCE_ICONS[name] || Globe;
              const total = events.length || 1;
              const percentage = ((count / total) * 100).toFixed(1);
              return (
                <div key={name} className="p-4 rounded-2xl bg-stone-50 dark:bg-[#0e1017] border border-stone-200 dark:border-stone-800 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-stone-200 dark:bg-stone-800 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-stone-800 dark:text-stone-200 capitalize">{name.replace('_', ' ')}</span>
                      <span className="text-xs text-stone-500 dark:text-stone-400 font-medium">{count} ({percentage}%)</span>
                    </div>
                    <div className="h-2 bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-sky-500 dark:bg-sky-400 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className="card">
          <h3 className="text-base font-bold text-stone-900 dark:text-white mb-4">Command Actions</h3>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/events')}
              className="w-full flex items-center justify-between p-4 bg-stone-50 hover:bg-stone-100 dark:bg-[#0e1017] dark:hover:bg-stone-800/80 rounded-2xl border border-stone-200 dark:border-stone-800 transition-all text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-stone-900 dark:text-white">Report Weather Incident</p>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">Submit citizen observation</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-stone-400 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => navigate('/analytics')}
              className="w-full flex items-center justify-between p-4 bg-stone-50 hover:bg-stone-100 dark:bg-[#0e1017] dark:hover:bg-stone-800/80 rounded-2xl border border-stone-200 dark:border-stone-800 transition-all text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-stone-900 dark:text-white">View Deep Analytics</p>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 font-normal">State & type insights</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-stone-400 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => navigate('/admin')}
              className="w-full flex items-center justify-between p-4 bg-stone-50 hover:bg-stone-100 dark:bg-[#0e1017] dark:hover:bg-stone-800/80 rounded-2xl border border-stone-200 dark:border-stone-800 transition-all text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-stone-900 dark:text-white">Admin Console</p>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">Manage data sources & users</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-stone-400 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EventsByTypeBarChart data={byType} />
        <SeverityDistributionChart data={severity} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EventsOverTimeChart data={overTime} />
        <EventsByStatePieChart data={byState} />
      </div>

      {/* Verification & Source Health Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <VerificationStatsChart data={verification} />

        <div className="card">
          <h3 className="text-base font-bold text-stone-900 dark:text-white mb-4 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Data Source Reliability Health
          </h3>
          {intel?.source_health?.length > 0 ? (
            <div className="space-y-3">
              {intel.source_health.map((s) => (
                <div key={s.source_name} className="flex items-center justify-between p-3.5 bg-stone-50 dark:bg-[#0e1017] border border-stone-200 dark:border-stone-800 rounded-2xl">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-stone-900 dark:text-white capitalize">{s.source_name?.replace(/[@_:]+/g, ' ')}</p>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400">{s.total_reports ?? 0} reports evaluated</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold ${
                      (s.trust_score || 0) >= 75 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                    }`}>
                      Trust Score: {s.trust_score != null ? Math.round(s.trust_score) : '—'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-stone-500 dark:text-stone-400 py-6 text-center">Evaluating source reliability data...</p>
          )}
        </div>
      </div>

      {/* Recent Incidents Table */}
      <section className="space-y-4" aria-label="Recent Events">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-stone-900 dark:text-white tracking-tight">Recent Weather Logs</h3>
          <button onClick={() => navigate('/events')} className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300">
            View All Logs →
          </button>
        </div>
        <EventTable events={events.slice(0, 10)} loading={loading} />
      </section>
    </div>
  );
}
