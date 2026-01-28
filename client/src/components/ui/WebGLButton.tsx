import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type FocusEvent as ReactFocusEvent,
  type ReactNode,
} from "react";
import Tooltip, { type TooltipProps } from "./Tooltip";
import styles from "./WebGLButton.module.css";
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

export type WebGLButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  label: string;
  iconId?: IconId;
  iconTintOverride?: string;
  variant?: WebGLButtonVariant;
  size?: WebGLButtonSize;
  shape?: WebGLButtonShape;
  accentColor?: string;
  active?: boolean;
  hideLabel?: boolean;
  shortLabel?: string;
  tooltip?: ReactNode;
  tooltipPosition?: TooltipProps["position"];
  tooltipShortcut?: string;
  elevated?: boolean;
  children?: ReactNode;
};

type ButtonSize = { width: number; height: number };

const sizeChanged = (a: ButtonSize, b: ButtonSize) => {
  return Math.abs(a.width - b.width) > 0.5 || Math.abs(a.height - b.height) > 0.5;
};

const composeHandlers = <E,>(
  own: (event: E) => void,
  external?: (event: E) => void
) => {
  return (event: E) => {
    own(event);
    external?.(event);
  };
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

export const WebGLButton = ({
  label,
  iconId,
  iconTintOverride,
  variant = "secondary",
  size = "md",
  shape = "auto",
  accentColor,
  active = false,
  hideLabel = false,
  shortLabel,
  tooltip,
  tooltipPosition = "top",
  tooltipShortcut,
  elevated,
  className,
  style,
  disabled,
  onMouseEnter,
  onMouseLeave,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  onBlur,
  onFocus,
  onKeyDown,
  onKeyUp,
  children,
  type = "button",
  title,
  ...buttonProps
}: WebGLButtonProps) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const defaultMinHeight = getDefaultMinHeight(size);
  const [measuredSize, setMeasuredSize] = useState<ButtonSize>({
    width: 0,
    height: defaultMinHeight,
  });
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  useLayoutEffect(() => {
    const button = buttonRef.current;
    if (!button) return;

    const measure = () => {
      const rect = button.getBoundingClientRect();
      const next = {
        width: rect.width,
        height: rect.height || defaultMinHeight,
      };
      setMeasuredSize((prev) => (sizeChanged(prev, next) ? next : prev));
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(button);
    return () => observer.disconnect();
  }, [defaultMinHeight, label, shortLabel, variant, size]);

  useEffect(() => {
    if (disabled) {
      setHovered(false);
      setPressed(false);
    }
  }, [disabled]);

  const visualLabel = shortLabel ?? (typeof children === "string" ? children : label);
  const showLabel = !hideLabel && Boolean(visualLabel);
  const iconOnly = Boolean(iconId) && !showLabel;

  const state = resolveState({ disabled, active, hovered, pressed });

  const visuals = resolveButtonVisuals({
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
  });

  const iconTintKey = `${visuals.iconTint.map((value) => Math.round(value * 255)).join("-")}`;
  const iconUrl = useMemo(() => {
    if (!iconId) return "";
    return resolveIconImageUrl(iconId, visuals.iconSize, visuals.iconTint);
  }, [iconId, visuals.iconSize, iconTintKey]);
  const fallbackIconUrl = useMemo(() => {
    if (!iconId) return "";
    const fallbackSize = Math.max(48, Math.round(visuals.iconSize * 2));
    return renderIconDataUrl(iconId, fallbackSize, { tint: visuals.iconTint });
  }, [iconId, visuals.iconSize, iconTintKey]);
  const iconSrc = iconUrl || fallbackIconUrl;

  const pillClass = shape === "pill" || variant === "chip" || variant === "outliner";
  const squareClass = shape === "square";

  const classes = [
    styles.button,
    iconOnly ? styles.iconOnly : undefined,
    pillClass ? styles.pill : undefined,
    squareClass ? styles.square : undefined,
    className,
  ]
    .filter(Boolean)
    .join(" ");

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

  if (iconOnly && !squareClass && !cssVars.width) {
    cssVars.width = `${visuals.minHeight}px`;
  }

  if (visuals.backgroundUrl) {
    cssVars.backgroundImage = `url(${visuals.backgroundUrl})`;
    cssVars.borderColor = "transparent";
    cssVars.backgroundColor = "transparent";
    cssVars.boxShadow = "none";
  }

  const handleMouseEnter = composeHandlers<ReactMouseEvent<HTMLButtonElement>>(
    () => setHovered(true),
    onMouseEnter
  );
  const handleMouseLeave = composeHandlers<ReactMouseEvent<HTMLButtonElement>>(
    () => {
      setHovered(false);
      setPressed(false);
    },
    onMouseLeave
  );

  const handlePointerDown = composeHandlers<ReactPointerEvent<HTMLButtonElement>>(
    () => setPressed(true),
    onPointerDown
  );
  const handlePointerUp = composeHandlers<ReactPointerEvent<HTMLButtonElement>>(
    () => setPressed(false),
    onPointerUp
  );
  const handlePointerCancel = composeHandlers<ReactPointerEvent<HTMLButtonElement>>(
    () => setPressed(false),
    onPointerCancel
  );

  const handleBlur = composeHandlers<ReactFocusEvent<HTMLButtonElement>>(
    () => {
      setPressed(false);
      setHovered(false);
    },
    onBlur
  );
  const handleFocus = composeHandlers<ReactFocusEvent<HTMLButtonElement>>(
    () => setHovered(true),
    onFocus
  );

  const handleKeyDown = composeHandlers<ReactKeyboardEvent<HTMLButtonElement>>(
    (event) => {
      if (event.key === " " || event.key === "Enter") {
        setPressed(true);
      }
    },
    onKeyDown
  );
  const handleKeyUp = composeHandlers<ReactKeyboardEvent<HTMLButtonElement>>(
    (event) => {
      if (event.key === " " || event.key === "Enter") {
        setPressed(false);
      }
    },
    onKeyUp
  );

  const labelContent = showLabel ? visualLabel : null;
  const labelClasses = [styles.label, shortLabel ? styles.shortLabel : undefined]
    .filter(Boolean)
    .join(" ");

  const resolvedTitle = title ?? (typeof label === "string" ? label : undefined);

  const button = (
    <button
      ref={buttonRef}
      type={type}
      aria-label={label}
      title={resolvedTitle}
      className={classes}
      style={cssVars}
      data-state={state}
      data-active={active ? "true" : "false"}
      data-no-workspace-pan="true"
      disabled={disabled}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onBlur={handleBlur}
      onFocus={handleFocus}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      {...buttonProps}
    >
      {iconId && iconSrc && (
        <img src={iconSrc} className={styles.icon} alt="" aria-hidden="true" draggable={false} />
      )}
      {labelContent && <span className={labelClasses}>{labelContent}</span>}
      {!labelContent && <span className={styles.srOnly}>{label}</span>}
    </button>
  );

  if (!tooltip && !tooltipShortcut) {
    return button;
  }

  return (
    <Tooltip content={tooltip ?? label} position={tooltipPosition} shortcut={tooltipShortcut}>
      {button}
    </Tooltip>
  );
};

export default WebGLButton;
