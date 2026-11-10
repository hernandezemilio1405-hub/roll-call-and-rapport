import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, CircleDashed, ClipboardCheck, Star } from "lucide-react";
import { groupsQuery, overviewQuery } from "@/lib/db";
import { daysAgoISO, formatLong, todayISO } from "@/lib/dates";
import { computeStats } from "@/lib/stats";
import { Button } from "@/components/ui/button";
import { NoGroupsState, PageHeader, StatTile } from "@/components/app/common";

export const Route = createFileRoute("/_authenticated/panel")({
  head: () => ({
    meta: [
      { title: "Inicio — Pase" },
      { name: "description", content: "Resumen de asistencia y participación de tus grupos." },
      { property: "og:title", content: "Inicio — Pase" },
      { property: "og:description", content: "Resumen de asistencia y participación de tus grupos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => {
    const today = todayISO();
    context.queryClient.ensureQueryData(groupsQuery());
    context.queryClient.ensureQueryData(overviewQuery(daysAgoISO(30), today));
  },
  component: Panel,
});

function Panel() {
  const today = todayISO();
  const from = daysAgoISO(30);
  const { data: groups } = useSuspenseQuery(groupsQuery());
  const { data: overview } = useSuspenseQuery(overviewQuery(from, today));

  const totalStudents = groups.reduce((s, g) => s + g.student_count, 0);
  const stats = computeStats(overview.attendance, overview.participations);

  return (
    <div>
      <PageHeader
        eyebrow={formatLong(today)}
        title="Buenos días, profe."
        description="Esto es lo que pasa en tus grupos."
        actions={
          groups.length > 0 && (
            <>
              <Button asChild size="lg">
                <Link to="/asistencia">
                  <ClipboardCheck /> Pasar lista
                </Link>
              </Button>
              <Button asChild size="lg" variant="highlight">
                <Link to="/participacion">
                  <Star /> Participación
                </Link>
              </Button>
            </>
          )
        }
      />

      {groups.length === 0 ? (
        <NoGroupsState />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatTile label="Grupos" value={groups.length} />
            <StatTile label="Alumnos" value={totalStudents} />
            <StatTile
              label="Asistencia"
              value={stats.sessions ? `${stats.attendanceRate}%` : "—"}
              hint="Últimos 30 días"
              tone="present"
            />
            <StatTile label="Puntos otorgados" value={stats.points} hint="Últimos 30 días" tone="accent" />
          </div>

          <h2 className="mb-4 mt-12 text-2xl font-semibold">Lista de hoy</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {groups.map((g) => {
              const todays = overview.attendance.filter((a) => a.group_id === g.id && a.date === today);
              const done = todays.length > 0;
              const absent = todays.filter((a) => a.status === "ausente").length;
              const late = todays.filter((a) => a.status === "retardo").length;
              return (
                <Link
                  key={g.id}
                  to="/asistencia"
                  search={{ grupo: g.id }}
                  className="paper-card group flex items-center gap-4 p-5 transition-transform hover:-translate-y-0.5"
                >
                  {done ? (
                    <CheckCircle2 className="size-7 shrink-0 text-present" />
                  ) : (
                    <CircleDashed className="size-7 shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">
                      {g.name} {g.grade && <span className="font-normal text-muted-foreground">· {g.grade}</span>}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {done
                        ? `Lista tomada · ${absent} faltas · ${late} retardos`
                        : `${g.student_count} alumnos · pendiente`}
                    </p>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
