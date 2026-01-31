import CubeLogo from "./CubeLogo";
import type { CSSProperties } from "react";

type RoslynLogoProps = {
  size?: number;
  withText?: boolean;
  className?: string;
  style?: CSSProperties;
};

const RoslynLogo = ({ size = 32, withText = false, className, style }: RoslynLogoProps) => {
  const colors = {
    top: "#00d4ff",    // Cyan - 3D modeling, technical
    left: "#0099cc",   // Cyan Deep
    right: "#66e5ff",  // Cyan Soft
  };

  if (!withText) {
    return <CubeLogo size={size} colors={colors} className={className} style={style} />;
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
      <CubeLogo size={size} colors={colors} />
      <span style={{
        fontFamily: '"Montreal Neue", "Space Grotesk", sans-serif',
        fontSize: `${size * 0.5}px`,
        fontWeight: 700,
        color: "#000000",
        letterSpacing: "0.02em"
      }}>
        ROSLYN
      </span>
    </div>
  );
};

export default RoslynLogo;
