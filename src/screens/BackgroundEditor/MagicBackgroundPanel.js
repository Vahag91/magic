import React from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Keyboard,
  Platform,
  InputAccessoryView,
  StyleSheet,
} from 'react-native';

const MAGIC_ACCESSORY_ID = 'magicPromptAccessory';

const UI = {
  primary: '#2563EB',
  text: '#111827',
  sub: '#6B7280',
  border: '#E5E7EB',
  surface: '#FFFFFF',
  inputBg: '#F9FAFB',
  inputBorder: '#E5E7EB',
  pillBg: '#F3F4F6',
  danger: '#EF4444',
};

export default function MagicBackgroundPanel({
  prompt,
  setPrompt,
  onGenerate,
  onDone,
  onRequestExpand,
  onRequestScrollTop,
  inputRef,
  title = 'Magic Background',
  hint = 'Describe what you want. Example: “soft pastel clouds, sunrise, minimal, high quality”.',
  maxLength = 400,
}) {
  const value = String(prompt || '');
  const trimmed = value.trim();
  const count = Math.min(maxLength, value.length);
  const canGenerate = trimmed.length > 0;

  const handleClear = () => setPrompt?.('');
  const handleDone = () => {
    Keyboard.dismiss();
    onDone?.();
  };
  const handleGenerate = () => {
    if (!canGenerate) return;
    Keyboard.dismiss();
    onGenerate?.(trimmed);
  };

  // IMPORTANT:
  // iOS accessory should be a SMALL toolbar (Clear/Done).
  // Do NOT put "Generate" here, otherwise you'll have double actions like in your screenshot.
  const accessory = Platform.OS !== 'ios'
    ? null
    : (
        <InputAccessoryView nativeID={MAGIC_ACCESSORY_ID}>
          <View style={styles.accessoryBar}>
            <Pressable
              onPress={handleClear}
              disabled={!canGenerate}
              style={({ pressed }) => [
                styles.accessoryBtn,
                !canGenerate && styles.accessoryBtnDisabled,
                pressed && canGenerate && styles.pressed,
              ]}
            >
              <Text style={[styles.accessoryBtnText, !canGenerate && styles.accessoryBtnTextDisabled]}>
                Clear
              </Text>
            </Pressable>

            <View style={styles.accessorySpacer} />

            <Pressable onPress={handleDone} style={({ pressed }) => [styles.accessoryBtn, pressed && styles.pressed]}>
              <Text style={styles.accessoryBtnText}>Done</Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      );

  return (
    <>
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerTextCol}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.hint}>{hint}</Text>
          </View>

          {!!trimmed && (
            <Pressable onPress={handleClear} style={({ pressed }) => [styles.clearPill, pressed && styles.pressed]}>
              <Text style={styles.clearPillText}>Clear</Text>
            </Pressable>
          )}
        </View>

        {/* Input */}
        <View style={styles.inputWrap}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Type your prompt…"
            placeholderTextColor="#9CA3AF"
            multiline
            maxLength={maxLength}
            value={value}
            onChangeText={setPrompt}
            onFocus={() => {
              onRequestExpand?.();
              onRequestScrollTop?.();
            }}
            autoCorrect
            autoCapitalize="sentences"
            textAlignVertical="top"
            inputAccessoryViewID={Platform.OS === 'ios' ? MAGIC_ACCESSORY_ID : undefined}
            returnKeyType="default"
            blurOnSubmit={false}
          />
        </View>

        {/* Footer */}
        <View style={styles.footerRow}>
          <Text style={styles.counter}>
            {count}/{maxLength}
          </Text>

          <Pressable
            onPress={handleGenerate}
            disabled={!canGenerate}
            style={({ pressed }) => [
              styles.primaryBtn,
              !canGenerate && styles.primaryBtnDisabled,
              pressed && canGenerate && styles.primaryBtnPressed,
            ]}
          >
            <Text style={[styles.primaryBtnText, !canGenerate && styles.primaryBtnTextDisabled]}>
              Generate
            </Text>
          </Pressable>
        </View>

        {/* Android only "Done" */}
        {Platform.OS !== 'ios' ? (
          <View style={styles.androidRow}>
            <Pressable onPress={handleDone} style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}>
              <Text style={styles.secondaryBtnText}>Done</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {accessory}
    </>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },

  // ✅ Fix: no flexGrow / no justifyContent: 'space-between' (that caused the huge empty area)
  card: {
    backgroundColor: UI.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 14,
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
      },
      android: { elevation: 2 },
    }),
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  headerTextCol: { flex: 1 },

  title: {
    fontSize: 16,
    fontWeight: '900',
    color: UI.text,
    letterSpacing: 0.2,
  },

  hint: {
    marginTop: 4,
    fontSize: 12.5,
    lineHeight: 16.5,
    fontWeight: '600',
    color: UI.sub,
  },

  clearPill: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: UI.pillBg,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearPillText: {
    fontSize: 12.5,
    fontWeight: '900',
    color: UI.text,
  },

  inputWrap: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: UI.inputBorder,
    backgroundColor: UI.inputBg,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  // ✅ Fix: professional input sizing (no giant card)
  input: {
    minHeight: 88,
    maxHeight: 140,
    fontSize: 14.5,
    lineHeight: 20,
    fontWeight: '600',
    color: UI.text,
  },

  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },

  counter: {
    fontSize: 12,
    fontWeight: '700',
    color: UI.sub,
  },

  primaryBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: UI.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnPressed: { opacity: 0.95, transform: [{ scale: 0.99 }] },
  primaryBtnDisabled: { backgroundColor: '#CBD5E1' },

  primaryBtnText: {
    fontSize: 14.5,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  primaryBtnTextDisabled: { color: '#F8FAFC' },

  androidRow: {
    marginTop: 2,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  secondaryBtn: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: UI.pillBg,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: UI.text,
  },

  // iOS accessory toolbar
  accessoryBar: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderTopWidth: 1,
    borderTopColor: UI.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  accessorySpacer: { flex: 1 },

  accessoryBtn: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: UI.pillBg,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accessoryBtnDisabled: { opacity: 0.5 },

  accessoryBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: UI.text,
  },
  accessoryBtnTextDisabled: { color: UI.sub },
});
