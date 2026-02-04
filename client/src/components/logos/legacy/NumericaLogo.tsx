import CubeLogo from "./CubeLogo";
import type { CSSProperties } from "react";
import { UI_BASE_COLORS, UI_DOMAIN_COLORS } from "../semantic/uiColorTokens";

type NumericaLogoProps = {
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

const NUMERICA_ACCENT = UI_DOMAIN_COLORS.logic;

const NumericaLogo = ({ size = 32, withText = false, className, style }: NumericaLogoProps) => {
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
        NUME<span style={{ color: NUMERICA_ACCENT }}>RICA</span>
      </span>
    </div>
  );
};

export default NumericaLogo;
