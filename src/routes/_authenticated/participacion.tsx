import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { ListChecks, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { criteriaQuery, errorMessage, groupsQuery, participationsQuery, studentsQuery } from "@/lib/db";
import { formatLong, todayISO } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { EmptyState, GroupChips, NoGroupsState, PageHeader, initials } from "@/components/app/common";

const search = z.object({
  grupo: z.string().optional(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const Route = createFileRoute("/_authenticated/participacion")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Participación — Pase" },
      { name: "description", content: "Asigna puntos de participación a tus alumnos." },
      { property: "og:title", content: "Participación — Pase" },
      { property: "og:description", content: "Asigna puntos de participación a tus alumnos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(groupsQuery());
    context.queryClient.ensureQueryData(criteriaQuery());
  },
  component: ParticipationPage,
});

function ParticipationPage() {
  const { grupo, fecha } = Route.useSearch();
  const navigate = useNavigate({ from: "/participacion" });
  const qc = useQueryClient();
  const { data: groups } = useSuspenseQuery(groupsQuery());
  const { data: criteria } = useSuspenseQuery(criteriaQuery());
  const active = criteria.filter((c) => c.active);

  const groupId = grupo && groups.some((g) => g.id === grupo) ? grupo : groups[0]?.id;
  const date = fecha ?? todayISO();
  const [criterionId, setCriterionId] = useState<string | undefined>(active[0]?.id);
  const [note, setNote] = useState("");
  const [flash, setFlash] = useState<string | null>(null);
  const criterion = active.find((c) => c.id === criterionId) ?? active[0];

  const students = useQuery(studentsQuery(groupId ?? ""));
  const todays = useQuery(participationsQuery({ groupId, from: date, to: date }));
  const pointsBy = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of todays.data ?? []) m.set(p.student_id, (m.get(p.student_id) ?? 0) + p.points);
    return m;
  }, [todays.data]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["participations"] });
    qc.invalidateQueries({ queryKey: ["overview"] });
  };

  const undo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("participations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast("Participación deshecha");
    },
  });

  const award = useMutation({
    mutationFn: async (studentId: string) => {
      if (!criterion || !groupId) throw new Error("Elige un criterio");
      const { data, error } = await supabase
        .from("participations")
        .insert({
          group_id: groupId,
          student_id: studentId,
          criterion_id: criterion.id,
          criterion_name: criterion.name,
          points: criterion.points,
          date,
          note: note.trim().slice(0, 300),
        })
        .select("id")
        .single();
      if (error) throw error;
      return { id: data.id, studentId };
    },
    onMutate: (studentId) => setFlash(studentId),
    onSuccess: ({ id, studentId }) => {
      invalidate();
      const name = students.data?.find((s) => s.id === studentId)?.full_name ?? "";
      toast.success(`${criterion!.points > 0 ? "+" : ""}${criterion!.points} · ${name}`, {
        description: criterion!.name,
        action: { label: "Deshacer", onClick: () => undo.mutate(id) },
      });
      setTimeout(() => setFlash(null), 400);
    },
    onError: (e) => {
      setFlash(null);
      toast.error(errorMessage(e));
    },
  });

  if (groups.length === 0) {
    return (
      <div>
        <PageHeader eyebrow="Participación" title="Registrar participación" />
        <NoGroupsState />
      </div>
    );
  }

  if (active.length === 0) {
    return (
      <div>
        <PageHeader eyebrow="Participación" title="Registrar participación" />
        <EmptyState
          icon={<ListChecks className="size-5" />}
          title="Primero define tus criterios"
          description="Antes de registrar participaciones, crea los criterios y su valor en puntos (por ejemplo: participar en clase = 1 punto)."
          action={
            <Link to="/criterios" className="inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground">
              Crear criterios
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Participación"
        title="Registrar participación"
        description="Elige un criterio y toca a cada alumno para sumarle los puntos."
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
          <span className="text-sm text-muted-foreground">{formatLong(date)}</span>
        </div>
      </div>

      <div className="paper-card mb-6 p-4 sm:p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Criterio</p>
        <div className="flex flex-wrap gap-2">
          {active.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCriterionId(c.id)}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors",
                criterion?.id === c.id
                  ? "border-accent bg-accent text-accent-foreground shadow-sm"
                  : "border-border bg-background hover:border-accent",
              )}
            >
              {c.name}
              <span className="font-display font-bold tabular-nums">
                {c.points > 0 ? `+${c.points}` : c.points}
              </span>
            </button>
          ))}
        </div>
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={300}
          placeholder="Nota opcional (se guarda con cada punto)"
          className="mt-4"
        />
      </div>

      {students.isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Cargando alumnos…
        </div>
      ) : (students.data ?? []).length === 0 ? (
        <EmptyState title="Este grupo no tiene alumnos" description="Agrega alumnos desde la sección Grupos." />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {students.data!.map((s) => {
            const pts = pointsBy.get(s.id) ?? 0;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => award.mutate(s.id)}
                className={cn(
                  "paper-card flex flex-col items-start gap-3 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-accent active:scale-[0.98]",
                  flash === s.id && "animate-pop border-accent",
                )}
              >
                <div className="flex w-full items-center justify-between">
                  <span className="grid size-9 place-items-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
                    {initials(s.full_name)}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 font-display text-sm font-bold tabular-nums",
                      pts ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {pts > 0 ? `+${pts}` : pts}
                  </span>
                </div>
                <span className="line-clamp-2 text-sm font-medium leading-snug">{s.full_name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
