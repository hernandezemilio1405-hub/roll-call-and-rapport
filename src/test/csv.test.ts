import { describe, expect, it } from "vitest";
import { parseStudentsCsv } from "@/lib/csv";

describe("importación de alumnos por CSV", () => {
  it("lee encabezados en español", () => {
    const rows = parseStudentsCsv("Nombre,Matrícula,Correo\nAna López,A001,ana@escuela.mx\nLuis Pérez,A002,");
    expect(rows).toEqual([
      { full_name: "Ana López", student_code: "A001", email: "ana@escuela.mx" },
      { full_name: "Luis Pérez", student_code: "A002", email: "" },
    ]);
  });

  it("sin encabezados usa nombre, matrícula y correo en ese orden", () => {
    const rows = parseStudentsCsv("Ana López,A001\nLuis Pérez,A002");
    expect(rows.map((r) => r.full_name)).toEqual(["Ana López", "Luis Pérez"]);
    expect(rows[1].student_code).toBe("A002");
  });

  it("une nombres y apellidos cuando vienen separados", () => {
    const rows = parseStudentsCsv("Nombres,Apellido paterno,Apellido materno\nAna,López,Ruiz");
    expect(rows[0].full_name).toBe("Ana López Ruiz");
  });

  it("omite filas sin nombre y correos inválidos", () => {
    const rows = parseStudentsCsv("nombre,correo\n,x@y.com\nAna,no-es-correo");
    expect(rows).toEqual([{ full_name: "Ana", student_code: "", email: "" }]);
  });
});
