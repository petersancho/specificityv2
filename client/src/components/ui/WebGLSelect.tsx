import {
  type ReactNode,
  type SelectHTMLAttributes,
  type FocusEvent as ReactFocusEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Tooltip, { type TooltipProps } from "./Tooltip";
import styles from "./WebGLControl.module.css";
import { useWebGLControlVisuals } from "./useWebGLControlVisuals";
import type {
  WebGLButtonShape,
  WebGLButtonSize,
  WebGLButtonVariant,
} from "./webglButtonRenderer";
import type { IconId } from "../../webgl/ui/WebGLIconRenderer";

export type WebGLSelectProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  | "size"
  | "onMouseEnter"
  | "onMouseLeave"
  | "onPointerDown"
  | "onPointerUp"
  | "onPointerCancel"
> & {
  label: string;
  iconId: IconId;
  rightIconId?: IconId;
  tooltip?: ReactNode;
  tooltipPosition?: TooltipProps["position"];
  variant?: WebGLButtonVariant;
  size?: WebGLButtonSize;
  shape?: WebGLButtonShape;
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

const WebGLSelect = ({
  label,
  iconId,
  rightIconId = "chevronDown",
  tooltip,
  tooltipPosition = "top",
  variant = "command",
  size = "sm",
  shape = "rounded",
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
  children,
  ...selectProps
}: WebGLSelectProps) => {
  const {
    controlRef,
    controlStyle,
    state,
    iconSrc,
    rightIconSrc,
    setFocused,
    handlers,
  } = useWebGLControlVisuals({
    size,
    variant,
    shape,
    iconId,
    rightIconId,
    disabled,
    style,
  });

  const handleFocus = composeHandler<ReactFocusEvent<HTMLSelectElement>>(
    () => setFocused(true),
    onFocus
  );
  const handleBlur = composeHandler<ReactFocusEvent<HTMLSelectElement>>(
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

  const tooltipContent = tooltip ?? label;

  return (
    <Tooltip content={tooltipContent} position={tooltipPosition}>
      <label
        ref={controlRef}
        className={[styles.control, styles.controlSelectWrapper, className]
          .filter(Boolean)
          .join(" ")}
        style={controlStyle}
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
        <select
          {...selectProps}
          className={styles.controlSelect}
          aria-label={label}
          disabled={disabled}
          onFocus={handleFocus}
          onBlur={handleBlur}
        >
          {children}
        </select>
        {rightIconSrc && (
          <img className={styles.controlIconRight} src={rightIconSrc} alt="" aria-hidden />
        )}
      </label>
    </Tooltip>
  );
};

export default WebGLSelect;
