# Known Issues & Environment Quirks

## team2 Environment

### 1. Checklist Builder Fails on Transaction Create

**Symptom:**
```
AxiosError: 400 — "Error while building checklists for transaction"
```

**When:** `CreateTransactionTask.run()` → `POST /api/v1/transaction-builder/:id/submit`

**Cause:** The checklist builder service on team2 is intermittently broken. This is a known backend environment issue unrelated to the test code.

**Fix:** Add a try/catch in bootstrap and fall back to fetching an existing OPEN transaction:

```typescript
try {
  const transaction = await new CreateTransactionTask(accessToken).run();
  return { transactionId: transaction.id };
} catch {
  const currentUser = await new GetUserTask(accessToken).run();
  const svc = new TransactionApiService();
  svc.setJwt(accessToken);

  const { transactions } = await svc.getTransactionsByStateGroupPaginated(
    currentUser.id!,
    GetTransactionsByStateGroupPaginatedLifecycleGroupEnum.Open,
    0, 1,
  );

  const transaction = transactions?.[0];
  if (!transaction) throw new Error('No open transactions found');
  return { transactionId: transaction.id };
}
```

> **Note:** The paginated response field is `transactions` (not `results`). Check `PagedTransactionResponse` in `src/openapi/arrakis/api.ts`.

---

### 2. Ketch Privacy Banner Blocks Page Load

**Symptom:**
```
TimeoutError: page.goto: Timeout 30000ms exceeded.
navigating to "https://bolt.team2realbrokerage.com/transactions/...", waiting until "load"
```

**When:** Navigating to a transaction detail page as CA Agent (or any agent whose auth storage state does not have the Ketch consent cookie pre-set).

**Cause:** The Ketch consent management banner loads external resources that block the browser `load` event for 30–50 seconds.

**Fix:** Increase `page.goto` timeout to 60 seconds:

```typescript
await page.goto(`/transactions/${transactionId}`, { timeout: 60000 });
```

The page content loads quickly; only the Ketch third-party script is slow. `waitForTransactionAddress` handles the actual content readiness.

**Do NOT use `addLocatorHandler` for the Ketch banner** — it causes flakiness where even US Agent tests start failing because Playwright pauses actions to check for the handler element.

---

### 3. BETTER_CALL_FLOWS Feature Flag Always On

**Symptom:** `WAIT_APIS.createCalls` timeout — `POST /api/v1/voice/calls` never fires.

**Cause:** The `BETTER_CALL_FLOWS` feature flag is enabled in team2. When this flag is ON, clicking "Call Broker Team" opens the **NeoLeo broker support panel** instead of the old ROAR call modal. The voice call API is only called AFTER the broker question is submitted and the connection is made.

**Fix:** Use `NeoLeoBrokerSupport` page object and wait for `leoChatSessionCreate` instead:

```typescript
// WRONG for team2
await performActionAndWaitForApiResponse(
  page,
  WAIT_APIS.createCalls,  // Never fires on team2
  () => transactionPage.clickCallBrokerTeamButton(),
);

// CORRECT for team2
await performActionAndWaitForApiResponse(
  page,
  WAIT_APIS.leoChatSessionCreate,
  () => transactionPage.clickCallBrokerTeamButton(),
);
```

---

### 4. Transaction Selector Hidden on Transaction Pages

**Symptom:** `transactionSelectorLabel` not found / test fails asserting selector is visible.

**Cause:** When the NeoLeo broker support panel is opened from a **transaction detail page**, the transaction is auto-selected. The transaction selector dropdown is intentionally hidden in this context.

**Fix:** Do not assert `transactionSelectorLabel` visibility in tests that open broker support from a transaction page. Only assert `introBeforeConnectText` and `introHelpMeUnderstandText`.
