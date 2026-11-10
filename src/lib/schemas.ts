import { z } from "zod";

export const groupSchema = z.object({
  name: z.string().trim().min(1, "Escribe el nombre del grupo").max(120, "Nombre demasiado largo"),
  grade: z.string().trim().max(60, "Grado demasiado largo"),
});

export const studentSchema = z.object({
  full_name: z.string().trim().min(1, "Escribe el nombre del alumno").max(160, "Nombre demasiado largo"),
  student_code: z.string().trim().max(40, "Matrícula demasiado larga"),
  email: z.union([z.literal(""), z.string().trim().email("Correo no válido").max(255)]),
});

export const criterionSchema = z.object({
  name: z.string().trim().min(1, "Escribe el nombre del criterio").max(100),
  description: z.string().trim().max(300),
  points: z.coerce
    .number({ invalid_type_error: "Los puntos deben ser un número" })
    .int("Usa números enteros")
    .min(-100, "Mínimo -100")
    .max(100, "Máximo 100")
    .refine((n) => n !== 0, "El valor no puede ser 0"),
});

export function firstIssue(e: unknown): string | null {
  if (e instanceof z.ZodError) return e.issues[0]?.message ?? "Datos no válidos";
  return null;
}
