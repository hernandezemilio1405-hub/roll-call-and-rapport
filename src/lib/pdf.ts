import type { Attendance, Participation, Student } from "@/lib/db";
import { computeStats, statsByStudent } from "@/lib/stats";
import { formatShort } from "@/lib/dates";

interface ReportInput {
  groupName: string;
  groupGrade: string;
  from: string;
  to: string;
  students: Student[];
  attendance: Attendance[];
  participations: Participation[];
  /** Si se indica, el reporte es individual. */
  student?: Student | undefined;
}

const STATUS_LABEL: Record<string, string> = {
  presente: "Presente",
  ausente: "Ausente",
  retardo: "Retardo",
};

const INK: [number, number, number] = [38, 64, 54];
const PAPER: [number, number, number] = [246, 241, 228];

export async function downloadReportPdf(input: ReportInput) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 40;

  // Encabezado
  doc.setFillColor(...INK);
  doc.rect(0, 0, pageW, 84, "F");
  doc.setTextColor(...PAPER);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(
    input.student ? "Reporte individual de asistencia y participación" : "Reporte de grupo: asistencia y participación",
    margin,
    40,
  );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const groupLine = `${input.groupName}${input.groupGrade ? ` · ${input.groupGrade}` : ""}`;
  doc.text(
    `${groupLine}   |   Periodo: ${formatShort(input.from)} – ${formatShort(input.to)}`,
    margin,
    62,
  );

  doc.setTextColor(40, 40, 40);
  let y = 112;

  if (input.student) {
    const s = input.student;
    const att = input.attendance.filter((a) => a.student_id === s.id);
    const par = input.participations.filter((p) => p.student_id === s.id);
    const st = computeStats(att, par);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(s.full_name, margin, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    if (s.student_code) doc.text(`Matrícula: ${s.student_code}`, margin, y + 16);
    y += 34;

    autoTable(doc, {
      startY: y,
      head: [["Sesiones", "Asistencias", "Faltas", "Retardos", "% Asistencia", "Puntos"]],
      body: [[st.sessions, st.present, st.absent, st.late, `${st.attendanceRate}%`, st.points]],
      theme: "grid",
      headStyles: { fillColor: INK, textColor: PAPER },
      margin: { left: margin, right: margin },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 24;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Asistencias", margin, y);
    autoTable(doc, {
      startY: y + 8,
      head: [["Fecha", "Estado"]],
      body: att.length
        ? [...att].sort((a, b) => a.date.localeCompare(b.date)).map((a) => [formatShort(a.date), STATUS_LABEL[a.status] ?? a.status])
        : [["Sin registros en el periodo", ""]],
      theme: "striped",
      headStyles: { fillColor: INK, textColor: PAPER },
      margin: { left: margin, right: margin },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 24;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Participaciones", margin, y);
    autoTable(doc, {
      startY: y + 8,
      head: [["Fecha", "Criterio", "Puntos", "Nota"]],
      body: par.length
        ? [...par]
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((p) => [formatShort(p.date), p.criterion_name, p.points, p.note])
        : [["Sin registros en el periodo", "", "", ""]],
      theme: "striped",
      headStyles: { fillColor: INK, textColor: PAPER },
      margin: { left: margin, right: margin },
    });
  } else {
    const ids = input.students.map((s) => s.id);
    const map = statsByStudent(ids, input.attendance, input.participations);
    const total = computeStats(input.attendance, input.participations);
    const sessions = new Set(input.attendance.map((a) => a.date)).size;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(
      `Alumnos: ${input.students.length}   ·   Días con lista: ${sessions}   ·   Asistencia del grupo: ${total.attendanceRate}%   ·   Puntos totales: ${total.points}`,
      margin,
      y,
    );
    y += 14;

    autoTable(doc, {
      startY: y,
      head: [["Alumno", "Matrícula", "Asist.", "Faltas", "Retardos", "% Asist.", "Puntos"]],
      body: input.students.map((s) => {
        const st = map.get(s.id)!;
        return [s.full_name, s.student_code, st.present, st.absent, st.late, `${st.attendanceRate}%`, st.points];
      }),
      theme: "striped",
      headStyles: { fillColor: INK, textColor: PAPER },
      columnStyles: { 0: { cellWidth: 170 } },
      margin: { left: margin, right: margin },
    });
  }

  // Pie de página
  const pages = doc.getNumberOfPages();
  const generated = new Date().toLocaleString("es-MX");
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    const h = doc.internal.pageSize.getHeight();
    doc.text(`Generado el ${generated}`, margin, h - 20);
    doc.text(`Página ${i} de ${pages}`, pageW - margin, h - 20, { align: "right" });
  }

  const slug = (input.student?.full_name ?? input.groupName)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .toLowerCase();
  doc.save(`reporte-${slug}-${input.from}_${input.to}.pdf`);
}
