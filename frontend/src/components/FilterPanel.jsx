import React from 'react';
import { Filter, X, Calendar, MapPin, AlertTriangle, Tag, Database, Search } from 'lucide-react';
import clsx from 'clsx';

const EVENT_TYPES = [
  { value: '', label: 'All Event Types' },
  { value: 'rainfall', label: 'Rainfall' },
  { value: 'thunderstorm', label: 'Thunderstorm' },
  { value: 'flooding', label: 'Flooding' },
  { value: 'heatwave', label: 'Heatwave' },
  { value: 'fog', label: 'Fog' },
  { value: 'dust_storm', label: 'Dust Storm' },
  { value: 'strong_winds', label: 'Strong Winds' },
  { value: 'cyclone', label: 'Cyclone' },
  { value: 'other', label: 'Other' },
];

const SEVERITY_LEVELS = [
  { value: '', label: 'All Severities' },
  { value: 'low', label: 'Low' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

const VERIFICATION_STATUSES = [
  { value: '', label: 'All Verification Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'verified', label: 'Verified' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'needs_review', label: 'Needs Review' },
];

const INDIAN_STATES = [
  '', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar',
  'Chhattisgarh', 'Delhi', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
  'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan',
  'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Chandigarh', 'Jammu and Kashmir', 'Ladakh',
];

const SOURCES = [
  { value: '', label: 'All Ingestion Sources' },
  { value: 'twitter', label: 'Twitter / X' },
  { value: 'web', label: 'Web Scraping' },
  { value: 'api', label: 'Public API' },
  { value: 'citizen_report', label: 'Citizen Report' },
  { value: 'other', label: 'Other' },
];

export default function FilterPanel({ filters, onFilterChange, onReset }) {
  const handleChange = (key, value) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const activeFilters = Object.entries(filters).filter(
    ([key, val]) => val !== '' && val !== null && val !== undefined
  );

  return (
    <div className="bg-[#13151f]/90 border border-stone-800/80 rounded-3xl p-6 sm:p-7 shadow-editorial">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-stone-800/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-stone-800 flex items-center justify-center text-sky-400">
            <Filter className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-white tracking-tight">Filter Incidents</h3>
          {activeFilters.length > 0 && (
            <span className="px-2.5 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[10px] font-bold uppercase">
              {activeFilters.length} Active Filters
            </span>
          )}
        </div>

        {activeFilters.length > 0 && (
          <button
            onClick={onReset}
            className="text-xs font-semibold text-stone-400 hover:text-red-400 flex items-center gap-1 transition-colors"
          >
            <X className="w-3.5 h-3.5" /> Reset Filters
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div>
          <label className="text-[11px] font-bold text-stone-400 mb-1 flex items-center gap-1 uppercase tracking-wider">
            <Tag className="w-3 h-3 text-stone-500" /> Event Type
          </label>
          <select
            value={filters.event_type || ''}
            onChange={(e) => handleChange('event_type', e.target.value)}
            className="w-full bg-[#0e1017] border border-stone-800 rounded-xl text-white text-xs px-3 py-2 font-medium focus:border-sky-500 focus:outline-none"
          >
            {EVENT_TYPES.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px] font-bold text-stone-400 mb-1 flex items-center gap-1 uppercase tracking-wider">
            <AlertTriangle className="w-3 h-3 text-stone-500" /> Severity
          </label>
          <select
            value={filters.severity || ''}
            onChange={(e) => handleChange('severity', e.target.value)}
            className="w-full bg-[#0e1017] border border-stone-800 rounded-xl text-white text-xs px-3 py-2 font-medium focus:border-sky-500 focus:outline-none"
          >
            {SEVERITY_LEVELS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px] font-bold text-stone-400 mb-1 flex items-center gap-1 uppercase tracking-wider">
            <MapPin className="w-3 h-3 text-stone-500" /> State
          </label>
          <select
            value={filters.state || ''}
            onChange={(e) => handleChange('state', e.target.value)}
            className="w-full bg-[#0e1017] border border-stone-800 rounded-xl text-white text-xs px-3 py-2 font-medium focus:border-sky-500 focus:outline-none"
          >
            <option value="">All States</option>
            {INDIAN_STATES.filter(Boolean).map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px] font-bold text-stone-400 mb-1 flex items-center gap-1 uppercase tracking-wider">
            <Database className="w-3 h-3 text-stone-500" /> Source
          </label>
          <select
            value={filters.source || ''}
            onChange={(e) => handleChange('source', e.target.value)}
            className="w-full bg-[#0e1017] border border-stone-800 rounded-xl text-white text-xs px-3 py-2 font-medium focus:border-sky-500 focus:outline-none"
          >
            {SOURCES.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px] font-bold text-stone-400 mb-1 flex items-center gap-1 uppercase tracking-wider">
            <Calendar className="w-3 h-3 text-stone-500" /> Start Date
          </label>
          <input
            type="date"
            value={filters.start_date || ''}
            onChange={(e) => handleChange('start_date', e.target.value)}
            className="w-full bg-[#0e1017] border border-stone-800 rounded-xl text-white text-xs px-3 py-2 font-medium focus:border-sky-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-[11px] font-bold text-stone-400 mb-1 flex items-center gap-1 uppercase tracking-wider">
            <Calendar className="w-3 h-3 text-stone-500" /> End Date
          </label>
          <input
            type="date"
            value={filters.end_date || ''}
            onChange={(e) => handleChange('end_date', e.target.value)}
            className="w-full bg-[#0e1017] border border-stone-800 rounded-xl text-white text-xs px-3 py-2 font-medium focus:border-sky-500 focus:outline-none"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="text-[11px] font-bold text-stone-400 mb-1 flex items-center gap-1 uppercase tracking-wider">
            <Search className="w-3 h-3 text-stone-500" /> Search Keyword
          </label>
          <input
            type="text"
            value={filters.search || ''}
            onChange={(e) => handleChange('search', e.target.value)}
            placeholder="Search titles, descriptions, cities..."
            className="w-full bg-[#0e1017] border border-stone-800 rounded-xl text-white text-xs px-3 py-2 font-medium focus:border-sky-500 focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
