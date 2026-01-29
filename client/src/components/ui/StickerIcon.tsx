import { useMemo, type CSSProperties } from "react";
import { renderIconDataUrl, type IconId } from "../../webgl/ui/WebGLIconRenderer";
import { resolveIconImageUrl } from "./webglButtonRenderer";
import { CMYK_SWATCHES } from "../../utils/renderPalette";
import { hexToRgb } from "../../utils/color";
import type { RGBA } from "../../webgl/ui/WebGLUIRenderer";
import styles from "./StickerIcon.module.css";

export type StickerIconVariant = "library" | "site";

export type StickerIconProps = {
  iconId: IconId;
  variant?: StickerIconVariant;
  size?: number;
  tint?: RGBA | string;
  signature?: string;
  className?: string;
  style?: CSSProperties;
  alt?: string;
  ariaHidden?: boolean;
  draggable?: boolean;
};

const FALLBACK_LIBRARY_TINT: RGBA = [0.07, 0.07, 0.09, 1];
const CMYK_TINTS: RGBA[] = CMYK_SWATCHES.map((swatch) => {
  const rgb = hexToRgb(swatch.hex);
  return rgb ? [rgb[0], rgb[1], rgb[2], 1] : null;
}).filter((value): value is RGBA => Boolean(value));

const hashString = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
};

const resolveCmykTint = (seed: string): RGBA => {
  if (CMYK_TINTS.length === 0) return FALLBACK_LIBRARY_TINT;
  const index = Math.abs(hashString(seed)) % CMYK_TINTS.length;
  return CMYK_TINTS[index];
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

export const StickerIcon = ({
  iconId,
  variant = "site",
  size = 96,
  tint,
  signature,
  className,
  style,
  alt = "",
  ariaHidden,
  draggable = false,
}: StickerIconProps) => {
  const fallbackTint = useMemo(() => {
    if (variant === "site") {
      return resolveCmykTint(`${iconId}|${signature ?? ""}`);
    }
    return FALLBACK_LIBRARY_TINT;
  }, [iconId, signature, variant]);

  const resolvedTint = useMemo(
    () => resolveTint(tint, fallbackTint),
    [tint, fallbackTint]
  );

  const iconStyle = variant === "library" ? "sticker" : "sticker2";
  const iconSrc = useMemo(() => {
    const url = resolveIconImageUrl(iconId, size, resolvedTint, {
      style: iconStyle,
      signature,
    });
    if (url) return url;
    const fallbackSize = Math.max(128, Math.round(size * 6));
    return renderIconDataUrl(iconId, fallbackSize, {
      tint: resolvedTint,
      style: iconStyle,
      signature,
      monochrome: true,
    });
  }, [iconId, size, resolvedTint, iconStyle, signature]);

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
      draggable={draggable}
    />
  );
};

export default StickerIcon;
