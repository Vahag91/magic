import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  PanResponder,
  TextInput,
  Image,
  Keyboard,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import i18n from '../../localization/i18n';

// --- Icons (Placeholders for your existing icon imports) ---
import BlurIcon from '../../components/icons/BlurIcon';
import GradientIcon from '../../components/icons/GradientIcon';
import ImageIcon from '../../components/icons/ImageIcon';
import PaletteIcon from '../../components/icons/PaletteIcon';
import TransparentIcon from '../../components/icons/TransparentIcon';

import { PALETTE, MODES, Icon, PREDEFINED_BACKGROUNDS } from './constants';
import CustomSlider from './CustomSlider';
import { styles, SHEET_MIN_HEIGHT, SHEET_MAX_HEIGHT } from './styles';
import ColorPicker, {
  HueSlider,
  Panel1,
  Preview,
  Swatches,
} from 'reanimated-color-picker';

const EditorSheet = props => {
  const insets = useSafeAreaInsets();
  const [activeSubTab, setActiveSubTab] = useState('main');
  const [gradientStop, setGradientStop] = useState('start'); // start | end
  const [textEditY, setTextEditY] = useState(null);
  const scrollRef = useRef(null);
  const pendingTextScrollRef = useRef(false);
  const sheetHeight = useRef(new Animated.Value(SHEET_MIN_HEIGHT)).current;
  const lastHeight = useRef(SHEET_MIN_HEIGHT);
  const sheetTranslateY = useRef(new Animated.Value(0)).current;
  const textInputRef = useRef(null);

  useEffect(() => {
    if (!props.textFocusToken) return;
    if (props.activeLayer !== 'text') return;
    if (!props.selectedTextId) return;
    const id = requestAnimationFrame(() => textInputRef.current?.focus?.());
    pendingTextScrollRef.current = true;
    if (typeof textEditY === 'number') {
      scrollRef.current?.scrollTo?.({
        y: Math.max(0, textEditY - 12),
        animated: true,
      });
      pendingTextScrollRef.current = false;
    }
    return () => cancelAnimationFrame(id);
  }, [
    props.activeLayer,
    props.selectedTextId,
    props.textFocusToken,
    textEditY,
  ]);

  useEffect(() => {
    if (!pendingTextScrollRef.current) return;
    if (typeof textEditY !== 'number') return;
    scrollRef.current?.scrollTo?.({
      y: Math.max(0, textEditY - 12),
      animated: true,
    });
    pendingTextScrollRef.current = false;
  }, [textEditY]);

  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, e => {
      const h = Number(e?.endCoordinates?.height) || 0;
      const offset = Math.max(0, h - (insets?.bottom || 0));
      Animated.timing(sheetTranslateY, {
        toValue: -offset,
        duration: Number(e?.duration) || 220,
        useNativeDriver: true,
      }).start();
    });

    const hideSub = Keyboard.addListener(hideEvent, e => {
      Animated.timing(sheetTranslateY, {
        toValue: 0,
        duration: Number(e?.duration) || 200,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      showSub?.remove?.();
      hideSub?.remove?.();
    };
  }, [insets?.bottom, sheetTranslateY]);

  const openSubTab = tab => {
    Keyboard.dismiss();
    setActiveSubTab(tab);
  };

  const activeGradientColor = useMemo(() => {
    if (gradientStop === 'end') return props.gradientEndColor;
    return props.gradientStartColor;
  }, [gradientStop, props.gradientEndColor, props.gradientStartColor]);

  const setActiveGradientColor = hex => {
    if (gradientStop === 'end') props.setGradientEndColor(hex);
    else props.setGradientStartColor(hex);
  };

  const formatNumber = value => Math.round(Number(value) || 0);

  const renderModeIcon = (key, active) => {
    const color = active ? '#3b82f6' : '#6B7280';
    const size = 20;
    switch (key) {
      case 'clear':
        return <TransparentIcon size={size} color={color} />;
      case 'color':
        return <PaletteIcon size={size} color={color} />;
      case 'blur':
        return <BlurIcon size={size} color={color} />;
      case 'gradient':
        return <GradientIcon size={size} color={color} />;
      case 'image':
        return <ImageIcon size={size} color={color} />;
      default:
        return <Icon name={MODES.find(x => x.key === key)?.icon} />;
    }
  };

  const sheetResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => Keyboard.dismiss(),
      onPanResponderMove: (_, gestureState) => {
        let newHeight = lastHeight.current - gestureState.dy;
        if (newHeight < SHEET_MIN_HEIGHT) newHeight = SHEET_MIN_HEIGHT;
        if (newHeight > SHEET_MAX_HEIGHT) newHeight = SHEET_MAX_HEIGHT;
        sheetHeight.setValue(newHeight);
      },
      onPanResponderRelease: (_, gestureState) => {
        const currentH = lastHeight.current - gestureState.dy;
        let target = SHEET_MIN_HEIGHT;
        if (
          currentH > (SHEET_MAX_HEIGHT + SHEET_MIN_HEIGHT) / 2 ||
          gestureState.vy < -0.5
        )
          target = SHEET_MAX_HEIGHT;
        Animated.spring(sheetHeight, {
          toValue: target,
          useNativeDriver: false,
          bounciness: 4,
        }).start(() => {
          lastHeight.current = target;
        });
      },
    }),
  ).current;

  const layerLabel = l => {
    if (l === 'subject') return i18n.t('backgroundEditor.sheet.layerSubject');
    if (l === 'background')
      return i18n.t('backgroundEditor.sheet.layerBackground');
    if (l === 'text') return i18n.t('backgroundEditor.sheet.layerText');
    return l;
  };

  const toolLabel = t => {
    if (t === 'move')
      return i18n.t('backgroundEditor.sheet.toolMove').toUpperCase();
    if (t === 'scale')
      return i18n.t('backgroundEditor.sheet.toolScale').toUpperCase();
    if (t === 'erase')
      return i18n.t('backgroundEditor.sheet.toolErase').toUpperCase();
    return String(t || '').toUpperCase();
  };

  return (
    <Animated.View
      style={[styles.sheet, { transform: [{ translateY: sheetTranslateY }] }]}
    >
      <Animated.View style={{ height: sheetHeight }}>
        <View {...sheetResponder.panHandlers} style={styles.grabberArea}>
          <View style={styles.grabber} />
        </View>

        <View style={styles.sheetPadding}>
          <View style={styles.tabRow}>
            {['subject', 'background', 'text'].map(l => (
              <TouchableOpacity
                key={l}
                onPress={() => {
                  Keyboard.dismiss();
                  props.setActiveLayer(l);
                  setActiveSubTab('main');
                }}
                style={[
                  styles.tabBtn,
                  props.activeLayer === l && styles.tabBtnActive,
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    props.activeLayer === l && styles.tabTextActive,
                  ]}
                >
                  {layerLabel(l)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            styles.sheetContent,
            { paddingBottom: 50 + (insets?.bottom || 0) },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === 'ios' ? 'interactive' : 'on-drag'
          }
          onScrollBeginDrag={() => Keyboard.dismiss()}
        >
          <View style={styles.subTabRow}>
            <TouchableOpacity
              onPress={() => openSubTab('main')}
              style={[
                styles.pillBtn,
                activeSubTab === 'main'
                  ? styles.pillBtnActive
                  : styles.pillBtnInactive,
              ]}
            >
              <Text
                style={
                  activeSubTab === 'main'
                    ? styles.pillTextActive
                    : styles.pillTextInactive
                }
              >
                {i18n.t('backgroundEditor.sheet.tabMain')}
              </Text>
            </TouchableOpacity>

            {props.activeLayer !== 'text' && (
              <TouchableOpacity
                onPress={() => openSubTab('adjust')}
                style={[
                  styles.pillBtn,
                  activeSubTab === 'adjust'
                    ? styles.pillBtnActive
                    : styles.pillBtnInactive,
                ]}
              >
                <Text
                  style={
                    activeSubTab === 'adjust'
                      ? styles.pillTextActive
                      : styles.pillTextInactive
                  }
                >
                  {i18n.t('backgroundEditor.sheet.tabAdjust')}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => openSubTab('shadow')}
              style={[
                styles.pillBtn,
                activeSubTab === 'shadow'
                  ? styles.pillBtnActive
                  : styles.pillBtnInactive,
              ]}
            >
              <Text
                style={
                  activeSubTab === 'shadow'
                    ? styles.pillTextActive
                    : styles.pillTextInactive
                }
              >
                {i18n.t('backgroundEditor.sheet.tabShadow')}
              </Text>
            </TouchableOpacity>
          </View>

          {activeSubTab === 'adjust' && (
            <View>
              <Text style={styles.sectionTitle}>
                {i18n.t('backgroundEditor.sheet.filtersTitle')}
              </Text>

              <View style={styles.sliderContainer}>
                <Text style={styles.label}>
                  {i18n.t('backgroundEditor.sheet.brightnessLabel', {
                    value: formatNumber(props.filters.brightness),
                  })}
                </Text>
                <CustomSlider
                  min={0}
                  max={200}
                  value={props.filters.brightness}
                  onValueChange={val =>
                    props.setFilters(prev => ({ ...prev, brightness: val }))
                  }
                />
              </View>

              <View style={styles.sliderContainer}>
                <Text style={styles.label}>
                  {i18n.t('backgroundEditor.sheet.contrastLabel', {
                    value: formatNumber(props.filters.contrast),
                  })}
                </Text>
                <CustomSlider
                  min={0}
                  max={200}
                  value={props.filters.contrast}
                  onValueChange={val =>
                    props.setFilters(prev => ({ ...prev, contrast: val }))
                  }
                />
              </View>

              <View style={styles.sliderContainer}>
                <Text style={styles.label}>
                  {i18n.t('backgroundEditor.sheet.saturationLabel', {
                    value: formatNumber(props.filters.saturation),
                  })}
                </Text>
                <CustomSlider
                  min={0}
                  max={200}
                  value={props.filters.saturation}
                  onValueChange={val =>
                    props.setFilters(prev => ({ ...prev, saturation: val }))
                  }
                />
              </View>
            </View>
          )}

          {activeSubTab === 'shadow' && (
            <View>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 10,
                }}
              >
                <Text style={styles.sectionTitle}>
                  {i18n.t('backgroundEditor.sheet.dropShadowTitle')}
                </Text>

                <TouchableOpacity
                  onPress={() =>
                    props.setShadow(s => ({ ...s, enabled: !s.enabled }))
                  }
                  style={[
                    styles.pillBtn,
                    props.shadow.enabled
                      ? styles.pillBtnActive
                      : styles.pillBtnInactive,
                  ]}
                >
                  <Text
                    style={
                      props.shadow.enabled
                        ? styles.pillTextActive
                        : styles.pillTextInactive
                    }
                  >
                    {props.shadow.enabled
                      ? i18n.t('common.on')
                      : i18n.t('common.off')}
                  </Text>
                </TouchableOpacity>
              </View>

              {props.shadow.enabled && (
                <>
                  <View style={styles.sliderContainer}>
                    <Text style={styles.label}>
                      {i18n.t('backgroundEditor.sheet.shadowBlurLabel', {
                        value: formatNumber(props.shadow.blur),
                      })}
                    </Text>
                    <CustomSlider
                      min={0}
                      max={50}
                      value={props.shadow.blur}
                      onValueChange={v =>
                        props.setShadow(s => ({ ...s, blur: v }))
                      }
                    />
                  </View>

                  <View style={styles.sliderContainer}>
                    <Text style={styles.label}>
                      {i18n.t('backgroundEditor.sheet.shadowOpacityLabel', {
                        value: formatNumber(props.shadow.opacity),
                      })}
                    </Text>
                    <CustomSlider
                      min={0}
                      max={100}
                      value={props.shadow.opacity}
                      onValueChange={v =>
                        props.setShadow(s => ({ ...s, opacity: v }))
                      }
                    />
                  </View>

                  <View style={styles.sliderContainer}>
                    <Text style={styles.label}>
                      {i18n.t('backgroundEditor.sheet.shadowDistanceLabel', {
                        value: formatNumber(props.shadow.x),
                      })}
                    </Text>
                    <CustomSlider
                      min={-50}
                      max={50}
                      value={props.shadow.x}
                      onValueChange={v =>
                        props.setShadow(s => ({ ...s, x: v, y: v }))
                      }
                    />
                  </View>
                </>
              )}
            </View>
          )}

          {activeSubTab === 'main' && (
            <>
              {props.activeLayer === 'background' && (
                <View>
                  <Text style={styles.sectionTitle}>
                    {i18n.t('backgroundEditor.sheet.modeTitle')}
                  </Text>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.modeScroll}
                  >
                    {MODES.map(m => (
                      <TouchableOpacity
                        key={m.key}
                        onPress={() => props.setMode(m.key)}
                        style={styles.modeItem}
                      >
                        <View
                          style={[
                            styles.modeIcon,
                            props.mode === m.key && styles.modeIconActive,
                          ]}
                        >
                          {renderModeIcon(m.key, props.mode === m.key)}
                        </View>
                        {/* If MODES labels are static in constants, better to localize there too.
                            For now we map common keys; fallback to m.label. */}
                        <Text
                          style={[
                            styles.modeLabel,
                            props.mode === m.key && styles.modeLabelActive,
                          ]}
                        >
                          {i18n.t(`backgroundEditor.modes.${m.key}`, {
                            defaultValue: m.label,
                          })}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {props.mode === 'clear' && (
                    <View style={styles.optionRow}>
                      <Text style={styles.optionLabel}>
                        {i18n.t('backgroundEditor.sheet.checkerboard')}
                      </Text>
                      <TouchableOpacity
                        onPress={() =>
                          props.setShowCheckerboard(!props.showCheckerboard)
                        }
                        style={[
                          styles.pillBtn,
                          props.showCheckerboard
                            ? styles.pillBtnActive
                            : styles.pillBtnInactive,
                        ]}
                      >
                        <Text
                          style={
                            props.showCheckerboard
                              ? styles.pillTextActive
                              : styles.pillTextInactive
                          }
                        >
                          {props.showCheckerboard
                            ? i18n.t('common.on')
                            : i18n.t('common.off')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {props.mode === 'color' && (
                    <View style={styles.colorPickerWrap}>
                      <ColorPicker
                        value={props.selectedColor}
                        onChangeJS={({ hex }) => props.setSelectedColor(hex)}
                        style={styles.colorPicker}
                      >
                        <Preview
                          style={styles.colorPickerPreview}
                          hideInitialColor
                        />
                        <Panel1 style={styles.colorPickerPanel} />
                        <HueSlider style={styles.colorPickerSlider} />
                        <Swatches
                          colors={PALETTE}
                          style={styles.colorPickerSwatches}
                        />
                      </ColorPicker>
                    </View>
                  )}

                  {props.mode === 'gradient' && (
                    <View style={styles.gradientWrap}>
                      <Text style={styles.label}>
                        {i18n.t('backgroundEditor.sheet.gradientColors')}
                      </Text>

                      <View style={styles.gradientStopsRow}>
                        <TouchableOpacity
                          onPress={() => setGradientStop('start')}
                          style={[
                            styles.gradientStopBtn,
                            gradientStop === 'start' &&
                              styles.gradientStopBtnActive,
                          ]}
                        >
                          <View
                            style={[
                              styles.gradientStopSwatch,
                              { backgroundColor: props.gradientStartColor },
                            ]}
                          />
                          <Text
                            style={[
                              styles.gradientStopText,
                              gradientStop === 'start' &&
                                styles.gradientStopTextActive,
                            ]}
                          >
                            {i18n.t('backgroundEditor.sheet.gradientStart')}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => setGradientStop('end')}
                          style={[
                            styles.gradientStopBtn,
                            gradientStop === 'end' &&
                              styles.gradientStopBtnActive,
                          ]}
                        >
                          <View
                            style={[
                              styles.gradientStopSwatch,
                              { backgroundColor: props.gradientEndColor },
                            ]}
                          />
                          <Text
                            style={[
                              styles.gradientStopText,
                              gradientStop === 'end' &&
                                styles.gradientStopTextActive,
                            ]}
                          >
                            {i18n.t('backgroundEditor.sheet.gradientEnd')}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <View style={styles.colorPickerWrap}>
                        <ColorPicker
                          value={activeGradientColor}
                          onChangeJS={({ hex }) => setActiveGradientColor(hex)}
                          style={styles.colorPicker}
                        >
                          <Preview
                            style={styles.colorPickerPreview}
                            hideInitialColor
                          />
                          <Panel1 style={styles.colorPickerPanel} />
                          <HueSlider style={styles.colorPickerSlider} />
                          <Swatches
                            colors={PALETTE}
                            style={styles.colorPickerSwatches}
                          />
                        </ColorPicker>
                      </View>

                      <Text style={styles.label}>
                        {i18n.t('backgroundEditor.sheet.angle')}
                      </Text>
                      <CustomSlider
                        min={0}
                        max={360}
                        value={props.gradientAngle}
                        onValueChange={props.setGradientAngle}
                      />

                      <Text style={styles.label}>
                        {i18n.t('backgroundEditor.sheet.intensity')}
                      </Text>
                      <CustomSlider
                        min={0}
                        max={100}
                        value={props.gradientIntensity}
                        onValueChange={props.setGradientIntensity}
                      />
                    </View>
                  )}

                  {props.mode === 'blur' && (
                    <View>
                      <Text style={styles.label}>
                        {i18n.t('backgroundEditor.sheet.blurStrength')}
                      </Text>
                      <CustomSlider
                        value={props.blurStrength}
                        onValueChange={props.setBlurStrength}
                      />

                      <Text style={styles.label}>
                        {i18n.t('backgroundEditor.sheet.dimBackground')}
                      </Text>
                      <CustomSlider
                        value={props.dimBackground}
                        onValueChange={props.setDimBackground}
                      />
                    </View>
                  )}

                  {props.mode === 'image' && (
                    <View>
                      <TouchableOpacity
                        onPress={props.onPickImage}
                        style={styles.actionBtn}
                      >
                        <Text>
                          {i18n.t('backgroundEditorScreen.pickFromLibrary')}
                        </Text>
                      </TouchableOpacity>

                      <Text style={styles.label}>
                        {i18n.t('backgroundEditor.sheet.predefined')}
                      </Text>

                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={{ marginVertical: 10 }}
                      >
                        {PREDEFINED_BACKGROUNDS.map(uri => (
                          <TouchableOpacity
                            key={uri}
                            onPress={() => {
                              props.setBgImageUri(uri);
                              props.setBgTransform({ x: 0, y: 0, scale: 1 });
                            }}
                            style={{ marginRight: 10 }}
                          >
                            <Image
                              source={{ uri }}
                              style={{ width: 60, height: 80, borderRadius: 8 }}
                            />
                          </TouchableOpacity>
                        ))}
                      </ScrollView>

                      <Text style={styles.label}>
                        {i18n.t('backgroundEditor.sheet.opacity')}
                      </Text>
                      <CustomSlider
                        value={props.bgOpacity}
                        onValueChange={props.setBgOpacity}
                      />

                      <Text style={styles.label}>
                        {i18n.t('backgroundEditor.sheet.tools')}
                      </Text>
                      <View style={styles.bgToolsRow}>
                        <TouchableOpacity
                          onPress={() => props.setBgTool('move')}
                          style={[
                            styles.toolBtn,
                            props.bgTool === 'move' && styles.toolBtnActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.toolText,
                              props.bgTool === 'move' && styles.toolTextActive,
                            ]}
                          >
                            {i18n.t('backgroundEditor.sheet.toolMove')}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => props.setBgTool('scale')}
                          style={[
                            styles.toolBtn,
                            props.bgTool === 'scale' && styles.toolBtnActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.toolText,
                              props.bgTool === 'scale' && styles.toolTextActive,
                            ]}
                          >
                            {i18n.t('backgroundEditor.sheet.toolScale')}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {props.bgTool === 'scale' && (
                        <CustomSlider
                          min={20}
                          max={300}
                          value={props.bgTransform.scale * 100}
                          onValueChange={v =>
                            props.setBgTransform({
                              ...props.bgTransform,
                              scale: v / 100,
                            })
                          }
                        />
                      )}
                    </View>
                  )}
                </View>
              )}

              {props.activeLayer === 'subject' && (
                <View>
                  {props.hasCutout && props.hasOriginal && (
                    <View style={styles.subjectVariantWrap}>
                      <Text style={styles.label}>
                        {i18n.t('backgroundEditor.sheet.subject')}
                      </Text>
                      <View style={styles.subjectVariantRow}>
                        <TouchableOpacity
                          onPress={() => props.setSubjectVariant('cutout')}
                          style={[
                            styles.pillBtn,
                            props.subjectVariant === 'cutout'
                              ? styles.pillBtnActive
                              : styles.pillBtnInactive,
                          ]}
                        >
                          <Text
                            style={
                              props.subjectVariant === 'cutout'
                                ? styles.pillTextActive
                                : styles.pillTextInactive
                            }
                          >
                            {i18n.t('backgroundEditor.sheet.cutout')}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => props.setSubjectVariant('original')}
                          style={[
                            styles.pillBtn,
                            props.subjectVariant === 'original'
                              ? styles.pillBtnActive
                              : styles.pillBtnInactive,
                          ]}
                        >
                          <Text
                            style={
                              props.subjectVariant === 'original'
                                ? styles.pillTextActive
                                : styles.pillTextInactive
                            }
                          >
                            {i18n.t('backgroundEditor.sheet.original')}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  <View style={styles.subjectToolsRow}>
                    {['move', 'scale', 'erase'].map(t => (
                      <TouchableOpacity
                        key={t}
                        onPress={() => props.setSubjectTool(t)}
                        style={[
                          styles.toolTab,
                          props.subjectTool === t && styles.toolTabActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.subjectToolText,
                            props.subjectTool === t
                              ? styles.subjectToolTextActive
                              : styles.subjectToolTextInactive,
                          ]}
                        >
                          {toolLabel(t)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {props.subjectTool === 'scale' && (
                    <View>
                      <Text style={styles.label}>
                        {i18n.t('backgroundEditor.sheet.scaleSubject')}
                      </Text>
                      <CustomSlider
                        min={20}
                        max={300}
                        value={props.subjectTransform.scale * 100}
                        onValueChange={v =>
                          props.setSubjectTransform({
                            ...props.subjectTransform,
                            scale: v / 100,
                          })
                        }
                      />
                    </View>
                  )}

                  {props.subjectTool === 'erase' && (
                    <View>
                      <Text style={styles.label}>
                        {i18n.t('backgroundEditor.sheet.eraserSizeLabel', {
                          value: formatNumber(props.brushSettings.size),
                        })}
                      </Text>
                      <CustomSlider
                        min={5}
                        max={80}
                        value={props.brushSettings.size}
                        onValueChange={v =>
                          props.setBrushSettings({
                            ...props.brushSettings,
                            size: v,
                          })
                        }
                      />
                    </View>
                  )}

                  <View style={styles.centerResetRow}>
                    <TouchableOpacity
                      onPress={() =>
                        props.setSubjectTransform(prev => ({
                          ...prev,
                          x: 0,
                          y: 0,
                        }))
                      }
                      style={styles.actionBtn}
                    >
                      <Text>{i18n.t('backgroundEditorScreen.center')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() =>
                        props.setSubjectTransform({ x: 0, y: 0, scale: 1 })
                      }
                      style={styles.actionBtn}
                    >
                      <Text>{i18n.t('backgroundEditorScreen.reset')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {props.activeLayer === 'text' && (
                <View>
                  <TouchableOpacity
                    onPress={props.onAddText}
                    style={[styles.actionBtn, styles.addTextBtn]}
                  >
                    <Text style={styles.addTextBtnLabel}>
                      {i18n.t('backgroundEditor.sheet.addText')}
                    </Text>
                  </TouchableOpacity>

                  {props.selectedTextId ? (
                    <View
                      style={styles.editTextContainer}
                      onLayout={e => {
                        const y = Number(e?.nativeEvent?.layout?.y);
                        if (Number.isFinite(y)) setTextEditY(y);
                      }}
                    >
                      <Text style={styles.label}>
                        {i18n.t('backgroundEditor.sheet.text')}
                      </Text>

                      <TextInput
                        ref={textInputRef}
                        value={
                          props.textLayers.find(
                            t => t.id === props.selectedTextId,
                          )?.text || ''
                        }
                        onChangeText={txt =>
                          props.onUpdateText(props.selectedTextId, {
                            text: txt,
                          })
                        }
                        placeholder={i18n.t(
                          'backgroundEditor.sheet.textPlaceholder',
                        )}
                        placeholderTextColor="#9CA3AF"
                        style={styles.textEditInput}
                        returnKeyType="done"
                        blurOnSubmit
                      />

                      <TouchableOpacity
                        onPress={() => props.onDeleteText(props.selectedTextId)}
                        style={[
                          styles.textActionBtn,
                          styles.textActionBtnDanger,
                        ]}
                      >
                        <Text style={styles.textActionBtnDangerLabel}>
                          {i18n.t('backgroundEditor.sheet.delete')}
                        </Text>
                      </TouchableOpacity>

                      <Text style={styles.label}>
                        {i18n.t('backgroundEditor.sheet.color')}
                      </Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.textColorRow}
                      >
                        {PALETTE.map(c => {
                          const current = props.textLayers.find(
                            t => t.id === props.selectedTextId,
                          )?.color;
                          const isActive = current === c;
                          return (
                            <TouchableOpacity
                              key={c}
                              onPress={() =>
                                props.onUpdateText(props.selectedTextId, {
                                  color: c,
                                })
                              }
                              style={[
                                styles.textColorDot,
                                { backgroundColor: c },
                                isActive && styles.textColorDotActive,
                              ]}
                            />
                          );
                        })}
                      </ScrollView>

                      <Text style={styles.label}>
                        {i18n.t('backgroundEditor.sheet.size')}
                      </Text>
                      <CustomSlider
                        min={10}
                        max={120}
                        value={
                          props.textLayers.find(
                            t => t.id === props.selectedTextId,
                          )?.fontSize || 24
                        }
                        onValueChange={v =>
                          props.onUpdateText(props.selectedTextId, {
                            fontSize: v,
                          })
                        }
                      />
                    </View>
                  ) : (
                    <Text style={styles.noTextLabel}>
                      {i18n.t('backgroundEditor.sheet.doubleTapHint')}
                    </Text>
                  )}
                </View>
              )}
            </>
          )}
        </ScrollView>
      </Animated.View>
    </Animated.View>
  );
};

export default EditorSheet;
