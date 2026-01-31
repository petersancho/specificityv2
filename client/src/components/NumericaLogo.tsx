import CubeLogo from "./CubeLogo";
import type { CSSProperties } from "react";

type NumericaLogoProps = {
  size?: number;
  withText?: boolean;
  className?: string;
  style?: CSSProperties;
};

const NumericaLogo = ({ size = 32, withText = false, className, style }: NumericaLogoProps) => {
  const colors = {
    top: "#8800ff",    // Electric Purple - computational, parametric
    left: "#6600cc",   // Purple Deep
    right: "#b366ff",  // Purple Soft
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
        NUMERICA
      </span>
    </div>
  );
};

export default NumericaLogo;
