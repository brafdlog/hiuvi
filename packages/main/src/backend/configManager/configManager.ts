import { configFilePath } from '@/app-globals';
import { type Config } from '@/backend/commonTypes';
import { decrypt, encrypt } from '@/backend/configManager/encryption/crypto';
import { existsSync, promises as fs } from 'fs';
import configExample from './defaultConfig';
import logger from '/@/logging/logger';
import type { CompanyTypes } from 'israeli-bank-scrapers-core';

export async function getConfig(configPath: string = configFilePath): Promise<Config> {
  const configFromFile = await getConfigFromFile(configPath);
  if (configFromFile) {
    const decrypted = (await decrypt(configFromFile)) as string;
    if (!decrypted) {
      logger.log('No config file found, returning default config');
      return configExample;
    }
    try {
      const config = JSON.parse(decrypted);
      if (Object.keys(config).length === 0) {
        logger.log('Empty config file found, returning default config');
        return configExample;
      }
      return config;
    } catch (e) {
      logger.error('Failed to parse config file, returning default config', e);
    }
  }

  // Fallback to configExample if there is no config file, or it isn't valid
  return configExample;
}

export async function updateConfig(configPath: string, configToUpdate: Config): Promise<void> {
  const stringifiedConfig = JSON.stringify(configToUpdate, null, 2);
  const encryptedConfigStr = await encrypt(stringifiedConfig);
  await fs.writeFile(configPath, encryptedConfigStr);
}

export async function updateOtpLongTermToken(
  key: CompanyTypes,
  otpLongTermToken: string,
  configPath: string = configFilePath,
): Promise<void> {
  const config = await getConfig(configPath);
  const account = config.scraping.accountsToScrape.find((acc) => acc.key === key) as {
    loginFields: { otpLongTermToken: string };
  };
  if (account) {
    account.loginFields.otpLongTermToken = otpLongTermToken;
    await updateConfig(configPath, config);
  } else {
    throw new Error(`Account with key ${key} not found`);
  }
}

async function getConfigFromFile(configPath: string) {
  if (existsSync(configPath)) {
    return fs.readFile(configPath, {
      encoding: 'utf8',
    });
  }
  return null;
}
