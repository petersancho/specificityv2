import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import WebGLButton from "./WebGLButton";
import type { WebGLButtonVariant } from "./webglButtonRenderer";
import type { IconId } from "../../webgl/ui/WebGLIconRenderer";
import type { TooltipProps } from "./Tooltip";

type IconButtonSize = "sm" | "md" | "lg";

export type IconButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> & {
  iconId: IconId;
  label: string;
  active?: boolean;
  size?: IconButtonSize;
  accentColor?: string;
  variant?: WebGLButtonVariant;
  elevated?: boolean;
  tooltip?: ReactNode;
  tooltipPosition?: TooltipProps["position"];
  tooltipShortcut?: string;
};

const sizePxMap: Record<IconButtonSize, number> = {
  sm: 40,
  md: 44,
  lg: 48,
};

const sizeMap: Record<IconButtonSize, "sm" | "md" | "lg"> = {
  sm: "sm",
  md: "md",
  lg: "lg",
};

export const IconButton = ({
  iconId,
  label,
  active = false,
  size = "md",
  accentColor,
  variant = "icon",
  elevated,
  style,
  ...buttonProps
}: IconButtonProps) => {
  const dimension = sizePxMap[size];
  const mergedStyle: CSSProperties = { ...(style ?? {}) };
  if (mergedStyle.width === undefined) mergedStyle.width = dimension;
  if (mergedStyle.height === undefined) mergedStyle.height = dimension;

  return (
    <WebGLButton
      {...buttonProps}
      style={mergedStyle}
      label={label}
      iconId={iconId}
      hideLabel
      active={active}
      size={sizeMap[size]}
      variant={variant}
      shape="square"
      accentColor={accentColor}
      elevated={elevated}
    />
  );
};

export default IconButton;
