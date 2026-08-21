# claude-cli-plugin-usage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a cross-platform npm package that renders a Powerline-style status line for Claude Code CLI, showing model, git branch, context usage, and rate limits.

**Architecture:** Node.js CLI that reads JSON from stdin (piped by Claude Code), parses session data, auto-detects plan type, and renders ANSI 256-color Powerline output to stdout. Optional user config file for theme/segment customization.

**Tech Stack:** Node.js (no external dependencies), ANSI escape codes for terminal colors

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `bin/cli.js`
- Create: `.gitignore`
- Create: `LICENSE`

- [ ] **Step 1: Initialize git repo**

Run: `cd /Users/shinichi/Works/side-project/claude-cli-plugin-usage && git init`
Expected: `Initialized empty Git repository`

- [ ] **Step 2: Create package.json**

Create `package.json`:

```json
{
  "name": "claude-cli-plugin-usage",
  "version": "0.1.0",
  "description": "Powerline-style status line plugin for Claude Code CLI — shows model, context usage, rate limits, and cost",
  "bin": {
    "claude-cli-plugin-usage": "./bin/cli.js"
  },
  "scripts": {
    "test": "node --test",
    "postinstall": "node scripts/postinstall.js",
    "preuninstall": "node scripts/preuninstall.js"
  },
  "keywords": ["claude", "claude-code", "cli", "statusline", "powerline", "usage"],
  "author": "",
  "license": "MIT",
  "engines": {
    "node": ">=18.0.0"
  },
  "files": ["bin/", "src/", "scripts/"]
}
```

- [ ] **Step 3: Create bin/cli.js entry point stub**

Create `bin/cli.js`:

```javascript
#!/usr/bin/env node
'use strict';

const { parseInput } = require('../src/parser.js');
const { detectPlan } = require('../src/detector.js');
const { render } = require('../src/powerline.js');
const { loadConfig } = require('../src/config.js');

let data = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { data += chunk; });
process.stdin.on('end', () => {
  try {
    const raw = JSON.parse(data);
    const parsed = parseInput(raw);
    const plan = detectPlan(parsed);
    const config = loadConfig();
    const output = render(parsed, plan, config);
    process.stdout.write(output);
  } catch (err) {
    process.stdout.write('[claude-cli-plugin-usage: parse error]');
  }
});
```

- [ ] **Step 4: Create .gitignore**

Create `.gitignore`:

```
node_modules/
.DS_Store
```

- [ ] **Step 5: Create LICENSE**

Create `LICENSE`:

```
MIT License

Copyright (c) 2026

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 6: Commit**

```bash
git add package.json bin/cli.js .gitignore LICENSE
git commit -m "chore: scaffold project with package.json and cli entry point"
```

---

### Task 2: Theme — Color Definitions

**Files:**
- Create: `src/theme.js`
- Create: `tests/theme.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/theme.test.js`:

```javascript
const { describe, it } = require('node:test');
const assert = require('node:assert');
const { getTheme, ansi256Bg, ansi256Fg, reset, buildTransition } = require('../src/theme.js');

describe('theme', () => {
  describe('getTheme', () => {
    it('returns default theme colors', () => {
      const theme = getTheme('default');
      assert.ok(theme.model, 'should have model color');
      assert.ok(theme.git, 'should have git color');
      assert.ok(theme.contextOk, 'should have contextOk color');
      assert.ok(theme.contextWarn, 'should have contextWarn color');
      assert.ok(theme.contextDanger, 'should have contextDanger color');
      assert.ok(theme.ratelimit, 'should have ratelimit color');
    });

    it('returns default theme when name is unknown', () => {
      const theme = getTheme('nonexistent');
      const def = getTheme('default');
      assert.deepStrictEqual(theme, def);
    });
  });

  describe('ansi helpers', () => {
    it('ansi256Bg wraps color code correctly', () => {
      const result = ansi256Bg(25);
      assert.strictEqual(result, '\x1b[48;5;25m');
    });

    it('ansi256Fg wraps color code correctly', () => {
      const result = ansi256Fg(25);
      assert.strictEqual(result, '\x1b[38;5;25m');
    });

    it('reset returns reset sequence', () => {
      assert.strictEqual(reset(), '\x1b[0m');
    });
  });

  describe('buildTransition', () => {
    it('renders powerline arrow with correct fg/bg', () => {
      const result = buildTransition(25, 133);
      assert.strictEqual(result, '\x1b[38;5;25m\x1b[48;5;133m\x1b[0m');
    });

    it('renders trailing arrow with no next bg', () => {
      const result = buildTransition(240, null);
      assert.strictEqual(result, '\x1b[38;5;240m\x1b[49m\x1b[0m');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/shinichi/Works/side-project/claude-cli-plugin-usage && node --test tests/theme.test.js`
Expected: FAIL — `Cannot find module '../src/theme.js'`

- [ ] **Step 3: Write the implementation**

Create `src/theme.js`:

```javascript
'use strict';

const THEMES = {
  default: {
    model: 25,       // deep blue
    git: 133,        // purple
    contextOk: 28,   // green
    contextWarn: 178, // yellow/orange
    contextDanger: 160, // red
    ratelimit: 240,  // dark gray
    textLight: 255,  // white text
    textDark: 232,   // black text
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
  },
};

function getTheme(name) {
  return THEMES[name] || THEMES.default;
}

function ansi256Bg(code) {
  return `\x1b[48;5;${code}m`;
}

function ansi256Fg(code) {
  return `\x1b[38;5;${code}m`;
}

function reset() {
  return '\x1b[0m';
}

function buildTransition(fromBg, toBg) {
  const fg = ansi256Fg(fromBg);
  const bg = toBg != null ? ansi256Bg(toBg) : '\x1b[49m';
  return `${fg}${bg}\x1b[0m`;
}

module.exports = { getTheme, ansi256Bg, ansi256Fg, reset, buildTransition, THEMES };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/theme.test.js`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/theme.js tests/theme.test.js
git commit -m "feat: add theme module with ANSI 256-color definitions and powerline transitions"
```

---

### Task 3: Parser — Extract Fields from Stdin JSON

**Files:**
- Create: `src/parser.js`
- Create: `tests/parser.test.js`
- Create: `tests/fixtures/sample-input.json`

- [ ] **Step 1: Create test fixture**

Create `tests/fixtures/sample-input.json`:

```json
{
  "model": {
    "id": "claude-opus-4-6",
    "display_name": "Opus 4.6"
  },
  "session_id": "abc123",
  "context_window": {
    "context_window_size": 200000,
    "used_percentage": 78.5,
    "remaining_percentage": 21.5,
    "total_input_tokens": 125000,
    "total_output_tokens": 32000,
    "current_usage": {
      "input_tokens": 5000,
      "output_tokens": 1200,
      "cache_creation_input_tokens": 0,
      "cache_read_input_tokens": 3000
    }
  },
  "cost": {
    "total_cost_usd": 1.23,
    "total_duration_ms": 360000,
    "total_api_duration_ms": 120000,
    "total_lines_added": 45,
    "total_lines_removed": 12
  },
  "rate_limits": {
    "five_hour": {
      "used_percentage": 32.5,
      "resets_at": 1743580800
    },
    "seven_day": {
      "used_percentage": 15.2,
      "resets_at": 1744012800
    }
  },
  "worktree": {
    "name": null,
    "path": null,
    "branch": "main"
  },
  "workspace": {
    "current_dir": "/Users/test/project",
    "project_dir": "/Users/test/project"
  }
}
```

- [ ] **Step 2: Write the failing test**

Create `tests/parser.test.js`:

```javascript
const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { parseInput } = require('../src/parser.js');

const loadFixture = (name) =>
  JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8'));

describe('parser', () => {
  it('extracts all fields from complete input', () => {
    const raw = loadFixture('sample-input.json');
    const result = parseInput(raw);

    assert.strictEqual(result.modelName, 'Opus 4.6');
    assert.strictEqual(result.branch, 'main');
    assert.strictEqual(result.contextPercent, 78.5);
    assert.strictEqual(result.contextWindowSize, 200000);
    assert.strictEqual(result.fiveHourPercent, 32.5);
    assert.strictEqual(result.fiveHourResetsAt, 1743580800);
    assert.strictEqual(result.sevenDayPercent, 15.2);
    assert.strictEqual(result.sevenDayResetsAt, 1744012800);
    assert.strictEqual(result.costUsd, 1.23);
  });

  it('handles missing rate_limits (API user)', () => {
    const raw = loadFixture('sample-input.json');
    raw.rate_limits = null;
    const result = parseInput(raw);

    assert.strictEqual(result.fiveHourPercent, null);
    assert.strictEqual(result.sevenDayPercent, null);
    assert.strictEqual(result.costUsd, 1.23);
  });

  it('handles missing cost (free user)', () => {
    const raw = loadFixture('sample-input.json');
    raw.cost = null;
    raw.rate_limits = null;
    const result = parseInput(raw);

    assert.strictEqual(result.costUsd, null);
    assert.strictEqual(result.fiveHourPercent, null);
  });

  it('handles missing worktree/branch', () => {
    const raw = loadFixture('sample-input.json');
    raw.worktree = null;
    const result = parseInput(raw);

    assert.strictEqual(result.branch, null);
  });

  it('handles completely empty object', () => {
    const result = parseInput({});

    assert.strictEqual(result.modelName, null);
    assert.strictEqual(result.branch, null);
    assert.strictEqual(result.contextPercent, null);
    assert.strictEqual(result.fiveHourPercent, null);
    assert.strictEqual(result.costUsd, null);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node --test tests/parser.test.js`
Expected: FAIL — `Cannot find module '../src/parser.js'`

- [ ] **Step 4: Write the implementation**

Create `src/parser.js`:

```javascript
'use strict';

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
  };
}

module.exports = { parseInput };
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test tests/parser.test.js`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/parser.js tests/parser.test.js tests/fixtures/sample-input.json
git commit -m "feat: add parser to extract session fields from Claude Code JSON"
```

---

### Task 4: Detector — Auto-Detect Plan Type

**Files:**
- Create: `src/detector.js`
- Create: `tests/detector.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/detector.test.js`:

```javascript
const { describe, it } = require('node:test');
const assert = require('node:assert');
const { detectPlan } = require('../src/detector.js');

describe('detectPlan', () => {
  it('detects Max user (rate_limits + 1M context)', () => {
    const result = detectPlan({
      fiveHourPercent: 32,
      sevenDayPercent: 15,
      contextWindowSize: 1000000,
      costUsd: null,
    });
    assert.strictEqual(result, 'max');
  });

  it('detects Pro user (rate_limits + 200k context)', () => {
    const result = detectPlan({
      fiveHourPercent: 32,
      sevenDayPercent: 15,
      contextWindowSize: 200000,
      costUsd: null,
    });
    assert.strictEqual(result, 'pro');
  });

  it('detects API user (no rate_limits + has cost)', () => {
    const result = detectPlan({
      fiveHourPercent: null,
      sevenDayPercent: null,
      contextWindowSize: 200000,
      costUsd: 1.23,
    });
    assert.strictEqual(result, 'api');
  });

  it('detects Free user (no rate_limits, no cost)', () => {
    const result = detectPlan({
      fiveHourPercent: null,
      sevenDayPercent: null,
      contextWindowSize: 200000,
      costUsd: null,
    });
    assert.strictEqual(result, 'free');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/detector.test.js`
Expected: FAIL — `Cannot find module '../src/detector.js'`

- [ ] **Step 3: Write the implementation**

Create `src/detector.js`:

```javascript
'use strict';

function detectPlan(parsed) {
  const hasRateLimits = parsed.fiveHourPercent != null || parsed.sevenDayPercent != null;

  if (hasRateLimits) {
    return parsed.contextWindowSize >= 1000000 ? 'max' : 'pro';
  }
  if (parsed.costUsd != null) {
    return 'api';
  }
  return 'free';
}

module.exports = { detectPlan };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/detector.test.js`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/detector.js tests/detector.test.js
git commit -m "feat: add plan auto-detection (Free/Pro/Max/API)"
```

---

### Task 5: Config — Load Optional User Configuration

**Files:**
- Create: `src/config.js`
- Create: `tests/config.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/config.test.js`:

```javascript
const { describe, it } = require('node:test');
const assert = require('node:assert');
const { mergeConfig, DEFAULT_CONFIG } = require('../src/config.js');

describe('config', () => {
  it('returns defaults when no user config', () => {
    const result = mergeConfig(null);
    assert.deepStrictEqual(result, DEFAULT_CONFIG);
  });

  it('merges partial user config over defaults', () => {
    const userConfig = {
      theme: 'solarized',
      contextBar: { width: 15 },
    };
    const result = mergeConfig(userConfig);
    assert.strictEqual(result.theme, 'solarized');
    assert.strictEqual(result.contextBar.width, 15);
    assert.strictEqual(result.contextBar.thresholds.warn, 60); // default preserved
    assert.deepStrictEqual(result.segments, DEFAULT_CONFIG.segments); // default preserved
  });

  it('overrides segment order', () => {
    const userConfig = { segments: ['context', 'model'] };
    const result = mergeConfig(userConfig);
    assert.deepStrictEqual(result.segments, ['context', 'model']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/config.test.js`
Expected: FAIL — `Cannot find module '../src/config.js'`

- [ ] **Step 3: Write the implementation**

Create `src/config.js`:

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
};

function mergeConfig(userConfig) {
  if (!userConfig) return { ...DEFAULT_CONFIG };
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

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/config.test.js`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/config.js tests/config.test.js
git commit -m "feat: add config loader with defaults and user override merging"
```

---

### Task 6: Powerline Renderer

**Files:**
- Create: `src/powerline.js`
- Create: `tests/powerline.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/powerline.test.js`:

```javascript
const { describe, it } = require('node:test');
const assert = require('node:assert');
const { render, buildProgressBar, buildSegment } = require('../src/powerline.js');
const { DEFAULT_CONFIG } = require('../src/config.js');
const { getTheme } = require('../src/theme.js');

describe('powerline', () => {
  describe('buildProgressBar', () => {
    it('renders 0%', () => {
      const bar = buildProgressBar(0, 10);
      assert.strictEqual(bar, '░░░░░░░░░░');
    });

    it('renders 100%', () => {
      const bar = buildProgressBar(100, 10);
      assert.strictEqual(bar, '██████████');
    });

    it('renders 50%', () => {
      const bar = buildProgressBar(50, 10);
      assert.strictEqual(bar, '█████░░░░░');
    });

    it('renders with custom width', () => {
      const bar = buildProgressBar(50, 6);
      assert.strictEqual(bar, '███░░░');
    });
  });

  describe('buildSegment', () => {
    it('renders text with bg and fg color', () => {
      const result = buildSegment(' hello ', 25, 255);
      assert.ok(result.includes('\x1b[48;5;25m'));
      assert.ok(result.includes('\x1b[38;5;255m'));
      assert.ok(result.includes(' hello '));
    });
  });

  describe('render', () => {
    const theme = getTheme('default');

    it('renders full powerline for Pro user', () => {
      const parsed = {
        modelName: 'Opus 4.6',
        branch: 'main',
        contextPercent: 45,
        contextWindowSize: 200000,
        fiveHourPercent: 32,
        sevenDayPercent: 15,
        fiveHourResetsAt: 1743580800,
        sevenDayResetsAt: 1744012800,
        costUsd: null,
      };
      const result = render(parsed, 'pro', DEFAULT_CONFIG);
      assert.ok(result.includes('Opus 4.6'));
      assert.ok(result.includes('main'));
      assert.ok(result.includes('45%'));
      assert.ok(result.includes('32%'));
      assert.ok(result.includes('15%'));
    });

    it('hides git segment when branch is null', () => {
      const parsed = {
        modelName: 'Sonnet 4.6',
        branch: null,
        contextPercent: 60,
        contextWindowSize: 200000,
        fiveHourPercent: 50,
        sevenDayPercent: 20,
        fiveHourResetsAt: null,
        sevenDayResetsAt: null,
        costUsd: null,
      };
      const result = render(parsed, 'pro', DEFAULT_CONFIG);
      assert.ok(result.includes('Sonnet 4.6'));
      assert.ok(!result.includes(''));
    });

    it('shows cost instead of rate limits for API user', () => {
      const parsed = {
        modelName: 'Opus 4.6',
        branch: 'dev',
        contextPercent: 30,
        contextWindowSize: 200000,
        fiveHourPercent: null,
        sevenDayPercent: null,
        fiveHourResetsAt: null,
        sevenDayResetsAt: null,
        costUsd: 4.56,
      };
      const result = render(parsed, 'api', DEFAULT_CONFIG);
      assert.ok(result.includes('$4.56'));
      assert.ok(!result.includes('5h'));
    });

    it('hides last segment for free user', () => {
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
      };
      const result = render(parsed, 'free', DEFAULT_CONFIG);
      assert.ok(result.includes('Sonnet 4.6'));
      assert.ok(result.includes('20%'));
      assert.ok(!result.includes('5h'));
      assert.ok(!result.includes('$'));
    });

    it('respects custom segment order', () => {
      const parsed = {
        modelName: 'Opus 4.6',
        branch: 'main',
        contextPercent: 50,
        contextWindowSize: 200000,
        fiveHourPercent: 10,
        sevenDayPercent: 5,
        fiveHourResetsAt: null,
        sevenDayResetsAt: null,
        costUsd: null,
      };
      const config = { ...DEFAULT_CONFIG, segments: ['context', 'model'] };
      const result = render(parsed, 'pro', config);
      const ctxIdx = result.indexOf('50%');
      const modelIdx = result.indexOf('Opus 4.6');
      assert.ok(ctxIdx < modelIdx, 'context should appear before model');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/powerline.test.js`
Expected: FAIL — `Cannot find module '../src/powerline.js'`

- [ ] **Step 3: Write the implementation**

Create `src/powerline.js`:

```javascript
'use strict';

const { getTheme, ansi256Bg, ansi256Fg, reset, buildTransition } = require('./theme.js');

function buildProgressBar(percent, width) {
  const filled = Math.round((percent / 100) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

function buildSegment(text, bgColor, fgColor) {
  return `${ansi256Bg(bgColor)}${ansi256Fg(fgColor)}${text}${reset()}`;
}

function getContextBgColor(percent, thresholds, theme) {
  if (percent >= thresholds.danger) return theme.contextDanger;
  if (percent >= thresholds.warn) return theme.contextWarn;
  return theme.contextOk;
}

function getRateLimitColor(percent, thresholds, theme) {
  if (percent >= thresholds.danger) return theme.contextDanger;
  return theme.textLight;
}

function buildModelSegment(parsed, theme) {
  if (!parsed.modelName) return null;
  return { text: ` 🧠 ${parsed.modelName} `, bg: theme.model, fg: theme.textLight };
}

function buildGitSegment(parsed, theme) {
  if (!parsed.branch) return null;
  return { text: `  ${parsed.branch} `, bg: theme.git, fg: theme.textLight };
}

function buildContextSegment(parsed, config, theme) {
  if (parsed.contextPercent == null) return null;
  const pct = Math.round(parsed.contextPercent);
  const bar = buildProgressBar(pct, config.contextBar.width);
  const bg = getContextBgColor(pct, config.contextBar.thresholds, theme);
  return { text: ` ${bar} ${pct}% `, bg, fg: theme.textLight };
}

function buildRatelimitSegment(parsed, plan, config, theme) {
  if (plan === 'free') return null;
  if (plan === 'api') {
    if (parsed.costUsd == null) return null;
    const cost = `$${parsed.costUsd.toFixed(2)}`;
    return { text: ` 💰 ${cost} `, bg: theme.ratelimit, fg: theme.textLight };
  }
  // Pro/Max — show rate limits
  if (parsed.fiveHourPercent == null && parsed.sevenDayPercent == null) return null;
  const fh = parsed.fiveHourPercent != null ? Math.round(parsed.fiveHourPercent) : '—';
  const sd = parsed.sevenDayPercent != null ? Math.round(parsed.sevenDayPercent) : '—';
  const fhColor = typeof fh === 'number'
    ? ansi256Fg(getRateLimitColor(fh, config.ratelimit.thresholds, theme))
    : '';
  const sdColor = typeof sd === 'number'
    ? ansi256Fg(getRateLimitColor(sd, config.ratelimit.thresholds, theme))
    : '';
  const rlReset = fhColor || sdColor ? ansi256Fg(theme.textLight) : '';
  return {
    text: ` ⚡ 5h ${fhColor}${fh}%${rlReset} │ 7d ${sdColor}${sd}%${rlReset} `,
    bg: theme.ratelimit,
    fg: theme.textLight,
  };
}

const SEGMENT_BUILDERS = {
  model: (parsed, _plan, _config, theme) => buildModelSegment(parsed, theme),
  git: (parsed, _plan, _config, theme) => buildGitSegment(parsed, theme),
  context: (parsed, _plan, config, theme) => buildContextSegment(parsed, config, theme),
  ratelimit: (parsed, plan, config, theme) => buildRatelimitSegment(parsed, plan, config, theme),
};

function render(parsed, plan, config) {
  const theme = getTheme(config.theme);
  const segments = [];

  for (const name of config.segments) {
    const builder = SEGMENT_BUILDERS[name];
    if (!builder) continue;
    const seg = builder(parsed, plan, config, theme);
    if (seg) segments.push(seg);
  }

  if (segments.length === 0) return '';

  let output = '';
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    output += buildSegment(seg.text, seg.bg, seg.fg);
    const nextBg = i + 1 < segments.length ? segments[i + 1].bg : null;
    output += buildTransition(seg.bg, nextBg);
  }

  return output;
}

module.exports = { render, buildProgressBar, buildSegment };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/powerline.test.js`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/powerline.js tests/powerline.test.js
git commit -m "feat: add powerline renderer with dynamic segments and color transitions"
```

---

### Task 7: Postinstall / Preuninstall Scripts

**Files:**
- Create: `scripts/postinstall.js`
- Create: `scripts/preuninstall.js`
- Create: `tests/scripts.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/scripts.test.js`:

```javascript
const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { injectSettings, removeSettings } = require('../scripts/postinstall.js');

describe('postinstall / preuninstall', () => {
  let tmpDir;
  let settingsPath;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-test-'));
    settingsPath = path.join(tmpDir, 'settings.json');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('injectSettings', () => {
    it('creates settings file if it does not exist', () => {
      injectSettings(settingsPath);
      const content = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      assert.deepStrictEqual(content.statusLine, {
        type: 'command',
        command: 'claude-cli-plugin-usage',
      });
    });

    it('adds statusLine to existing settings without overwriting other keys', () => {
      fs.writeFileSync(settingsPath, JSON.stringify({ theme: 'dark' }));
      injectSettings(settingsPath);
      const content = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      assert.strictEqual(content.theme, 'dark');
      assert.deepStrictEqual(content.statusLine, {
        type: 'command',
        command: 'claude-cli-plugin-usage',
      });
    });

    it('returns "skipped" if statusLine already exists with different command', () => {
      fs.writeFileSync(settingsPath, JSON.stringify({
        statusLine: { type: 'command', command: 'other-tool' },
      }));
      const result = injectSettings(settingsPath);
      assert.strictEqual(result, 'skipped');
      const content = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      assert.strictEqual(content.statusLine.command, 'other-tool');
    });

    it('returns "exists" if already configured with our command', () => {
      fs.writeFileSync(settingsPath, JSON.stringify({
        statusLine: { type: 'command', command: 'claude-cli-plugin-usage' },
      }));
      const result = injectSettings(settingsPath);
      assert.strictEqual(result, 'exists');
    });
  });

  describe('removeSettings', () => {
    it('removes statusLine if it matches our command', () => {
      fs.writeFileSync(settingsPath, JSON.stringify({
        theme: 'dark',
        statusLine: { type: 'command', command: 'claude-cli-plugin-usage' },
      }));
      removeSettings(settingsPath);
      const content = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      assert.strictEqual(content.theme, 'dark');
      assert.strictEqual(content.statusLine, undefined);
    });

    it('does not remove statusLine if command is different', () => {
      fs.writeFileSync(settingsPath, JSON.stringify({
        statusLine: { type: 'command', command: 'other-tool' },
      }));
      removeSettings(settingsPath);
      const content = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      assert.strictEqual(content.statusLine.command, 'other-tool');
    });

    it('does nothing if settings file does not exist', () => {
      assert.doesNotThrow(() => removeSettings(settingsPath));
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/scripts.test.js`
Expected: FAIL — `Cannot find module '../scripts/postinstall.js'`

- [ ] **Step 3: Write the implementation**

Create `scripts/postinstall.js`:

```javascript
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const STATUSLINE_CONFIG = {
  type: 'command',
  command: 'claude-cli-plugin-usage',
};

function injectSettings(settingsPath) {
  let settings = {};
  try {
    settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  } catch {
    // File doesn't exist or is invalid — start fresh
  }

  if (settings.statusLine) {
    if (settings.statusLine.command === STATUSLINE_CONFIG.command) {
      return 'exists';
    }
    return 'skipped';
  }

  settings.statusLine = { ...STATUSLINE_CONFIG };
  const dir = path.dirname(settingsPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
  return 'injected';
}

function removeSettings(settingsPath) {
  let settings;
  try {
    settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  } catch {
    return;
  }

  if (settings.statusLine?.command !== STATUSLINE_CONFIG.command) return;

  delete settings.statusLine;
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
}

// Run when executed directly (npm postinstall)
if (require.main === module) {
  const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');
  const result = injectSettings(settingsPath);
  if (result === 'injected') {
    console.log('✅ claude-cli-plugin-usage: statusLine configured in ~/.claude/settings.json');
  } else if (result === 'skipped') {
    console.log('⚠️  claude-cli-plugin-usage: statusLine already configured with a different command.');
    console.log('   To use this plugin, manually set statusLine.command to "claude-cli-plugin-usage" in ~/.claude/settings.json');
  } else {
    console.log('✅ claude-cli-plugin-usage: already configured');
  }
}

module.exports = { injectSettings, removeSettings };
```

Create `scripts/preuninstall.js`:

```javascript
'use strict';

const path = require('node:path');
const os = require('node:os');
const { removeSettings } = require('./postinstall.js');

const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');
removeSettings(settingsPath);
console.log('🗑️  claude-cli-plugin-usage: statusLine config removed from ~/.claude/settings.json');
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/scripts.test.js`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/postinstall.js scripts/preuninstall.js tests/scripts.test.js
git commit -m "feat: add postinstall/preuninstall scripts for automatic settings injection"
```

---

### Task 8: Integration Test — End-to-End

**Files:**
- Create: `tests/integration.test.js`

- [ ] **Step 1: Write the integration test**

Create `tests/integration.test.js`:

```javascript
const { describe, it } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const CLI_PATH = path.join(__dirname, '..', 'bin', 'cli.js');
const FIXTURE_PATH = path.join(__dirname, 'fixtures', 'sample-input.json');

describe('integration: cli.js end-to-end', () => {
  it('renders powerline output for Pro user fixture', () => {
    const input = fs.readFileSync(FIXTURE_PATH, 'utf8');
    const result = execFileSync('node', [CLI_PATH], {
      input,
      encoding: 'utf8',
    });

    assert.ok(result.includes('Opus 4.6'), 'should contain model name');
    assert.ok(result.includes('main'), 'should contain branch');
    assert.ok(result.includes('79%') || result.includes('78%'), 'should contain context %');
    assert.ok(result.includes('33%') || result.includes('32%'), 'should contain 5h rate limit');
    assert.ok(result.includes('15%'), 'should contain 7d rate limit');
    assert.ok(result.includes('\x1b['), 'should contain ANSI escape codes');
    assert.ok(result.includes(''), 'should contain powerline arrow');
  });

  it('renders gracefully for empty JSON input', () => {
    const result = execFileSync('node', [CLI_PATH], {
      input: '{}',
      encoding: 'utf8',
    });
    assert.strictEqual(result, '');
  });

  it('renders parse error for invalid JSON', () => {
    const result = execFileSync('node', [CLI_PATH], {
      input: 'not json',
      encoding: 'utf8',
    });
    assert.ok(result.includes('[claude-cli-plugin-usage: parse error]'));
  });

  it('renders cost for API user (no rate_limits)', () => {
    const fixture = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));
    fixture.rate_limits = null;
    const result = execFileSync('node', [CLI_PATH], {
      input: JSON.stringify(fixture),
      encoding: 'utf8',
    });
    assert.ok(result.includes('$1.23'), 'should show cost');
    assert.ok(!result.includes('5h'), 'should not show rate limits');
  });
});
```

- [ ] **Step 2: Run the integration test**

Run: `node --test tests/integration.test.js`
Expected: All tests PASS

- [ ] **Step 3: Make cli.js executable**

Run: `chmod +x bin/cli.js`

- [ ] **Step 4: Run full test suite**

Run: `node --test`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add tests/integration.test.js bin/cli.js
git commit -m "test: add end-to-end integration tests for CLI pipeline"
```

---

### Task 9: README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write README**

Create `README.md`:

````markdown
# claude-cli-plugin-usage

Powerline-style status line for [Claude Code CLI](https://claude.ai/code) — see your model, git branch, context usage, and rate limits at a glance.

```
 🧠 Opus 4.6  main  ████████░░ 78%  ⚡ 5h 32% │ 7d 15% 
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
  }
}
```

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
````

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README with install, config, and usage instructions"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Data flow (stdin → parser → detector → renderer → stdout)
- ✅ 4 segments: model, git, context, ratelimit
- ✅ Plan auto-detection (Free/Pro/Max/API)
- ✅ Dynamic colors (context bar, rate limit warnings)
- ✅ API user shows cost instead of rate limits
- ✅ Free user hides last segment
- ✅ Optional config file with theme/segments/thresholds
- ✅ 3 themes (default/minimal/solarized)
- ✅ Postinstall/preuninstall settings management
- ✅ Error handling (parse error, null fields, existing settings)
- ✅ YAGNI respected (no multi-line, sparkline, MCP, auto-update)

**Placeholder scan:** No TBD, TODO, or vague steps found. All code blocks are complete.

**Type consistency:** `parseInput` returns fields used consistently in `detectPlan`, `render`, and tests. `mergeConfig`/`loadConfig`/`DEFAULT_CONFIG` names match across config.js and powerline.js. `buildTransition`/`buildSegment`/`buildProgressBar` names consistent between theme.js, powerline.js, and tests.
