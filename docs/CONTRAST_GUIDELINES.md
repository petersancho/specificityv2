# Contrast Guidelines

## WCAG 2.1 Standards

- **AA Normal Text**: 4.5:1 minimum
- **AA Large Text**: 3:1 minimum (18pt+ or 14pt+ bold)
- **AAA Normal Text**: 7:1 minimum (enhanced)
- **AAA Large Text**: 4.5:1 minimum (enhanced)

## ✅ APPROVED Color Combinations (Pass WCAG AAA)

### Black/White Combinations
- ✅ **Black on White**: 21:1 (Primary text)
- ✅ **White on Black**: 21:1 (Inverted text)
- ✅ **Gray-900 on White**: 17.74:1 (Dark text)
- ✅ **Gray-800 on White**: 14.68:1 (Dark text)
- ✅ **Gray-700 on White**: 10.31:1 (Body text)
- ✅ **Gray-600 on White**: 7.56:1 (Secondary text)

### Light Background Combinations
- ✅ **Black on Gray-100**: 19.08:1 (Primary text on light bg)
- ✅ **Black on Gray-200**: 16.96:1 (Primary text on light bg)
- ✅ **Gray-900 on Gray-100**: 16.12:1 (Dark text on light bg)
- ✅ **Gray-800 on Gray-100**: 13.34:1 (Dark text on light bg)
- ✅ **Gray-700 on Gray-100**: 9.37:1 (Body text on light bg)

### Dark Background Combinations
- ✅ **White on Gray-900**: 17.74:1 (Light text on dark bg)
- ✅ **White on Gray-800**: 14.68:1 (Light text on dark bg)
- ✅ **White on Gray-700**: 10.31:1 (Light text on dark bg)
- ✅ **White on Gray-600**: 7.56:1 (Light text on dark bg)

## ⚠️ USE WITH CAUTION (Pass AA, Fail AAA)

These combinations meet minimum standards but should be used sparingly:

- ⚠️ **Gray-500 on White**: 4.83:1 (Use for large text only)
- ⚠️ **White on Gray-500**: 4.83:1 (Use for large text only)
- ⚠️ **Red Accent on White**: 4.83:1 (Use for large text/icons only)
- ⚠️ **White on Red Accent**: 4.83:1 (Use for large text/buttons only)
- ⚠️ **Gray-600 on Gray-100**: 6.87:1 (Acceptable for secondary text)

## ❌ FORBIDDEN Combinations (Fail WCAG AA)

**Never use these combinations:**

- ❌ **Gray-400 on White**: 2.54:1 (Too light - invisible)
- ❌ **Black on Red Accent**: 4.35:1 (Fails AA - use white instead)
- ❌ **Gray-500 on Gray-100**: 4.39:1 (Too subtle - use gray-600+ instead)

## 🎨 Recommended Usage

### Primary Text
- **On White**: Black, Gray-900, Gray-800
- **On Gray-100**: Black, Gray-900, Gray-800
- **On Dark Backgrounds**: White

### Secondary Text
- **On White**: Gray-700, Gray-600
- **On Gray-100**: Gray-700, Gray-600
- **On Dark Backgrounds**: Gray-200, Gray-300

### Tertiary Text / Disabled States
- **On White**: Gray-600 (minimum)
- **On Gray-100**: Gray-600 (minimum)
- **Never use Gray-500 or lighter for small text**

### Red Accent Usage
- **On White**: Use for large text (18pt+), icons, or buttons only
- **Text on Red**: Always use white, never black
- **Borders/Outlines**: Safe for any size

### Canvas/WebGL Text Rendering
- **Node titles**: Black or Gray-900 on light backgrounds
- **Port labels**: Gray-700 or darker on light backgrounds
- **Category labels**: Gray-800 or darker on light backgrounds
- **Hover states**: White on Red Accent (large text only)

## 🔍 Validation

Run contrast validation before committing:

```bash
npm run validate:contrast
```

This will check all color combinations and fail the build if any violations are detected.

## 🛠️ Fixing Contrast Issues

If you encounter a contrast failure:

1. **Check the contrast ratio**: Use `calculateContrast(color1, color2)` from `utils/contrastChecker.ts`
2. **Choose a darker/lighter alternative**: Refer to the approved combinations above
3. **For dynamic colors**: Use `getContrastSafeColor(background, preferDark)` to automatically select a safe color
4. **Re-validate**: Run `npm run validate:contrast` to confirm the fix

## 📊 Quick Reference Matrix

| Background | Safe Text Colors | Unsafe Text Colors |
|------------|------------------|-------------------|
| White | Black, Gray-900, Gray-800, Gray-700, Gray-600 | Gray-500, Gray-400, Gray-300 |
| Gray-100 | Black, Gray-900, Gray-800, Gray-700, Gray-600 | Gray-500, Gray-400 |
| Gray-200 | Black, Gray-900, Gray-800, Gray-700 | Gray-600, Gray-500 |
| Gray-500 | White (large text only) | Black, Gray-900 |
| Gray-600 | White | Black, Gray-900, Gray-800 |
| Gray-700 | White | Black, Gray-900 |
| Gray-800 | White | Black |
| Gray-900 | White | Black |
| Black | White | Gray-900, Gray-800 |
| Red Accent | White (large text only) | Black, Gray-900 |
