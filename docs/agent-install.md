# Agent Install Guide — claude-cli-plugin-usage

> For LLM/coding agents (e.g. Claude Code). This file is self-contained and copy-paste runnable.
> Goal: install and enable this status line for the human you're helping, then verify it works.
> Raw URL: `https://raw.githubusercontent.com/freejerry/claude-cli-plugin-usage/main/docs/agent-install.md`

## ⚠️ Read first — this is NOT a Claude Code plugin

Despite the `plugin` in the name, this is **not** a Claude Code plugin and has **no `.claude-plugin/` directory** — don't look for one, and don't try to install it via the plugin marketplace / `/plugin` flow.

It's a plain **npm package** that ships a single `statusLine` command. You install it with `npm`, and it's wired into Claude Code through the `statusLine` key in `~/.claude/settings.json` (the installer does this automatically). Follow the steps below — not any plugin-install procedure.

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

## Uninstall

```bash
npm uninstall -g claude-cli-plugin-usage
```

The preuninstall script removes the `statusLine` block it added. For a manual (2b) setup, delete the `statusLine` key yourself.

## Troubleshooting

- **No arrows / boxes shown** → terminal needs a [Powerline font](https://github.com/powerline/fonts).
- **Second line missing** → expected when there's nothing to show (no session name, no rate limits), or `secondLine.enabled` is `false`.
- **Rate-limit / reset segments absent** → only Pro/Max plans expose `rate_limits`; Free/API won't show them.
- **Nothing changes in Claude Code** → restart the session so it re-reads `settings.json`.
