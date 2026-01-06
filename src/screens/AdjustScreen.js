import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
  Image,
  Platform,
  Switch,
} from 'react-native';
import Slider from '@react-native-community/slider';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../styles';

const PRIMARY = colors.blue500;
const PRIMARY_DARK = colors.blue600;
const BG = '#F9FAFB';
const SURFACE = colors.white;
const TEXT = colors.text;
const SUB = colors.muted;
const BORDER = colors.border;

export default function AdjustScreen({ navigation }) {
  const imageUri =
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBRlAiXEeHDUAcuST8FKZ6M-5q8stTc9bkydtzhqpFq7iU8VbgxA20Jepjk664CfB3GYIj9BcaChOKs-wniuBhUDI_5XicDmqe4yqT5N-2YqHBrEs7ecwN_49YhI0IIXer7XKQa7S35Ov467owBvNoMfv_-VWWG8Z1ODIIC8ips3-vERMKjj-CdLUjDYJ0DNBnrApo9baZRlIn2qFdXdn5Jztzr6XXAkNUdFuZgoI3ouv7dkF-5JYiRQ0dA4DivYJWDJrwwntvlF7TY';

  // Drop shadow controls
  const [shadowEnabled, setShadowEnabled] = React.useState(true);
  const [shadowIntensity, setShadowIntensity] = React.useState(45); // %
  const [shadowSoftness, setShadowSoftness] = React.useState(20); // %

  // Subject refinement (UI values)
  const [brightness, setBrightness] = React.useState(10); // -50..+50
  const [contrast, setContrast] = React.useState(0); // -50..+50
  const [warmth, setWarmth] = React.useState(15); // -50..+50

  const [isComparing, setIsComparing] = React.useState(false);

  const onDone = () => {
    // UI-only for now
    console.log('Done adjust (later)');
  };

  const onPressInCompare = () => setIsComparing(true);
  const onPressOutCompare = () => setIsComparing(false);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.root}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => navigation?.goBack?.()}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
            hitSlop={10}
          >
            <MaterialIcons name="arrow-back" size={24} color={TEXT} />
          </Pressable>

          <Text style={styles.title}>Adjust</Text>

          <Pressable onPress={onDone} hitSlop={10}>
            <Text style={styles.done}>Done</Text>
          </Pressable>
        </View>

        {/* Preview */}
        <View style={styles.previewArea}>
          {/* subtle dotted background */}
          <View style={styles.dotsBg} />

          <View style={styles.previewCard}>
            <Image source={{ uri: imageUri }} style={styles.previewImg} resizeMode="cover" />

            {/* Fake shadow blob (UI only) */}
            {shadowEnabled ? (
              <View
                pointerEvents="none"
                style={[
                  styles.shadowBlob,
                  {
                    opacity: 0.12 + shadowIntensity / 500, // maps ~0.12..0.32
                    transform: [{ scaleY: 0.45 + shadowSoftness / 250 }], // maps ~0.45..0.85
                  },
                ]}
              />
            ) : null}
          </View>

          {/* Compare button (press & hold) */}
          <Pressable
            onPressIn={onPressInCompare}
            onPressOut={onPressOutCompare}
            style={({ pressed }) => [styles.compareBtn, pressed && styles.pressed]}
          >
            <MaterialIcons name="compare" size={22} color={SUB} />
          </Pressable>

          {/* Optional: small state debug for compare */}
          {isComparing ? (
            <View pointerEvents="none" style={styles.comparePill}>
              <MaterialIcons name="visibility" size={14} color="#fff" />
              <Text style={styles.comparePillText}>Comparing</Text>
            </View>
          ) : null}
        </View>

        {/* Bottom Sheet */}
        <View style={styles.sheet}>
          <View style={styles.grabber} />

          {/* Drop Shadow row */}
          <View style={styles.sectionRow}>
            <View style={styles.sectionLeft}>
              <MaterialIcons name="blur-on" size={18} color={PRIMARY} style={styles.tipIcon} />
              <Text style={styles.sectionTitle}>Drop Shadow</Text>
            </View>

            <Switch
              value={shadowEnabled}
              onValueChange={setShadowEnabled}
              trackColor={{ false: '#D1D5DB', true: PRIMARY }}
              thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
            />
          </View>

          <View style={[styles.subBlock, !shadowEnabled && { opacity: 0.45 }]}>
            <PercentSlider
              label="Intensity"
              value={shadowIntensity}
              onChange={setShadowIntensity}
              disabled={!shadowEnabled}
            />
            <PercentSlider
              label="Softness"
              value={shadowSoftness}
              onChange={setShadowSoftness}
              disabled={!shadowEnabled}
            />
          </View>

          <View style={styles.hr} />

          {/* Subject Refinement */}
          <Text style={styles.sectionLabel}>SUBJECT REFINEMENT</Text>

          <SignedSlider
            icon="wb-sunny"
            label="Brightness"
            value={brightness}
            onChange={setBrightness}
          />
          <SignedSlider icon="contrast" label="Contrast" value={contrast} onChange={setContrast} />
          <SignedSlider icon="thermostat" label="Warmth" value={warmth} onChange={setWarmth} />

          {/* Pro Tip */}
          <View style={styles.tip}>
            <MaterialIcons name="tips-and-updates" size={20} color={PRIMARY} style={styles.tipIcon} />
            <View style={styles.tipCopy}>
              <Text style={styles.tipTitle}>Pro Tip</Text>
              <Text style={styles.tipText}>
                Matching the subject&apos;s brightness to the new background creates a more realistic blend.
              </Text>
            </View>
          </View>
        </View>

        {/* Bottom editor tabs */}
        <View style={styles.bottomTabs}>
          <TabItem label="Background" icon="wallpaper" active={false} />
          <TabItem label="Refine" icon="brush" active={false} />
          <TabItem label="Adjust" icon="tune" active />
          <TabItem label="Export" icon="ios-share" active={false} />
        </View>
      </View>
    </SafeAreaView>
  );
}

function PercentSlider({ label, value, onChange, disabled }) {
  return (
    <View style={styles.sliderBlock}>
      <View style={styles.sliderHeader}>
        <Text style={styles.sliderLabel}>{label}</Text>
        <Text style={styles.sliderValue}>{Math.round(value)}%</Text>
      </View>

      <View style={styles.sliderRow}>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${value}%` }]} />
        </View>

        <Slider
          style={styles.sliderNative}
          minimumValue={0}
          maximumValue={100}
          value={value}
          onValueChange={onChange}
          disabled={disabled}
          minimumTrackTintColor="transparent"
          maximumTrackTintColor="transparent"
          thumbTintColor="#FFFFFF"
        />

        {/* visual thumb */}
        <View style={[styles.thumb, { left: `${value}%` }]} pointerEvents="none" />
      </View>
    </View>
  );
}

// signed slider centered at 0, range [-50..+50]
function SignedSlider({ icon, label, value, onChange }) {
  const min = -50;
  const max = 50;
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <View style={styles.sliderBlock}>
      <View style={styles.sliderHeader}>
        <View style={styles.signedLabelRow}>
          <MaterialIcons name={icon} size={18} color={SUB} />
          <Text style={styles.signedLabel}>{label}</Text>
        </View>
        <Text style={styles.signedValue}>
          {value > 0 ? `+${Math.round(value)}` : `${Math.round(value)}`}
        </Text>
      </View>

      <View style={styles.sliderRow}>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${pct}%` }]} />
        </View>

        <Slider
          style={styles.sliderNative}
          minimumValue={min}
          maximumValue={max}
          value={value}
          onValueChange={onChange}
          minimumTrackTintColor="transparent"
          maximumTrackTintColor="transparent"
          thumbTintColor="#FFFFFF"
        />

        <View style={[styles.thumb, { left: `${pct}%` }]} pointerEvents="none" />
      </View>
    </View>
  );
}

function TabItem({ label, icon, active }) {
  return (
    <View style={styles.tabItem}>
      <MaterialIcons name={icon} size={22} color={active ? PRIMARY : '#9CA3AF'} />
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  root: { flex: 1, backgroundColor: BG },

  header: {
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 18, fontWeight: '800', color: TEXT },
  done: { fontSize: 13, fontWeight: '800', color: PRIMARY },

  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },

  previewArea: {
    flex: 1,
    paddingHorizontal: 18,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsBg: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.12,
    backgroundColor: BG,
  },
  previewCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: SURFACE,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 18, shadowOffset: { width: 0, height: 12 } },
      android: { elevation: 6 },
    }),
  },
  previewImg: { width: '100%', height: 420 },

  shadowBlob: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    height: 56,
    borderRadius: 999,
    backgroundColor: '#000',
    filter: undefined,
  },

  compareBtn: {
    position: 'absolute',
    right: 22,
    bottom: 26,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 8 } },
      android: { elevation: 8 },
    }),
  },

  comparePill: {
    position: 'absolute',
    bottom: 26,
    left: 22,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.60)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  comparePillText: { color: '#fff', fontWeight: '800', fontSize: 12 },

  sheet: {
    backgroundColor: SURFACE,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 20, shadowOffset: { width: 0, height: -10 } },
      android: { elevation: 10 },
    }),
  },
  grabber: {
    alignSelf: 'center',
    width: 52,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    marginTop: 6,
    marginBottom: 14,
  },

  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: TEXT },
  tipIcon: { marginTop: 2 },

  subBlock: { marginTop: 10, marginBottom: 6 },

  hr: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 12 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    color: '#9CA3AF',
    marginBottom: 8,
  },

  sliderBlock: { marginTop: 10 },
  sliderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sliderLabel: { fontSize: 12, fontWeight: '800', color: SUB },
  sliderValue: { fontSize: 12, fontWeight: '900', color: SUB },

  signedLabel: { fontSize: 14, fontWeight: '800', color: TEXT },
  signedLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  signedValue: { fontSize: 13, fontWeight: '900', color: SUB },

  sliderRow: {
    height: 28,
    justifyContent: 'center',
  },
  track: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  fill: {
    height: 4,
    backgroundColor: PRIMARY,
  },
  sliderNative: {
    width: '100%',
    height: 28,
    opacity: 0.02, // invisible native slider, we draw our own track/thumb
  },
  thumb: {
    position: 'absolute',
    top: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    transform: [{ translateX: -12 }],
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } },
      android: { elevation: 4 },
    }),
  },

  tip: {
    marginTop: 14,
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    gap: 10,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  tipTitle: { fontSize: 14, fontWeight: '900', color: PRIMARY, marginBottom: 2 },
  tipText: { fontSize: 12, color: SUB, lineHeight: 16, fontWeight: '600' },
  tipCopy: { flex: 1 },

  bottomTabs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 18,
    backgroundColor: SURFACE,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  tabItem: { width: 70, alignItems: 'center', gap: 6 },
  tabLabel: { fontSize: 10, fontWeight: '700', color: '#9CA3AF' },
  tabLabelActive: { color: PRIMARY, fontWeight: '900' },
});
