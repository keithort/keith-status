# Working Hours Status Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the status page reflect Eastern Time working hours — outage outside 8am–5pm ET on workdays, existing hash-based behavior during working hours.

**Architecture:** Add `getEasternHour` and `getWorkPhase` to `status.ts` as the single source of truth for time-of-day logic. Update `getStatus` to accept an optional pre-computed phase. Update `page.tsx` to call `getWorkPhase` once and thread the phase into both the overall status and each component.

**Tech Stack:** TypeScript, Next.js 16 (SSR), Vitest for unit tests, `Intl.DateTimeFormat` for ET conversion.

## Global Constraints

- Eastern Time = `America/New_York` (handles DST automatically — no hardcoded UTC offsets)
- Working hours: 8:00am ET (inclusive) to 5:00pm ET (exclusive), Mon–Fri, non-US-federal-holiday
- `alwaysOperational` and `alwaysDegraded` components are never overridden by phase
- `nonWorkDayStatus` on Email/Slack still governs the `non-workday` phase
- All other components return `'outage'` during `off-hours`
- Banner copy change: outage → `'Major Outage — Outside Working Hours'`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `app/lib/status.ts` | Modify | Add `getEasternHour`, `WorkPhase`, `getWorkPhase`; update `getStatus` signature |
| `app/lib/status.test.ts` | Create | Unit tests for all new helpers + updated `getStatus` |
| `app/page.tsx` | Modify | Thread phase through `getComponentStatus` and `StatusPage` |
| `vitest.config.ts` | Create | Vitest config (Node environment) |
| `package.json` | Modify | Add `vitest` dev dependency + `test` script |

---

### Task 1: Set up Vitest

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `npm test` command that runs `vitest run`

- [ ] **Step 1: Install Vitest**

```bash
npm install --save-dev vitest
```

Expected: vitest appears in `package.json` devDependencies.

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
  },
});
```

- [ ] **Step 3: Add test script to `package.json`**

In the `"scripts"` object, add:
```json
"test": "vitest run"
```

- [ ] **Step 4: Write a smoke test to verify setup**

Create `app/lib/status.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { toDateStr } from './status';

describe('toDateStr', () => {
  it('formats a date as YYYY-MM-DD', () => {
    expect(toDateStr(new Date('2026-06-29T12:00:00Z'))).toBe('2026-06-29');
  });
});
```

- [ ] **Step 5: Run test and verify it passes**

```bash
npm test
```

Expected output includes: `✓ app/lib/status.test.ts (1)`

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts package.json package-lock.json app/lib/status.test.ts
git commit -m "test: add vitest"
```

---

### Task 2: Add `getEasternHour` and `getWorkPhase` to `status.ts`

**Files:**
- Modify: `app/lib/status.ts`
- Modify: `app/lib/status.test.ts`

**Interfaces:**
- Produces:
  - `getEasternHour(date: Date): number` — ET hour 0–23
  - `WorkPhase = 'non-workday' | 'working' | 'off-hours'`
  - `getWorkPhase(date: Date): WorkPhase`

- [ ] **Step 1: Write failing tests**

Replace the contents of `app/lib/status.test.ts` with:

```ts
import { describe, it, expect } from 'vitest';
import { toDateStr, getEasternHour, getWorkPhase } from './status';

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
```

- [ ] **Step 2: Run tests and verify they fail**

```bash
npm test
```

Expected: failures on `getEasternHour` and `getWorkPhase` — "is not a function" or import error.

- [ ] **Step 3: Implement `getEasternHour` and `getWorkPhase` in `status.ts`**

Add these exports after the `isNonWorkDay` function in `app/lib/status.ts`:

```ts
export function getEasternHour(date: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(date);
  return parseInt(parts.find(p => p.type === 'hour')!.value, 10);
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
```

- [ ] **Step 4: Run tests and verify they pass**

```bash
npm test
```

Expected output includes: `✓ app/lib/status.test.ts (12)`

- [ ] **Step 5: Commit**

```bash
git add app/lib/status.ts app/lib/status.test.ts
git commit -m "feat: add getEasternHour and getWorkPhase to status.ts"
```

---

### Task 3: Update `getStatus` to accept optional phase

**Files:**
- Modify: `app/lib/status.ts`
- Modify: `app/lib/status.test.ts`

**Interfaces:**
- Consumes: `WorkPhase` (from Task 2), `getWorkPhase` (from Task 2)
- Produces: `getStatus(date: Date, seed?: string, phase?: WorkPhase): StatusKey`

- [ ] **Step 1: Write failing tests**

Append to `app/lib/status.test.ts`:

```ts
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
```

Also add `getStatus` to the import line at the top of `status.test.ts`:
```ts
import { toDateStr, getEasternHour, getWorkPhase, getStatus } from './status';
```

- [ ] **Step 2: Run tests and verify the new ones fail**

```bash
npm test
```

Expected: the 3 new `getStatus with explicit phase` tests fail because the function does not yet accept a `phase` parameter.

- [ ] **Step 3: Update `getStatus` in `status.ts`**

Replace the existing `getStatus` function:

```ts
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
```

- [ ] **Step 4: Run all tests and verify they pass**

```bash
npm test
```

Expected output includes: `✓ app/lib/status.test.ts (15)`

- [ ] **Step 5: Commit**

```bash
git add app/lib/status.ts app/lib/status.test.ts
git commit -m "feat: update getStatus to accept optional WorkPhase"
```

---

### Task 4: Update `page.tsx` and banner copy

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/lib/status.ts` (banner copy only)

**Interfaces:**
- Consumes: `WorkPhase` (Task 2), `getWorkPhase` (Task 2), `getStatus` with phase (Task 3)

- [ ] **Step 1: Update outage banner copy in `status.ts`**

In `app/lib/status.ts`, find the `outage` entry in the `STATUS` object and change the `banner` field:

Old:
```ts
banner: 'Major Outage — Peak Obligation Hours',
```

New:
```ts
banner: 'Major Outage — Outside Working Hours',
```

- [ ] **Step 2: Update imports in `page.tsx`**

In `app/page.tsx`, update the import from `@/app/lib/status` to include `getWorkPhase` and `WorkPhase`:

```ts
import {
  getStatus, getWorkPhase, toDateStr, fmtShort,
  STATUS, HOLIDAYS,
  type StatusKey, type WorkPhase,
} from '@/app/lib/status';
```

- [ ] **Step 3: Update `getComponentStatus` signature and body in `page.tsx`**

Replace the existing `getComponentStatus` function:

```ts
function getComponentStatus(component: ComponentDef, date: Date, phase: WorkPhase): StatusKey {
  const { seed, alwaysOperational, alwaysDegraded, nonWorkDayStatus } = component;
  if (alwaysOperational) return 'operational';
  if (alwaysDegraded) return 'degraded';
  if (phase === 'non-workday') return nonWorkDayStatus ?? 'operational';
  if (phase === 'off-hours') return 'outage';
  return getStatus(date, seed, 'working');
}
```

- [ ] **Step 4: Update `StatusPage` to compute phase once and thread it through**

In `app/page.tsx`, inside the `StatusPage` function body, replace:

```ts
const overallStatus = getStatus(today);
```

with:

```ts
const phase = getWorkPhase(today);
const overallStatus = getStatus(today, '', phase);
```

Then find the `COMPONENTS.map` call that uses `getComponentStatus` and update it:

```ts
const st = getComponentStatus(component, today, phase);
```

- [ ] **Step 5: Verify the build succeeds**

```bash
npm run build
```

Expected: build completes with no TypeScript errors.

- [ ] **Step 6: Run all tests one final time**

```bash
npm test
```

Expected output includes: `✓ app/lib/status.test.ts (15)` — all passing.

- [ ] **Step 7: Commit**

```bash
git add app/page.tsx app/lib/status.ts
git commit -m "feat: thread WorkPhase through page.tsx for time-of-day status"
```
