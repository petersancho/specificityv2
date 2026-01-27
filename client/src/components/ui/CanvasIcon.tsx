import { useMemo } from "react";
import { renderIconDataUrl, type IconId } from "../../webgl/ui/WebGLIconRenderer";

type CanvasIconProps = {
  iconId: IconId;
  size?: number;
  className?: string;
  alt?: string;
};

const CanvasIcon = ({ iconId, size = 28, className, alt = "" }: CanvasIconProps) => {
  const iconSize = Math.max(48, Math.round(size * 2));
  const src = useMemo(() => renderIconDataUrl(iconId, iconSize), [iconId, iconSize]);
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
