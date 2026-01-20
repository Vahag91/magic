import * as React from 'react';
import { Animated, BackHandler, Easing, Platform, StatusBar, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import OnboardingFooter from './components/OnboardingFooter';
import BackgroundRemovalSlide from './views/BackgroundRemovalSlide';
import ObjectRemovalSlide from './views/ObjectRemovalSlide';
import WelcomeSlide from './views/WelcomeSlide';
import { markOnboardingSeen } from '../../lib/onboarding';

const SLIDE_COUNT = 3;

export default function OnboardingScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const animationController = React.useRef(new Animated.Value(0));
  const [pageIndex, setPageIndex] = React.useState(0);
  const [isAnimating, setIsAnimating] = React.useState(false);
  const [isFinishing, setIsFinishing] = React.useState(false);
  const [footerHeight, setFooterHeight] = React.useState(0);

  const bg = '#FFFFFF';

  const layout = React.useMemo(() => {
    const maxWidth = 430;
    const sidePadding = 18;
    const cardAspect = 5 / 4;
    const cardRadius = 24;
    const heroScale = 0.9;
    const fontScale = 0.85;
    const containerWidth = Math.min(width, maxWidth);
    const cardWidth = Math.max(0, containerWidth - sidePadding * 2);
    const topPad = 12;
    const bottomPad = footerHeight > 0 ? footerHeight + 8 : insets.bottom + 120;
    const available = height - topPad - bottomPad;
    const desiredHeight = cardWidth * cardAspect;
    const cardHeight = Math.max(190, Math.min(desiredHeight, available - 180));
    const heroWidth = Math.round(cardWidth * heroScale);
    const heroHeight = Math.round(cardHeight * heroScale);
    const isCompact = width < 360 || height < 700;

    return {
      width,
      height,
      topPad,
      bottomPad,
      cardWidth,
      cardHeight,
      heroWidth,
      heroHeight,
      cardRadius,
      fontScale,
      maxWidth,
      sidePadding,
      isCompact,
    };
  }, [footerHeight, height, insets.bottom, width]);

  const finish = React.useCallback(() => {
    if (isFinishing) return;

    setIsFinishing(true);

    (async () => {
      await markOnboardingSeen();
      if (navigation?.reset) {
        navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
        return;
      }
      if (navigation?.replace) navigation.replace('Home');
      else navigation?.navigate?.('Home');
    })();
  }, [isFinishing, navigation]);

  const animateTo = React.useCallback(
    (nextIndex) => {
      const clamped = Math.max(0, Math.min(SLIDE_COUNT - 1, nextIndex));
      if (clamped === pageIndex || isAnimating) return;

      setIsAnimating(true);
      setPageIndex(clamped);

      Animated.timing(animationController.current, {
        toValue: clamped,
        duration: 650,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => setIsAnimating(false));
    },
    [isAnimating, pageIndex],
  );

  const onBack = React.useCallback(() => animateTo(pageIndex - 1), [animateTo, pageIndex]);
  const onNext = React.useCallback(() => {
    if (pageIndex >= SLIDE_COUNT - 1) return finish();
    animateTo(pageIndex + 1);
  }, [animateTo, finish, pageIndex]);

  const isLastPage = pageIndex >= SLIDE_COUNT - 1;

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerBackVisible: pageIndex > 0,
      headerBackOnPress: onBack,
    });
  }, [navigation, onBack, pageIndex]);

  React.useEffect(() => {
    if (Platform.OS !== 'android') return;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (pageIndex > 0) {
        onBack();
        return true;
      }
      return false;
    });

    return () => subscription.remove();
  }, [onBack, pageIndex]);

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      <StatusBar barStyle="dark-content" backgroundColor={bg} />

      <WelcomeSlide
        index={0}
        animationController={animationController}
        layout={layout}
        isActive={!isAnimating && pageIndex === 0}
      />
      <BackgroundRemovalSlide
        index={1}
        animationController={animationController}
        layout={layout}
        isActive={!isAnimating && pageIndex === 1}
      />
      <ObjectRemovalSlide
        index={2}
        animationController={animationController}
        layout={layout}
        isActive={!isAnimating && pageIndex === 2}
      />

      <OnboardingFooter
        pageCount={SLIDE_COUNT}
        pageIndex={pageIndex}
        primaryLabel={isLastPage ? 'Get Started' : 'Continue'}
        onPrimaryPress={onNext}
        disabled={isAnimating || isFinishing}
        layout={layout}
        onLayout={(e) => setFooterHeight(e.nativeEvent.layout.height)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' }, // ✅ important
});
