import { readEnv } from './env';

// RevenueCat SDK public keys (safe to ship in the client)
export const REVENUE_PUBLIC_IOS = readEnv('REVENUE_PUBLIC_IOS');
export const REVENUE_PUBLIC_ANDROID = readEnv('REVENUE_PUBLIC_ANDROID');

// Must match your RevenueCat entitlement identifier
export const REVENUE_ENTITLEMENT_ID = readEnv('REVENUE_ENTITLEMENT_ID', 'Premium');
