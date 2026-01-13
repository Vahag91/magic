import * as React from 'react';
import { Animated, Easing, StatusBar, StyleSheet, useColorScheme, View } from 'react-native';
import OnboardingFooter from './components/OnboardingFooter';
import OnboardingHeader from './components/OnboardingHeader';
import BackgroundRemovalSlide from './views/BackgroundRemovalSlide';
import ObjectRemovalSlide from './views/ObjectRemovalSlide';
import WelcomeSlide from './views/WelcomeSlide';

const SLIDE_COUNT = 3;

export default function OnboardingScreen({ navigation }) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const animationController = React.useRef(new Animated.Value(0));
  const [pageIndex, setPageIndex] = React.useState(0);
  const [isAnimating, setIsAnimating] = React.useState(false);

  const bg = isDark ? '#0F1523' : '#F5F6F8';
  const text = isDark ? '#FFFFFF' : '#111827';
  const muted = isDark ? 'rgba(255,255,255,0.78)' : '#6B7280';

  const finish = React.useCallback(() => {
    if (navigation?.replace) navigation.replace('Home');
  }, [navigation]);

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
    [animationController, isAnimating, pageIndex],
  );

  const onBack = React.useCallback(() => animateTo(pageIndex - 1), [animateTo, pageIndex]);
  const onNext = React.useCallback(() => {
    if (pageIndex >= SLIDE_COUNT - 1) {
      finish();
      return;
    }
    animateTo(pageIndex + 1);
  }, [animateTo, finish, pageIndex]);

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={bg} />

      <WelcomeSlide index={0} animationController={animationController} />
      <BackgroundRemovalSlide index={1} animationController={animationController} />
      <ObjectRemovalSlide
        index={2}
        animationController={animationController}
        onPrimaryPress={finish}
        onSecondaryPress={finish}
      />

      {pageIndex < SLIDE_COUNT - 1 ? (
        <OnboardingHeader
          canGoBack={pageIndex > 0}
          onBack={onBack}
          onSkip={finish}
          textColor={text}
          mutedColor={muted}
        />
      ) : null}

      {pageIndex < SLIDE_COUNT - 1 ? (
        <OnboardingFooter
          pageCount={SLIDE_COUNT}
          pageIndex={pageIndex}
          primaryLabel="Continue"
          onPrimaryPress={onNext}
          disabled={isAnimating}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
