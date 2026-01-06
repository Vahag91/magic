import * as React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { colors, common, shadow } from '../styles';
import { ProcessingMagicIcon } from '../components/icons';
import { supabase } from '../services/supabaseClient'; // ✅ change path to your supabase client

const PRIMARY = colors.brandBlue;
const TEXT = colors.text;
const MUTED = colors.muted;

function isHttpUrl(s) {
  return typeof s === 'string' && /^https?:\/\//i.test(s);
}
function isDataUri(s) {
  return typeof s === 'string' && /^data:/i.test(s);
}

// Converts local uri (file://) to dataURI.
// NOTE: Works well if you used document picker with copyTo:'cachesDirectory'
async function uriToDataUri(uri) {
  const res = await fetch(uri);
  if (!res.ok) throw new Error('Failed to read selected image.');
  const blob = await res.blob();

  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read selected image.'));
    reader.onloadend = () => resolve(String(reader.result || ''));
    reader.readAsDataURL(blob);
  });
}

async function buildInputImage({ imageUri, base64, mime }) {
  // Best path: base64 from camera/library
  if (base64) {
    const safeMime = mime || 'image/jpeg';
    return `data:${safeMime};base64,${base64}`;
  }

  // If already URL or dataURI, pass through
  if (isHttpUrl(imageUri) || isDataUri(imageUri)) return imageUri;

  // Otherwise local file -> dataURI
  return await uriToDataUri(imageUri);
}

export default function RemoveBackgroundProcessingScreen({ navigation, route }) {
  const imageUri = route?.params?.imageUri || null;
  const base64 = route?.params?.base64 || null;
  const mime = route?.params?.mime || null;

  const [statusTitle, setStatusTitle] = React.useState('Detecting subject...');
  const [statusSub, setStatusSub] = React.useState('This will just take a few seconds.');
  const [progress, setProgress] = React.useState(0.12);

  const startedRef = React.useRef(false);
  const canceledRef = React.useRef(false);

  // UI-only fake progress
  React.useEffect(() => {
    const id = setInterval(() => {
      setProgress((p) => (p >= 0.9 ? p : Math.min(0.9, p + 0.03)));
    }, 350);
    return () => clearInterval(id);
  }, []);

  React.useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    if (!imageUri && !base64) {
      Alert.alert('No image', 'Please select an image first.');
      navigation.goBack();
      return;
    }

    (async () => {
      try {
        setStatusTitle('Preparing image...');
        setStatusSub('Optimizing for best results.');

        const inputImage = await buildInputImage({ imageUri, base64, mime });
        if (canceledRef.current) return;

        setStatusTitle('Removing background...');
        setStatusSub('AI is processing your photo.');

        const { data, error } = await supabase.functions.invoke('smart-api', {
          body: {
            inputImage,
            outputFormat: 'PNG',
            outputQuality: 85,
            outputType: ['URL'],
            includeCost: false,
          },
        });

        if (canceledRef.current) return;

        if (error) throw new Error(error.message || 'Background removal failed.');

        // Expected from edge: { images: [{ url }] } (recommended)
        const outUrl =
          data?.images?.[0]?.url ||
          data?.imageUrl ||
          data?.url ||
          null;

        if (!outUrl) throw new Error('No output image returned from server.');

        setProgress(1);
console.log("succes");

        // ✅ change this route name to your actual result screen
        navigation.replace('BackgroundEditor', {
          subjectUri: outUrl,       // ✅ the cutout PNG (no background)
          originalUri: imageUri,    // optional, if you want compare later
        });
      } catch (e) {
        if (canceledRef.current) return;
        Alert.alert('Background Removal', e?.message || 'Something went wrong.', [
          { text: 'Back', onPress: () => navigation.goBack() },
        ]);
      }
    })();
  }, [navigation, imageUri, base64, mime]);

  const onCancel = React.useCallback(() => {
    canceledRef.current = true;
    navigation.goBack();
  }, [navigation]);

  // show blurred preview (use original uri; for base64-only cases we still usually have uri from picker)
  const previewUri =
    imageUri ||
    (base64 ? `data:${mime || 'image/jpeg'};base64,${base64}` : null);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} style={styles.headerBtn} activeOpacity={0.8}>
            <Text style={styles.iconText}>‹</Text>
          </TouchableOpacity>

          <View style={styles.headerSpacer} />

          <TouchableOpacity
            onPress={() => {
              Alert.alert('Info', 'This screen runs background removal automatically.');
            }}
            style={styles.headerBtn}
            activeOpacity={0.8}
          >
            <Text style={styles.helpText}>?</Text>
          </TouchableOpacity>
        </View>

        {/* Brand */}
        <View style={styles.brand}>
          <View style={styles.appIconWrap}>
            <ProcessingMagicIcon size={34} color="#F3F3F3" />
          </View>
          <Text style={styles.brandTitle}>Magic Studio</Text>
        </View>

        {/* Image Card */}
        <View style={styles.card}>
          {previewUri ? (
            <Image source={{ uri: previewUri }} style={styles.cardImage} blurRadius={10} />
          ) : (
            <View style={[styles.cardImage, { backgroundColor: colors.gray200 }]} />
          )}

          <View style={styles.cardOverlay} />

          {/* scan line */}
          <View style={styles.scanLine} />

          {/* center loader */}
          <View style={styles.centerLoader}>
            <ActivityIndicator size="large" color={PRIMARY} />
          </View>

          {/* pill */}
          <View style={styles.pill}>
            <View style={styles.pingDotOuter} />
            <View style={styles.pingDotInner} />
            <Text style={styles.pillText}>AI Processing</Text>
          </View>
        </View>

        {/* Status */}
        <View style={styles.status}>
          <Text style={styles.statusTitle}>{statusTitle}</Text>
          <Text style={styles.statusSub}>{statusSub}</Text>
        </View>

        {/* Progress */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>

        {/* Cancel */}
        <TouchableOpacity style={styles.cancelBtn} activeOpacity={0.85} onPress={onCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>

        <View style={styles.homeIndicator} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: common.safeWhite,
  container: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 8,
    alignItems: 'center',
  },

  header: {
    width: '100%',
    ...common.header,
  },
  headerSpacer: { width: 44 },
  headerBtn: {
    ...common.headerBtn,
    backgroundColor: colors.white,
    ...shadow({ color: '#000', opacity: 0.06, radius: 10, offsetY: 4, elevation: 2 }),
  },
  iconText: { fontSize: 28, color: TEXT, marginTop: Platform.select({ ios: -2, android: 0 }) },
  helpText: { fontSize: 18, color: TEXT, fontWeight: '900' },

  brand: { alignItems: 'center', marginTop: 6, marginBottom: 18 },
  appIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: PRIMARY,
        shadowOpacity: 0.22,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 10 },
      },
      android: { elevation: 5 },
    }),
  },
  brandTitle: { marginTop: 12, fontSize: 22, fontWeight: '900', color: TEXT },

  card: {
    width: '100%',
    aspectRatio: 4 / 5,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: colors.gray100,
    ...shadow({ color: '#000', opacity: 0.14, radius: 22, offsetY: 16, elevation: 8 }),
    position: 'relative',
  },
  cardImage: { width: '100%', height: '100%' },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    opacity: 0.18,
  },

  scanLine: {
    position: 'absolute',
    top: '46%',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: PRIMARY,
    opacity: 0.85,
    shadowColor: PRIMARY,
    shadowOpacity: 0.8,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },

  centerLoader: {
    position: 'absolute',
    top: '42%',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },

  pill: {
    position: 'absolute',
    bottom: 18,
    alignSelf: 'center',
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.88)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pingDotOuter: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: PRIMARY,
    opacity: 0.25,
  },
  pingDotInner: {
    position: 'absolute',
    left: 14,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: PRIMARY,
    opacity: 0.95,
  },
  pillText: { marginLeft: 10, fontSize: 12, fontWeight: '800', color: TEXT },

  status: { marginTop: 18, alignItems: 'center' },
  statusTitle: { fontSize: 16, fontWeight: '900', color: TEXT },
  statusSub: { marginTop: 6, fontSize: 13, color: MUTED, fontWeight: '600', textAlign: 'center' },

  progressTrack: {
    marginTop: 16,
    width: '100%',
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.gray200,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: PRIMARY,
    borderRadius: 999,
  },

  cancelBtn: { marginTop: 20, paddingVertical: 12, paddingHorizontal: 20 },
  cancelText: { color: '#EF4444', fontSize: 14, fontWeight: '900' },

  homeIndicator: {
    ...common.homeIndicator,
    marginTop: 'auto',
    marginBottom: 10,
    opacity: 0.9,
  },
});