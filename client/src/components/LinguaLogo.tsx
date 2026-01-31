import CubeLogo from "./CubeLogo";
import type { CSSProperties } from "react";

type LinguaLogoProps = {
  size?: number;
  withText?: boolean;
  variant?: "cmyk" | "gradient";
  className?: string;
  style?: CSSProperties;
};

const LinguaLogo = ({ 
  size = 32, 
  withText = false, 
  variant = "cmyk",
  className, 
  style 
}: LinguaLogoProps) => {
  const colors = variant === "cmyk" 
    ? {
        top: "#ffdd00",    // Yellow - creative, warm
        left: "#ff0099",   // Magenta - bold, vibrant
        right: "#00d4ff",  // Cyan - technical, cool
      }
    : {
        top: "#88ff00",    // Lime - fresh
        left: "#8800ff",   // Purple - computational
        right: "#ff6600",  // Orange - energetic
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
        LINGUA
      </span>
    </div>
  );
};

export default LinguaLogo;
