import React, { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import dayjs from 'dayjs';
import { Navigation, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const EVENT_COLORS = {
  rainfall: '#38bdf8',       // cyan/blue
  thunderstorm: '#0284c7',   // dark blue
  flooding: '#06b6d4',       // teal
  heatwave: '#f97316',       // orange
  fog: '#94a3b8',            // slate
  dust_storm: '#d97706',     // amber
  strong_winds: '#38bdf8',   // sky blue
  cyclone: '#ef4444',        // red
  other: '#a1a1aa',          // neutral
};

const SEVERITY_STROKE_COLORS = {
  critical: '#ef4444',
  high: '#f97316',
  moderate: '#38bdf8',
  low: '#10b981',
};

const SEVERITY_SIZES = {
  low: 8,
  moderate: 11,
  high: 14,
  critical: 18,
};

const INDIA_CENTER = [20.5937, 78.9629];

function FitBounds({ events }) {
  const map = useMap();
  useEffect(() => {
    if (events && events.length > 0) {
      const validEvents = events.filter(e => e.latitude && e.longitude);
      if (validEvents.length > 0) {
        const bounds = L.latLngBounds(
          validEvents.map(e => [e.latitude, e.longitude])
        );
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 8 });
      }
    }
  }, [events, map]);
  return null;
}

function getScoreColor(score) {
  if (score == null) return '#a1a1aa';
  if (score >= 75) return '#10b981';
  if (score >= 50) return '#0284c7';
  if (score >= 25) return '#f59e0b';
  return '#ef4444';
}

export default function WeatherMap({ events = [], height = '560px', showLegend = true, onSelectEvent }) {
  const navigate = useNavigate();

  return (
    <div className="relative w-full overflow-hidden rounded-3xl border border-stone-200 dark:border-stone-800/90 shadow-sm dark:shadow-editorial bg-white dark:bg-[#0e1017]">
      <MapContainer
        center={INDIA_CENTER}
        zoom={5}
        style={{ height, width: '100%', borderRadius: '1.5rem' }}
        zoomControl={true}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitBounds events={events} />

        {events.map((event) => {
          if (!event.latitude || !event.longitude) return null;

          const severityKey = (event.severity || 'low').toLowerCase();
          const typeKey = (event.event_type || 'other').toLowerCase();

          const strokeColor = SEVERITY_STROKE_COLORS[severityKey] || '#38bdf8';
          const fillColor = EVENT_COLORS[typeKey] || '#38bdf8';
          const radius = SEVERITY_SIZES[severityKey] || 10;
          const isCritical = severityKey === 'critical';

          const intel = event.metadata_?.intelligence || event.intelligence || {};
          const verificationScore = event.verification_score ?? intel.verification?.score;

          return (
            <CircleMarker
              key={event.id}
              center={[event.latitude, event.longitude]}
              radius={radius}
              pathOptions={{
                color: strokeColor,
                fillColor: fillColor,
                fillOpacity: isCritical ? 0.95 : 0.8,
                weight: isCritical ? 4 : 2.5,
                opacity: 1,
              }}
              eventHandlers={{
                click: () => onSelectEvent?.(event),
              }}
            >
              <Popup className="editorial-popup">
                <div className="min-w-[270px] p-3 font-sans text-stone-900 dark:text-stone-100">
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-stone-200 dark:border-stone-800">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm"
                      style={{ backgroundColor: fillColor }}
                    />
                    <h3 className="font-extrabold text-sm text-stone-900 dark:text-white truncate leading-snug">
                      {event.title}
                    </h3>
                  </div>

                  <p className="text-xs text-stone-600 dark:text-stone-300 mb-3 leading-relaxed line-clamp-3">
                    {event.description}
                  </p>

                  <div className="grid grid-cols-2 gap-1.5 text-xs text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-[#0e1017] p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 mb-3">
                    <div>
                      <span className="font-bold text-stone-900 dark:text-white">Type:</span>{' '}
                      <span className="capitalize">{event.event_type}</span>
                    </div>
                    <div>
                      <span className="font-bold text-stone-900 dark:text-white">Severity:</span>{' '}
                      <span className="capitalize font-semibold">{event.severity}</span>
                    </div>
                    <div>
                      <span className="font-bold text-stone-900 dark:text-white">City:</span>{' '}
                      {event.city || 'N/A'}
                    </div>
                    <div>
                      <span className="font-bold text-stone-900 dark:text-white">Source:</span>{' '}
                      <span className="capitalize">{event.source || 'API'}</span>
                    </div>
                    <div className="col-span-2 capitalize">
                      <span className="font-bold text-stone-900 dark:text-white">Status:</span>{' '}
                      {(event.verification_status || 'pending').replace('_', ' ')}
                    </div>
                    {verificationScore != null && (
                      <div className="col-span-2 font-semibold">
                        <span className="text-stone-900 dark:text-white font-bold">AI Trust Score:</span>{' '}
                        <span style={{ color: getScoreColor(verificationScore) }}>
                          {Math.round(verificationScore)}/100
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-stone-200 dark:border-stone-800">
                    <span className="text-[10px] text-stone-500 dark:text-stone-400 font-medium">
                      {dayjs(event.reported_at).format('DD MMM YYYY, HH:mm')}
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate(`/events/${event.id}/intelligence`)}
                      className="inline-flex items-center gap-1 text-xs font-extrabold text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300 underline"
                    >
                      AI Dossier <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* Top Floating Badge */}
      <div className="absolute top-4 left-4 z-[1000] bg-white/95 dark:bg-[#0e1017]/90 backdrop-blur-xl border border-stone-200 dark:border-stone-800 rounded-full px-4 py-2 flex items-center gap-2.5 shadow-md dark:shadow-lg">
        <Navigation className="w-4 h-4 text-sky-600 dark:text-sky-400" />
        <span className="text-xs font-bold tracking-wide text-stone-900 dark:text-white uppercase">India Weather Radar</span>
        <span className="text-[11px] text-stone-700 dark:text-stone-300 font-semibold border-l border-stone-200 dark:border-stone-800 pl-2.5 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
          {events.length} Weather Observations
        </span>
        {events.length > 0 && (
          <span className="text-[11px] text-stone-500 dark:text-stone-400 border-l border-stone-200 dark:border-stone-800 pl-2.5 hidden sm:inline font-medium">
            Last Ingestion: {dayjs(Math.max(...events.map(e => new Date(e.reported_at || e.created_at || Date.now())))).format('HH:mm:ss')}
          </span>
        )}
      </div>

      {/* Bottom Floating Legend */}
      {showLegend && (
        <div className="absolute bottom-4 right-4 z-[1000] bg-white/95 dark:bg-[#0e1017]/95 backdrop-blur-xl border border-stone-200 dark:border-stone-800 rounded-2xl p-3 shadow-lg dark:shadow-2xl max-w-xs">
          <div className="text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest mb-2 flex items-center justify-between gap-2">
            <span>Severity & Event Key</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Live API Grid</span>
          </div>
          
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mb-2 pb-2 border-b border-stone-200 dark:border-stone-800">
            {Object.entries(SEVERITY_STROKE_COLORS).map(([sev, color]) => (
              <div key={sev} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-[11px] text-stone-700 dark:text-stone-300 capitalize font-medium">{sev}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {Object.entries(EVENT_COLORS).slice(0, 6).map(([type, color]) => (
              <div key={type} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-[10px] text-stone-500 dark:text-stone-400 capitalize font-medium">{type.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
