import { userDataPath } from '@/app-globals';
import {
  type AccountToScrapeConfig,
  type Config,
  type EnrichedTransaction,
  type ScraperScrapingResult,
} from '@/backend/commonTypes';
import * as bankScraper from '@/backend/import/bankScraper';
import Bottleneck from 'bottleneck';
import { type Transaction } from 'israeli-bank-scrapers-core/lib/transactions';
import moment from 'moment';
import {
  AccountStatus,
  DownalodChromeEvent,
  EventNames,
  type EventPublisher,
  ImporterEvent,
} from '../eventEmitters/EventEmitter';
import { calculateTransactionHash } from '../transactions/transactions';
import getChrome from './downloadChromium';
import logger from '/@/logging/logger';

type ScrapingConfig = Config['scraping'];

const TRANSACTION_STATUS_COMPLETED = 'completed';

export async function scrapeFinancialAccountsAndFetchTransactions(
  scrapingConfig: ScrapingConfig,
  startDate: Date,
  eventPublisher: EventPublisher,
) {
  let chromiumPath: string;

  logger.log('Scraping financial accounts and fetching transactions');

  if (scrapingConfig.chromiumPath) {
    logger.log('Using provided chromium path', scrapingConfig.chromiumPath);
    chromiumPath = scrapingConfig.chromiumPath;
  } else {
    logger.log('Downloading chromium');
    chromiumPath = await getChrome(userDataPath, (percent) => emitChromeDownload(eventPublisher, percent));
  }

  const limiter = new Bottleneck({
    maxConcurrent: scrapingConfig.maxConcurrency,
  });
  const scrapePromises = scrapingConfig.accountsToScrape
    .filter((accountToScrape) => accountToScrape.active !== false)
    .map(async (accountToScrape) => ({
      id: accountToScrape.id,
      transactions: await limiter.schedule(() =>
        fetchTransactions(
          accountToScrape,
          startDate,
          scrapingConfig.showBrowser,
          eventPublisher,
          chromiumPath,
          scrapingConfig.timeout,
        ),
      ),
    }));

  const promiseResults = await Promise.allSettled(scrapePromises);
  const companyIdToTransactions = promiseResults.reduce(
    (idToTrxAcc, scrapeRes) => {
      if (scrapeRes.status === 'fulfilled') {
        const { id, transactions } = scrapeRes.value;
        idToTrxAcc[id] = transactions;
      }
      return idToTrxAcc;
    },
    {} as Record<string, EnrichedTransaction[]>,
  );

  return companyIdToTransactions;
}

function buildImporterEvent(
  accountConfig: AccountToScrapeConfig,
  additionalParams: { message: string; error?: Error; status?: AccountStatus },
) {
  return new ImporterEvent({
    message: additionalParams.message,
    importerKey: accountConfig.key,
    error: additionalParams.error,
    status: additionalParams.status,
  });
}

function emitChromeDownload(eventPublisher: EventPublisher, percent: number) {
  console.log(`Downloading chrome ${percent}%`);
  eventPublisher.emit(EventNames.DOWNLOAD_CHROME, new DownalodChromeEvent(percent));
}

async function fetchTransactions(
  account: AccountToScrapeConfig,
  startDate: Date,
  showBrowser: boolean,
  eventPublisher: EventPublisher,
  chromePath: string,
  timeout: number,
) {
  try {
    await eventPublisher.emit(EventNames.IMPORTER_START, buildImporterEvent(account, { message: 'Importer start' }));

    const emitImporterProgressEvent = async (eventCompanyId: string, message: string) => {
      await eventPublisher.emit(EventNames.IMPORTER_PROGRESS, buildImporterEvent(account, { message }));
    };
    const companyId = account.key;
    const scrapeResult = await bankScraper.scrape(
      {
        companyId,
        credentials: account.loginFields,
        startDate,
        showBrowser,
        timeout,
      },
      emitImporterProgressEvent,
      chromePath,
      eventPublisher,
    );
    if (!scrapeResult.success) {
      throw new Error(`${scrapeResult.errorType}: ${scrapeResult.errorMessage}`);
    }

    const transactions = await postProcessTransactions(account, scrapeResult);
    await eventPublisher.emit(
      EventNames.IMPORTER_END,
      buildImporterEvent(account, {
        message: 'Importer end',
        status: AccountStatus.DONE,
      }),
    );

    return transactions;
  } catch (e) {
    await eventPublisher.emit(
      EventNames.IMPORTER_ERROR,
      buildImporterEvent(account, {
        message: (e as Error).message,
        error: e as Error,
        status: AccountStatus.ERROR,
      }),
    );
    logger.error('Failed to fetch transactions', e);
    throw e;
  }
}

// eslint-disable-next-line max-len
async function postProcessTransactions(
  accountToScrape: AccountToScrapeConfig,
  scrapeResult: ScraperScrapingResult,
): Promise<EnrichedTransaction[]> {
  if (scrapeResult.accounts) {
    let transactions = scrapeResult.accounts.flatMap((transactionAccount) => {
      return transactionAccount.txns.map((transaction) =>
        enrichTransaction(transaction, accountToScrape.key, transactionAccount.accountNumber),
      );
    });

    // Filter out pending transactions
    transactions = transactions.filter((transaction) => transaction.status === TRANSACTION_STATUS_COMPLETED);
    transactions.sort(transactionsDateComparator);
    return transactions;
  }
  return [];
}

function enrichTransaction(transaction: Transaction, companyId: string, accountNumber: string): EnrichedTransaction {
  const hash = calculateTransactionHash(transaction, companyId, accountNumber);
  return {
    ...transaction,
    accountNumber,
    // category,
    hash,
  };
}

function transactionsDateComparator(t1: Transaction, t2: Transaction) {
  const date1 = moment(t1.date);
  const date2 = moment(t2.date);
  if (date1.isAfter(date2)) {
    return 1;
  }
  if (date1.isBefore(date2)) {
    return -1;
  }
  return 1;
}
