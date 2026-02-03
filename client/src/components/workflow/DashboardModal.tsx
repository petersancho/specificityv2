import { useEffect, type ReactNode } from "react";
import styles from "./DashboardModal.module.css";

type DashboardModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
};

export const DashboardModal = ({ isOpen, onClose, children }: DashboardModalProps) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose} aria-label="Close dashboard">
          ×
        </button>
        {children}
      </div>
    </div>
  );
};
