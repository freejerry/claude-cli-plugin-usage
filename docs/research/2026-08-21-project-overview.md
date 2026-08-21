# Project Overview: claude-cli-plugin-usage

**Date:** 2026-08-21
**Branch investigated:** `feat/reset-countdown`
**Method:** Primary sources only — source, config, tests, and the design/spec/plan docs in this repo.

## What it is

A Powerline-style **status line for the Claude Code CLI**, distributed as an npm package (`package.json:1-20`). It is a command-line filter, not a Claude Code "plugin" in the marketplace sense: Claude Code is configured to invoke it as `statusLine.type: "command"` (`README.md:30-39`, `scripts/postinstall.js:7-11`). It reads session JSON from stdin and writes ANSI-colored status text to stdout (`bin/cli.js:11-23`).

- Zero runtime dependencies; Node.js >= 18 (`package.json:16-18`, `docs/superpowers/plans/2026-04-21-reset-countdown.md:10`).
- MIT licensed (`package.json:15`).
- Version `0.1.0` (`package.json:3`).
- Test runner is the built-in `node --test` (`package.json:9`).

## What it does

After each assistant message, Claude Code pipes session JSON via stdin (design notes it as debounced ~300ms; `docs/superpowers/specs/2026-04-02-claude-cli-plugin-usage-design.md:38-42`). The tool renders a status line with these first-line segments (`src/powerline.js:72-77`, `README.md:43-50`):

| Segment | Shows | Plan |
|---|---|---|
| 🧠 Model | `model.display_name` | All (`src/powerline.js:30-33`) |
|  Git | current branch | All, hidden if absent (`src/powerline.js:35-38`) |
| Context | `████░░` bar + `%`, green→yellow→red by threshold | All (`src/powerline.js:40-46`, `15-19`) |
| ⚡ Rate limits | `5h X% │ 7d Y%` | Pro/Max (`src/powerline.js:54-69`) |
| 💰 Cost | `$X.XX` session cost | API only (`src/powerline.js:48-53`) |

Example output (`README.md:5-8`):
```
 🧠 Opus 4.6  main  ████████░░ 78%  ⚡ 5h 32% │ 7d 15%
📁 mvp │ ↻ 5h 2h15m │ 7d 3d12h
```

**Second line** (the current feature, see Current State): a low-key gray plain-ANSI line (no powerline background/arrows) showing the session name and rate-limit reset countdowns (`src/powerline.js:156-183`):
- `📁 <session>` — session name resolved via `worktree.name` → `workspace.project_dir` basename → `workspace.current_dir` basename (`src/parser.js:12-23`).
- `↻ 5h <delta> │ 7d <delta>` — countdown to the next 5h/7d rate-limit reset, Pro/Max only (`src/powerline.js:169-178`, `hasRateLimits` at `src/powerline.js:26-28`).

The second line is omitted entirely (no trailing newline) when disabled or when there is nothing to show (`src/powerline.js:181`, `185-193`).

## Architecture

Data flow: `stdin (JSON) → parser → detector → powerline renderer → stdout` (`docs/.../2026-04-21-reset-countdown-design.md:130-134`, `bin/cli.js:17-23`).

- **Entry point** `bin/cli.js` — reads stdin, `JSON.parse`, calls `parseInput` → `detectPlan` → `loadConfig` → `render`, writes output + `\n` (`bin/cli.js:1-37`). On any error prints `[claude-cli-plugin-usage: parse error]` (`bin/cli.js:24-28`).
- **`src/parser.js`** — flattens raw JSON into a normalized object (model, branch, context %/size, 5h/7d percent+`resets_at`, cost, `sessionName`) with `?? null` guards (`src/parser.js:25-38`).
- **`src/detector.js`** — plan auto-detection: 1M context window ⇒ `max`; any rate-limit percent present ⇒ `pro`; cost > 0 with no rate limits ⇒ `api`; else `free` (`src/detector.js:3-22`).
- **`src/powerline.js`** — rendering engine. Segment builders (`SEGMENT_BUILDERS`, `src/powerline.js:72-77`) driven by `config.segments` order; `renderFirstLine` composes segments with color transitions and pads to terminal width (`src/powerline.js:113-154`); `renderSecondLine` builds the gray text line (`src/powerline.js:156-183`); `render` joins them with `\n` and accepts an injectable `now` for testability (`src/powerline.js:185-193`). Includes emoji/CJK-aware `visibleLength` for width math (`src/powerline.js:83-103`).
- **`src/theme.js`** — three ANSI 256-color themes (`default`, `minimal`, `solarized`), each with a `secondaryText`/`secondaryDim` pair for the second line; ANSI helpers and `buildTransition` for powerline arrows (`src/theme.js:3-64`).
- **`src/config.js`** — `DEFAULT_CONFIG` + deep-merge of user overrides from `~/.claude/claude-cli-plugin-usage.json`; falls back to defaults on any read/parse error (`src/config.js:7-56`).
- **`src/format-duration.js`** — pure `formatResetDelta(resetsAt, now)` returning `XdYh`/`XhYm`/`Xm`/`<1m`/`—`, or `null` when input is not a finite number (`src/format-duration.js:7-29`).
- **`scripts/postinstall.js`** / **`scripts/preuninstall.js`** — inject/remove the `statusLine` entry in `~/.claude/settings.json` on npm install/uninstall, idempotent and non-destructive of a foreign command (`scripts/postinstall.js:13-49`).

## Testing

`node --test` over `tests/` (`package.json:9`). One test file per module: `config`, `detector`, `format-duration`, `parser`, `powerline`, `scripts`, plus end-to-end `integration.test.js`. A shared fixture `tests/fixtures/sample-input.json` models a Pro user with far-future `resets_at` values (year ~2050) so countdown assertions are time-insensitive (`tests/fixtures/sample-input.json:27-45`).

Integration tests spawn the real CLI via `execFileSync('node', [CLI_PATH])` and pipe fixtures (`tests/integration.test.js:11-58`), asserting:
- Pro fixture ⇒ model/branch/context/rate-limit text, ANSI codes, and a two-line output with `📁` + `↻` + `project` session name (`tests/integration.test.js:11-29`).
- Empty `{}` ⇒ empty string (`tests/integration.test.js:31-37`).
- Invalid JSON ⇒ parse-error string (`tests/integration.test.js:39-45`).
- API user (`rate_limits: null`) ⇒ shows `$1.23` and `📁` but no `5h`/`↻` (`tests/integration.test.js:47-58`).

Note: the fixture's `worktree.name` is `null` so the session name falls back to the `project_dir` basename `project`, isolating the second-line resets test from a worktree name (commit `6ea1338`).

## Config options

Loaded from `~/.claude/claude-cli-plugin-usage.json`, merged over defaults (`src/config.js:7-46`, `README.md:62-96`):

- `theme` — `default` | `minimal` | `solarized` (`src/theme.js:3-40`).
- `segments` — array/order of `model`, `git`, `context`, `ratelimit`; reorder or hide (`src/config.js:9`, `README.md:91-96`).
- `contextBar.width` (default 10) and `contextBar.thresholds` `{ warn: 60, danger: 80 }` (`src/config.js:10-13`).
- `ratelimit.thresholds` `{ warn: 60, danger: 80 }` (`src/config.js:14-16`).
- `secondLine.enabled` (default `true`) and `secondLine.show` (default `["session","resets"]`) — set `enabled:false` for single-line output; narrow `show` to hide parts (`src/config.js:17-20`, `README.md:75-82`). Empty `show` ⇒ no second line (`src/powerline.js:158-159`).

Env var `CLAUDE_CLI_PLUGIN_DEBUG` — when set to a file path, appends stdin/stdout debug logs (uncommitted, see below; `bin/cli.js:9,29-36`).

## Current state (branch + planned vs done)

Branch `feat/reset-countdown`. The reset-countdown / session-name second-line feature is **implemented and committed** — the plan's Tasks 1–10 correspond to commits `deced57` through `adef3c8` (formatResetDelta, sessionName parser, theme keys, secondLine config, render split, session block, resets block, integration assertions, fixture, README). All source and tests for the feature exist and match the spec (`docs/.../2026-04-21-reset-countdown-design.md`, `docs/.../2026-04-21-reset-countdown.md`).

**Uncommitted work-in-progress** (not in the plan/spec): `bin/cli.js` has local modifications adding (1) a `CLAUDE_CLI_PLUGIN_DEBUG` debug-log sink and (2) a change so output always gets a trailing `\n` (and the parse-error path too) — `git diff bin/cli.js`. Two feature docs are also untracked in git status (an older 2026-04-02 plan/spec pair), though committed-looking design docs for both features live under `docs/superpowers/`.

Two design generations exist in the repo:
1. `2026-04-02` — the original plugin (segments, plan detection, powerline, install scripts). Done; matches shipped `src/`.
2. `2026-04-21` — reset countdown + session name second line. Done on this branch.

No open TODO/roadmap items were found in the docs beyond the completed plan checklists (the plans use `- [ ]` as a generic template, not live tracking). Out-of-scope items are explicitly listed in the spec (absolute-time display, per-theme icons, live refresh, session id, narrow-terminal truncation) — `docs/.../2026-04-21-reset-countdown-design.md:162-168`.
