import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/* The 40px bar at the top of every page: page icon + title on the left
 * (often followed by view tabs), actions on the right. */
export function TopBar({
  icon: Icon,
  title,
  children,
  actions,
}: {
  icon?: LucideIcon;
  title: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex h-10 shrink-0 items-center justify-between gap-3 px-4">
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex items-center gap-1.5 text-[13px] font-medium text-ink">
          {Icon && <Icon size={15} strokeWidth={1.75} className="text-ink-2" />}
          <span className="truncate">{title}</span>
        </div>
        {children}
      </div>
      {actions && <div className="flex items-center gap-1.5">{actions}</div>}
    </div>
  );
}
