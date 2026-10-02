import { motion } from 'motion/react';
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { useId } from 'react';
import './ui.css';

export const cx = (...c: (string | false | undefined | null)[]) => c.filter(Boolean).join(' ');

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'default';
  size?: 'sm' | 'md' | 'lg';
  icon?: boolean;
};
export function Button({ variant = 'default', size = 'md', icon, className, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      className={cx('btn', variant !== 'default' && `btn--${variant}`, size !== 'md' && `btn--${size}`, icon && 'btn--icon', className)}
    />
  );
}

export function Chip({ accent, className, ...rest }: HTMLAttributes<HTMLSpanElement> & { accent?: boolean }) {
  return <span {...rest} className={cx('chip', accent && 'chip--accent', className)} />;
}

export function ToggleChip({ on, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { on: boolean }) {
  return <button type="button" aria-pressed={on} {...rest} className={cx('chip', className)} />;
}

export function Panel({ flat, tight, className, ...rest }: HTMLAttributes<HTMLDivElement> & { flat?: boolean; tight?: boolean }) {
  return <div {...rest} className={cx('panel', flat && 'panel--flat', tight && 'panel--tight', className)} />;
}

export function Stat({ label, value, unit, dot, className }: { label: ReactNode; value: ReactNode; unit?: ReactNode; dot?: boolean; className?: string }) {
  return (
    <div className={cx('stat', className)}>
      <span className="label">{label}</span>
      <span className={cx('stat__value', dot ? 'dot' : 'mono')}>
        {value}
        {unit && <span className="stat__unit">{unit}</span>}
      </span>
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void }) {
  const id = useId();
  return (
    <div className="seg" role="group">
      {options.map((o) => (
        <button key={o.value} type="button" className="seg__btn" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.value === value && (
            <motion.span layoutId={`seg-${id}`} className="seg__thumb" transition={{ type: 'spring', duration: 0.35, bounce: 0.12 }} />
          )}
          <span className="seg__label">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function NumberField({ label, value, onChange, unit, min, max, step = 1 }: {
  label: ReactNode; value: number | ''; onChange: (v: number | '') => void; unit?: ReactNode; min?: number; max?: number; step?: number;
}) {
  const id = useId();
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>{label}</label>
      <div className="field__box">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        />
        {unit && <span className="field__unit">{unit}</span>}
      </div>
    </div>
  );
}

export function ProgressRing({ value, size = 120, stroke = 6, children, track = true }: { value: number; size?: number; stroke?: number; children?: ReactNode; track?: boolean }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
        {track && <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />}
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--accent)" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c}
          initial={false}
          animate={{ strokeDashoffset: c * (1 - v) }}
          transition={{ type: 'spring', duration: 0.6, bounce: 0.1 }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>{children}</div>
    </div>
  );
}

export type DayState = 'done' | 'visit' | 'none';
export function Dots({ days }: { days: { label: string; state: DayState; today?: boolean }[] }) {
  return (
    <div className="dots">
      {days.map((d, i) => (
        <div key={i} className="dots__d" data-state={d.state} data-today={d.today ? 'true' : undefined}>
          <span className="dots__c" />
          <span>{d.label}</span>
        </div>
      ))}
    </div>
  );
}
