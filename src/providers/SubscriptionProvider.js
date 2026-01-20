import * as React from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';

import { createLogger } from '../logger';
import { REVENUE_ENTITLEMENT_ID, REVENUE_PUBLIC_ANDROID, REVENUE_PUBLIC_IOS } from '../config/revenuecat';

const logger = createLogger('RevenueCat');

const STORAGE_KEY_IS_PREMIUM = '@magicstudio:isPremium';
const GLOBAL_RC_SINGLETON_KEY = '__MAGICSTUDIO_REVENUECAT_SINGLETON__';
const DEBUG_RC_LOGS = __DEV__ === true;

function getGlobalRcSingleton() {
  // eslint-disable-next-line no-undef
  const g = globalThis;
  if (!g[GLOBAL_RC_SINGLETON_KEY]) {
    g[GLOBAL_RC_SINGLETON_KEY] = {
      configured: false,
      configuring: null,
      apiKey: null,
    };
  }
  return g[GLOBAL_RC_SINGLETON_KEY];
}

async function ensureRevenueCatConfigured(apiKey) {
  const singleton = getGlobalRcSingleton();

  if (singleton.configured) return;
  if (singleton.configuring) {
    await singleton.configuring;
    return;
  }

  singleton.configuring = (async () => {
    await Purchases.configure({ apiKey });
    singleton.configured = true;
    singleton.apiKey = apiKey;
  })();

  try {
    await singleton.configuring;
  } finally {
    singleton.configuring = null;
  }
}

export const SubscriptionContext = React.createContext(null);

function getApiKeyForPlatform() {
  if (Platform.OS === 'ios') return REVENUE_PUBLIC_IOS;
  if (Platform.OS === 'android') return REVENUE_PUBLIC_ANDROID;
  return '';
}

function summarizeCustomerInfo(info) {
  const activeEntitlements = Object.keys(info?.entitlements?.active || {});
  const allEntitlements = Object.keys(info?.entitlements?.all || {});

  return {
    originalAppUserId: info?.originalAppUserId,
    activeEntitlements,
    allEntitlements,
    activeSubscriptions: info?.activeSubscriptions || [],
    allPurchasedProductIdentifiers: info?.allPurchasedProductIdentifiers || [],
    latestExpirationDate: info?.latestExpirationDate,
  };
}

function summarizeOfferings(offerings) {
  const current = offerings?.current?.identifier ?? null;
  const all = offerings?.all ?? {};

  const summarizedAll = {};
  for (const [key, offering] of Object.entries(all)) {
    summarizedAll[key] = {
      identifier: offering?.identifier,
      serverDescription: offering?.serverDescription,
      availablePackages: (offering?.availablePackages || []).map(pkg => ({
        identifier: pkg?.identifier,
        packageType: pkg?.packageType,
        product: pkg?.product
          ? {
              identifier: pkg.product.identifier,
              title: pkg.product.title,
              priceString: pkg.product.priceString,
              currencyCode: pkg.product.currencyCode,
              productCategory: pkg.product.productCategory,
              subscriptionPeriod: pkg.product.subscriptionPeriod,
            }
          : null,
      })),
    };
  }

  return { current, all: summarizedAll };
}

function formatPackageLine(pkg) {
  const productId = pkg?.product?.identifier ?? '';
  const price = pkg?.product?.priceString ?? '';
  const title = pkg?.product?.title ?? '';
  const pkgId = pkg?.identifier ?? '';
  const pkgType = pkg?.packageType ?? '';

  return [pkgId, pkgType, productId, price, title].filter(Boolean).join(' | ');
}

export function useSubscription() {
  const value = React.useContext(SubscriptionContext);
  if (!value) throw new Error('useSubscription must be used within SubscriptionProvider');
  return value;
}

export function SubscriptionProvider({ children }) {
  const [isConfigured, setIsConfigured] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isPremium, setIsPremium] = React.useState(false);
  const [customerInfo, setCustomerInfo] = React.useState(null);
  const [offerings, setOfferings] = React.useState(null);
  const [lastError, setLastError] = React.useState(null);

  const handleCustomerInfo = React.useCallback(async (info, source = 'unknown') => {
    const hasPremium = Boolean(info?.entitlements?.active?.[REVENUE_ENTITLEMENT_ID]);

    setCustomerInfo(info || null);
    setIsPremium(hasPremium);

    if (DEBUG_RC_LOGS) {
      logger.log('customer_info', {
        source,
        entitlementId: REVENUE_ENTITLEMENT_ID,
        hasPremium,
        ...summarizeCustomerInfo(info),
      });
    }

    try {
      await AsyncStorage.setItem(STORAGE_KEY_IS_PREMIUM, JSON.stringify(hasPremium));
    } catch (e) {
      logger.warn('cache_write_failed', { message: e?.message });
    }
  }, []);

  const fetchOfferings = React.useCallback(async ({ log = true } = {}) => {
    try {
      const nextOfferings = await Purchases.getOfferings();
      setOfferings(nextOfferings || null);
      if (log && DEBUG_RC_LOGS) {
        const summary = summarizeOfferings(nextOfferings);
        const offeringIds = Object.keys(summary.all || {});
        logger.log('offerings', { current: summary.current, offeringIds });
        for (const offeringId of offeringIds) {
          const pkgs = summary.all?.[offeringId]?.availablePackages || [];
          logger.log('offering_packages', {
            offeringId,
            packages: pkgs.map(formatPackageLine),
          });
        }
      }
      return nextOfferings;
    } catch (e) {
      setLastError(e);
      logger.warn('get_offerings_failed', { message: e?.message });
      throw e;
    }
  }, []);

  const refreshCustomerInfo = React.useCallback(async () => {
    try {
      const info = await Purchases.getCustomerInfo();
      await handleCustomerInfo(info, 'refresh');
      return info;
    } catch (e) {
      setLastError(e);
      logger.warn('get_customer_info_failed', { message: e?.message });
      throw e;
    }
  }, [handleCustomerInfo]);

  const purchasePackage = React.useCallback(
    async pkg => {
      try {
        setLastError(null);
        const result = await Purchases.purchasePackage(pkg);
        await handleCustomerInfo(result?.customerInfo, 'purchase');
        return result;
      } catch (e) {
        if (e?.userCancelled) {
          logger.log('purchase_cancelled');
          return null;
        }
        setLastError(e);
        logger.warn('purchase_failed', { message: e?.message, code: e?.code });
        throw e;
      }
    },
    [handleCustomerInfo],
  );

  const restorePurchases = React.useCallback(async () => {
    try {
      const info = await Purchases.restorePurchases();
      await handleCustomerInfo(info, 'restore');
      return info;
    } catch (e) {
      setLastError(e);
      logger.warn('restore_failed', { message: e?.message, code: e?.code });
      throw e;
    }
  }, [handleCustomerInfo]);

  const logIn = React.useCallback(
    async appUserId => {
      try {
        const result = await Purchases.logIn(appUserId);
        await handleCustomerInfo(result?.customerInfo, 'login');
        await fetchOfferings({ log: false });
        return result;
      } catch (e) {
        setLastError(e);
        logger.warn('login_failed', { message: e?.message, code: e?.code });
        throw e;
      }
    },
    [fetchOfferings, handleCustomerInfo],
  );

  const logOut = React.useCallback(async () => {
    try {
      const info = await Purchases.logOut();
      await AsyncStorage.removeItem(STORAGE_KEY_IS_PREMIUM);
      setIsPremium(false);
      setCustomerInfo(null);
      setOfferings(null);
      if (DEBUG_RC_LOGS) logger.log('logout_ok');
      return info;
    } catch (e) {
      setLastError(e);
      logger.warn('logout_failed', { message: e?.message, code: e?.code });
      throw e;
    }
  }, []);

  const syncPurchases = React.useCallback(async () => {
    try {
      await Purchases.syncPurchases();
      const info = await Purchases.getCustomerInfo();
      await handleCustomerInfo(info, 'sync');
      return info;
    } catch (e) {
      setLastError(e);
      logger.warn('sync_failed', { message: e?.message, code: e?.code });
      throw e;
    }
  }, [handleCustomerInfo]);

  React.useEffect(() => {
    let cancelled = false;
    const apiKey = getApiKeyForPlatform();

    const init = async () => {
      try {
        Purchases.setLogLevel(DEBUG_RC_LOGS ? LOG_LEVEL.VERBOSE : LOG_LEVEL.WARN);

        if (!apiKey) {
          const err = new Error(`RevenueCat API key missing for platform: ${Platform.OS}`);
          setLastError(err);
          logger.warn('missing_api_key', { platform: Platform.OS });
          return;
        }

        try {
          const cached = await AsyncStorage.getItem(STORAGE_KEY_IS_PREMIUM);
          if (cached != null) setIsPremium(Boolean(JSON.parse(cached)));
        } catch (e) {
          logger.warn('cache_read_failed', { message: e?.message });
        }

        logger.log('configure:start', { platform: Platform.OS });
        await ensureRevenueCatConfigured(apiKey);

        if (cancelled) return;
        setIsConfigured(true);
        logger.log('configure:ok', { platform: Platform.OS });

        const listener = info => {
          handleCustomerInfo(info, 'listener').catch(() => {});
        };
        Purchases.addCustomerInfoUpdateListener(listener);

        try {
          const info = await Purchases.getCustomerInfo();
          if (!cancelled) await handleCustomerInfo(info, 'init');
        } catch (e) {
          logger.warn('get_customer_info_failed', { message: e?.message });
        }

        try {
          await fetchOfferings({ log: true });
        } catch {}

        return () => {
          Purchases.removeCustomerInfoUpdateListener(listener);
        };
      } catch (e) {
        if (!cancelled) setLastError(e);
        logger.error('init_failed', { message: e?.message });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    const cleanupPromise = init();

    return () => {
      cancelled = true;
      Promise.resolve(cleanupPromise)
        .then(cleanup => {
          if (typeof cleanup === 'function') cleanup();
        })
        .catch(() => {});
    };
  }, [fetchOfferings, handleCustomerInfo]);

  const value = React.useMemo(
    () => ({
      isConfigured,
      isLoading,
      isPremium,
      entitlementId: REVENUE_ENTITLEMENT_ID,
      customerInfo,
      offerings,
      lastError,
      fetchOfferings,
      refreshCustomerInfo,
      purchasePackage,
      restorePurchases,
      logIn,
      logOut,
      syncPurchases,
    }),
    [
      isConfigured,
      isLoading,
      isPremium,
      customerInfo,
      offerings,
      lastError,
      fetchOfferings,
      refreshCustomerInfo,
      purchasePackage,
      restorePurchases,
      logIn,
      logOut,
      syncPurchases,
    ],
  );

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}
