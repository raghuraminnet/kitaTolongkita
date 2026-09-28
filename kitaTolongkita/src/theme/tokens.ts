// KitaTolongKita Design Tokens — Native Super-Modern Architecture
// Warm Sunset Coral + Emerald Trust + Fluid Glassmorphism

import { Platform } from 'react-native';

export const DISPLAY_FONT = Platform.select({
  ios: '-apple-system',
  android: 'Roboto',
  web: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
  default: 'System',
});

export const BODY_FONT = Platform.select({
  ios: '-apple-system',
  android: 'Roboto',
  web: "'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
  default: 'System',
});

export const colors = {
  // Universal
  white: '#ffffff',
  black: '#000000',

  // Primary — Radiant Sunset Coral (Energetic Community Deal Energy)
  primary: '#FF5722',
  'on-primary': '#ffffff',
  'primary-container': '#FF6433',
  'on-primary-container': '#ffffff',
  'inverse-primary': '#FFAB91',
  'primary-fixed': '#FFE0B2',
  'primary-fixed-dim': '#FFCC80',
  'on-primary-fixed': '#3E1400',
  'on-primary-fixed-variant': '#872B00',
  'primary-subtle': '#FFF4EF',
  'primary-glow': 'rgba(255, 87, 34, 0.22)',

  // Secondary — Emerald Trust Teal (Savings, Verified Host & Security)
  secondary: '#00A86B',
  'on-secondary': '#ffffff',
  'secondary-container': '#E8F8F2',
  'on-secondary-container': '#00613D',
  'secondary-fixed': '#B2DFDB',
  'secondary-fixed-dim': '#80CBC4',
  'on-secondary-fixed': '#00251A',
  'on-secondary-fixed-variant': '#004D40',
  'secondary-subtle': '#F0FBF6',
  'secondary-glow': 'rgba(0, 168, 107, 0.20)',

  // Tertiary — Slate Indigo
  tertiary: '#4F5D75',
  'on-tertiary': '#ffffff',
  'tertiary-container': '#F1F5F9',
  'on-tertiary-container': '#1E293B',
  'tertiary-fixed': '#E2E8F0',
  'tertiary-fixed-dim': '#CBD5E1',
  'on-tertiary-fixed': '#0F172A',
  'on-tertiary-fixed-variant': '#334155',

  // Background & Surface
  background: '#F8FAFC',
  'on-background': '#0F172A',
  surface: '#FFFFFF',
  'surface-bright': '#FFFFFF',
  'surface-container': '#FFFFFF',
  'surface-container-low': '#F8FAFC',
  'surface-container-lowest': '#FFFFFF',
  'surface-container-high': '#F1F5F9',
  'surface-container-highest': '#E2E8F0',
  'surface-dim': '#F1F5F9',
  'surface-variant': '#F1F5F9',
  'surface-glass': 'rgba(255, 255, 255, 0.85)',
  'on-surface': '#0F172A',
  'on-surface-variant': '#64748B',
  'surface-tint': '#FF6433',

  // Inverse
  'inverse-surface': '#0F172A',
  'inverse-on-surface': '#F8FAFC',

  // Outline
  outline: 'rgba(0, 0, 0, 0.08)',
  'outline-variant': 'rgba(0, 0, 0, 0.04)',

  // Error
  error: '#EF4444',
  'on-error': '#ffffff',
  'error-container': '#FEE2E2',
  'on-error-container': '#991B1B',

  // Semantic Status
  'status-success-bg': '#ECFDF5',
  'status-success-text': '#047857',
  'status-info-bg': '#EFF6FF',
  'status-info-text': '#1D4ED8',
  'status-warning-bg': '#FFFBEB',
  'status-warning-text': '#B45309',
  'status-error-bg': '#FEF2F2',
  'status-error-text': '#B91C1C',
  'status-neutral-bg': '#F1F5F9',
  'status-neutral-text': '#475569',
} as const;

export const typography = {
  'display-lg': {
    fontFamily: DISPLAY_FONT,
    fontSize: 32,
    fontWeight: '800' as const,
    lineHeight: 38,
    letterSpacing: -0.6,
  },
  'headline-lg': {
    fontFamily: DISPLAY_FONT,
    fontSize: 24,
    fontWeight: '800' as const,
    lineHeight: 30,
    letterSpacing: -0.4,
  },
  'headline-lg-mobile': {
    fontFamily: DISPLAY_FONT,
    fontSize: 20,
    fontWeight: '700' as const,
    lineHeight: 26,
    letterSpacing: -0.3,
  },
  'title-md': {
    fontFamily: DISPLAY_FONT,
    fontSize: 17,
    fontWeight: '700' as const,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  'body-lg': {
    fontFamily: BODY_FONT,
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 22,
  },
  'body-md': {
    fontFamily: BODY_FONT,
    fontSize: 13.5,
    fontWeight: '400' as const,
    lineHeight: 19,
  },
  'label-sm': {
    fontFamily: BODY_FONT,
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 16,
    letterSpacing: 0.05,
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
  'sm': 8,
  'DEFAULT': 12,
  'md': 16,
  'lg': 20,
  'xl': 26,
  'full': 9999,
} as const;

export const shadows = {
  'card': {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 3,
  },
  'card-active': {
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 5,
  },
  'modal': {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.14,
    shadowRadius: 36,
    elevation: 10,
  },
  'floating': {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 8,
  },
} as const;

export type Colors = typeof colors;
export type Typography = typeof typography;
export type Spacing = typeof spacing;
export type BorderRadius = typeof borderRadius;
