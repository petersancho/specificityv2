import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";

import WebGLButton from "./ui/WebGLButton";
import pageStyles from "./DocumentationNewUsersPage.module.css";
import styles from "./DocumentationPage.module.css";
import DocumentationCodebaseDiagram from "./DocumentationCodebaseDiagram";
import {
  codeSections,
  liveFileOptions,
  type CodeSection,
  type SectionItem,
} from "./documentation/liveCodebaseData";

const openExternal = (url: string) => {
  if (typeof window === "undefined") return;
  window.open(url, "_blank", "noopener,noreferrer");
};


const toRepoUrl = (path: string) => `https://github.com/petersancho/specificityv2/blob/main/${path}`;
const toRawUrl = (path: string) => `https://raw.githubusercontent.com/petersancho/specificityv2/main/${path}`;

const findSectionForPath = (filePath: string): CodeSection | undefined => {
  return codeSections.find((section) =>
    section.items.some((item) => item.path && (filePath === item.path || filePath.startsWith(`${item.path}/`)))
  );
};

const LiveCodebaseSection = () => {
  const [openCards, setOpenCards] = useState<Record<string, boolean>>({});
  const [selectedFilePath, setSelectedFilePath] = useState(liveFileOptions[0].path);
  const [code, setCode] = useState("Loading code…");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"code" | "guidance">("code");
  const codeViewerRef = useRef<HTMLDivElement>(null);

  const selectedFile = useMemo(() => liveFileOptions.find((option) => option.path === selectedFilePath) ?? liveFileOptions[0], [selectedFilePath]);
  const selectedSection = useMemo(() => findSectionForPath(selectedFile.path), [selectedFile.path]);

  useEffect(() => {
    let mounted = true;
    const fetchCode = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(toRawUrl(selectedFile.path));
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const text = await response.text();
        if (mounted) {
          setCode(text);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : String(err));
          setCode("");
          setLoading(false);
        }
      }
    };
    fetchCode();
    return () => {
      mounted = false;
    };
  }, [selectedFile.path]);

  const toggleCard = (title: string) => {
    setOpenCards((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const focusFile = (path: string) => {
    setSelectedFilePath(path);
    setActiveTab("code");
    requestAnimationFrame(() => {
      codeViewerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const handleSelectChange = (event: ChangeEvent<HTMLSelectElement>) => {
    focusFile(event.target.value);
  };

  return (
    <div className={styles.livePage}>
      <div className={pageStyles.hero}>
        <div>
          <p className={pageStyles.kicker}>Live Codebase</p>
          <h1>See the actual files that run Lingua</h1>
          <p>
            Every module listed below links to the real repository paths. Use it as a control panel to
            jump into Roslyn, Numerica, semantics, or the server without hunting.
          </p>
          <p className={pageStyles.heroNotice}>
            <strong>Reminder:</strong> All state flows through <code>useProjectStore</code> and every UI
            element maps to semantic operations.
          </p>
          <div className={pageStyles.actionRow}>
            <WebGLButton
              label="Open LIVE_CODEBASE.md"
              variant="ghost"
              size="sm"
              onClick={() => openExternal(toRepoUrl("docs/LIVE_CODEBASE.md"))}
            />
            <WebGLButton
              label="View Details"
              variant="secondary"
              size="sm"
              onClick={() => openExternal(toRepoUrl("docs/LIVE_CODEBASE_DETAILS.md"))}
            />
          </div>
        </div>
      </div>

      <section className={styles.liveDiagramSection}>
        <h2>Ontology Diagram</h2>
        <p>Drag nodes to reorganize the codebase map. Click a node to focus its first file.</p>
        <DocumentationCodebaseDiagram
          sections={codeSections}
          activeSectionId={selectedSection?.id ?? null}
          onSelectSection={(sectionId: string) => {
            const targetSection = codeSections.find((section) => section.id === sectionId);
            if (!targetSection) return;
            const defaultPath = targetSection.items.find((item: SectionItem) => item.path)?.path;
            if (defaultPath) {
              setOpenCards((prev) => ({ ...prev, [sectionId]: true }));
              focusFile(defaultPath);
            }
          }}
        />
      </section>

      <section className={styles.liveAtlasSection}>
        <div className={styles.liveAtlasHeader}>
          <div>
            <h2>Code Atlas</h2>
            <p>Expand a discipline to open files. Select a file to preview or generate guidance.</p>
          </div>
        </div>
        <div className={styles.liveGrid}>
          {codeSections.map((section: CodeSection, index: number) => {
            const isOpen = openCards[section.title];
            const cardNumber = String(index + 1).padStart(2, "0");
            return (
              <article key={section.title} className={styles.liveCard}>
                <div className={styles.liveCardAccent} aria-hidden="true">
                  <span className={styles.liveCardNumber}>{cardNumber}</span>
                </div>
                <div className={styles.liveCardContent}>
                  <p className={styles.liveCardKicker}>{section.description}</p>
                  <div className={styles.liveCardHeader}>
                    <h3>{section.title}</h3>
                    <WebGLButton
                      label={isOpen ? "Hide files" : "Show files"}
                      variant="ghost"
                      size="xs"
                      aria-expanded={isOpen}
                      aria-controls={`${section.title}-files`}
                      onClick={() => toggleCard(section.title)}
                    />
                  </div>
                  {isOpen && (
                    <ul
                      className={styles.liveFileList}
                      id={`${section.title}-files`}
                      aria-label={`${section.title} files`}
                    >
                      {section.items.map((item: SectionItem) => (
                        <li key={item.label}>
                          <button
                            type="button"
                            className={styles.liveFileButton}
                            onClick={() => item.path && focusFile(item.path)}
                          >
                            <span className={styles.liveCardLabel}>{item.label}</span>
                            <span className={styles.liveCardDetail}>{item.detail}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.liveViewerSection}>
        <div className={styles.liveViewerHeader}>
          <h2>Live Code Viewer</h2>
          <div className={styles.liveTabGroup} role="tablist" aria-label="Live code tabs">
            <button
              type="button"
              className={`${styles.liveTabButton} ${activeTab === "code" ? styles.liveTabButtonActive : ""}`}
              role="tab"
              aria-selected={activeTab === "code"}
              onClick={() => setActiveTab("code")}
            >
              Code
            </button>
            <button
              type="button"
              className={`${styles.liveTabButton} ${activeTab === "guidance" ? styles.liveTabButtonActive : ""}`}
              role="tab"
              aria-selected={activeTab === "guidance"}
              onClick={() => setActiveTab("guidance")}
            >
              Guidance
            </button>
          </div>
        </div>

        <div className={styles.livePanelWrapper}>
          <div className={styles.liveCodeToolbar}>
            <label className={styles.liveCodeLabel}>
              Select file
              <select
                value={selectedFilePath}
                onChange={handleSelectChange}
                className={styles.liveCodeSelect}
                aria-label="Select live code file"
              >
                {liveFileOptions.map((option) => (
                  <option key={option.path} value={option.path}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <WebGLButton label="Open on GitHub" size="sm" onClick={() => openExternal(toRepoUrl(selectedFile.path))} />
          </div>
          {activeTab === "code" ? (
            <div
              ref={codeViewerRef}
              className={styles.liveCodePanel}
              role="tabpanel"
              aria-label="Live code viewer"
            >
              <div className={styles.liveCodeContext}>
                <p className={styles.liveCodeContextKicker}>Current focus</p>
                <h3>{selectedFile.label}</h3>
                <p>{selectedFile.note}</p>
                {selectedSection && (
                  <div className={styles.liveCodeContextNote}>
                    <strong>{selectedSection.title}</strong>
                    <p>{selectedSection.note}</p>
                  </div>
                )}
              </div>
              <div className={styles.liveCodeViewer}>
                {loading && <p className={styles.liveCardDetail}>Loading…</p>}
                {error && !loading && <p className={styles.liveError}>Failed to load: {error}</p>}
                {!loading && !error && (
                  <pre className={styles.liveCodeBlock}>
                    <code>{code}</code>
                  </pre>
                )}
              </div>
            </div>
          ) : (
            <div className={styles.liveGuidancePanel} role="tabpanel" aria-label="Guidance">
              <div>
                <p className={styles.liveCodeContextKicker}>Guidance</p>
                <h3>How to work with {selectedFile.label}</h3>
                <ul className={styles.liveGuidanceList}>
                  <li>
                    <strong>Purpose:</strong> {selectedFile.note}
                  </li>
                  {selectedSection && (
                    <li>
                      <strong>Subsystem:</strong> {selectedSection.title} — {selectedSection.note}
                    </li>
                  )}
                  <li>
                    <strong>Recommended next steps:</strong> Review related files in the same section above, then
                    run <code>pnpm run validate:semantic</code> before shipping changes.
                  </li>
                  <li>
                    <strong>Navigation hint:</strong> Use the “Show files” buttons to open the repo path; keep the code tab pinned.
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default LiveCodebaseSection;
