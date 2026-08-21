# Agent Install Guide — claude-cli-plugin-usage

> For LLM/coding agents (e.g. Claude Code). This file is self-contained and copy-paste runnable.
> Goal: install and enable this status line for the human you're helping, then verify it works.
> Raw URL: `https://raw.githubusercontent.com/freejerry/claude-cli-plugin-usage/main/docs/agent-install.md`

## Read first — two ways to install

This tool ships a single `statusLine` command and can be installed **either** way:

- **A) npm package (default, fully automatic)** — `npm install -g claude-cli-plugin-usage`; a postinstall script writes the `statusLine` key into `~/.claude/settings.json` for you. Best for most users. Steps 1–4 below.
- **B) Claude Code plugin** — the repo has a `.claude-plugin/` manifest and its own marketplace, so it's installable via `/plugin`. Note: a plugin **cannot** set the status line by itself, so after installing you run one command (or add one settings key) to enable it. See [Install as a Claude Code plugin](#install-as-a-claude-code-plugin).

Whichever you pick, the status line is ultimately activated by a `statusLine` entry in `settings.json` — the two paths just differ in how that entry gets there.

## Preconditions

- Node.js ≥ 18 — check: `node -v`
- The user runs Claude Code (settings live at `~/.claude/settings.json`).

## Step 1 — Install

```bash
npm install -g claude-cli-plugin-usage
```

The package's postinstall script auto-writes the `statusLine` block into `~/.claude/settings.json`. If npm global installs are unavailable or blocked, skip to **Step 2b**.

Verify the binary resolves:

```bash
command -v claude-cli-plugin-usage
```

## Step 2 — Ensure Claude Code is wired up

### 2a — Confirm auto-config landed

`~/.claude/settings.json` should contain:

```json
{
  "statusLine": { "type": "command", "command": "claude-cli-plugin-usage" }
}
```

If it's already there, you're done — go to **Step 3**.

### 2b — Manual wiring (no global install, or postinstall didn't run)

Merge the `statusLine` key into `~/.claude/settings.json` **without clobbering existing keys**. If the package isn't globally installed, point `command` at `npx`:

```json
{
  "statusLine": { "type": "command", "command": "npx -y claude-cli-plugin-usage" }
}
```

Do a real JSON merge (read → set `statusLine` → write). Do not overwrite the file.

## Step 3 — Verify output

Pipe a sample Claude Code status payload to the command; expect two ANSI-colored lines:

```bash
echo '{"model":{"display_name":"Opus 4.6"},"worktree":{"branch":"main"},"context_window":{"used_percentage":78,"context_window_size":200000},"rate_limits":{"five_hour":{"used_percentage":32,"resets_at":9999999999},"seven_day":{"used_percentage":15,"resets_at":9999999999}},"workspace":{"project_dir":"/tmp/mvp"}}' | claude-cli-plugin-usage
```

A non-empty line containing `Opus 4.6` and `78%` means it works. If you see `[claude-cli-plugin-usage: parse error]`, the stdin JSON was malformed.

## Step 4 — Optional config

Only if the user wants to customize. Write `~/.claude/claude-cli-plugin-usage.json` (all keys optional; omitted keys fall back to defaults):

```json
{
  "theme": "default",
  "segments": ["model", "git", "context", "ratelimit"],
  "contextBar": { "width": 10, "thresholds": { "warn": 60, "danger": 80 } },
  "ratelimit": { "thresholds": { "warn": 60, "danger": 80 } },
  "secondLine": { "enabled": true, "show": ["session", "resets"] }
}
```

- `theme`: `default` | `minimal` | `solarized`
- `segments`: order + subset of `model`, `git`, `context`, `ratelimit` (also acts as show/hide)
- `secondLine.enabled: false` → single-line output
- `secondLine.show`: subset of `session`, `resets`

## Install as a Claude Code plugin

Alternative to the npm path. In Claude Code:

```
/plugin marketplace add freejerry/claude-cli-plugin-usage
/plugin install claude-cli-plugin-usage@claude-cli-plugin-usage
```

Then enable the status line (a plugin can't set it directly). Easiest:

```
/claude-cli-plugin-usage:enable-statusline
```

That command merges this into `~/.claude/settings.json`:

```json
{
  "statusLine": { "type": "command", "command": "node ${CLAUDE_PLUGIN_ROOT}/bin/cli.js" }
}
```

`${CLAUDE_PLUGIN_ROOT}` is expanded by Claude Code to the plugin's install directory — keep it literal. Restart Claude Code afterwards. Configuration (Step 4) works the same for plugin installs.

## Uninstall

npm install:

```bash
npm uninstall -g claude-cli-plugin-usage
```

The preuninstall script removes the `statusLine` block it added. For a manual (2b) setup, delete the `statusLine` key yourself.

Plugin install: remove the `statusLine` key from `~/.claude/settings.json`, then `/plugin uninstall claude-cli-plugin-usage@claude-cli-plugin-usage`.

## Troubleshooting

- **No arrows / boxes shown** → terminal needs a [Powerline font](https://github.com/powerline/fonts).
- **Second line missing** → expected when there's nothing to show (no session name, no rate limits), or `secondLine.enabled` is `false`.
- **Rate-limit / reset segments absent** → only Pro/Max plans expose `rate_limits`; Free/API won't show them.
- **Nothing changes in Claude Code** → restart the session so it re-reads `settings.json`.
