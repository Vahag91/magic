import * as React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Switch,
  ScrollView,
  StatusBar,
  Platform,
  useWindowDimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BeforeAfterSlider from '../components/BeforeAfterSlider';
import { fonts } from '../styles';
import { useSubscription } from '../providers/SubscriptionProvider';
import { useError } from '../providers/ErrorProvider';
import i18n from '../localization/i18n';

const COLORS = {
  primary: '#3366FF',
  background: '#F9FAFB',
  surface: '#FFFFFF',
  text: '#0F172A',
  priceText: '#1F2937',
  textSub: '#64748B',
  textLight: '#94A3B8',
  border: '#E2E8F0',
  blueLight: '#EFF6FF',
};

const HERO_BEFORE = require('../../assets/onboarding/beforeobject.jpg');
const HERO_AFTER = require('../../assets/onboarding/afterobject.jpg');

function formatCurrencyAmount({ amount, currencyCode }) {
  if (!Number.isFinite(amount)) return null;
  const code = String(currencyCode || '').trim().toUpperCase();
  if (!code) return null;
  return `${code} ${amount.toFixed(2)}`;
}

function parsePriceNumberFromString(value) {
  if (typeof value !== 'string') return null;
  const match = value.match(/[\d.,]+/);
  if (!match) return null;
  let numeric = match[0];
  if (numeric.includes('.') && numeric.includes(',')) {
    numeric = numeric.replace(/,/g, '');
  } else if (numeric.includes(',') && !numeric.includes('.')) {
    numeric = numeric.replace(/,/g, '.');
  }
  const parsed = Number.parseFloat(numeric);
  return Number.isFinite(parsed) ? parsed : null;
}

function getProductPriceValue(product) {
  if (!product) return null;
  if (typeof product.price === 'number' && Number.isFinite(product.price)) {
    return product.price;
  }
  const fromString = parsePriceNumberFromString(product.priceString);
  return fromString != null ? fromString : null;
}

export default function PaywallScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const { showError, showAppError } = useError();
  const [selectedPackageId, setSelectedPackageId] = React.useState(null);
  const {
    offerings,
    fetchOfferings,
    purchasePackage,
    isConfigured,
    isPremium,
    lastError,
  } = useSubscription();

  const handleRetryOfferings = React.useCallback(() => {
    if (!isConfigured) {
      showError();
      return;
    }
    fetchOfferings({ log: true }).catch((e) => {
      showAppError(e, { retry: handleRetryOfferings });
    });
  }, [fetchOfferings, isConfigured, showAppError, showError]);

  const availablePackages = React.useMemo(() => {
    const pkgs = offerings?.current?.availablePackages || [];
    const ORDER = {
      ANNUAL: 10,
      SIX_MONTH: 20,
      THREE_MONTH: 30,
      TWO_MONTH: 40,
      MONTHLY: 50,
      WEEKLY: 60,
      LIFETIME: 70,
    };

    return [...pkgs].sort((a, b) => {
      const aRank = ORDER[a?.packageType] ?? 999;
      const bRank = ORDER[b?.packageType] ?? 999;
      if (aRank !== bRank) return aRank - bRank;
      return String(a?.identifier || '').localeCompare(String(b?.identifier || ''));
    });
  }, [offerings]);

  const selectedPackage = React.useMemo(
    () => availablePackages.find(p => p?.identifier === selectedPackageId) || null,
    [availablePackages, selectedPackageId],
  );

  const yearlyPackage = React.useMemo(
    () => availablePackages.find(p => p?.packageType === 'ANNUAL') || null,
    [availablePackages],
  );

  const weeklyPackage = React.useMemo(
    () => availablePackages.find(p => p?.packageType === 'WEEKLY') || null,
    [availablePackages],
  );

  const trialEnabled = selectedPackage?.packageType === 'WEEKLY';
  const showFreeTrialToggle = Boolean(weeklyPackage?.identifier);

  const isCompact = windowHeight <= 700;
  const heroHeight = React.useMemo(() => {
    if (!windowHeight) return 280;
    return Math.max(240, Math.min(300, Math.round(windowHeight * 0.34)));
  }, [windowHeight]);

  const yearlyDiscountPercent = React.useMemo(() => {
    const weeklyCurrency = weeklyPackage?.product?.currencyCode;
    const yearlyCurrency = yearlyPackage?.product?.currencyCode;
    if (weeklyCurrency && yearlyCurrency && weeklyCurrency !== yearlyCurrency) return null;

    const weeklyPrice = getProductPriceValue(weeklyPackage?.product);
    const yearlyPrice = getProductPriceValue(yearlyPackage?.product);
    if (!weeklyPrice || !yearlyPrice) return null;

    const annualFromWeekly = weeklyPrice * 52;
    if (!Number.isFinite(annualFromWeekly) || annualFromWeekly <= 0) return null;

    const discount = (1 - yearlyPrice / annualFromWeekly) * 100;
    if (!Number.isFinite(discount)) return null;

    const rounded = Math.round(discount);
    return rounded > 0 ? rounded : null;
  }, [weeklyPackage, yearlyPackage]);

  const handleTrialToggle = React.useCallback(
    value => {
      const preferred = value ? weeklyPackage : yearlyPackage || availablePackages[0] || null;
      if (preferred?.identifier) setSelectedPackageId(preferred.identifier);
    },
    [availablePackages, weeklyPackage, yearlyPackage],
  );

  React.useEffect(() => {
    if (!isConfigured) return;
    if (offerings?.current?.availablePackages?.length) return;
    fetchOfferings({ log: true }).catch(() => {});
  }, [fetchOfferings, isConfigured, offerings]);

  React.useEffect(() => {
    if (!availablePackages.length) return;
    setSelectedPackageId(prev => {
      if (prev && availablePackages.some(p => p?.identifier === prev)) return prev;
      const preferred = availablePackages.find(p => p?.packageType === 'ANNUAL') || availablePackages[0];
      return preferred?.identifier ?? null;
    });
  }, [availablePackages]);

  React.useEffect(() => {
    if (!isPremium) return;
    navigation?.goBack?.();
  }, [isPremium, navigation]);

  const features = React.useMemo(
    () => [
      {
        id: 1,
        title: i18n.t('paywall.features.instantBgTitle'),
        sub: i18n.t('paywall.features.instantBgSub'),
        icon: 'instant',
      },
      {
        id: 2,
        title: i18n.t('paywall.features.objectEraserTitle'),
        sub: i18n.t('paywall.features.objectEraserSub'),
        icon: 'eraser',
      },
      {
        id: 3,
        title: i18n.t('paywall.features.hdExportTitle'),
        sub: i18n.t('paywall.features.hdExportSub'),
        icon: 'hd',
      },
    ],
    [],
  );

  function getPackageTitle(pkg) {
    switch (pkg?.packageType) {
      case 'ANNUAL':
        return i18n.t('paywall.plan.yearly');
      case 'MONTHLY':
        return i18n.t('paywall.plan.monthly');
      case 'WEEKLY':
        return i18n.t('paywall.plan.weekly');
      case 'LIFETIME':
        return i18n.t('paywall.plan.lifetime');
      default:
        return pkg?.product?.title || i18n.t('paywall.plan.subscription');
    }
  }

  function getPackageSubTitle(pkg) {
    if (pkg?.packageType === 'ANNUAL' || pkg?.packageType === 'WEEKLY') return '';
    const desc = String(pkg?.product?.description || '').trim();
    if (desc) return desc;
    const productId = pkg?.product?.identifier;
    if (productId) return i18n.t('paywall.plan.productId', { id: productId });
    return '';
  }

  function getPackagePriceMeta(pkg) {
    const product = pkg?.product;
    if (!product) return { amount: '', period: '', billing: '' };

    const numeric = getProductPriceValue(product);
    const currencyCode = String(product.currencyCode || product.currency || '').trim().toUpperCase();
    const priceString = product.priceString || '';

    if (Number.isFinite(numeric) && numeric > 0 && currencyCode) {
      return { amount: `${currencyCode} ${numeric.toFixed(2)}`, period: '', billing: '' };
    }

    return { amount: priceString, period: '', billing: '' };
  }

  const handleSubscribe = React.useCallback(async () => {
    if (!isConfigured) {
      showError();
      return;
    }
    if (!selectedPackage) {
      showError();
      return;
    }

    try {
      await purchasePackage(selectedPackage);
    } catch (e) {
      if (e?.userCancelled) return;
      showAppError(e, { retry: handleSubscribe, retryLabel: i18n.t('common.tryAgain') });
    }
  }, [isConfigured, purchasePackage, selectedPackage, showAppError, showError]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: 8, paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.heroContainer}>
          <View style={styles.heroCard}>
            <BeforeAfterSlider
              beforeSource={HERO_BEFORE}
              afterSource={HERO_AFTER}
              height={heroHeight}
              borderRadius={20}
              initial={0.5}
              showLabels={false}
              lineWidth={3}
            />

            <LinearGradient
              pointerEvents="none"
              colors={['rgba(0,0,0,0.00)', 'rgba(0,0,0,0.55)']}
              style={styles.gradientOverlay}
            />

            <View style={styles.badgeContainer} pointerEvents="none">
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{i18n.t('paywall.badgePremium')}</Text>
              </View>
            </View>

            <View style={styles.heroTextContainer} pointerEvents="none">
              <Text style={styles.heroHeadline}>{i18n.t('paywall.headline')}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.featuresContainer, isCompact && styles.featuresContainerCompact]}>
          {features.map((item) => (
            <View key={item.id} style={styles.featureRow}>
              <View style={styles.featureIconWrap}>
                <FeatureIcon type={item.icon} />
              </View>
              <View style={styles.featureTextWrap}>
                <Text style={styles.featureTitle}>{item.title}</Text>
                <Text style={styles.featureSub}>{item.sub}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.pricingContainer}>
          {showFreeTrialToggle ? (
            <View style={styles.trialToggleCard}>
              <View style={styles.trialToggleTextWrap}>
                <Text style={styles.trialToggleTitle}>{i18n.t('paywall.freeTrial.title')}</Text>
                <Text style={styles.trialToggleSub}>{i18n.t('paywall.freeTrial.subtitle')}</Text>
              </View>
              <Switch
                value={trialEnabled}
                onValueChange={handleTrialToggle}
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
                thumbColor="#FFFFFF"
                ios_backgroundColor={COLORS.border}
              />
            </View>
          ) : null}

          {availablePackages.length ? (
            availablePackages.map((pkg, idx) => {
              const isSelected = pkg?.identifier === selectedPackageId;
              const title = getPackageTitle(pkg);
              const sub = getPackageSubTitle(pkg);
              const { amount, period, billing } = getPackagePriceMeta(pkg);
              const isWeekly = pkg?.packageType === 'WEEKLY';
              const isYearly = pkg?.packageType === 'ANNUAL';
              const isMonthly = pkg?.packageType === 'MONTHLY';

              const weeklyEquivalent = (() => {
                if (!isYearly) return null;
                const yearlyValue = getProductPriceValue(pkg?.product);
                if (!Number.isFinite(yearlyValue) || yearlyValue <= 0) return null;
                const weeklyValue = yearlyValue / 52;
                return formatCurrencyAmount({
                  amount: weeklyValue,
                  currencyCode: pkg?.product?.currencyCode,
                });
              })();

              return (
                <Pressable
                  key={pkg?.identifier || String(idx)}
                  onPress={() => setSelectedPackageId(pkg?.identifier ?? null)}
                  style={({ pressed }) => [
                    styles.pricingCard,
                    isSelected ? styles.pricingCardActive : styles.pricingCardInactive,
                    pressed && styles.pressed,
                  ]}
                >
                  {pkg?.packageType === 'ANNUAL' ? (
                    <View style={styles.saveBadge}>
                      <Text style={styles.saveBadgeText}>
                        {yearlyDiscountPercent != null
                          ? i18n.t('paywall.savePercent', { percent: yearlyDiscountPercent })
                          : i18n.t('paywall.bestValue')}
                      </Text>
                    </View>
                  ) : null}

                  <View style={styles.rowSpread}>
                    <View style={styles.planLeft}>
                      <Text style={styles.planTitle}>{title}</Text>

                      {isWeekly ? (
                        <Text style={styles.weeklyTrialLabel}>{i18n.t('paywall.weeklyTrialLabel')}</Text>
                      ) : null}

                      {isYearly ? (
                        <Text style={styles.planSubYear}>{i18n.t('paywall.onlyAmount', { amount })}</Text>
                      ) : null}

                      {!isYearly && !isWeekly && sub ? (
                        <Text style={styles.planSub}>{sub}</Text>
                      ) : null}
                    </View>

                    <View style={styles.alignEnd}>
                      <Text
                        style={[
                          styles.planPrice,
                          { color: isSelected ? COLORS.primary : COLORS.priceText },
                        ]}
                      >
                        {isYearly && weeklyEquivalent ? weeklyEquivalent : amount}
                      </Text>

                      {isYearly && weeklyEquivalent ? (
                        <Text style={styles.planSub}>{i18n.t('paywall.perWeek')}</Text>
                      ) : isMonthly ? (
                        <Text style={styles.planSub}>{i18n.t('paywall.perMonth')}</Text>
                      ) : isWeekly ? (
                        <Text style={styles.planSub}>{i18n.t('paywall.perWeek')}</Text>
                      ) : null}

                      {period ? <Text style={styles.planSub}>{period}</Text> : null}
                      {billing ? <Text style={styles.planSub}>{billing}</Text> : null}
                    </View>
                  </View>
                </Pressable>
              );
            })
          ) : (
            <View style={[styles.pricingCard, styles.pricingCardInactive]}>
              {lastError ? (
                <>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.planTitle}>{i18n.t('paywall.plans.unableTitle')}</Text>
                    <Text style={styles.planSub}>{i18n.t('paywall.plans.unableSubtitle')}</Text>
                  </View>
                  <Pressable
                    onPress={handleRetryOfferings}
                    style={({ pressed }) => [styles.retryBtn, pressed && styles.pressed]}
                  >
                    <Text style={styles.retryText}>{i18n.t('paywall.plans.retry')}</Text>
                  </Pressable>
                </>
              ) : (
                <View>
                  <Text style={styles.planTitle}>{i18n.t('paywall.plans.loadingTitle')}</Text>
                  <Text style={styles.planSub}>{i18n.t('paywall.plans.loadingSubtitle')}</Text>
                </View>
              )}
            </View>
          )}

          <Pressable
            onPress={handleSubscribe}
            disabled={!selectedPackage || !isConfigured}
            style={({ pressed }) => [
              styles.ctaButton,
              (!selectedPackage || !isConfigured) && styles.ctaDisabled,
              pressed && selectedPackage && isConfigured && styles.ctaPressed,
            ]}
          >
            <Text style={styles.ctaText}>
              {trialEnabled ? i18n.t('paywall.cta.startFreeTrial') : i18n.t('paywall.cta.continue')}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function FeatureIcon({ type, size = 24, color = '#5985E1' }) {
  let path = '';
  if (type === 'instant') {
    path =
      'm176-120-56-56 301-302-181-45 198-123-17-234 179 151 216-88-87 217 151 178-234-16-124 198-45-181-301 301Zm24-520-80-80 80-80 80 80-80 80Zm355 197 48-79 93 7-60-71 35-86-86 35-71-59 7 92-79 49 90 22 23 90Zm165 323-80-80 80-80 80 80-80 80ZM569-570Z';
  } else if (type === 'eraser') {
    path =
      'M690-240h190v80H610l80-80Zm-500 80-85-85q-23-23-23.5-57t22.5-58l440-456q23-24 56.5-24t56.5 23l199 199q23 23 23 57t-23 57L520-160H190Zm296-80 314-322-198-198-442 456 64 64h262Zm-6-240Z';
  } else if (type === 'hd') {
    path =
      'M590-300h60v-60h30q17 0 28.5-11.5T720-400v-160q0-17-11.5-28.5T680-600H560q-17 0-28.5 11.5T520-560v160q0 17 11.5 28.5T560-360h30v60Zm-350-60h60v-80h80v80h60v-240h-60v100h-80v-100h-60v240Zm340-60v-120h80v120h-80ZM160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H160Zm0-80h640v-480H160v480Zm0 0v-480 480Z';
  } else if (type === 'batch') {
    path =
      'M480-80q-33 0-56.5-23.5T400-160v-320q0-33 23.5-56.5T480-560h320q33 0 56.5 23.5T880-480v320q0 33-23.5 56.5T800-80H480Zm0-80h320v-320H480v320Zm-240-80v-400q0-33 23.5-56.5T320-720h400v80H320v400h-80ZM80-400v-400q0-33 23.5-56.5T160-880h400v80H160v400H80Zm400 240v-320 320Z';
  }

  return (
    <Svg width={size} height={size} viewBox="0 -960 960 960">
      <Path fill={color} d={path} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingHorizontal: 20 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    marginBottom: 8,
  },
  closeBtn: { width: 32, height: 32, alignItems: 'flex-start', justifyContent: 'center' },
  headerBrand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontFamily: fonts.regular, fontSize: 18, fontWeight: '800', color: COLORS.text, letterSpacing: -0.3 },
  headerSpacer: { width: 32 },

  heroContainer: { marginBottom: 18 },
  heroCard: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20 },
      android: { elevation: 8 },
    }),
  },
  gradientOverlay: { ...StyleSheet.absoluteFillObject },
  badgeContainer: { position: 'absolute', top: 14, left: 14 },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderColor: 'rgba(255,255,255,0.4)',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 100,
  },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  heroTextContainer: { position: 'absolute', bottom: 20, left: 20, right: 20 },
  heroHeadline: {
    fontFamily: fonts.regular,
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 34,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  featuresContainer: { gap: 14, marginBottom: 22 },
  featuresContainerCompact: { gap: 12, marginBottom: 18 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.blueLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTextWrap: { flex: 1 },
  featureTitle: { fontFamily: fonts.regular, fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  featureSub: { fontFamily: fonts.regular, fontSize: 13, color: COLORS.textSub },

  pricingContainer: { paddingBottom: 6 },
  trialToggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 2,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    marginBottom: 10,
  },
  trialToggleTextWrap: { flex: 1, paddingRight: 12 },
  trialToggleTitle: { fontFamily: fonts.regular, fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 2 },
  trialToggleSub: { fontFamily: fonts.regular, fontSize: 13, color: COLORS.textSub },
  pricingCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 14,
    borderWidth: 2,
    position: 'relative',
    marginBottom: 12,
  },
  pricingCardActive: { backgroundColor: 'rgba(51, 102, 255, 0.05)', borderColor: COLORS.primary },
  pricingCardInactive: { backgroundColor: '#FAFAFA', borderColor: COLORS.border },
  pressed: { opacity: 0.92 },

  saveBadge: {
    position: 'absolute',
    top: -10,
    right: 24,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
    zIndex: 10,
  },
  saveBadgeText: { fontFamily: fonts.regular, color: '#fff', fontSize: 10, fontWeight: '800' },

  rowSpread: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' },
  planLeft: { flex: 1, minWidth: 0, paddingRight: 12 },
  alignEnd: { alignItems: 'flex-end' },

  planTitle: { fontFamily: fonts.regular, fontSize: 18, fontWeight: '800', color: COLORS.text },
  weeklyTrialLabel: { fontFamily: fonts.regular, fontSize: 13, fontWeight: '700', color: COLORS.textSub, marginTop: 4 },
  planSubYear: { fontFamily: fonts.regular, fontSize: 16, marginTop: 4, fontWeight: '800', color: COLORS.priceText },

  planPrice: { fontFamily: fonts.regular, fontSize: 18, fontWeight: '800' },
  planSub: { fontFamily: fonts.regular, fontSize: 13, marginTop: 2, color: COLORS.textSub },

  ctaButton: {
    backgroundColor: COLORS.primary,
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  ctaDisabled: { opacity: 0.6 },
  ctaPressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  ctaText: { fontFamily: fonts.regular, color: '#FFFFFF', fontSize: 17, fontWeight: '800' },

  retryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    marginLeft: 12,
  },
  retryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },

  footerLinks: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 24, marginTop: 12 },
  footerLinkText: { fontSize: 13, fontWeight: '600', color: COLORS.textSub },
  footerDivider: { width: 1, height: 14, backgroundColor: COLORS.border },
  legalText: {
    marginTop: 16,
    fontSize: 10,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 15,
    paddingHorizontal: 12,
  },
  legalLink: { textDecorationLine: 'underline', color: COLORS.textLight, fontWeight: '700' },
});