import { colors } from './colors';
import { metrics } from './metrics';

export const common = {
  safeWhite: { flex: 1, backgroundColor: colors.white },
  containerPadded: { flex: 1, backgroundColor: colors.white, paddingHorizontal: 18 },

  header: {
    height: metrics.headerHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBtn: {
    width: metrics.headerBtnSize,
    height: metrics.headerBtnSize,
    borderRadius: metrics.headerBtnSize / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  homeIndicator: {
    alignSelf: 'center',
    width: 120,
    height: 5,
    borderRadius: metrics.pillRadius,
    backgroundColor: colors.gray300,
  },
};

