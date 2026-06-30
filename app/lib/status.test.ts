import { describe, it, expect } from 'vitest';
import { toDateStr } from './status';

describe('toDateStr', () => {
  it('formats a date as YYYY-MM-DD', () => {
    expect(toDateStr(new Date('2026-06-29T12:00:00Z'))).toBe('2026-06-29');
  });
});
