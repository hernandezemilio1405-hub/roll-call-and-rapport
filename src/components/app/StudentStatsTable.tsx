import { Link } from "@tanstack/react-router";
import type { Student } from "@/lib/db";
import type { StudentStats } from "@/lib/stats";
import { cn } from "@/lib/utils";

export function StudentStatsTable({
  students,
  stats,
}: {
  students: Student[];
  stats: Map<string, StudentStats>;
}) {
  return (
    <div className="paper-card overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-3 font-semibold">Alumno</th>
            <th className="px-3 py-3 text-right font-semibold">Asist.</th>
            <th className="px-3 py-3 text-right font-semibold">Faltas</th>
            <th className="px-3 py-3 text-right font-semibold">Retardos</th>
            <th className="px-3 py-3 font-semibold">% Asistencia</th>
            <th className="px-4 py-3 text-right font-semibold">Puntos</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => {
            const st = stats.get(s.id);
            if (!st) return null;
            const rate = st.attendanceRate;
            return (
              <tr key={s.id} className="border-b last:border-0 hover:bg-muted/50">
                <td className="px-4 py-3">
                  <Link to="/alumnos/$studentId" params={{ studentId: s.id }} className="font-medium hover:text-primary hover:underline">
                    {s.full_name}
                  </Link>
                  {s.student_code && <span className="ml-2 text-xs text-muted-foreground">{s.student_code}</span>}
                </td>
                <td className="px-3 py-3 text-right tabular-nums text-present">{st.present}</td>
                <td className="px-3 py-3 text-right tabular-nums text-absent">{st.absent}</td>
                <td className="px-3 py-3 text-right tabular-nums text-late-foreground">{st.late}</td>
                <td className="px-3 py-3">
                  {st.sessions === 0 ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn("h-full rounded-full", rate >= 80 ? "bg-present" : rate >= 60 ? "bg-late" : "bg-absent")}
                          style={{ width: `${rate}%` }}
                        />
                      </div>
                      <span className="tabular-nums">{rate}%</span>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-display text-base font-semibold tabular-nums">{st.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
