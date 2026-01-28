import {
  useMemo,
  type ChangeEvent,
  type CSSProperties,
  type FocusEvent as ReactFocusEvent,
  type InputHTMLAttributes,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Tooltip from "./Tooltip";
import styles from "./WebGLControl.module.css";
import { useWebGLControlVisuals } from "./useWebGLControlVisuals";
import {
  renderSliderOverlay,
  type WebGLButtonShape,
  type WebGLButtonSize,
  type WebGLButtonVariant,
} from "./webglButtonRenderer";
import type { IconId } from "../../webgl/ui/WebGLIconRenderer";

export type WebGLSliderProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  | "size"
  | "value"
  | "onChange"
  | "type"
  | "onMouseEnter"
  | "onMouseLeave"
  | "onPointerDown"
  | "onPointerUp"
  | "onPointerCancel"
> & {
  label: string;
  iconId?: IconId;
  tooltip?: string;
  tooltipPosition?: "top" | "bottom" | "left" | "right";
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  variant?: WebGLButtonVariant;
  size?: WebGLButtonSize;
  shape?: WebGLButtonShape;
  accentColor?: string;
  className?: string;
  style?: CSSProperties;
  disabled?: boolean;
  onMouseEnter?: (event: ReactMouseEvent<HTMLLabelElement>) => void;
  onMouseLeave?: (event: ReactMouseEvent<HTMLLabelElement>) => void;
  onPointerDown?: (event: ReactPointerEvent<HTMLLabelElement>) => void;
  onPointerUp?: (event: ReactPointerEvent<HTMLLabelElement>) => void;
  onPointerCancel?: (event: ReactPointerEvent<HTMLLabelElement>) => void;
};

const composeHandler = <E,>(
  own: (event: E) => void,
  external?: (event: E) => void
) => {
  return (event: E) => {
    own(event);
    external?.(event);
  };
};

const WebGLSlider = ({
  label,
  iconId,
  tooltip,
  tooltipPosition = "top",
  value,
  min = 0,
  max = 1,
  step = 0.01,
  onChange,
  variant = "command",
  size = "sm",
  shape = "rounded",
  accentColor,
  className,
  style,
  disabled,
  onFocus,
  onBlur,
  onMouseEnter,
  onMouseLeave,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  ...inputProps
}: WebGLSliderProps) => {
  const {
    controlRef,
    controlStyle,
    state,
    iconSrc,
    measuredSize,
    setFocused,
    handlers,
  } = useWebGLControlVisuals({
    size,
    variant,
    shape,
    iconId,
    accentColor,
    disabled,
    style,
  });

  const normalized = useMemo(() => {
    if (max <= min) return 0;
    return Math.max(0, Math.min(1, (value - min) / (max - min)));
  }, [value, min, max]);

  const overlayUrl = useMemo(() => {
    if (!measuredSize.width || !measuredSize.height) return "";
    return renderSliderOverlay({
      width: measuredSize.width,
      height: measuredSize.height,
      value: normalized,
      variant,
      state,
      accentColor,
    });
  }, [measuredSize.width, measuredSize.height, normalized, variant, state, accentColor]);

  const mergedStyle = useMemo(() => {
    const baseBackground = controlStyle.backgroundImage;
    if (!overlayUrl) return controlStyle;
    const next: CSSProperties = { ...controlStyle };
    next.backgroundImage = baseBackground
      ? `url(${overlayUrl}), ${baseBackground}`
      : `url(${overlayUrl})`;
    next.backgroundSize = "100% 100%";
    return next;
  }, [controlStyle, overlayUrl]);

  const handleFocus = composeHandler<ReactFocusEvent<HTMLInputElement>>(
    () => setFocused(true),
    onFocus
  );
  const handleBlur = composeHandler<ReactFocusEvent<HTMLInputElement>>(
    () => setFocused(false),
    onBlur
  );

  const rootMouseEnter = composeHandler<ReactMouseEvent<HTMLLabelElement>>(
    handlers.onMouseEnter,
    onMouseEnter
  );
  const rootMouseLeave = composeHandler<ReactMouseEvent<HTMLLabelElement>>(
    handlers.onMouseLeave,
    onMouseLeave
  );
  const rootPointerDown = composeHandler<ReactPointerEvent<HTMLLabelElement>>(
    handlers.onPointerDown,
    onPointerDown
  );
  const rootPointerUp = composeHandler<ReactPointerEvent<HTMLLabelElement>>(
    handlers.onPointerUp,
    onPointerUp
  );
  const rootPointerCancel = composeHandler<ReactPointerEvent<HTMLLabelElement>>(
    handlers.onPointerCancel,
    onPointerCancel
  );

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = Number(event.target.value);
    if (Number.isFinite(next)) {
      onChange(next);
    }
  };

  const tooltipContent = tooltip ?? label;

  return (
    <Tooltip content={tooltipContent} position={tooltipPosition}>
      <label
        ref={controlRef}
        className={[styles.control, styles.slider, className].filter(Boolean).join(" ")}
        style={mergedStyle}
        data-state={state}
        data-disabled={disabled ? "true" : "false"}
        onMouseEnter={rootMouseEnter}
        onMouseLeave={rootMouseLeave}
        onPointerDown={rootPointerDown}
        onPointerUp={rootPointerUp}
        onPointerCancel={rootPointerCancel}
      >
        <span className={styles.srOnly}>{label}</span>
        {iconSrc && <img className={styles.controlIcon} src={iconSrc} alt="" aria-hidden />}
        <input
          {...inputProps}
          className={styles.sliderInput}
          type="range"
          aria-label={label}
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      </label>
    </Tooltip>
  );
};

export default WebGLSlider;
