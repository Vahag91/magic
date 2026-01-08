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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { errorCodes, isErrorWithCode, pick, types } from '@react-native-documents/picker';
import { colors, common, shadow } from '../styles';
import { SimpleHeader } from '../components';
import {
  FolderOpenIcon,
  LightbulbIcon,
  PersonRemoveIcon,
  PhotoCameraIcon,
  PhotoLibraryIcon,
} from '../components/icons';

const PRIMARY = colors.blue500;
const TEXT = colors.text;
const MUTED = colors.muted;
const SURFACE = '#F9FAFB';

export default function RemoveBackgroundSelectScreen({ navigation }) {
  const navigateToProcessing = React.useCallback(
    ({ imageUri, base64, mime }) => {
      if (!imageUri && !base64) return;
      navigation.navigate('RemoveBackgroundProcessing', { imageUri, base64, mime });
    },
    [navigation]
  );

  const ensureAndroidPermission = React.useCallback(async (permission, rationale) => {
    if (Platform.OS !== 'android') return true;

    const result = await PermissionsAndroid.request(permission, rationale);
    if (result === PermissionsAndroid.RESULTS.GRANTED) return true;

    if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
      Alert.alert('Permission required', 'Please enable permission in Settings to continue.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]);
      return false;
    }

    Alert.alert('Permission denied', 'Permission is required to continue.');
    return false;
  }, []);

  const ensurePhotoPermission = React.useCallback(async () => {
    if (Platform.OS !== 'android') return true;

    const isAndroid13Plus = Number(Platform.Version) >= 33;
    const permission = isAndroid13Plus
      ? 'android.permission.READ_MEDIA_IMAGES'
      : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;

    return ensureAndroidPermission(permission, {
      title: 'Photos permission',
      message: 'Magic Studio needs access to your photos to select an image.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
    });
  }, [ensureAndroidPermission]);

  const ensureCameraPermission = React.useCallback(async () => {
    if (Platform.OS !== 'android') return true;

    return ensureAndroidPermission(PermissionsAndroid.PERMISSIONS.CAMERA, {
      title: 'Camera permission',
      message: 'Magic Studio needs access to your camera to take a photo.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
    });
  }, [ensureAndroidPermission]);

  const handleImagePickerResult = React.useCallback(
    (result) => {
      if (!result) return;
      if (result.didCancel) return;

      if (result.errorCode) {
        if (result.errorCode === 'permission') {
          Alert.alert('Permission required', 'Please enable permission in Settings to continue.', [
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

      navigateToProcessing({ imageUri, base64, mime });
    },
    [navigateToProcessing]
  );

  const onPhotoLibrary = React.useCallback(async () => {
    const ok = await ensurePhotoPermission();
    if (!ok) return;

    const result = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 1,
      quality: 0.7, // Reduced from 1.0 to reduce upload size (~50% smaller, still high quality)
      includeBase64: true, // ✅ required for easiest background removal
    });

    handleImagePickerResult(result);
  }, [ensurePhotoPermission, handleImagePickerResult]);

  const onCamera = React.useCallback(async () => {
    const ok = await ensureCameraPermission();
    if (!ok) return;

    const result = await launchCamera({
      mediaType: 'photo',
      cameraType: 'back',
      saveToPhotos: false,
      quality: 0.7, // Reduced from 1.0 to reduce upload size (~50% smaller, still high quality)
      includeBase64: true, // ✅ required for easiest background removal
    });

    handleImagePickerResult(result);
  }, [ensureCameraPermission, handleImagePickerResult]);

  const onFiles = React.useCallback(async () => {
    try {
      // ✅ IMPORTANT: copyTo fixes content:// issues on Android and makes file readable later
      const results = await pick({
        type: [types.images],
        copyTo: 'cachesDirectory',
      });

      const file = results?.[0];
      const imageUri = file?.fileCopyUri || file?.uri;
      const mime = file?.type || null;

      if (!imageUri) return;

      // Files picker usually doesn't provide base64, processing screen will convert if needed
      navigateToProcessing({ imageUri, base64: null, mime });
    } catch (error) {
      if (isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED) return;
      Alert.alert('Files', 'Could not open file picker.');
    }
  }, [navigateToProcessing]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.root}>
        <SimpleHeader title="Remove Background" onBack={() => navigation.goBack()} />

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} bounces>
          <View style={styles.heroWrap}>
            <View style={styles.heroRing}>
              <View style={styles.heroRingHighlightTR} pointerEvents="none" />
              <View style={styles.heroRingHighlightBL} pointerEvents="none" />
              <Text style={[styles.sparkle, { top: -2, right: -2 }]}>✦</Text>
              <Text style={[styles.sparkle, { bottom: 6, left: -10 }]}>✦</Text>

              <View style={styles.heroIcon}>
                <PersonRemoveIcon size={44} color="#fff" />
              </View>
            </View>

            <Text style={styles.heroTitle}>Select a Photo</Text>
            <Text style={styles.heroSubtitle}>
              Choose an image to magically remove its background instantly.
            </Text>
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
                  Best results come from photos with a <Text style={styles.tipAccent}>clear subject</Text> and{' '}
                  <Text style={styles.tipAccent}>good lighting</Text>.
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
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
});
