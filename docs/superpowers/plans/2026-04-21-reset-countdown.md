# Reset Countdown & Session Name Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a low-key second line to the status line that shows the current project/worktree name and a countdown to the next 5h/7d rate-limit reset.

**Architecture:** Pure function `formatResetDelta` for duration formatting; parser resolves a `sessionName` via worktree → project_dir → current_dir fallback; powerline renderer splits into `renderFirstLine` (existing behavior, unchanged output) and `renderSecondLine` (new, plain ANSI foreground text), joined with `\n` when both non-empty. All behavior opt-out via `config.secondLine.enabled`.

**Tech Stack:** Node.js ≥ 18, zero runtime deps, `node:test` runner, plain ANSI 256-color escapes.

**Spec:** [`docs/superpowers/specs/2026-04-21-reset-countdown-design.md`](../specs/2026-04-21-reset-countdown-design.md)

---

## File Structure

| File | Change |
|------|--------|
| `src/format-duration.js` | **New** — exports `formatResetDelta(resetsAt, now)` |
| `src/parser.js` | **Modify** — add `sessionName` field via fallback chain |
| `src/theme.js` | **Modify** — add `secondaryText` (245) and `secondaryDim` (240) to all themes |
| `src/config.js` | **Modify** — add `secondLine` defaults and merge logic |
| `src/powerline.js` | **Modify** — split `render` into `renderFirstLine` + `renderSecondLine`; new `render` joins with `\n`; accept optional `now` parameter |
| `bin/cli.js` | No change needed (calls `render` as before) |
| `tests/format-duration.test.js` | **New** |
| `tests/parser.test.js` | **Modify** — add session-name fallback cases |
| `tests/config.test.js` | **Modify** — add `secondLine` cases |
| `tests/powerline.test.js` | **Modify** — add second-line render cases |
| `tests/integration.test.js` | **Modify** — assert two-line output for Pro fixture |
| `README.md` | **Modify** — document second line + new config |

---

## Task 1: `formatResetDelta` pure function

**Files:**
- Create: `src/format-duration.js`
- Test: `tests/format-duration.test.js`

- [ ] **Step 1: Write the failing test file**

Create `tests/format-duration.test.js`:

```javascript
const { describe, it } = require('node:test');
const assert = require('node:assert');
const { formatResetDelta } = require('../src/format-duration.js');

describe('formatResetDelta', () => {
  const NOW = 1_700_000_000; // fixed reference

  it('returns null when resetsAt is null', () => {
    assert.strictEqual(formatResetDelta(null, NOW), null);
  });

  it('returns null when resetsAt is undefined', () => {
    assert.strictEqual(formatResetDelta(undefined, NOW), null);
  });

  it('returns null when resetsAt is not a number', () => {
    assert.strictEqual(formatResetDelta('1700000000', NOW), null);
    assert.strictEqual(formatResetDelta(NaN, NOW), null);
  });

  it('returns em-dash when delta is zero', () => {
    assert.strictEqual(formatResetDelta(NOW, NOW), '—');
  });

  it('returns em-dash when delta is negative', () => {
    assert.strictEqual(formatResetDelta(NOW - 60, NOW), '—');
  });

  it('formats sub-minute delta as <1m', () => {
    assert.strictEqual(formatResetDelta(NOW + 30, NOW), '<1m');
    assert.strictEqual(formatResetDelta(NOW + 59, NOW), '<1m');
  });

  it('formats minute-only delta as Xm', () => {
    assert.strictEqual(formatResetDelta(NOW + 60, NOW), '1m');
    assert.strictEqual(formatResetDelta(NOW + 45 * 60, NOW), '45m');
    assert.strictEqual(formatResetDelta(NOW + 59 * 60 + 59, NOW), '59m');
  });

  it('formats hour+minute delta as XhYm', () => {
    assert.strictEqual(formatResetDelta(NOW + 60 * 60, NOW), '1h0m');
    assert.strictEqual(formatResetDelta(NOW + 2 * 60 * 60 + 15 * 60, NOW), '2h15m');
    assert.strictEqual(formatResetDelta(NOW + 23 * 60 * 60 + 59 * 60, NOW), '23h59m');
  });

  it('formats day+hour delta as XdYh', () => {
    assert.strictEqual(formatResetDelta(NOW + 24 * 60 * 60, NOW), '1d0h');
    assert.strictEqual(formatResetDelta(NOW + 3 * 24 * 60 * 60 + 12 * 60 * 60, NOW), '3d12h');
    assert.strictEqual(formatResetDelta(NOW + 7 * 24 * 60 * 60, NOW), '7d0h');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/format-duration.test.js`
Expected: FAIL with "Cannot find module '../src/format-duration.js'"

- [ ] **Step 3: Implement `formatResetDelta`**

Create `src/format-duration.js`:

```javascript
'use strict';

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function formatResetDelta(resetsAt, now) {
  if (typeof resetsAt !== 'number' || !Number.isFinite(resetsAt)) {
    return null;
  }
  const delta = resetsAt - now;
  if (delta <= 0) return '—';

  if (delta >= DAY) {
    const days = Math.floor(delta / DAY);
    const hours = Math.floor((delta % DAY) / HOUR);
    return `${days}d${hours}h`;
  }
  if (delta >= HOUR) {
    const hours = Math.floor(delta / HOUR);
    const minutes = Math.floor((delta % HOUR) / MINUTE);
    return `${hours}h${minutes}m`;
  }
  if (delta >= MINUTE) {
    const minutes = Math.floor(delta / MINUTE);
    return `${minutes}m`;
  }
  return '<1m';
}

module.exports = { formatResetDelta };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/format-duration.test.js`
Expected: all tests pass, no failures.

- [ ] **Step 5: Commit**

```bash
git add src/format-duration.js tests/format-duration.test.js
git commit -m "feat: add formatResetDelta utility for rate-limit countdown"
```

---

## Task 2: `sessionName` in parser

**Files:**
- Modify: `src/parser.js`
- Modify: `tests/parser.test.js`
- Modify: `tests/fixtures/sample-input.json` (add `workspace.project_dir` already present — verify no change needed)

- [ ] **Step 1: Write failing parser tests**

Append to `tests/parser.test.js` inside the existing `describe('parser', ...)` block (before the closing `});`):

```javascript
  it('resolves sessionName from worktree.name when present', () => {
    const raw = loadFixture('sample-input.json');
    raw.worktree = { name: 'feat-auth', path: '/tmp', branch: 'feat-auth' };
    const result = parseInput(raw);
    assert.strictEqual(result.sessionName, 'feat-auth');
  });

  it('falls back to project_dir basename when worktree.name is null', () => {
    const raw = loadFixture('sample-input.json');
    // fixture has worktree.name = null and project_dir = /Users/test/project
    const result = parseInput(raw);
    assert.strictEqual(result.sessionName, 'project');
  });

  it('falls back to current_dir basename when project_dir is null', () => {
    const raw = loadFixture('sample-input.json');
    raw.workspace = { current_dir: '/home/user/my-app', project_dir: null };
    const result = parseInput(raw);
    assert.strictEqual(result.sessionName, 'my-app');
  });

  it('returns null sessionName when all sources are null', () => {
    const raw = {};
    const result = parseInput(raw);
    assert.strictEqual(result.sessionName, null);
  });

  it('handles trailing slash in project_dir', () => {
    const raw = loadFixture('sample-input.json');
    raw.workspace = { project_dir: '/Users/test/project/', current_dir: null };
    const result = parseInput(raw);
    assert.strictEqual(result.sessionName, 'project');
  });

  it('handles windows-style backslash paths', () => {
    const raw = loadFixture('sample-input.json');
    raw.workspace = { project_dir: 'C:\\Users\\test\\my-repo', current_dir: null };
    const result = parseInput(raw);
    assert.strictEqual(result.sessionName, 'my-repo');
  });
```

- [ ] **Step 2: Run parser tests to verify they fail**

Run: `node --test tests/parser.test.js`
Expected: the new tests fail with `sessionName` being undefined.

- [ ] **Step 3: Implement `sessionName` in parser**

Replace the entire contents of `src/parser.js` with:

```javascript
'use strict';

function getBasename(p) {
  if (typeof p !== 'string' || !p) return null;
  const trimmed = p.replace(/[/\\]+$/, '');
  if (!trimmed) return null;
  const idx = Math.max(trimmed.lastIndexOf('/'), trimmed.lastIndexOf('\\'));
  const base = idx >= 0 ? trimmed.slice(idx + 1) : trimmed;
  return base || null;
}

function resolveSessionName(raw) {
  const worktreeName = raw?.worktree?.name;
  if (typeof worktreeName === 'string' && worktreeName) return worktreeName;

  const projectBase = getBasename(raw?.workspace?.project_dir);
  if (projectBase) return projectBase;

  const currentBase = getBasename(raw?.workspace?.current_dir);
  if (currentBase) return currentBase;

  return null;
}

function parseInput(raw) {
  return {
    modelName: raw?.model?.display_name ?? null,
    branch: raw?.worktree?.branch ?? null,
    contextPercent: raw?.context_window?.used_percentage ?? null,
    contextWindowSize: raw?.context_window?.context_window_size ?? null,
    fiveHourPercent: raw?.rate_limits?.five_hour?.used_percentage ?? null,
    fiveHourResetsAt: raw?.rate_limits?.five_hour?.resets_at ?? null,
    sevenDayPercent: raw?.rate_limits?.seven_day?.used_percentage ?? null,
    sevenDayResetsAt: raw?.rate_limits?.seven_day?.resets_at ?? null,
    costUsd: raw?.cost?.total_cost_usd ?? null,
    sessionName: resolveSessionName(raw),
  };
}

module.exports = { parseInput };
```

- [ ] **Step 4: Run all parser tests**

Run: `node --test tests/parser.test.js`
Expected: all tests pass (including the pre-existing ones — `sessionName` is additive).

- [ ] **Step 5: Commit**

```bash
git add src/parser.js tests/parser.test.js
git commit -m "feat: parse sessionName with worktree/project/current_dir fallback"
```

---

## Task 3: Theme colors for second line

**Files:**
- Modify: `src/theme.js`
- Modify: `tests/theme.test.js`

- [ ] **Step 1: Check existing theme test file**

Run: `node --test tests/theme.test.js`
Expected: tests pass (baseline — noting what exists).

- [ ] **Step 2: Add failing assertions for new theme keys**

Open `tests/theme.test.js`. Inside an existing `describe('themes'` or similar block, add:

```javascript
  it('default theme has secondaryText and secondaryDim', () => {
    const theme = getTheme('default');
    assert.strictEqual(theme.secondaryText, 245);
    assert.strictEqual(theme.secondaryDim, 240);
  });

  it('minimal theme has secondaryText and secondaryDim', () => {
    const theme = getTheme('minimal');
    assert.strictEqual(typeof theme.secondaryText, 'number');
    assert.strictEqual(typeof theme.secondaryDim, 'number');
  });

  it('solarized theme has secondaryText and secondaryDim', () => {
    const theme = getTheme('solarized');
    assert.strictEqual(typeof theme.secondaryText, 'number');
    assert.strictEqual(typeof theme.secondaryDim, 'number');
  });
```

If `getTheme` and `assert` aren't imported at the top of `tests/theme.test.js`, add them:

```javascript
const { getTheme } = require('../src/theme.js');
const assert = require('node:assert');
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node --test tests/theme.test.js`
Expected: FAIL — `theme.secondaryText` is undefined.

- [ ] **Step 4: Add keys to all themes**

In `src/theme.js`, update each theme object to include `secondaryText` and `secondaryDim`. Final `THEMES` object:

```javascript
const THEMES = {
  default: {
    model: 25,
    git: 133,
    contextOk: 28,
    contextWarn: 178,
    contextDanger: 160,
    ratelimit: 240,
    textLight: 255,
    textDark: 232,
    secondaryText: 245,
    secondaryDim: 240,
  },
  minimal: {
    model: 238,
    git: 238,
    contextOk: 238,
    contextWarn: 178,
    contextDanger: 160,
    ratelimit: 238,
    textLight: 255,
    textDark: 232,
    secondaryText: 245,
    secondaryDim: 240,
  },
  solarized: {
    model: 33,
    git: 136,
    contextOk: 64,
    contextWarn: 166,
    contextDanger: 124,
    ratelimit: 241,
    textLight: 230,
    textDark: 235,
    secondaryText: 245,
    secondaryDim: 240,
  },
};
```

- [ ] **Step 5: Run theme tests**

Run: `node --test tests/theme.test.js`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/theme.js tests/theme.test.js
git commit -m "feat: add secondaryText/secondaryDim keys to all themes"
```

---

## Task 4: `secondLine` config

**Files:**
- Modify: `src/config.js`
- Modify: `tests/config.test.js`

- [ ] **Step 1: Write failing config tests**

Append to `tests/config.test.js` inside the existing `describe('config', ...)` block:

```javascript
  it('includes secondLine in defaults', () => {
    const result = mergeConfig(null);
    assert.deepStrictEqual(result.secondLine, {
      enabled: true,
      show: ['session', 'resets'],
    });
  });

  it('allows disabling secondLine', () => {
    const result = mergeConfig({ secondLine: { enabled: false } });
    assert.strictEqual(result.secondLine.enabled, false);
    assert.deepStrictEqual(result.secondLine.show, ['session', 'resets']);
  });

  it('allows overriding secondLine show list', () => {
    const result = mergeConfig({ secondLine: { show: ['session'] } });
    assert.strictEqual(result.secondLine.enabled, true);
    assert.deepStrictEqual(result.secondLine.show, ['session']);
  });

  it('preserves defaults when secondLine is absent', () => {
    const result = mergeConfig({ theme: 'minimal' });
    assert.strictEqual(result.secondLine.enabled, true);
    assert.deepStrictEqual(result.secondLine.show, ['session', 'resets']);
  });
```

- [ ] **Step 2: Run config tests to verify failure**

Run: `node --test tests/config.test.js`
Expected: the new tests fail — `result.secondLine` is undefined.

- [ ] **Step 3: Add `secondLine` to DEFAULT_CONFIG and mergeConfig**

Replace the contents of `src/config.js` with:

```javascript
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const DEFAULT_CONFIG = {
  theme: 'default',
  segments: ['model', 'git', 'context', 'ratelimit'],
  contextBar: {
    width: 10,
    thresholds: { warn: 60, danger: 80 },
  },
  ratelimit: {
    thresholds: { warn: 60, danger: 80 },
  },
  secondLine: {
    enabled: true,
    show: ['session', 'resets'],
  },
};

function mergeConfig(userConfig) {
  if (!userConfig) return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  return {
    theme: userConfig.theme ?? DEFAULT_CONFIG.theme,
    segments: userConfig.segments ?? [...DEFAULT_CONFIG.segments],
    contextBar: {
      width: userConfig.contextBar?.width ?? DEFAULT_CONFIG.contextBar.width,
      thresholds: {
        warn: userConfig.contextBar?.thresholds?.warn ?? DEFAULT_CONFIG.contextBar.thresholds.warn,
        danger: userConfig.contextBar?.thresholds?.danger ?? DEFAULT_CONFIG.contextBar.thresholds.danger,
      },
    },
    ratelimit: {
      thresholds: {
        warn: userConfig.ratelimit?.thresholds?.warn ?? DEFAULT_CONFIG.ratelimit.thresholds.warn,
        danger: userConfig.ratelimit?.thresholds?.danger ?? DEFAULT_CONFIG.ratelimit.thresholds.danger,
      },
    },
    secondLine: {
      enabled: userConfig.secondLine?.enabled ?? DEFAULT_CONFIG.secondLine.enabled,
      show: userConfig.secondLine?.show ?? [...DEFAULT_CONFIG.secondLine.show],
    },
  };
}

function loadConfig() {
  const configPath = path.join(os.homedir(), '.claude', 'claude-cli-plugin-usage.json');
  try {
    const content = fs.readFileSync(configPath, 'utf8');
    return mergeConfig(JSON.parse(content));
  } catch {
    return mergeConfig(null);
  }
}

module.exports = { loadConfig, mergeConfig, DEFAULT_CONFIG };
```

> Note: the `null` branch switched to `JSON.parse(JSON.stringify(...))` for a deep clone, so tests can safely mutate the returned object without cross-test contamination. The first existing test (`assert.deepStrictEqual(result, DEFAULT_CONFIG)`) still passes since deep-equality compares by value.

- [ ] **Step 4: Run config tests**

Run: `node --test tests/config.test.js`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/config.js tests/config.test.js
git commit -m "feat: add secondLine config with enabled/show options"
```

---

## Task 5: Refactor `render` → `renderFirstLine` (no behavior change)

**Files:**
- Modify: `src/powerline.js`

This is a pure refactor: rename the existing `render` body to `renderFirstLine`, and have a new `render` that simply calls it. This keeps all existing powerline tests and integration tests green before we add second-line behavior.

- [ ] **Step 1: Verify existing tests are green (baseline)**

Run: `node --test`
Expected: all tests pass.

- [ ] **Step 2: Extract `renderFirstLine` and add thin `render` wrapper**

In `src/powerline.js`:

1. Rename the existing `function render(parsed, plan, config) { ... }` to `function renderFirstLine(parsed, plan, config, theme) { ... }`.
2. Inside `renderFirstLine`, remove the line `const theme = getTheme(config.theme);` (theme is now a parameter).
3. Add a new `render` at the bottom that creates the theme and calls `renderFirstLine`:

```javascript
function render(parsed, plan, config, now = Math.floor(Date.now() / 1000)) {
  const theme = getTheme(config.theme);
  const first = renderFirstLine(parsed, plan, config, theme);
  return first; // second line added in next task
}
```

4. Update the `module.exports` to also export `renderFirstLine` (for tests):

```javascript
module.exports = { render, renderFirstLine, buildProgressBar, buildSegment, visibleLength, stripAnsi };
```

- [ ] **Step 3: Run all tests to verify nothing broke**

Run: `node --test`
Expected: all tests pass (behavior unchanged).

- [ ] **Step 4: Commit**

```bash
git add src/powerline.js
git commit -m "refactor: split render into renderFirstLine + render wrapper"
```

---

## Task 6: Implement `renderSecondLine` — session block

**Files:**
- Modify: `src/powerline.js`
- Modify: `tests/powerline.test.js`

- [ ] **Step 1: Write failing tests for session-only second line**

Append to the `describe('render', ...)` block in `tests/powerline.test.js`:

```javascript
    it('renders second line with session name', () => {
      const parsed = {
        modelName: 'Opus 4.6',
        branch: 'main',
        contextPercent: 45,
        contextWindowSize: 200000,
        fiveHourPercent: null,
        sevenDayPercent: null,
        fiveHourResetsAt: null,
        sevenDayResetsAt: null,
        costUsd: null,
        sessionName: 'mvp',
      };
      const result = render(parsed, 'free', DEFAULT_CONFIG);
      assert.ok(result.includes('\n'), 'output should contain a newline');
      assert.ok(result.includes('📁 mvp'), 'second line should show session');
    });

    it('omits second line entirely when disabled', () => {
      const parsed = {
        modelName: 'Opus 4.6',
        branch: 'main',
        contextPercent: 45,
        contextWindowSize: 200000,
        fiveHourPercent: null,
        sevenDayPercent: null,
        fiveHourResetsAt: null,
        sevenDayResetsAt: null,
        costUsd: null,
        sessionName: 'mvp',
      };
      const config = {
        ...DEFAULT_CONFIG,
        secondLine: { enabled: false, show: ['session', 'resets'] },
      };
      const result = render(parsed, 'free', config);
      assert.ok(!result.includes('\n'), 'output should not contain a newline');
      assert.ok(!result.includes('📁'), 'no session icon');
    });

    it('omits second line when sessionName is null and no resets available', () => {
      const parsed = {
        modelName: 'Opus 4.6',
        branch: null,
        contextPercent: 45,
        contextWindowSize: 200000,
        fiveHourPercent: null,
        sevenDayPercent: null,
        fiveHourResetsAt: null,
        sevenDayResetsAt: null,
        costUsd: null,
        sessionName: null,
      };
      const result = render(parsed, 'free', DEFAULT_CONFIG);
      assert.ok(!result.includes('\n'), 'no newline when second line would be empty');
    });
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test tests/powerline.test.js`
Expected: new tests fail — second line is not rendered yet.

- [ ] **Step 3: Implement `renderSecondLine` (session block only)**

In `src/powerline.js`, add:

```javascript
const { formatResetDelta } = require('./format-duration.js');

function renderSecondLine(parsed, plan, config, theme, now) {
  if (!config.secondLine?.enabled) return '';
  const show = config.secondLine.show || [];
  if (show.length === 0) return '';

  const text = ansi256Fg(theme.secondaryText);
  const dim = ansi256Fg(theme.secondaryDim);
  const sep = `${dim} │ ${text}`;

  const blocks = [];
  for (const name of show) {
    if (name === 'session' && parsed.sessionName) {
      blocks.push(`📁 ${parsed.sessionName}`);
    }
    // 'resets' handled in the next task
  }

  if (blocks.length === 0) return '';
  return `${text}${blocks.join(sep)}${reset()}`;
}
```

Also add `require` at the top of the file (near the existing `require('./theme.js')`):

```javascript
const { formatResetDelta } = require('./format-duration.js');
```

Update the `render` function to join both lines:

```javascript
function render(parsed, plan, config, now = Math.floor(Date.now() / 1000)) {
  const theme = getTheme(config.theme);
  const first = renderFirstLine(parsed, plan, config, theme);
  const second = renderSecondLine(parsed, plan, config, theme, now);
  if (!first && !second) return '';
  if (!second) return first;
  if (!first) return second;
  return `${first}\n${second}`;
}
```

- [ ] **Step 4: Run all tests**

Run: `node --test`
Expected: all pass — new session-line tests green, existing powerline/integration tests green (`formatResetDelta` imported but not used yet is fine).

- [ ] **Step 5: Commit**

```bash
git add src/powerline.js tests/powerline.test.js
git commit -m "feat: render second line with session name"
```

---

## Task 7: Implement `renderSecondLine` — resets block

**Files:**
- Modify: `src/powerline.js`
- Modify: `tests/powerline.test.js`

- [ ] **Step 1: Write failing tests for resets block**

Append to the `describe('render', ...)` block:

```javascript
    it('renders second line with 5h and 7d countdown for Pro user', () => {
      const NOW = 1_700_000_000;
      const parsed = {
        modelName: 'Opus 4.6',
        branch: 'main',
        contextPercent: 45,
        contextWindowSize: 200000,
        fiveHourPercent: 32,
        sevenDayPercent: 15,
        fiveHourResetsAt: NOW + 2 * 3600 + 15 * 60, // 2h15m
        sevenDayResetsAt: NOW + 3 * 86400 + 12 * 3600, // 3d12h
        costUsd: null,
        sessionName: 'mvp',
      };
      const result = render(parsed, 'pro', DEFAULT_CONFIG, NOW);
      assert.ok(result.includes('📁 mvp'));
      assert.ok(result.includes('↻ 5h 2h15m'));
      assert.ok(result.includes('7d 3d12h'));
    });

    it('hides resets block for API plan', () => {
      const NOW = 1_700_000_000;
      const parsed = {
        modelName: 'Opus 4.6',
        branch: 'main',
        contextPercent: 45,
        contextWindowSize: 200000,
        fiveHourPercent: null,
        sevenDayPercent: null,
        fiveHourResetsAt: NOW + 3600,
        sevenDayResetsAt: NOW + 86400,
        costUsd: 1.23,
        sessionName: 'mvp',
      };
      const result = render(parsed, 'api', DEFAULT_CONFIG, NOW);
      assert.ok(result.includes('📁 mvp'));
      assert.ok(!result.includes('↻'), 'no reset icon for API plan');
    });

    it('hides resets block for free plan', () => {
      const NOW = 1_700_000_000;
      const parsed = {
        modelName: 'Sonnet 4.6',
        branch: 'main',
        contextPercent: 20,
        contextWindowSize: 200000,
        fiveHourPercent: null,
        sevenDayPercent: null,
        fiveHourResetsAt: null,
        sevenDayResetsAt: null,
        costUsd: null,
        sessionName: 'mvp',
      };
      const result = render(parsed, 'free', DEFAULT_CONFIG, NOW);
      assert.ok(result.includes('📁 mvp'));
      assert.ok(!result.includes('↻'));
    });

    it('shows only 7d when 5h resets_at is null', () => {
      const NOW = 1_700_000_000;
      const parsed = {
        modelName: 'Opus 4.6',
        branch: 'main',
        contextPercent: 45,
        contextWindowSize: 200000,
        fiveHourPercent: 32,
        sevenDayPercent: 15,
        fiveHourResetsAt: null,
        sevenDayResetsAt: NOW + 2 * 86400,
        costUsd: null,
        sessionName: 'mvp',
      };
      const result = render(parsed, 'pro', DEFAULT_CONFIG, NOW);
      assert.ok(!result.includes('5h '), 'no 5h label');
      assert.ok(result.includes('↻ 7d 2d0h'));
    });

    it('shows em-dash when reset is in the past', () => {
      const NOW = 1_700_000_000;
      const parsed = {
        modelName: 'Opus 4.6',
        branch: 'main',
        contextPercent: 45,
        contextWindowSize: 200000,
        fiveHourPercent: 32,
        sevenDayPercent: 15,
        fiveHourResetsAt: NOW - 60,
        sevenDayResetsAt: NOW + 86400,
        costUsd: null,
        sessionName: 'mvp',
      };
      const result = render(parsed, 'pro', DEFAULT_CONFIG, NOW);
      assert.ok(result.includes('5h —'));
    });

    it('honors custom secondLine.show order and filtering', () => {
      const NOW = 1_700_000_000;
      const parsed = {
        modelName: 'Opus 4.6',
        branch: 'main',
        contextPercent: 45,
        contextWindowSize: 200000,
        fiveHourPercent: 32,
        sevenDayPercent: 15,
        fiveHourResetsAt: NOW + 3600,
        sevenDayResetsAt: NOW + 86400,
        costUsd: null,
        sessionName: 'mvp',
      };
      const config = {
        ...DEFAULT_CONFIG,
        secondLine: { enabled: true, show: ['resets'] },
      };
      const result = render(parsed, 'pro', config, NOW);
      assert.ok(!result.includes('📁'), 'session hidden');
      assert.ok(result.includes('↻'), 'resets shown');
    });
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test tests/powerline.test.js`
Expected: new tests fail — resets block not implemented.

- [ ] **Step 3: Implement resets block in `renderSecondLine`**

In `src/powerline.js`, replace the body of the `for (const name of show)` loop with:

```javascript
  for (const name of show) {
    if (name === 'session' && parsed.sessionName) {
      blocks.push(`📁 ${parsed.sessionName}`);
    } else if (name === 'resets' && plan !== 'free' && plan !== 'api') {
      const fh = formatResetDelta(parsed.fiveHourResetsAt, now);
      const sd = formatResetDelta(parsed.sevenDayResetsAt, now);
      const parts = [];
      if (fh != null) parts.push(`5h ${fh}`);
      if (sd != null) parts.push(`7d ${sd}`);
      if (parts.length > 0) {
        blocks.push(`↻ ${parts.join(sep)}`);
      }
    }
  }
```

- [ ] **Step 4: Run all tests**

Run: `node --test`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/powerline.js tests/powerline.test.js
git commit -m "feat: render 5h/7d reset countdown on second line"
```

---

## Task 8: Integration test — two-line output

**Files:**
- Modify: `tests/integration.test.js`
- Modify: `tests/fixtures/sample-input.json` (update timestamps to future so countdown is non-trivial)

- [ ] **Step 1: Update fixture so reset timestamps are in the far future**

Edit `tests/fixtures/sample-input.json`: change the two `resets_at` values to large future unix seconds so the test isn't time-sensitive. Replace these two lines:

```json
      "resets_at": 1743580800
```
```json
      "resets_at": 1744012800
```

with (approximately year 2050, fixed):

```json
      "resets_at": 2527200000
```
```json
      "resets_at": 2527632000
```

Rationale: any `Date.now()` at test execution time will be far earlier, so the countdown renders as days, not `—`.

- [ ] **Step 2: Update integration test assertions**

In `tests/integration.test.js`, update the first test (`'renders powerline output for Pro user fixture'`) — add these assertions after the existing ones, before the closing `});`:

```javascript
    assert.ok(result.includes('\n'), 'should contain newline separator');
    assert.ok(result.includes('📁'), 'second line should show session');
    assert.ok(result.includes('↻'), 'second line should show reset icon');
    assert.ok(result.includes('project'), 'session name should be project_dir basename');
```

Update the API user test (`'renders cost for API user (no rate_limits)'`) to also assert:

```javascript
    assert.ok(result.includes('📁'), 'API user should still see session name');
    assert.ok(!result.includes('↻'), 'API user should not see reset icon');
```

The empty-JSON test (`'renders gracefully for empty JSON input'`) already expects `result === ''` — this still holds because empty input produces both lines empty. No change needed.

- [ ] **Step 3: Run integration tests**

Run: `node --test tests/integration.test.js`
Expected: all pass.

- [ ] **Step 4: Run the whole test suite**

Run: `node --test`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add tests/integration.test.js tests/fixtures/sample-input.json
git commit -m "test: assert two-line output in integration tests"
```

---

## Task 9: Visual smoke test

**Files:** none (manual verification)

- [ ] **Step 1: Pipe the fixture through the CLI and visually inspect**

Run:

```bash
cat tests/fixtures/sample-input.json | node bin/cli.js
echo
```

Expected (roughly — countdown values depend on current date):

```
 🧠 Opus 4.6  main  ████████░░ 78%  ⚡ 5h 33% │ 7d 15% 
📁 project  │  ↻ 5h XhYm  │  7d XdYh
```

Verify:
- Two lines of output
- First line looks identical to before (same segments, same colors)
- Second line is gray text with no background fill
- `📁` and `↻` icons render correctly
- `│` separators visible

- [ ] **Step 2: Test with an API-user fixture**

Run:

```bash
node -e "
const fs = require('fs');
const f = JSON.parse(fs.readFileSync('tests/fixtures/sample-input.json'));
f.rate_limits = null;
process.stdout.write(JSON.stringify(f));
" | node bin/cli.js
echo
```

Expected: two lines — first line has `💰 $1.23`, second line has only `📁 project` (no `↻`).

- [ ] **Step 3: Test with disabled second line**

Run:

```bash
cat tests/fixtures/sample-input.json | HOME=/nonexistent node bin/cli.js
```

(`HOME=/nonexistent` forces defaults; this still shows two lines.) Now create a temp config to disable:

```bash
TMPHOME=$(mktemp -d)
mkdir -p "$TMPHOME/.claude"
echo '{"secondLine":{"enabled":false}}' > "$TMPHOME/.claude/claude-cli-plugin-usage.json"
cat tests/fixtures/sample-input.json | HOME="$TMPHOME" node bin/cli.js
echo
rm -rf "$TMPHOME"
```

Expected: only one line of output, identical to pre-feature behavior.

- [ ] **Step 4: No commit — this task is verification only**

---

## Task 10: Documentation — README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update the top-of-README example to show two lines**

In `README.md`, replace the first code block (the one after the opening paragraph):

Current:

````markdown
```
 🧠 Opus 4.6  main  ████████░░ 78%  ⚡ 5h 32% │ 7d 15% 
```
````

Replace with:

````markdown
```
 🧠 Opus 4.6  main  ████████░░ 78%  ⚡ 5h 32% │ 7d 15% 
📁 mvp  │  ↻ 5h 2h15m  │  7d 3d12h
```
````

- [ ] **Step 2: Add a "Second Line" subsection under "Features" or "Segments"**

Insert after the `## Segments` table, before `## Configuration`:

```markdown
## Second Line

Below the Powerline, a low-key gray line shows:

- **📁 Session name** — worktree name, or project folder name (fallback: current directory)
- **↻ Reset countdowns** — time until the 5-hour and 7-day rate-limit windows reset (Pro / Max only)

The second line is omitted when there's nothing to show, and can be disabled entirely via config.
```

- [ ] **Step 3: Expand the Configuration example**

Update the configuration JSON block to include `secondLine`:

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

Add a short note right after the block:

```markdown
Set `secondLine.enabled` to `false` to restore single-line output. Narrow `secondLine.show` (e.g. `["session"]`) to hide the reset countdown while keeping the session name.
```

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: document second line and secondLine config"
```

---

## Task 11: Final verification

- [ ] **Step 1: Run the full test suite**

Run: `node --test`
Expected: all tests pass, no failures.

- [ ] **Step 2: Re-run the visual smoke test**

Same as Task 9, Step 1. Confirm output looks right.

- [ ] **Step 3: Confirm no regressions in postinstall/uninstall scripts**

Run: `node --test tests/scripts.test.js`
Expected: all pass (these should be untouched by this change).

- [ ] **Step 4: Final commit if anything was tweaked during verification**

If no tweaks were needed, skip. Otherwise:

```bash
git add -p
git commit -m "chore: address verification findings"
```

---

## Notes

- `formatResetDelta` returning `null` vs `'—'` is deliberate: `null` means "no data to display — skip the sub-block entirely"; `'—'` means "timestamp exists but reset is in the past — show placeholder." This distinction matters for the `if (fh != null)` guards in `renderSecondLine`.
- `render` accepts `now` as a parameter (default `Math.floor(Date.now() / 1000)`) purely for test determinism. Production callers (`bin/cli.js`) rely on the default.
- We do NOT pad the second line to terminal width. That would bleed the gray background; the spec explicitly avoids a second powerline bar.
- Session name uses both `/` and `\\` path separators to handle Windows paths from `workspace.project_dir`.
