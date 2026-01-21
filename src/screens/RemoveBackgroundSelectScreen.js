// RemoveBackgroundSelectScreen.js
// ✅ Adds loader + hard lock to prevent double taps

import * as React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  Linking,
  PermissionsAndroid,
  Platform,
  ActivityIndicator,
  InteractionManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { launchImageLibrary } from 'react-native-image-picker';
import { errorCodes, isErrorWithCode, pick, types } from '@react-native-documents/picker';
import { colors, common, shadow } from '../styles';
import {
  ImageIcon,
  FolderOpenIcon,
  LightbulbIcon,
  PersonRemoveIcon,
  PhotoLibraryIcon,
} from '../components/icons';

import { useError } from '../providers/ErrorProvider';
import { createLogger } from '../logger';

const PRIMARY = colors.blue500;
const TEXT = colors.text;
const MUTED = colors.muted;
const SURFACE = '#F9FAFB';
const removeBackgroundSelectLogger = createLogger('RemoveBackgroundSelect');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
const twoFrames = async () => {
  await nextFrame();
  await nextFrame();
};

async function settleUI(ms = 350) {
  // Helps ensure system modal closes before presenting next native UI
  try {
    await InteractionManager.runAfterInteractions(() => {});
  } catch {}
  await twoFrames();
  await sleep(ms);
}

function isDev() {
  return typeof __DEV__ !== 'undefined' && __DEV__;
}

function logIf(debug, event, payload) {
  if (!debug) return;
  removeBackgroundSelectLogger.log(event, payload);
}
function formatUriForLog(uri) {
  const s = String(uri || '');
  if (!s) return '';
  return s.length > 140 ? `${s.slice(0, 140)}…` : s;
}

function normalizeMime(mime) {
  if (!mime) return null;
  const m = String(mime);
  if (m === 'image/jpg') return 'image/jpeg';
  return m;
}

export default function RemoveBackgroundSelectScreen({ navigation, route }) {
  const { showError } = useError();
  const isActionInProgress = React.useRef(false);
  const [busy, setBusy] = React.useState(false);
  const debugLogs = isDev();

  const isObjectRemoval =
    route?.name === 'RemoveObjectSelect' || route?.params?.flow === 'objectRemoval';

  const heroTitle = 'Select a Photo';
  const heroSubtitle = isObjectRemoval
    ? 'Choose an image and paint over what you want removed.'
    : 'Choose an image to magically remove its background instantly.';

  const HeroIcon = isObjectRemoval ? ImageIcon : PersonRemoveIcon;

  const lock = React.useCallback(() => {
    if (isActionInProgress.current) return false;
    isActionInProgress.current = true;
    setBusy(true);
    return true;
  }, []);

  const release = React.useCallback(() => {
    isActionInProgress.current = false;
    setBusy(false);
  }, []);

  const navigateNext = React.useCallback(
    ({ imageUri, base64, mime }) => {
      if (!imageUri && !base64) return;

      logIf(debugLogs, 'navigate', {
        imageUri: formatUriForLog(imageUri),
        hasBase64: Boolean(base64),
        mime,
      });

      navigation.navigate('Crop', {
        imageUri,
        base64,
        mime,
        flow: isObjectRemoval ? 'objectRemoval' : 'backgroundRemoval',
      });
    },
    [debugLogs, isObjectRemoval, navigation],
  );

  const handleImagePickerResult = React.useCallback(
    async (result, source) => {
      try {
        if (!result) return;
        if (result.didCancel) return;

        if (result.errorCode) {
          if (result.errorCode === 'permission') {
            Alert.alert('Permission required', 'Please enable permission in Settings.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ]);
            return;
          }
          showError();
          return;
        }

        const asset = result.assets?.[0];
        const rawUri = asset?.uri || null;
        const mime = normalizeMime(asset?.type) || null;
        const base64 = asset?.base64 || null;

        if (!rawUri && !base64) {
          Alert.alert('No image selected', 'Please try again.');
          return;
        }

        logIf(debugLogs, 'picker:asset', {
          source: source || 'unknown',
          uri: rawUri,
          mime,
          width: asset?.width || null,
          height: asset?.height || null,
          fileName: asset?.fileName || null,
          fileSize: asset?.fileSize || null,
          hasBase64: Boolean(base64),
          orientation: asset?.orientation || null,
        });

        const imageUri = rawUri;
        const outMime = mime;

        // Avoid passing huge base64 through navigation for object removal.
        const nextBase64 = isObjectRemoval ? null : base64;

        navigateNext({
          imageUri,
          base64: nextBase64,
          mime: outMime,
        });
      } finally {
        release();
      }
    },
    [debugLogs, isObjectRemoval, navigateNext, release, showError],
  );

  // ---------------- Actions ----------------

  const onPhotoLibrary = React.useCallback(async () => {
    if (!lock()) return;

    try {
      // Keep your existing Android <33 read permission guard
      if (Platform.OS === 'android' && Number(Platform.Version) < 33) {
        const perm = PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
        const has = await PermissionsAndroid.check(perm);
        if (!has) {
          const status = await PermissionsAndroid.request(perm);
          if (status !== PermissionsAndroid.RESULTS.GRANTED) {
            release();
            if (status === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
              Alert.alert('Permission Required', 'Allow access to photos in settings.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Settings', onPress: () => Linking.openSettings() },
              ]);
            }
            return;
          }
          await settleUI(350);
        }
      }

      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        quality: 1,
        includeBase64: !isObjectRemoval,
      });

      await handleImagePickerResult(result, 'library');
    } catch (e) {
      release();
      showError();
    }
  }, [handleImagePickerResult, isObjectRemoval, lock, release, showError]);

  const onFiles = React.useCallback(async () => {
    if (!lock()) return;

    try {
      const results = await pick({
        type: [types.images],
        copyTo: 'cachesDirectory',
      });

      const file = results?.[0];
      const imageUri = file?.fileCopyUri || file?.uri;
      const mime = file?.type || null;
      logIf(debugLogs, 'picker:file', {
        uri: formatUriForLog(imageUri),
        mime,
        name: file?.name || null,
        size: file?.size || null,
      });

      release();

      if (!imageUri) return;
      navigateNext({ imageUri, base64: null, mime });
    } catch (error) {
      release();
      if (isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED) return;
      showError();
    }
  }, [debugLogs, lock, navigateNext, release, showError]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} bounces>
          <View style={styles.heroWrap}>
            <View style={styles.heroRing}>
              <View style={styles.heroRingHighlightTR} pointerEvents="none" />
              <View style={styles.heroRingHighlightBL} pointerEvents="none" />
              <Text style={[styles.sparkle, { top: -2, right: -2 }]}>✦</Text>
              <Text style={[styles.sparkle, { bottom: 6, left: -10 }]}>✦</Text>

              <View style={styles.heroIcon}>
                <HeroIcon size={44} color="#fff" />
              </View>
            </View>

            <Text style={styles.heroTitle}>{heroTitle}</Text>
            <Text style={styles.heroSubtitle}>{heroSubtitle}</Text>
          </View>

          <View style={styles.options}>
            <OptionRow
              title="Photo Library"
              subtitle="Select from your gallery"
              Icon={PhotoLibraryIcon}
              iconBg="#DBEAFE"
              iconColor={PRIMARY}
              onPress={onPhotoLibrary}
            />

            <OptionRow
              title="Files"
              subtitle="Import from iCloud or Drive"
              Icon={FolderOpenIcon}
              iconBg="#E0E7FF"
              iconColor="#4F46E5"
              onPress={onFiles}
            />
          </View>

          <View style={styles.tipCardWrap}>
            <View style={styles.tipCard}>
              <View style={styles.tipIcon}>
                <LightbulbIcon size={18} color={PRIMARY} />
              </View>
              <View style={styles.tipTextContainer}>
                <Text style={styles.tipTitle}>Pro Tip</Text>
                <Text style={styles.tipText}>
                  {isObjectRemoval ? (
                    <>
                      Paint a <Text style={styles.tipAccent}>slightly larger area</Text> than the object for smoother
                      removal.
                    </>
                  ) : (
                    <>
                      Best results come from photos with a <Text style={styles.tipAccent}>clear subject</Text> and{' '}
                      <Text style={styles.tipAccent}>good lighting</Text>.
                    </>
                  )}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {busy ? (
          <View style={styles.busyOverlay} pointerEvents="auto">
            <View style={styles.busyCard}>
              <ActivityIndicator />
              <Text style={styles.busyText}>Preparing…</Text>
            </View>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function OptionRow({ title, subtitle, Icon, iconBg, iconColor, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: '#00000010' }}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={[styles.rowIconWrap, { backgroundColor: iconBg }]}>
        <Icon size={24} color={iconColor} />
      </View>

      <View style={styles.rowTextWrap}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>

      <Text style={styles.chev}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: common.safeWhite,
  root: { flex: 1, backgroundColor: colors.white, paddingHorizontal: 24 },

  scroll: { flexGrow: 1, paddingTop: 12, paddingBottom: 18 },

  heroWrap: { alignItems: 'center', paddingTop: 10, paddingBottom: 18, marginBottom: 10 },
  heroRing: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  heroRingHighlightTR: {
    position: 'absolute',
    top: 12,
    right: 14,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#DBEAFE',
    opacity: 0.8,
  },
  heroRingHighlightBL: {
    position: 'absolute',
    bottom: 10,
    left: 12,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E0E7FF',
    opacity: 0.25,
  },
  sparkle: {
    position: 'absolute',
    fontSize: 18,
    color: PRIMARY,
    opacity: 0.9,
  },
  heroIcon: {
    width: 88,
    height: 88,
    borderRadius: 22,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow({ color: PRIMARY, opacity: 0.28, radius: 18, offsetY: 10, elevation: 5 }),
  },

  heroTitle: { fontSize: 24, fontWeight: '900', color: TEXT, marginTop: 6 },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 14,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
  },

  options: { gap: 14, marginBottom: 16 },

  row: {
    backgroundColor: SURFACE,
    borderRadius: 22,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    ...shadow({ color: '#000', opacity: 0.04, radius: 12, offsetY: 6, elevation: 1 }),
  },
  rowPressed: { transform: [{ scale: 0.985 }] },
  rowIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowTextWrap: { flex: 1 },
  rowTitle: { fontSize: 16, fontWeight: '800', color: TEXT },
  rowSubtitle: { marginTop: 2, fontSize: 12, color: MUTED, fontWeight: '600' },
  chev: { fontSize: 26, color: colors.gray400, marginLeft: 10, fontWeight: '900' },

  tipCardWrap: { marginTop: 'auto' },
  tipCard: {
    borderRadius: 22,
    padding: 14,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    backgroundColor: '#EFF6FF',
    alignItems: 'flex-start',
  },
  tipIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    ...shadow({ color: '#000', opacity: 0.06, radius: 10, offsetY: 4, elevation: 1 }),
  },
  tipTextContainer: { flex: 1 },
  tipTitle: { fontSize: 13, fontWeight: '900', color: TEXT, marginBottom: 4 },
  tipText: { fontSize: 12, color: MUTED, lineHeight: 17, fontWeight: '600' },
  tipAccent: { color: PRIMARY, fontWeight: '900' },

  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  busyCard: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    ...shadow({ color: '#000', opacity: 0.08, radius: 18, offsetY: 10, elevation: 3 }),
  },
  busyText: { fontSize: 13, fontWeight: '800', color: '#111827' },
});
