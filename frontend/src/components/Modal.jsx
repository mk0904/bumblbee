import { useEffect, useRef } from 'react';

/** Accessible modal shell with focus containment and return-to-trigger behaviour. */
export function Modal({ title, onClose, children }) {
  const root = useRef(null),
    close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const previous = document.activeElement;
    const focusable = () =>
      Array.from(
        root.current?.querySelectorAll(
          'button:not(:disabled), a[href], input, textarea, [tabindex="0"]',
        ) ?? [],
      );
    (focusable()[0] ?? root.current)?.focus();
    const keydown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close.current();
      }
      if (event.key !== 'Tab') return;
      const targets = focusable();
      if (!targets.length) {
        event.preventDefault();
        root.current?.focus();
        return;
      }
      if (event.shiftKey && document.activeElement === targets[0]) {
        event.preventDefault();
        targets.at(-1).focus();
      } else if (!event.shiftKey && document.activeElement === targets.at(-1)) {
        event.preventDefault();
        targets[0].focus();
      }
    };
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', keydown);
    return () => {
      window.removeEventListener('keydown', keydown);
      document.body.style.overflow = oldOverflow;
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      ref={root}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      tabIndex={-1}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {children}
    </div>
  );
}
