import { expect, Locator, Page } from '@playwright/test';

import { NeoLeoPanel } from './NeoLeoPanel';

import { performActionAndWaitForApiResponse } from '../../utils/HelperUtils';
import { WAIT_APIS } from '../../utils/WaitUtils';

/**
 * NeoLeoBrokerSupport — the AI-assisted broker support panel.
 * Opens when BETTER_CALL_FLOWS feature flag is ON.
 * Entry points: transaction detail page, agent inbox.
 *
 * IMPORTANT: call `await brokerSupport.setupClipboardAndSMS()` before
 * `page.goto()` in any test that exercises SMS or clipboard functionality.
 * It cannot be called from the constructor because it is async.
 */
export class NeoLeoBrokerSupport {
  protected page: Page;
  protected neoLeoPanel: NeoLeoPanel;

  // Intro Elements
  readonly introBeforeConnectText: Locator;
  readonly introHelpMeUnderstandText: Locator;

  // Transaction Selection Elements (hidden when opened from transaction page)
  readonly transactionSelectorLabel: Locator;
  protected transactionSelect: Locator;
  protected transactionSearchInput: Locator;
  protected genericQuestionOption: Locator;

  // Question Elements
  protected questionTextarea: Locator;
  protected submitButton: Locator;

  // Broker Connection Elements
  protected connectWithBrokerButton: Locator;

  // Broker Details Elements
  readonly brokerDetailsDiv: Locator;
  readonly brokerNameBadge: Locator;
  readonly brokerPhoneNumber: Locator;
  protected copyPhoneNumberButton: Locator;
  protected textMeNumberButton: Locator;

  // SMS Opt-in Modal
  protected optInModal: Locator;
  protected optInYesButton: Locator;

  // Call Again Elements
  readonly callAgainButton: Locator;
  readonly smsSentMessage: Locator;
  readonly smsRecipientNumber: Locator;
  readonly smsSentTime: Locator;

  // General panel locators
  protected miniNeoLeoPanel: Locator;
  protected fetchingOfficeConversation: Locator;
  protected expandCollapseButton: Locator;
  readonly callModal: Locator;
  readonly leoPanel: Locator;
  readonly fullScreenPanel: Locator;

  constructor(page: Page) {
    this.page = page;
    this.neoLeoPanel = new NeoLeoPanel(page);

    // Intro
    this.introBeforeConnectText = page.getByTestId('broker-support-intro-before');
    this.introHelpMeUnderstandText = page.getByTestId('broker-support-intro-help');

    // Transaction Selection
    this.transactionSelectorLabel = page.getByTestId('broker-support-transaction-selector-label');
    this.transactionSelect = page.getByTestId('broker-support-transaction-selector');
    this.transactionSearchInput = page.getByPlaceholder('Select a transaction or general question');
    this.genericQuestionOption = page.getByRole('option', { name: 'General Question' });

    // Question
    this.questionTextarea = page.getByPlaceholder('Enter your question here...');
    this.submitButton = page.getByTestId('broker-support-submit-button');

    // Connect
    this.connectWithBrokerButton = page.getByTestId('broker-support-connect-button');

    // Broker Details
    this.brokerDetailsDiv = page.locator('[data-testid="broker-details-widget"]');
    this.brokerNameBadge = page.locator('[data-testid="broker-office-name"]');
    this.brokerPhoneNumber = page.locator('[data-testid="broker-phone-number"]');
    this.copyPhoneNumberButton = page.getByTestId('broker-support-copy-phone-number');
    this.textMeNumberButton = page.getByTestId('broker-support-text-me-button');

    // SMS Opt-in
    this.optInModal = page.getByTestId('broker-support-optin-modal');
    this.optInYesButton = page.getByTestId('broker-support-optin-yes-button');

    // Call Again
    this.callAgainButton = page.getByTestId('broker-support-call-again-button');
    this.smsSentMessage = page.getByTestId('broker-support-sms-sent-message');
    this.smsRecipientNumber = page.getByTestId('broker-support-sms-recipient-number');
    this.smsSentTime = page.getByTestId('broker-support-sms-sent-time');

    // Panel
    this.miniNeoLeoPanel = page.getByTestId('mini-neo-leo-panel');
    this.fetchingOfficeConversation = page.getByText('Fetching office details...');
    this.expandCollapseButton = page.getByTestId('neo-leo-expand-collapse-button');
    this.callModal = page.getByLabel('call-modal-stepper');
    this.leoPanel = page.getByTestId('leo-panel');
    this.fullScreenPanel = page.getByTestId('neo-leo-full-screen-panel');
  }

  async verifyMiniLeoPanelIsOpen() {
    await expect(this.miniNeoLeoPanel).toBeVisible();
  }

  async verifyFullScreenLeoPanelIsOpen() {
    await expect(this.fullScreenPanel).toBeVisible();
  }

  /** Waits for the broker support panel and question textarea to be visible */
  async waitForBrokerSupportPanel() {
    await this.miniNeoLeoPanel.waitFor({ state: 'visible' });
    await this.questionTextarea.waitFor({ state: 'visible' });
  }

  /**
   * Selects a transaction from the dropdown by address.
   * Only needed when opening from a NON-transaction page (e.g., inbox).
   * When opening from a transaction page the selector is auto-hidden.
   */
  async selectTransaction(transactionAddress: string) {
    await this.transactionSelect.click();
    await this.page.waitForTimeout(500);

    const hasSearchInput = await this.transactionSearchInput
      .isVisible()
      .catch(() => false);
    if (hasSearchInput) {
      await this.transactionSearchInput.fill(transactionAddress);
      await this.page.waitForTimeout(500);
    }

    await this.page.getByText(transactionAddress, { exact: false }).first().click();
  }

  async selectGenericOption() {
    await this.transactionSelect.click();
    await this.genericQuestionOption.click();
  }

  /** Fills question textarea and waits for Leo stream API response */
  async submitBrokerQuestion(question: string) {
    await this.questionTextarea.fill(question);
    await performActionAndWaitForApiResponse(
      this.page,
      WAIT_APIS.leoChatStream,
      () => this.submitButton.click(),
    );
  }

  async clickConnectWithBrokerButton() {
    await expect(this.fetchingOfficeConversation).toBeHidden();
    await this.connectWithBrokerButton.scrollIntoViewIfNeeded();
    await expect(this.connectWithBrokerButton).toBeVisible();
    await this.connectWithBrokerButton.click();
  }

  /** Clicks connect and waits for broker details to appear */
  async connectWithBroker() {
    await this.clickConnectWithBrokerButton();
    await this.brokerDetailsDiv.waitFor({ state: 'visible' });
  }

  async connectWithBrokerV2() {
    await this.clickConnectWithBrokerButton();
  }

  async expandLeoIfNeeded() {
    const isCopyButtonVisible = await this.copyPhoneNumberButton
      .isVisible({ timeout: 1000 })
      .catch(() => false);
    if (!isCopyButtonVisible) {
      await this.expandCollapseButton.click();
    }
  }

  async copyPhoneNumberWithExpand() {
    await this.expandLeoIfNeeded();
    await this.copyPhoneNumberButton.click();
  }

  async sendBrokerPhoneNumberSMS() {
    await performActionAndWaitForApiResponse(
      this.page,
      WAIT_APIS.roarSmsDialNumber,
      () => this.textMeNumberButton.click(),
    );
  }

  /**
   * Clears SMS opt-in state and mocks clipboard for clean test runs.
   * Must be called with `await` before `page.goto()` in any test that
   * exercises SMS or clipboard functionality.
   */
  async setupClipboardAndSMS() {
    await this.page.addInitScript(() => {
      localStorage.removeItem('sms_opted_in');
      let clipboardText = '';
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: (text: string) => {
            clipboardText = text;
            return Promise.resolve();
          },
          readText: () => Promise.resolve(clipboardText),
        },
        writable: true,
        configurable: true,
      });
    });
  }
}
