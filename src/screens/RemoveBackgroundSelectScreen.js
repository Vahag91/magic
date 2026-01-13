// RemoveBackgroundSelectScreen.js (FULL FIXED)
// ✅ iOS fix: request CAMERA permission BEFORE calling launchCamera()
// ✅ Android fix: request CAMERA permission BEFORE calling launchCamera()
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
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { errorCodes, isErrorWithCode, pick, types } from '@react-native-documents/picker';
import { colors, common, shadow } from '../styles';
import { SimpleHeader } from '../components';
import {
  ImageIcon,
  FolderOpenIcon,
  LightbulbIcon,
  PersonRemoveIcon,
  PhotoCameraIcon,
  PhotoLibraryIcon,
} from '../components/icons';

// ✅ iOS permission control (REQUIRED to prevent "modal + camera together")
import { check, request, RESULTS, PERMISSIONS, openSettings } from 'react-native-permissions';

const PRIMARY = colors.blue500;
const TEXT = colors.text;
const MUTED = colors.muted;
const SURFACE = '#F9FAFB';

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

export default function RemoveBackgroundSelectScreen({ navigation, route }) {
  const isActionInProgress = React.useRef(false);
  const [busy, setBusy] = React.useState(false);

  const isObjectRemoval =
    route?.name === 'RemoveObjectSelect' || route?.params?.flow === 'objectRemoval';

  const headerTitle = isObjectRemoval ? 'Remove Object' : 'Remove Background';
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

      if (isObjectRemoval) {
        if (!imageUri) return;
        navigation.navigate('ObjectRemover', { imageUri });
        return;
      }

      navigation.navigate('RemoveBackgroundProcessing', { imageUri, base64, mime });
    },
    [isObjectRemoval, navigation],
  );

  const handleImagePickerResult = React.useCallback(
    (result) => {
      release();

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
        Alert.alert('Error', result.errorMessage || 'Something went wrong.');
        return;
      }

      const asset = result.assets?.[0];
      const imageUri = asset?.uri || null;
      const base64 = asset?.base64 || null;
      const mime = asset?.type || null;

      if (!imageUri && !base64) {
        Alert.alert('No image selected', 'Please try again.');
        return;
      }

      navigateNext({ imageUri, base64, mime });
    },
    [navigateNext, release],
  );

  // ---------------- Permission helpers ----------------

  const ensureIOSCameraPermission = React.useCallback(async () => {
    // ✅ This is the key fix: request camera permission BEFORE opening camera UI
    if (Platform.OS !== 'ios') return { granted: true };

    try {
      const perm = PERMISSIONS.IOS.CAMERA;
      const current = await check(perm);

      if (current === RESULTS.GRANTED) return { granted: true };
      if (current === RESULTS.LIMITED) return { granted: true }; // not typical for camera but safe

      if (current === RESULTS.BLOCKED) return { granted: false, blocked: true };

      // RESULTS.DENIED / RESULTS.UNAVAILABLE
      const next = await request(perm);

      if (next === RESULTS.GRANTED || next === RESULTS.LIMITED) {
        // ✅ Important: let iOS dismiss the permission sheet fully
        await settleUI(450);
        return { granted: true };
      }

      if (next === RESULTS.BLOCKED) return { granted: false, blocked: true };
      return { granted: false, blocked: false };
    } catch (e) {
      return { granted: false, blocked: false, error: e };
    }
  }, []);

  const ensureAndroidCameraPermission = React.useCallback(async () => {
    if (Platform.OS !== 'android') return { granted: true };

    try {
      const perm = PermissionsAndroid.PERMISSIONS.CAMERA;
      const has = await PermissionsAndroid.check(perm);
      if (has) return { granted: true };

      const status = await PermissionsAndroid.request(perm, {
        title: 'Camera Permission',
        message: 'Magic Studio needs access to your camera to take a photo.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      });

      if (status === PermissionsAndroid.RESULTS.GRANTED) {
        // ✅ Let Android permission dialog close cleanly
        await settleUI(650);
        return { granted: true };
      }

      if (status === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
        return { granted: false, blocked: true };
      }

      return { granted: false, blocked: false };
    } catch (e) {
      return { granted: false, blocked: false, error: e };
    }
  }, []);

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
        quality: isObjectRemoval ? 1 : 0.7,
        includeBase64: !isObjectRemoval,
      });

      handleImagePickerResult(result);
    } catch (e) {
      release();
      Alert.alert('Error', 'Could not open photo library.');
    }
  }, [handleImagePickerResult, isObjectRemoval, lock, release]);

  const onCamera = React.useCallback(async () => {
    if (!lock()) return;

    try {
      // ✅ iOS: request permission FIRST (prevents "modal + camera together")
      if (Platform.OS === 'ios') {
        const iosPerm = await ensureIOSCameraPermission();
        if (!iosPerm.granted) {
          release();
          if (iosPerm.blocked) {
            Alert.alert(
              'Camera Blocked',
              'Please enable Camera access in Settings.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Open Settings', onPress: () => openSettings().catch(() => Linking.openSettings()) },
              ]
            );
          }
          return;
        }

        // extra settle just in case
        await settleUI(150);
      }

      // ✅ Android: request permission FIRST
      if (Platform.OS === 'android') {
        const andPerm = await ensureAndroidCameraPermission();
        if (!andPerm.granted) {
          release();
          if (andPerm.blocked) {
            Alert.alert('Camera Blocked', 'Please enable camera access in your phone Settings.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Settings', onPress: () => Linking.openSettings() },
            ]);
          }
          return;
        }
        await settleUI(120);
      }

      // ✅ Only after permission is granted + UI settled, open camera
      const result = await launchCamera({
        mediaType: 'photo',
        cameraType: 'back',
        saveToPhotos: false,
        quality: isObjectRemoval ? 1 : 0.7,
        includeBase64: !isObjectRemoval,
      });

      handleImagePickerResult(result);
    } catch (e) {
      release();
      Alert.alert('Error', 'Could not open camera.');
    }
  }, [
    ensureAndroidCameraPermission,
    ensureIOSCameraPermission,
    handleImagePickerResult,
    isObjectRemoval,
    lock,
    release,
  ]);

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

      release();

      if (!imageUri) return;
      navigateNext({ imageUri, base64: null, mime });
    } catch (error) {
      release();
      if (isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED) return;
      Alert.alert('Files', 'Could not open file picker.');
    }
  }, [lock, navigateNext, release]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.root}>
        <SimpleHeader title={headerTitle} onBack={() => navigation.goBack()} />

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
              title="Camera"
              subtitle="Take a new photo"
              Icon={PhotoCameraIcon}
              iconBg="#F3E8FF"
              iconColor="#7C3AED"
              onPress={onCamera}
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
