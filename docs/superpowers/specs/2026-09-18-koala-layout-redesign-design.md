# Koala Layout Redesign Design

**Date:** 2026-09-18

## Summary

Koala will be reorganized around a single, easy-to-understand home dashboard. The home page will let users choose the proxy takeover method, choose the outbound routing mode, connect or disconnect, inspect the active subscription, and open the active proxy selector without visiting multiple pages.

The redesign will use a restrained desktop-tool visual style: clear hierarchy, low-noise surfaces, consistent spacing, and color reserved for meaningful status. It will be delivered incrementally so existing Mihomo, subscription, tray, and floating-window behavior remains stable while the main application adopts a unified shell and component system.

## Context

The current application is an Electron and React desktop app with a minimum window size of 800 × 600 and a default size of 800 × 700. The renderer uses Tailwind CSS v4, Radix-based components, shared CSS variables, React Router, SWR, and Zustand.

The current home page already contains connection status, subscription information, traffic data, and a proxy entry point, but these concerns live in one component of more than 400 lines. The two most common routing controls are split across the application:

- `mainSwitchMode` chooses virtual network interface or system proxy behavior from the settings page.
- Mihomo `mode` chooses rule or global routing from a switcher in the sidebar footer.

This makes the core workflow harder to discover and also causes page layout, card styling, and action placement to vary between features.

## Goals

- Let users complete the primary workflow from the home page: choose takeover mode, choose outbound mode, connect, inspect the active subscription, and open the active proxy selector.
- Make system proxy and virtual network interface mutually exclusive takeover modes.
- Make rule and global routing visible on the home page, including an explanation when global routing is unavailable.
- Show the current subscription's identity, favicon, traffic, expiry, update state, and official website action in one card.
- Establish a unified application shell, page hierarchy, surface treatment, spacing scale, status language, and interaction behavior.
- Preserve existing configuration formats and user settings wherever possible.
- Keep the default 800 × 700 window comfortable and keep the 800 × 600 minimum usable without clipped actions.
- Support light and dark themes, Windows and macOS title-bar behavior, keyboard interaction, and reduced-motion preferences.

## Non-goals

- Replacing Mihomo or changing how profiles, rules, providers, or proxy groups are represented.
- Reorganizing every settings option or changing advanced networking semantics unrelated to the two home-page mode controls.
- Redesigning the tray menu or floating window in the first delivery. Their state synchronization must remain correct, and shared tokens may be adopted later.
- Turning the desktop application into a mobile layout.
- Using a subscription URL as an official website fallback. Subscription URLs may contain private tokens and must never be shown or opened as a public website action.
- Adding a third-party favicon service or any external analytics dependency.

## Experience Principles

### One screen for routine work

The home page is a control dashboard rather than a decorative landing page. Routine actions must be visible without scrolling at the default window size whenever the active subscription supplies normal metadata.

### Status before decoration

Connection state, current modes, current subscription, and current proxy are visually dominant. Background artwork and gradients are optional decoration and may not reduce contrast or compete with status information.

### Color has one meaning

Green indicates an active or successful state, amber indicates attention, red indicates failure or expiry, and neutral colors represent inactive choices. Selection and hover states must not reuse success colors unless the selected item is genuinely active.

### Progressive detail

The home page shows the information required to make a decision. Full profile editing, proxy-group management, and advanced networking settings remain on their dedicated pages.

## Information Architecture

### Application shell

The left sidebar remains the primary navigation surface. It contains navigation and the collapse control only. The outbound-mode switcher moves out of the sidebar footer and into the home dashboard.

Every main page uses the same shell:

1. A platform-aware title bar and drag region.
2. A page header with title, optional description, and page-level actions.
3. A scrollable page body with consistent horizontal padding and content width.
4. Shared empty, loading, error, and permission states.

The background map may remain as a subtle, low-opacity decorative layer, but every page must remain visually complete if the map is removed. Primary content sits on readable semantic surfaces instead of relying on backdrop blur alone.

### Navigation

Existing top-level destinations remain available. The redesign does not remove features or hide advanced pages. The sidebar provides location; the home page provides daily controls.

## Home Dashboard

### Responsive structure

At a comfortable content width, the dashboard uses two balanced columns:

- The left column contains connection status and the primary power control.
- The right column contains the two mode selectors and active proxy entry.
- The subscription card spans the available width below them.

When the content area becomes narrow, including an expanded sidebar at the minimum window width, these sections stack into one column. The power control scales down before actions wrap or become clipped. The page may scroll at 800 × 600, but all controls remain reachable and the connection control stays near the top.

### Connection card

The connection card contains:

- Current state: disconnected, connecting, connected, disconnecting, or switching mode.
- A single primary connect/disconnect control.
- Connected duration when active.
- Current upload and download totals or rates using the existing traffic store.
- A concise sentence identifying the active takeover mode.

The power control remains visually prominent but is reduced from a decorative centerpiece to an operational control. Loading states replace the icon without changing the button's dimensions.

### Mode control panel

The panel contains two shared segmented controls.

**Proxy takeover mode**

- System proxy
- Virtual network interface

**Outbound routing mode**

- Rule mode
- Global mode

Each option includes an icon, label, selected state, focus state, and disabled explanation. Advanced configuration links remain available as secondary icon actions and route to the existing system-proxy or TUN settings pages.

When the current subscription has `globalMode === false`, global mode is disabled. The interface explains that the active subscription does not permit global mode instead of silently hiding the option.

### Active proxy entry

The dashboard displays the first available proxy group and its selected proxy. The entire row opens the existing proxies page and preserves the current `fromHome` navigation behavior. Missing group data produces a neutral loading or unavailable state rather than removing the region and shifting the layout.

### Subscription card

The current subscription card contains:

- Website favicon or provider identity fallback.
- Subscription name and remote/local label.
- Announcement preview when present, limited so it cannot dominate the dashboard.
- Used, remaining, and total traffic.
- A progress bar when the subscription provides a finite total.
- Expiry date and remaining days.
- Last successful update time.
- Update subscription action for remote profiles.
- Official website action when a valid HTTP or HTTPS `home` URL exists.
- Expiry warning or expired status in the same card rather than replacing the normal subscription identity.

The website button uses `homeName` when available and otherwise uses the localized label “Official website.” A support link remains a separate secondary action and is never presented as the official website unless it is also explicitly supplied as `home`.

When traffic or expiry metadata is absent, the card remains visible and displays “Not provided” or an unlimited state. It must not disappear because one optional metadata field is missing.

## Proxy Takeover Interaction Model

System proxy and virtual network interface are mutually exclusive from the user's perspective.

### Disconnected mode change

Changing the selected takeover mode while disconnected updates `mainSwitchMode` only. It does not start the proxy automatically.

### Connected mode change

Changing modes while connected performs a controlled handoff:

1. Lock the power and both mode controls.
2. Display the “Switching mode” state.
3. Disable the currently active takeover mode.
4. Enable the selected takeover mode and its required dependencies.
5. Hot-reload Mihomo when required.
6. Synchronize the tray menu, floating window, and tray icon once after success.
7. If activation fails, attempt to restore the previous mode and report a clear error.

A brief network interruption is acceptable. Both takeover modes must not be intentionally left active to avoid overlap.

### Connect and disconnect

Connect enables only the selected takeover mode. Disconnect disables both TUN and system-proxy state, which also repairs legacy states in which both may have been active.

For system proxy, existing manual-mode and mixed-port validation remains in effect. The disabled control explains the missing configuration and links to the relevant settings page.

### Controller boundary

Mode transition logic moves out of the page component into a dedicated controller hook. The controller exposes a small state model:

- `connectionState`
- `selectedTakeoverMode`
- `activeTakeoverMode`
- `setTakeoverMode(mode)`
- `setConnected(enabled)`
- `disabledReason`

The page renders this state but does not duplicate TUN, system proxy, hot-reload, tray, or rollback sequencing.

## Outbound Mode Interaction Model

The existing rule/global update sequence remains authoritative:

1. Update controlled Mihomo configuration.
2. Patch the running Mihomo mode.
3. Close existing connections when `autoCloseConnection` is enabled.
4. Refresh proxy groups.
5. Synchronize the tray menu.

The home control owns the primary interaction. Other pages may show the current outbound mode as read-only context, but they must not introduce a second visually competing primary switcher.

## Favicon and Official Website Handling

`ProfileItem` gains an optional cached `favicon` value, separate from the existing provider `logo`.

For remote subscriptions, favicon resolution happens as a best-effort background task in the Electron main process after the updated profile metadata has been saved. Subscription refresh does not wait for favicon discovery to finish.

1. Validate `home` as an HTTP or HTTPS URL.
2. Reject embedded credentials and automatic requests to loopback, link-local, and private-network destinations. Revalidate every redirect and cap the redirect count.
3. Fetch the website with a short timeout and the profile's configured proxy behavior where applicable.
4. Prefer a declared page icon and fall back to `/favicon.ico`.
5. Accept image content only, enforce bounded response and decoded-image sizes, and convert it to a data URL.
6. Store the result in `ProfileItem.favicon` for offline rendering.

Display priority is cached favicon, provider logo, then a neutral globe fallback. Favicon failure is non-blocking, does not fail subscription updates, and does not produce a toast on every refresh.

The official website button opens only a validated `home` URL through Electron's external-browser handling. The renderer must not navigate the app window to external content.

## Shared Visual System

### Tokens

The existing CSS variables are consolidated into semantic groups:

- Application background and decorative background.
- Surface, elevated surface, and interactive surface.
- Primary, secondary, muted, success, warning, and destructive text.
- Default, strong, selected, success, warning, and destructive borders.
- Compact, default, card, and modal corner radii.
- Small, medium, and large elevation shadows.
- Fast, default, and slow motion durations.

Light and dark themes use the same semantic names. Feature components do not introduce one-off color values for states already represented by a token.

### Shared components

The redesign establishes these reusable units:

- `PageShell`: title, description, actions, content padding, and scroll behavior.
- `SurfaceCard`: consistent surface, border, radius, and optional header/footer.
- `SegmentedControl`: accessible single-selection control for both mode selectors.
- `StatusBadge`: neutral, active, warning, and destructive states.
- `Metric`: label, value, supporting text, and optional progress visualization.
- `EmptyState`: icon, title, description, and one primary action.
- `ExternalLinkButton`: consistent external-link affordance and icon.

Existing low-level Radix-based controls remain in use. The new units compose them rather than replacing the component library.

### Page migration rules

- Page headers and content padding must come from `PageShell`.
- Feature cards must use `SurfaceCard` unless they require a documented specialized surface.
- Primary actions appear in predictable header or card-footer positions.
- Settings retain row-based controls but adopt the same section spacing and surface treatment.
- Destructive actions remain visually distinct and are not mixed with routine navigation actions.

## Component Boundaries

The home page becomes a thin composition layer. Responsibilities are separated as follows:

- Home page: load shared contexts, arrange sections, and handle navigation.
- Proxy-mode controller: connection and takeover transitions, rollback, and synchronization.
- Outbound-mode controller: rule/global transitions and availability.
- Connection card: render connection state and traffic.
- Mode control panel: render the two segmented controls and advanced-setting links.
- Subscription card: format and render subscription metadata and actions.
- Active proxy card: render the current group/proxy entry.
- Subscription identity resolver in the main process: fetch and cache favicons.

Formatting helpers for bytes, dates, remaining days, and subscription status are pure functions shared between the home and profiles views so both pages use the same terminology.

## Loading, Empty, and Error States

### No profiles

The home page shows a shared empty state with a single “Add subscription” action. Mode and connection controls are not displayed until a profile exists.

### Updating subscription

Only the update action enters a loading state. The existing card data remains visible, preventing layout movement and preserving context.

### Connection and mode errors

Errors use a concise toast with an actionable description. The dashboard returns to the actual detected state after the failed operation rather than assuming the requested state succeeded.

### Missing metadata

Missing favicon, traffic, expiry, announcement, support URL, or official website does not break the card. Each field has an explicit fallback or is omitted without changing the primary hierarchy.

### Expiry

Subscriptions within the existing warning period show an amber warning. Expired subscriptions show a destructive status. The name, favicon, traffic, update, and official-site actions remain accessible in both states.

## Accessibility and Motion

- Segmented controls use radio-group semantics and support arrow-key navigation.
- The power button has a stable accessible name reflecting the next action.
- Loading state is announced without repeatedly interrupting assistive technology.
- Icon-only actions include tooltips and accessible labels.
- Text and controls meet WCAG AA contrast in light and dark themes.
- Focus indicators remain visible over decorative backgrounds.
- Animations respect `prefers-reduced-motion` and never block input after their visual duration.

## Localization

All new labels, disabled reasons, statuses, fallback text, and errors use the existing i18n system. Chinese and English copy must be added together. Mode terminology remains consistent across home, settings, tray, and onboarding guidance.

## Delivery Strategy

### Phase 1: Foundations

Introduce semantic tokens, `PageShell`, `SurfaceCard`, `SegmentedControl`, shared status components, and the unified page spacing rules. Adopt them in the shell and home without changing network behavior.

### Phase 2: Interaction controllers

Extract proxy takeover and outbound transition logic from the home page, settings, and sidebar switcher. Add the mutually exclusive handoff and rollback behavior while retaining tray and floating-window synchronization.

### Phase 3: Home dashboard

Build the new connection, mode, subscription, and active-proxy sections. Move outbound mode out of the sidebar and add advanced-setting links from the home controls.

### Phase 4: Subscription identity

Add favicon resolution and caching, the official website action, consistent metadata formatting, and expiry states.

### Phase 5: Global migration

Migrate profiles, proxies, resources, rules, connections, logs, and settings to the shared page shell and card rules. This phase changes presentation and composition, not feature semantics.

### Phase 6: Polish and verification

Verify minimum/default/large window sizes, expanded/collapsed sidebar, light/dark themes, both supported title-bar styles, keyboard navigation, reduced motion, and failure recovery.

## Verification Strategy

No new third-party test framework is required. The existing `tsx` development dependency can run focused Node test files for pure subscription formatting and takeover-transition planning.

Every delivery phase must pass:

- Node and renderer TypeScript checks.
- ESLint without introducing new warnings.
- Electron renderer production build.
- Focused unit tests for pure state and formatting helpers.

Manual workflow verification covers:

- Connect and disconnect in both takeover modes.
- Switch takeover mode while disconnected and while connected.
- Failure during target activation and restoration of the previous mode.
- Switch rule/global mode with automatic connection closing enabled and disabled.
- Global mode disabled by the active profile.
- Subscription with full, partial, unlimited, expiring, expired, and missing metadata.
- Successful and failed favicon retrieval.
- Official website and support links opening externally.
- Subscription refresh, active proxy navigation, tray synchronization, and floating-window synchronization.
- 800 × 600, 800 × 700, and expanded window layouts in light and dark themes.

## Acceptance Criteria

- A user can choose system proxy or virtual network interface from the home page.
- A user can choose rule or global outbound mode from the home page.
- System proxy and virtual network interface are not left active together after a completed user operation.
- Switching takeover modes while connected shows one coherent transition and restores the previous mode when the new mode cannot start.
- The home page shows the current subscription even when optional traffic or expiry metadata is absent.
- The subscription card displays a cached website favicon when available and a deterministic fallback otherwise.
- The official website action opens only a validated profile `home` URL in the external browser.
- The subscription card preserves update, expiry, traffic, and provider identity information in warning and error states.
- Sidebar, page headers, content spacing, cards, empty states, status colors, and primary actions use the shared visual rules.
- The application remains fully operable at 800 × 600 and comfortable at the default 800 × 700 size.
- Light/dark themes, Windows/macOS window controls, tray updates, and floating-window updates continue to work.
