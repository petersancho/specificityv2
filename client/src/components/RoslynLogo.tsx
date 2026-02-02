import CubeLogo from "./CubeLogo";
import type { CSSProperties } from "react";

type RoslynLogoProps = {
  size?: number;
  withText?: boolean;
  className?: string;
  style?: CSSProperties;
};

const CMYK_COLORS = {
  top: "#ffdd00",
  left: "#ff0099",
  right: "#00d4ff",
};

const ROSLYN_ACCENT = "#00d4ff";

const RoslynLogo = ({ size = 32, withText = false, className, style }: RoslynLogoProps) => {
  if (!withText) {
    return <CubeLogo size={size} colors={CMYK_COLORS} className={className} style={style} />;
  }

  return (
    <div 
      className={className}
      style={{ 
        display: "inline-flex", 
        alignItems: "center", 
        gap: "8px",
        ...style 
      }}
    >
      <CubeLogo size={size} colors={CMYK_COLORS} />
      <span style={{
        fontFamily: '"Montreal Neue", "Space Grotesk", sans-serif',
        fontSize: `${size * 0.5}px`,
        fontWeight: 700,
        color: "#1f1f22",
        letterSpacing: "0.02em"
      }}>
        ROS<span style={{ color: ROSLYN_ACCENT }}>LYN</span>
      </span>
    </div>
  );
};

export default RoslynLogo;
