export const Colors = {
  light: {
    background: '#FFFFFF',
    secondaryBackground: '#F2F2F7',
    tertiaryBackground: '#FFFFFF',
    groupedBackground: '#F2F2F7',
    label: '#000000',
    secondaryLabel: '#8E8E93',
    tertiaryLabel: '#C7C7CC',
    separator: '#C6C6C8',
    opaqueSeparator: '#E5E5EA',
    tint: '#007AFF', // iOS System Blue
    systemRed: '#FF3B30',
    systemGreen: '#34C759',
    systemYellow: '#FFCC00',
    systemOrange: '#FF9500',
    systemGray: '#8E8E93',
    systemGray5: '#E5E5EA',
    systemGray6: '#F2F2F7',
    tabBarBackground: 'rgba(255, 255, 255, 0.85)',
    navBarBackground: 'rgba(255, 255, 255, 0.85)',
    card: '#FFFFFF',
    overlay: 'rgba(0, 0, 0, 0.4)',
    badgeBackground: 'rgba(0, 0, 0, 0.55)',
  },
  dark: {
    background: '#000000',
    secondaryBackground: '#1C1C1E',
    tertiaryBackground: '#2C2C2E',
    groupedBackground: '#000000',
    label: '#FFFFFF',
    secondaryLabel: '#8E8E93',
    tertiaryLabel: '#48484A',
    separator: '#38383A',
    opaqueSeparator: '#38383A',
    tint: '#0A84FF', // iOS System Blue (Dark)
    systemRed: '#FF453A',
    systemGreen: '#30D158',
    systemYellow: '#FFD60A',
    systemOrange: '#FF9F0A',
    systemGray: '#8E8E93',
    systemGray5: '#2C2C2E',
    systemGray6: '#1C1C1E',
    tabBarBackground: 'rgba(28, 28, 30, 0.85)',
    navBarBackground: 'rgba(0, 0, 0, 0.85)',
    card: '#1C1C1E',
    overlay: 'rgba(0, 0, 0, 0.7)',
    badgeBackground: 'rgba(0, 0, 0, 0.65)',
  },
};

export const Typography = {
  largeTitle: {
    fontSize: 34,
    fontWeight: '700' as const,
    letterSpacing: 0.37,
  },
  title1: {
    fontSize: 28,
    fontWeight: '700' as const,
    letterSpacing: 0.36,
  },
  title2: {
    fontSize: 22,
    fontWeight: '700' as const,
    letterSpacing: 0.35,
  },
  title3: {
    fontSize: 20,
    fontWeight: '600' as const,
    letterSpacing: 0.38,
  },
  headline: {
    fontSize: 17,
    fontWeight: '600' as const,
    letterSpacing: -0.41,
  },
  body: {
    fontSize: 17,
    fontWeight: '400' as const,
    letterSpacing: -0.41,
  },
  callout: {
    fontSize: 16,
    fontWeight: '400' as const,
    letterSpacing: -0.32,
  },
  subhead: {
    fontSize: 15,
    fontWeight: '400' as const,
    letterSpacing: -0.24,
  },
  footnote: {
    fontSize: 13,
    fontWeight: '400' as const,
    letterSpacing: -0.08,
  },
  caption1: {
    fontSize: 12,
    fontWeight: '400' as const,
    letterSpacing: 0,
  },
  caption2: {
    fontSize: 11,
    fontWeight: '400' as const,
    letterSpacing: 0.07,
  },
};

export const Spacing = {
  gridGap: 1.5,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};
