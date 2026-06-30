import { describe, it, expect } from 'vitest';
import { toDateStr, getEasternHour, getWorkPhase, getStatus } from './status';

describe('toDateStr', () => {
  it('formats a date as YYYY-MM-DD', () => {
    expect(toDateStr(new Date('2026-06-29T12:00:00Z'))).toBe('2026-06-29');
  });
});

describe('getEasternHour', () => {
  it('returns 8 for 12:00 UTC in summer (EDT = UTC-4)', () => {
    // 2026-06-29 12:00 UTC = 08:00 EDT
    expect(getEasternHour(new Date('2026-06-29T12:00:00Z'))).toBe(8);
  });

  it('returns 17 for 21:00 UTC in summer (EDT = UTC-4)', () => {
    // 2026-06-29 21:00 UTC = 17:00 EDT
    expect(getEasternHour(new Date('2026-06-29T21:00:00Z'))).toBe(17);
  });

  it('returns 8 for 13:00 UTC in winter (EST = UTC-5)', () => {
    // 2026-01-15 13:00 UTC = 08:00 EST
    expect(getEasternHour(new Date('2026-01-15T13:00:00Z'))).toBe(8);
  });

  it('returns 0 for midnight ET in summer', () => {
    // 2026-06-29 04:00 UTC = 00:00 EDT
    expect(getEasternHour(new Date('2026-06-29T04:00:00Z'))).toBe(0);
  });
});

describe('getWorkPhase', () => {
  // Saturday
  it('returns non-workday for Saturday', () => {
    expect(getWorkPhase(new Date('2026-06-27T14:00:00Z'))).toBe('non-workday');
  });

  // Sunday
  it('returns non-workday for Sunday', () => {
    expect(getWorkPhase(new Date('2026-06-28T14:00:00Z'))).toBe('non-workday');
  });

  // US federal holiday (Independence Day observed 2026-07-03)
  it('returns non-workday for a federal holiday', () => {
    expect(getWorkPhase(new Date('2026-07-03T14:00:00Z'))).toBe('non-workday');
  });

  // Monday 10am ET (12:00 UTC in summer) — inside working hours
  it('returns working for a weekday at 10am ET', () => {
    expect(getWorkPhase(new Date('2026-06-29T14:00:00Z'))).toBe('working');
  });

  // Monday 4:59pm ET (20:59 UTC in summer) — last minute of working hours
  it('returns working for a weekday at 4:59pm ET', () => {
    expect(getWorkPhase(new Date('2026-06-29T20:59:00Z'))).toBe('working');
  });

  // Monday 8am ET exactly (12:00 UTC in summer) — boundary: inside
  it('returns working at exactly 8am ET', () => {
    expect(getWorkPhase(new Date('2026-06-29T12:00:00Z'))).toBe('working');
  });

  // Monday 5pm ET (21:00 UTC in summer) — boundary: outside
  it('returns off-hours at exactly 5pm ET', () => {
    expect(getWorkPhase(new Date('2026-06-29T21:00:00Z'))).toBe('off-hours');
  });

  // Monday 7am ET (11:00 UTC in summer) — before working hours
  it('returns off-hours before 8am ET on a workday', () => {
    expect(getWorkPhase(new Date('2026-06-29T11:00:00Z'))).toBe('off-hours');
  });

  // Monday midnight ET (04:00 UTC in summer) — dead of night
  it('returns off-hours at midnight ET on a workday', () => {
    expect(getWorkPhase(new Date('2026-06-29T04:00:00Z'))).toBe('off-hours');
  });
});

describe('getStatus with explicit phase', () => {
  const monday = new Date('2026-06-29T14:00:00Z'); // workday

  it('returns outage when phase is off-hours', () => {
    expect(getStatus(monday, '', 'off-hours')).toBe('outage');
  });

  it('returns operational when phase is non-workday', () => {
    expect(getStatus(monday, '', 'non-workday')).toBe('operational');
  });

  it('runs hash logic when phase is working', () => {
    const result = getStatus(monday, 'motivation', 'working');
    expect(['operational', 'degraded', 'outage']).toContain(result);
  });
});
