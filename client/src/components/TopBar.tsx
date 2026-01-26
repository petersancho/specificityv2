import logoSpecificitySymbol from "../assets/logo-specificity-symbol.svg";
import styles from "./TopBar.module.css";

type SaveEntry = {
  id: string;
  name: string;
  savedAt: string;
};

type Theme = "light" | "dark";

type TopBarProps = {
  saves: SaveEntry[];
  selectedSaveId: string;
  status: string;
  projectName: string;
  onProjectNameChange: (value: string) => void;
  onSave: () => void;
  onLoad: () => void;
  onSelectSave: (value: string) => void;
  theme: Theme;
  onToggleTheme: () => void;
};

const TopBar = ({
  saves,
  selectedSaveId,
  status,
  projectName,
  onProjectNameChange,
  onSave,
  onLoad,
  onSelectSave,
  theme,
  onToggleTheme,
}: TopBarProps) => {
  return (
    <header className={styles.topBar}>
      <div className={styles.controls}>
        <label className={styles.projectField}>
          <span>Script</span>
          <input
            value={projectName}
            onChange={(event) => onProjectNameChange(event.target.value)}
            aria-label="Script name"
          />
        </label>
        <button className={styles.primary} onClick={onSave}>
          Save Script
        </button>
        <div className={styles.loadGroup}>
          <select
            value={selectedSaveId}
            onChange={(event) => onSelectSave(event.target.value)}
            aria-label="Select saved script"
          >
            <option value="">Select script</option>
            {saves.map((save) => (
              <option key={save.id} value={save.id}>
                {save.name} · {new Date(save.savedAt).toLocaleTimeString()}
              </option>
            ))}
          </select>
          <button className={styles.ghost} onClick={onLoad}>
            Load
          </button>
        </div>
        <div className={styles.scriptTray}>
          <span className={styles.scriptLabel}>Scripts</span>
          <div className={styles.scriptList}>
            {saves.length === 0 ? (
              <span className={styles.scriptEmpty}>No scripts yet</span>
            ) : (
              saves.map((save) => (
                <button
                  key={save.id}
                  className={`${styles.scriptChip} ${
                    selectedSaveId === save.id ? styles.scriptChipActive : ""
                  }`}
                  onClick={() => onSelectSave(save.id)}
                  title={`Saved ${new Date(save.savedAt).toLocaleString()}`}
                  type="button"
                >
                  {save.name}
                </button>
              ))
            )}
          </div>
        </div>
        <button
          className={styles.ghost}
          onClick={onToggleTheme}
          aria-pressed={theme === "dark"}
        >
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
        <span className={styles.status}>{status}</span>
      </div>
      <div className={styles.brand}>
        <img
          className={styles.brandSymbol}
          src={logoSpecificitySymbol}
          alt="Specificity symbol"
        />
        <span className={styles.brandTagline}>CREATIVITY</span>
        <span className={styles.brandName}>Specificity</span>
      </div>
    </header>
  );
};

export default TopBar;
