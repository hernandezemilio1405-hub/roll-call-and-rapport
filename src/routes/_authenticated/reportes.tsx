import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { FileDown, Loader2 } from "lucide-react";
import { attendanceQuery, groupsQuery, participationsQuery, studentsQuery } from "@/lib/db";
import { formatDayMonth, monthStartISO, todayISO } from "@/lib/dates";
import { computeStats, statsByStudent } from "@/lib/stats";
import { downloadReportPdf } from "@/lib/pdf";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GroupChips, NoGroupsState, PageHeader, StatTile } from "@/components/app/common";
import { DateRange } from "@/components/app/DateRange";
import { StudentStatsTable } from "@/components/app/StudentStatsTable";

const iso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const search = z.object({
  grupo: z.string().optional(),
  alumno: z.string().optional(),
  desde: iso.optional(),
  hasta: iso.optional(),
});

export const Route = createFileRoute("/_authenticated/reportes")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Estadísticas y reportes — Pase" },
      { name: "description", content: "Porcentajes de asistencia, faltas, retardos y puntos, con exportación a PDF." },
      { property: "og:title", content: "Estadísticas y reportes — Pase" },
      { property: "og:description", content: "Porcentajes de asistencia, faltas, retardos y puntos, con exportación a PDF." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(groupsQuery());
  },
  component: ReportsPage,
});

function ReportsPage() {
  const s = Route.useSearch();
  const navigate = useNavigate({ from: "/reportes" });
  const { data: groups } = useSuspenseQuery(groupsQuery());
  const groupId = s.grupo && groups.some((g) => g.id === s.grupo) ? s.grupo : groups[0]?.id;
  const group = groups.find((g) => g.id === groupId);
  const from = s.desde ?? monthStartISO();
  const to = s.hasta ?? todayISO();
  const [busy, setBusy] = useState(false);

  const students = useQuery(studentsQuery(groupId ?? ""));
  const att = useQuery(attendanceQuery({ groupId, from, to }));
  const par = useQuery(participationsQuery({ groupId, from, to }));
  const studentId = s.alumno && students.data?.some((x) => x.id === s.alumno) ? s.alumno : undefined;

  const list = useMemo(
    () => (students.data ?? []).filter((x) => !studentId || x.id === studentId),
    [students.data, studentId],
  );
  const attF = useMemo(() => (att.data ?? []).filter((a) => !studentId || a.student_id === studentId), [att.data, studentId]);
  const parF = useMemo(() => (par.data ?? []).filter((p) => !studentId || p.student_id === studentId), [par.data, studentId]);
  const total = computeStats(attF, parF);
  const perStudent = useMemo(() => statsByStudent(list.map((x) => x.id), attF, parF), [list, attF, parF]);

  const chart = useMemo(() => {
    const byDate = new Map<string, { presente: number; retardo: number; ausente: number }>();
    for (const a of attF) {
      if (!byDate.has(a.date)) byDate.set(a.date, { presente: 0, retardo: 0, ausente: 0 });
      byDate.get(a.date)![a.status]++;
    }
    return [...byDate.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, v]) => ({ fecha: formatDayMonth(date), Presentes: v.presente, Retardos: v.retardo, Ausentes: v.ausente }));
  }, [attF]);

  const loading = students.isLoading || att.isLoading || par.isLoading;
  const setSearch = (patch: Partial<z.infer<typeof search>>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true });

  async function exportPdf() {
    if (!group) return;
    setBusy(true);
    try {
      await downloadReportPdf({
        groupName: group.name,
        groupGrade: group.grade,
        from,
        to,
        students: students.data ?? [],
        attendance: att.data ?? [],
        participations: par.data ?? [],
        student: studentId ? students.data?.find((x) => x.id === studentId) : undefined,
      });
    } catch (e) {
      console.error(e);
      toast.error("No se pudo generar el PDF");
    } finally {
      setBusy(false);
    }
  }

  if (groups.length === 0) {
    return (
      <div>
        <PageHeader eyebrow="Reportes" title="Estadísticas y reportes" />
        <NoGroupsState />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Reportes"
        title="Estadísticas y reportes"
        description="Elige un grupo o alumno y un periodo. Descarga el reporte en PDF."
        actions={
          <Button size="lg" onClick={exportPdf} disabled={busy || loading || !group}>
            {busy ? <Loader2 className="animate-spin" /> : <FileDown />} Descargar PDF
          </Button>
        }
      />

      <div className="mb-8 space-y-4">
        <GroupChips groups={groups} value={groupId} onChange={(id) => setSearch({ grupo: id, alumno: undefined })} />
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-full sm:w-64">
            <Select value={studentId ?? "todos"} onValueChange={(v) => setSearch({ alumno: v === "todos" ? undefined : v })}>
              <SelectTrigger aria-label="Alumno">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todo el grupo</SelectItem>
                {(students.data ?? []).map((x) => (
                  <SelectItem key={x.id} value={x.id}>
                    {x.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DateRange from={from} to={to} onChange={(f, t) => setSearch({ desde: f, hasta: t })} />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Calculando…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <StatTile label="% Asistencia" value={total.sessions ? `${total.attendanceRate}%` : "—"} tone="present" hint="Retardos cuentan como asistencia" />
            <StatTile label="Asistencias" value={total.present} />
            <StatTile label="Faltas" value={total.absent} tone="absent" />
            <StatTile label="Retardos" value={total.late} tone="late" />
            <StatTile label="Puntos acumulados" value={total.points} tone="accent" hint={`${total.participations} participaciones`} />
          </div>

          {chart.length > 0 && (
            <div className="paper-card mt-8 p-5">
              <h2 className="mb-4 text-xl font-semibold">Asistencia por día</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart}>
                    <CartesianGrid vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="fecha" tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} width={28} stroke="var(--muted-foreground)" />
                    <Tooltip
                      cursor={{ fill: "var(--muted)" }}
                      contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                    />
                    <Bar dataKey="Presentes" stackId="a" fill="var(--present)" />
                    <Bar dataKey="Retardos" stackId="a" fill="var(--late)" />
                    <Bar dataKey="Ausentes" stackId="a" fill="var(--absent)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <h2 className="mb-4 mt-10 text-xl font-semibold">Por alumno</h2>
          {list.length === 0 ? (
            <p className="paper-card p-5 text-sm text-muted-foreground">Este grupo no tiene alumnos.</p>
          ) : (
            <StudentStatsTable students={list} stats={perStudent} />
          )}
        </>
      )}
    </div>
  );
}
