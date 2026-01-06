import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
  Image,
  Platform,
} from 'react-native';
import Slider from '@react-native-community/slider';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../styles';

const PRIMARY = colors.blue600;
const PRIMARY_DARK = colors.blue700;
const BG = '#F9FAFB';
const SURFACE = colors.white;
const TEXT = colors.text;
const SUB = colors.muted;
const BORDER = colors.border;

export default function RefineScreen({ navigation }) {
  // UI-only: later you will pass the actual cutout/background composite
  const imageUri =
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCHAUvN_Es3nbbNGGQaes_HrjeU1q1qqVphbO2ah2sl5DSwQZ11TsME8T4Ha11V_HSZyEmvG4lNZrA6cK57B_bsUK4X9b-aMhhCP5jPNnJYn6WTZfd_YFU0LrATqUKix9rGIt3G7LPkJR5GO4TBM-8v1ji_T2HQo2LHc-FK-uGb5zSwpNH3liOHMfpdSaJTHWYpi2-rvUGJnxNLi0OHbfybL9_ms4GZu3I-bDjsCS69tZCyL13Gllf5G1PQbcLcepkJIVIjkmpXVuXB';

  const [tool, setTool] = React.useState('erase'); // erase | restore
  const [size, setSize] = React.useState(45);
  const [feather, setFeather] = React.useState(12);
  const [edgeShift, setEdgeShift] = React.useState(2);

  const [showCompareHint, setShowCompareHint] = React.useState(true);
  const [isComparing, setIsComparing] = React.useState(false);

  const onSave = () => {
    // UI-only for now
    console.log('Save refine changes (later)');
  };
  const onUndo = () => console.log('Undo (later)');
  const onRedo = () => console.log('Redo (later)');

  // “Hold to compare”
  const onPressInCompare = () => {
    setIsComparing(true);
    setShowCompareHint(false);
  };
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
            <MaterialIcons name="arrow-back" size={24} color={SUB} />
          </Pressable>

          <View style={styles.undoRedoWrap}>
            <Pressable
              onPress={onUndo}
              style={({ pressed }) => [styles.undoRedoBtn, pressed && styles.pressed]}
            >
              <MaterialIcons name="undo" size={20} color={TEXT} />
            </Pressable>

            <View style={styles.divider} />

            <Pressable
              onPress={onRedo}
              style={({ pressed }) => [styles.undoRedoBtn, pressed && styles.pressed]}
            >
              <MaterialIcons name="redo" size={20} color={TEXT} />
            </Pressable>
          </View>

          <Pressable onPress={onSave} hitSlop={10}>
            <Text style={styles.saveText}>Save</Text>
          </Pressable>
        </View>

        {/* Preview */}
        <View style={styles.previewArea}>
          {/* checkerboard background */}
          <View style={styles.checkerboard} />

          <Pressable
            style={styles.previewCard}
            onPressIn={onPressInCompare}
            onPressOut={onPressOutCompare}
          >
            <Image source={{ uri: imageUri }} style={styles.previewImg} resizeMode="cover" />

            {/* red mask overlay (visual only) */}
            {!isComparing ? <View style={styles.redOverlay} pointerEvents="none" /> : null}

            {/* brush cursor ring (visual only) */}
            {!isComparing ? (
              <View
                pointerEvents="none"
                style={[
                  styles.brushRing,
                  {
                    width: Math.max(44, size * 1.2),
                    height: Math.max(44, size * 1.2),
                    borderRadius: 999,
                    top: '30%',
                    left: '62%',
                  },
                ]}
              />
            ) : null}
          </Pressable>

          {/* Hold-to-compare hint */}
          {showCompareHint && !isComparing ? (
            <View pointerEvents="none" style={styles.compareHint}>
              <MaterialIcons name="visibility" size={14} color="#fff" />
              <Text style={styles.compareHintText}>Hold to compare</Text>
            </View>
          ) : null}
        </View>

        {/* Bottom Sheet */}
        <View style={styles.sheet}>
          <View style={styles.grabber} />

          {/* Erase/Restore segmented */}
          <View style={styles.segmentWrap}>
            <Pressable
              onPress={() => setTool('erase')}
              style={({ pressed }) => [
                styles.segmentBtn,
                tool === 'erase' && styles.segmentActive,
                pressed && styles.pressed,
              ]}
            >
              <MaterialIcons
                name="cleaning-services"
                size={20}
                color={tool === 'erase' ? '#EF4444' : SUB}
              />
              <Text style={[styles.segmentText, tool === 'erase' && styles.segmentTextActive]}>
                Erase
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setTool('restore')}
              style={({ pressed }) => [
                styles.segmentBtn,
                tool === 'restore' && styles.segmentActive,
                pressed && styles.pressed,
              ]}
            >
              <MaterialIcons name="brush" size={20} color={tool === 'restore' ? TEXT : SUB} />
              <Text style={[styles.segmentText, tool === 'restore' && styles.segmentTextActive]}>
                Restore
              </Text>
            </Pressable>
          </View>

          {/* Sliders */}
          <SliderBlock
            icon="radio-button-unchecked"
            label="Size"
            value={size}
            valueText={`${Math.round(size)}`}
            min={1}
            max={100}
            onChange={setSize}
            leftIcon="circle"
            rightIcon="circle"
          />

          <SliderBlock
            icon="blur-on"
            label="Feather"
            value={feather}
            valueText={`${Math.round(feather)}`}
            min={0}
            max={100}
            onChange={setFeather}
            leftIcon="blur-off"
            rightIcon="blur-on"
          />

          <SliderBlock
            icon="hdr-strong"
            label="Edge Shift"
            value={edgeShift}
            valueText={`${edgeShift > 0 ? '+' : ''}${Math.round(edgeShift)}`}
            min={-10}
            max={10}
            onChange={(v) => setEdgeShift(Math.round(v))}
            leftIcon="fit-screen"
            rightIcon="zoom-out-map"
          />
        </View>

        {/* Bottom editor tabs (UI only) */}
        <View style={styles.bottomTabs}>
          <TabItem label="Crop" icon="crop" active={false} />
          <TabItem label="Refine" icon="tune" active />
          <TabItem label="Color" icon="palette" active={false} />
          <TabItem label="BG" icon="layers" active={false} />
        </View>
      </View>
    </SafeAreaView>
  );
}

function SliderBlock({
  icon,
  label,
  value,
  valueText,
  min,
  max,
  onChange,
  leftIcon,
  rightIcon,
}) {
  return (
    <View style={styles.sliderBlock}>
      <View style={styles.sliderHeader}>
        <View style={styles.sliderLabelRow}>
          <MaterialIcons name={icon} size={16} color={SUB} />
          <Text style={styles.sliderLabel}>{label}</Text>
        </View>
        <Text style={styles.sliderValue}>{valueText}</Text>
      </View>

      <View style={styles.sliderRow}>
        <MaterialIcons name={leftIcon} size={16} color="#9CA3AF" />
        <Slider
          style={styles.sliderNative}
          minimumValue={min}
          maximumValue={max}
          value={value}
          onValueChange={onChange}
          minimumTrackTintColor={PRIMARY}
          maximumTrackTintColor="#E5E7EB"
          thumbTintColor={PRIMARY}
        />
        <MaterialIcons name={rightIcon} size={20} color="#9CA3AF" />
      </View>
    </View>
  );
}

function TabItem({ label, icon, active }) {
  return (
    <View style={styles.tabItem}>
      <View style={[styles.tabIconWrap, active && styles.tabIconWrapActive]}>
        <MaterialIcons name={icon} size={22} color={active ? PRIMARY : '#9CA3AF'} />
      </View>
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
    backgroundColor: 'rgba(249,250,251,0.9)',
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },

  undoRedoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 4,
  },
  undoRedoBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: SURFACE,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } },
      android: { elevation: 2 },
    }),
  },
  divider: { width: 1, height: 18, backgroundColor: '#D1D5DB', marginHorizontal: 6 },

  saveText: { color: PRIMARY, fontSize: 18, fontWeight: '800', paddingHorizontal: 6 },

  previewArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  checkerboard: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.2,
    backgroundColor: '#D1D5DB',
  },
  previewCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: SURFACE,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: 16 } },
      android: { elevation: 8 },
    }),
  },
  previewImg: { width: '100%', height: 420 },

  redOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#EF4444',
    opacity: 0.15,
  },
  brushRing: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 8 },
    opacity: 0.7,
  },

  compareHint: {
    position: 'absolute',
    bottom: 28,
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
  },
  compareHintText: { color: '#fff', fontSize: 12, fontWeight: '800' },

  sheet: {
    backgroundColor: SURFACE,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 22, shadowOffset: { width: 0, height: -10 } },
      android: { elevation: 12 },
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

  segmentWrap: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 18,
    padding: 6,
    gap: 8,
    marginBottom: 14,
  },
  segmentBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  segmentActive: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  segmentText: { fontSize: 14, fontWeight: '700', color: SUB },
  segmentTextActive: { color: TEXT, fontWeight: '800' },

  sliderBlock: { marginTop: 14 },
  sliderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    marginBottom: 8,
  },
  sliderLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sliderLabel: { fontSize: 14, fontWeight: '700', color: SUB },
  sliderValue: { fontSize: 14, fontWeight: '800', color: TEXT, fontVariant: ['tabular-nums'] },

  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sliderNative: { flex: 1 },

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
  tabItem: { width: 64, alignItems: 'center', gap: 6 },
  tabIconWrap: { padding: 6, borderRadius: 10 },
  tabIconWrapActive: { backgroundColor: 'rgba(37,99,235,0.10)' },
  tabLabel: { fontSize: 10, fontWeight: '700', color: '#9CA3AF' },
  tabLabelActive: { color: PRIMARY, fontWeight: '800' },
});
