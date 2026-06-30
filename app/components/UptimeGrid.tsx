'use client';

import { useState, useMemo } from 'react';
import { getStatus, fmtShort, STATUS, type StatusKey } from '@/app/lib/status';

type TooltipState = {
  i:      number;
  date:   string;
  status: StatusKey;
} | null;

type Props = {
  dateStrings: string[];
  todayStr:    string;
};

export default function UptimeGrid({ dateStrings, todayStr }: Props) {
  const [tooltip, setTooltip] = useState<TooltipState>(null);

  const dates = useMemo(
    () => dateStrings.map(s => new Date(s + 'T12:00:00')),
    [dateStrings]
  );
  const statuses = useMemo(() => dates.map(d => getStatus(d)), [dates]);

  const operationalDays = statuses.filter(s => s === 'operational').length;
  const degradedDays    = statuses.filter(s => s === 'degraded').length;
  const outageDays      = statuses.filter(s => s === 'outage').length;

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 px-4 py-4">
      <div
        className="flex flex-wrap gap-[3px]"
        role="img"
        aria-label={`90-day uptime history: ${operationalDays} operational, ${degradedDays} degraded, ${outageDays} outage`}
      >
        {dates.map((d, i) => {
          const st = statuses[i];
          const c = STATUS[st];
          const ds = dateStrings[i];
          const isToday = ds === todayStr;
          return (
            <div
              key={i}
              className="relative"
              aria-hidden="true"
              onMouseEnter={() => setTooltip({ i, date: fmtShort(d), status: st })}
              onMouseLeave={() => setTooltip(null)}
            >
              {tooltip?.i === i && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none">
                  <div className="bg-slate-700 border border-slate-600 text-slate-100 text-xs font-mono rounded px-2 py-1 whitespace-nowrap shadow-xl">
                    <span className="text-slate-300">{tooltip.date}</span>
                    <span className="text-slate-400 mx-1">—</span>
                    <span className={STATUS[tooltip.status].text}>{STATUS[tooltip.status].label}</span>
                  </div>
                  <div className="flex justify-center">
                    <div className="w-2 h-2 bg-slate-700 border-b border-r border-slate-600 rotate-45 -mt-1" />
                  </div>
                </div>
              )}
              <div
                className={`w-3 h-3 rounded-sm cursor-default ${c.square}${isToday ? ' ring-2 ring-white/50 ring-offset-1 ring-offset-slate-800' : ''}`}
              />
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-5 mt-3 pt-3 border-t border-slate-700">
        {(['operational', 'degraded', 'outage'] as StatusKey[]).map((k) => (
          <span key={k} className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
            <span className={`w-2.5 h-2.5 rounded-sm inline-block ${STATUS[k].square}`} />
            {STATUS[k].label}
          </span>
        ))}
      </div>
    </div>
  );
}
