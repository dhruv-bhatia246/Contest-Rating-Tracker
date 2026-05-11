import { useWindowDimensions } from 'react-native';

export const TABLET_BREAKPOINT = 768;
export const LARGE_TABLET_BREAKPOINT = 1024;

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= TABLET_BREAKPOINT;
  const isLargeTablet = width >= LARGE_TABLET_BREAKPOINT;
  const contentPadding = isTablet ? 24 : 16;
  const maxContentWidth = isLargeTablet ? 1000 : 760;
  const cardMaxWidth = isTablet ? Math.min(width - 48, 760) : width - 32;

  return {
    width,
    height,
    isTablet,
    isLargeTablet,
    contentPadding,
    maxContentWidth,
    cardMaxWidth,
  };
}
