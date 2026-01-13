import * as React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  Linking,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { errorCodes, isErrorWithCode, pick, types } from '@react-native-documents/picker';
import { common, colors } from '../styles';
import { SimpleHeader } from '../components';
import { FolderOpenIcon, PhotoCameraIcon, PhotoLibraryIcon } from '../components/icons';

export default function RemoveObjectSelectScreen({ navigation }) {
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

  const navigateToEditor = React.useCallback(
    ({ imageUri, width, height }) => {
      if (!imageUri) return;
      navigation.navigate('ObjectRemover', { imageUri, width, height });
    },
    [navigation],
  );

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
      if (!imageUri) return;
      navigateToEditor({ imageUri, width: asset?.width, height: asset?.height });
    },
    [navigateToEditor],
  );

  const onPhotoLibrary = React.useCallback(async () => {
    const ok = await ensurePhotoPermission();
    if (!ok) return;

    const result = await launchImageLibrary({
      mediaType: 'photo',
      includeBase64: false,
      quality: 1,
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
      includeBase64: false,
      quality: 1,
    });

    handleImagePickerResult(result);
  }, [ensureCameraPermission, handleImagePickerResult]);

  const onFiles = React.useCallback(async () => {
    try {
      const results = await pick({
        type: [types.images],
        copyTo: 'cachesDirectory',
      });

      const file = results?.[0];
      const imageUri = file?.fileCopyUri || file?.uri;
      if (!imageUri) return;

      navigateToEditor({ imageUri, width: null, height: null });
    } catch (error) {
      if (isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED) return;
      Alert.alert('Files', 'Could not open file picker.');
    }
  }, [navigateToEditor]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <SimpleHeader title="Remove Object" onBack={() => navigation.goBack()} />

        <View style={styles.content}>
          <Text style={styles.title}>Select a photo</Text>
          <Text style={styles.sub}>
            Paint over what you want removed. No prompt needed.
          </Text>

          <View style={styles.options}>
            <OptionRow title="Photo Library" subtitle="Choose from gallery" Icon={PhotoLibraryIcon} onPress={onPhotoLibrary} />
            <OptionRow title="Camera" subtitle="Take a new photo" Icon={PhotoCameraIcon} onPress={onCamera} />
            <OptionRow title="Files" subtitle="Import from iCloud/Drive" Icon={FolderOpenIcon} onPress={onFiles} />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

function OptionRow({ title, subtitle, Icon, onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.9 }]}>
      <View style={styles.rowLeft}>
        <View style={styles.rowIcon}>
          <Icon size={20} color={colors.brandBlue} />
        </View>
        <View>
          <Text style={styles.rowTitle}>{title}</Text>
          <Text style={styles.rowSub}>{subtitle}</Text>
        </View>
      </View>
      <Text style={styles.chev}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: common.safeWhite,
  container: common.containerPadded,

  content: { flex: 1, paddingTop: 14 },
  title: { fontSize: 22, fontWeight: '900', color: colors.text, marginBottom: 6 },
  sub: { fontSize: 13, fontWeight: '700', color: colors.muted, marginBottom: 16 },
  options: { gap: 10 },
  row: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { fontSize: 16, fontWeight: '900', color: colors.text },
  rowSub: { fontSize: 12, fontWeight: '700', color: colors.muted, marginTop: 2 },
  chev: { fontSize: 22, fontWeight: '900', color: colors.gray400 },
});
