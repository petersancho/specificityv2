import CubeLogo from "./CubeLogo";
import type { CSSProperties } from "react";

type NumericaLogoProps = {
  size?: number;
  withText?: boolean;
  variant?: "mono" | "cmyk";
  className?: string;
  style?: CSSProperties;
};

const NumericaLogo = ({
  size = 32,
  withText = false,
  variant = "mono",
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
          fontFamily: '"Montreal Neue", "Space Grotesk", sans-serif',
          fontSize: `${size * 0.5}px`,
          fontWeight: 700,
          color: "var(--color-text)",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        Numerica
      </span>
    </div>
  );
};

export default NumericaLogo;
