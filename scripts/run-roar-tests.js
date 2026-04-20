#!/usr/bin/env node
/**
 * ROAR E2E Interactive Test Runner (cross-platform Node.js version)
 * Works on macOS, Linux, and Windows.
 * No external dependencies — uses only Node.js built-ins.
 *
 * Usage:
 *   node scripts/run-roar-tests.js
 */

'use strict';

const readline = require('readline');
const { execSync } = require('child_process');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const ask = (question) =>
  new Promise((resolve) => rl.question(`\n${question} `, resolve));

const ENVIRONMENTS = {
  '1': { label: 'team1',  url: 'https://bolt.team1realbrokerage.com', config: 'playwright.team1.config.ts' },
  '2': { label: 'team2',  url: 'https://bolt.team2realbrokerage.com', config: 'playwright.team2.config.ts' },
  '3': { label: 'local',  url: 'http://localhost:3003',               config: 'playwright.config.ts' },
};

const AGENT_TESTS = {
  file: 'playwright/aa_roar/agent/call-broker-team-from-transaction.spec.ts',
  personas: {
    '1': { label: 'US Agent', grep: 'as Us Agent' },
    '2': { label: 'CA Agent', grep: 'as Ca Agent' },
    '3': { label: 'Both',     grep: '' },
  },
  scenarios: {
    '1': { label: 'Opens broker support panel',      grep: 'opens broker support panel' },
    '2': { label: 'Full flow: submit + connect',     grep: 'can submit a broker question' },
    '3': { label: 'Both scenarios',                  grep: '' },
  },
};

const BROKER_TESTS = {
  file: 'playwright/aa_roar/broker/call-agent.spec.ts',
  personas: {
    '1': { label: 'US Broker', grep: 'as Us Broker' },
    '2': { label: 'CA Broker', grep: 'as Ca Broker' },
    '3': { label: 'Both',      grep: '' },
  },
  scenarios: {
    '1': { label: 'Call agent from transaction',  grep: 'call agent' },
    '2': { label: 'All broker ROAR scenarios',    grep: '' },
  },
};

async function main() {
  console.log('\n========================================');
  console.log('      ROAR E2E Interactive Runner');
  console.log('========================================\n');

  // --- ENVIRONMENT ---
  console.log('Which environment?');
  console.log('  1) team1  — https://bolt.team1realbrokerage.com');
  console.log('  2) team2  — https://bolt.team2realbrokerage.com');
  console.log('  3) local  — http://localhost:3003');
  console.log('  4) custom — enter your own URL');
  const envChoice = await ask('Select [1-4]:');

  let baseURL, pwConfig;
  if (ENVIRONMENTS[envChoice]) {
    baseURL  = ENVIRONMENTS[envChoice].url;
    pwConfig = ENVIRONMENTS[envChoice].config;
  } else if (envChoice === '4') {
    baseURL  = await ask('Enter base URL:');
    pwConfig = 'playwright.config.ts';
  } else {
    console.error('Invalid choice'); process.exit(1);
  }
  console.log(`  → ${baseURL}`);

  // --- DIRECTION ---
  console.log('\nWho is making the call?');
  console.log('  1) Agent  → calls Broker Team  (from transaction page)');
  console.log('  2) Broker → calls Agent        (on a transaction)');
  const dirChoice = await ask('Select [1-2]:');

  const tests = dirChoice === '1' ? AGENT_TESTS : dirChoice === '2' ? BROKER_TESTS : null;
  if (!tests) { console.error('Invalid choice'); process.exit(1); }
  const direction = dirChoice === '1' ? 'agent' : 'broker';
  console.log(`  → ${direction[0].toUpperCase() + direction.slice(1)} flow`);

  // --- PERSONA ---
  console.log(`\nWhich ${direction}?`);
  Object.entries(tests.personas).forEach(([k, v]) => console.log(`  ${k}) ${v.label}`));
  const personaChoice = await ask(`Select [1-${Object.keys(tests.personas).length}]:`);
  const persona = tests.personas[personaChoice];
  if (!persona) { console.error('Invalid choice'); process.exit(1); }
  console.log(`  → ${persona.label}`);

  // --- SCENARIO ---
  console.log('\nWhich scenario?');
  Object.entries(tests.scenarios).forEach(([k, v]) => console.log(`  ${k}) ${v.label}`));
  const scenarioChoice = await ask(`Select [1-${Object.keys(tests.scenarios).length}]:`);
  const scenario = tests.scenarios[scenarioChoice];
  if (!scenario) { console.error('Invalid choice'); process.exit(1); }
  console.log(`  → ${scenario.label}`);

  // --- RUN MODE ---
  console.log('\nRun mode?');
  console.log('  1) Headless  (fast, no browser window)');
  console.log('  2) Headed    (opens browser — good for debugging)');
  const modeChoice = await ask('Select [1-2]:');
  const headed = modeChoice === '2' ? '--headed' : '';
  console.log(`  → ${headed ? 'Headed' : 'Headless'}`);

  rl.close();

  // --- BUILD GREP ---
  let grepParts = [persona.grep, scenario.grep].filter(Boolean);
  let grepPattern;
  if (grepParts.length === 2) {
    grepPattern = `${grepParts[0]}.*${grepParts[1]}`;
  } else if (grepParts.length === 1) {
    grepPattern = grepParts[0];
  } else {
    grepPattern = '@roar';
  }

  // --- BUILD COMMAND ---
  const cmd = [
    'npx playwright test',
    tests.file,
    `--config ${pwConfig}`,
    '--reporter=list',
    `--grep "${grepPattern}"`,
    headed,
  ].filter(Boolean).join(' ');

  // --- SUMMARY ---
  console.log('\n========================================');
  console.log(` Env      : ${baseURL}`);
  console.log(` Direction: ${direction[0].toUpperCase() + direction.slice(1)} flow`);
  console.log(` Persona  : ${persona.label}`);
  console.log(` Scenario : ${scenario.label}`);
  console.log(` Mode     : ${headed ? 'Headed' : 'Headless'}`);
  console.log('========================================\n');
  console.log(`$ ${cmd}\n`);

  process.env.REACT_APP_HOST_URL = baseURL;
  try {
    execSync(cmd, { stdio: 'inherit', env: { ...process.env, REACT_APP_HOST_URL: baseURL } });
  } catch {
    process.exit(1);
  }
}

main();
