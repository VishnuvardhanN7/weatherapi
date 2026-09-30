import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import clsx from 'clsx';
import { ChevronUp, ChevronDown, ExternalLink, CheckCircle, XCircle, Clock, AlertTriangle, User, Shield, AtSign, Image, Loader2, Check } from 'lucide-react';

const SEVERITY_STYLES = {
  low: 'badge-low',
  moderate: 'badge-moderate',
  high: 'badge-high',
  critical: 'badge-critical',
};

const STATUS_ICONS = {
  pending: Clock,
  verified: CheckCircle,
  rejected: XCircle,
  needs_review: AlertTriangle,
};

const STATUS_STYLES = {
  pending: 'badge-pending',
  verified: 'badge-verified',
  rejected: 'badge-rejected',
  needs_review: 'badge-moderate',
};

const COLUMNS = [
  { key: 'title', label: 'Event', sortable: true, width: 'w-[30%]' },
  { key: 'event_type', label: 'Type', sortable: true, width: 'w-[12%]' },
  { key: 'severity', label: 'Severity', sortable: true, width: 'w-[10%]' },
  { key: 'city', label: 'City', sortable: true, width: 'w-[12%]' },
  { key: 'state', label: 'State', sortable: true, width: 'w-[12%]' },
  { key: 'source', label: 'Source', sortable: true, width: 'w-[10%]' },
  { key: 'verification_status', label: 'Status', sortable: true, width: 'w-[12%]' },
  { key: 'reported_at', label: 'Reported', sortable: true, width: 'w-[12%]' },
];

function MediaEvidence({ event }) {
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const media = (event.media || []).filter((m) => m.id != null);
    if (!media.length) {
      setLoaded(true);
      return;
    }
    let cancelled = false;
    Promise.all(
      media.map(async (m) => {
        try {
          const res = await fetch(m.url);
          if (res.ok) {
            const blob = await res.blob();
            return { ...m, objectUrl: URL.createObjectURL(blob) };
          }
          return { ...m, failed: true };
        } catch {
          return { ...m, failed: true };
        }
      })
    ).then((results) => {
      if (cancelled) return;
      setItems(results.filter(Boolean));
      setLoaded(true);
    });
    return () => {
      cancelled = true;
      items.forEach((m) => { if (m.objectUrl) URL.revokeObjectURL(m.objectUrl); });
    };
  }, [event]);

  return (
    <div className="mt-4">
      <h4 className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest mb-2">Media Evidence</h4>
      {!loaded ? (
        <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Loading evidence media...
        </div>
      ) : items.length === 0 ? (
        <p className="text-xs text-stone-500 font-medium">No media attached.</p>
      ) : (
        <div className="flex flex-wrap gap-3">
          {items.map((m) =>
            m.failed ? (
              <div
                key={m.id}
                className="h-24 w-36 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-[#0e1017] flex flex-col items-center justify-center text-center p-2"
              >
                <Image className="h-5 w-5 text-stone-400 dark:text-stone-500 mb-1" />
                <span className="text-[10px] text-stone-500">Evidence unavailable</span>
              </div>
            ) : m.kind === 'video' ? (
              <video key={m.id} src={m.objectUrl} controls className="h-24 w-36 object-cover rounded-2xl border border-stone-200 dark:border-stone-800" />
            ) : (
              <img
                key={m.id}
                src={m.objectUrl}
                alt="Weather evidence"
                className="h-24 w-36 object-cover rounded-2xl border border-stone-200 dark:border-stone-800"
              />
            )
          )}
        </div>
      )}
    </div>
  );
}

function SourceBlock({ event }) {
  const details = event.source_details || {};
  const name = details.author_name || details.display;
  const handle = details.handle;
  return (
    <div>
      <h4 className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest mb-2">Source</h4>
      <dl className="text-xs space-y-1.5 text-stone-700 dark:text-stone-300">
        <div className="flex gap-2">
          <dt className="text-stone-500 font-medium">Platform:</dt>
          <dd className="font-semibold text-stone-900 dark:text-white">{details.platform || details.display || event.source}</dd>
        </div>
        {name && (
          <div className="flex gap-2 items-center">
            <AtSign className="w-3.5 h-3.5 text-stone-400 dark:text-stone-500 flex-shrink-0" />
            <dd className="capitalize font-semibold">{name}</dd>
          </div>
        )}
        {handle && (
          <div className="flex gap-2 items-center">
            <User className="w-3.5 h-3.5 text-stone-400 dark:text-stone-500 flex-shrink-0" />
            <dd>@{handle}</dd>
          </div>
        )}
        {details.followers != null && (
          <div className="flex gap-2">
            <dt className="text-stone-500">Followers:</dt>
            <dd>{details.followers.toLocaleString()}</dd>
          </div>
        )}
        {event.reported_by_id && (
          <div className="flex gap-2">
            <dt className="text-stone-500">Reporter:</dt>
            <dd>{event.reported_by_name || `user #${event.reported_by_id}`}</dd>
          </div>
        )}
        {event.verified_by_name && (
          <div className="flex gap-2 items-center">
            <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <dt className="text-stone-500">Verified by:</dt>
            <dd className="text-emerald-600 dark:text-emerald-400 font-semibold">{event.verified_by_name}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}

export default function EventTable({ events = [], onVerify, onDelete, onViewIntelligence, onClassify, loading, selectable, selectedIds, onToggleSelect, onSelectAll }) {
  const [sortKey, setSortKey] = useState('reported_at');
  const [sortDir, setSortDir] = useState('desc');
  const [expandedRow, setExpandedRow] = useState(null);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sorted = [...events].sort((a, b) => {
    let aVal = a[sortKey];
    let bVal = b[sortKey];
    if (aVal == null) aVal = '';
    if (bVal == null) bVal = '';
    if (typeof aVal === 'string') aVal = aVal.toLowerCase();
    if (typeof bVal === 'string') bVal = bVal.toLowerCase();
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const renderSortIcon = (key) => {
    if (sortKey !== key) return null;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3.5 h-3.5 inline ml-1 text-sky-600 dark:text-sky-400" />
      : <ChevronDown className="w-3.5 h-3.5 inline ml-1 text-sky-600 dark:text-sky-400" />;
  };

  if (loading) {
    return (
      <div className="card">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-stone-200 dark:bg-stone-800/50 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden p-0 border border-stone-200 dark:border-stone-800/90 shadow-sm dark:shadow-editorial">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-[#0e1017]">
              {selectable && (
                <th className="px-4 py-3.5 w-10">
                  <button
                    onClick={onSelectAll}
                    className={clsx(
                      'w-5 h-5 rounded-md border flex items-center justify-center transition-colors',
                      selectedIds?.size === events.length && events.length > 0
                        ? 'bg-sky-500 border-sky-500'
                        : 'border-stone-300 dark:border-stone-700 hover:border-stone-400 dark:hover:border-stone-500'
                    )}
                    aria-label="Select all events"
                  >
                    {selectedIds?.size === events.length && events.length > 0 && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </button>
                </th>
              )}
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable && handleSort(col.key)}
                  className={clsx(
                    'px-4 py-3.5 text-left text-[11px] font-bold text-stone-600 dark:text-stone-400 uppercase tracking-widest',
                    col.sortable && 'cursor-pointer hover:text-stone-900 dark:hover:text-white select-none',
                    col.width
                  )}
                >
                  {col.label}
                  {renderSortIcon(col.key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200 dark:divide-stone-800/60 bg-white dark:bg-[#13151f]/60">
            {sorted.map((event) => {
              const StatusIcon = STATUS_ICONS[event.verification_status] || Clock;
              return (
                <React.Fragment key={event.id}>
                  <tr
                    className={clsx(
                      'transition-colors',
                      selectedIds?.has(event.id) ? 'bg-sky-50 dark:bg-sky-500/10' : 'hover:bg-stone-50 dark:hover:bg-stone-800/40',
                      'cursor-pointer'
                    )}
                  >
                    {selectable && (
                      <td className="px-4 py-3.5 w-10" onClick={(e) => { e.stopPropagation(); onToggleSelect?.(event.id); }}>
                        <button
                          className={clsx(
                            'w-5 h-5 rounded-md border flex items-center justify-center transition-colors',
                            selectedIds?.has(event.id)
                              ? 'bg-sky-500 border-sky-500'
                              : 'border-stone-300 dark:border-stone-700 hover:border-stone-400 dark:hover:border-stone-500'
                          )}
                          aria-label={`Select event: ${event.title}`}
                        >
                          {selectedIds?.has(event.id) && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </button>
                      </td>
                    )}
                    <td className="px-4 py-3.5 max-w-xs" onClick={() => setExpandedRow(expandedRow === event.id ? null : event.id)}>
                      <p className="font-bold text-stone-900 dark:text-white truncate group-hover:text-sky-600 dark:group-hover:text-sky-300">{event.title}</p>
                      <p className="text-xs text-stone-500 dark:text-stone-400 truncate mt-0.5">{event.description?.slice(0, 80)}...</p>
                    </td>
                    <td className="px-4 py-3.5" onClick={() => setExpandedRow(expandedRow === event.id ? null : event.id)}>
                      <span className="capitalize text-stone-700 dark:text-stone-300 font-medium">{event.event_type?.replace('_', ' ')}</span>
                    </td>
                    <td className="px-4 py-3.5" onClick={() => setExpandedRow(expandedRow === event.id ? null : event.id)}>
                      <span className={clsx('badge', SEVERITY_STYLES[event.severity])}>
                        {event.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-stone-700 dark:text-stone-300" onClick={() => setExpandedRow(expandedRow === event.id ? null : event.id)}>{event.city || '-'}</td>
                    <td className="px-4 py-3.5 text-stone-700 dark:text-stone-300" onClick={() => setExpandedRow(expandedRow === event.id ? null : event.id)}>{event.state || '-'}</td>
                    <td className="px-4 py-3.5" onClick={() => setExpandedRow(expandedRow === event.id ? null : event.id)}>
                      <span className="capitalize text-stone-500 dark:text-stone-400 font-medium">{event.source?.replace('_', ' ')}</span>
                    </td>
                    <td className="px-4 py-3.5" onClick={() => setExpandedRow(expandedRow === event.id ? null : event.id)}>
                      <span className={clsx('badge inline-flex items-center gap-1.5', STATUS_STYLES[event.verification_status])}>
                        <StatusIcon className="w-3 h-3" />
                        {event.verification_status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-stone-500 dark:text-stone-400 text-xs whitespace-nowrap font-medium" onClick={() => setExpandedRow(expandedRow === event.id ? null : event.id)}>
                      {dayjs(event.reported_at).format('DD MMM, HH:mm')}
                    </td>
                  </tr>

                  {expandedRow === event.id && (
                    <tr className="bg-stone-50 dark:bg-[#0e1017]/90 border-l-4 border-sky-500 dark:border-sky-400">
                      <td colSpan={selectable ? 9 : 8} className="px-6 py-5">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div>
                            <h4 className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest mb-2">Description</h4>
                            <p className="text-xs text-stone-800 dark:text-stone-200 leading-relaxed">{event.description}</p>
                          </div>
                          <div>
                            <h4 className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest mb-2">Geospatial Details</h4>
                            <dl className="text-xs space-y-1.5 text-stone-700 dark:text-stone-300">
                              <div className="flex gap-2">
                                <dt className="text-stone-500 font-medium">Coordinates:</dt>
                                <dd className="font-semibold text-stone-900 dark:text-white">
                                  {event.latitude != null && event.longitude != null
                                    ? `${event.latitude.toFixed(4)}, ${event.longitude.toFixed(4)}`
                                    : 'Not available'}
                                </dd>
                              </div>
                              <div className="flex gap-2">
                                <dt className="text-stone-500 font-medium">Misinfo Score:</dt>
                                <dd className="font-semibold text-rose-600 dark:text-rose-400">{(event.fake_confidence * 100).toFixed(1)}%</dd>
                              </div>
                              <div className="flex gap-2">
                                <dt className="text-stone-500 font-medium">Classification Conf:</dt>
                                <dd className="font-semibold text-sky-600 dark:text-sky-400">{(event.category_confidence * 100).toFixed(1)}%</dd>
                              </div>
                            </dl>
                          </div>
                          <SourceBlock event={event} />
                        </div>

                        <MediaEvidence event={event} />

                        <div className="flex gap-3 flex-wrap mt-5 pt-4 border-t border-stone-200 dark:border-stone-800">
                          {event.source_url && (
                            <a
                              href={event.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-secondary text-xs inline-flex items-center gap-1.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="w-3.5 h-3.5" /> Source Post
                            </a>
                          )}
                          {onVerify && event.verification_status === 'pending' && (
                            <>
                              <button
                                onClick={(e) => { e.stopPropagation(); onVerify(event.id, 'verified'); }}
                                className="btn-primary text-xs inline-flex items-center gap-1.5"
                              >
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-600" /> Verify
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); onVerify(event.id, 'rejected'); }}
                                className="btn-danger text-xs inline-flex items-center gap-1.5"
                              >
                                <XCircle className="w-3.5 h-3.5" /> Reject
                              </button>
                            </>
                          )}
                          {onViewIntelligence && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onViewIntelligence(event.id); }}
                              className="btn-secondary text-xs inline-flex items-center gap-1.5"
                              aria-label={`View AI intelligence for: ${event.title}`}
                            >
                              <Shield className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" /> AI Intelligence Dossier
                            </button>
                          )}
                          {onDelete && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onDelete(event.id); }}
                              className="btn-danger text-xs inline-flex items-center gap-1.5"
                              aria-label={`Delete weather event: ${event.title}`}
                            >
                              <XCircle className="w-3.5 h-3.5" /> Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      {sorted.length === 0 && (
        <div className="text-center py-12 text-stone-500 font-medium">No weather events matched current filters</div>
      )}
    </div>
  );
}
