import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import clsx from 'clsx';

export default function StatsCard({ title, value, subtitle, icon: Icon, trend, trendValue, variant = 'primary' }) {
  const trendUp = trend === 'up';
  const trendDown = trend === 'down';
  const trendNeutral = trend === 'neutral';

  return (
    <div className="group bg-[#13151f]/90 border border-stone-800/80 rounded-3xl p-6 sm:p-7 shadow-editorial hover:border-stone-700/90 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
      {/* Subtle background gradient glow */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-stone-700/10 rounded-full blur-2xl group-hover:bg-stone-500/15 transition-all duration-500 pointer-events-none" />

      <div className="flex items-start justify-between relative z-10">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold tracking-wider text-stone-400 uppercase mb-2">{title}</p>
          <p className="text-[30px] sm:text-[34px] font-extrabold text-[#faf9f6] tracking-tight leading-none">
            {value}
          </p>
          {subtitle && (
            <p className="text-[11px] text-stone-400 font-medium mt-2">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className="w-11 h-11 rounded-2xl bg-[#1a1d2b] border border-stone-800 flex items-center justify-center text-stone-200 group-hover:scale-110 transition-transform duration-300 shrink-0">
            <Icon className="w-5 h-5 text-stone-300" />
          </div>
        )}
      </div>

      {trendValue !== undefined && (
        <div className="flex items-center gap-1.5 mt-5 pt-3 border-t border-stone-800/60 relative z-10">
          {trendUp && <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />}
          {trendDown && <TrendingDown className="w-3.5 h-3.5 text-red-400" />}
          {trendNeutral && <Minus className="w-3.5 h-3.5 text-stone-400" />}
          <span className={clsx(
            'text-xs font-semibold',
            trendUp && 'text-emerald-400',
            trendDown && 'text-red-400',
            trendNeutral && 'text-stone-400'
          )}>
            {trendValue}
          </span>
          <span className="text-[11px] text-stone-500 font-medium">vs last period</span>
        </div>
      )}
    </div>
  );
}
