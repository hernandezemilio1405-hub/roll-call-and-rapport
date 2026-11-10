import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { daysAgoISO, monthStartISO, todayISO } from "@/lib/dates";
import { cn } from "@/lib/utils";

export function DateRange({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}) {
  const presets = [
    { label: "Este mes", from: monthStartISO(), to: todayISO() },
    { label: "30 días", from: daysAgoISO(30), to: todayISO() },
    { label: "6 meses", from: daysAgoISO(182), to: todayISO() },
  ];
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="from" className="text-xs text-muted-foreground">Desde</Label>
        <Input id="from" type="date" value={from} max={to} onChange={(e) => e.target.value && onChange(e.target.value, to)} className="w-40" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="to" className="text-xs text-muted-foreground">Hasta</Label>
        <Input id="to" type="date" value={to} min={from} onChange={(e) => e.target.value && onChange(from, e.target.value)} className="w-40" />
      </div>
      <div className="flex gap-1.5">
        {presets.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => onChange(p.from, p.to)}
            className={cn(
              "h-9 rounded-md border px-3 text-xs font-medium transition-colors",
              p.from === from && p.to === to
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card hover:border-primary/40",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
