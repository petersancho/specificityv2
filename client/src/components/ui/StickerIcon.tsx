import { useMemo, type CSSProperties } from "react";
import { renderIconDataUrl, type IconId } from "../../webgl/ui/WebGLIconRenderer";
import { resolveIconImageUrl } from "./webglButtonRenderer";
import { hexToRgb } from "../../utils/color";
import type { RGBA } from "../../webgl/ui/WebGLUIRenderer";
import tokens from "../../semantic/ui.tokens.json";
import { getStickerTint } from "../../workflow/colors";
import styles from "./StickerIcon.module.css";

export type StickerIconVariant = "library" | "site";

export type StickerIconProps = {
  iconId: IconId;
  variant?: StickerIconVariant;
  size?: number;
  tint?: RGBA | string;
  signature?: string;
  category?: string | null;
  className?: string;
  style?: CSSProperties;
  alt?: string;
  ariaHidden?: boolean;
  draggable?: boolean;
};

const FALLBACK_LIBRARY_TINT: RGBA = [0.07, 0.07, 0.09, 1];

const toRgba = (hex?: string | null): RGBA | null => {
  const rgb = hexToRgb(hex);
  return rgb ? [rgb[0], rgb[1], rgb[2], 1] : null;
};

const TOKEN_TINTS: RGBA[] = [
  tokens.palette.categories.workflow,
  tokens.palette.categories.primitives,
  tokens.palette.categories.goal,
  tokens.palette.categories.solver,
  tokens.palette.categories.voxel,
  tokens.palette.grey800,
  tokens.palette.grey600,
  tokens.palette.grey400,
]
  .map((hex) => toRgba(hex))
  .filter((value): value is RGBA => Boolean(value));

const hashString = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
};

const resolveTokenTint = (seed: string): RGBA => {
  if (TOKEN_TINTS.length === 0) return FALLBACK_LIBRARY_TINT;
  const index = Math.abs(hashString(seed)) % TOKEN_TINTS.length;
  return TOKEN_TINTS[index];
};

const resolveTint = (value: StickerIconProps["tint"], fallback: RGBA): RGBA => {
  if (!value) return fallback;
  if (Array.isArray(value) && value.length >= 4) return value as RGBA;
  if (typeof value === "string") {
    const rgb = hexToRgb(value);
    if (rgb) return [rgb[0], rgb[1], rgb[2], 1];
  }
  return fallback;
};

const resolveCategoryTint = (category?: string | null): RGBA | null => {
  if (!category) return null;
  const tint = getStickerTint(category);
  return tint ? toRgba(tint) : null;
};

const deriveSignature = (iconId: IconId) => {
  const raw = typeof iconId === "string" ? iconId : "icon";
  const words = raw
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const first = words[0] ?? "icon";
  const second = words[1] ?? "";
  const baseChars = `${first[0] ?? "I"}${second[0] ?? first[1] ?? "C"}`.toUpperCase();
  let hash = 2166136261;
  for (let i = 0; i < raw.length; i += 1) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const suffix = (hash >>> 0).toString(36).toUpperCase().padStart(2, "0").slice(-2);
  return `${baseChars}${suffix}`;
};

export const StickerIcon = ({
  iconId,
  variant = "site",
  size = 96,
  tint,
  signature,
  category,
  className,
  style,
  alt = "",
  ariaHidden,
  draggable = false,
}: StickerIconProps) => {
  const fallbackTint = useMemo(() => {
    const categoryTint = resolveCategoryTint(category);
    if (categoryTint) return categoryTint;
    if (variant === "site") {
      return resolveTokenTint(`${iconId}|${signature ?? ""}`);
    }
    return FALLBACK_LIBRARY_TINT;
  }, [category, iconId, signature, variant]);

  const resolvedTint = useMemo(
    () => resolveTint(tint, fallbackTint),
    [tint, fallbackTint]
  );

  const resolvedSignature = useMemo(
    () => (signature === undefined ? deriveSignature(iconId) : signature),
    [signature, iconId]
  );

  const iconStyle = variant === "library" ? "sticker" : "sticker2";
  const iconSrc = useMemo(() => {
    const url = resolveIconImageUrl(iconId, size, resolvedTint, {
      style: iconStyle,
      signature: resolvedSignature,
    });
    if (url) return url;
    const fallbackSize = Math.max(128, Math.round(size * 6));
    return renderIconDataUrl(iconId, fallbackSize, {
      tint: resolvedTint,
      style: iconStyle,
      signature: resolvedSignature,
      monochrome: true,
    });
  }, [iconId, size, resolvedTint, iconStyle, resolvedSignature]);

  const classes = [styles.icon, className].filter(Boolean).join(" ");
  const hidden = ariaHidden ?? !alt;

  return (
    <img
      src={iconSrc}
      className={classes}
      style={style}
      alt={alt}
      aria-hidden={hidden ? "true" : undefined}
      data-variant={variant}
      data-svg="true"
      data-category={category ?? undefined}
      draggable={draggable}
    />
  );
};

export default StickerIcon;
