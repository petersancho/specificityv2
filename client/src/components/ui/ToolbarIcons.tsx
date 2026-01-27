import type { SVGProps } from "react";

const iconProps: SVGProps<SVGSVGElement> = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

export type ToolbarIconName =
  | "brandRoslyn"
  | "brandNumerica"
  | "live"
  | "camera"
  | "add"
  | "focus"
  | "frameAll"
  | "undo"
  | "redo"
  | "component"
  | "prune";

export const ToolbarIcon = ({ name }: { name: ToolbarIconName }) => {
  switch (name) {
    case "brandRoslyn":
      return (
        <svg {...iconProps}>
          <path d="M5 4h14v14H5z" />
          <path d="M9 8h6v6H9z" />
          <path d="M5 12h4M15 12h4" />
        </svg>
      );
    case "brandNumerica":
      return (
        <svg {...iconProps}>
          <circle cx="7" cy="7" r="2.2" />
          <circle cx="17" cy="7" r="2.2" />
          <circle cx="12" cy="17" r="2.2" />
          <path d="M8.8 8.6 10.8 15M15.2 8.6 13.2 15M9.2 7h5.6" />
        </svg>
      );
    case "live":
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="7.5" />
          <circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none" />
          <path d="M4.5 12h2.5M17 12h2.5" />
        </svg>
      );
    case "camera":
      return (
        <svg {...iconProps}>
          <rect x="4" y="7" width="16" height="12" rx="2.4" />
          <path d="M8.5 7 10 4.8h4L15.5 7" />
          <circle cx="12" cy="13" r="3.2" />
        </svg>
      );
    case "add":
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v8M8 12h8" />
        </svg>
      );
    case "focus":
      return (
        <svg {...iconProps}>
          <path d="M4 9V5h4M20 9V5h-4M4 15v4h4M20 15v4h-4" />
          <circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none" />
        </svg>
      );
    case "frameAll":
      return (
        <svg {...iconProps}>
          <rect x="5" y="5" width="14" height="14" rx="2" />
          <path d="M9 9h6v6H9z" />
          <path d="M2.5 12h2M19.5 12h2M12 2.5v2M12 19.5v2" />
        </svg>
      );
    case "undo":
      return (
        <svg {...iconProps}>
          <path d="M9 7 4.5 11.5 9 16" />
          <path d="M5 11.5h8.5a5.5 5.5 0 1 1 0 11H10" />
        </svg>
      );
    case "redo":
      return (
        <svg {...iconProps}>
          <path d="m15 7 4.5 4.5L15 16" />
          <path d="M19 11.5h-8.5a5.5 5.5 0 1 0 0 11H14" />
        </svg>
      );
    case "component":
      return (
        <svg {...iconProps}>
          <rect x="4.5" y="5" width="15" height="14" rx="2.2" />
          <path d="M4.5 10.5h15M10 5v14" />
          <circle cx="7.3" cy="7.7" r="1" fill="currentColor" stroke="none" />
          <circle cx="13.7" cy="13.7" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "prune":
      return (
        <svg {...iconProps}>
          <path d="M5 7h14M7.5 7l1.2 12h6.6L16.5 7" />
          <path d="M9.5 7V4.8h5V7" />
          <path d="M10 11.5h4M10.8 15h2.4" />
        </svg>
      );
    default:
      return null;
  }
};

export default ToolbarIcon;

