import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer,
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { useTheme } from '../context/ThemeContext.jsx';

// Restrained neutral & weather palette (blue/cyan for weather data)
const WEATHER_COLORS = ['#38bdf8', '#0284c7', '#06b6d4', '#6366f1', '#a855f7', '#059669', '#d97706', '#64748b'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-[#141620] border border-stone-200 dark:border-stone-800 rounded-xl p-3 shadow-md dark:shadow-editorial">
      <p className="text-xs font-bold text-stone-900 dark:text-stone-200 mb-1">{label}</p>
      {payload.map((item, idx) => (
        <p key={idx} className="text-xs font-medium" style={{ color: item.color }}>
          {item.name}: <span className="font-bold">{item.value}</span>
        </p>
      ))}
    </div>
  );
};

export function EventsByTypeBarChart({ data = [] }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const gridColor = isDark ? '#262838' : '#e2e8f0';
  const tickColor = isDark ? '#a1a1aa' : '#64748b';

  return (
    <div className="card">
      <h3 className="text-base font-bold text-stone-900 dark:text-white mb-4">Events by Type</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="event_type" tick={{ fill: tickColor, fontSize: 11 }} />
          <YAxis tick={{ fill: tickColor, fontSize: 11 }} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" name="Events" radius={[6, 6, 0, 0]}>
            {data.map((entry, idx) => (
              <Cell key={idx} fill={WEATHER_COLORS[idx % WEATHER_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function EventsOverTimeChart({ data = [] }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const gridColor = isDark ? '#262838' : '#e2e8f0';
  const tickColor = isDark ? '#a1a1aa' : '#64748b';

  return (
    <div className="card">
      <h3 className="text-base font-bold text-stone-900 dark:text-white mb-4">Events Timeline</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis dataKey="date" tick={{ fill: tickColor, fontSize: 11 }} />
          <YAxis tick={{ fill: tickColor, fontSize: 11 }} />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#38bdf8"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#colorCount)"
            name="Events"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function EventsByStatePieChart({ data = [] }) {
  const chartData = data.slice(0, 8);
  return (
    <div className="card">
      <h3 className="text-base font-bold text-stone-900 dark:text-white mb-4">Top Affected States</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            outerRadius={100}
            innerRadius={55}
            paddingAngle={4}
            dataKey="count"
            nameKey="state"
          >
            {chartData.map((entry, idx) => (
              <Cell key={idx} fill={WEATHER_COLORS[idx % WEATHER_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value) => <span className="text-stone-700 dark:text-stone-300 text-xs font-medium">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SeverityDistributionChart({ data = [] }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const gridColor = isDark ? '#262838' : '#e2e8f0';
  const tickColor = isDark ? '#a1a1aa' : '#64748b';

  return (
    <div className="card">
      <h3 className="text-base font-bold text-stone-900 dark:text-white mb-4">Severity Breakdown</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical" margin={{ top: 10, right: 20, left: 40, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis type="number" tick={{ fill: tickColor, fontSize: 11 }} />
          <YAxis
            dataKey="severity"
            type="category"
            tick={{ fill: tickColor, fontSize: 11 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" name="Events" radius={[0, 6, 6, 0]}>
            {data.map((entry, idx) => {
              const colorMap = { low: '#10b981', moderate: '#f59e0b', high: '#f97316', critical: '#ef4444' };
              return <Cell key={idx} fill={colorMap[entry.severity] || WEATHER_COLORS[idx]} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function VerificationStatsChart({ data = [] }) {
  return (
    <div className="card">
      <h3 className="text-base font-bold text-stone-900 dark:text-white mb-4">Verification Status Distribution</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={100}
            innerRadius={60}
            paddingAngle={4}
            dataKey="count"
            nameKey="verification_status"
          >
            {data.map((entry, idx) => {
              const colorMap = {
                pending: '#0284c7',
                verified: '#10b981',
                rejected: '#ef4444',
                needs_review: '#f59e0b'
              };
              return <Cell key={idx} fill={colorMap[entry.verification_status] || WEATHER_COLORS[idx]} />;
            })}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value) => <span className="text-stone-700 dark:text-stone-300 text-xs font-medium capitalize">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SourceBreakdownChart({ data = [] }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const gridColor = isDark ? '#262838' : '#e2e8f0';
  const tickColor = isDark ? '#a1a1aa' : '#64748b';

  return (
    <div className="card">
      <h3 className="text-base font-bold text-stone-900 dark:text-white mb-4">Ingestion Data Sources</h3>
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={data}>
          <PolarGrid stroke={gridColor} />
          <PolarAngleAxis dataKey="source" tick={{ fill: tickColor, fontSize: 11 }} />
          <PolarRadiusAxis tick={{ fill: isDark ? '#71717a' : '#94a3b8', fontSize: 10 }} />
          <Radar
            name="Events"
            dataKey="count"
            stroke="#38bdf8"
            fill="#38bdf8"
            fillOpacity={0.25}
          />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
