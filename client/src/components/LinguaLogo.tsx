import CubeLogo, { type CubeLogoVariant } from "./CubeLogo";
import type { CSSProperties } from "react";

type LinguaLogoProps = {
  size?: number;
  withText?: boolean;
  variant?: CubeLogoVariant;
  className?: string;
  style?: CSSProperties;
};

const LinguaLogo = ({
  size = 32,
  withText = false,
  variant = "monochrome",
  className,
  style,
}: LinguaLogoProps) => {
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
          fontFamily: '"Montreal Neue", "Space Grotesk", sans-serif',
          fontSize: `${size * 0.5}px`,
          fontWeight: 700,
          color: "currentColor",
          letterSpacing: "0.02em",
        }}
      >
        LINGUA
      </span>
    </div>
  );
};

export default LinguaLogo;
