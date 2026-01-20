import AsyncStorage from '@react-native-async-storage/async-storage';

export const ONBOARDING_VERSION = 1;
export const ONBOARDING_STORAGE_KEY = '@magicstudio:onboardingVersionSeen';

export async function getOnboardingSeenVersion() {
  try {
    const raw = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (raw == null) return null;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function shouldShowOnboarding(version = ONBOARDING_VERSION) {
  const seenVersion = await getOnboardingSeenVersion();
  return seenVersion !== version;
}

export async function markOnboardingSeen(version = ONBOARDING_VERSION) {
  try {
    await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, String(version));
  } catch {
    // noop
  }
}

export async function resetOnboardingSeen() {
  try {
    await AsyncStorage.removeItem(ONBOARDING_STORAGE_KEY);
  } catch {
    // noop
  }
}
