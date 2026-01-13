import * as React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, hitSlop10 } from '../styles';
import { ArrowRightIcon, ChevronRightIcon, SettingsIcon } from '../components/icons';

// Color Palette
const COLORS = {
  primary: colors.brandBlue,
  background: colors.white,
  cardBg: colors.surface,
  textMain: colors.text,
  textSub: colors.muted,
  border: colors.border,
  white: colors.white,
};

export default function HomeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.contentWrapper}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation && navigation.navigate('Settings')}
            style={styles.iconButton}
            hitSlop={hitSlop10}
            activeOpacity={0.85}
          >
            <SettingsIcon size={28} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Title Section */}
        <View style={styles.titleContainer}>
          <Text style={styles.appTitle}>Magic Studio</Text>
          <Text style={styles.appSubtitle}>Professional Photo Cleanup</Text>
        </View>

        {/* Hero Section */}
        <View style={styles.heroContainer}>
          <View style={styles.heroImageWrapper}>
            <View style={styles.glowEffect} />

            <View style={styles.heroImageShadow}>
              <View style={styles.heroImageClip}>
                <Image
                  source={{
                    uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD1kJlJDUyzYZkCJnnj0al2mTpJm3MHxdNcIdMaON1tPG9teEZYUPxnChMLrj6waBY_T3-BsqDUPicPvwS0UOLY_3hjKFCgWXADRgow0JbCz_EdnleeXphVHmuJjNP1QLWA9O7ouLOJ3POzDwg6AChw41E2PZXGw2PLINUu-2TLcA69tEcneEs_5TEfmrhp-gqP2ni3ZWw4zFV_NG97q9aLVIwbwrdQ2HaPUWVdxsePhaDRaSxDiQGE3d4pekuuJe9O6iWyoJj0WszD',
                  }}
                  style={styles.heroImage}
                  resizeMode="cover"
                />
              </View>
            </View>
          </View>

          {/* CTA Button */}
          <TouchableOpacity
            style={styles.ctaButton}
            activeOpacity={0.85}
            onPress={() => navigation && navigation.navigate('RemoveBackgroundSelect')}
          >
            <Text style={styles.ctaText}>Start Free Trial</Text>
            <ArrowRightIcon size={20} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.testButton}
            activeOpacity={0.85}
            onPress={() => navigation && navigation.navigate('Onboarding')}
          >
            <Text style={styles.testButtonText}>Test Onboarding</Text>
          </TouchableOpacity>
        </View>

        {/* Feature List */}
        <View style={styles.cardsContainer}>
          <FeatureCard
            title={'Remove\nBackground'}
            subtitle="Instantly isolate subjects."
            iconUri="https://lh3.googleusercontent.com/aida-public/AB6AXuAOgA3c3q_iMx1AcbeYGR7JAlfyIgNFHEJzag_8INLURm_PglL7ta6Y1-kpNHXyUx2tXgVxIHd1oCtx8WBIk2Tq1tncZ6Rx97eLfmdS8NHZWmyFxbjSgHS-df_afvYtALXZYhlGLrDTtUBBWE-Lfgj3UR7t10gN5K525d_TfotHy3zf5bmMdg9FNFgDhHhkGC-yJEd_DfIoY-vYTriscYbbxPoPs_lQol5-CAaR_9Rfsob3jJy1mN7jGk--Xf2S8fP0HALNQhxwEbLj"
            previewUri="https://lh3.googleusercontent.com/aida-public/AB6AXuBUvG4SMwEte47QBiNGu11vHo_JdMjLNKLSttqBJHTruSqQR7IBgaWu-uskSzUM6K1Uk9mrYMsp828AFxFceJseU6FTB3ZZu0QpqwxqP9dc7MNsAQ8YW9yLLwz_AH6oQ6GcKtBYslHFCYaY4RIuaOJjvSkUqa57El9A3zkTYlaiVBgZGgC7i4JrWc7DIPZkWNV2ollw64gEXgnxASCgOP_UEXEm_67-sNbALc3CvAav7wD6iqMgMFYfmGmJBqLTR7MdP-DN3pgUDOyZ"
            onPress={() => navigation && navigation.navigate('RemoveBackgroundSelect')}
          />

          <FeatureCard
            title={'Remove\nObject'}
            subtitle="Erase unwanted elements."
            iconUri="https://lh3.googleusercontent.com/aida-public/AB6AXuAk2IUkaK8aBEMpkGuCbwSXnzaSnpcJYVxXQQcVLRgdZuQCcnMy0U8X5sjf9FEx3ZL0aatZfvnrtia6leUTsLZumjl88LINUzBvfEp14UuYrSPSD7IDeWkBZgHvXeIm4zFGiOd_FTBRoXgwhDJDU_oR76CdtS_6RdF721SjGvSPpoTGRoANhV3MtI1lqT5e_FsruZ0m3k65HcCFB7l6gcRk_dfOp4XV_0BzojKT0vnPndaxBv7CjvwEa6GOCiYbC7T03zrv50z92grb"
            previewUri="https://lh3.googleusercontent.com/aida-public/AB6AXuAsde4Lr0NaOMZEPDluP0xFq3UGHeFPoysL4LEU1xGxmsVpZjgdVvpAWKu8ruyk4Y_zhuof4p0IbAJ92vEY2iYNtCWT0KCy003CIzwukPdggMAAPhNSuQGusETxWM9SEXUtdz0D0utDFrbzD5oZLattXhqRiHCdhzmC-ndtXwucY4lqx1JXr4bPSKEfnk4_qh2BEIMbftGDfJ0FOvXLrKc3yHibUMCAnmflEo8PNHfJxWtDhJ_l7QcYVokXMWVU9O0EEGPdB_afNpoh"
            onPress={() => navigation && navigation.navigate('RemoveObjectSelect')}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

function FeatureCard({ title, subtitle, iconUri, previewUri, onPress }) {
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={onPress}>
      {/* Left */}
      <View style={styles.cardContent}>
        <Image source={{ uri: iconUri }} style={styles.smallIcon} />

        <View style={styles.textWrapper}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {title}
          </Text>
          <Text style={styles.cardSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
      </View>

      {/* Right */}
      <View style={styles.cardRight}>
        <View style={styles.previewWrap}>
          <Image source={{ uri: previewUri }} style={styles.cardPreviewImage} />
        </View>
        <ChevronRightIcon size={26} color={COLORS.primary} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentWrapper: {
    flex: 1,
    paddingHorizontal: 24,
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
    paddingBottom: 18,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingVertical: 12,
  },
  iconButton: {
    padding: 8,
  },

  // Titles
  titleContainer: {
    marginTop: 10,
    marginBottom: 24,
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.textMain,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  appSubtitle: {
    fontSize: 16,
    color: COLORS.textSub,
    fontWeight: '500',
  },

  // Hero
  heroContainer: {
    alignItems: 'center',
    marginBottom: 56,
  },
  heroImageWrapper: {
    width: 150,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  glowEffect: {
    position: 'absolute',
    width: 122,
    height: 122,
    borderRadius: 66,
    backgroundColor: '#60A5FA',
    opacity: 0.4,
    transform: [{ scale: 1.2 }],
    ...Platform.select({
      ios: {
        shadowColor: '#3B82F6',
        shadowOpacity: 0.5,
        shadowRadius: 40,
        shadowOffset: { width: 0, height: 10 },
      },
      android: { elevation: 20 },
    }),
  },
  heroImageShadow: {
    width: 150,
    height: 150,
    borderRadius: 40,
    backgroundColor: COLORS.white,
    ...Platform.select({
      ios: {
        shadowColor: '#3B82F6',
        shadowOpacity: 0.5,
        shadowRadius: 25,
        shadowOffset: { width: 0, height: 10 },
      },
      android: { elevation: 10 },
    }),
  },
  heroImageClip: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: COLORS.white,
    backgroundColor: COLORS.white,
  },
  heroImage: {
    width: "100%",
    height: "100%",
    borderRadius: 40,
  },

  // CTA
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 100,
    width: '100%',
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primary,
        shadowOpacity: 0.3,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
      },
      android: { elevation: 6 },
    }),
  },
  ctaText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  testButton: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 999,
  },
  testButtonText: {
    color: COLORS.textMain,
    fontSize: 14,
    fontWeight: '700',
  },

  // Cards
  cardsContainer: {
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.cardBg,
    borderRadius: 24,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'space-between',

    // ✅ guarantee both cards same size
    minHeight: 118,

    borderWidth: 1,
    borderColor: 'transparent',
  },

  // Left block
  cardContent: {
    flex: 1,
    paddingRight: 12,
    justifyContent: 'center',
  },
  smallIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    marginBottom: 10,
  },
  textWrapper: {
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textMain,
    marginBottom: 4,
    lineHeight: 22,
  },
  cardSubtitle: {
    fontSize: 13,
    color: COLORS.textSub,
    fontWeight: '600',
    lineHeight: 18,
  },

  // Right block
  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  // ✅ Bigger preview, consistent look
  previewWrap: {
    width: 132,
    height: 92,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#E5E7EB',
  },
  cardPreviewImage: {
    width: '100%',
    height: '100%',
  },
});
