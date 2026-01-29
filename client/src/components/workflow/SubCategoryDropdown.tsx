import { useMemo, useState } from "react";
import Tooltip from "../ui/Tooltip";
import StickerIcon from "../ui/StickerIcon";
import type { NodeType } from "../../store/useProjectStore";
import type { IconId } from "../../webgl/ui/WebGLIconRenderer";
import styles from "./SubCategoryDropdown.module.css";
import { createIconSignature } from "./iconSignature";

export type SolverInputNode = {
  type: NodeType;
  iconId?: IconId;
  nameGreek?: string;
  nameEnglish: string;
  romanization?: string;
  description?: string;
};

export type SolverInputSubCategory = {
  nameGreek: string;
  translation: string;
  romanization?: string;
  description?: string;
  subSubCategories: Array<{
    name: string;
    nodes: SolverInputNode[];
  }>;
};

export type SubCategoryDropdownProps = {
  subCategory: SolverInputSubCategory;
  onSelectNode: (type: NodeType, event?: React.MouseEvent | React.PointerEvent) => void;
};

const STICKER_SIZE = 384;
const GOAL_TINTS: Record<string, string> = {
  "Physics Goals": "#0000FF",
  "Biological Goals": "#00FF00",
  "Chemistry Goals": "#00FFFF",
};

const buildTooltipContent = (node: SolverInputNode) => {
  return (
    <span className={styles.tooltipContent}>
      {node.nameGreek && <span className={styles.tooltipGreek}>{node.nameGreek}</span>}
      {node.romanization && (
        <span className={styles.tooltipRomanization}>({node.romanization})</span>
      )}
      <span className={styles.tooltipTranslation}>{node.nameEnglish}</span>
      {node.description && (
        <span className={styles.tooltipDescription}>{node.description}</span>
      )}
    </span>
  );
};

export const SubCategoryDropdown = ({
  subCategory,
  onSelectNode,
}: SubCategoryDropdownProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedSubSub, setExpandedSubSub] = useState<Set<string>>(new Set());
  const signatures = useMemo(() => {
    const map = new Map<string, string>();
    subCategory.subSubCategories.forEach((subSub) => {
      subSub.nodes.forEach((node) => {
        if (!node.iconId) return;
        map.set(node.type, createIconSignature(node.type));
      });
    });
    return map;
  }, [subCategory]);

  const toggleSubSub = (name: string) => {
    setExpandedSubSub((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const header = (
    <button
      type="button"
      className={styles.header}
      onClick={() => setIsExpanded((prev) => !prev)}
      aria-expanded={isExpanded}
    >
      <div className={styles.headerText}>
        <span className={styles.greek}>{subCategory.nameGreek}</span>
        {subCategory.romanization && (
          <span className={styles.romanization}>({subCategory.romanization})</span>
        )}
        <span className={styles.translation}>{subCategory.translation}</span>
      </div>
      <span className={styles.arrow}>{isExpanded ? "▴" : "▾"}</span>
    </button>
  );

  return (
    <div className={styles.dropdown}>
      <Tooltip
        content={
          <span className={styles.categoryTooltip}>
            <span className={styles.tooltipGreek}>{subCategory.nameGreek}</span>
            {subCategory.romanization && (
              <span className={styles.tooltipRomanization}>
                ({subCategory.romanization})
              </span>
            )}
            <span className={styles.tooltipTranslation}>{subCategory.translation}</span>
            {subCategory.description && (
              <span className={styles.tooltipDescription}>{subCategory.description}</span>
            )}
          </span>
        }
        position="right"
      >
        {header}
      </Tooltip>

      {isExpanded && (
        <div className={styles.content}>
          {subCategory.subSubCategories.map((subSub) => {
            const isOpen = expandedSubSub.has(subSub.name);
            return (
              <div key={subSub.name} className={styles.subSubCategory}>
                <button
                  type="button"
                  className={styles.subSubHeader}
                  onClick={() => toggleSubSub(subSub.name)}
                  aria-expanded={isOpen}
                >
                  <span className={styles.subSubArrow}>{isOpen ? "▾" : "▸"}</span>
                  <span className={styles.subSubTitle}>{subSub.name}</span>
                </button>
                {isOpen && (
                  <div className={styles.nodeList}>
                    {subSub.nodes.length === 0 ? (
                      <div className={styles.empty}>No goals yet.</div>
                    ) : (
                      subSub.nodes.map((node) => {
                        const stickerTint = GOAL_TINTS[subSub.name];
                        const signature = signatures.get(node.type);
                        return (
                          <Tooltip
                            key={node.type}
                            content={buildTooltipContent(node)}
                            position="right"
                            delay={300}
                          >
                            <button
                              type="button"
                              className={styles.nodeButton}
                              onPointerDown={(event) => onSelectNode(node.type, event)}
                              onClick={(event) => onSelectNode(node.type, event)}
                            >
                              {node.iconId && (
                                <span className={styles.sticker} aria-hidden="true">
                                  <StickerIcon
                                    iconId={node.iconId}
                                    variant="library"
                                    size={STICKER_SIZE}
                                    tint={stickerTint}
                                    signature={signature}
                                    className={styles.stickerIcon}
                                    ariaHidden
                                  />
                                </span>
                              )}
                              <div className={styles.nodeName}>
                                {node.nameGreek && (
                                  <span className={styles.greek}>{node.nameGreek}</span>
                                )}
                                <span className={styles.english}>{node.nameEnglish}</span>
                              </div>
                            </button>
                          </Tooltip>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
