# UI Semantics (Black & White)

Lingua’s UI is now semantically driven: **color, shadow, spacing, and stickers are information**, not decoration.

## Principles
- Default UI is black/white (plus porcelain/ink for warmth).
- Color appears only when it conveys semantic meaning.
- All semantic colors and UI tokens are machine-validated.

## Core Types
Defined in `client/src/semantic/uiSemantics.ts`:
- `UISemanticDomain`: `numeric | logic | data | structure | feedback | neutral`
- `UISemanticState`: `idle | active | computing | success | warning | error`

## Tokens
- Colors: `client/src/semantic/uiColorTokens.ts`
- Shadows: `client/src/semantic/uiShadowTokens.ts`
- Spacing: `client/src/semantic/uiSpacingTokens.ts`
- Stickers: `client/src/semantic/uiStickerRegistry.ts`
- Registry: `client/src/semantic/uiSemanticRegistry.ts`

## CSS
Generated from registry:
- `client/src/styles/semantic.css`
- Run: `npm run generate:semantic-css`

## Validation
- `npm run validate:ui-semantics`
  - Ensures CSS uses only semantic colors.
  - Ensures stickers resolve to semantic operations.

## Usage Example
```tsx
<WebGLButton
  label="Add"
  iconId="add"
  semanticDomain="numeric"
  semanticOps={["math.add"]}
/>
```

## Notes
- Legacy `--bk-*` tokens remain as aliases in `brandkit.css` for backward compatibility.
- New work should use `--semantic-*`, `--feedback-*`, and `--ui-*` tokens.
