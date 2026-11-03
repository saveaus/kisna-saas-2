import type { ReactNode } from "react";

/** Centred card used by sign-in, sign-up, onboarding and set-password. */
export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-full items-center justify-center bg-canvas px-4 py-16">
      <div className="w-full max-w-[360px]">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-4 inline-flex h-8 w-8 items-center justify-center rounded-[8px] bg-[oklch(0.35_0.03_255)] text-[14px] font-semibold text-white">
            C
          </span>
          <h1 className="text-[18px] leading-7 font-semibold text-ink">{title}</h1>
          {subtitle && <p className="mt-1 text-[13px] text-ink-4">{subtitle}</p>}
        </div>
        <div className="hairline rounded-[10px] bg-surface p-4 shadow-float">{children}</div>
        {footer && <div className="mt-4 text-center text-[13px] text-ink-4">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-[12px] font-medium text-ink-3">{label}</span>
      <input
        {...props}
        className="hairline block h-8 w-full rounded-[6px] bg-surface px-2.5 text-[13px] text-ink outline-none placeholder:text-ink-5 focus:border-[var(--accent)]"
      />
    </label>
  );
}

export function SubmitButton({ children, busy }: { children: ReactNode; busy?: boolean }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="mt-1 h-8 w-full rounded-[6px] bg-[oklch(0.2_0_0)] text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-60"
    >
      {busy ? "Please wait…" : children}
    </button>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mb-3 rounded-[6px] bg-[var(--red-bg)] px-2.5 py-2 text-[12px] text-[var(--red-ink)]">
      {message}
    </p>
  );
}
