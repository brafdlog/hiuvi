/* eslint-disable no-console */
import { FETCH_YNAB_ACCOUNT_DATA_STATUS, type YnabAccountDataType, type YnabConfig } from '@/backend/commonTypes';
import { getConfig } from '@/backend/configManager/configManager';
import { getYnabAccountDetails, isAccessTokenValid } from '@/backend/export/outputVendors/ynab/ynab';

export async function getYnabAccountData(_: unknown, ynabOptions: YnabConfig['options']): Promise<YnabAccountDataType> {
  const config = await getConfig();

  const accessTokenValid = await isAccessTokenValid(ynabOptions.accessToken);
  if (!accessTokenValid) {
    return {
      status: FETCH_YNAB_ACCOUNT_DATA_STATUS.INVALID_ACCESS_TOKEN,
    };
  }
  const ynabAccountData = await getYnabAccountDetails(
    config.outputVendors,
    ynabOptions.budgetId,
    ynabOptions.accessToken,
  );

  return {
    status: ynabAccountData.categories
      ? FETCH_YNAB_ACCOUNT_DATA_STATUS.SUCCESS
      : FETCH_YNAB_ACCOUNT_DATA_STATUS.INVALID_BUDGET_ID,
    ynabAccountData,
  };
}
