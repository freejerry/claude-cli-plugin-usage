# Reset Countdown & Session Name (Second Line) Design Spec

**Date**: 2026-04-21
**Status**: Approved

## Overview

Add a second, low-key line to the status line output that shows:

1. The current session's project/worktree name
2. A countdown to the next rate-limit reset (5h and 7d windows) for Pro/Max users

The existing first line (model / git / context / rate-limits-or-cost) is unchanged. The second line is rendered as plain ANSI-colored text — no powerline background, no arrows — so it stays visually subordinate to the first line.

## Motivation

- The first line shows *current* 5h/7d usage percentages but not how soon the window resets. Users want to know "how long until this resets?" without leaving the status line.
- When multiple Claude Code sessions are open (different projects / worktrees), it's hard to tell at a glance which one you're looking at. Showing the project or worktree name addresses this.
- Horizontal space on the first line is already tight; a second line avoids cramming and keeps both lines easy to scan.

## Visual Design

### Pro / Max

```
 🧠 Opus 4.6  main  ████████░░ 78%  ⚡ 5h 32% │ 7d 15% 
📁 mvp  │  ↻ 5h 2h15m  │  7d 3d12h
```

### API

```
 🧠 Opus 4.6  main  ████████░░ 78%  💰 $1.23 
📁 mvp
```

### Free

```
 🧠 Opus 4.6  main  ████████░░ 78% 
📁 mvp
```

### Second line is omitted entirely (no trailing `\n`) when:

- Second line is disabled via config, OR
- There is nothing to show (no session name AND no rate-limit resets available)

## Session Name Resolution

Resolve in order; use the first non-null value:

1. `worktree.name` (present only when the user is inside a `git worktree`)
2. Last path segment of `workspace.project_dir`
3. Last path segment of `workspace.current_dir`
4. None → omit the `📁 …` block

Examples:

| `worktree.name` | `project_dir`        | Displayed            |
|-----------------|----------------------|----------------------|
| `feat-auth`     | `/.../mvp`           | `📁 feat-auth`       |
| `null`          | `/.../mvp`           | `📁 mvp`             |
| `null`          | `null`, `current_dir=/.../mvp` | `📁 mvp`   |
| All null        | —                    | (omitted)            |

## Reset Countdown Format

`resets_at` is a Unix timestamp (seconds). Compute `delta = resets_at - now` and select format by magnitude:

| delta range          | Format     | Examples        |
|----------------------|------------|-----------------|
| ≥ 1 day              | `{d}d{h}h` | `3d12h`, `1d0h` |
| ≥ 1 hour, < 1 day    | `{h}h{m}m` | `2h15m`, `5h0m` |
| ≥ 1 minute, < 1 hour | `{m}m`     | `45m`, `3m`     |
| > 0, < 1 minute      | `<1m`      | `<1m`           |
| ≤ 0                  | `—`        | `—`             |

### Null / edge cases

- `five_hour.resets_at` is null → omit the `5h …` sub-block; still show `7d …` if available.
- Both `resets_at` are null → omit the entire `↻ …` block; session name still shown if available.
- `used_percentage` is null but `resets_at` is present → countdown still renders (countdown is independent of percentage).

## Layout & Styling

- Second line has **no background fill** and **no powerline arrows** — plain ANSI foreground only.
- Default colors (theme key → ANSI 256):
  - `secondaryText` → `245` (medium gray) — used for icons, labels, values
  - `secondaryDim`  → `240` (darker gray) — used for `│` separator
- Separator spacing: all blocks are joined by ` │ ` (space-pipe-space, 3 columns wide).
- Icon/value spacing: one space between icon and first value (`📁 mvp`, `↻ 5h 2h15m`).
- The resets block uses a single `↻` icon shared by both windows: `↻ 5h {delta}  │  7d {delta}`. If only one window has a non-null `resets_at`, the icon still appears once before the available window, e.g. `↻ 7d 3d12h`.
- Second line does NOT change color based on usage thresholds. The first line already signals warnings via color; the second line is reference information.
- `minimal` and `solarized` themes may override `secondaryText` / `secondaryDim` if desired, but default values are acceptable fallbacks.

## Plan-Specific Behavior

| Plan   | Session name | Reset countdown |
|--------|--------------|-----------------|
| Pro    | Shown        | Shown           |
| Max    | Shown        | Shown           |
| API    | Shown        | Hidden (no rate limits)    |
| Free   | Shown        | Hidden (no rate limits)    |

Session name is plan-independent because project context is useful for everyone. Countdown is only meaningful when `rate_limits` exists in the input JSON.

## Configuration

Extends the existing config at `~/.claude/claude-cli-plugin-usage.json`:

```json
{
  "secondLine": {
    "enabled": true,
    "show": ["session", "resets"]
  }
}
```

- `enabled` (default `true`): master switch. `false` reverts to single-line output, fully backward compatible.
- `show` (default `["session", "resets"]`): which components to render and in what order. Omit items to hide them; e.g. `["session"]` shows only the project name.

Unknown values in `show` are ignored. An empty `show` array is equivalent to `enabled: false`.

## Architecture

### Data Flow (unchanged from existing architecture)

```
stdin (JSON) → parser → detector → powerline renderer → stdout
```

Internally, the renderer now composes two lines and joins them with `\n`, omitting the second line (and its newline) when empty.

### File Changes

| File | Change |
|------|--------|
| `src/parser.js` | Add `sessionName` field using the fallback chain (worktree.name → project_dir basename → current_dir basename). `fiveHourResetsAt` / `sevenDayResetsAt` already exist. |
| `src/format-duration.js` | **New**. Pure function `formatResetDelta(resetsAt, now) → string` implementing the table above. Exported for direct testing. |
| `src/powerline.js` | Extract the current `render` into `renderFirstLine`. Add `renderSecondLine(parsed, plan, config, theme)`. New top-level `render` joins them with `\n` and omits the second line (and newline) when it would be empty. |
| `src/theme.js` | Add `secondaryText` (default `245`) and `secondaryDim` (default `240`) keys to all built-in themes. |
| `src/config.js` | Add `secondLine` default (`{ enabled: true, show: ["session", "resets"] }`) and merge/validate logic. |
| `tests/format-duration.test.js` | **New**. Cover all rows of the format table plus null and negative delta. |
| `tests/parser.test.js` | Cover the four session-name fallback cases. |
| `tests/powerline.test.js` | Cover: Pro/Max full second line; API with only session; Free with only session; fully-empty second line suppresses `\n`; `enabled: false` suppresses second line. |
| `tests/config.test.js` | Cover `secondLine` defaults, partial overrides, invalid inputs. |
| `tests/integration.test.js` | Add end-to-end case asserting two-line output for Pro/Max fixture. |
| `README.md` | Document the second line, the new config block, and the session-name fallback order. |

### Time Source

`formatResetDelta` takes `now` as a parameter to keep it pure and testable. The renderer passes `Date.now() / 1000` (seconds) at call time. Tests inject fixed `now` values.

## Error Handling

- If `resets_at` is not a number (null, undefined, string) → treat as null, omit that sub-block.
- If `Date.now()` drifts so that `delta ≤ 0` → render `—` (matches table). No crash.
- Config validation failures fall back to defaults as in the existing config loader.

## Out of Scope (YAGNI)

- Absolute-time ("resets at 14:30") display — relative format covers the actual user need.
- Per-theme icon customization (keeping `📁` and `↻` fixed).
- Animations or live refresh (Claude Code re-invokes the status line command; that's enough).
- Showing session id.
- Wrapping / truncation for narrow terminals — plain text will soft-wrap naturally; we do not pad the second line to terminal width.
