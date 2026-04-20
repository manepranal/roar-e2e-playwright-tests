import { expect, Locator, Page } from '@playwright/test';

import { performActionAndWaitForApiResponse } from '../utils/HelperUtils';
import { WAIT_APIS } from '../utils/WaitUtils';

/**
 * CallModal — opens from transaction detail page when BETTER_CALL_FLOWS=OFF.
 * This modal shows broker contact info (virtualNumber, callCode) directly.
 * Different from CallModalStepper which is the multi-step inbox flow.
 */
export class CallModal {
  protected page: Page;

  protected modal: Locator;
  protected callModalForm: Locator;
  protected textMeThisNumberButton: Locator;
  protected phoneNumberTextedMessage: Locator;

  constructor(page: Page) {
    this.page = page;

    this.modal = page.getByLabel('agent-call-modal');
    this.callModalForm = page.getByTestId('call-modal-form');
    this.textMeThisNumberButton = page.getByRole('button', {
      name: 'Text Me This Number',
    });
    this.phoneNumberTextedMessage = page.getByText(
      'This number was texted to your business phone number',
    );
  }

  async waitForCallModalForm() {
    await expect(this.callModalForm).toBeVisible();
  }

  async waitForModalVisible() {
    await expect(this.modal).toBeVisible();
  }

  async waitForModalHidden() {
    await expect(this.modal).toBeHidden();
  }

  async waitForTextMeThisNumberButton() {
    await expect(this.textMeThisNumberButton).toBeVisible();
  }

  async verifyTextMeThisNumberEnabled() {
    await expect(this.textMeThisNumberButton).toBeEnabled();
  }

  async clickTextMeThisNumberWithSMS() {
    await performActionAndWaitForApiResponse(
      this.page,
      [WAIT_APIS.getProfileByUserId, WAIT_APIS.smsDial],
      () => this.textMeThisNumberButton.click(),
    );
  }

  async waitForNumberTextedMessage() {
    await expect(this.phoneNumberTextedMessage).toBeVisible();
  }
}
