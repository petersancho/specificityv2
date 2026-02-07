import CubeLogo, { type CubeLogoVariant } from "./CubeLogo";
import type { CSSProperties } from "react";

type NumericaLogoProps = {
  size?: number;
  withText?: boolean;
  variant?: CubeLogoVariant;
  className?: string;
  style?: CSSProperties;
};

const NumericaLogo = ({
  size = 32,
  withText = false,
  variant = "monochrome",
  className,
  style,
}: NumericaLogoProps) => {
  if (!withText) {
    return <CubeLogo size={size} variant={variant} className={className} style={style} />;
  }

  return (
    <div
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        ...style,
      }}
    >
      <CubeLogo size={size} variant={variant} />
      <span
        style={{
          fontFamily: '"GFS Didot", "Montreal Neue"',
          fontSize: `${size * 0.5}px`,
          fontWeight: 700,
          color: "currentColor",
          letterSpacing: "0.02em",
        }}
      >
        NUMERICA
      </span>
    </div>
  );
};

export default NumericaLogo;
