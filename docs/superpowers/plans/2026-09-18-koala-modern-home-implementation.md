# Koala Modern Home Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a modern, unified Koala home dashboard where users can control proxy takeover mode and outbound mode, connect or disconnect, inspect the active subscription with a cached favicon and official website action, and open the active proxy selector.

**Architecture:** Keep the existing Electron main/renderer boundary and configuration formats. Add small renderer feature modules for pure state planning and React controllers, introduce reusable layout primitives behind the existing `BasePage` API, and keep favicon network access in a bounded, validated main-process helper. The first milestone updates the shared shell and home workflow; a separate follow-on plan will migrate every remaining feature page after these shared interfaces are proven.

**Tech Stack:** Electron 37, React 19, TypeScript 5.9, React Router 7, SWR, Zustand, Tailwind CSS 4, Radix UI, Axios, Node `node:test`, `tsx`.

**Spec:** `docs/superpowers/specs/2026-09-18-koala-layout-redesign-design.md`

## Global Constraints

- Preserve the existing minimum window size of 800 × 600 and default size of 800 × 700.
- Do not add a runtime or testing dependency; use the existing `tsx` package and Node test runner.
- Preserve existing CSS variable names so installed custom themes remain compatible; add semantic aliases instead of renaming or deleting tokens.
- System proxy and virtual network interface are mutually exclusive after every completed home-page operation.
- Changing takeover mode while disconnected changes the preference only; changing it while connected performs a controlled handoff with rollback.
- Connect enables only the selected takeover mode; disconnect disables both takeover modes.
- Rule/global updates retain the existing controlled-config, live-config, connection-closing, group-refresh, and tray-sync sequence.
- A subscription URL is never displayed or opened as an official website fallback.
- Favicon discovery accepts only bounded image responses from validated public HTTP or HTTPS destinations and does not block subscription refresh.
- All new user-facing copy is added to Chinese, English, and Russian locale files in the same task.
- Preserve tray, floating-window, onboarding-guide, and custom-theme behavior.

## Milestone Boundary

This plan implements the shared visual foundation and the complete home workflow. It also moves the existing primary mode controls out of the sidebar and settings overview so there is one authoritative control surface. After this plan lands and the shared components have stable signatures, create a second plan for the page-by-page migration of profiles, proxies, resources, rules, connections, logs, and advanced settings.

## File Map

### New renderer feature modules

- `src/renderer/src/features/home/subscription-metrics.ts`: pure subscription calculations and official-site validation.
- `src/renderer/src/features/home/takeover-transition.ts`: pure takeover transition planning and rollback execution.
- `src/renderer/src/features/home/use-takeover-controller.ts`: adapts renderer IPC calls to the takeover transition engine.
- `src/renderer/src/features/home/outbound-mode.ts`: pure outbound availability rules.
- `src/renderer/src/features/home/use-outbound-mode-controller.ts`: owns rule/global updates.

### New shared renderer components

- `src/renderer/src/components/layout/page-shell.tsx`: unified title bar, page header, padding, and scrolling.
- `src/renderer/src/components/base/surface-card.tsx`: semantic dashboard surface.
- `src/renderer/src/components/base/segmented-control.tsx`: accessible single-selection control.
- `src/renderer/src/components/base/status-badge.tsx`: neutral, active, warning, and destructive status.
- `src/renderer/src/components/base/metric.tsx`: label/value/progress presentation.
- `src/renderer/src/components/base/empty-state.tsx`: consistent empty state.
- `src/renderer/src/components/base/external-link-button.tsx`: validated external-link action.

### New home components

- `src/renderer/src/components/home/connection-card.tsx`
- `src/renderer/src/components/home/mode-control-panel.tsx`
- `src/renderer/src/components/home/subscription-card.tsx`
- `src/renderer/src/components/home/active-proxy-card.tsx`

### New main-process module

- `src/main/utils/favicon.ts`: safe website-icon discovery and bounded image conversion.

---

### Task 1: Unit Test Harness and Subscription View Model

**Files:**
- Modify: `package.json:8-23`
- Create: `src/renderer/src/features/home/subscription-metrics.ts`
- Test: `src/renderer/src/features/home/subscription-metrics.test.ts`

**Interfaces:**
- Produces: `formatBytes(bytes: number): string`
- Produces: `getSubscriptionMetrics(extra: SubscriptionUserInfo | undefined, nowMs?: number): SubscriptionMetrics`
- Produces: `getOfficialWebsite(profile: ProfileItem): { href: string; label?: string } | null`
- Consumes: ambient `ProfileItem` and `SubscriptionUserInfo` from `src/shared/types/app.d.ts`

- [ ] **Step 1: Add the unit-test script**

Add this script beside `typecheck` in `package.json`:

```json
"test:unit": "tsx --test"
```

- [ ] **Step 2: Write the failing subscription tests**

Create `src/renderer/src/features/home/subscription-metrics.test.ts`:

```ts
import assert from 'node:assert/strict'
import test from 'node:test'
import {
  formatBytes,
  getOfficialWebsite,
  getSubscriptionMetrics
} from './subscription-metrics'

test('calculates finite subscription usage and warning state', () => {
  const now = Date.UTC(2026, 8, 18)
  const metrics = getSubscriptionMetrics(
    {
      upload: 1024,
      download: 2048,
      total: 8192,
      expire: Math.floor((now + 2 * 86_400_000) / 1000)
    },
    now
  )

  assert.equal(metrics.used, 3072)
  assert.equal(metrics.remaining, 5120)
  assert.equal(metrics.progress, 37.5)
  assert.equal(metrics.daysRemaining, 2)
  assert.equal(metrics.tone, 'warning')
})

test('represents missing limits without inventing values', () => {
  const metrics = getSubscriptionMetrics(undefined, Date.UTC(2026, 8, 18))
  assert.equal(metrics.hasTrafficLimit, false)
  assert.equal(metrics.hasExpiry, false)
  assert.equal(metrics.progress, null)
  assert.equal(metrics.tone, 'neutral')
})

test('marks an expired subscription destructive', () => {
  const now = Date.UTC(2026, 8, 18)
  const metrics = getSubscriptionMetrics(
    { upload: 0, download: 0, total: 0, expire: Math.floor((now - 1) / 1000) },
    now
  )
  assert.equal(metrics.expired, true)
  assert.equal(metrics.tone, 'destructive')
})

test('formats byte values consistently', () => {
  assert.equal(formatBytes(0), '0 B')
  assert.equal(formatBytes(1024), '1 KB')
  assert.equal(formatBytes(1_610_612_736), '1.5 GB')
})

test('uses only a validated profile home as the official website', () => {
  assert.deepEqual(
    getOfficialWebsite({
      id: 'one',
      type: 'remote',
      name: 'Provider',
      home: 'https://provider.example/account',
      homeName: 'Provider Portal',
      url: 'https://subscription.example/private-token',
      supportUrl: 'https://t.me/provider'
    }),
    { href: 'https://provider.example/account', label: 'Provider Portal' }
  )

  assert.equal(
    getOfficialWebsite({
      id: 'two',
      type: 'remote',
      name: 'Provider',
      url: 'https://subscription.example/private-token',
      supportUrl: 'https://t.me/provider'
    }),
    null
  )
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm test:unit src/renderer/src/features/home/subscription-metrics.test.ts`

Expected: FAIL with a module-not-found error for `./subscription-metrics`.

- [ ] **Step 4: Implement the pure subscription model**

Create `src/renderer/src/features/home/subscription-metrics.ts`:

```ts
const DAY_MS = 86_400_000
const EXPIRY_WARNING_DAYS = 3

export type SubscriptionTone = 'neutral' | 'warning' | 'destructive'

export interface SubscriptionMetrics {
  used: number
  remaining: number
  total: number
  progress: number | null
  hasTrafficLimit: boolean
  hasExpiry: boolean
  expiresAtMs: number | null
  daysRemaining: number | null
  expired: boolean
  tone: SubscriptionTone
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const precision = index > 1 ? 1 : 0
  return `${(bytes / 1024 ** index).toFixed(precision)} ${units[index]}`
}

export function getSubscriptionMetrics(
  extra: SubscriptionUserInfo | undefined,
  nowMs = Date.now()
): SubscriptionMetrics {
  const used = Math.max(0, (extra?.upload ?? 0) + (extra?.download ?? 0))
  const total = Math.max(0, extra?.total ?? 0)
  const hasTrafficLimit = total > 0
  const remaining = hasTrafficLimit ? Math.max(0, total - used) : 0
  const progress = hasTrafficLimit ? Math.min(100, (used / total) * 100) : null
  const expiresAtMs = extra?.expire ? extra.expire * 1000 : null
  const hasExpiry = expiresAtMs !== null && expiresAtMs > 0
  const expired = hasExpiry && expiresAtMs < nowMs
  const daysRemaining = hasExpiry
    ? Math.max(0, Math.floor((expiresAtMs - nowMs) / DAY_MS))
    : null
  const tone: SubscriptionTone = expired
    ? 'destructive'
    : hasExpiry && daysRemaining !== null && daysRemaining <= EXPIRY_WARNING_DAYS
      ? 'warning'
      : 'neutral'

  return {
    used,
    remaining,
    total,
    progress,
    hasTrafficLimit,
    hasExpiry,
    expiresAtMs,
    daysRemaining,
    expired,
    tone
  }
}

export function getOfficialWebsite(
  profile: ProfileItem
): { href: string; label?: string } | null {
  if (!profile.home) return null
  try {
    const url = new URL(profile.home)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    if (url.username || url.password) return null
    return {
      href: url.toString(),
      label: profile.homeName?.trim() || undefined
    }
  } catch {
    return null
  }
}
```

- [ ] **Step 5: Run the focused unit tests**

Run: `pnpm test:unit src/renderer/src/features/home/subscription-metrics.test.ts`

Expected: 5 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json src/renderer/src/features/home/subscription-metrics.ts src/renderer/src/features/home/subscription-metrics.test.ts
git commit -m "test: add home subscription view model"
```

---

### Task 2: Shared Page Shell and Dashboard Primitives

**Files:**
- Create: `src/renderer/src/components/layout/page-shell.tsx`
- Create: `src/renderer/src/components/base/surface-card.tsx`
- Create: `src/renderer/src/components/base/segmented-control.tsx`
- Create: `src/renderer/src/components/base/status-badge.tsx`
- Create: `src/renderer/src/components/base/metric.tsx`
- Create: `src/renderer/src/components/base/empty-state.tsx`
- Create: `src/renderer/src/components/base/external-link-button.tsx`
- Test: `src/renderer/src/components/base/segmented-control.test.tsx`
- Modify: `src/renderer/src/components/base/base-page.tsx:1-60`
- Modify: `src/renderer/src/assets/main.css:5-157`

**Interfaces:**
- Produces: `PageShellProps` with `title`, `description`, `header`, `contentClassName`, `contentWidth`, and `showBackButton`.
- Produces: `SegmentedControl<T extends string>` with `value`, `options`, `onValueChange`, `disabled`, and `ariaLabel`.
- Produces: `SurfaceCard`, `StatusBadge`, `Metric`, `EmptyState`, and `ExternalLinkButton`.
- Preserves: the current `BasePage` call sites through a compatibility wrapper.

- [ ] **Step 1: Write the failing segmented-control render test**

Create `src/renderer/src/components/base/segmented-control.test.tsx`:

```tsx
import assert from 'node:assert/strict'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import SegmentedControl from './segmented-control'

test('renders an accessible selected option and disabled reason', () => {
  const html = renderToStaticMarkup(
    <SegmentedControl
      ariaLabel="Proxy takeover mode"
      value="tun"
      onValueChange={() => undefined}
      options={[
        { value: 'sysproxy', label: 'System proxy' },
        { value: 'tun', label: 'Virtual network interface' },
        {
          value: 'global',
          label: 'Global',
          disabled: true,
          disabledReason: 'Unavailable for this subscription'
        }
      ]}
    />
  )

  assert.match(html, /role="radiogroup"/)
  assert.match(html, /aria-checked="true"/)
  assert.match(html, /title="Unavailable for this subscription"/)
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test:unit src/renderer/src/components/base/segmented-control.test.tsx`

Expected: FAIL with a module-not-found error for `./segmented-control`.

- [ ] **Step 3: Implement the segmented control**

Create `src/renderer/src/components/base/segmented-control.tsx` with this public contract and native radio semantics:

```tsx
import React from 'react'
import { cn } from '@renderer/lib/utils'

export interface SegmentedOption<T extends string> {
  value: T
  label: React.ReactNode
  icon?: React.ComponentType<{ className?: string }>
  disabled?: boolean
  disabledReason?: string
}

interface Props<T extends string> {
  ariaLabel: string
  value: T
  options: SegmentedOption<T>[]
  onValueChange: (value: T) => void
  disabled?: boolean
  className?: string
}

export default function SegmentedControl<T extends string>({
  ariaLabel,
  value,
  options,
  onValueChange,
  disabled = false,
  className
}: Props<T>): React.ReactElement {
  const enabledOptions = options.filter((option) => !option.disabled)

  const moveSelection = (current: T, direction: 1 | -1): void => {
    const index = enabledOptions.findIndex((option) => option.value === current)
    if (index < 0 || enabledOptions.length === 0) return
    const next = enabledOptions[(index + direction + enabledOptions.length) % enabledOptions.length]
    onValueChange(next.value)
    document.querySelector<HTMLButtonElement>(`[data-segmented-value="${next.value}"]`)?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn('grid grid-flow-col auto-cols-fr gap-1 rounded-xl border border-stroke bg-card/55 p-1', className)}
    >
      {options.map((option) => {
        const Icon = option.icon
        const selected = option.value === value
        const optionDisabled = disabled || option.disabled
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={optionDisabled}
            title={option.disabledReason}
            data-segmented-value={option.value}
            tabIndex={selected ? 0 : -1}
            onClick={() => onValueChange(option.value)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                event.preventDefault()
                moveSelection(option.value, 1)
              }
              if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                event.preventDefault()
                moveSelection(option.value, -1)
              }
            }}
            className={cn(
              'app-nodrag inline-flex min-h-9 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring',
              selected
                ? 'border border-stroke-power-on/55 bg-success/12 text-foreground shadow-sm'
                : 'border border-transparent text-muted-foreground hover:bg-accent/70 hover:text-foreground',
              optionDisabled && 'cursor-not-allowed opacity-45'
            )}
          >
            {Icon && <Icon className="size-4 shrink-0" />}
            <span className="truncate">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Add semantic tokens without removing existing theme variables**

Add these aliases to both `:root` and `.dark`, mapping them to existing variables where possible:

```css
--surface: color-mix(in oklab, var(--card) 88%, transparent);
--surface-elevated: color-mix(in oklab, var(--card) 96%, var(--background));
--surface-interactive: color-mix(in oklab, var(--accent) 76%, transparent);
--border-strong: color-mix(in oklab, var(--foreground) 18%, transparent);
--shadow-card: 0 10px 28px rgb(0 0 0 / 12%);
--motion-fast: 120ms;
--motion-default: 180ms;
--motion-slow: 300ms;
```

Expose `--surface`, `--surface-elevated`, `--surface-interactive`, and `--border-strong` through `@theme inline`. Add a reduced-motion rule:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
```

- [ ] **Step 5: Implement the page shell and compatibility wrapper**

Create `src/renderer/src/components/layout/page-shell.tsx`. Move the current route/back-button/window-control logic from `BasePage` into it and use this content container:

```tsx
<div
  ref={contentRef}
  className={cn(
    'content h-[calc(100vh-57px)] overflow-y-auto px-3 pb-3 custom-scrollbar sm:px-4 sm:pb-4',
    props.contentClassName
  )}
>
  <div
    className={cn(
      'mx-auto w-full',
      props.contentWidth === 'dashboard' && 'max-w-5xl',
      props.contentWidth === 'wide' && 'max-w-7xl'
    )}
  >
    {props.children}
  </div>
</div>
```

Export the props:

```ts
export interface PageShellProps {
  title?: React.ReactNode
  description?: React.ReactNode
  header?: React.ReactNode
  children?: React.ReactNode
  contentClassName?: string
  contentWidth?: 'full' | 'wide' | 'dashboard'
  showBackButton?: boolean
}
```

Default `contentWidth` to `full` so existing data-heavy pages do not become narrower during this milestone. The home page opts into `dashboard`; the follow-on migration chooses a width explicitly for each page.

Replace `base-page.tsx` with a compatibility wrapper:

```tsx
import React, { forwardRef } from 'react'
import PageShell, { type PageShellProps } from '@renderer/components/layout/page-shell'

const BasePage = forwardRef<HTMLDivElement, PageShellProps>((props, ref) => (
  <PageShell ref={ref} {...props} />
))

BasePage.displayName = 'BasePage'
export default BasePage
```

- [ ] **Step 6: Implement the remaining primitives**

Use the existing `Card`, `Badge`, `Progress`, and `Button` components. Keep these exact exported contracts:

```ts
export type StatusTone = 'neutral' | 'active' | 'warning' | 'destructive'
export interface MetricProps {
  label: React.ReactNode
  value: React.ReactNode
  detail?: React.ReactNode
  progress?: number | null
}
export interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>
  title: React.ReactNode
  description: React.ReactNode
  action?: React.ReactNode
}
export interface ExternalLinkButtonProps {
  href: string
  children: React.ReactNode
  variant?: 'default' | 'outline' | 'ghost'
  className?: string
}
```

`ExternalLinkButton` must parse `href`, accept only HTTP or HTTPS, and call `window.open(parsed.toString())` from the click handler. Invalid URLs render a disabled button. `SurfaceCard` must use `bg-[var(--surface)]`, `border-stroke`, `rounded-2xl`, and `shadow-[var(--shadow-card)]` as the common dashboard surface.

- [ ] **Step 7: Verify primitives and renderer types**

Run: `pnpm test:unit src/renderer/src/components/base/segmented-control.test.tsx`

Expected: PASS.

Run: `pnpm run typecheck:web`

Expected: exit 0.

- [ ] **Step 8: Commit**

```bash
git add src/renderer/src/components/layout src/renderer/src/components/base src/renderer/src/assets/main.css
git commit -m "feat: add shared application layout primitives"
```

---

### Task 3: Proxy Takeover Transition Engine

**Files:**
- Create: `src/renderer/src/features/home/takeover-transition.ts`
- Test: `src/renderer/src/features/home/takeover-transition.test.ts`

**Interfaces:**
- Produces: `TakeoverMode`, `TakeoverSnapshot`, and `TakeoverStep`.
- Produces: `planTakeoverTransition(snapshot, targetMode, targetConnected)`.
- Produces: `getPreferredActiveMode(snapshot, preferredMode)`.
- Produces: `executeTakeoverTransition(request, setMode)` with rollback.
- Consumes: no React, Electron, or browser globals.

- [ ] **Step 1: Write failing transition and rollback tests**

Create `src/renderer/src/features/home/takeover-transition.test.ts`:

```ts
import assert from 'node:assert/strict'
import test from 'node:test'
import {
  executeTakeoverTransition,
  planTakeoverTransition,
  type TakeoverMode
} from './takeover-transition'

test('switches from tun to system proxy by disabling tun first', () => {
  assert.deepEqual(
    planTakeoverTransition({ tun: true, sysproxy: false }, 'sysproxy', true),
    [
      { mode: 'tun', enabled: false },
      { mode: 'sysproxy', enabled: true }
    ]
  )
})

test('disconnect heals a legacy state with both modes enabled', () => {
  assert.deepEqual(
    planTakeoverTransition({ tun: true, sysproxy: true }, 'tun', false),
    [
      { mode: 'sysproxy', enabled: false },
      { mode: 'tun', enabled: false }
    ]
  )
})

test('restores the previous preferred mode after activation failure', async () => {
  const calls: string[] = []
  const setMode = async (mode: TakeoverMode, enabled: boolean): Promise<void> => {
    calls.push(`${mode}:${enabled}`)
    if (mode === 'sysproxy' && enabled) throw new Error('activation failed')
  }

  await assert.rejects(
    executeTakeoverTransition(
      {
        snapshot: { tun: true, sysproxy: false },
        preferredMode: 'tun',
        targetMode: 'sysproxy',
        targetConnected: true
      },
      setMode
    ),
    /activation failed/
  )

  assert.deepEqual(calls, [
    'tun:false',
    'sysproxy:true',
    'tun:false',
    'sysproxy:false',
    'tun:true'
  ])
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test:unit src/renderer/src/features/home/takeover-transition.test.ts`

Expected: FAIL with a module-not-found error for `./takeover-transition`.

- [ ] **Step 3: Implement transition planning and rollback**

Create `src/renderer/src/features/home/takeover-transition.ts`:

```ts
export type TakeoverMode = 'tun' | 'sysproxy'

export interface TakeoverSnapshot {
  tun: boolean
  sysproxy: boolean
}

export interface TakeoverStep {
  mode: TakeoverMode
  enabled: boolean
}

export interface TakeoverRequest {
  snapshot: TakeoverSnapshot
  preferredMode: TakeoverMode
  targetMode: TakeoverMode
  targetConnected: boolean
}

export function getPreferredActiveMode(
  snapshot: TakeoverSnapshot,
  preferredMode: TakeoverMode
): TakeoverMode | null {
  if (snapshot[preferredMode]) return preferredMode
  const alternate = preferredMode === 'tun' ? 'sysproxy' : 'tun'
  return snapshot[alternate] ? alternate : null
}

export function planTakeoverTransition(
  snapshot: TakeoverSnapshot,
  targetMode: TakeoverMode,
  targetConnected: boolean
): TakeoverStep[] {
  const alternate = targetMode === 'tun' ? 'sysproxy' : 'tun'
  const steps: TakeoverStep[] = []
  if (snapshot[alternate]) steps.push({ mode: alternate, enabled: false })
  if (targetConnected && !snapshot[targetMode]) {
    steps.push({ mode: targetMode, enabled: true })
  }
  if (!targetConnected && snapshot[targetMode]) {
    steps.push({ mode: targetMode, enabled: false })
  }
  return steps
}

function planRollback(snapshot: TakeoverSnapshot, preferredMode: TakeoverMode): TakeoverStep[] {
  const active = getPreferredActiveMode(snapshot, preferredMode)
  return [
    { mode: 'tun', enabled: false },
    { mode: 'sysproxy', enabled: false },
    ...(active ? [{ mode: active, enabled: true } as TakeoverStep] : [])
  ]
}

export async function executeTakeoverTransition(
  request: TakeoverRequest,
  setMode: (mode: TakeoverMode, enabled: boolean) => Promise<void>
): Promise<void> {
  try {
    for (const step of planTakeoverTransition(
      request.snapshot,
      request.targetMode,
      request.targetConnected
    )) {
      await setMode(step.mode, step.enabled)
    }
  } catch (error) {
    const rollbackErrors: unknown[] = []
    for (const step of planRollback(request.snapshot, request.preferredMode)) {
      try {
        await setMode(step.mode, step.enabled)
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError)
      }
    }
    if (rollbackErrors.length > 0) {
      throw new AggregateError([error, ...rollbackErrors], 'Takeover switch and rollback failed')
    }
    throw error
  }
}
```

- [ ] **Step 4: Run the focused tests**

Run: `pnpm test:unit src/renderer/src/features/home/takeover-transition.test.ts`

Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/features/home/takeover-transition.ts src/renderer/src/features/home/takeover-transition.test.ts
git commit -m "feat: add proxy takeover transition planner"
```

---

### Task 4: Home Takeover and Outbound Controllers

**Files:**
- Create: `src/renderer/src/features/home/outbound-mode.ts`
- Test: `src/renderer/src/features/home/outbound-mode.test.ts`
- Create: `src/renderer/src/features/home/use-takeover-controller.ts`
- Create: `src/renderer/src/features/home/use-outbound-mode-controller.ts`

**Interfaces:**
- Consumes: `executeTakeoverTransition` from Task 3.
- Consumes: raw renderer IPC functions from `src/renderer/src/utils/ipc.ts` so operation failures are not swallowed by context convenience methods.
- Produces: `TakeoverController` and `OutboundModeController` interfaces used by the home page.
- Produces: `getOutboundModeAvailability(profile, requestedMode)`.

- [ ] **Step 1: Write the failing outbound availability tests**

Create `src/renderer/src/features/home/outbound-mode.test.ts`:

```ts
import assert from 'node:assert/strict'
import test from 'node:test'
import { getOutboundModeAvailability } from './outbound-mode'

test('allows rule mode for every profile', () => {
  assert.deepEqual(getOutboundModeAvailability(undefined, 'rule'), { allowed: true })
})

test('explains when the active subscription disables global mode', () => {
  assert.deepEqual(
    getOutboundModeAvailability(
      { id: 'one', type: 'remote', name: 'Provider', globalMode: false },
      'global'
    ),
    { allowed: false, reason: 'profile-restricted' }
  )
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test:unit src/renderer/src/features/home/outbound-mode.test.ts`

Expected: FAIL with a module-not-found error for `./outbound-mode`.

- [ ] **Step 3: Implement outbound availability**

Create `src/renderer/src/features/home/outbound-mode.ts`:

```ts
export type HomeOutboundMode = 'rule' | 'global'
export type OutboundDisabledReason = 'profile-restricted'

export function getOutboundModeAvailability(
  profile: ProfileItem | undefined,
  requestedMode: HomeOutboundMode
): { allowed: true } | { allowed: false; reason: OutboundDisabledReason } {
  if (requestedMode === 'global' && profile?.globalMode === false) {
    return { allowed: false, reason: 'profile-restricted' }
  }
  return { allowed: true }
}
```

- [ ] **Step 4: Implement the takeover controller**

Expose this exact interface from `use-takeover-controller.ts`:

```ts
export type TakeoverStatus = 'idle' | 'connecting' | 'disconnecting' | 'switching'
export type TakeoverDisabledReason = 'system-proxy-port-unavailable'

export interface TakeoverController {
  status: TakeoverStatus
  selectedMode: TakeoverMode
  activeMode: TakeoverMode | null
  connected: boolean
  busy: boolean
  disabledReason: TakeoverDisabledReason | null
  setTakeoverMode: (mode: TakeoverMode) => Promise<void>
  setConnected: (enabled: boolean) => Promise<void>
}
```

Build the snapshot from `tun?.enable` and `appConfig.proxyMode`. Use raw IPC aliases:

```ts
import {
  mihomoHotReloadConfig,
  patchAppConfig as patchAppConfigIpc,
  patchControledMihomoConfig as patchControlledIpc,
  triggerSysProxy,
  updateTrayIcon
} from '@renderer/utils/ipc'
```

The adapter passed to `executeTakeoverTransition` must implement these operations:

```ts
const setMode = async (mode: TakeoverMode, enabled: boolean): Promise<void> => {
  if (mode === 'tun') {
    await patchControlledIpc(
      enabled ? { tun: { enable: true }, dns: { enable: true } } : { tun: { enable: false } }
    )
    await mihomoHotReloadConfig()
    return
  }

  if (enabled && disabledReason === 'system-proxy-port-unavailable') {
    throw new Error('SYSTEM_PROXY_PORT_UNAVAILABLE')
  }
  if (enabled) {
    await patchAppConfigIpc({ proxyMode: true })
    await mihomoHotReloadConfig()
    if (writeSysProxy) await triggerSysProxy(true, onlyActiveDevice)
  } else {
    if (writeSysProxy) await triggerSysProxy(false, onlyActiveDevice)
    await patchAppConfigIpc({ proxyMode: false })
    await mihomoHotReloadConfig()
  }
}
```

Calculate the system-proxy disabled reason exactly once from the current configuration:

```ts
const disabledReason: TakeoverDisabledReason | null =
  writeSysProxy && sysProxyMode === 'manual' && mixedPort === 0
    ? 'system-proxy-port-unavailable'
    : null
```

After success or rollback, refresh both SWR contexts. On successful completion, call this once:

```ts
window.electron.ipcRenderer.send('updateFloatingWindow')
window.electron.ipcRenderer.send('updateTrayMenu')
await updateTrayIcon()
```

When disconnected, `setTakeoverMode(mode)` only patches `{ mainSwitchMode: mode }`. When connected, it executes the transition first and saves `mainSwitchMode` only after the target activates. `setConnected(false)` targets the selected mode with `targetConnected: false`, which disables both modes through the transition plan.

- [ ] **Step 5: Implement the outbound controller**

Expose this interface from `use-outbound-mode-controller.ts`:

```ts
export interface OutboundModeController {
  mode: HomeOutboundMode
  busy: boolean
  globalAllowed: boolean
  setMode: (mode: HomeOutboundMode) => Promise<void>
}
```

Implement the existing update order using raw IPC functions:

```ts
await patchControlledIpc({ mode: nextMode })
await patchMihomoConfig({ mode: nextMode })
if (autoCloseConnection) await mihomoCloseAllConnections()
mutateGroups()
mutateControledMihomoConfig()
window.electron.ipcRenderer.send('updateTrayMenu')
```

Reject `global` before making IPC calls when `getOutboundModeAvailability` returns `allowed: false`. Keep `busy` true for the entire sequence and restore it in `finally`.

- [ ] **Step 6: Run unit and type checks**

Run: `pnpm test:unit src/renderer/src/features/home/outbound-mode.test.ts src/renderer/src/features/home/takeover-transition.test.ts`

Expected: 5 tests PASS.

Run: `pnpm run typecheck:web`

Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/renderer/src/features/home
git commit -m "feat: centralize home mode controllers"
```

---

### Task 5: Secure Subscription Favicon Cache

**Files:**
- Modify: `src/shared/types/app.d.ts:116-137`
- Create: `src/main/utils/favicon.ts`
- Test: `src/main/utils/favicon.test.ts`
- Modify: `src/main/config/profile.ts:79-106,170-188,190-406`

**Interfaces:**
- Produces: optional `ProfileItem.favicon?: string`.
- Produces: `validatePublicHttpUrl(input, lookup?)`.
- Produces: `extractFaviconUrl(html, pageUrl)`.
- Produces: `resolveWebsiteFavicon(options): Promise<string | null>`.
- Consumes: existing Axios and subscription proxy settings.

- [ ] **Step 1: Add the profile field and write failing URL-safety tests**

Add `favicon?: string` immediately after `logo?: string` in `ProfileItem`.

Create `src/main/utils/favicon.test.ts`:

```ts
import assert from 'node:assert/strict'
import test from 'node:test'
import { extractFaviconUrl, validatePublicHttpUrl } from './favicon'

const publicLookup = async (): Promise<Array<{ address: string; family: number }>> => [
  { address: '93.184.216.34', family: 4 }
]

test('accepts a public https website without credentials', async () => {
  const url = await validatePublicHttpUrl('https://example.com/account', publicLookup)
  assert.equal(url?.toString(), 'https://example.com/account')
})

test('rejects credentials, localhost, and private addresses', async () => {
  assert.equal(await validatePublicHttpUrl('https://user:pass@example.com', publicLookup), null)
  assert.equal(await validatePublicHttpUrl('http://localhost', publicLookup), null)
  assert.equal(
    await validatePublicHttpUrl('http://internal.example', async () => [
      { address: '192.168.1.8', family: 4 }
    ]),
    null
  )
})

test('resolves a relative declared icon against the website', () => {
  assert.equal(
    extractFaviconUrl(
      '<html><head><link rel="icon" href="/assets/site-icon.png"></head></html>',
      'https://example.com/account'
    ),
    'https://example.com/assets/site-icon.png'
  )
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test:unit src/main/utils/favicon.test.ts`

Expected: FAIL with a module-not-found error for `./favicon`.

- [ ] **Step 3: Implement URL validation and icon extraction**

Create `src/main/utils/favicon.ts` with a `node:net` `BlockList` containing these ranges:

```ts
blockList.addSubnet('10.0.0.0', 8, 'ipv4')
blockList.addSubnet('0.0.0.0', 8, 'ipv4')
blockList.addSubnet('100.64.0.0', 10, 'ipv4')
blockList.addSubnet('127.0.0.0', 8, 'ipv4')
blockList.addSubnet('169.254.0.0', 16, 'ipv4')
blockList.addSubnet('172.16.0.0', 12, 'ipv4')
blockList.addSubnet('192.168.0.0', 16, 'ipv4')
blockList.addSubnet('198.18.0.0', 15, 'ipv4')
blockList.addSubnet('224.0.0.0', 4, 'ipv4')
blockList.addSubnet('240.0.0.0', 4, 'ipv4')
blockList.addSubnet('::', 128, 'ipv6')
blockList.addSubnet('::1', 128, 'ipv6')
blockList.addSubnet('fc00::', 7, 'ipv6')
blockList.addSubnet('fe80::', 10, 'ipv6')
```

Use these exported contracts:

```ts
export type LookupAll = (
  hostname: string
) => Promise<Array<{ address: string; family: number }>>

export async function validatePublicHttpUrl(
  input: string,
  lookupAll: LookupAll = async (hostname) => lookup(hostname, { all: true })
): Promise<URL | null>

export function extractFaviconUrl(html: string, pageUrl: string): string | null

export interface ResolveWebsiteFaviconOptions {
  home: string
  proxy?: { protocol: string; host: string; port: number }
}

export async function resolveWebsiteFavicon(
  options: ResolveWebsiteFaviconOptions
): Promise<string | null>
```

`validatePublicHttpUrl` must reject non-HTTP protocols, embedded credentials, `localhost`, `.localhost`, and every DNS result contained in the block list. Normalize IPv4-mapped IPv6 addresses before checking the list. `extractFaviconUrl` must inspect `<link>` tags for a `rel` token containing `icon`, read either quoted form of `href`, and resolve it through `new URL(href, pageUrl)`.

- [ ] **Step 4: Implement bounded manual redirect fetching**

Inside `favicon.ts`, implement a private `fetchSafeUrl` that:

- validates the initial URL and every redirect with `validatePublicHttpUrl`;
- calls Axios with `maxRedirects: 0`, `timeout: 3000`, and `validateStatus: (status) => status >= 200 && status < 400`;
- follows at most three `Location` redirects itself;
- caps HTML at 512 KiB and image data at 256 KiB;
- accepts only `image/*` for the final icon response;
- returns a `data:<content-type>;base64,...` string.

Use this loop shape so redirects cannot bypass validation:

```ts
async function fetchSafeUrl(
  input: string,
  responseType: 'text' | 'arraybuffer',
  proxy?: ResolveWebsiteFaviconOptions['proxy']
): Promise<{ url: URL; data: string | Buffer; contentType: string }> {
  let current = input
  for (let redirects = 0; redirects <= 3; redirects++) {
    const safeUrl = await validatePublicHttpUrl(current)
    if (!safeUrl) throw new Error('Unsafe favicon URL')
    const response = await axios.get(safeUrl.toString(), {
      proxy,
      responseType,
      maxRedirects: 0,
      timeout: 3000,
      maxContentLength: responseType === 'text' ? 512 * 1024 : 256 * 1024,
      validateStatus: (status) => status >= 200 && status < 400
    })
    if (response.status < 300) {
      return {
        url: safeUrl,
        data: response.data,
        contentType: String(response.headers['content-type'] ?? '').toLowerCase()
      }
    }
    const location = response.headers.location
    if (!location || redirects === 3) throw new Error('Invalid favicon redirect')
    current = new URL(location, safeUrl).toString()
  }
  throw new Error('Favicon redirect limit exceeded')
}
```

`resolveWebsiteFavicon` first fetches the page as text, tries the declared icon, then tries `/favicon.ico`. It returns `null` for every network, parsing, validation, size, or content-type failure.

- [ ] **Step 5: Preserve and asynchronously refresh cached favicons**

In `createProfile`, load the existing item once. After response headers set `newItem.home`, preserve the cache only when the home URL is unchanged:

```ts
if (existingItem?.home === newItem.home) {
  newItem.favicon = existingItem.favicon
}
```

Add this helper in `profile.ts`:

```ts
async function refreshProfileFavicon(profile: ProfileItem): Promise<void> {
  if (profile.type !== 'remote' || !profile.home) return
  const { 'mixed-port': mixedPort = 0 } = (await getRuntimeConfig()) ?? {}
  const favicon = await resolveWebsiteFavicon({
    home: profile.home,
    proxy:
      profile.useProxy && mixedPort
        ? { protocol: 'http', host: '127.0.0.1', port: mixedPort }
        : undefined
  })
  if (!favicon) return
  const latest = await getProfileItem(profile.id)
  if (!latest || latest.home !== profile.home || latest.favicon === favicon) return
  await updateProfileItem({ ...latest, favicon })
  mainWindow?.webContents.send('profileConfigUpdated')
}
```

At the end of a successful `addProfileItem`, start it without awaiting:

```ts
void refreshProfileFavicon(newItem).catch(() => undefined)
```

- [ ] **Step 6: Run tests and main-process type checks**

Run: `pnpm test:unit src/main/utils/favicon.test.ts`

Expected: 3 tests PASS.

Run: `pnpm run typecheck:node`

Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/shared/types/app.d.ts src/main/utils/favicon.ts src/main/utils/favicon.test.ts src/main/config/profile.ts
git commit -m "feat: cache subscription favicons safely"
```

---

### Task 6: Modern Home Dashboard Composition

**Files:**
- Create: `src/renderer/src/components/home/connection-card.tsx`
- Create: `src/renderer/src/components/home/mode-control-panel.tsx`
- Create: `src/renderer/src/components/home/subscription-card.tsx`
- Create: `src/renderer/src/components/home/active-proxy-card.tsx`
- Modify: `src/renderer/src/pages/home.tsx:1-510`
- Modify: `src/renderer/src/locales/zh-CN/index.ts:233-252`
- Modify: `src/renderer/src/locales/en-US/index.ts:158-178`
- Modify: `src/renderer/src/locales/ru-RU/index.ts:159-180`

**Interfaces:**
- Consumes: all Task 1-5 interfaces.
- Produces: stateless cards with explicit props; `Home` remains the composition and navigation layer.
- Preserves: existing guide selectors for add profile, profile header, announcement, power, group selector, and support link.

- [ ] **Step 1: Replace the home composition with references to the new cards**

Keep the current add-profile modal flow, profile lookup, traffic store, group lookup, and subscription refresh handler. Replace the current returned dashboard markup with this structure before creating the card files:

```tsx
<BasePage title={t('sider.home')} contentClassName="pt-1" contentWidth="dashboard">
  {!hasProfiles ? (
    <EmptyState
      icon={WifiOff}
      title={t('pages.profiles.emptyTitle')}
      description={t('pages.profiles.emptyDescription')}
      action={
        <Button onClick={handleAddProfile} data-guide="home-add-profile-btn">
          <PlusCircle className="size-4" />
          {t('pages.profiles.addProfile')}
        </Button>
      }
    />
  ) : (
    <main className="grid gap-3 pb-1 min-[700px]:grid-cols-[minmax(280px,0.9fr)_minmax(320px,1.1fr)]">
      <ConnectionCard controller={takeover} traffic={trafficInfo} />
      <div className="grid content-start gap-3">
        <ModeControlPanel
          takeover={takeover}
          outbound={outbound}
          onOpenTunSettings={() => navigate('/tun')}
          onOpenSystemProxySettings={() => navigate('/sysproxy')}
        />
        <ActiveProxyCard
          group={firstGroup}
          onOpen={() => navigate('/proxies', { state: { fromHome: true } })}
        />
      </div>
      {currentProfile && (
        <SubscriptionCard
          className="min-[700px]:col-span-2"
          profile={currentProfile}
          updating={updating}
          onUpdate={handleUpdateProfile}
        />
      )}
    </main>
  )}
</BasePage>
```

- [ ] **Step 2: Run the renderer type check to verify the composition is incomplete**

Run: `pnpm run typecheck:web`

Expected: FAIL with missing modules for the four home card components and undefined controller bindings.

- [ ] **Step 3: Implement `ConnectionCard`**

Use this prop contract:

```ts
interface ConnectionCardProps {
  controller: TakeoverController
  traffic: { upTotal: number; downTotal: number }
}
```

Move `ConnectedTimer` from the old page into this component. Preserve `data-guide="home-power-toggle"`. The button calls `controller.setConnected(!controller.connected)`, displays a spinner whenever `controller.busy`, and uses these status keys:

```ts
const statusKey = {
  idle: controller.connected ? 'pages.home.connected' : 'pages.home.disconnected',
  connecting: 'pages.home.connecting',
  disconnecting: 'pages.home.disconnecting',
  switching: 'pages.home.switching'
}[controller.status]
```

Catch rejected controller promises at the card boundary and show a localized toast. Keep the button dimensions stable across idle and loading states.

- [ ] **Step 4: Implement `ModeControlPanel` and `ActiveProxyCard`**

Use these contracts:

```ts
interface ModeControlPanelProps {
  takeover: TakeoverController
  outbound: OutboundModeController
  onOpenTunSettings: () => void
  onOpenSystemProxySettings: () => void
}

interface ActiveProxyCardProps {
  group: ControllerMixedGroup | undefined
  onOpen: () => void
}
```

Render two `SegmentedControl` instances. The takeover options are `sysproxy` and `tun`; the outbound options are `rule` and `global`. Disable global with `pages.home.globalModeUnavailable` when `outbound.globalAllowed` is false. Disable system proxy with `pages.home.systemProxyUnavailable` when the takeover controller reports its disabled reason. Keep both advanced settings actions visible as icon buttons.

`ActiveProxyCard` preserves `data-guide="home-group-selector"`, shows `group.now || group.name`, and renders `pages.home.noProxyAvailable` without hiding the card when group data is absent.

- [ ] **Step 5: Implement `SubscriptionCard`**

Use this contract:

```ts
interface SubscriptionCardProps {
  profile: ProfileItem
  updating: boolean
  onUpdate: () => Promise<void>
  className?: string
}
```

Compute metrics with `getSubscriptionMetrics(profile.extra)`. Render identity with this strict priority:

```ts
const identityImage = profile.favicon || profile.logo
```

If the image fails, hide it and show a globe fallback in the same fixed-size container. Preserve `data-guide="home-profile-header"` and `data-guide="home-profile-announce"`. Show used, remaining, total, expiry, remaining days, last update, progress, and warning tone in one card. Use `getOfficialWebsite(profile)` for the official button and never read `profile.url` for that action. Preserve `data-guide="home-support-link"` for the support action.

- [ ] **Step 6: Add all home translations**

Add these keys under `pages.home` in all three locale files:

```ts
switching
proxyTakeoverMode
systemProxy
virtualInterface
outboundMode
ruleMode
globalMode
globalModeUnavailable
systemProxyUnavailable
configureSystemProxy
configureVirtualInterface
officialWebsite
support
usedTraffic
totalTraffic
lastUpdated
notProvided
currentProxy
noProxyAvailable
announcement
connect
disconnect
```

Use these English values as the semantic source:

```ts
switching: 'Switching mode...',
proxyTakeoverMode: 'Proxy takeover',
systemProxy: 'System proxy',
virtualInterface: 'Virtual network interface',
outboundMode: 'Outbound mode',
ruleMode: 'Rule',
globalMode: 'Global',
globalModeUnavailable: 'The active subscription does not allow global mode',
systemProxyUnavailable: 'Configure a mixed port before using system proxy',
configureSystemProxy: 'Configure system proxy',
configureVirtualInterface: 'Configure virtual network interface',
officialWebsite: 'Official website',
support: 'Support',
usedTraffic: 'Used',
totalTraffic: 'Total',
lastUpdated: 'Last updated',
notProvided: 'Not provided',
currentProxy: 'Current proxy',
noProxyAvailable: 'Proxy information is unavailable',
announcement: 'Announcement',
connect: 'Connect',
disconnect: 'Disconnect'
```

Use these Simplified Chinese values:

```ts
switching: '切换模式中...',
proxyTakeoverMode: '代理模式',
systemProxy: '系统代理',
virtualInterface: '虚拟网卡',
outboundMode: '出站模式',
ruleMode: '规则模式',
globalMode: '全局模式',
globalModeUnavailable: '当前订阅不允许使用全局模式',
systemProxyUnavailable: '使用系统代理前请先配置混合端口',
configureSystemProxy: '配置系统代理',
configureVirtualInterface: '配置虚拟网卡',
officialWebsite: '前往官网',
support: '获取支持',
usedTraffic: '已用流量',
totalTraffic: '总流量',
lastUpdated: '上次更新',
notProvided: '未提供',
currentProxy: '当前节点',
noProxyAvailable: '暂时无法获取节点信息',
announcement: '公告',
connect: '连接',
disconnect: '断开'
```

Use these Russian values:

```ts
switching: 'Переключение режима...',
proxyTakeoverMode: 'Режим прокси',
systemProxy: 'Системный прокси',
virtualInterface: 'Виртуальный сетевой интерфейс',
outboundMode: 'Режим маршрутизации',
ruleMode: 'По правилам',
globalMode: 'Глобальный',
globalModeUnavailable: 'Активная подписка не разрешает глобальный режим',
systemProxyUnavailable: 'Настройте смешанный порт перед использованием системного прокси',
configureSystemProxy: 'Настроить системный прокси',
configureVirtualInterface: 'Настроить виртуальный интерфейс',
officialWebsite: 'Официальный сайт',
support: 'Поддержка',
usedTraffic: 'Использовано',
totalTraffic: 'Всего',
lastUpdated: 'Последнее обновление',
notProvided: 'Не указано',
currentProxy: 'Текущий прокси',
noProxyAvailable: 'Информация о прокси недоступна',
announcement: 'Объявление',
connect: 'Подключить',
disconnect: 'Отключить'
```

- [ ] **Step 7: Verify the home page**

Run: `pnpm test:unit "src/**/*.test.ts" "src/**/*.test.tsx"`

Expected: all tests PASS.

Run: `pnpm run typecheck:web`

Expected: exit 0.

Run: `pnpm exec electron-vite build`

Expected: renderer, preload, and main bundles build successfully.

- [ ] **Step 8: Commit**

```bash
git add src/renderer/src/components/home src/renderer/src/pages/home.tsx src/renderer/src/locales
git commit -m "feat: rebuild home as modern dashboard"
```

---

### Task 7: Remove Competing Mode Controls and Verify the Milestone

**Files:**
- Modify: `src/renderer/src/components/app-sidebar.tsx:1-117`
- Delete: `src/renderer/src/components/sider/outbound-mode-switcher.tsx`
- Modify: `src/renderer/src/pages/settings.tsx:1-52`
- Delete: `src/renderer/src/components/settings/proxy-switches.tsx`
- Modify: `src/renderer/src/utils/driver.ts:106-122` only if a preserved selector changed during Task 6.

**Interfaces:**
- Consumes: home controls from Task 6.
- Produces: one authoritative mode-control surface on the home page.
- Preserves: `/tun` and `/sysproxy` routes for advanced configuration.

- [ ] **Step 1: Remove the outbound switcher from the sidebar**

Delete the `OutboundModeSwitcher` import, `currentProfile`, and `globalModeAllowed` calculations. Replace the sidebar footer with only the collapse menu:

```tsx
<SidebarFooter>
  <SidebarMenu>
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip={t('common.toggleSidebar')}
        onClick={toggleSidebar}
        className="cursor-pointer"
      >
        {collapsed ? (
          <ExpandedIcon className="size-4 shrink-0" />
        ) : (
          <CollapsedIcon className="size-4 shrink-0" />
        )}
        <span>{t('common.hideSidebar')}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  </SidebarMenu>
</SidebarFooter>
```

Delete `src/renderer/src/components/sider/outbound-mode-switcher.tsx` after confirming no remaining imports with the code graph.

- [ ] **Step 2: Remove duplicate overview switches from Settings**

Remove the `ProxySwitches` import and `<ProxySwitches />` call from `settings.tsx`. Delete `src/renderer/src/components/settings/proxy-switches.tsx`. Advanced TUN and system-proxy configuration remains reachable from the home mode card through `/tun` and `/sysproxy`.

- [ ] **Step 3: Confirm onboarding selectors remain valid**

Search the rendered home components for these exact selectors:

```text
[data-guide="home-add-profile-btn"]
[data-guide="home-profile-header"]
[data-guide="home-profile-announce"]
[data-guide="home-power-toggle"]
[data-guide="home-group-selector"]
[data-guide="home-support-link"]
```

If a selector was moved, keep its string unchanged in the new component. Do not change the guide sequence unless the element no longer exists.

- [ ] **Step 4: Run automated verification**

Run: `pnpm test:unit "src/**/*.test.ts" "src/**/*.test.tsx"`

Expected: all tests PASS.

Run: `pnpm run typecheck`

Expected: node and renderer type checks exit 0.

Run: `pnpm exec eslint . --ext .js,.jsx,.cjs,.mjs,.ts,.tsx,.cts,.mts`

Expected: exit 0 with no errors.

Run: `pnpm exec electron-vite build`

Expected: exit 0 and all three renderer entry points build.

- [ ] **Step 5: Perform the manual desktop verification matrix**

Verify each case and record the result in the task notes:

```text
800×600, collapsed sidebar, light theme
800×600, expanded sidebar, dark theme
800×700 default window, light and dark themes
Disconnected: choose TUN, then connect and disconnect
Disconnected: choose system proxy, then connect and disconnect
Connected: switch TUN → system proxy
Connected: switch system proxy → TUN
System proxy unavailable because mixed-port is zero
Global mode allowed and disallowed by the active profile
Finite, unlimited, expiring, expired, and metadata-free subscriptions
Favicon success, favicon failure, provider-logo fallback, globe fallback
Official website and support opening in the external browser
Subscription refresh while the existing card remains visible
Active proxy navigation returning from /proxies
Tray menu, tray icon, and floating-window state after every mode operation
Keyboard focus and arrow navigation for both segmented controls
Reduced-motion preference
```

- [ ] **Step 6: Commit the control-surface cleanup**

```bash
git add src/renderer/src/components/app-sidebar.tsx src/renderer/src/pages/settings.tsx src/renderer/src/utils/driver.ts
git add -u src/renderer/src/components/sider/outbound-mode-switcher.tsx src/renderer/src/components/settings/proxy-switches.tsx
git commit -m "refactor: make home the primary mode control surface"
```

## Completion Gate

The milestone is complete only when Tasks 1-7 are committed, every automated verification command exits successfully, and every manual verification row has an observed result. Do not start the global page-migration plan until the `PageShell`, `SurfaceCard`, `SegmentedControl`, takeover controller, and home card prop interfaces have passed this gate.
