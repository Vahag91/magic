import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  PanResponder,
  TextInput,
  Alert,
  Image,
} from 'react-native';

// --- Icons (Placeholders for your existing icon imports) ---
import BlurIcon from '../../components/icons/BlurIcon';
import GradientIcon from '../../components/icons/GradientIcon';
import ImageIcon from '../../components/icons/ImageIcon';
import PaletteIcon from '../../components/icons/PaletteIcon';
import TransparentIcon from '../../components/icons/TransparentIcon';

import { PALETTE, MODES, Icon, PREDEFINED_BACKGROUNDS } from './constants';
import CustomSlider from './CustomSlider';
import { styles, SHEET_MIN_HEIGHT, SHEET_MAX_HEIGHT } from './styles';

const EditorSheet = (props) => {
  const [activeSubTab, setActiveSubTab] = useState('main');
  const [magicPrompt, setMagicPrompt] = useState('');
  const sheetHeight = useRef(new Animated.Value(SHEET_MIN_HEIGHT)).current;
  const lastHeight = useRef(SHEET_MIN_HEIGHT);

  const renderModeIcon = (key, active) => {
    const color = active ? '#3b82f6' : '#6B7280';
    const size = 20;
    switch (key) {
      case 'clear': return <TransparentIcon size={size} color={color} />;
      case 'color': return <PaletteIcon size={size} color={color} />;
      case 'blur': return <BlurIcon size={size} color={color} />;
      case 'gradient': return <GradientIcon size={size} color={color} />;
      case 'image': return <ImageIcon size={size} color={color} />;
      default: return <Icon name={MODES.find(x => x.key === key)?.icon} />;
    }
  };

  const sheetResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        let newHeight = lastHeight.current - gestureState.dy;
        if (newHeight < SHEET_MIN_HEIGHT) newHeight = SHEET_MIN_HEIGHT;
        if (newHeight > SHEET_MAX_HEIGHT) newHeight = SHEET_MAX_HEIGHT;
        sheetHeight.setValue(newHeight);
      },
      onPanResponderRelease: (_, gestureState) => {
        const currentH = lastHeight.current - gestureState.dy;
        let target = SHEET_MIN_HEIGHT;
        if (currentH > (SHEET_MAX_HEIGHT + SHEET_MIN_HEIGHT) / 2 || gestureState.vy < -0.5) target = SHEET_MAX_HEIGHT;
        Animated.spring(sheetHeight, { toValue: target, useNativeDriver: false, bounciness: 4 })
          .start(() => { lastHeight.current = target; });
      }
    })
  ).current;

  return (
    <Animated.View style={[styles.sheet, { height: sheetHeight }]}>
      <View {...sheetResponder.panHandlers} style={styles.grabberArea}><View style={styles.grabber} /></View>

      <View style={styles.sheetPadding}>
        <View style={styles.tabRow}>
          {['subject', 'background', 'text'].map(l => (
            <TouchableOpacity
              key={l}
              onPress={() => { props.setActiveLayer(l); setActiveSubTab('main'); }}
              style={[styles.tabBtn, props.activeLayer === l && styles.tabBtnActive]}
            >
              <Text style={[styles.tabText, props.activeLayer === l && styles.tabTextActive]}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
        <View style={styles.subTabRow}>
          <TouchableOpacity onPress={() => setActiveSubTab('main')} style={[styles.pillBtn, activeSubTab === 'main' ? styles.pillBtnActive : styles.pillBtnInactive]}>
            <Text style={activeSubTab === 'main' ? styles.pillTextActive : styles.pillTextInactive}>Main</Text>
          </TouchableOpacity>

          {props.activeLayer !== 'text' && (
            <TouchableOpacity onPress={() => setActiveSubTab('adjust')} style={[styles.pillBtn, activeSubTab === 'adjust' ? styles.pillBtnActive : styles.pillBtnInactive]}>
              <Text style={activeSubTab === 'adjust' ? styles.pillTextActive : styles.pillTextInactive}>Adjust</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={() => setActiveSubTab('shadow')} style={[styles.pillBtn, activeSubTab === 'shadow' ? styles.pillBtnActive : styles.pillBtnInactive]}>
            <Text style={activeSubTab === 'shadow' ? styles.pillTextActive : styles.pillTextInactive}>Shadow</Text>
          </TouchableOpacity>

          {props.activeLayer === 'background' && (
            <TouchableOpacity onPress={() => setActiveSubTab('magic')} style={[styles.pillBtn, activeSubTab === 'magic' ? styles.pillBtnMagic : styles.pillBtnInactive]}>
              <Text style={activeSubTab === 'magic' ? styles.pillTextMagic : styles.pillTextInactive}>Magic AI</Text>
            </TouchableOpacity>
          )}
        </View>

        {activeSubTab === 'adjust' && (
          <View>
            <Text style={styles.sectionTitle}>Filters</Text>
            <View style={styles.sliderContainer}>
              <Text style={styles.label}>Brightness: {props.filters.brightness}%</Text>
              <CustomSlider min={0} max={200} value={props.filters.brightness} onValueChange={(val) => props.setFilters(prev => ({ ...prev, brightness: val }))} />
            </View>
            <View style={styles.sliderContainer}>
              <Text style={styles.label}>Contrast: {props.filters.contrast}%</Text>
              <CustomSlider min={0} max={200} value={props.filters.contrast} onValueChange={(val) => props.setFilters(prev => ({ ...prev, contrast: val }))} />
            </View>
            <View style={styles.sliderContainer}>
              <Text style={styles.label}>Saturation: {props.filters.saturation}%</Text>
              <CustomSlider min={0} max={200} value={props.filters.saturation} onValueChange={(val) => props.setFilters(prev => ({ ...prev, saturation: val }))} />
            </View>
          </View>
        )}

        {activeSubTab === 'shadow' && (
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={styles.sectionTitle}>Drop Shadow</Text>
              <TouchableOpacity
                onPress={() => props.setShadow(s => ({ ...s, enabled: !s.enabled }))}
                style={[styles.pillBtn, props.shadow.enabled ? styles.pillBtnActive : styles.pillBtnInactive]}
              >
                <Text style={props.shadow.enabled ? styles.pillTextActive : styles.pillTextInactive}>
                  {props.shadow.enabled ? "ON" : "OFF"}
                </Text>
              </TouchableOpacity>
            </View>
            {props.shadow.enabled && (
              <>
                <View style={styles.sliderContainer}>
                  <Text style={styles.label}>Blur Radius: {props.shadow.blur}</Text>
                  <CustomSlider min={0} max={50} value={props.shadow.blur} onValueChange={(v) => props.setShadow(s => ({ ...s, blur: v }))} />
                </View>
                <View style={styles.sliderContainer}>
                  <Text style={styles.label}>Opacity: {props.shadow.opacity}%</Text>
                  <CustomSlider min={0} max={100} value={props.shadow.opacity} onValueChange={(v) => props.setShadow(s => ({ ...s, opacity: v }))} />
                </View>
                <View style={styles.sliderContainer}>
                  <Text style={styles.label}>Distance (X/Y): {props.shadow.x}</Text>
                  <CustomSlider min={-50} max={50} value={props.shadow.x} onValueChange={(v) => props.setShadow(s => ({ ...s, x: v, y: v }))} />
                </View>
              </>
            )}
          </View>
        )}

        {activeSubTab === 'magic' && props.activeLayer === 'background' && (
          <View style={styles.magicContainer}>
            <Text style={styles.magicTitle}>Magic Background Generator</Text>
            <TextInput
              style={styles.magicInput}
              placeholder="Describe your dream background..."
              multiline
              value={magicPrompt}
              onChangeText={setMagicPrompt}
            />
            <TouchableOpacity
              onPress={() => props.onMagicGenerate(magicPrompt)}
              disabled={!magicPrompt}
              style={[styles.magicBtn, { opacity: magicPrompt ? 1 : 0.5 }]}
            >
              <Text style={styles.magicBtnText}>Generate</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeSubTab === 'main' && (
          <>
            {props.activeLayer === 'background' && (
              <View>
                <Text style={styles.sectionTitle}>Mode</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modeScroll}>
                  {MODES.map(m => (
                    <TouchableOpacity key={m.key} onPress={() => props.setMode(m.key)} style={styles.modeItem}>
                      <View style={[styles.modeIcon, props.mode === m.key && styles.modeIconActive]}>
                        {renderModeIcon(m.key, props.mode === m.key)}
                      </View>
                      <Text style={styles.modeLabel}>{m.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {(props.mode === 'color' || props.mode === 'gradient') && (
                  <View style={styles.paletteContainer}>
                    {PALETTE.map(c => (
                      <TouchableOpacity key={c} onPress={() => props.setSelectedColor(c)} style={[styles.colorDot, { backgroundColor: c }]} />
                    ))}
                  </View>
                )}

                {props.mode === 'blur' && (
                  <View>
                    <Text style={styles.label}>Blur Strength</Text>
                    <CustomSlider value={props.blurStrength} onValueChange={props.setBlurStrength} />
                  </View>
                )}

                {props.mode === 'image' && (
                  <View>
                    <TouchableOpacity onPress={props.onPickImage} style={styles.actionBtn}>
                      <Text>Pick from Library</Text>
                    </TouchableOpacity>

                    <Text style={styles.label}>Predefined</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 10 }}>
                      {PREDEFINED_BACKGROUNDS.map(uri => (
                        <TouchableOpacity key={uri} onPress={() => props.setBgImageUri(uri)} style={{ marginRight: 10 }}>
                          <Image source={{ uri }} style={{ width: 60, height: 80, borderRadius: 8 }} />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    <Text style={styles.label}>Opacity</Text>
                    <CustomSlider value={props.bgOpacity} onValueChange={props.setBgOpacity} />

                    <Text style={styles.label}>Tools</Text>
                    <View style={styles.bgToolsRow}>
                      <TouchableOpacity onPress={() => props.setBgTool('move')} style={[styles.toolBtn, props.bgTool === 'move' && styles.toolBtnActive]}>
                        <Text>Move</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => props.setBgTool('scale')} style={[styles.toolBtn, props.bgTool === 'scale' && styles.toolBtnActive]}>
                        <Text>Scale</Text>
                      </TouchableOpacity>
                    </View>

                    {props.bgTool === 'scale' && (
                      <CustomSlider
                        min={20}
                        max={300}
                        value={props.bgTransform.scale * 100}
                        onValueChange={(v) => props.setBgTransform({ ...props.bgTransform, scale: v / 100 })}
                      />
                    )}
                  </View>
                )}
              </View>
            )}

            {props.activeLayer === 'subject' && (
              <View>
                <View style={styles.subjectToolsRow}>
                  {['move', 'scale', 'erase'].map(t => (
                    <TouchableOpacity key={t} onPress={() => props.setSubjectTool(t)} style={[styles.toolTab, props.subjectTool === t && styles.toolTabActive]}>
                      <Text style={[styles.subjectToolText, props.subjectTool === t ? styles.subjectToolTextActive : styles.subjectToolTextInactive]}>
                        {t.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {props.subjectTool === 'scale' && (
                  <View>
                    <Text style={styles.label}>Scale Subject</Text>
                    <CustomSlider
                      min={20}
                      max={300}
                      value={props.subjectTransform.scale * 100}
                      onValueChange={(v) => props.setSubjectTransform({ ...props.subjectTransform, scale: v / 100 })}
                    />
                  </View>
                )}

                {props.subjectTool === 'erase' && (
                  <View>
                    <Text style={styles.label}>Eraser Size: {props.brushSettings.size}</Text>
                    <CustomSlider
                      min={5}
                      max={80}
                      value={props.brushSettings.size}
                      onValueChange={(v) => props.setBrushSettings({ ...props.brushSettings, size: v })}
                    />
                  </View>
                )}

                <View style={styles.centerResetRow}>
                  <TouchableOpacity onPress={() => props.setSubjectTransform(prev => ({ ...prev, x: 0, y: 0 }))} style={styles.actionBtn}>
                    <Text>Center</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => props.setSubjectTransform({ x: 0, y: 0, scale: 1 })} style={styles.actionBtn}>
                    <Text>Reset</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {props.activeLayer === 'text' && (
              <View>
                <TouchableOpacity onPress={props.onAddText} style={[styles.actionBtn, styles.addTextBtn]}>
                  <Text style={styles.addTextBtnLabel}>+ Add Text</Text>
                </TouchableOpacity>

                {props.selectedTextId ? (
                  <View style={styles.editTextContainer}>
                    <Text style={styles.label}>Edit Selected Text</Text>

                    <View style={styles.textColorRow}>
                      {PALETTE.map(c => (
                        <TouchableOpacity
                          key={c}
                          onPress={() => props.onUpdateText(props.selectedTextId, { color: c })}
                          style={[styles.textColorDot, { backgroundColor: c }]}
                        />
                      ))}
                    </View>

                    <Text style={[styles.label, styles.marginTop10]}>Size</Text>
                    <CustomSlider
                      min={10}
                      max={120}
                      value={props.textLayers.find(t => t.id === props.selectedTextId)?.fontSize || 24}
                      onValueChange={(v) => props.onUpdateText(props.selectedTextId, { fontSize: v })}
                    />

                    <TouchableOpacity onPress={() => props.onDeleteText(props.selectedTextId)} style={styles.deleteTextBtn}>
                      <Text style={styles.deleteTextLabel}>Delete Text</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={styles.noTextLabel}>Tap text on screen to edit or drag</Text>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </Animated.View>
  );
};

export default EditorSheet;
