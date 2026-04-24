import { expect } from '@playwright/test';

import { Tags } from '../../../scripts/test-tags.config';
import {
  Address,
  GetTransactionsByStateGroupPaginatedLifecycleGroupEnum,
} from '../../../src/openapi/arrakis';
import { NeoLeoBrokerSupport } from '../../pages/shared/NeoLeoBrokerSupport';
import { TransactionPage } from '../../pages/transaction/TransactionPage';
import TransactionApiService from '../../services/TransactionApiService';
import CreateTransactionTask from '../../tasks/CreateTransactionTask';
import GetUserTask from '../../tasks/GetUserTask';
import { performActionAndWaitForApiResponse } from '../../utils/HelperUtils';
import { Runner } from '../../utils/Runner';
import { WAIT_APIS } from '../../utils/WaitUtils';

interface BootstrapData {
  transactionId: string;
  transactionAddress: Address;
}

Runner.builder<BootstrapData>()
  .tags(Tags.ROAR)
  .asUSAgent()
  .asCAAgent()
  .onDesktopDevice()
  .withTimeout(90000)
  .bootstrap(async ({ userCredentials }) => {
    const accessToken = userCredentials?.accessToken!;

    // Try creating a fresh transaction; fall back to an existing one if
    // the environment's checklist builder is currently broken (team2 known issue)
    try {
      const transaction = await new CreateTransactionTask(accessToken).run();
      return {
        transactionId: transaction.id ?? '',
        transactionAddress: transaction.address ?? ({} as Address),
      };
    } catch {
      const currentUser = await new GetUserTask(accessToken).run();
      const transactionService = new TransactionApiService();
      transactionService.setJwt(accessToken);

      const { transactions } =
        await transactionService.getTransactionsByStateGroupPaginated(
          currentUser.id!,
          GetTransactionsByStateGroupPaginatedLifecycleGroupEnum.Open,
          0,
          1,
        );

      const transaction = transactions?.[0];
      if (!transaction) {
        throw new Error('No existing open transactions found for this agent');
      }

      return {
        transactionId: transaction.id ?? '',
        transactionAddress: transaction.address ?? ({} as Address),
      };
    }
  })
  .run('call broker team from transaction', ({ test }) => {
    test('opens broker support panel with transaction pre-selected', async ({
      page,
      bootstrapData,
    }) => {
      const transactionPage = new TransactionPage(page);
      const brokerSupport = new NeoLeoBrokerSupport(page);

      // Must be awaited before page.goto so the init script is registered first
      await brokerSupport.setupClipboardAndSMS();

      // 60s timeout: Ketch consent banner on team2 can delay the load event
      await page.goto(`/transactions/${bootstrapData?.transactionId!}`, {
        timeout: 60000,
      });
      await transactionPage.waitForTransactionAddress(
        bootstrapData?.transactionAddress?.oneLine!,
      );

      await transactionPage.openBrokerSupport();

      await brokerSupport.waitForBrokerSupportPanel();

      // When called from a transaction page, the transaction is auto-selected
      // so the selector is hidden — only the question input is shown
      await expect(brokerSupport.introBeforeConnectText).toBeVisible();
      await expect(brokerSupport.introHelpMeUnderstandText).toBeVisible();
    });

    test('can submit a broker question from transaction page', async ({
      page,
      bootstrapData,
    }) => {
      const transactionPage = new TransactionPage(page);
      const brokerSupport = new NeoLeoBrokerSupport(page);

      // Must be awaited before page.goto so the init script is registered first
      await brokerSupport.setupClipboardAndSMS();

      // 60s timeout: Ketch consent banner on team2 can delay the load event
      await page.goto(`/transactions/${bootstrapData?.transactionId!}`, {
        timeout: 60000,
      });
      await transactionPage.waitForTransactionAddress(
        bootstrapData?.transactionAddress?.oneLine!,
      );

      await performActionAndWaitForApiResponse(
        page,
        WAIT_APIS.leoChatSessionCreate,
        () => transactionPage.clickCallBrokerTeamButton(),
      );

      await brokerSupport.waitForBrokerSupportPanel();

      await brokerSupport.submitBrokerQuestion(
        'I have a question about this transaction',
      );

      await brokerSupport.connectWithBroker();

      await expect(brokerSupport.brokerDetailsDiv).toBeVisible();
      await expect(brokerSupport.brokerNameBadge).toBeVisible();
      await expect(brokerSupport.brokerPhoneNumber).toBeVisible();
    });
  });
