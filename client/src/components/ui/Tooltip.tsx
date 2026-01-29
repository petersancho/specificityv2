import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import styles from "./Tooltip.module.css";

type TooltipPosition = "top" | "bottom" | "left" | "right";

export type TooltipProps = {
  content: ReactNode;
  children: ReactNode;
  position?: TooltipPosition;
  delay?: number;
  disabled?: boolean;
  shortcut?: string;
  className?: string;
  maxWidth?: number;
  contentClassName?: string;
  triggerClassName?: string;
  triggerStyle?: CSSProperties;
};

const transformMap: Record<TooltipPosition, string> = {
  top: "translate(-50%, -100%)",
  bottom: "translate(-50%, 0)",
  left: "translate(-100%, -50%)",
  right: "translate(0, -50%)",
};

export const Tooltip = ({
  content,
  children,
  position = "top",
  delay = 300,
  disabled = false,
  shortcut,
  className,
  maxWidth,
  contentClassName,
  triggerClassName,
  triggerStyle,
}: TooltipProps) => {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<number | null>(null);

  const calculatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const gap = 8;
    const positions: Record<TooltipPosition, { x: number; y: number }> = {
      top: { x: rect.left + rect.width / 2, y: rect.top - gap },
      bottom: { x: rect.left + rect.width / 2, y: rect.bottom + gap },
      left: { x: rect.left - gap, y: rect.top + rect.height / 2 },
      right: { x: rect.right + gap, y: rect.top + rect.height / 2 },
    };
    setCoords(positions[position]);
  };

  const show = () => {
    if (disabled) return;
    timeoutRef.current = window.setTimeout(() => {
      calculatePosition();
      setVisible(true);
    }, delay);
  };

  const hide = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const tooltipStyle: CSSProperties = {
    left: coords.x,
    top: coords.y,
    transform: transformMap[position],
  };
  const contentStyle: CSSProperties | undefined =
    typeof maxWidth === "number" ? { maxWidth: `${maxWidth}px` } : undefined;

  return (
    <>
      <div
        ref={triggerRef}
        className={`${styles.trigger} ${triggerClassName ?? ""}`}
        style={triggerStyle}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        {children}
      </div>
      {visible &&
        createPortal(
          <div
            className={`${styles.tooltip} ${styles[position]} ${className ?? ""}`}
            style={tooltipStyle}
            role="tooltip"
            aria-hidden={!visible}
          >
            <div className={styles.content}>
              <span
                className={`${styles.text} ${contentClassName ?? ""}`}
                style={contentStyle}
              >
                {content}
              </span>
              {shortcut && <kbd className={styles.shortcut}>{shortcut}</kbd>}
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default Tooltip;
