import * as React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Svg, { Path } from 'react-native-svg';
import { useSubscription } from '../providers/SubscriptionProvider';
import {
  getDefaultExportFormat,
  setDefaultExportFormat,
  getHdProcessingEnabled,
  setHdProcessingEnabled,
} from '../lib/settings';

const IOS = {
  accent: '#2F6BFF',
  bg: '#F2F2F7',
  card: '#FFFFFF',
  border: '#E5E5EA',
  text: '#000000',
  secondary: '#8E8E93',
  green: '#34C759',
};

const TERMS_URL = 'https://aicloudsolutions.app/terms';
const PRIVACY_URL = 'https://aicloudsolutions.app/privacy';
const CONTACT_URL = 'https://aicloudsolutions.app/contact';
const APP_STORE_ID = '6757924333';

const APP_STORE_WEB_URL = `https://apps.apple.com/app/id${APP_STORE_ID}`;
const APP_STORE_IOS_URL = `itms-apps://apps.apple.com/app/id${APP_STORE_ID}`;

async function openExternalUrl(url) {
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
      return;
    }
  } catch {}
  Alert.alert('Unable to open link', 'Please try again.');
}

export default function SettingsScreen({
  navigation,
  onExportFormat = () => {},
  onHelp = () => openExternalUrl(CONTACT_URL),
  onRate = () =>
    openExternalUrl(Platform.OS === 'ios' ? APP_STORE_IOS_URL : APP_STORE_WEB_URL),
  onShare = () => {},
  onPrivacy = () => openExternalUrl(PRIVACY_URL),
  onTerms = () => openExternalUrl(TERMS_URL),
}) {
  const [defaultExportFormat, setDefaultExportFormatState] = React.useState('png');
  const [hdProcessingEnabled, setHdProcessingEnabledState] = React.useState(false);
  const { isPremium } = useSubscription();
  const canNavigatePaywall = Boolean(navigation?.navigate);

  React.useEffect(() => {
    let alive = true;

    (async () => {
      const saved = await getDefaultExportFormat();
      if (!alive) return;
      setDefaultExportFormatState(saved);
    })();

    return () => {
      alive = false;
    };
  }, []);

  React.useEffect(() => {
    let alive = true;

    (async () => {
      const saved = await getHdProcessingEnabled({ fallback: isPremium });
      if (!alive) return;
      setHdProcessingEnabledState(saved);
    })();

    return () => {
      alive = false;
    };
  }, [isPremium]);

  const handleDefaultExportFormatPress = React.useCallback(() => {
    const apply = async (format) => {
      const saved = await setDefaultExportFormat(format);
      setDefaultExportFormatState(saved);
      onExportFormat(saved);
    };

    Alert.alert('Default Export Format', 'Choose the default format for exports.', [
      { text: 'PNG', onPress: () => apply('png') },
      { text: 'JPG', onPress: () => apply('jpg') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [onExportFormat]);

  const handleHdProcessingToggle = React.useCallback(
    async (value) => {
      if (!isPremium) return;
      setHdProcessingEnabledState(value);
      await setHdProcessingEnabled(value);
    },
    [isPremium],
  );

  const handleHdProcessingPress = React.useCallback(() => {
    if (!isPremium) {
      if (canNavigatePaywall) navigation.navigate('Paywall');
      return;
    }
    handleHdProcessingToggle(!hdProcessingEnabled);
  }, [canNavigatePaywall, handleHdProcessingToggle, hdProcessingEnabled, isPremium, navigation]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.promoCard}>
          <View style={styles.promoRow}>
            <LinearGradient
              colors={['#2F6BFF', '#1442B8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.promoIcon}
            >
              <MagicStudioFreeIcon size={28} color="#fff" />
            </LinearGradient>

            <View style={{ flex: 1 }}>
              <Text style={styles.promoTitle}>
                {isPremium ? 'Magic Studio Pro' : 'Magic Studio'}
              </Text>
              <Text style={styles.promoSubtitle}>
                {isPremium ? 'Premium unlocked' : 'Settings'}
              </Text>
            </View>
          </View>

          {!isPremium ? (
            <Pressable
              onPress={canNavigatePaywall ? () => navigation.navigate('Paywall') : undefined}
              disabled={!canNavigatePaywall}
              style={({ pressed }) => [
                styles.promoBtn,
                pressed && styles.pressed,
                !canNavigatePaywall && { opacity: 0.6 },
              ]}
              accessibilityRole={canNavigatePaywall ? 'button' : undefined}
              accessibilityLabel="Upgrade to Premium"
            >
              <Text style={styles.promoBtnText}>Upgrade to Premium</Text>
            </Pressable>
          ) : null}
        </View>

        <SectionLabel>APP SETTINGS</SectionLabel>
        <InsetGroup>
          <Cell
            left={
              <SquareIcon bg="#8E8E93">
                <DefaultExportFormatIcon />
              </SquareIcon>
            }
            title="Default Export Format"
            right={<RightValue value={String(defaultExportFormat || 'png').toUpperCase()} />}
            onPress={handleDefaultExportFormatPress}
            isLast
          />
        </InsetGroup>

        <SectionLabel>AI &amp; PROCESSING</SectionLabel>
        <InsetGroup>
          <Cell
            left={
              <SquareIcon bg="#EC4899">
                <HdProcessingIcon />
              </SquareIcon>
            }
            title={
              <View style={styles.rowTitleWrap}>
                <Text style={styles.cellTitle}>HD Processing</Text>
                <View style={styles.proBadge}>
                  <Text style={styles.proBadgeText}>PRO</Text>
                </View>
              </View>
            }
            right={
              <View style={{ opacity: isPremium ? 1 : 0.55 }}>
                <Switch
                  value={isPremium ? hdProcessingEnabled : false}
                  onValueChange={handleHdProcessingToggle}
                  disabled={!isPremium}
                  trackColor={{ false: '#E9E9EA', true: IOS.green }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor="#E9E9EA"
                />
              </View>
            }
            onPress={handleHdProcessingPress}
            isLast
          />
        </InsetGroup>

        <SectionLabel>SUPPORT &amp; LEGAL</SectionLabel>
        <InsetGroup>
          <Cell
            left={<SquareIcon bg="#007AFF" icon="help-circle" />}
            title="Help Center"
            right="chevron"
            onPress={onHelp}
          />
          <Cell
            left={
              <SquareIcon bg="#FBBF24">
                <RateAppIcon />
              </SquareIcon>
            }
            title="Rate App"
            right="chevron"
            onPress={onRate}
          />
          <Cell
            left={
              <SquareIcon bg={IOS.green}>
                <ShareFriendsIcon />
              </SquareIcon>
            }
            title="Share with Friends"
            right="chevron"
            onPress={onShare}
          />
          <Cell
            left={
              <SquareIcon bg="#8E8E93">
                <PrivacyPolicyIcon />
              </SquareIcon>
            }
            title="Privacy Policy"
            right="chevron"
            onPress={onPrivacy}
          />
          <Cell
            left={
              <SquareIcon bg="#8E8E93">
                <TermsOfServiceIcon />
              </SquareIcon>
            }
            title="Terms of Service"
            right="chevron"
            onPress={onTerms}
            isLast
          />
        </InsetGroup>

        <Text style={styles.version}>Magic Studio v2.4.0</Text>

        <View style={{ height: 28 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionLabel({ children }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

function InsetGroup({ children, style }) {
  return <View style={[styles.group, style]}>{children}</View>;
}

function Cell({ left, title, right, onPress, isLast = false }) {
  const content = (
    <View style={[styles.cell, isLast && styles.cellLast]}>
      <View style={styles.leftWrap}>
        {left}
        {typeof title === 'string' ? (
          <Text style={styles.cellTitle}>{title}</Text>
        ) : (
          title
        )}
      </View>

      {right === 'chevron' ? <ChevronRightIcon /> : right}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.cellPress, pressed && styles.cellPressed]}
    >
      {content}
    </Pressable>
  );
}

function RightValue({ value, showChevron = true }) {
  return (
    <View style={styles.rightValue}>
      <Text style={styles.rightValueText}>{value}</Text>
      {showChevron ? <ChevronRightIcon /> : null}
    </View>
  );
}

function SquareIcon({ bg, icon, iconColor = '#fff', children }) {
  return (
    <View style={[styles.squareIcon, { backgroundColor: bg }]}>
      {children || (
        <MaterialCommunityIcons name={icon} size={16} color={iconColor} />
      )}
    </View>
  );
}

function ChevronRightIcon({ size = 24, color = '#B7B7B7' }) {
  return (
    <Svg width={size} height={size} viewBox="0 -960 960 960">
      <Path
        fill={color}
        d="M504-480 320-664l56-56 240 240-240 240-56-56 184-184Z"
      />
    </Svg>
  );
}

function MagicStudioFreeIcon({ size = 22, color = '#fff' }) {
  return (
    <Svg width={size} height={size} viewBox="0 -960 960 960">
      <Path
        fill={color}
        d="M440-440ZM120-120q-33 0-56.5-23.5T40-200v-480q0-33 23.5-56.5T120-760h126l74-80h240v80H355l-73 80H120v480h640v-360h80v360q0 33-23.5 56.5T760-120H120Zm640-560v-80h-80v-80h80v-80h80v80h80v80h-80v80h-80ZM440-260q75 0 127.5-52.5T620-440q0-75-52.5-127.5T440-620q-75 0-127.5 52.5T260-440q0 75 52.5 127.5T440-260Zm0-80q-42 0-71-29t-29-71q0-42 29-71t71-29q42 0 71 29t29 71q0 42-29 71t-71 29Z"
      />
    </Svg>
  );
}

function DefaultExportFormatIcon({ size = 18, color = '#fff' }) {
  return (
    <Svg width={size} height={size} viewBox="0 -960 960 960">
      <Path
        fill={color}
        d="M240-80q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h320l240 240v240h-80v-200H520v-200H240v640h360v80H240Zm638 15L760-183v89h-80v-226h226v80h-90l118 118-56 57Zm-638-95v-640 640Z"
      />
    </Svg>
  );
}

function HdProcessingIcon({ size = 18, color = '#fff' }) {
  return (
    <Svg width={size} height={size} viewBox="0 -960 960 960">
      <Path
        fill={color}
        d="M590-300h60v-60h30q17 0 28.5-11.5T720-400v-160q0-17-11.5-28.5T680-600H560q-17 0-28.5 11.5T520-560v160q0 17 11.5 28.5T560-360h30v60Zm-350-60h60v-80h80v80h60v-240h-60v100h-80v-100h-60v240Zm340-60v-120h80v120h-80ZM160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H160Zm0-80h640v-480H160v480Zm0 0v-480 480Z"
      />
    </Svg>
  );
}

function RateAppIcon({ size = 18, color = '#fff' }) {
  return (
    <Svg width={size} height={size} viewBox="0 -960 960 960">
      <Path
        fill={color}
        d="m354-287 126-76 126 77-33-144 111-96-146-13-58-136-58 135-146 13 111 97-33 143ZM233-120l65-281L80-590l288-25 112-265 112 265 288 25-218 189 65 281-247-149-247 149Zm457-560 21-89-71-59 94-8 36-84 36 84 94 8-71 59 21 89-80-47-80 47ZM480-481Z"
      />
    </Svg>
  );
}

function ShareFriendsIcon({ size = 18, color = '#fff' }) {
  return (
    <Svg width={size} height={size} viewBox="0 -960 960 960">
      <Path
        fill={color}
        d="M680-80q-50 0-85-35t-35-85q0-6 3-28L282-392q-16 15-37 23.5t-45 8.5q-50 0-85-35t-35-85q0-50 35-85t85-35q24 0 45 8.5t37 23.5l281-164q-2-7-2.5-13.5T560-760q0-50 35-85t85-35q50 0 85 35t35 85q0 50-35 85t-85 35q-24 0-45-8.5T598-672L317-508q2 7 2.5 13.5t.5 14.5q0 8-.5 14.5T317-452l281 164q16-15 37-23.5t45-8.5q50 0 85 35t35 85q0 50-35 85t-85 35Zm0-80q17 0 28.5-11.5T720-200q0-17-11.5-28.5T680-240q-17 0-28.5 11.5T640-200q0 17 11.5 28.5T680-160ZM200-440q17 0 28.5-11.5T240-480q0-17-11.5-28.5T200-520q-17 0-28.5 11.5T160-480q0 17 11.5 28.5T200-440Zm480-280q17 0 28.5-11.5T720-760q0-17-11.5-28.5T680-800q-17 0-28.5 11.5T640-760q0 17 11.5 28.5T680-720Zm0 520ZM200-480Zm480-280Z"
      />
    </Svg>
  );
}

function PrivacyPolicyIcon({ size = 18, color = '#fff' }) {
  return (
    <Svg width={size} height={size} viewBox="0 -960 960 960">
      <Path
        fill={color}
        d="M480-440q-59 0-99.5-40.5T340-580q0-59 40.5-99.5T480-720q59 0 99.5 40.5T620-580q0 59-40.5 99.5T480-440Zm0-80q26 0 43-17t17-43q0-26-17-43t-43-17q-26 0-43 17t-17 43q0 26 17 43t43 17Zm0 440q-139-35-229.5-159.5T160-516v-244l320-120 320 120v244q0 152-90.5 276.5T480-80Zm0-400Zm0-315-240 90v189q0 54 15 105t41 96q42-21 88-33t96-12q50 0 96 12t88 33q26-45 41-96t15-105v-189l-240-90Zm0 515q-36 0-70 8t-65 22q29 30 63 52t72 34q38-12 72-34t63-52q-31-14-65-22t-70-8Z"
      />
    </Svg>
  );
}

function TermsOfServiceIcon({ size = 18, color = '#fff' }) {
  return (
    <Svg width={size} height={size} viewBox="0 -960 960 960">
      <Path
        fill={color}
        d="M560-80v-123l221-220q9-9 20-13t22-4q12 0 23 4.5t20 13.5l37 37q8 9 12.5 20t4.5 22q0 11-4 22.5T903-300L683-80H560Zm300-263-37-37 37 37ZM620-140h38l121-122-18-19-19-18-122 121v38ZM240-80q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h320l240 240v120h-80v-80H520v-200H240v640h240v80H240Zm280-400Zm241 199-19-18 37 37-18-19Z"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: IOS.bg },
  scroll: { flex: 1 },
  content: {
    paddingBottom: 12,
    alignItems: 'center',
  },

  header: {
    width: '100%',
    maxWidth: 430,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  h1: {
    fontSize: 34,
    fontWeight: '800',
    color: IOS.text,
    letterSpacing: -0.6,
  },
  backBtn: {
    position: 'absolute',
    left: 10,
    top: 14,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIcon: {
    position: 'absolute',
    right: 10,
    top: 14,
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: IOS.card,
    borderWidth: 1,
    borderColor: IOS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  promoCard: {
    width: '100%',
    maxWidth: 430,
    marginBottom: 14,
    paddingHorizontal: 16,
  },
  promoBgIcon: {
    position: 'absolute',
    right: 14,
    top: 10,
  },
  promoRow: {
    backgroundColor: IOS.card,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
  },

  promoIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 4 },
    }),
  },
  promoTitle: { fontSize: 17, fontWeight: '800', color: IOS.text },
  promoSubtitle: { fontSize: 13, color: IOS.secondary, marginTop: 2 },

  promoBtn: {
    width: '100%',
    maxWidth: 430,
    backgroundColor: IOS.accent,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 10,
  },
  promoBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  pressed: { opacity: 0.85 },

  sectionLabel: {
    width: '100%',
    maxWidth: 430,
    paddingHorizontal: 24,
    marginTop: 14,
    marginBottom: 6,
    fontSize: 13,
    fontWeight: '700',
    color: IOS.secondary,
    letterSpacing: 0.6,
  },

  group: {
    width: '100%',
    maxWidth: 430,
    marginBottom: 10,
    paddingHorizontal: 16,
  },

  cellPress: {},
  cell: {
    backgroundColor: IOS.card,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(198,198,200,0.35)',
  },
  cellLast: {
    borderBottomWidth: 0,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  cellPressed: { backgroundColor: 'rgba(209,209,214,0.30)' },

  leftWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cellTitle: { fontSize: 17, color: IOS.text, fontWeight: '500' },

  squareIcon: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
  },
  rightValue: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rightValueText: { fontSize: 17, color: IOS.secondary, marginRight: 2 },

  rowTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  proBadge: {
    backgroundColor: '#FBBF24',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  proBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.4,
  },

  version: {
    width: '100%',
    maxWidth: 430,
    textAlign: 'center',
    color: IOS.secondary,
    fontSize: 13,
    marginTop: -2,
  },
});
