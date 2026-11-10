export type AttendanceStatus = "presente" | "ausente" | "retardo";

export interface AttendanceLike {
  student_id: string;
  status: AttendanceStatus;
  date: string;
}

export interface ParticipationLike {
  student_id: string;
  points: number;
}

export interface StudentStats {
  sessions: number;
  present: number;
  absent: number;
  late: number;
  /** Porcentaje de asistencia: presentes + retardos sobre sesiones registradas. */
  attendanceRate: number;
  points: number;
  participations: number;
}

export const EMPTY_STATS: StudentStats = {
  sessions: 0,
  present: 0,
  absent: 0,
  late: 0,
  attendanceRate: 0,
  points: 0,
  participations: 0,
};

/**
 * Un retardo cuenta como asistencia para el porcentaje, pero se reporta por separado.
 */
export function attendanceRate(present: number, late: number, sessions: number): number {
  if (sessions <= 0) return 0;
  return Math.round(((present + late) / sessions) * 1000) / 10;
}

export function computeStats(
  attendance: AttendanceLike[],
  participations: ParticipationLike[],
): StudentStats {
  let present = 0;
  let absent = 0;
  let late = 0;
  for (const a of attendance) {
    if (a.status === "presente") present++;
    else if (a.status === "ausente") absent++;
    else if (a.status === "retardo") late++;
  }
  const sessions = present + absent + late;
  const points = participations.reduce((sum, p) => sum + p.points, 0);
  return {
    sessions,
    present,
    absent,
    late,
    attendanceRate: attendanceRate(present, late, sessions),
    points,
    participations: participations.length,
  };
}

export function statsByStudent(
  studentIds: string[],
  attendance: AttendanceLike[],
  participations: ParticipationLike[],
): Map<string, StudentStats> {
  const att = new Map<string, AttendanceLike[]>();
  const par = new Map<string, ParticipationLike[]>();
  for (const a of attendance) {
    if (!att.has(a.student_id)) att.set(a.student_id, []);
    att.get(a.student_id)!.push(a);
  }
  for (const p of participations) {
    if (!par.has(p.student_id)) par.set(p.student_id, []);
    par.get(p.student_id)!.push(p);
  }
  const out = new Map<string, StudentStats>();
  for (const id of studentIds) {
    out.set(id, computeStats(att.get(id) ?? [], par.get(id) ?? []));
  }
  return out;
}
