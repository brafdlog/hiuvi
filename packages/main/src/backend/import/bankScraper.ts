import { type AccountToScrapeConfig } from '@/backend/commonTypes';
import { CompanyTypes, createScraper, type ScraperOptions, SCRAPERS } from 'israeli-bank-scrapers-core';
import { ipcMain } from 'electron';
import { EventNames, type EventPublisher } from '@/backend/eventEmitters/EventEmitter';
import { updateOtpLongTermToken } from '@/backend/configManager/configManager';

export const inputVendors = Object.keys(SCRAPERS)
  .filter((key) => key !== CompanyTypes.hapoalimBeOnline)
  .map((key) => ({ key, ...SCRAPERS[key as CompanyTypes] }));

interface ScrapeParameters {
  companyId: AccountToScrapeConfig['key'];
  credentials: AccountToScrapeConfig['loginFields'];
  startDate: Date;
  showBrowser?: boolean;
  timeout: number;
}

type EmitProgressEventFunction = (eventCompanyId: string, message: string) => Promise<void>;

export async function scrape(
  { companyId, credentials, startDate, timeout, showBrowser = false }: ScrapeParameters,
  emitProgressEvent: EmitProgressEventFunction,
  chromePath: string,
  eventPublisher: EventPublisher,
) {
  const options: ScraperOptions = {
    companyId,
    startDate,
    combineInstallments: false,
    showBrowser,
    verbose: false,
    executablePath: chromePath,
    defaultTimeout: timeout,
  };

  const scraper = createScraper(options);
  scraper.onProgress((eventCompanyId, payload) => emitProgressEvent(companyId, payload.type));

  if (companyId === CompanyTypes.oneZero) {
    const creds = credentials as typeof credentials & { otpLongTermToken: string; phoneNumber: string };
    if (!creds.otpLongTermToken) {
      await scraper.triggerTwoFactorAuth(creds.phoneNumber);
      await eventPublisher.emit(EventNames.GET_OTP);
      const otpCode = await new Promise<string>((resolve) => {
        ipcMain.once('get-otp-response', (event, input) => resolve(input));
      });
      const result = await scraper.getLongTermTwoFactorToken(otpCode);
      if ('longTermTwoFactorAuthToken' in result) {
        await updateOtpLongTermToken(companyId, result.longTermTwoFactorAuthToken);
        creds.otpLongTermToken = result.longTermTwoFactorAuthToken;
      } else {
        throw new Error('Failed to get long-term two-factor auth token');
      }
    }
  }

  return await scraper.scrape(credentials);
}
