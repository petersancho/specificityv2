import { useEffect } from "react";
import { createPortal } from "react-dom";
import WebGLButton from "../ui/WebGLButton";
import styles from "./Modal.module.css";

type ModalProps = {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  overlayClassName?: string;
  headerClassName?: string;
  titleClassName?: string;
  bodyClassName?: string;
};

const Modal = ({
  isOpen,
  title,
  onClose,
  children,
  className,
  overlayClassName,
  headerClassName,
  titleClassName,
  bodyClassName,
}: ModalProps) => {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const bodyContent = bodyClassName ? (
    <div className={bodyClassName}>{children}</div>
  ) : (
    children
  );

  const overlay = (
    <div
      className={[styles.overlay, overlayClassName].filter(Boolean).join(" ")}
      onClick={onClose}
      data-capture-hide="true"
    >
      <div
        className={[styles.card, className].filter(Boolean).join(" ")}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className={[styles.header, headerClassName].filter(Boolean).join(" ")}>
          <h2 className={titleClassName}>{title}</h2>
          <WebGLButton
            className={styles.close}
            onClick={onClose}
            label="Close dialog"
            iconId="close"
            hideLabel
            variant="ghost"
            shape="pill"
            tooltip="Close dialog"
          />
        </div>
        {bodyContent}
      </div>
    </div>
  );

  if (typeof document === "undefined") return overlay;
  return createPortal(overlay, document.body);
};

export default Modal;
