'use client';

import { useState } from 'react';

// US Federal Holidays 2025 & 2026 (observed dates when holiday falls on weekend)
const HOLIDAYS = new Set([
  // 2025
  '2025-01-01', // New Year's Day
  '2025-01-20', // MLK Day
  '2025-02-17', // Presidents' Day
  '2025-05-26', // Memorial Day
  '2025-06-19', // Juneteenth
  '2025-07-04', // Independence Day
  '2025-09-01', // Labor Day
  '2025-10-13', // Columbus Day
  '2025-11-11', // Veterans Day
  '2025-11-27', // Thanksgiving
  '2025-12-25', // Christmas
  // 2026
  '2026-01-01', // New Year's Day
  '2026-01-19', // MLK Day
  '2026-02-16', // Presidents' Day
  '2026-05-25', // Memorial Day
  '2026-06-19', // Juneteenth
  '2026-07-03', // Independence Day (observed; Jul 4 falls on Saturday)
  '2026-09-07', // Labor Day
  '2026-10-12', // Columbus Day
  '2026-11-11', // Veterans Day
  '2026-11-26', // Thanksgiving
  '2026-12-25', // Christmas
]);

type StatusKey = 'operational' | 'degraded' | 'outage';

type StatusConfig = {
  label:  string;
  banner: string;
  emoji:  string;
  pill:   string;
  text:   string;
  dot:    string;
  square: string;
  card:   string;
};

type ComponentDef = {
  name:               string;
  seed:               string;
  alwaysOperational?: boolean;
  alwaysDegraded?:    boolean;
  nonWorkDayStatus?:  StatusKey;
};

type TooltipState = {
  i:      number;
  date:   string;
  status: StatusKey;
} | null;

function djb2(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (((hash << 5) + hash) + str.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(hash);
}

function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getStatus(date: Date, seed = ''): StatusKey {
  const dow = date.getDay();
  const ds = toDateStr(date);
  if (dow === 0 || dow === 6 || HOLIDAYS.has(ds)) return 'operational';

  // Anchor to Monday of this week
  const weekAnchor = new Date(date);
  weekAnchor.setDate(date.getDate() - (dow - 1));
  const weekKey = toDateStr(weekAnchor) + seed;

  const wh = djb2(weekKey);
  const redCount = (wh % 3) + 1; // 1–3 red days per week

  // Deterministic shuffle of Mon–Fri, pick first redCount as outage days
  const days = [1, 2, 3, 4, 5];
  for (let i = days.length - 1; i > 0; i--) {
    const j = djb2(weekKey + String(i)) % (i + 1);
    [days[i], days[j]] = [days[j], days[i]];
  }
  const redDays = new Set(days.slice(0, redCount));

  return redDays.has(dow) ? 'outage' : 'degraded';
}

const COMPONENTS: ComponentDef[] = [
  { name: 'Motivation API',                   seed: 'motivation' },
  { name: 'Focus Engine',                     seed: 'focus' },
  { name: 'Caffeine Subsystem',               seed: 'caffeine' },
  { name: 'Meeting Tolerance Service',        seed: 'meetings' },
  { name: 'Email Response Queue',             seed: 'email',    nonWorkDayStatus: 'outage' },
  { name: 'Social Battery',                   seed: 'social' },
  { name: 'Task Prioritization Engine',       seed: 'tasks' },
  { name: 'Will to Open Slack',               seed: 'slack',    nonWorkDayStatus: 'outage' },
  { name: 'Meme Generation Service',          seed: 'memes',    alwaysOperational: true },
  { name: 'Sarcasm Engine',                   seed: 'sarcasm',  alwaysOperational: true },
  { name: 'Westhafer Sarcasm Load Balancing', seed: 'westhafer', alwaysDegraded: true },
];

function isNonWorkDay(date: Date): boolean {
  const dow = date.getDay();
  return dow === 0 || dow === 6 || HOLIDAYS.has(toDateStr(date));
}

function getComponentStatus(component: ComponentDef, date: Date): StatusKey {
  const { seed, alwaysOperational, alwaysDegraded, nonWorkDayStatus } = component;
  if (alwaysOperational) return 'operational';
  if (alwaysDegraded) return 'degraded';
  if (nonWorkDayStatus && isNonWorkDay(date)) return nonWorkDayStatus;
  return getStatus(date, seed);
}

const INCIDENT_TITLES: Record<number, string> = {
  1: 'Monday.exe failed to initialize',
  2: 'Motivation dependency resolved but unstable',
  3: 'Hump day anomaly — brief coherence detected',
  4: 'Focus context window exceeded',
  5: 'Graceful degradation into weekend pre-load',
};

const STATUS: Record<StatusKey, StatusConfig> = {
  operational: {
    label:  'Operational',
    banner: 'All Systems Operational — Offline Mode Active',
    emoji:  '🟢',
    pill:   'bg-green-700 text-white',
    text:   'text-green-400',
    dot:    'bg-green-500',
    square: 'bg-green-600',
    card:   'bg-green-950 border-green-800',
  },
  degraded: {
    label:  'Degraded Performance',
    banner: 'Degraded Performance — Workday Detected',
    emoji:  '🟡',
    pill:   'bg-yellow-700 text-white',
    text:   'text-yellow-400',
    dot:    'bg-yellow-500',
    square: 'bg-yellow-600',
    card:   'bg-yellow-950 border-yellow-800',
  },
  outage: {
    label:  'Major Outage',
    banner: 'Major Outage — Peak Obligation Hours',
    emoji:  '🔴',
    pill:   'bg-red-600 text-white',
    text:   'text-red-400',
    dot:    'bg-red-500',
    square: 'bg-red-600',
    card:   'bg-red-950 border-red-800',
  },
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-widest mb-3">
      {children}
    </h2>
  );
}

export default function StatusPage() {
  const [tooltip, setTooltip] = useState<TooltipState>(null);

  const today = new Date();
  const overallStatus = getStatus(today);
  const s = STATUS[overallStatus];

  // Rolling 90-day grid, oldest → newest
  const gridDays = Array.from({ length: 90 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (89 - i));
    return d;
  });

  // Last 5 workdays for incidents (working backwards from today, inclusive)
  const incidents: Date[] = [];
  const cur = new Date(today);
  while (incidents.length < 5) {
    const dow = cur.getDay();
    const ds = toDateStr(cur);
    if (dow !== 0 && dow !== 6 && !HOLIDAYS.has(ds)) {
      incidents.push(new Date(cur));
    }
    cur.setDate(cur.getDate() - 1);
  }

  const fmtLong = (d: Date) =>
    d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const fmtShort = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const operationalDays = gridDays.filter(d => getStatus(d) === 'operational').length;
  const degradedDays   = gridDays.filter(d => getStatus(d) === 'degraded').length;
  const outageDays     = gridDays.filter(d => getStatus(d) === 'outage').length;

  return (
    <main id="main-content" className="min-h-screen bg-slate-900 text-slate-100">
      <div className="max-w-2xl mx-auto px-6 py-10">

        {/* ── Header ── */}
        <header className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight font-mono text-balance">Keith v1.0</h1>
            <p className="text-slate-400 text-sm mt-1 font-mono tracking-wide">Personal Uptime Monitor</p>
          </div>
          <span className={`mt-1 px-3 py-1 rounded-full text-xs font-mono font-semibold ${s.pill}`}>
            {s.label}
          </span>
        </header>

        {/* ── Status Banner ── */}
        <div className={`rounded-lg border px-5 py-4 mb-8 ${s.card}`}>
          <div className="flex items-center gap-3">
            <span className="text-xl leading-none">{s.emoji}</span>
            <div>
              <p className={`font-mono font-semibold text-base ${s.text}`}>{s.banner}</p>
              <p className="text-slate-400 text-xs font-mono mt-1">{fmtLong(today)}</p>
            </div>
          </div>
        </div>

        {/* ── Components ── */}
        <section className="mb-8">
          <SectionLabel>Components</SectionLabel>
          <div className="bg-slate-800 rounded-lg border border-slate-700 divide-y divide-slate-700">
            {COMPONENTS.map((component) => {
              const { name } = component;
              const st = getComponentStatus(component, today);
              const c = STATUS[st];
              return (
                <div key={name} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm font-mono text-slate-200">{name}</span>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${c.dot}`} />
                    <span className={`text-xs font-mono ${c.text} hidden sm:inline`}>{c.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-5 mt-3 px-1">
            {(['operational', 'degraded', 'outage'] as StatusKey[]).map((k) => (
              <span key={k} className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
                <span className={`w-2 h-2 rounded-full inline-block flex-shrink-0 ${STATUS[k].dot}`} />
                {STATUS[k].label}
              </span>
            ))}
          </div>
        </section>

        {/* ── 90-Day Uptime Grid ── */}
        <section className="mb-8">
          <SectionLabel>90-Day Uptime History</SectionLabel>
          <div className="bg-slate-800 rounded-lg border border-slate-700 px-4 py-4">
            <div
              className="flex flex-wrap gap-[3px]"
              role="img"
              aria-label={`90-day uptime history: ${operationalDays} operational, ${degradedDays} degraded, ${outageDays} outage`}
            >
              {gridDays.map((d, i) => {
                const st = getStatus(d);
                const c = STATUS[st];
                const isToday = toDateStr(d) === toDateStr(today);
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
        </section>

        {/* ── Incident Log ── */}
        <section className="mb-10">
          <SectionLabel>Recent Incidents</SectionLabel>
          <div className="space-y-2">
            {incidents.map((d, i) => {
              const dow = d.getDay();
              const title = INCIDENT_TITLES[dow];
              const st = getStatus(d);
              const c = STATUS[st];
              const isToday = toDateStr(d) === toDateStr(today);
              return (
                <div key={i} className="bg-slate-800 rounded-lg border border-slate-700 px-4 py-3">
                  <div className="flex items-start justify-between gap-4">
                    <span className="font-mono text-sm font-semibold text-slate-100 leading-snug">{title}</span>
                    <span className={`text-xs font-mono shrink-0 mt-0.5 ${c.text}`}>{c.label}</span>
                  </div>
                  <p className="text-xs font-mono text-slate-400 mt-1">
                    {fmtShort(d)}
                    {isToday ? ' · Ongoing' : ' · Resolved'}
                    {' · Auto-generated incident report'}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

      </div>
    </main>
  );
}
