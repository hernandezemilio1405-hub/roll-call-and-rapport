import { cn } from "@/lib/utils";

export function Logo({
  tone = "ink",
  size = "md",
}: {
  tone?: "ink" | "chalk";
  size?: "sm" | "md";
}) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className={cn(
          "grid place-items-center rounded-lg bg-accent font-display font-bold text-accent-foreground",
          size === "sm" ? "size-8 text-lg" : "size-9 text-xl",
        )}
        aria-hidden
      >
        ✓
      </span>
      <span
        className={cn(
          "font-display font-semibold tracking-tight",
          size === "sm" ? "text-xl" : "text-2xl",
          tone === "chalk" ? "text-chalk-foreground" : "text-foreground",
        )}
      >
        Pase
      </span>
    </span>
  );
}
