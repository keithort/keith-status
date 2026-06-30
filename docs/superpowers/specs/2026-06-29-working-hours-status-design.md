# Working Hours Status Design

**Date:** 2026-06-29  
**Status:** Approved

## Problem

The current status logic is date-only. `getStatus()` receives a `Date` but only uses year/month/day — the hour is ignored. This means the page shows the same status from midnight to 11:59pm on any given day. The desired behavior is for the page to reflect real working hours: systems should show outage outside the 8am–5pm ET window on workdays.

## Requirements

On workdays (Mon–Fri, non-US-federal-holiday):

| Eastern Time window | Overall status | Work component status |
|---|---|---|
| 8:00am – 4:59pm | hash-based (existing) | hash-based (existing) |
| 5:00pm – 11:59pm | outage | outage |
| 12:00am – 7:59am | outage | outage |

On non-workdays (weekends, US federal holidays): unchanged — overall operational, Email/Slack outage, all others operational.

"Work components" = all components that do not have `alwaysOperational: true` or `alwaysDegraded: true`.

## Approach

Add a `WorkPhase` type and `getWorkPhase()` function to `status.ts`. This becomes the single place that maps a `Date` to one of three phases. All callers (`getStatus`, `getComponentStatus`) derive their output from the phase.

## Design

### `status.ts` additions

```ts
export type WorkPhase = 'non-workday' | 'working' | 'off-hours';

// Converts a Date to Eastern Time hour (0–23) using Intl.DateTimeFormat.
// Handles DST automatically — no hardcoded UTC offsets.
export function getEasternHour(date: Date): number

// Returns the work phase for a given moment.
export function getWorkPhase(date: Date): WorkPhase
  // isNonWorkDay(date)          → 'non-workday'
  // getEasternHour(date) 8–16  → 'working'
  // otherwise                  → 'off-hours'
```

`getStatus(date, seed?, phase?)` — add optional `phase` parameter. When `phase === 'off-hours'` return `'outage'` immediately. When `phase === 'non-workday'` return `'operational'` immediately (existing behaviour). When `phase === 'working'` or phase is omitted, run existing hash logic.

### `page.tsx` changes

Call `getWorkPhase(today)` once at the top of `StatusPage`. Pass phase to:
- `getStatus(today, '', phase)` for the overall banner/pill
- `getComponentStatus(component, today, phase)` for each component row

`getComponentStatus` updated logic (in priority order):
1. `alwaysOperational` → `'operational'`
2. `alwaysDegraded` → `'degraded'`
3. `phase === 'non-workday'` + `nonWorkDayStatus` set → `nonWorkDayStatus`
4. `phase === 'non-workday'` → `'operational'`
5. `phase === 'off-hours'` → `'outage'`
6. `phase === 'working'` → `getStatus(date, seed)`

### Banner copy

| Key | Banner text |
|---|---|
| `operational` | `All Systems Operational — Offline Mode Active` (unchanged) |
| `degraded` | `Degraded Performance — Workday Detected` (unchanged) |
| `outage` | `Major Outage — Outside Working Hours` (changed from "Peak Obligation Hours") |

## Eastern Time / DST

Use `Intl.DateTimeFormat` with `timeZone: 'America/New_York'` to extract the hour. This handles the EDT/EST transition automatically without hardcoded UTC offsets.

```ts
function getEasternHour(date: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(date);
  return parseInt(parts.find(p => p.type === 'hour')!.value, 10);
}
```

## Out of scope

- Per-component off-hours overrides (all work components behave identically off-hours)
- Configurable work hours (hardcoded 8–17)
- Client-side clock updates (page remains SSR; status reflects server time at request)
