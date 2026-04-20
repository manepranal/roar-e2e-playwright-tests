# Test Architecture

This project follows the bolt Playwright E2E testing conventions. All tests use the **Runner pattern**, **Page Object Model**, and **BaseTask** for bootstrap.

---

## Runner Pattern

All test specs are built with `Runner.builder<BootstrapData>()`. The builder configures:

| Method | Purpose |
|---|---|
| `.tags(Tags.ROAR)` | Tag for selective test runs (`--grep @roar`) |
| `.asUSAgent()` / `.asCAAgent()` | Auth persona — runs tests as that user type |
| `.onDesktopDevice()` | Viewport: desktop |
| `.withTimeout(90000)` | Per-test timeout in ms |
| `.bootstrap(async fn)` | Runs once per persona before tests; returns shared data |
| `.run(suiteName, fn)` | Defines the `test()` blocks |

### Bootstrap Function

The bootstrap runs **before all tests in the suite** for a given persona. Its return value is injected as `bootstrapData` into each test. Use it for:
- Creating test data (transactions, users)
- Fetching existing data as fallback
- Setting up anything that's shared across tests

```typescript
.bootstrap(async ({ userCredentials }) => {
  const accessToken = userCredentials?.accessToken!;
  const transaction = await new CreateTransactionTask(accessToken).run();
  return { transactionId: transaction.id ?? '' };
})
```

---

## Page Object Model

All locators live in **Page Objects** in `playwright/pages/`. No raw `page.locator()` or `page.getByRole()` calls in test spec files (enforced by `bolt/no-raw-locators-in-tests` lint rule).

### Page Object Conventions

```typescript
export class MyPage extends AbstractPage {
  // Declare all locators as fields
  private readonly myButton: Locator;
  readonly visibleResultText: Locator;

  constructor(page: Page) {
    super(page);
    // Initialize inline — never in separate method
    this.myButton = page.getByTestId('my-button');
    this.visibleResultText = page.getByTestId('result-text');
  }

  // One action per method
  async clickMyButton() {
    await this.myButton.click();
  }
}
```

**Visibility rules:**
- `private` — only used inside the class
- `protected` — may be used by subclasses
- `readonly` (public) — can be asserted on directly from tests with `expect(page.myLocator).toBeVisible()`

---

## BaseTask Pattern

Bootstrap operations (create transaction, get user, etc.) are in `playwright/tasks/`. Each task extends `BaseTask`:

```typescript
export default class CreateTransactionTask extends BaseTask {
  constructor(accessToken: string) {
    super(accessToken);
  }

  async run(): Promise<TransactionResponse> {
    // API calls using the accessToken
  }
}
```

Tasks are used in `.bootstrap()`, never directly in test steps.

---

## Web-First Assertions

Always use Playwright's built-in async assertions — never check `.isVisible()` synchronously:

```typescript
// CORRECT
await expect(locator).toBeVisible();
await expect(locator).toBeHidden();       // Not .not.toBeVisible()
await expect(locator).toHaveText('...');

// WRONG
const visible = await locator.isVisible();
if (visible) { ... }
```

---

## API Wait Utilities

Use `performActionAndWaitForApiResponse` to combine a UI action with an API response wait:

```typescript
await performActionAndWaitForApiResponse(
  page,
  WAIT_APIS.leoChatSessionCreate,   // API to wait for
  () => transactionPage.clickCallBrokerTeamButton(),
);
```

This prevents race conditions where the test proceeds before the API response is received.

---

## Directory Structure

```
playwright/
├── aa_roar/             # ROAR feature tests (aa_ prefix = auto-tagged)
│   ├── agent/           # Agent persona tests
│   └── broker/          # Broker persona tests
├── pages/               # Page objects
│   ├── shared/          # Cross-feature page objects
│   └── transaction/     # Transaction page objects
├── tasks/               # Bootstrap tasks
├── services/            # API service wrappers
└── utils/               # Helpers, wait utils, runner
```
