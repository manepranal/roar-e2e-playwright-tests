import { expect } from '@playwright/test';

import { Tags } from '../../../scripts/test-tags.config';
import { RoarOfficeHoursPage } from '../../pages/roar/RoarOfficeHoursPage';
import GetUserTask from '../../tasks/GetUserTask';
import { Runner } from '../../utils/Runner';

interface BootstrapData {
  brokerId: string;
}

// Tests for broker ROAR office hours configuration.
// Office hours control when agents can reach the broker team via ROAR.
// Page object: playwright/pages/roar/RoarOfficeHoursPage.ts (to be created).
Runner.builder<BootstrapData>()
  .tags(Tags.ROAR)
  .asUSBroker()
  .asCABroker()
  .onDesktopDevice()
  .withTimeout(90000)
  .bootstrap(async ({ userCredentials }) => {
    const accessToken = userCredentials?.accessToken!;
    const currentUser = await new GetUserTask(accessToken).run();

    return {
      brokerId: currentUser.id ?? '',
    };
  })
  .run('broker ROAR office hours', ({ test }) => {
    test('displays current office hours on broker settings page', async ({
      page,
      bootstrapData,
    }) => {
      const officeHoursPage = new RoarOfficeHoursPage(page);

      await page.goto('/office-hours', { timeout: 60000 });
      await officeHoursPage.waitForPageLoad();

      await expect(officeHoursPage.officeHoursHeading).toBeVisible();
      await expect(officeHoursPage.scheduleTable).toBeVisible();
    });

    test('broker can update office hours availability', async ({
      page,
      bootstrapData,
    }) => {
      const officeHoursPage = new RoarOfficeHoursPage(page);

      await page.goto('/office-hours', { timeout: 60000 });
      await officeHoursPage.waitForPageLoad();

      await officeHoursPage.toggleDayAvailability('Monday');
      await officeHoursPage.saveChanges();

      await expect(officeHoursPage.saveConfirmation).toBeVisible();
    });
  });
