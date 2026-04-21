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
    assert.strictEqual(result.fiveHourResetsAt, 2527200000);
    assert.strictEqual(result.sevenDayPercent, 15.2);
    assert.strictEqual(result.sevenDayResetsAt, 2527632000);
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

  it('falls back to project_dir when worktree.name is empty string', () => {
    const raw = loadFixture('sample-input.json');
    raw.worktree = { name: '', path: '/tmp', branch: 'main' };
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
});
