// KitaTolongKita Design Tokens
// Based on Stitch Design System — Project ID: 13309447277577605557

export const colors = {
  // Universal
  white: '#ffffff',
  black: '#000000',

  // Primary — Amber Orange (Deal Energy)
  primary: '#a04100',
  'on-primary': '#ffffff',
  'primary-container': '#ff7a30',
  'on-primary-container': '#622400',
  'inverse-primary': '#ffb693',
  'primary-fixed': '#ffdbcc',
  'primary-fixed-dim': '#ffb693',
  'on-primary-fixed': '#351000',
  'on-primary-fixed-variant': '#7a2f00',

  // Secondary — Deep Teal (Trust Accent)
  secondary: '#0e6a5b',
  'on-secondary': '#ffffff',
  'secondary-container': '#a2f2de',
  'on-secondary-container': '#197161',
  'secondary-fixed': '#a2f2de',
  'secondary-fixed-dim': '#86d5c3',
  'on-secondary-fixed': '#00201a',
  'on-secondary-fixed-variant': '#005144',

  // Tertiary
  tertiary: '#5f5e5b',
  'on-tertiary': '#ffffff',
  'tertiary-container': '#a2a09c',
  'on-tertiary-container': '#373734',
  'tertiary-fixed': '#e5e2dd',
  'tertiary-fixed-dim': '#c8c6c2',
  'on-tertiary-fixed': '#1c1c19',
  'on-tertiary-fixed-variant': '#474743',

  // Background & Surface
  background: '#fcf9f8',
  'on-background': '#1b1c1c',
  surface: '#fcf9f8',
  'surface-bright': '#fcf9f8',
  'surface-container': '#f0eded',
  'surface-container-low': '#f6f3f2',
  'surface-container-lowest': '#ffffff',
  'surface-container-high': '#eae7e7',
  'surface-container-highest': '#e4e2e1',
  'surface-dim': '#dcd9d9',
  'surface-variant': '#e4e2e1',
  'on-surface': '#1b1c1c',
  'on-surface-variant': '#584238',
  'surface-tint': '#a04100',

  // Inverse
  'inverse-surface': '#303030',
  'inverse-on-surface': '#f3f0ef',

  // Outline
  outline: '#8c7166',
  'outline-variant': '#dfc0b3',

  // Error
  error: '#ba1a1a',
  'on-error': '#ffffff',
  'error-container': '#ffdad6',
  'on-error-container': '#93000a',

  // Semantic Status — order/report lookup badges
  'status-success-bg': '#e8f5e9',
  'status-success-text': '#2e7d32',
  'status-info-bg': '#e3f2fd',
  'status-info-text': '#1565c0',
  'status-warning-bg': '#fff3e0',
  'status-warning-text': '#e65100',
  'status-error-bg': '#ffebee',
  'status-error-text': '#c62828',
  'status-neutral-bg': '#f5f5f5',
  'status-neutral-text': '#616161',
} as const;

export const typography = {
  'display-lg': {
    fontFamily: 'NunitoSans_800ExtraBold',
    fontSize: 32,
    fontWeight: '800' as const,
    lineHeight: 40,
    letterSpacing: -0.02,
  },
  'headline-lg': {
    fontFamily: 'NunitoSans_700Bold',
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 32,
  },
  'headline-lg-mobile': {
    fontFamily: 'NunitoSans_700Bold',
    fontSize: 20,
    fontWeight: '700' as const,
    lineHeight: 28,
  },
  'title-md': {
    fontFamily: 'NunitoSans_700Bold',
    fontSize: 18,
    fontWeight: '700' as const,
    lineHeight: 24,
  },
  'body-lg': {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  'body-md': {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  'label-sm': {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 16,
    letterSpacing: 0.01,
  },
} as const;

export const spacing = {
  'xs': 4,
  'sm': 8,
  'md': 16,
  'lg': 24,
  'xl': 32,
  'gutter': 16,
  'margin-mobile': 16,
  'margin-tablet': 32,
} as const;

export const borderRadius = {
  'sm': 4,
  'DEFAULT': 8,
  'md': 12,
  'lg': 16,
  'xl': 24,
  'full': 9999,
} as const;

export const shadows = {
  'card': {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 2,
  },
  'modal': {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 32,
    elevation: 8,
  },
} as const;

export type Colors = typeof colors;
export type Typography = typeof typography;
export type Spacing = typeof spacing;
export type BorderRadius = typeof borderRadius;
