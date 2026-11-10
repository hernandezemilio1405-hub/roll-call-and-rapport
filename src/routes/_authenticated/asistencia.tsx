import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { CheckCheck, Loader2, Save, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { attendanceQuery, errorMessage, groupsQuery, studentsQuery } from "@/lib/db";
import { formatLong, todayISO } from "@/lib/dates";
import type { AttendanceStatus } from "@/lib/stats";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, GroupChips, NoGroupsState, PageHeader, STATUS_META } from "@/components/app/common";

const search = z.object({
  grupo: z.string().optional(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const Route = createFileRoute("/_authenticated/asistencia")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Pasar lista — Pase" },
      { name: "description", content: "Registra la asistencia de tu grupo por fecha." },
      { property: "og:title", content: "Pasar lista — Pase" },
      { property: "og:description", content: "Registra la asistencia de tu grupo por fecha." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(groupsQuery());
  },
  component: AttendancePage,
});

const ORDER: AttendanceStatus[] = ["presente", "retardo", "ausente"];

function AttendancePage() {
  const { grupo, fecha } = Route.useSearch();
  const navigate = useNavigate({ from: "/asistencia" });
  const qc = useQueryClient();
  const { data: groups } = useSuspenseQuery(groupsQuery());

  const groupId = grupo && groups.some((g) => g.id === grupo) ? grupo : groups[0]?.id;
  const date = fecha ?? todayISO();

  const students = useQuery(studentsQuery(groupId ?? ""));
  const existing = useQuery(attendanceQuery({ groupId, from: date, to: date }));
  const [overrides, setOverrides] = useState<Record<string, AttendanceStatus>>({});

  useEffect(() => setOverrides({}), [groupId, date]);

  const saved = useMemo(() => {
    const m = new Map<string, AttendanceStatus>();
    for (const a of existing.data ?? []) m.set(a.student_id, a.status);
    return m;
  }, [existing.data]);

  const list = students.data ?? [];
  const statusOf = (id: string): AttendanceStatus => overrides[id] ?? saved.get(id) ?? "presente";
  const counts = { presente: 0, ausente: 0, retardo: 0 };
  for (const s of list) counts[statusOf(s.id)]++;
  const hasSaved = saved.size > 0;
  const dirty = list.some((s) => !saved.has(s.id) || saved.get(s.id) !== statusOf(s.id));

  const save = useMutation({
    mutationFn: async () => {
      const rows = list.map((s) => ({ group_id: groupId!, student_id: s.id, date, status: statusOf(s.id) }));
      const { error } = await supabase.from("attendance").upsert(rows, { onConflict: "student_id,date" });
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["attendance"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      setOverrides({});
      toast.success("Lista guardada");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const clear = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("attendance").delete().eq("group_id", groupId!).eq("date", date);
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["attendance"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      setOverrides({});
      toast.success("Lista del día eliminada");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const set = (id: string, st: AttendanceStatus) => setOverrides((o) => ({ ...o, [id]: st }));
  const cycle = (id: string) => set(id, ORDER[(ORDER.indexOf(statusOf(id)) + 1) % ORDER.length]!);

  if (groups.length === 0) {
    return (
      <div>
        <PageHeader eyebrow="Asistencia" title="Pasar lista" />
        <NoGroupsState />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Asistencia"
        title="Pasar lista"
        description="Todos inician como presentes. Toca el nombre para cambiar de estado o usa los botones."
      />

      <div className="mb-6 space-y-4">
        <GroupChips groups={groups} value={groupId} onChange={(id) => navigate({ search: (s) => ({ ...s, grupo: id }) })} />
        <div className="flex flex-wrap items-center gap-3">
          <Input
            type="date"
            value={date}
            max={todayISO()}
            onChange={(e) => e.target.value && navigate({ search: (s) => ({ ...s, fecha: e.target.value }) })}
            className="w-44"
            aria-label="Fecha"
          />
          <span className="text-sm capitalize text-muted-foreground">{formatLong(date)}</span>
          {hasSaved && (
            <span className="rounded-full bg-present-soft px-3 py-1 text-xs font-semibold text-present">
              Lista guardada
            </span>
          )}
        </div>
      </div>

      {students.isLoading || existing.isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Cargando alumnos…
        </div>
      ) : list.length === 0 ? (
        <EmptyState title="Este grupo no tiene alumnos" description="Agrega alumnos desde la sección Grupos." />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2 text-sm font-semibold tabular-nums">
              {ORDER.map((st) => (
                <span key={st} className={cn("rounded-full border px-3 py-1", STATUS_META[st].soft)}>
                  {counts[st]} {STATUS_META[st].label.toLowerCase()}
                  {counts[st] === 1 ? "" : "s"}
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOverrides(Object.fromEntries(list.map((s) => [s.id, "presente" as const])))}
              >
                <CheckCheck /> Todos presentes
              </Button>
              {hasSaved && (
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => clear.mutate()}>
                  <Trash2 /> Borrar lista
                </Button>
              )}
            </div>
          </div>

          <div className="paper-card divide-y">
            {list.map((s, i) => {
              const st = statusOf(s.id);
              return (
                <div key={s.id} className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
                  <span className="w-6 text-right text-xs tabular-nums text-muted-foreground">{i + 1}</span>
                  <button
                    type="button"
                    onClick={() => cycle(s.id)}
                    className="min-w-0 flex-1 truncate py-1.5 text-left font-medium"
                  >
                    {s.full_name}
                  </button>
                  <div className="flex shrink-0 gap-1.5" role="radiogroup" aria-label={`Asistencia de ${s.full_name}`}>
                    {ORDER.map((opt) => {
                      const active = st === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          aria-label={STATUS_META[opt].label}
                          title={STATUS_META[opt].label}
                          onClick={() => set(s.id, opt)}
                          className={cn(
                            "grid size-10 place-items-center rounded-lg border text-sm font-bold transition-all",
                            active ? cn(STATUS_META[opt].solid, "animate-pop shadow-sm") : "border-border bg-background text-muted-foreground hover:border-foreground/30",
                          )}
                        >
                          {STATUS_META[opt].short}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="sticky bottom-20 z-20 mt-6 flex justify-end lg:bottom-6">
            <Button size="xl" onClick={() => save.mutate()} disabled={save.isPending || (!dirty && hasSaved)} className="shadow-lift">
              {save.isPending ? <Loader2 className="animate-spin" /> : <Save />}
              {hasSaved ? (dirty ? "Guardar cambios" : "Guardada") : "Guardar lista"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
