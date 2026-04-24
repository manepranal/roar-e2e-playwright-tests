import { expect } from '@playwright/test';

import { Tags } from '../../../scripts/test-tags.config';
import {
  Address,
  GetTransactionsByStateGroupPaginatedLifecycleGroupEnum,
} from '../../../src/openapi/arrakis';
import { CallModal } from '../../pages/CallModal';
import { TransactionPage } from '../../pages/transaction/TransactionPage';
import TransactionApiService from '../../services/TransactionApiService';
import GetUserTask from '../../tasks/GetUserTask';
import { performActionAndWaitForApiResponse } from '../../utils/HelperUtils';
import { Runner } from '../../utils/Runner';
import { WAIT_APIS } from '../../utils/WaitUtils';

interface BootstrapData {
  transactionId: string;
  transactionAddress: Address;
}

// Broker bootstrap: fetch an existing OPEN transaction visible to this broker.
// Unlike the agent flow, brokers cannot create transactions via CreateTransactionTask,
// so we always query existing ones.
Runner.builder<BootstrapData>()
  .tags(Tags.ROAR)
  .asUSBroker()
  .asCABroker()
  .onDesktopDevice()
  .withTimeout(90000)
  .bootstrap(async ({ userCredentials }) => {
    const accessToken = userCredentials?.accessToken!;
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
      throw new Error('No open transactions found for this broker');
    }

    return {
      transactionId: transaction.id ?? '',
      transactionAddress: transaction.address ?? ({} as Address),
    };
  })
  .run('broker calls agent from transaction', ({ test }) => {
    test('shows virtual number and call code when broker initiates call', async ({
      page,
      bootstrapData,
    }) => {
      const transactionPage = new TransactionPage(page);
      const callModal = new CallModal(page);

      // 60s timeout: Ketch consent banner on team2 can delay the load event
      await page.goto(`/transactions/${bootstrapData?.transactionId!}`, {
        timeout: 60000,
      });
      await transactionPage.waitForTransactionAddress(
        bootstrapData?.transactionAddress?.oneLine!,
      );

      // Selects the first agent participant from the sidebar and POSTs
      // to /api/v1/voice/calls — this is the Broker → Agent ROAR flow.
      // Requires TransactionPage.callFirstAgentParticipant() to be implemented.
      await performActionAndWaitForApiResponse(
        page,
        WAIT_APIS.createCalls,
        () => transactionPage.callFirstAgentParticipant(),
      );

      await callModal.waitForModalVisible();
      await callModal.waitForCallModalForm();
    });

    test('can send virtual number via SMS to broker phone number', async ({
      page,
      bootstrapData,
    }) => {
      const transactionPage = new TransactionPage(page);
      const callModal = new CallModal(page);

      // 60s timeout: Ketch consent banner on team2 can delay the load event
      await page.goto(`/transactions/${bootstrapData?.transactionId!}`, {
        timeout: 60000,
      });
      await transactionPage.waitForTransactionAddress(
        bootstrapData?.transactionAddress?.oneLine!,
      );

      await performActionAndWaitForApiResponse(
        page,
        WAIT_APIS.createCalls,
        () => transactionPage.callFirstAgentParticipant(),
      );

      await callModal.waitForModalVisible();
      await callModal.waitForCallModalForm();
      await callModal.waitForTextMeThisNumberButton();
      await callModal.verifyTextMeThisNumberEnabled();
      await callModal.clickTextMeThisNumberWithSMS();
      await callModal.waitForNumberTextedMessage();
    });
  });
