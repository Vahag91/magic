import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
  Image,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { ArrowBackIcon, TransparentIcon, BackgroundIcon, HDIcon, SaveIcon, ShareIcon, CheckIcon } from '../components/icons';
import { colors } from '../styles';

const PRIMARY = colors.brandBlue || '#2563EB';
const BG = '#FFFFFF';
const TEXT = '#111827';
const SUB = '#6B7280';
const BORDER = '#E5E7EB';

export default function ExportScreen({ navigation, route }) {
  const resultUri = route?.params?.resultUri;
  const resultWidth = route?.params?.width || 1080;
  const resultHeight = route?.params?.height || 1350;

  const aspectRatio = resultWidth / resultHeight;

  const [format, setFormat] = useState('png');
  const [resolution, setResolution] = useState('hd');
  const isHD = resolution === 'hd';

  const onSave = async () => {
    try {
      Alert.alert("Success", "Image saved to your gallery!", [
        { text: "OK", onPress: () => navigation.popToTop() }
      ]);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Could not save image.");
    }
  };

  const onShare = () => {
    Alert.alert("Share", "Opening share sheet...");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.root}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation?.goBack?.()} style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]} hitSlop={10}>
            <ArrowBackIcon size={24} color="#6B7280" />
          </Pressable>
          <Text style={styles.title}>Export</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.previewWrap, { aspectRatio }]}>
            <Checkerboard style={StyleSheet.absoluteFillObject} size={18} />
            <View style={styles.previewInner}>
              {resultUri ? (
                <Image source={{ uri: resultUri }} style={styles.previewImg} resizeMode="contain" />
              ) : (
                <Text style={{ color: SUB, fontWeight: '700' }}>No exported image</Text>
              )}
            </View>
            <View style={styles.infoPill}>
              {format === 'png' ? <TransparentIcon size={16} color="#fff" /> : <BackgroundIcon size={16} color="#fff" />}
              <Text style={styles.infoPillText}>{format.toUpperCase()} • {isHD ? "HD" : "Original"}</Text>
            </View>
          </View>

          <Text style={styles.sectionLabel}>FORMAT</Text>
          <View style={styles.grid2}>
            <FormatCard active={format === 'png'} title="PNG" subtitle="Transparent" iconName="png" onPress={() => setFormat('png')} />
            <FormatCard active={format === 'jpg'} title="JPG" subtitle="With background" iconName="jpg" onPress={() => setFormat('jpg')} />
          </View>

          <Text style={[styles.sectionLabel, { marginTop: 22 }]}>RESOLUTION</Text>
          <ResolutionCard active={resolution === 'original'} title="Original" subtitle="Matches input size" onPress={() => setResolution('original')} />
          <ResolutionCardPro active={resolution === 'hd'} title="HD" subtitle="Upscaled • Best for print" onPress={() => setResolution('hd')} />

          <View style={styles.upgradeCard}>
            <View style={styles.upgradeGlow} />
            <View style={styles.upgradeRow}>
              <View style={styles.upgradeCopy}>
                <Text style={styles.upgradeTitle}>Upgrade for HD export</Text>
                <Text style={styles.upgradeText}>Get 4K resolution exports and remove watermarks.</Text>
              </View>
              <Pressable onPress={() => Alert.alert("Upgrade", "Open Paywall")} style={({ pressed }) => [styles.tryProBtn, pressed && styles.pressed]}>
                <Text style={styles.tryProText}>Try Pro</Text>
              </Pressable>
            </View>
          </View>

          {format === 'jpg' && <Text style={styles.note}>JPG exports include a white background (no transparency).</Text>}
        </ScrollView>

        <View style={styles.bottomBar}>
          <Pressable onPress={onSave} style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryPressed]}>
            <Text style={styles.primaryBtnText}>Save to Photos</Text>
            <SaveIcon size={22} color="#fff" />
          </Pressable>
          <Pressable onPress={onShare} style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}>
            <Text style={styles.secondaryBtnText}>Share</Text>
            <ShareIcon size={20} color={PRIMARY} />
          </Pressable>
          <View style={styles.homeIndicator} />
        </View>
      </View>
    </SafeAreaView>
  );
}

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

function Checkerboard({ style, size = 18 }) {
  const cols = 20; const rows = 30; const squares = []; const squareBase = { width: size, height: size };
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const isDark = (r + c) % 2 === 0;
      squares.push(<View key={`${r}-${c}`} style={[styles.checkSquare, squareBase, isDark ? styles.checkSquareDark : styles.checkSquareLight]} />);
    }
  }
  return <View style={[styles.checkerContainer, style]}>{squares}</View>;
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
  scrollContent: { paddingHorizontal: 18, paddingBottom: 190 },
  previewWrap: { width: '100%', borderRadius: 22, overflow: 'hidden', marginTop: 10, marginBottom: 18, borderWidth: 1, borderColor: '#F3F4F6', backgroundColor: '#F3F4F6', ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 8 } }, android: { elevation: 3 } }) },
  previewInner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  previewImg: { width: '100%', height: '100%' },
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
  bottomBar: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 18, backgroundColor: 'rgba(255,255,255,0.92)', borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  primaryBtn: { height: 56, borderRadius: 999, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '900' },
  secondaryBtn: { height: 48, borderRadius: 999, marginTop: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, backgroundColor: 'transparent' },
  secondaryBtnText: { color: PRIMARY, fontSize: 17, fontWeight: '900' },
  homeIndicator: { alignSelf: 'center', marginTop: 10, width: 120, height: 4, borderRadius: 999, backgroundColor: '#E5E7EB' },
  checkerContainer: { flexDirection: 'row', flexWrap: 'wrap' },
  checkSquare: {},
  checkSquareDark: { backgroundColor: '#E5E7EB' },
  checkSquareLight: { backgroundColor: '#F3F4F6' },
});