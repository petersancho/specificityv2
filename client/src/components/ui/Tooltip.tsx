import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
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
  interactive?: boolean;
  className?: string;
  maxWidth?: number;
  contentClassName?: string;
  triggerClassName?: string;
  triggerStyle?: CSSProperties;
  boundaryRef?: RefObject<HTMLElement | null>;
  boundaryPadding?: number;
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
  interactive = false,
  className,
  maxWidth,
  contentClassName,
  triggerClassName,
  triggerStyle,
  boundaryRef,
  boundaryPadding = 6,
}: TooltipProps) => {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [resolvedPosition, setResolvedPosition] = useState<TooltipPosition>(position);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<number | null>(null);
  const hideTimeoutRef = useRef<number | null>(null);
  const hoveringTriggerRef = useRef(false);
  const hoveringTooltipRef = useRef(false);

  const gap = 8;
  const getAnchorPoint = (rect: DOMRect, anchorPosition: TooltipPosition) => {
    switch (anchorPosition) {
      case "top":
        return { x: rect.left + rect.width / 2, y: rect.top - gap };
      case "bottom":
        return { x: rect.left + rect.width / 2, y: rect.bottom + gap };
      case "left":
        return { x: rect.left - gap, y: rect.top + rect.height / 2 };
      case "right":
      default:
        return { x: rect.right + gap, y: rect.top + rect.height / 2 };
    }
  };

  const clearShowTimeout = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const clearHideTimeout = () => {
    if (hideTimeoutRef.current) {
      window.clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  };

  const show = () => {
    if (disabled) return;
    clearShowTimeout();
    clearHideTimeout();
    timeoutRef.current = window.setTimeout(() => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) {
        setCoords(getAnchorPoint(rect, position));
      }
      setResolvedPosition(position);
      setVisible(true);
    }, delay);
  };

  const scheduleHide = () => {
    clearShowTimeout();
    if (!interactive) {
      setVisible(false);
      return;
    }
    clearHideTimeout();
    hideTimeoutRef.current = window.setTimeout(() => {
      if (!hoveringTriggerRef.current && !hoveringTooltipRef.current) {
        setVisible(false);
      }
    }, 120);
  };

  const handleTriggerEnter = () => {
    hoveringTriggerRef.current = true;
    show();
  };

  const handleTriggerLeave = () => {
    hoveringTriggerRef.current = false;
    scheduleHide();
  };

  const handleTooltipEnter = () => {
    hoveringTooltipRef.current = true;
    clearHideTimeout();
  };

  const handleTooltipLeave = () => {
    hoveringTooltipRef.current = false;
    scheduleHide();
  };

  useEffect(() => {
    return () => {
      clearShowTimeout();
      clearHideTimeout();
    };
  }, []);

  useLayoutEffect(() => {
    if (!visible) return;
    const trigger = triggerRef.current;
    const tooltip = tooltipRef.current;
    if (!trigger || !tooltip) return;

    const rect = trigger.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const width = tooltipRect.width;
    const height = tooltipRect.height;
    if (!width || !height) return;

    const boundaryRect = boundaryRef?.current?.getBoundingClientRect();
    const bounds = boundaryRect ?? {
      left: 0,
      top: 0,
      right: window.innerWidth,
      bottom: window.innerHeight,
    };
    const minLeft = bounds.left + boundaryPadding;
    const maxRight = bounds.right - boundaryPadding;
    const minTop = bounds.top + boundaryPadding;
    const maxBottom = bounds.bottom - boundaryPadding;

    const getBox = (anchorPosition: TooltipPosition) => {
      const anchor = getAnchorPoint(rect, anchorPosition);
      let left = anchor.x;
      let top = anchor.y;
      switch (anchorPosition) {
        case "top":
          left -= width / 2;
          top -= height;
          break;
        case "bottom":
          left -= width / 2;
          break;
        case "left":
          left -= width;
          top -= height / 2;
          break;
        case "right":
        default:
          top -= height / 2;
          break;
      }
      return {
        anchor,
        left,
        top,
        right: left + width,
        bottom: top + height,
      };
    };

    const overflowScore = (box: ReturnType<typeof getBox>) => {
      const leftOverflow = Math.max(0, minLeft - box.left);
      const rightOverflow = Math.max(0, box.right - maxRight);
      const topOverflow = Math.max(0, minTop - box.top);
      const bottomOverflow = Math.max(0, box.bottom - maxBottom);
      return leftOverflow + rightOverflow + topOverflow + bottomOverflow;
    };

    const opposite: Record<TooltipPosition, TooltipPosition> = {
      top: "bottom",
      bottom: "top",
      left: "right",
      right: "left",
    };

    const candidates = [
      position,
      opposite[position],
      "top" as TooltipPosition,
      "bottom" as TooltipPosition,
      "left" as TooltipPosition,
      "right" as TooltipPosition,
    ].filter(
      (candidate, index, all) => all.indexOf(candidate) === index
    ) as TooltipPosition[];

    let best = candidates[0];
    let bestScore = Number.POSITIVE_INFINITY;
    for (const candidate of candidates) {
      const box = getBox(candidate);
      const score = overflowScore(box);
      if (score === 0) {
        best = candidate;
        bestScore = 0;
        break;
      }
      if (score < bestScore) {
        bestScore = score;
        best = candidate;
      }
    }

    const bestBox = getBox(best);
    let shiftX = 0;
    let shiftY = 0;
    if (bestBox.left < minLeft) {
      shiftX = minLeft - bestBox.left;
    } else if (bestBox.right > maxRight) {
      shiftX = maxRight - bestBox.right;
    }
    if (bestBox.top < minTop) {
      shiftY = minTop - bestBox.top;
    } else if (bestBox.bottom > maxBottom) {
      shiftY = maxBottom - bestBox.bottom;
    }

    const nextCoords = {
      x: bestBox.anchor.x + shiftX,
      y: bestBox.anchor.y + shiftY,
    };

    setResolvedPosition((prev) => (prev !== best ? best : prev));
    setCoords((prev) =>
      Math.abs(prev.x - nextCoords.x) > 0.5 || Math.abs(prev.y - nextCoords.y) > 0.5
        ? nextCoords
        : prev
    );
  }, [visible, position, boundaryRef, boundaryPadding, content, maxWidth]);

  const tooltipStyle: CSSProperties = {
    left: coords.x,
    top: coords.y,
    transform: transformMap[resolvedPosition],
  };
  const contentStyle: CSSProperties | undefined =
    typeof maxWidth === "number" ? { maxWidth: `${maxWidth}px` } : undefined;

  return (
    <>
      <div
        ref={triggerRef}
        className={`${styles.trigger} ${triggerClassName ?? ""}`}
        style={triggerStyle}
        onMouseEnter={handleTriggerEnter}
        onMouseLeave={handleTriggerLeave}
        onFocus={handleTriggerEnter}
        onBlur={handleTriggerLeave}
      >
        {children}
      </div>
      {visible &&
        createPortal(
          <div
            ref={tooltipRef}
            className={`${styles.tooltip} ${styles[resolvedPosition]} ${className ?? ""}`}
            style={tooltipStyle}
            role="tooltip"
            aria-hidden={!visible}
            data-interactive={interactive ? "true" : "false"}
            onMouseEnter={handleTooltipEnter}
            onMouseLeave={handleTooltipLeave}
          >
            <div className={styles.content}>
              <div
                className={`${styles.text} ${contentClassName ?? ""}`}
                style={contentStyle}
              >
                {content}
              </div>
              {shortcut && <kbd className={styles.shortcut}>{shortcut}</kbd>}
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default Tooltip;
