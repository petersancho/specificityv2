import CubeLogo from "./CubeLogo";
import type { CSSProperties } from "react";
import { UI_BASE_COLORS, UI_DOMAIN_COLORS } from "../semantic/uiColorTokens";

type LinguaLogoProps = {
  size?: number;
  withText?: boolean;
  variant?: "cmyk" | "gradient";
  className?: string;
  style?: CSSProperties;
};

const LINGUA_ACCENT = UI_DOMAIN_COLORS.data;

const LinguaLogo = ({ 
  size = 32, 
  withText = false, 
  variant = "cmyk",
  className, 
  style 
}: LinguaLogoProps) => {
  const colors = variant === "cmyk" 
    ? {
        top: UI_DOMAIN_COLORS.numeric,
        left: UI_DOMAIN_COLORS.logic,
        right: UI_DOMAIN_COLORS.data,
      }
    : {
        top: UI_DOMAIN_COLORS.numeric,
        left: UI_DOMAIN_COLORS.logic,
        right: UI_DOMAIN_COLORS.data,
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
        color: UI_BASE_COLORS.ink,
        letterSpacing: "0.02em"
      }}>
        LING<span style={{ color: LINGUA_ACCENT, fontWeight: 800 }}>UA</span>
      </span>
    </div>
  );
};

export default LinguaLogo;
