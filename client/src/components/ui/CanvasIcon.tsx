import { useMemo } from "react";
import { renderIconDataUrl, type IconId } from "../../webgl/ui/WebGLIconRenderer";
import type { RGBA } from "../../webgl/ui/WebGLUIRenderer";

type CanvasIconProps = {
  iconId: IconId;
  size?: number;
  className?: string;
  alt?: string;
  tint?: RGBA;
};

const CanvasIcon = ({
  iconId,
  size = 28,
  className,
  alt = "",
  tint,
}: CanvasIconProps) => {
  const iconSize = Math.max(128, Math.round(size * 6));
  const tintKey = tint ? tint.map((value) => Math.round(value * 255)).join("-") : "default";
  const src = useMemo(
    () => renderIconDataUrl(iconId, iconSize, { tint }),
    [iconId, iconSize, tintKey]
  );
  return (
    <img
      src={src}
      width={size}
      height={size}
      className={className}
      alt={alt}
      draggable={false}
    />
  );
};

export default CanvasIcon;
