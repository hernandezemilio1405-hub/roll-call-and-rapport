import { format, parseISO, startOfMonth, subDays } from "date-fns";
import { es } from "date-fns/locale";

export function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function monthStartISO(): string {
  return format(startOfMonth(new Date()), "yyyy-MM-dd");
}

export function daysAgoISO(days: number): string {
  return format(subDays(new Date(), days), "yyyy-MM-dd");
}

export function formatLong(iso: string): string {
  const s = format(parseISO(iso), "EEEE d 'de' MMMM yyyy", { locale: es });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatShort(iso: string): string {
  return format(parseISO(iso), "d MMM yyyy", { locale: es });
}

export function formatDayMonth(iso: string): string {
  return format(parseISO(iso), "d MMM", { locale: es });
}
