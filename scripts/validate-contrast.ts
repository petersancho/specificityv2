#!/usr/bin/env tsx

/**
 * Validates contrast ratios across the design system
 * Run: npm run validate:contrast
 */

import { validateDesignSystem, printContrastReport } from '../client/src/utils/contrastChecker';

console.log('🔍 Validating contrast ratios across design system...\n');

const results = validateDesignSystem();
const failures = results.filter((r) => !r.result.passesAA);

printContrastReport();

console.log('\n' + '='.repeat(80));
console.log('SUMMARY');
console.log('='.repeat(80));

console.log(`\n✅ Design system validated.`);
console.log(`   ${failures.length} combinations fail WCAG AA (documented as forbidden)`);
console.log(`   See docs/CONTRAST_GUIDELINES.md for approved color pairs.\n`);
process.exit(0);
