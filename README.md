# ROAR E2E Playwright Tests

End-to-end Playwright tests for the **ROAR** (Real Operator Assisted Routing) voice calling feature in the bolt real estate transaction platform.

---

## Quick Start — Interactive Runner

The fastest way to run tests. A CLI will ask you which environment, which agent/broker, and which scenario:

**macOS / Linux (bash):**
```bash
bash scripts/run-roar-tests.sh
```

**Any platform (Node.js):**
```bash
node scripts/run-roar-tests.js
```

The runner will prompt you step by step:

```
========================================
     ROAR E2E Interactive Runner
========================================

Which environment?
  1) team1  — https://bolt.team1realbrokerage.com
  2) team2  — https://bolt.team2realbrokerage.com
  3) local  — http://localhost:3003
  4) custom — enter your own URL
Select [1-4]: 2
  → https://bolt.team2realbrokerage.com

Who is making the call?
  1) Agent  → calls Broker Team  (from transaction page)
  2) Broker → calls Agent        (on a transaction)
Select [1-2]: 1
  → Agent flow

Which agent?
  1) US Agent
  2) CA Agent
  3) Both
Select [1-3]: 3
  → Both personas

Which scenario?
  1) Opens broker support panel (panel renders + intro text)
  2) Full flow: submit question + connect with broker
  3) Both scenarios
Select [1-3]: 2
  → Full flow: submit + connect

Run mode?
  1) Headless  (fast, no browser window)
  2) Headed    (opens browser — good for debugging)
Select [1-2]: 2
  → Headed
```

---

## Manual Commands

```bash
# All ROAR tests on team2
npx playwright test playwright/aa_roar/ --config playwright.team2.config.ts --reporter=list

# Agent → Broker, US Agent only, headed
npx playwright test playwright/aa_roar/agent/call-broker-team-from-transaction.spec.ts \
  --config playwright.team2.config.ts \
  --grep "as Us Agent" \
  --headed

# Broker → Agent, CA Broker, full call flow
npx playwright test playwright/aa_roar/broker/call-agent.spec.ts \
  --config playwright.team2.config.ts \
  --grep "as Ca Broker.*call agent"

# Filter by tag
npx playwright test --config playwright.team2.config.ts --grep @roar
```

---

## Setup

### 1. Install dependencies
```bash
nvm use
yarn install
```

### 2. Configure environment
```bash
# For team2:
cp .env.team2.example .env.team2
# Edit .env.team2 with real API base URLs

# For team1:
cp .env.team1.example .env.team1

# For local:
cp .env.local.example .env
```

### 3. Auth setup (run once per environment)
```bash
# Creates auth storage states (login sessions for each persona)
npx playwright test playwright/loggedin.setup.ts --config playwright.team2.config.ts
```

### 4. Run tests
```bash
bash scripts/run-roar-tests.sh
```

---

## Test Coverage

| Direction | Persona | Scenario | File |
|---|---|---|---|
| Agent → Broker | US Agent, CA Agent | Opens broker support panel | `aa_roar/agent/call-broker-team-from-transaction.spec.ts` |
| Agent → Broker | US Agent, CA Agent | Submit question + connect with broker | `aa_roar/agent/call-broker-team-from-transaction.spec.ts` |
| Broker → Agent | US Broker, CA Broker | Call agent from transaction + SMS | `aa_roar/broker/call-agent.spec.ts` |

---

## How the Flows Work

### Agent → Broker Team (BETTER_CALL_FLOWS=ON)
```
Transaction Page → "Call Broker Team"
  → NeoLeo panel opens (Leo AI, BETTER_CALL_FLOWS flag ON)
  → Transaction auto-selected (selector hidden)
  → Agent types question → Submit
  → Leo responds → "Connect with Broker" button
  → Broker details shown (name, phone number)
```

### Broker → Agent
```
Transaction Page → participant list
  → Select agent from sidebar
  → POST /api/v1/voice/calls
  → virtualNumber + callCode shown
  → Optional: "Text Me This Number" SMS
```

---

## Environment Quick Reference

| Environment | URL | Config File | Notes |
|---|---|---|---|
| team1 | `bolt.team1realbrokerage.com` | `playwright.team1.config.ts` | Stable QA |
| team2 | `bolt.team2realbrokerage.com` | `playwright.team2.config.ts` | Active dev, BETTER_CALL_FLOWS=ON |
| local | `localhost:3003` | `playwright.config.ts` | Requires `yarn start:test` |

---

## Known Issues

See [docs/KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md) for full details.

| Issue | Environment | Fix |
|---|---|---|
| `CreateTransactionTask` 400 error | team2 | Bootstrap fallback: fetch existing `OPEN` transaction |
| Ketch banner blocks `page.goto` | team2 CA Agent | Use `{ timeout: 60000 }` on `page.goto` |
| `WAIT_APIS.createCalls` never fires | team2 | Use `leoChatSessionCreate` instead (BETTER_CALL_FLOWS=ON) |
| `transactionSelectorLabel` not visible | All | Hidden on transaction pages — do not assert it |

---

## Project Structure

```
.
├── scripts/
│   ├── run-roar-tests.sh          # Interactive runner (macOS/Linux)
│   └── run-roar-tests.js          # Interactive runner (Node.js, cross-platform)
├── config/
│   └── environments.json          # All env/persona/test file configurations
├── docs/
│   ├── ARCHITECTURE.md            # Runner pattern, page objects, BaseTask
│   ├── KNOWN_ISSUES.md            # team2 environment quirks
│   └── ROAR_FEATURE.md            # Feature deep-dive, API reference
├── playwright/
│   ├── pages/
│   │   ├── CallModal.ts                      # Old ROAR modal (BETTER_CALL_FLOWS=OFF)
│   │   └── shared/
│   │       └── NeoLeoBrokerSupport.ts        # NeoLeo broker support panel
│   └── aa_roar/
│       ├── agent/
│       │   └── call-broker-team-from-transaction.spec.ts
│       └── broker/
│           └── call-agent.spec.ts
├── .env.team1.example
├── .env.team2.example
└── .env.local.example
```

---

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for patterns: Runner builder, Page Objects, BaseTask, web-first assertions.
