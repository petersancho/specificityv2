import type { CSSProperties, ReactNode } from "react";
import styles from "./TooltipCard.module.css";

type TooltipCardProps = {
  title: string;
  subtitle?: string;
  description?: string;
  semantic?: string;
  kindLabel?: string;
  categoryLabel?: string;
  accentColor?: string;
  href?: string;
  linkLabel?: string;
  shortcut?: string;
  extra?: ReactNode;
};

const TooltipCard = ({
  title,
  subtitle,
  description,
  semantic,
  kindLabel,
  categoryLabel,
  accentColor,
  href,
  linkLabel = "Open docs",
  shortcut,
  extra,
}: TooltipCardProps) => {
  const badges = [kindLabel, categoryLabel].filter(
    (label, index, list): label is string =>
      Boolean(label) && list.indexOf(label) === index
  );

  const style: CSSProperties | undefined = accentColor
    ? ({ ["--tooltip-accent" as string]: accentColor } as CSSProperties)
    : undefined;

  return (
    <div className={styles.card} style={style}>
      <div className={styles.header}>
        <span className={styles.title}>{title}</span>
        {shortcut && <kbd className={styles.shortcut}>{shortcut}</kbd>}
      </div>
      {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
      {badges.length > 0 && (
        <div className={styles.meta}>
          {badges.map((badge) => (
            <span key={badge} className={styles.badge}>
              {badge}
            </span>
          ))}
        </div>
      )}
      {semantic && (
        <div className={styles.semantic}>
          <span className={styles.semanticLabel}>Semantics</span>
          <span className={styles.semanticText}>{semantic}</span>
        </div>
      )}
      {description && <div className={styles.description}>{description}</div>}
      {extra}
      {href && (
        <a className={styles.link} href={href}>
          {linkLabel}
          <span aria-hidden="true">-&gt;</span>
        </a>
      )}
    </div>
  );
};

export default TooltipCard;
