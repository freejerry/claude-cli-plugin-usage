# claude-cli-plugin-usage

Powerline-style status line for [Claude Code CLI](https://claude.ai/code) — see your model, git branch, context usage, and rate limits at a glance.

```
 🧠 Opus 4.6  main  ████████░░ 78%  ⚡ 5h 32% │ 7d 15% 
📁 mvp │ ↻ 5h 2h15m │ 7d 3d12h
```

## Features

- **Powerline visual style** with ANSI 256-color support
- **Auto-detects your plan** — Free, Pro, Max, or API
- **Dynamic context bar** — green → yellow → red as usage increases
- **Rate limit tracking** — 5-hour and 7-day windows (Pro/Max)
- **Cost tracking** — cumulative session cost (API users)
- **Zero config** — works out of the box
- **Cross-platform** — macOS, Linux, Windows (via Node.js)

## Install

```bash
npm install -g claude-cli-plugin-usage
```

That's it. The installer automatically configures Claude Code's status line.

## Manual Setup

If automatic setup didn't work, add to `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "claude-cli-plugin-usage"
  }
}
```

## Segments

| Segment | Shows | Plan |
|---------|-------|------|
| 🧠 Model | Current model name | All |
|  Git | Current branch | All (hidden if not a git repo) |
| Context | Usage bar + percentage | All |
| ⚡ Rate Limits | 5h and 7d usage | Pro / Max |
| 💰 Cost | Session cost in USD | API |

## Second Line

Below the Powerline, a low-key gray line shows:

- **📁 Session name** — worktree name, or project folder name (fallback: current directory)
- **↻ Reset countdowns** — time until the 5-hour and 7-day rate-limit windows reset (Pro / Max only)

The second line is omitted when there's nothing to show, and can be disabled entirely via config.

## Configuration

Create `~/.claude/claude-cli-plugin-usage.json` to customize:

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
  },
  "secondLine": {
    "enabled": true,
    "show": ["session", "resets"]
  }
}
```

Set `secondLine.enabled` to `false` to restore single-line output. Narrow `secondLine.show` (e.g. `["session"]`) to hide the reset countdown while keeping the session name.

### Themes

- `default` — deep blue, purple, green/yellow/red
- `minimal` — monochrome with color alerts only
- `solarized` — solarized palette

### Segment Order

Reorder or hide segments:

```json
{ "segments": ["context", "model"] }
```

## Uninstall

```bash
npm uninstall -g claude-cli-plugin-usage
```

Settings are automatically cleaned up.

## Requirements

- Node.js >= 18 (you already have it if you use Claude Code)
- A terminal with ANSI 256-color support
- [Powerline-compatible font](https://github.com/powerline/fonts) for arrow glyphs

## License

MIT
