import Papa from "papaparse";

export interface ImportedStudent {
  full_name: string;
  student_code: string;
  email: string;
}

const NAME_KEYS = ["nombre", "nombre completo", "alumno", "name", "full_name", "estudiante"];
const CODE_KEYS = ["matricula", "matrícula", "codigo", "código", "id", "numero", "número", "no", "clave"];
const EMAIL_KEYS = ["correo", "email", "e-mail", "correo electronico", "correo electrónico"];
const FIRST_KEYS = ["nombre(s)", "nombres"];
const LAST_KEYS = ["apellidos", "apellido", "apellido paterno"];
const LAST2_KEYS = ["apellido materno"];

function norm(s: string) {
  return s.trim().toLowerCase();
}

function findIndex(headers: string[], keys: string[]) {
  return headers.findIndex((h) => keys.includes(norm(h)));
}

/**
 * Convierte texto CSV en alumnos. Acepta encabezados en español o inglés
 * (nombre, matrícula, correo, apellidos). Sin encabezados: columna 1 = nombre,
 * 2 = matrícula, 3 = correo.
 */
export function parseStudentsCsv(text: string): ImportedStudent[] {
  const result = Papa.parse<string[]>(text.replace(/^\uFEFF/, ""), {
    skipEmptyLines: "greedy",
  });
  const rows = result.data.filter((r) => r.some((c) => c && c.trim()));
  if (rows.length === 0) return [];

  const header = rows[0]!.map((c) => c ?? "");
  const known = [...NAME_KEYS, ...CODE_KEYS, ...EMAIL_KEYS, ...FIRST_KEYS, ...LAST_KEYS, ...LAST2_KEYS];
  const hasHeader = header.some((h) => known.includes(norm(h)));

  let nameIdx = 0;
  let codeIdx = 1;
  let emailIdx = 2;
  let firstIdx = -1;
  let lastIdx = -1;
  let last2Idx = -1;
  let body = rows;

  if (hasHeader) {
    body = rows.slice(1);
    nameIdx = findIndex(header, NAME_KEYS);
    codeIdx = findIndex(header, CODE_KEYS);
    emailIdx = findIndex(header, EMAIL_KEYS);
    firstIdx = findIndex(header, FIRST_KEYS);
    lastIdx = findIndex(header, LAST_KEYS);
    last2Idx = findIndex(header, LAST2_KEYS);
  }

  const out: ImportedStudent[] = [];
  for (const row of body) {
    const get = (i: number) => (i >= 0 && row[i] ? String(row[i]).trim() : "");
    let full_name = get(nameIdx);
    if (!full_name && (firstIdx >= 0 || lastIdx >= 0)) {
      full_name = [get(firstIdx), get(lastIdx), get(last2Idx)].filter(Boolean).join(" ");
    }
    full_name = full_name.replace(/\s+/g, " ").slice(0, 160);
    if (!full_name) continue;
    const email = get(emailIdx).slice(0, 255);
    out.push({
      full_name,
      student_code: get(codeIdx).slice(0, 40),
      email: /^\S+@\S+\.\S+$/.test(email) ? email : "",
    });
  }
  return out;
}
