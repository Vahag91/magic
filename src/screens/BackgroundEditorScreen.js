import * as React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../styles';
import {
  BackgroundEditorHeader,
  BackgroundPreview, // We will update this below
  ModeChip,
  TransparentControls,
  BlurControls,
  GradientControls,
  ImageControls,
  ColorPalette,
  SubjectControls,
  MODES,
  PALETTE,
} from '../components/BackgroundEditor';
const SURFACE = colors.surface;
const BG = colors.white;
export default function BackgroundEditorScreen({ navigation, route }) {
  // ✅ keep both URIs (user can swap)
  const originalUri =
    route?.params?.subjectUri ||
    route?.params?.resultUri ||
    null;

  const cutoutUri =
    route?.params?.cutoutUri ||
    null;

  const placeholder =
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBUbsmgeD4KThd1Wy62p2ajoFx3W96ViRwoL5_LhbACgKIvxSsJfRHAdfudvgL0YWpORkWt8DrIdIFDUqfcT-vTuwbuJ5bk4OZtzHAwDSx4AcLRcYvfFBpbo9S0K6n05TUNFk0FsOwDbF9rqWfWj2AyuoIyITxExdgT1kxj4n7Rzbvauym0s5-JKavmJ_ZKhYsDN3_cb38Bs0j_K0ybPm6vWCobX9HCn2YoxPZaYWvJ_UHnfNe7CK3BfClWbkmmNoinBOtt8_FsXL4d';

  const canSwapVariant = Boolean(originalUri && cutoutUri);

  // ✅ default to cutout if exists (usually what user wants after bg removal)
  const [subjectVariant, setSubjectVariant] = React.useState(cutoutUri ? 'cutout' : 'original');

  const subjectUri =
    (subjectVariant === 'cutout' ? cutoutUri : originalUri) ||
    cutoutUri ||
    originalUri ||
    placeholder;

  // Ref to call Center/Fit/Reset + getTransform
  const previewRef = React.useRef(null);

  // State
  const [isReady, setIsReady] = React.useState(false);
  const [aspectRatio, setAspectRatio] = React.useState(1);

  const [mode, setMode] = React.useState('color');
  const [showCheckerboard, setShowCheckerboard] = React.useState(true);
  const [blurStrength, setBlurStrength] = React.useState(35);
  const [dimBackground, setDimBackground] = React.useState(10);
  const [gradientAngle, setGradientAngle] = React.useState(30);
  const [gradientIntensity, setGradientIntensity] = React.useState(70);
  const [selectedColor, setSelectedColor] = React.useState(PALETTE[2]);

  // Tool for gestures
  const [subjectTool, setSubjectTool] = React.useState('move');

  // Load size for aspectRatio (used to compute contain base size)
  React.useEffect(() => {
    if (!subjectUri) return;

    let cancelled = false;

    Image.getSize(
      subjectUri,
      (width, height) => {
        if (cancelled) return;
        if (width && height) setAspectRatio(width / height);
        setIsReady(true);
      },
      () => {
        if (cancelled) return;
        setIsReady(true);
      }
    );

    return () => {
      cancelled = true;
    };
  }, [subjectUri]);

  // Handlers
  const onCompare = React.useCallback(() => {}, []);
  const onPicker = React.useCallback(() => {}, []);
  const onChoosePhoto = React.useCallback(() => {}, []);

  const onCenter = React.useCallback(() => {
    previewRef.current?.center?.();
  }, []);

  const onFit = React.useCallback(() => {
    previewRef.current?.fit?.();
  }, []);

  const onReset = React.useCallback(() => {
    previewRef.current?.reset?.();
  }, []);

  const onSave = React.useCallback(() => {
    const transform = previewRef.current?.getTransform?.() || { x: 0, y: 0, scale: 1 };

    const payload = {
      version: 1,

      subject: {
        variant: subjectVariant, // 'original' | 'cutout'
        activeUri: subjectUri,
        originalUri: originalUri || null,
        cutoutUri: cutoutUri || null,
        aspectRatio,
        transform, // {x, y, scale}
        limits: { minScale: 0.2, maxScale: 5 },
      },

      background: {
        mode,
        showCheckerboard,
        blurStrength,
        dimBackground,
        gradientAngle,
        gradientIntensity,
        selectedColor,
        // later: backgroundImageUri
      },
    };

    // ✅ Server export: send this payload to Supabase (your edge function)
    // For now: if you already pass a callback via route, use it.
    if (typeof route?.params?.onSave === 'function') {
      route.params.onSave(payload);
      return;
    }

    Alert.alert('Save payload (server export)', JSON.stringify(payload, null, 2));
  }, [
    aspectRatio,
    blurStrength,
    cutoutUri,
    dimBackground,
    gradientAngle,
    gradientIntensity,
    mode,
    originalUri,
    route?.params,
    selectedColor,
    showCheckerboard,
    subjectUri,
    subjectVariant,
  ]);

  // Background Style Calculation
  const previewBgStyle = React.useMemo(() => {
    if (mode === 'original') return { backgroundColor: '#E5E7EB' };
    if (mode === 'transparent') return { backgroundColor: 'transparent' };
    if (mode === 'blur') return { backgroundColor: '#E5E7EB' };
    if (mode === 'color') return { backgroundColor: selectedColor };
    if (mode === 'gradient') return { backgroundColor: selectedColor };
    if (mode === 'image') return { backgroundColor: '#E5E7EB' };
    return { backgroundColor: '#E5E7EB' };
  }, [mode, selectedColor]);

  // Render Controls Helper
  const renderModeControls = () => {
    switch (mode) {
      case 'transparent':
        return (
          <TransparentControls
            showCheckerboard={showCheckerboard}
            onToggleCheckerboard={setShowCheckerboard}
          />
        );
      case 'blur':
        return (
          <BlurControls
            blurStrength={blurStrength}
            dimBackground={dimBackground}
            onBlurStrengthChange={setBlurStrength}
            onDimBackgroundChange={setDimBackground}
          />
        );
      case 'gradient':
        return (
          <GradientControls
            gradientAngle={gradientAngle}
            gradientIntensity={gradientIntensity}
            onAngleChange={setGradientAngle}
            onIntensityChange={setGradientIntensity}
          />
        );
      case 'image':
        return <ImageControls onChoosePhoto={onChoosePhoto} />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.root}>
        <BackgroundEditorHeader onBack={() => navigation.goBack()} onSave={onSave} />

        <View style={styles.previewContainer}>
          <View style={styles.previewInner}>
            <BackgroundPreview
              ref={previewRef}
              subjectUri={subjectUri}
              mode={mode}
              previewBgStyle={previewBgStyle}
              aspectRatio={aspectRatio}
              showCheckerboard={showCheckerboard}
              blurStrength={blurStrength}
              dimBackground={dimBackground}
              onCompare={onCompare}
              subjectTool={subjectTool}
              minScale={0.2}
              maxScale={5}
            />

            {!isReady ? (
              <View style={styles.previewLoader} pointerEvents="none">
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.sheet}>
          <View style={styles.grabber} />

          <ScrollView
            style={styles.sheetScroll}
            contentContainerStyle={styles.sheetContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.sectionLabel}>MODE</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modeRow}>
              {MODES.map((m) => (
                <ModeChip
                  key={m.key}
                  icon={m.icon}
                  label={m.label}
                  selected={mode === m.key}
                  onPress={() => setMode(m.key)}
                />
              ))}
            </ScrollView>

            {renderModeControls()}

            <SubjectControls
              subjectTool={subjectTool}
              onToolChange={setSubjectTool}
              canSwapVariant={canSwapVariant}
              subjectVariant={subjectVariant}
              onVariantChange={(v) => {
                setSubjectVariant(v);
                previewRef.current?.reset?.();
              }}
              onCenter={onCenter}
              onFit={onFit}
              onReset={onReset}
            />

            {(mode === 'color' || mode === 'gradient') && (
              <ColorPalette
                selectedColor={selectedColor}
                onColorSelect={setSelectedColor}
                onPickerPress={onPicker}
              />
            )}

            <View style={styles.sheetSpacer} />
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: SURFACE },
  root: { flex: 1, backgroundColor: SURFACE },

  previewContainer: {
    flex: 1,
    paddingHorizontal: 15,
    paddingTop: 12,
    paddingBottom: 12,
  },
  previewInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewLoader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sheet: {
    height: 380,
    backgroundColor: BG,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, shadowOffset: { width: 0, height: -5 } },
      android: { elevation: 20 },
    }),
  },

  grabber: {
    alignSelf: 'center',
    width: 48,
    height: 5,
    borderRadius: 99,
    backgroundColor: '#E5E7EB',
    marginTop: 12,
    marginBottom: 8,
  },

  sheetScroll: { flex: 1 },
  sheetContent: { paddingHorizontal: 20, paddingBottom: 30 },

  sectionLabel: {
    fontSize: 12,
    letterSpacing: 1,
    color: '#9CA3AF',
    fontWeight: '800',
    marginTop: 10,
    marginBottom: 10,
  },

  modeRow: { paddingBottom: 6, gap: 12 },
  sheetSpacer: { height: 20 },
});