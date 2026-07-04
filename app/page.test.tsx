import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import StatusPage from './page';

// The overall banner and the component rows intentionally diverge when
// Keith isn't working: components go red/yellow per their own config,
// while the system as a whole reads operational.

function componentColor(html: string, name: string): string {
  // Row markup: <span ...>{name}</span> ... <span class="... text-<color>-400 ...">{label}</span>
  const m = html.match(new RegExp(`${name}</span>.*?text-(red|yellow|green)-400`));
  expect(m, `component row for ${name}`).not.toBeNull();
  return m![1];
}

describe('StatusPage during off-hours (Mon 9pm ET)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // 2026-07-07 01:00 UTC = Monday 2026-07-06 21:00 EDT — workday, off-hours
    vi.setSystemTime(new Date('2026-07-07T01:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a green overall banner while components stay red/yellow', () => {
    const html = renderToStaticMarkup(<StatusPage />);

    // Top-level status is operational
    expect(html).toContain('All Systems Operational — Offline Mode Active');
    expect(html).toContain('bg-green-700'); // header pill

    // Components keep their prior off-hours configuration
    expect(componentColor(html, 'Motivation API')).toBe('red');
    expect(componentColor(html, 'Email Response Queue')).toBe('red');
    expect(componentColor(html, 'Westhafer Sarcasm Load Balancing')).toBe('yellow');
    expect(componentColor(html, 'Meme Generation Service')).toBe('green');
  });
});
