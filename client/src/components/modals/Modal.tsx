import { useEffect } from "react";
import styles from "./Modal.module.css";

type ModalProps = {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
};

const Modal = ({ isOpen, title, onClose, children }: ModalProps) => {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.card}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.header}>
          <h2>{title}</h2>
          <button className={styles.close} onClick={onClose}>
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default Modal;
