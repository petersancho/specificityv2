#!/usr/bin/env node

/**
 * Brandkitify Script
 * 
 * Replaces hardcoded colors with brandkit tokens across all CSS modules.
 * 
 * Usage: node scripts/brandkitify.js <file>
 */

const fs = require('fs');
const path = require('path');

// Color mapping: hardcoded hex/rgb → brandkit token
const COLOR_MAP = {
  // CMYK colors
  '#00d4ff': 'var(--bk-cyan)',
  '#ff0099': 'var(--bk-magenta)',
  '#ffdd00': 'var(--bk-yellow)',
  '#8800ff': 'var(--bk-purple)',
  '#ff6600': 'var(--bk-orange)',
  '#88ff00': 'var(--solver-accent)', // Lime - use solver accent in solver dashboards
  '#66cc00': 'var(--solver-accent-deep)',
  
  // Base colors
  '#ffffff': 'var(--surface-card)',
  'white': 'var(--surface-card)',
  '#f8f6f2': 'var(--bk-porcelain)',
  '#faf8f5': 'var(--bk-cream)',
  '#000000': 'var(--bk-black)',
  'black': 'var(--bk-black)',
  
  // Grays
  '#f7fafc': 'var(--gray-50)',
  '#edf2f7': 'var(--gray-100)',
  '#e2e8f0': 'var(--gray-200)',
  '#cbd5e0': 'var(--gray-300)',
  '#a0aec0': 'var(--gray-400)',
  '#718096': 'var(--text-secondary)',
  '#4a5568': 'var(--gray-600)',
  '#2d3748': 'var(--gray-700)',
  '#1a202c': 'var(--gray-800)',
  
  // Lime tints/shades
  '#f8fff8': 'var(--bk-lime-soft)',
  '#f8fef8': 'var(--surface-panel)',
  '#fffef8': 'var(--bk-yellow-soft)',
  '#f0fff0': 'var(--bk-lime-soft)',
  '#e6ffcc': 'var(--bk-lime-soft)',
  '#d4f4d4': 'var(--bk-lime-soft)',
  '#99ff22': 'var(--solver-accent)',
  
  // Purple tints/shades
  '#6600cc': 'var(--bk-purple-deep)',
  '#e6ccff': 'var(--bk-purple-soft)',
  
  // Orange tints/shades
  '#cc4400': 'var(--bk-orange-deep)',
  '#ffeacc': 'var(--bk-orange-soft)',
  
  // Cyan tints/shades
  '#0099cc': 'var(--bk-cyan-deep)',
  '#ccf5ff': 'var(--bk-cyan-soft)',
  
  // Magenta tints/shades
  '#cc0077': 'var(--bk-magenta-deep)',
  '#ffccee': 'var(--bk-magenta-soft)',
  
  // Yellow tints/shades
  '#cc9900': 'var(--bk-yellow-deep)',
  '#fff5cc': 'var(--bk-yellow-soft)',
};

// Shadow replacements
const SHADOW_REPLACEMENTS = [
  // Replace rgba shadows with solid black sticker shadows
  [/box-shadow:\s*0\s+2px\s+4px\s+rgba\(0,\s*0,\s*0,\s*[\d.]+\)/gi, 'box-shadow: var(--shadow-sticker-pressed)'],
  [/box-shadow:\s*0\s+4px\s+8px\s+rgba\([^)]+\)/gi, 'box-shadow: var(--shadow-sticker-hover)'],
  [/box-shadow:\s*0\s+8px\s+32px\s+rgba\([^)]+\)/gi, 'box-shadow: var(--shadow-sticker)'],
  [/box-shadow:\s*0\s+2px\s+8px\s+rgba\([^)]+\)/gi, 'box-shadow: var(--shadow-sticker-pressed)'],
  [/box-shadow:\s*0\s+4px\s+0\s+rgba\(0,\s*0,\s*0,\s*[\d.]+\)/gi, 'box-shadow: var(--shadow-sticker)'],
  [/box-shadow:\s*0\s+6px\s+0\s+rgba\(0,\s*0,\s*0,\s*[\d.]+\)/gi, 'box-shadow: var(--shadow-sticker-hover)'],
  [/box-shadow:\s*0\s+2px\s+0\s+rgba\(0,\s*0,\s*0,\s*[\d.]+\)/gi, 'box-shadow: var(--shadow-sticker-pressed)'],
];

function brandkitify(filePath) {
  console.log(`\n🎨 Brandkitifying: ${filePath}`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  let changes = 0;
  
  // Replace colors
  for (const [hex, token] of Object.entries(COLOR_MAP)) {
    const regex = new RegExp(hex.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = content.match(regex);
    if (matches) {
      content = content.replace(regex, token);
      changes += matches.length;
      console.log(`  ✓ Replaced ${matches.length}x ${hex} → ${token}`);
    }
  }
  
  // Replace shadows
  for (const [regex, replacement] of SHADOW_REPLACEMENTS) {
    const matches = content.match(regex);
    if (matches) {
      content = content.replace(regex, replacement);
      changes += matches.length;
      console.log(`  ✓ Replaced ${matches.length}x shadow → ${replacement}`);
    }
  }
  
  // Write back
  if (changes > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  ✅ Made ${changes} changes`);
  } else {
    console.log(`  ℹ️  No changes needed`);
  }
  
  return changes;
}

// Main
const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node scripts/brandkitify.js <file>');
  process.exit(1);
}

const totalChanges = brandkitify(filePath);
console.log(`\n✨ Total changes: ${totalChanges}`);
