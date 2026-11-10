import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeft, FileDown } from "lucide-react";
import { attendanceQuery, participationsQuery, studentQuery } from "@/lib/db";
import { formatLong, formatShort, monthStartISO, todayISO } from "@/lib/dates";
import { computeStats } from "@/lib/stats";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, StatTile, StatusBadge } from "@/components/app/common";
import { DateRange } from "@/components/app/DateRange";

export const Route = createFileRoute("/_authenticated/alumnos/$studentId")({
  head: () => ({
    meta: [
      { title: "Historial del alumno — Pase" },
      { name: "description", content: "Asistencias y participaciones de un alumno." },
      { property: "og:title", content: "Historial del alumno — Pase" },
      { property: "og:description", content: "Asistencias y participaciones de un alumno." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: async ({ context, params }) => {
    const s = await context.queryClient.ensureQueryData(studentQuery(params.studentId));
    if (!s) throw notFound();
  },
  notFoundComponent: () => (
    <EmptyState title="Alumno no encontrado" action={<Link to="/grupos" className="text-primary underline">Ir a grupos</Link>} />
  ),
  component: StudentPage,
});

function StudentPage() {
  const { studentId } = Route.useParams();
  const { data: student } = useSuspenseQuery(studentQuery(studentId));
  const [from, setFrom] = useState(monthStartISO());
  const [to, setTo] = useState(todayISO());
  const att = useQuery(attendanceQuery({ studentId, from, to }));
  const par = useQuery(participationsQuery({ studentId, from, to }));
  const stats = useMemo(() => computeStats(att.data ?? [], par.data ?? []), [att.data, par.data]);
  if (!student) return null;
  const group = student.groups as { id: string; name: string; grade: string } | null;

  return (
    <div>
      {group && (
        <Link
          to="/grupos/$groupId"
          params={{ groupId: group.id }}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> {group.name}
        </Link>
      )}
      <PageHeader
        eyebrow={student.student_code ? `Matrícula ${student.student_code}` : "Alumno"}
        title={student.full_name}
        description={student.email || undefined}
        actions={
          group && (
            <Button asChild variant="outline">
              <Link to="/reportes" search={{ grupo: group.id, alumno: student.id, desde: from, hasta: to }}>
                <FileDown /> Generar PDF
              </Link>
            </Button>
          )
        }
      />

      <DateRange from={from} to={to} onChange={(f, t) => (setFrom(f), setTo(t))} />

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatTile label="% Asistencia" value={stats.sessions ? `${stats.attendanceRate}%` : "—"} tone="present" />
        <StatTile label="Asistencias" value={stats.present} />
        <StatTile label="Faltas" value={stats.absent} tone="absent" />
        <StatTile label="Retardos" value={stats.late} tone="late" />
        <StatTile label="Puntos" value={stats.points} hint={`${stats.participations} participaciones`} tone="accent" />
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-xl font-semibold">Asistencias</h2>
          {(att.data ?? []).length === 0 ? (
            <p className="paper-card p-5 text-sm text-muted-foreground">Sin registros en este periodo.</p>
          ) : (
            <div className="paper-card divide-y">
              {att.data!.map((a) => (
                <div key={a.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span>{formatLong(a.date)}</span>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </div>
          )}
        </section>
        <section>
          <h2 className="mb-3 text-xl font-semibold">Participaciones</h2>
          {(par.data ?? []).length === 0 ? (
            <p className="paper-card p-5 text-sm text-muted-foreground">Sin participaciones en este periodo.</p>
          ) : (
            <div className="paper-card divide-y">
              {par.data!.map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-12 font-display text-lg font-semibold tabular-nums text-primary">
                    {p.points > 0 ? `+${p.points}` : p.points}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.criterion_name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatShort(p.date)}
                      {p.note && ` · ${p.note}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
