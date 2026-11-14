import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useRef, useState } from 'react';

export type ToastTone = 'info' | 'success' | 'celebrate' | 'error';
export type ToastAction = { label: string; run: () => void };
export type Toast = { id: number; text: string; tone: ToastTone; action?: ToastAction };

/** How long a toast with an action (Undo) stays up; callers commit just after this. */
export const ACTION_TOAST_MS = 5000;

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const toast = useCallback(
    (text: string, tone: ToastTone = 'info', action?: ToastAction) => {
      const id = nextId.current++;
      setToasts((list) => [...list.filter((t) => t.text !== text), { id, text, tone, action }].slice(-4));
      const ms = action ? ACTION_TOAST_MS : tone === 'error' ? 5000 : tone === 'celebrate' ? 4200 : 3200;
      setTimeout(() => dismiss(id), ms);
      return id;
    },
    [dismiss],
  );

  return { toasts, toast, dismiss };
}

const motionProps = (tone: ToastTone) => ({
  layout: true,
  initial: { opacity: 0, y: -24, scale: 0.9, filter: 'blur(6px)' },
  animate: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -16, scale: 0.95, filter: 'blur(6px)' },
  transition: { type: 'spring' as const, bounce: tone === 'celebrate' ? 0.45 : 0.2, duration: 0.45, filter: { duration: 0.25, ease: 'easeOut' as const } },
});

/**
 * Not a live region: screen readers get the table's own announcements, so the cheerful flavour lines
 * aren't read on top of them. Errors still interrupt (role="alert").
 */
export default function Toasts({ toasts, onDismiss, max = 4 }: { toasts: Toast[]; onDismiss: (id: number) => void; max?: number }) {
  // When space is short (one toast on phones), an Undo or an error always wins over flavour.
  const pinned = toasts.filter((t) => t.action || t.tone === 'error');
  const visible =
    pinned.length >= max ? pinned.slice(-max) : [...toasts.filter((t) => !(t.action || t.tone === 'error')).slice(-(max - pinned.length) || toasts.length), ...pinned];
  return (
    <div className="toasts">
      <AnimatePresence initial={false}>
        {visible.map((t) =>
          t.action ? (
            <motion.div key={t.id} className={`toast toast-${t.tone} has-action`} role="status" {...motionProps(t.tone)}>
              <span>{t.text}</span>
              <button
                className="toast-action"
                onClick={() => {
                  t.action!.run();
                  onDismiss(t.id);
                }}
              >
                {t.action.label}
              </button>
            </motion.div>
          ) : (
            <motion.button
              key={t.id}
              className={`toast toast-${t.tone}`}
              role={t.tone === 'error' ? 'alert' : undefined}
              onClick={() => onDismiss(t.id)}
              {...motionProps(t.tone)}
            >
              {t.text}
            </motion.button>
          ),
        )}
      </AnimatePresence>
    </div>
  );
}
