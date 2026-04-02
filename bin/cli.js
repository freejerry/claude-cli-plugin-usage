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
