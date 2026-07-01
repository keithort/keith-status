// US Federal Holidays 2026–2027 (observed dates when holiday falls on weekend)
export const HOLIDAYS = new Set([
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
  // 2027
  '2027-01-01', // New Year's Day
  '2027-01-18', // MLK Day
  '2027-02-15', // Presidents' Day
  '2027-05-31', // Memorial Day
  '2027-06-18', // Juneteenth (observed; Jun 19 falls on Saturday)
  '2027-07-05', // Independence Day (observed; Jul 4 falls on Sunday)
  '2027-09-06', // Labor Day
  '2027-10-11', // Columbus Day
  '2027-11-11', // Veterans Day
  '2027-11-25', // Thanksgiving
  '2027-12-24', // Christmas (observed; Dec 25 falls on Saturday)
]);

export type StatusKey = 'operational' | 'degraded' | 'outage';

export type StatusConfig = {
  label:  string;
  banner: string;
  emoji:  string;
  pill:   string;
  text:   string;
  dot:    string;
  square: string;
  card:   string;
};

export const STATUS: Record<StatusKey, StatusConfig> = {
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
    banner: 'Major Outage — Outside Working Hours',
    emoji:  '🔴',
    pill:   'bg-red-600 text-white',
    text:   'text-red-400',
    dot:    'bg-red-500',
    square: 'bg-red-600',
    card:   'bg-red-950 border-red-800',
  },
};

function djb2(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (((hash << 5) + hash) + str.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(hash);
}

export function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getStatus(date: Date, seed = '', phase?: WorkPhase): StatusKey {
  const p = phase ?? getWorkPhase(date);
  if (p === 'non-workday') return 'operational';
  if (p === 'off-hours') return 'outage';

  // Working hours: hash-based logic
  const dow = date.getDay();
  const weekAnchor = new Date(date);
  weekAnchor.setDate(date.getDate() - (dow - 1));
  const weekKey = toDateStr(weekAnchor) + seed;

  const wh = djb2(weekKey);
  const redCount = (wh % 3) + 1;

  const days = [1, 2, 3, 4, 5];
  for (let i = days.length - 1; i > 0; i--) {
    const j = djb2(weekKey + String(i)) % (i + 1);
    [days[i], days[j]] = [days[j], days[i]];
  }
  const redDays = new Set(days.slice(0, redCount));

  return redDays.has(dow) ? 'outage' : 'degraded';
}

export function isNonWorkDay(date: Date): boolean {
  const dow = date.getDay();
  return dow === 0 || dow === 6 || HOLIDAYS.has(toDateStr(date));
}

export function getEasternHour(date: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(date);
  return parseInt(parts.find(p => p.type === 'hour')!.value, 10);
}

export function getEasternDateStr(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (t: string) => parts.find(p => p.type === t)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

// Anchors the ET calendar day at noon UTC, so local Date methods
// (getDate, setDate, getDay, toLocaleDateString) can't roll it onto
// an adjacent day no matter what timezone the server runs in.
export function toEasternDate(date: Date): Date {
  return new Date(`${getEasternDateStr(date)}T12:00:00Z`);
}

export type WorkPhase = 'non-workday' | 'working' | 'off-hours';

export function getWorkPhase(date: Date): WorkPhase {
  const etParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(date);
  const get = (t: string) => etParts.find(p => p.type === t)!.value;
  const ds = `${get('year')}-${get('month')}-${get('day')}`;
  const hour = parseInt(get('hour'), 10);
  // Derive day-of-week from the ET date (noon UTC ensures no TZ shift)
  const dow = new Date(`${ds}T12:00:00Z`).getDay();

  if (dow === 0 || dow === 6 || HOLIDAYS.has(ds)) return 'non-workday';
  return hour >= 8 && hour < 17 ? 'working' : 'off-hours';
}

export function fmtShort(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
