import { useMemo, type CSSProperties } from "react";
import { renderIconDataUrl, type IconId } from "../../webgl/ui/WebGLIconRenderer";
import { resolveIconImageUrl } from "./webglButtonRenderer";
import { hexToRgb } from "../../utils/color";
import type { RGBA } from "../../webgl/ui/WebGLUIRenderer";
import type { SemanticOpId } from "../../semantic/semanticOpIds";
import type { UISemanticDomain } from "../../semantic/uiSemantics";
import { UI_DOMAIN_COLORS } from "../../semantic/uiColorTokens";
import { resolveStickerMeta } from "../../semantic/uiStickerRegistry";
import { UISemanticRegistry } from "../../semantic/uiSemanticRegistry";
import styles from "./StickerIcon.module.css";

export type StickerIconVariant = "library" | "site";

export type StickerIconProps = {
  iconId: IconId;
  variant?: StickerIconVariant;
  size?: number;
  tint?: RGBA | string;
  semanticDomain?: UISemanticDomain;
  semanticOps?: SemanticOpId[];
  signature?: string;
  className?: string;
  style?: CSSProperties;
  alt?: string;
  ariaHidden?: boolean;
  draggable?: boolean;
};

const FALLBACK_LIBRARY_TINT: RGBA = [0.07, 0.07, 0.09, 1];
const FALLBACK_SITE_TINT: RGBA = [
  0,
  0,
  0,
  1,
];

const resolveTint = (value: StickerIconProps["tint"], fallback: RGBA): RGBA => {
  if (!value) return fallback;
  if (Array.isArray(value) && value.length >= 4) return value as RGBA;
  if (typeof value === "string") {
    const rgb = hexToRgb(value);
    if (rgb) return [rgb[0], rgb[1], rgb[2], 1];
  }
  return fallback;
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
  semanticDomain,
  semanticOps,
  signature,
  className,
  style,
  alt = "",
  ariaHidden,
  draggable = false,
}: StickerIconProps) => {
  const fallbackTint = useMemo(() => {
    if (variant === "library") return FALLBACK_LIBRARY_TINT;

    const registry = UISemanticRegistry.getInstance();
    const meta = resolveStickerMeta(String(iconId));
    const opColor =
      semanticOps && semanticOps.length > 0
        ? registry.getColorForOp(semanticOps[0])
        : undefined;
    const domain = semanticDomain ?? meta.domain;
    const accent = semanticDomain
      ? UI_DOMAIN_COLORS[semanticDomain]
      : opColor ?? meta.accentColor ?? UI_DOMAIN_COLORS[domain];
    const rgb = hexToRgb(accent);
    if (rgb) return [rgb[0], rgb[1], rgb[2], 1];
    return FALLBACK_SITE_TINT;
  }, [iconId, semanticDomain, semanticOps, signature, variant]);

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
      draggable={draggable}
    />
  );
};

export default StickerIcon;
