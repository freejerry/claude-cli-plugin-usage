#!/usr/bin/env node
'use strict';

const { parseInput } = require('../src/parser.js');
const { detectPlan } = require('../src/detector.js');
const { render } = require('../src/powerline.js');
const { loadConfig } = require('../src/config.js');

const debugLog = process.env.CLAUDE_CLI_PLUGIN_DEBUG;

let data = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { data += chunk; });
process.stdin.on('end', () => {
  let output = '';
  let status = 'ok';
  try {
    const raw = JSON.parse(data);
    const parsed = parseInput(raw);
    const plan = detectPlan(parsed);
    const config = loadConfig();
    output = render(parsed, plan, config);
    process.stdout.write(output ? output + '\n' : output);
  } catch (err) {
    status = 'parse-error';
    output = '[claude-cli-plugin-usage: parse error]';
    process.stdout.write(output + '\n');
  }
  if (debugLog) {
    try {
      require('node:fs').appendFileSync(
        debugLog,
        `=== ${new Date().toISOString()} [${status}] ===\nSTDIN:\n${data}\nSTDOUT:\n${output}\n\n`
      );
    } catch {}
  }
});
