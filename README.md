# claude-cli-plugin-usage

**Powerline-style status line for the [Claude Code CLI](https://claude.ai/code)** — see your model, git branch, context usage, rate limits, and reset countdowns at a glance.

[![npm version](https://img.shields.io/npm/v/claude-cli-plugin-usage.svg)](https://www.npmjs.com/package/claude-cli-plugin-usage)
[![npm downloads](https://img.shields.io/npm/dm/claude-cli-plugin-usage.svg)](https://www.npmjs.com/package/claude-cli-plugin-usage)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org)
[![Tests](https://img.shields.io/badge/tests-81%20passing-brightgreen.svg)](#testing)
[![Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)](package.json)
[![Status](https://img.shields.io/badge/status-experimental%20v0.1.0-orange.svg)](#roadmap)
[![AI Generated](https://img.shields.io/badge/🤖%20AI-generated-8A2BE2.svg)](#-ai-generated-project)

```
 🧠 Opus 4.6  main  ████████░░ 78%  ⚡ 5h 32% │ 7d 15% 
📁 mvp │ ↻ 5h 2h15m │ 7d 3d12h
```

---

> ## 🤖 AI-Generated Project
>
> **This project was designed, implemented, tested, and documented by an AI agent (Claude / Claude Code).**
> Every module, test, and doc — including this README — was produced through agent-driven development.
> It works and is covered by tests, but treat it as an experiment: review the code before relying on it in
> a critical setup, and see [Known Limitations](#known-limitations) for issues the agents deliberately left open.

---

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [For AI Agents](#for-ai-agents)
- [Configuration](#configuration)
- [How It Works](#how-it-works)
- [Project Structure](#project-structure)
- [Development](#development)
- [Testing](#testing)
- [Roadmap](#roadmap)
- [Known Limitations](#known-limitations)
- [Contributing](#contributing)
- [Troubleshooting](#troubleshooting)
- [Requirements](#requirements)
- [License](#license)
- [Acknowledgements](#acknowledgements)

## Features

- **Powerline visual style** — ANSI 256-color segments with arrow transitions
- **Auto-detects your plan** — Free, Pro, Max, or API, with no configuration
- **Dynamic context bar** — green → yellow → red as context usage climbs
- **Rate-limit tracking** — 5-hour and 7-day windows (Pro / Max)
- **Reset countdowns** — time until each rate-limit window resets (Pro / Max)
- **Cost tracking** — cumulative session cost in USD (API users)
- **Session name line** — worktree / project / directory, at a glance
- **Zero config** — sensible defaults out of the box; fully customizable when you want it
- **Zero dependencies** — pure Node.js standard library
- **Cross-platform** — macOS, Linux, Windows

## Installation

### Via npm (recommended)

```bash
npm install -g claude-cli-plugin-usage
```

The `postinstall` script automatically wires the status line into `~/.claude/settings.json`.

### From source

```bash
git clone https://github.com/freejerry/claude-cli-plugin-usage.git
cd claude-cli-plugin-usage
npm install -g .
```

### Manual setup

If automatic configuration didn't run, add this to `~/.claude/settings.json` (merge into existing keys — don't overwrite the file):

```json
{
  "statusLine": {
    "type": "command",
    "command": "claude-cli-plugin-usage"
  }
}
```

Then restart Claude Code so it re-reads its settings.

## Usage

Once installed and wired up, the status line renders automatically at the bottom of every Claude Code session. Claude Code pipes a JSON status payload to the command on stdin; this tool parses it and prints one or two colored lines.

**First line** — Powerline segments:

| Segment | Shows | Plan |
|---------|-------|------|
| 🧠 Model | Current model name | All |
|  Git | Current branch (hidden outside a git repo) | All |
| Context | Usage bar + percentage | All |
| ⚡ Rate Limits | 5h and 7d usage | Pro / Max |
| 💰 Cost | Session cost in USD | API |

**Second line** — a low-key gray line:

- **📁 Session name** — worktree name, or project folder (fallback: current directory)
- **↻ Reset countdowns** — time until the 5h and 7d windows reset (Pro / Max only)

The second line is omitted when there's nothing to show and can be disabled via [configuration](#configuration).

## For AI Agents

Point any Claude Code agent at the self-contained, copy-paste-runnable install guide so it can install, wire up, and **verify** this tool in a single conversation:

- In-repo: [`docs/agent-install.md`](docs/agent-install.md)
- Raw URL: `https://raw.githubusercontent.com/freejerry/claude-cli-plugin-usage/main/docs/agent-install.md`

## Configuration

All configuration is optional. To customize, create `~/.claude/claude-cli-plugin-usage.json`. Any omitted key falls back to its default:

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

### Options

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `theme` | string | `"default"` | Color theme — `default`, `minimal`, or `solarized` |
| `segments` | string[] | `["model","git","context","ratelimit"]` | First-line segment order; also acts as show/hide |
| `contextBar.width` | number | `10` | Width of the context progress bar, in cells |
| `contextBar.thresholds.warn` | number | `60` | % at which the bar turns yellow |
| `contextBar.thresholds.danger` | number | `80` | % at which the bar turns red |
| `ratelimit.thresholds.warn` | number | `60` | Rate-limit warning threshold |
| `ratelimit.thresholds.danger` | number | `80` | % at which rate-limit text turns red |
| `secondLine.enabled` | boolean | `true` | Set `false` for single-line output |
| `secondLine.show` | string[] | `["session","resets"]` | Which second-line blocks to render |

### Themes

- `default` — deep blue, purple, green/yellow/red
- `minimal` — monochrome with color alerts only
- `solarized` — solarized palette

### Segment order

Reorder or hide first-line segments by editing `segments`:

```json
{ "segments": ["context", "model"] }
```

## How It Works

A simple stdin → stdout pipeline, each stage a small pure module:

```
Claude Code
    │  (JSON status payload on stdin)
    ▼
┌─────────────────────────────────────────────────────────┐
│ bin/cli.js — read stdin, orchestrate, write stdout       │
└─────────────────────────────────────────────────────────┘
    │            │              │                │
    ▼            ▼              ▼                ▼
 parser.js  detector.js   config.js      powerline.js
 (raw JSON  (Free/Pro/    (defaults +    (render segments +
  → fields)  Max/API)      user overrides) second line)
                                                │
                                    theme.js · width.js · format-duration.js
    │
    ▼  (ANSI-colored line(s) on stdout)
Claude Code status bar
```

- **`parser.js`** — extracts a clean field set from Claude Code's raw JSON.
- **`detector.js`** — classifies the plan (1M context ⇒ Max, rate limits ⇒ Pro, cost-only ⇒ API, else Free).
- **`config.js`** — loads `~/.claude/claude-cli-plugin-usage.json` and deep-merges over defaults.
- **`powerline.js`** — builds segments and lays out the two lines.
- **`theme.js`** — ANSI 256-color palettes and powerline transitions.
- **`width.js`** — visible-width measurement (emoji/CJK-aware) and terminal width.
- **`format-duration.js`** — human-readable reset countdowns (`2h15m`, `3d12h`).

## Project Structure

```
claude-cli-plugin-usage/
├── bin/cli.js              # entry point — stdin/stdout orchestration
├── src/
│   ├── parser.js           # raw JSON → clean fields
│   ├── detector.js         # plan auto-detection
│   ├── config.js           # defaults + user override merge
│   ├── powerline.js        # segment building + layout
│   ├── theme.js            # ANSI color themes
│   ├── width.js            # visible-width / terminal-width helpers
│   └── format-duration.js  # reset-countdown formatting
├── scripts/
│   ├── postinstall.js      # auto-inject statusLine into settings.json
│   └── preuninstall.js     # remove it on uninstall
├── tests/                  # node:test suites + fixtures
└── docs/
    └── agent-install.md    # LLM-oriented install guide
```

## Development

```bash
git clone https://github.com/freejerry/claude-cli-plugin-usage.git
cd claude-cli-plugin-usage
npm install          # no runtime deps; installs nothing but sets up the repo
npm test             # run the full suite
```

Run the renderer locally by piping a sample payload:

```bash
echo '{"model":{"display_name":"Opus 4.6"},"worktree":{"branch":"main"},"context_window":{"used_percentage":78,"context_window_size":200000}}' | node bin/cli.js
```

## Testing

Tests use Node's built-in test runner (`node:test`) — no framework, no fixtures beyond a sample JSON file.

```bash
npm test
```

Each `src/` module has a matching `tests/*.test.js` (unit), plus `tests/integration.test.js` exercising the full stdin → stdout pipeline. Current status: **81 tests passing**.

## Roadmap

- [x] Publish to npm registry
- [x] Fix the arrow-width undercount
- [ ] Configurable second-line blocks beyond `session` / `resets`
- [ ] Additional built-in themes
- [ ] CI workflow (lint + test on push)

## Known Limitations

- **Experimental.** As an AI-generated project, edge cases in unusual terminals or payload shapes may not be fully covered.

## Contributing

Everyone's welcome to help maintain this — no ceremony required.

Open an issue, or send a PR. If you're adding logic, a quick `npm test` to keep it green is appreciated. That's it.

## Troubleshooting

- **No arrows / boxes shown** → your terminal needs a [Powerline-compatible font](https://github.com/powerline/fonts).
- **Second line missing** → expected when there's nothing to show (no session name, no rate limits), or `secondLine.enabled` is `false`.
- **Rate-limit / reset segments absent** → only Pro/Max plans expose `rate_limits`; Free/API won't show them.
- **`[claude-cli-plugin-usage: parse error]`** → the stdin JSON was malformed; check what Claude Code is sending.
- **Nothing changes in Claude Code** → restart the session so it re-reads `settings.json`.

## Requirements

- Node.js ≥ 18 (already present if you use Claude Code)
- A terminal with ANSI 256-color support
- A [Powerline-compatible font](https://github.com/powerline/fonts) for arrow glyphs

## License

[MIT](LICENSE)

## Acknowledgements

- Built for the [Claude Code CLI](https://claude.ai/code).
- Visual style inspired by [Powerline](https://github.com/powerline/powerline).
- Designed and implemented by AI agents via agent-driven development.
