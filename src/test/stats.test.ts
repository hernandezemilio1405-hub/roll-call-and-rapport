import { describe, expect, it } from "vitest";
import { attendanceRate, computeStats } from "@/lib/stats";

describe("estadísticas de asistencia", () => {
  it("cuenta presentes, faltas y retardos por separado", () => {
    const s = computeStats(
      [
        { student_id: "a", date: "2026-11-01", status: "presente" },
        { student_id: "a", date: "2026-11-02", status: "ausente" },
        { student_id: "a", date: "2026-11-03", status: "retardo" },
        { student_id: "a", date: "2026-11-04", status: "presente" },
      ],
      [],
    );
    expect(s).toMatchObject({ sessions: 4, present: 2, absent: 1, late: 1 });
  });

  it("los retardos cuentan como asistencia en el porcentaje", () => {
    expect(attendanceRate(2, 1, 4)).toBe(75);
  });

  it("sin sesiones el porcentaje es 0", () => {
    expect(attendanceRate(0, 0, 0)).toBe(0);
  });

  it("suma los puntos acumulados, incluidos negativos", () => {
    const s = computeStats([], [
      { student_id: "a", points: 2 },
      { student_id: "a", points: 5 },
      { student_id: "a", points: -1 },
    ]);
    expect(s.points).toBe(6);
    expect(s.participations).toBe(3);
  });
});
