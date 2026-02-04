import logoLinguaSymbol from "../assets/logos/logo-lingua-symbol.svg";
import WebGLButton from "./ui/WebGLButton";
import LinguaLogo from "./LinguaLogo";
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
        <WebGLButton
          className={styles.primary}
          onClick={onSave}
          label="Save script"
          shortLabel="Save"
          iconId="save"
          variant="primary"
          shape="pill"
          tooltip="Save script"
        />
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
          <WebGLButton
            className={styles.ghost}
            onClick={onLoad}
            label="Load selected script"
            shortLabel="Load"
            iconId="load"
            variant="secondary"
            shape="pill"
            tooltip="Load selected script"
          />
        </div>
        <div className={styles.scriptTray}>
          <span className={styles.scriptLabel}>Scripts</span>
          <div className={styles.scriptList}>
            {saves.length === 0 ? (
              <span className={styles.scriptEmpty}>No scripts yet</span>
            ) : (
              saves.map((save) => (
                <WebGLButton
                  key={save.id}
                  className={`${styles.scriptChip} ${
                    selectedSaveId === save.id ? styles.scriptChipActive : ""
                  }`}
                  onClick={() => onSelectSave(save.id)}
                  label={`Select script ${save.name}`}
                  shortLabel={save.name}
                  iconId="script"
                  variant={selectedSaveId === save.id ? "primary" : "chip"}
                  active={selectedSaveId === save.id}
                  shape="pill"
                  tooltip={`Saved ${new Date(save.savedAt).toLocaleString()}`}
                  tooltipPosition="bottom"
                />
              ))
            )}
          </div>
        </div>
        <WebGLButton
          className={styles.ghost}
          onClick={onToggleTheme}
          aria-pressed={theme === "dark"}
          label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          shortLabel={theme === "dark" ? "Light" : "Dark"}
          iconId={theme === "dark" ? "themeLight" : "themeDark"}
          variant="ghost"
          shape="pill"
          tooltip={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        />
        <span className={styles.status}>{status}</span>
      </div>
      <div className={styles.brand}>
        <LinguaLogo size={28} />
        <img
          className={styles.brandSymbol}
          src={logoLinguaSymbol}
          alt="Lingua symbol"
        />
        <span className={styles.brandTagline}>CREATIVITY</span>
        <span className={styles.brandName}>Lingua</span>
      </div>
    </header>
  );
};

export default TopBar;
