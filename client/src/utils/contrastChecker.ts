/**
 * WCAG 2.1 Contrast Checker
 * Ensures text readability across the monochrome + red design system
 */

import { BRAND_PALETTE } from '../theme/palette';

export interface ContrastResult {
  ratio: number;
  passesAA: boolean;
  passesAAA: boolean;
  passesAALarge: boolean;
  passesAAALarge: boolean;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function rgbaToRgb(rgba: string): { r: number; g: number; b: number } | null {
  const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  return match
    ? {
        r: parseInt(match[1], 10),
        g: parseInt(match[2], 10),
        b: parseInt(match[3], 10),
      }
    : null;
}

function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const sRGB = c / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function calculateContrast(color1: string, color2: string): ContrastResult {
  let rgb1 = hexToRgb(color1) || rgbaToRgb(color1);
  let rgb2 = hexToRgb(color2) || rgbaToRgb(color2);

  if (!rgb1 || !rgb2) {
    console.warn(`Invalid color format: ${color1} or ${color2}`);
    return {
      ratio: 0,
      passesAA: false,
      passesAAA: false,
      passesAALarge: false,
      passesAAALarge: false,
    };
  }

  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  const ratio = (lighter + 0.05) / (darker + 0.05);

  return {
    ratio: Math.round(ratio * 100) / 100,
    passesAA: ratio >= 4.5,
    passesAAA: ratio >= 7,
    passesAALarge: ratio >= 3,
    passesAAALarge: ratio >= 4.5,
  };
}

export const BRAND_COLORS = {
  black: BRAND_PALETTE.black,
  white: BRAND_PALETTE.white,
  gray50: BRAND_PALETTE.gray[50],
  gray100: BRAND_PALETTE.gray[100],
  gray200: BRAND_PALETTE.gray[200],
  gray300: BRAND_PALETTE.gray[300],
  gray400: BRAND_PALETTE.gray[400],
  gray500: BRAND_PALETTE.gray[500],
  gray600: BRAND_PALETTE.gray[600],
  gray700: BRAND_PALETTE.gray[700],
  gray800: BRAND_PALETTE.gray[800],
  gray900: BRAND_PALETTE.gray[900],
  red: BRAND_PALETTE.accent,
} as const;

export interface ContrastPair {
  foreground: string;
  background: string;
  usage: string;
  result: ContrastResult;
}

interface ContrastPairInput {
  foreground: string;
  background: string;
  usage: string;
}

export function validateDesignSystem(): ContrastPair[] {
  const pairs: ContrastPairInput[] = [
    { foreground: BRAND_COLORS.black, background: BRAND_COLORS.white, usage: 'Primary text on white' },
    { foreground: BRAND_COLORS.white, background: BRAND_COLORS.black, usage: 'White text on black' },
    { foreground: BRAND_COLORS.gray900, background: BRAND_COLORS.white, usage: 'Dark text on white' },
    { foreground: BRAND_COLORS.gray800, background: BRAND_COLORS.white, usage: 'Gray-800 text on white' },
    { foreground: BRAND_COLORS.gray700, background: BRAND_COLORS.white, usage: 'Gray-700 text on white' },
    { foreground: BRAND_COLORS.gray600, background: BRAND_COLORS.white, usage: 'Gray-600 text on white' },
    { foreground: BRAND_COLORS.gray500, background: BRAND_COLORS.white, usage: 'Gray-500 text on white' },
    { foreground: BRAND_COLORS.gray400, background: BRAND_COLORS.white, usage: 'Gray-400 text on white' },
    { foreground: BRAND_COLORS.white, background: BRAND_COLORS.gray900, usage: 'White text on gray-900' },
    { foreground: BRAND_COLORS.white, background: BRAND_COLORS.gray800, usage: 'White text on gray-800' },
    { foreground: BRAND_COLORS.white, background: BRAND_COLORS.gray700, usage: 'White text on gray-700' },
    { foreground: BRAND_COLORS.white, background: BRAND_COLORS.gray600, usage: 'White text on gray-600' },
    { foreground: BRAND_COLORS.white, background: BRAND_COLORS.gray500, usage: 'White text on gray-500' },
    { foreground: BRAND_COLORS.black, background: BRAND_COLORS.gray100, usage: 'Black text on gray-100' },
    { foreground: BRAND_COLORS.black, background: BRAND_COLORS.gray200, usage: 'Black text on gray-200' },
    { foreground: BRAND_COLORS.gray900, background: BRAND_COLORS.gray100, usage: 'Gray-900 text on gray-100' },
    { foreground: BRAND_COLORS.gray800, background: BRAND_COLORS.gray100, usage: 'Gray-800 text on gray-100' },
    { foreground: BRAND_COLORS.red, background: BRAND_COLORS.white, usage: 'Red accent on white' },
    { foreground: BRAND_COLORS.white, background: BRAND_COLORS.red, usage: 'White text on red accent' },
    { foreground: BRAND_COLORS.black, background: BRAND_COLORS.red, usage: 'Black text on red accent' },
    { foreground: BRAND_COLORS.gray700, background: BRAND_COLORS.gray100, usage: 'Gray-700 on gray-100 (node text)' },
    { foreground: BRAND_COLORS.gray600, background: BRAND_COLORS.gray100, usage: 'Gray-600 on gray-100 (secondary text)' },
    { foreground: BRAND_COLORS.gray500, background: BRAND_COLORS.gray100, usage: 'Gray-500 on gray-100 (tertiary text)' },
  ];

  return pairs.map((pair) => ({
    ...pair,
    result: calculateContrast(pair.foreground, pair.background),
  }));
}

export function printContrastReport(): void {
  const results = validateDesignSystem();
  
  console.group('🎨 Design System Contrast Report');
  console.log('WCAG 2.1 Standards:');
  console.log('  AA Normal Text: 4.5:1');
  console.log('  AA Large Text: 3:1');
  console.log('  AAA Normal Text: 7:1');
  console.log('  AAA Large Text: 4.5:1');
  console.log('');

  const failures = results.filter((r) => !r.result.passesAA);
  const warnings = results.filter((r) => r.result.passesAA && !r.result.passesAAA);
  const passes = results.filter((r) => r.result.passesAAA);

  if (failures.length > 0) {
    console.group(`❌ FAILURES (${failures.length})`);
    failures.forEach((pair) => {
      console.log(
        `${pair.usage}: ${pair.result.ratio}:1 (${pair.foreground} on ${pair.background})`
      );
    });
    console.groupEnd();
  }

  if (warnings.length > 0) {
    console.group(`⚠️  WARNINGS - Passes AA, fails AAA (${warnings.length})`);
    warnings.forEach((pair) => {
      console.log(
        `${pair.usage}: ${pair.result.ratio}:1 (${pair.foreground} on ${pair.background})`
      );
    });
    console.groupEnd();
  }

  console.group(`✅ PASSES AAA (${passes.length})`);
  passes.forEach((pair) => {
    console.log(
      `${pair.usage}: ${pair.result.ratio}:1 (${pair.foreground} on ${pair.background})`
    );
  });
  console.groupEnd();

  console.groupEnd();
}

export function getContrastSafeColor(
  background: string,
  preferDark: boolean = true
): string {
  const darkOptions = [
    BRAND_COLORS.black,
    BRAND_COLORS.gray900,
    BRAND_COLORS.gray800,
    BRAND_COLORS.gray700,
  ];
  const lightOptions = [
    BRAND_COLORS.white,
    BRAND_COLORS.gray100,
    BRAND_COLORS.gray200,
  ];

  const options = preferDark ? darkOptions : lightOptions;

  for (const color of options) {
    const result = calculateContrast(color, background);
    if (result.passesAA) {
      return color;
    }
  }

  return preferDark ? BRAND_COLORS.black : BRAND_COLORS.white;
}
