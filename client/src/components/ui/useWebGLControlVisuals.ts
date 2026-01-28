import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  getDefaultMinHeight,
  resolveButtonVisuals,
  resolveIconImageUrl,
  type WebGLButtonShape,
  type WebGLButtonSize,
  type WebGLButtonState,
  type WebGLButtonVariant,
} from "./webglButtonRenderer";
import { renderIconDataUrl, type IconId } from "../../webgl/ui/WebGLIconRenderer";

type ControlSize = { width: number; height: number };

type UseWebGLControlVisualsProps = {
  size?: WebGLButtonSize;
  variant?: WebGLButtonVariant;
  shape?: WebGLButtonShape;
  accentColor?: string;
  iconTintOverride?: string;
  active?: boolean;
  disabled?: boolean;
  iconOnly?: boolean;
  elevated?: boolean;
  iconId?: IconId;
  rightIconId?: IconId;
  style?: CSSProperties;
};

type ControlHandlers = {
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onPointerDown: () => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
};

const sizeChanged = (a: ControlSize, b: ControlSize) => {
  return Math.abs(a.width - b.width) > 0.5 || Math.abs(a.height - b.height) > 0.5;
};

const resolveState = ({
  disabled,
  active,
  hovered,
  pressed,
}: {
  disabled?: boolean;
  active?: boolean;
  hovered: boolean;
  pressed: boolean;
}): WebGLButtonState => {
  if (disabled) return "disabled";
  if (pressed) return "pressed";
  if (active) return "active";
  if (hovered) return "hover";
  return "idle";
};

export const useWebGLControlVisuals = ({
  size = "sm",
  variant = "command",
  shape = "rounded",
  accentColor,
  iconTintOverride,
  active = false,
  disabled = false,
  iconOnly = false,
  elevated,
  iconId,
  rightIconId,
  style,
}: UseWebGLControlVisualsProps) => {
  const controlRef = useRef<HTMLLabelElement>(null);
  const defaultMinHeight = getDefaultMinHeight(size);
  const [measuredSize, setMeasuredSize] = useState<ControlSize>({
    width: 0,
    height: defaultMinHeight,
  });
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [focused, setFocused] = useState(false);

  useLayoutEffect(() => {
    const node = controlRef.current;
    if (!node) return;

    const measure = () => {
      const rect = node.getBoundingClientRect();
      const next = {
        width: rect.width,
        height: rect.height || defaultMinHeight,
      };
      setMeasuredSize((prev) => (sizeChanged(prev, next) ? next : prev));
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [defaultMinHeight, size, variant, shape, iconOnly]);

  useEffect(() => {
    if (disabled) {
      setHovered(false);
      setPressed(false);
      setFocused(false);
    }
  }, [disabled]);

  const state = resolveState({
    disabled,
    active,
    hovered: hovered || focused,
    pressed,
  });

  const visuals = useMemo(
    () =>
      resolveButtonVisuals({
        width: measuredSize.width,
        height: measuredSize.height,
        variant,
        state,
        size,
        shape,
        accentColor,
        iconTintOverride,
        iconOnly,
        elevated,
      }),
    [
      measuredSize.width,
      measuredSize.height,
      variant,
      state,
      size,
      shape,
      accentColor,
      iconTintOverride,
      iconOnly,
      elevated,
    ]
  );

  const iconTintKey = `${visuals.iconTint.map((value) => Math.round(value * 255)).join("-")}`;
  const iconSrc = useMemo(() => {
    if (!iconId) return "";
    const url = resolveIconImageUrl(iconId, visuals.iconSize, visuals.iconTint);
    if (url) return url;
    const fallbackSize = Math.max(48, Math.round(visuals.iconSize * 2));
    return renderIconDataUrl(iconId, fallbackSize, { tint: visuals.iconTint });
  }, [iconId, visuals.iconSize, iconTintKey]);

  const rightIconSize = Math.max(12, visuals.iconSize * 0.7);
  const rightIconSrc = useMemo(() => {
    if (!rightIconId) return "";
    const url = resolveIconImageUrl(rightIconId, rightIconSize, visuals.iconTint);
    if (url) return url;
    const fallbackSize = Math.max(48, Math.round(rightIconSize * 2));
    return renderIconDataUrl(rightIconId, fallbackSize, { tint: visuals.iconTint });
  }, [rightIconId, rightIconSize, iconTintKey]);

  const controlStyle = useMemo(() => {
    const cssVars: CSSProperties = {
      ...(style ?? {}),
    };
    const setVar = (name: string, value: string) => {
      (cssVars as Record<string, string>)[name] = value;
    };

    setVar("--webgl-button-radius", `${visuals.radius}px`);
    setVar("--webgl-button-padding-x", `${visuals.paddingX}px`);
    setVar("--webgl-button-padding-y", `${visuals.paddingY}px`);
    setVar("--webgl-button-gap", `${visuals.gap}px`);
    setVar("--webgl-button-min-height", `${visuals.minHeight}px`);
    setVar("--webgl-button-font-size", `${visuals.fontSize}px`);
    setVar("--webgl-button-icon-size", `${visuals.iconSize}px`);
    setVar("--webgl-button-text-color", visuals.textColor);
    setVar("--webgl-button-fallback-fill", visuals.fallbackFill);
    setVar("--webgl-button-fallback-border", visuals.fallbackBorder);
    setVar("--webgl-control-right-icon-size", `${rightIconSize}px`);

    if (visuals.backgroundUrl) {
      cssVars.backgroundImage = `url(${visuals.backgroundUrl})`;
      cssVars.borderColor = "transparent";
      cssVars.backgroundColor = "transparent";
      cssVars.boxShadow = "none";
    }

    return cssVars;
  }, [visuals, rightIconSize, style]);

  const handlers: ControlHandlers = {
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
    onPointerDown: () => setPressed(true),
    onPointerUp: () => setPressed(false),
    onPointerCancel: () => setPressed(false),
  };

  return {
    controlRef,
    controlStyle,
    state,
    iconSrc,
    rightIconSrc,
    measuredSize,
    setFocused,
    handlers,
  };
};

export type { UseWebGLControlVisualsProps };
