# ROAR E2E Playwright Tests

End-to-end Playwright tests for the **ROAR** (Real Operator Assisted Routing) voice calling feature in the [bolt](https://github.com/realtechsupport/bolt) real estate transaction management platform.

---

## What Is ROAR?

ROAR is the voice calling system that connects agents with their broker team. It handles:

- **Voice calls** between agents and broker team
- **Call transcription** and speaker identification
- **Office hours / Out-of-office** routing
- **SMS dial-number** delivery

When the `BETTER_CALL_FLOWS` feature flag is **ON** (default on team2), clicking "Call Broker Team" routes through **NeoLeo Broker Support** — an AI-assisted panel that collects the agent's question before connecting them to a broker. When the flag is **OFF**, the old ROAR modal (`CallModal`) opens directly.

---

## Test Scenarios Covered

| Scenario | Persona | Environment |
|---|---|---|
| Opens broker support panel with transaction pre-selected | US Agent, CA Agent | team2 |
| Submits a broker question from transaction page | US Agent, CA Agent | team2 |

### Flow Under Test

```
Transaction Detail Page
  └─ Click "Call Broker Team"
       └─ NeoLeo panel opens (BETTER_CALL_FLOWS=ON)
            └─ Transaction auto-selected (no selector shown)
            └─ Agent types question → Submit
            └─ Click "Connect with Broker"
                 └─ Broker details div visible
                 └─ Broker name badge visible
                 └─ Broker phone number visible
```

---

## Repo Structure

```
.
├── README.md
├── docs/
│   ├── ARCHITECTURE.md        # Runner pattern, page objects, bootstrap tasks
│   ├── KNOWN_ISSUES.md        # team2 known environment issues
│   └── ROAR_FEATURE.md        # Deep-dive on ROAR & NeoLeo flow
└── playwright/
    ├── pages/
    │   ├── CallModal.ts                      # Page object: old ROAR modal (BETTER_CALL_FLOWS=OFF)
    │   └── shared/
    │       └── NeoLeoBrokerSupport.ts         # Page object: NeoLeo broker support panel
    └── aa_roar/
        └── agent/
            └── call-broker-team-from-transaction.spec.ts  # Main test spec
```

---

## Running the Tests

### Prerequisites

1. Clone the bolt project and install dependencies:
   ```bash
   nvm use
   yarn install
   cp .env.example .env
   ```

2. Ensure you have valid auth storage states (run auth setup once):
   ```bash
   npx playwright test playwright/loggedin.setup.ts
   ```

### Run ROAR Tests

```bash
# Run all ROAR tests (headless)
npx playwright test playwright/aa_roar/agent/call-broker-team-from-transaction.spec.ts --reporter=list

# Run with browser visible (headed mode)
npx playwright test playwright/aa_roar/agent/call-broker-team-from-transaction.spec.ts --headed

# Run a single test by name
npx playwright test playwright/aa_roar/agent/call-broker-team-from-transaction.spec.ts -g "opens broker support panel"

# Run by tag
npx playwright test --grep @roar
```

### Target Environment

Tests run against **team2**: `https://bolt.team2realbrokerage.com`

Configure the base URL in `playwright/config/environments.ts`.

---

## Key Implementation Decisions

### 1. BETTER_CALL_FLOWS Feature Flag

On team2, the `BETTER_CALL_FLOWS` feature flag is **ON** by default. This means:

- `POST /api/v1/voice/calls` is **never called** when the agent clicks "Call Broker Team"
- Instead, a Leo chat session is created: `POST /api/v1/leo/chat/sessions`
- The test waits for `WAIT_APIS.leoChatSessionCreate` instead of `WAIT_APIS.createCalls`

If you are testing the old ROAR modal (flag OFF), use `CallModal.ts` page object and `WAIT_APIS.createCalls`.

### 2. Bootstrap Fallback for team2

The `CreateTransactionTask` fails on team2 with:
```
400 "Error while building checklists for transaction"
```

This is a known backend environment issue (checklist builder broken for team2). The bootstrap handles this gracefully:

```typescript
try {
  const transaction = await new CreateTransactionTask(accessToken).run();
  // use fresh transaction
} catch {
  // Fall back to first existing OPEN transaction
  const { transactions } = await transactionService
    .getTransactionsByStateGroupPaginated(userId, 'OPEN', 0, 1);
}
```

> **Note**: The response field is `transactions` (not `results`). This is defined in `PagedTransactionResponse` in `src/openapi/arrakis/api.ts`.

### 3. Ketch Privacy Banner Timeout Fix

On team2, the Ketch consent management banner can delay the page `load` event by 30–50 seconds for some agent personas (CA Agent specifically). The fix is to increase the `page.goto` timeout to 60 seconds:

```typescript
await page.goto(`/transactions/${transactionId}`, { timeout: 60000 });
```

This is sufficient because the page content (transaction banner address) loads quickly; it's only the Ketch third-party script that's slow.

### 4. Transaction Pre-Selection

When the broker support panel is opened **from a transaction detail page**, the transaction is automatically pre-selected. This means:

- The transaction selector dropdown is **hidden** (not shown to the agent)
- The `transactionSelectorLabel` locator will NOT be visible
- Only the question textarea is shown

Do **not** assert `transactionSelectorLabel` visibility in transaction-page tests.

---

## API Reference

| API | When Fired | WAIT_APIS key |
|---|---|---|
| `POST /api/v1/leo/chat/sessions` | Agent clicks "Call Broker Team" (BETTER_CALL_FLOWS=ON) | `leoChatSessionCreate` |
| `POST /api/v1/voice/calls` | Agent clicks "Call Broker Team" (BETTER_CALL_FLOWS=OFF) | `createCalls` |
| `GET /api/v1/leo/chat/*/stream` | After question submitted | `leoChatStream` |
| `GET /api/v1/voice/calls/*/sms-dial-number` | SMS text me flow | `roarSmsDialNumber` |

---

## Page Objects

### `NeoLeoBrokerSupport`

Covers the NeoLeo broker support panel (BETTER_CALL_FLOWS=ON).

Key methods:
- `waitForBrokerSupportPanel()` — waits for panel and question textarea
- `submitBrokerQuestion(question)` — fills question, waits for Leo stream API
- `connectWithBroker()` — clicks connect button, waits for broker details
- `selectTransaction(address)` — selects a transaction by address (non-transaction pages)

### `CallModal`

Covers the old direct ROAR call modal (BETTER_CALL_FLOWS=OFF, or future regression tests).

Key methods:
- `waitForCallModalForm()` — waits for modal form
- `waitForModalVisible()` / `waitForModalHidden()`
- `clickTextMeThisNumberWithSMS()` — triggers SMS dial API

---

## Contributing

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for patterns to follow when adding new tests.
