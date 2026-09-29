import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../services/api.js';
import {
  ArrowLeft,
  ShieldCheck,
  AlertTriangle,
  Fingerprint,
  Activity,
  BarChart3,
  Clock,
  Layers,
  CheckCircle2,
  XCircle,
  Loader2,
  Info,
  ExternalLink,
  Filter,
} from 'lucide-react';

const STATUS_META = {
  VERIFIED: { color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle2 },
  PROBABLE: { color: 'text-sky-400 bg-sky-500/10 border-sky-500/20', icon: CheckCircle2 },
  NEEDS_REVIEW: { color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', icon: AlertTriangle },
  UNVERIFIED: { color: 'text-stone-400 bg-stone-800 border-stone-700', icon: AlertTriangle },
  REJECTED: { color: 'text-rose-400 bg-rose-500/10 border-rose-500/20', icon: XCircle },
};

const TYPE_LABELS = {
  rainfall: 'Rainfall',
  thunderstorm: 'Thunderstorm',
  flooding: 'Flooding',
  heatwave: 'Heatwave',
  fog: 'Fog',
  dust_storm: 'Dust Storm',
  strong_winds: 'Strong Winds',
  cyclone: 'Cyclone',
  other: 'Other',
};

const SEVERITY_LABELS = {
  LOW: 'Low',
  MODERATE: 'Moderate',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

function Badge({ status, label }) {
  const meta = STATUS_META[status] || STATUS_META.UNVERIFIED;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${meta.color}`}>
      <Icon className="h-3.5 w-3.5" />
      {label || status}
    </span>
  );
}

function ScoreRing({ score }) {
  const clamped = Math.max(0, Math.min(100, score || 0));
  const color = clamped >= 75 ? '#10b981' : clamped >= 50 ? '#38bdf8' : clamped >= 25 ? '#f59e0b' : '#ef4444';
  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (clamped / 100) * circumference;
  return (
    <div className="relative h-28 w-28">
      <svg viewBox="0 0 100 100" className="h-28 w-28 -rotate-90">
        <circle cx="50" cy="50" r="42" fill="none" stroke="#262838" strokeWidth="9" />
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke={color}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 600ms ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black text-white">{Math.round(clamped)}</span>
        <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400">/ 100</span>
      </div>
    </div>
  );
}

function Card({ title, icon: Icon, children, className = '' }) {
  return (
    <section className={`rounded-3xl border border-stone-800 bg-[#13151f]/90 p-6 shadow-editorial ${className}`}>
      <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-[#faf9f6] tracking-tight">
        {Icon && <Icon className="h-4 w-4 text-sky-400" />}
        {title}
      </h2>
      {children}
    </section>
  );
}

function BreakdownBar({ label, value, max = 25 }) {
  const v = Math.max(0, Math.min(max, value || 0));
  const pct = (v / max) * 100;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-stone-400 font-medium">{label}</span>
        <span className="font-bold text-white">{v.toFixed(1)}</span>
      </div>
      <div className="h-2 rounded-full bg-stone-800">
        <div
          className="h-2 rounded-full bg-sky-400"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function fmtTime(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function IncidentIntelligence() {
  const { eventId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get(`/api/intelligence/events/${eventId}`);
        if (!cancelled) {
          setData(res.data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError('Unable to load intelligence data for this event.');
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [eventId]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 p-6">
        <div className="flex items-center justify-center py-24 text-stone-400 font-medium">
          <Loader2 className="mr-3 h-5 w-5 animate-spin text-sky-400" />
          Loading intelligence dossier...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 p-6">
        <Link to="/events" className="inline-flex items-center gap-2 text-xs font-bold text-stone-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to incidents
        </Link>
        <div className="rounded-3xl border border-stone-800 bg-[#13151f] p-6 text-center text-xs font-semibold text-rose-400">
          {error || 'No intelligence dossier available.'}
        </div>
      </div>
    );
  }

  const event = data.event;
  const intel = data.intelligence || {};
  const classification = intel.classification || {};
  const verification = intel.verification || {};
  const severityData = intel.severity || {};
  const sourceTrust = intel.source_trust || {};
  const corroboration = intel.corroboration || {};
  const contradiction = intel.contradiction || {};
  const dataQuality = intel.data_quality || {};
  const priority = intel.priority || {};
  const lifecycle = intel.lifecycle || {};
  const explanation = intel.explanation || {};
  const timeline = intel.timeline || [];
  const candidates = classification.candidates || [];
  const breakdown = verification.breakdown || {};
  const relatedReports = corroboration.related_reports || [];
  const sourceDetails = event.source_details || {};

  const verificationStatus = event.verification_status || 'unverified';
  const verifyStatusUpper = String(verificationStatus).toUpperCase().replace('_', ' ');

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      
      {/* Navigation & Header Badges */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/events" className="inline-flex items-center gap-2 text-xs font-bold text-stone-400 hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4 text-sky-400" /> Back to Incidents
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Badge status={verificationStatus} label={verifyStatusUpper} />
          <span className="rounded-full border border-stone-800 bg-[#141620] px-3 py-1 text-xs font-bold text-stone-300">
            {TYPE_LABELS[event.event_type] || event.event_type}
          </span>
        </div>
      </div>

      <header className="rounded-3xl border border-stone-800 bg-[#13151f] p-6 sm:p-8 shadow-editorial">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#faf9f6] tracking-tight">{event.title}</h1>
        <p className="mt-2 text-xs text-stone-300 leading-relaxed max-w-3xl">{event.description}</p>
        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-stone-400 pt-4 border-t border-stone-800">
          <span>📍 {event.city || 'Unknown city'}{event.state ? `, ${event.state}` : ''}</span>
          <span>🕒 Reported {fmtTime(event.reported_at)}</span>
          {event.latitude != null && (
            <span>🧭 {event.latitude.toFixed(4)}, {event.longitude.toFixed(4)}</span>
          )}
        </div>
      </header>

      {/* AI Decision / WHY TRUST THIS EVENT */}
      <Card title="AI Decision — Intelligence Justification" icon={ShieldCheck} className="border-sky-500/20">
        <div className="grid gap-6 md:grid-cols-[auto_1fr]">
          <div className="flex flex-col items-center gap-2">
            <ScoreRing score={verification.score} />
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
              Verification Index
            </span>
            <span className="text-[10px] text-stone-500">Model v{verification.version || '1.0'}</span>
          </div>
          <div className="space-y-3">
            {verification.reasoning && (
              <p className="rounded-2xl border border-stone-800 bg-[#0e1017] p-4 text-xs font-medium text-stone-200 leading-relaxed">
                {verification.reasoning}
              </p>
            )}
            {explanation.verification_reason && (
              <p className="text-xs text-stone-300 font-medium">{explanation.verification_reason}</p>
            )}
            {verification.evidence?.length > 0 && (
              <ul className="space-y-1.5 pt-2">
                {verification.evidence.map((e, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-stone-300">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                    {e}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Verification Component Scores" icon={BarChart3}>
          {Object.keys(breakdown).length > 0 ? (
            <div className="space-y-3">
              <BreakdownBar label="Source Reliability" value={breakdown.source_reliability} />
              <BreakdownBar label="Cross-Source Corroboration" value={breakdown.cross_source_corroboration} />
              <BreakdownBar label="Geographic Consistency" value={breakdown.geographic_consistency} max={20} />
              <BreakdownBar label="Temporal Consistency" value={breakdown.temporal_consistency} max={10} />
              <BreakdownBar label="Official Agency Confirmation" value={breakdown.official_evidence} max={10} />
              <BreakdownBar label="Visual Media Evidence" value={breakdown.media_evidence} max={5} />
            </div>
          ) : (
            <p className="text-xs text-stone-500">Insufficient component data</p>
          )}
        </Card>

        <Card title="NLP Classification Signals" icon={Fingerprint}>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-2xl font-extrabold text-white">
              {TYPE_LABELS[classification.category] || classification.category || '—'}
            </span>
            <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs font-bold text-sky-400">
              {((classification.confidence || 0) * 100).toFixed(0)}% confidence
            </span>
          </div>
          {explanation.classification_reason && (
            <p className="mt-3 text-xs text-stone-300">{explanation.classification_reason}</p>
          )}
          {classification.matched_patterns?.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-[10px] uppercase font-bold tracking-widest text-stone-400">Matched Signals</p>
              <div className="flex flex-wrap gap-2">
                {(classification.matched_patterns || []).slice(0, 8).map((p, i) => (
                  <span key={i} className="rounded-xl bg-[#0e1017] border border-stone-800 px-3 py-1 text-xs text-stone-300 font-medium">{p}</span>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card title="Severity Assessment" icon={Activity}>
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-400 flex items-center justify-center text-lg font-black">
              {SEVERITY_LABELS[severityData.severity]?.[0] || '—'}
            </div>
            <div>
              <p className="text-xl font-bold text-white">
                {SEVERITY_LABELS[severityData.severity] || severityData.severity || '—'}
              </p>
              <p className="text-xs text-stone-400">
                Confidence: {((severityData.confidence || 0) * 100).toFixed(0)}%
              </p>
            </div>
          </div>
          {explanation.severity_reason && (
            <p className="mt-3 text-xs text-stone-300">{explanation.severity_reason}</p>
          )}
        </Card>

        <Card title="Source Credibility" icon={ShieldCheck}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-base font-bold text-white">{sourceTrust.source_name || '—'}</p>
              <p className="text-xs text-stone-400 capitalize">{sourceTrust.source_type || '—'} source</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-sky-400">
                {sourceTrust.trust_score != null ? Math.round(sourceTrust.trust_score) : '—'}
              </p>
              <p className="text-[10px] uppercase font-bold tracking-widest text-stone-500">Trust / 100</p>
            </div>
          </div>
          {event.source_url && (
            <a
              href={event.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-sky-400 hover:text-sky-300"
            >
              View original post <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </Card>

        <Card title="Corroboration Cluster" icon={Layers}>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-[#0e1017] border border-stone-800 p-3 text-center">
              <p className="text-2xl font-extrabold text-white">{corroboration.related_report_count ?? 0}</p>
              <p className="text-xs text-stone-400">Related reports</p>
            </div>
            <div className="rounded-2xl bg-[#0e1017] border border-stone-800 p-3 text-center">
              <p className="text-2xl font-extrabold text-sky-400">
                {corroboration.source_count ?? 0}
              </p>
              <p className="text-xs text-stone-400">Unique sources</p>
            </div>
          </div>
        </Card>
      </div>

      {timeline.length > 0 && (
        <Card title="Ingestion & AI Pipeline Timeline" icon={Clock}>
          <ol className="relative ml-4 space-y-4 border-l-2 border-stone-800 pl-6">
            {timeline.map((step, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[31px] top-1 h-3 w-3 rounded-full border-2 border-stone-800 bg-sky-400" />
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-xs font-bold text-white">{step.label}</p>
                  <span className="text-[11px] text-stone-500 font-medium">{fmtTime(step.time)}</span>
                </div>
                {step.detail && <p className="text-xs text-stone-400 mt-0.5">{step.detail}</p>}
              </li>
            ))}
          </ol>
        </Card>
      )}
    </div>
  );
}