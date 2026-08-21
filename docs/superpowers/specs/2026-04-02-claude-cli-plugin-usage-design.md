# claude-cli-plugin-usage Design Spec

**Date**: 2026-04-02
**Status**: Approved

## Overview

A cross-platform Claude Code CLI status line plugin that displays real-time session metrics in a Powerline visual style. Distributed as an npm package for zero-friction installation — all Claude Code users already have Node.js.

## Installation

```bash
npm install -g claude-cli-plugin-usage
```

Postinstall hook writes to `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "claude-cli-plugin-usage"
  }
}
```

Uninstall (`npm uninstall -g`) cleans up the settings entry.

## Architecture

### Data Flow

```
stdin (JSON from Claude Code) → parser → detector → powerline renderer → stdout
```

Claude Code pipes session JSON via stdin after each assistant message (debounced 300ms). The script parses, detects plan type, renders Powerline output, and prints to stdout.

### Project Structure

```
claude-cli-plugin-usage/
├── bin/
│   └── cli.js              # Entry point: read stdin → output powerline
├── src/
│   ├── parser.js            # Parse stdin JSON, extract needed fields
│   ├── detector.js          # Auto-detect plan type (Free/Pro/Max/API)
│   ├── powerline.js         # Powerline rendering engine
│   └── theme.js             # Color definitions and theme support
├── scripts/
│   └── postinstall.js       # Inject statusLine config on npm install
├── package.json
├── LICENSE                  # MIT
└── README.md
```

## Visual Design

### Powerline Layout

4 segments, left to right, separated by Powerline arrow (``) with color transitions:

```
 Opus 4.6  main  ████████░░ 78%  ⚡ 5h 32% │ 7d 15% 
```

### Segments

| # | Content | Background | Description |
|---|---------|------------|-------------|
| 1 | `🧠 {model}` | Deep blue | Current model display name |
| 2 | ` {branch}` | Purple | Git branch (hidden if not a git repo) |
| 3 | `{bar} {pct}%` | Dynamic | Context window usage with progress bar |
| 4 | `⚡ 5h {pct}% │ 7d {pct}%` | Dark gray | Rate limits (Pro/Max only) |

### Dynamic Behavior

- **Context bar color**: green (<60%) → yellow (60-80%) → red (>80%)
- **Rate limit numbers**: turn red when any window >80%
- **API users**: segment 4 shows `💰 $X.XX` (cumulative cost) instead of rate limits
- **Free users**: segment 4 hidden
- **No git repo**: segment 2 hidden
- **Null fields**: corresponding segment hidden gracefully

## Plan Auto-Detection

```
rate_limits exists and non-null → Pro/Max user
  └─ context_window_size === 1,000,000 → Max
  └─ otherwise → Pro
rate_limits null + cost exists → API user
neither → Free user
```

## Color System

- ANSI 256-color for maximum terminal compatibility
- Powerline arrow foreground = previous segment background, arrow background = next segment background
- Progress bar: `█` (filled) / `░` (empty), 10 chars wide (each = 10%)

## Configuration (Optional)

Zero-config by default. Optional config file at `~/.claude/claude-cli-plugin-usage.json`:

```json
{
  "theme": "default",
  "segments": ["model", "git", "context", "ratelimit"],
  "contextBar": {
    "width": 10,
    "thresholds": { "warn": 60, "danger": 80 }
  },
  "ratelimit": {
    "thresholds": { "warn": 60, "danger": 80 }
  }
}
```

### Customizable

- `segments`: which segments to show and in what order
- `theme`: `default` / `minimal` / `solarized` or custom color codes
- `thresholds`: color change breakpoints
- `contextBar.width`: progress bar character width

## Error Handling

- JSON parse failure → display `[claude-cli-plugin-usage: parse error]`
- Null fields → hide that segment
- Postinstall: if `statusLine` already exists in settings → prompt user to confirm overwrite

## Out of Scope (YAGNI)

- Multi-line display
- Sparkline / historical trends
- MCP server integration
- Auto-update mechanism
- Interactive configuration wizard
