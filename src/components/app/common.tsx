import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import type { AttendanceStatus } from "@/lib/stats";
import type { GroupWithCount } from "@/lib/db";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && (
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {eyebrow}
          </p>
        )}
        <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="paper-card ruled flex flex-col items-center px-6 py-14 text-center">
      {icon && <div className="mb-4 grid size-12 place-items-center rounded-full bg-accent text-accent-foreground">{icon}</div>}
      <h3 className="text-xl font-semibold">{title}</h3>
      {description && <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export const STATUS_META: Record<
  AttendanceStatus,
  { label: string; short: string; solid: string; soft: string }
> = {
  presente: {
    label: "Presente",
    short: "P",
    solid: "bg-present text-present-foreground border-present",
    soft: "bg-present-soft text-present border-present/30",
  },
  retardo: {
    label: "Retardo",
    short: "R",
    solid: "bg-late text-late-foreground border-late",
    soft: "bg-late-soft text-late-foreground border-late/40",
  },
  ausente: {
    label: "Ausente",
    short: "A",
    solid: "bg-absent text-absent-foreground border-absent",
    soft: "bg-absent-soft text-absent border-absent/30",
  },
};

export function StatusBadge({ status }: { status: AttendanceStatus }) {
  const m = STATUS_META[status];
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", m.soft)}>
      {m.label}
    </span>
  );
}

export function StatTile({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "default" | "present" | "absent" | "late" | "accent";
}) {
  const toneCls = {
    default: "text-foreground",
    present: "text-present",
    absent: "text-absent",
    late: "text-late-foreground",
    accent: "text-primary",
  }[tone];
  return (
    <div className="paper-card p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("mt-2 font-display text-3xl font-semibold tabular-nums", toneCls)}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function GroupChips({
  groups,
  value,
  onChange,
}: {
  groups: GroupWithCount[];
  value: string | undefined;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {groups.map((g) => (
        <button
          key={g.id}
          type="button"
          onClick={() => onChange(g.id)}
          className={cn(
            "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
            value === g.id
              ? "border-primary bg-primary text-primary-foreground shadow-sm"
              : "border-border bg-card text-foreground hover:border-primary/40",
          )}
        >
          {g.name}
          {g.grade && <span className="ml-1.5 opacity-70">· {g.grade}</span>}
        </button>
      ))}
    </div>
  );
}

export function NoGroupsState() {
  return (
    <EmptyState
      title="Aún no tienes grupos"
      description="Crea tu primer grupo y registra a tus alumnos para comenzar."
      action={
        <Link
          to="/grupos"
          className="inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground"
        >
          Crear un grupo
        </Link>
      }
    />
  );
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}
