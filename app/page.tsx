import UptimeGrid from '@/app/components/UptimeGrid';
import {
  getStatus, getWorkPhase, toDateStr, fmtShort,
  STATUS, HOLIDAYS,
  type StatusKey, type WorkPhase,
} from '@/app/lib/status';

type ComponentDef = {
  name:               string;
  seed:               string;
  alwaysOperational?: boolean;
  alwaysDegraded?:    boolean;
  nonWorkDayStatus?:  StatusKey;
};

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

const INCIDENT_TITLES: Record<number, string> = {
  1: 'Monday.exe failed to initialize',
  2: 'Motivation dependency resolved but unstable',
  3: 'Hump day anomaly — brief coherence detected',
  4: 'Focus context window exceeded',
  5: 'Graceful degradation into weekend pre-load',
};

function getComponentStatus(component: ComponentDef, date: Date, phase: WorkPhase): StatusKey {
  const { seed, alwaysOperational, alwaysDegraded, nonWorkDayStatus } = component;
  if (alwaysOperational) return 'operational';
  if (alwaysDegraded) return 'degraded';
  if (phase === 'non-workday') return nonWorkDayStatus ?? 'operational';
  if (phase === 'off-hours') return 'outage';
  return getStatus(date, seed, 'working');
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-widest mb-3">
      {children}
    </h2>
  );
}

export default function StatusPage() {
  const today = new Date();
  const todayStr = toDateStr(today);
  const phase = getWorkPhase(today);
  const overallStatus = getStatus(today, '', phase);
  const s = STATUS[overallStatus];

  const fmtLong = (d: Date) =>
    d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Rolling 90-day grid, oldest → newest
  const gridDateStrings = Array.from({ length: 90 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (89 - i));
    return toDateStr(d);
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
              const st = getComponentStatus(component, today, phase);
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
          <UptimeGrid dateStrings={gridDateStrings} todayStr={todayStr} />
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
              const isToday = toDateStr(d) === todayStr;
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
