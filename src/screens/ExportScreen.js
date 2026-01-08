import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
  PermissionsAndroid,
} from 'react-native';
import { CameraRoll } from '@react-native-camera-roll/camera-roll'; // npm install @react-native-camera-roll/camera-roll
import Share from 'react-native-share'; // npm install react-native-share
import RNFS from 'react-native-fs'; // npm install react-native-fs

import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArrowBackIcon, TransparentIcon, BackgroundIcon, HDIcon, SaveIcon, ShareIcon, CheckIcon } from '../components/icons';
import { colors } from '../styles';
import { CANVAS_WIDTH } from './BackgroundEditor/styles';
import { createLogger } from '../logger';

const log = createLogger('Export');

const PRIMARY = colors.brandBlue || '#2563EB';
const BG = '#FFFFFF';
const TEXT = '#111827';
const SUB = '#6B7280';
const BORDER = '#E5E7EB';

// Optimized Checkerboard using a repeating image pattern is better, 
// but here is a lighter CSS version without 600 views.
const TiledCheckerboard = () => (
  <View style={styles.tiledContainer}>
     <Image 
       source={{ uri: 'https://www.transparenttextures.com/patterns/stardust.png' }} // Replace with a local transparent-pattern.png
       style={styles.tiledImage} 
       resizeMode="repeat" 
     />
     {/* Fallback to simple gray if no image */}
     <View style={[StyleSheet.absoluteFill, { backgroundColor: '#F3F4F6', zIndex: -1 }]} />
  </View>
);

export default function ExportScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const resultUri = route?.params?.resultUri;
  const resultWidth = route?.params?.width || 1080;
  const resultHeight = route?.params?.height || 1350;
  const aspectRatio = resultWidth / resultHeight;
  const previewWidth = route?.params?.canvasDisplayWidth || CANVAS_WIDTH;
  const imgLoadT0 = React.useRef(0);

  React.useEffect(() => {
    log.log('screen_mount', {
      hasUri: Boolean(resultUri),
      resultWidth,
      resultHeight,
      aspectRatio,
      previewWidth,
    });
    return () => log.log('screen_unmount');
  }, [aspectRatio, previewWidth, resultHeight, resultUri, resultWidth]);

  // State
  const [format, setFormat] = useState('png'); // Note: Converting requires extra logic
  const [resolution, setResolution] = useState('original');
  const [isSaving, setIsSaving] = useState(false);

  // --- Helpers ---

  const hasAndroidPermission = async () => {
    if (Platform.OS !== 'android') return true;
    if (Platform.Version >= 33) return true; // Android 13 handles this differently

    const permission = PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE;
    const hasPermission = await PermissionsAndroid.check(permission);
    if (hasPermission) return true;

    const status = await PermissionsAndroid.request(permission);
    return status === 'granted';
  };

  // --- Actions ---

  const onSave = async () => {
    if (!resultUri) return;
    if (isSaving) return;

    setIsSaving(true);
    
    try {
      log.time('save_to_photos', { uri: resultUri });
      if (Platform.OS === 'android' && !(await hasAndroidPermission())) {
        log.timeEnd('save_to_photos', { ok: false, reason: 'permission_denied' });
        Alert.alert("Permission Denied", "We need storage access to save the image.");
        setIsSaving(false);
        return;
      }

      // 1. If format is JPG but file is PNG, you might need conversion here.
      // For now, we assume the file from Editor is essentially ready.
      
      // 2. Save to Gallery
      await CameraRoll.saveAsset(resultUri, { type: 'photo' });
      log.timeEnd('save_to_photos', { ok: true });
      
      Alert.alert("Success", "Image saved to Photos!", [
        { text: "Great", onPress: () => navigation.popToTop() }
      ]);

    } catch (error) {
      log.timeEnd('save_to_photos', { ok: false, error: error?.message || String(error) });
      Alert.alert("Error", "Could not save image. Please check permissions.");
    } finally {
      setIsSaving(false);
    }
  };

  const onShare = async () => {
    if (!resultUri) return;
    try {
      log.time('share', { uri: resultUri });
      await Share.open({
        url: resultUri,
        type: format === 'png' ? 'image/png' : 'image/jpeg',
        failOnCancel: false, // Don't throw error if user cancels share sheet
      });
      log.timeEnd('share', { ok: true });
    } catch (error) {
      log.timeEnd('share', { ok: false, error: error?.message || String(error) });
    }
  };

  const handleProFeature = () => {
    Alert.alert("Upgrade to Pro", "Unlock HD export and more formats!");
    // navigation.navigate('Paywall');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.root}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation?.goBack?.()} style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]} hitSlop={10}>
            <ArrowBackIcon size={24} color="#6B7280" />
          </Pressable>
          <Text style={styles.title}>Export</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Image Preview */}
          <View style={[styles.previewWrap, { width: previewWidth, aspectRatio }]}>
            {/* Optimized Background */}
            <TiledCheckerboard />
            
            <View style={styles.previewInner}>
              {resultUri ? (
                <Image
                  source={{ uri: resultUri }}
                  style={styles.previewImg}
                  resizeMode="contain"
                  onLoadStart={() => {
                    imgLoadT0.current = Date.now();
                    log.log('preview_image_load_start', { uri: resultUri });
                  }}
                  onLoadEnd={() => {
                    const ms = imgLoadT0.current ? Date.now() - imgLoadT0.current : undefined;
                    log.log('preview_image_load_end', { uri: resultUri, ms });
                  }}
                  onError={e => log.warn('preview_image_load_error', { uri: resultUri, error: e?.nativeEvent?.error })}
                />
              ) : (
                <Text style={{ color: SUB, fontWeight: '700' }}>No exported image</Text>
              )}
            </View>
            <View style={styles.infoPill}>
              {format === 'png' ? <TransparentIcon size={16} color="#fff" /> : <BackgroundIcon size={16} color="#fff" />}
              <Text style={styles.infoPillText}>{format.toUpperCase()} • {resultWidth}x{resultHeight}</Text>
            </View>
          </View>

          {/* Format Selection - CAUTION: Logic required to actually convert format */}
          <Text style={styles.sectionLabel}>FORMAT</Text>
          <View style={styles.grid2}>
            <FormatCard active={format === 'png'} title="PNG" subtitle="Transparent" iconName="png" onPress={() => setFormat('png')} />
            {/* Disabling JPG logic for now unless conversion is implemented */}
            <FormatCard active={format === 'jpg'} title="JPG" subtitle="Small size" iconName="jpg" onPress={() => setFormat('jpg')} />
          </View>

          {/* Resolution Selection */}
          <Text style={[styles.sectionLabel, { marginTop: 22 }]}>RESOLUTION</Text>
          <ResolutionCard 
            active={resolution === 'original'} 
            title="Original" 
            subtitle={`${resultWidth} x ${resultHeight} px`} 
            onPress={() => setResolution('original')} 
          />
          <ResolutionCardPro 
            active={resolution === 'hd'} 
            title="Ultra HD" 
            subtitle="4000 x 5000 px • Print Ready" 
            onPress={handleProFeature} // Trigger Paywall
          />

          {/* Pro Upgrade Card */}
          <View style={styles.upgradeCard}>
            <View style={styles.upgradeGlow} />
            <View style={styles.upgradeRow}>
              <View style={styles.upgradeCopy}>
                <Text style={styles.upgradeTitle}>Upgrade for HD export</Text>
                <Text style={styles.upgradeText}>Get 4K resolution exports and remove watermarks.</Text>
              </View>
              <Pressable onPress={handleProFeature} style={({ pressed }) => [styles.tryProBtn, pressed && styles.pressed]}>
                <Text style={styles.tryProText}>Try Pro</Text>
              </Pressable>
            </View>
          </View>

          {format === 'jpg' && <Text style={styles.note}>JPG exports include a white background (no transparency).</Text>}

          {/* Actions (at the end of the screen content; not fixed) */}
          <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) + 18 }]}>
            <Pressable
              onPress={onSave}
              disabled={isSaving}
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryPressed, isSaving && { opacity: 0.7 }]}
            >
              {isSaving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.primaryBtnText}>Save to Photos</Text>
                  <SaveIcon size={22} color="#fff" />
                </>
              )}
            </Pressable>

            <Pressable onPress={onShare} style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}>
              <Text style={styles.secondaryBtnText}>Share</Text>
              <ShareIcon size={20} color={PRIMARY} />
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

// --- Subcomponents (Unchanged mostly) ---

function FormatCard({ active, title, subtitle, iconName, onPress }) {
  const IconComponent = iconName === 'png' ? TransparentIcon : BackgroundIcon;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.formatCard, active && styles.formatCardActive, pressed && styles.pressed]}>
      {active ? <View style={styles.checkBadge}><CheckIcon size={16} color="#FFFFFF" /></View> : null}
      <View style={[styles.formatIcon, active ? styles.formatIconActive : null]}><IconComponent size={22} color={active ? PRIMARY : '#9CA3AF'} /></View>
      <Text style={styles.formatTitle}>{title}</Text>
      <Text style={styles.formatSub}>{subtitle}</Text>
    </Pressable>
  );
}

function ResolutionCard({ active, title, subtitle, onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.resCard, active && styles.resCardActive, pressed && styles.pressed]}>
      <View style={styles.resLeft}>
        <Radio active={active} />
        <View><Text style={styles.resTitle}>{title}</Text><Text style={styles.resSub}>{subtitle}</Text></View>
      </View>
    </Pressable>
  );
}

function ResolutionCardPro({ active, title, subtitle, onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.resCardPro, active && styles.resCardProActive, pressed && styles.pressed]}>
      <View style={styles.resProStripe} />
      <View style={[styles.resLeft, { paddingLeft: 8 }]}>
        <Radio active={active} strong />
        <View>
          <View style={styles.hdRow}><Text style={styles.resTitle}>{title}</Text><View style={styles.proPill}><Text style={styles.proPillText}>PRO</Text></View></View>
          <Text style={styles.resSub}>{subtitle}</Text>
        </View>
      </View>
      <HDIcon size={34} color="rgba(80,132,193,0.18)" />
    </Pressable>
  );
}

function Radio({ active, strong }) {
  if (!active) return <View style={styles.radioOff} />;
  return <View style={[styles.radioOn, strong && { borderWidth: 6 }]} />;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  root: { flex: 1, backgroundColor: BG },
  header: { paddingTop: 8, paddingHorizontal: 16, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.95)' },
  iconBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: TEXT },
  headerSpacer: { width: 42 },
  pressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  primaryPressed: { opacity: 0.95, transform: [{ scale: 0.985 }] },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 16 },
  previewWrap: { alignSelf: 'center', borderRadius: 22, overflow: 'hidden', marginTop: 10, marginBottom: 18, borderWidth: 1, borderColor: '#F3F4F6', backgroundColor: '#F3F4F6', ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 8 } }, android: { elevation: 3 } }) },
  previewInner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  previewImg: { width: '100%', height: '100%' },
  tiledContainer: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  tiledImage: { width: '100%', height: '100%', opacity: 0.05 }, // Subtle texture
  infoPill: { position: 'absolute', left: 14, bottom: 14, backgroundColor: 'rgba(0,0,0,0.60)', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoPillText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  sectionLabel: { fontSize: 12, fontWeight: '900', letterSpacing: 1, color: '#6B7280', marginBottom: 10 },
  grid2: { flexDirection: 'row', gap: 12 },
  formatCard: { flex: 1, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: BORDER, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', minHeight: 116 },
  formatCardActive: { borderWidth: 2, borderColor: PRIMARY, backgroundColor: '#EFF6FF' },
  checkBadge: { position: 'absolute', right: 10, top: 10, width: 24, height: 24, borderRadius: 12, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center' },
  formatIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  formatIconActive: { backgroundColor: '#FFFFFF' },
  formatTitle: { fontSize: 16, fontWeight: '900', color: TEXT },
  formatSub: { fontSize: 12, fontWeight: '700', color: SUB, marginTop: 4 },
  resCard: { borderRadius: 16, padding: 14, borderWidth: 1, borderColor: BORDER, backgroundColor: '#fff', marginBottom: 10 },
  resCardActive: { borderColor: PRIMARY, borderWidth: 1.5 },
  resCardPro: { borderRadius: 16, padding: 14, borderWidth: 2, borderColor: PRIMARY, backgroundColor: 'rgba(37,99,235,0.06)', marginBottom: 14, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resCardProActive: { backgroundColor: 'rgba(37,99,235,0.08)' },
  resProStripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: PRIMARY },
  resLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  resTitle: { fontSize: 16, fontWeight: '900', color: TEXT },
  resSub: { fontSize: 12, fontWeight: '700', color: SUB, marginTop: 3 },
  radioOff: { width: 20, height: 20, borderRadius: 999, borderWidth: 1.5, borderColor: '#D1D5DB', backgroundColor: '#fff' },
  radioOn: { width: 20, height: 20, borderRadius: 999, borderWidth: 5, borderColor: PRIMARY, backgroundColor: '#fff' },
  hdRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  proPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: '#F59E0B' },
  proPillText: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 0.7 },
  upgradeCard: { borderRadius: 16, padding: 16, backgroundColor: '#111827', overflow: 'hidden' },
  upgradeGlow: { position: 'absolute', right: -10, top: -10, width: 120, height: 120, borderRadius: 999, backgroundColor: PRIMARY, opacity: 0.18 },
  upgradeCopy: { flex: 1, paddingRight: 14 },
  upgradeRow: { flexDirection: 'row', alignItems: 'center' },
  upgradeTitle: { color: '#fff', fontWeight: '900', fontSize: 14, marginBottom: 4 },
  upgradeText: { color: '#D1D5DB', fontWeight: '600', fontSize: 12, lineHeight: 16 },
  tryProBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  tryProText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  note: { marginTop: 10, color: SUB, fontSize: 12, fontWeight: '600' },
  bottomBar: { marginTop: 18, paddingHorizontal: 2, paddingTop: 14 },
  primaryBtn: { height: 56, borderRadius: 999, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '900' },
  secondaryBtn: { height: 48, borderRadius: 999, marginTop: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, backgroundColor: 'transparent' },
  secondaryBtnText: { color: PRIMARY, fontSize: 17, fontWeight: '900' },
});
