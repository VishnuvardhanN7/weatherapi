import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import clsx from 'clsx';

export default function StatsCard({ title, value, subtitle, icon: Icon, trend, trendValue }) {
  const trendUp = trend === 'up';
  const trendDown = trend === 'down';
  const trendNeutral = trend === 'neutral';

  return (
    <div className="bg-white dark:bg-[#141620] border border-stone-200/80 dark:border-stone-800/70 rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-200 shadow-none hover:border-stone-300 dark:hover:border-stone-700">
      <div className="flex items-start justify-between gap-3 mb-4">
        <span className="text-[11px] font-bold tracking-wider text-stone-600 dark:text-stone-400 uppercase">
          {title}
        </span>
        {Icon && (
          <div className="w-9 h-9 rounded-full bg-stone-100/80 dark:bg-stone-800/50 border border-stone-200/60 dark:border-stone-700/50 flex items-center justify-center text-stone-600 dark:text-stone-300 shrink-0">
            <Icon className="w-4 h-4 stroke-[1.75]" />
          </div>
        )}
      </div>

      <div>
        <div className="text-3xl sm:text-4xl font-extrabold text-stone-900 dark:text-[#faf9f6] tracking-tight leading-none">
          {value}
        </div>
        {subtitle && (
          <p className="text-[11px] text-stone-600 dark:text-stone-400 font-medium mt-2">
            {subtitle}
          </p>
        )}
      </div>

      {trendValue !== undefined && (
        <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-stone-100 dark:border-stone-800/60 text-xs">
          {trendUp && <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
          {trendDown && <TrendingDown className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />}
          {trendNeutral && <Minus className="w-3.5 h-3.5 text-stone-400" />}
          <span className={clsx(
            'font-semibold',
            trendUp && 'text-emerald-600 dark:text-emerald-400',
            trendDown && 'text-red-600 dark:text-red-400',
            trendNeutral && 'text-stone-500 dark:text-stone-400'
          )}>
            {trendValue}
          </span>
          <span className="text-[11px] text-stone-400 font-normal">vs last period</span>
        </div>
      )}
    </div>
  );
}

