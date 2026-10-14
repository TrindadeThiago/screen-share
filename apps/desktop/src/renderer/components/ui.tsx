import {
  useEffect,
  useId,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';
import { X } from 'lucide-react';

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');

const BUTTON_VARIANT = {
  primary: 'bg-accent text-white hover:bg-accent-strong',
  secondary: 'bg-raised text-ink hover:bg-hover',
  danger: 'bg-live text-white hover:brightness-110',
  ghost: 'text-soft hover:bg-hover hover:text-ink',
} as const;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof BUTTON_VARIANT;
  icon?: ReactNode;
}

export function Button({ variant = 'secondary', icon, className, children, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      className={cx(
        'inline-flex h-9 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md px-3.5 text-sm font-medium',
        'transition-colors disabled:cursor-not-allowed disabled:opacity-45',
        BUTTON_VARIANT[variant],
        className,
      )}
    >
      {icon}
      {children}
    </button>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Nome acessível e dica ao passar o mouse. */
  label: string;
  tone?: 'default' | 'on' | 'danger';
}

/** Botão redondo só com ícone, usado na barra de controles. */
export function IconButton({
  label,
  tone = 'default',
  className,
  children,
  ...rest
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...rest}
      className={cx(
        'inline-flex size-10 items-center justify-center rounded-full transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-45',
        tone === 'default' && 'bg-raised text-ink hover:bg-hover',
        tone === 'on' && 'bg-ok text-white hover:brightness-110',
        tone === 'danger' && 'bg-live text-white hover:brightness-110',
        className,
      )}
    >
      {children}
    </button>
  );
}

const CONTROL =
  'h-9 w-full rounded-md border border-line bg-app px-3 text-sm text-ink placeholder:text-faint ' +
  'focus:border-accent focus:outline-none disabled:opacity-50';

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function Field({ label, className, ...rest }: FieldProps) {
  return (
    <label className={cx('flex flex-col gap-1.5 text-xs font-medium text-soft', className)}>
      {label}
      <input {...rest} className={CONTROL} />
    </label>
  );
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
}

export function SelectField({ label, className, children, ...rest }: SelectFieldProps) {
  return (
    <label className={cx('flex flex-col gap-1.5 text-xs font-medium text-soft', className)}>
      {label}
      <select {...rest} className={CONTROL}>
        {children}
      </select>
    </label>
  );
}

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  hint?: ReactNode;
  disabled?: boolean;
}

/** Interruptor: por baixo é uma caixa de seleção, então teclado e leitores de tela funcionam. */
export function Switch({ checked, onChange, children, hint, disabled }: SwitchProps) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-sm text-ink">
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span
        aria-hidden
        className={cx(
          'relative mt-0.5 h-5 w-9 shrink-0 rounded-full bg-hover transition-colors',
          'after:absolute after:left-0.5 after:top-0.5 after:size-4 after:rounded-full after:bg-white',
          'after:transition-transform peer-checked:bg-accent peer-checked:after:translate-x-4',
          'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent',
          'peer-disabled:opacity-45',
        )}
      />
      <span className="flex flex-col gap-0.5">
        {children}
        {hint && <span className="text-xs text-faint">{hint}</span>}
      </span>
    </label>
  );
}

interface DialogProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}

export function Dialog({ title, onClose, children, wide }: DialogProps) {
  const titleId = useId();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cx(
          'flex max-h-full w-full flex-col overflow-hidden rounded-xl border border-line bg-panel shadow-2xl',
          wide ? 'max-w-3xl' : 'max-w-md',
        )}
      >
        <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 id={titleId} className="text-base font-semibold">
            {title}
          </h2>
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className="rounded-md p-1 text-soft hover:bg-hover hover:text-ink"
          >
            <X size={18} />
          </button>
        </header>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-faint">{title}</h3>
      {children}
    </section>
  );
}

/** Mensagem de erro ou aviso. `role="alert"` faz leitores de tela anunciarem. */
export function Notice({
  tone = 'error',
  children,
}: {
  tone?: 'error' | 'warn';
  children: ReactNode;
}) {
  return (
    <p
      role="alert"
      className={cx(
        'rounded-md border px-3 py-2 text-sm',
        tone === 'error'
          ? 'border-live/40 bg-live/10 text-ink'
          : 'border-warn/40 bg-warn/10 text-ink',
      )}
    >
      {children}
    </p>
  );
}
