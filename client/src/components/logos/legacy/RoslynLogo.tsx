import CubeLogo from "./CubeLogo";
import type { CSSProperties } from "react";
import { UI_BASE_COLORS, UI_DOMAIN_COLORS } from "../semantic/uiColorTokens";

type RoslynLogoProps = {
  size?: number;
  withText?: boolean;
  className?: string;
  style?: CSSProperties;
};

const CMYK_COLORS = {
  top: UI_DOMAIN_COLORS.numeric,
  left: UI_DOMAIN_COLORS.logic,
  right: UI_DOMAIN_COLORS.data,
};

const ROSLYN_ACCENT = UI_DOMAIN_COLORS.data;

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
        color: UI_BASE_COLORS.ink,
        letterSpacing: "0.02em"
      }}>
        ROS<span style={{ color: ROSLYN_ACCENT }}>LYN</span>
      </span>
    </div>
  );
};

export default RoslynLogo;
