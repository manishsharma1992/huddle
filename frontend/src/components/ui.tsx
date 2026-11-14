import { AnimatePresence, motion, type HTMLMotionProps } from 'framer-motion';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { focusNth, rovingIndex } from '../lib/roving';
import { t } from '../lib/i18n';
import { AVATARS } from '../lib/identity';

export const spring = { type: 'spring' as const, bounce: 0, duration: 0.4 };
export const bouncy = { type: 'spring' as const, bounce: 0.35, duration: 0.5 };

type ButtonProps = HTMLMotionProps<'button'> & { variant?: 'primary' | 'ghost' | 'soft' | 'danger'; size?: 'sm' | 'md' | 'lg' };

export function Button({ variant = 'soft', size = 'md', className = '', ...props }: ButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.2 }}
      className={`btn btn-${variant} btn-${size} ${className}`}
      {...props}
    />
  );
}

export function Sheet({ open, onClose, title, children, wide = false }: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const dialog = useRef<HTMLDivElement | null>(null);

  // Modal focus: move in on open, keep Tab inside, hand focus back to the opener on close.
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const focusables = () =>
      Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input, textarea, select, a[href], [tabindex]:not([tabindex="-1"])') ?? []);
    const first = requestAnimationFrame(() => (focusables()[1] ?? focusables()[0])?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) return;
      const [head, tail] = [items[0], items[items.length - 1]];
      if (e.shiftKey && document.activeElement === head) {
        e.preventDefault();
        tail.focus();
      } else if (!e.shiftKey && document.activeElement === tail) {
        e.preventDefault();
        head.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(first);
      window.removeEventListener('keydown', onKey);
      opener?.focus?.();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            ref={dialog}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={`sheet ${wide ? 'sheet-wide' : ''}`}
            initial={{ opacity: 0, y: 40, scale: 0.96, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: 40, scale: 0.96, filter: 'blur(8px)' }}
            transition={{ type: 'spring', bounce: 0.15, duration: 0.45, filter: { duration: 0.25, ease: 'easeOut' } }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="sheet-head">
              <h2>{title}</h2>
              <button className="icon-btn" onClick={onClose} aria-label={t.close}>
                ✕
              </button>
            </header>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function AvatarPicker({ value, onChange }: { value: string; onChange: (avatar: string) => void }) {
  return (
    <div className="avatar-grid" role="radiogroup" aria-label={t.pickCharacter} data-roving>
      {AVATARS.map((avatar, i) => (
        <motion.button
          type="button"
          key={avatar}
          role="radio"
          aria-checked={value === avatar}
          className={`avatar-choice ${value === avatar ? 'is-on' : ''}`}
          tabIndex={value === avatar || (!AVATARS.includes(value) && i === 0) ? 0 : -1}
          onClick={() => onChange(avatar)}
          onKeyDown={(e) => {
            const next = rovingIndex(e, i, AVATARS.length);
            if (next === null) return;
            onChange(AVATARS[next]);
            focusNth(e, '[role="radio"]', next);
          }}
          whileHover={{ scale: 1.15, rotate: -6 }}
          whileTap={{ scale: 0.9 }}
          transition={bouncy}
        >
          {avatar}
          {value === avatar && <motion.span layoutId="avatar-ring" className="avatar-ring" transition={spring} />}
        </motion.button>
      ))}
    </div>
  );
}

/**
 * A labelled form row. A single input sits inside a <label>. A group of controls (pickers, toggles) must not:
 * a wrapping label hands its whole text to the first button and clicking the label text presses it.
 * Groups get a div labelled by the heading instead.
 */
export function Field({ label, children, hint, group = false }: { label: string; children: ReactNode; hint?: string; group?: boolean }) {
  const id = useId();
  if (group) {
    return (
      <div className="field" role="group" aria-labelledby={id}>
        <span className="field-label" id={id}>
          {label}
        </span>
        {children}
        {hint && <span className="field-hint">{hint}</span>}
      </div>
    );
  }
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

/** Voter / observer as a real radio group: one Tab stop, arrows switch, the choice is announced. */
export function RoleToggle({ value, onChange, labels, label, pillId }: {
  value: 'VOTER' | 'OBSERVER';
  onChange: (role: 'VOTER' | 'OBSERVER') => void;
  labels: Record<'VOTER' | 'OBSERVER', string>;
  label: string;
  pillId: string;
}) {
  const roles = ['VOTER', 'OBSERVER'] as const;
  return (
    <div className="segmented" role="radiogroup" aria-label={label} data-roving>
      {roles.map((r, i) => (
        <button
          type="button"
          role="radio"
          aria-checked={value === r}
          tabIndex={value === r ? 0 : -1}
          key={r}
          className={`segment ${value === r ? 'is-on' : ''}`}
          onClick={() => onChange(r)}
          onKeyDown={(e) => {
            const next = rovingIndex(e, i, roles.length);
            if (next === null) return;
            onChange(roles[next]);
            focusNth(e, '[role="radio"]', next);
          }}
        >
          {value === r && <motion.span layoutId={pillId} className="segment-pill" transition={spring} />}
          <span>{labels[r]}</span>
        </button>
      ))}
    </div>
  );
}
