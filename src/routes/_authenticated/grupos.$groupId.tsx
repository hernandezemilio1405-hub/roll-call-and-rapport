import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ClipboardCheck, FileDown, Pencil, Star, Trash2, Upload, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  attendanceQuery,
  errorMessage,
  groupQuery,
  participationsQuery,
  studentsQuery,
  type Student,
} from "@/lib/db";
import { groupSchema, studentSchema, firstIssue } from "@/lib/schemas";
import { parseStudentsCsv, type ImportedStudent } from "@/lib/csv";
import { formatLong, formatShort, monthStartISO, todayISO } from "@/lib/dates";
import { statsByStudent } from "@/lib/stats";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { EmptyState, PageHeader, StatusBadge, initials } from "@/components/app/common";
import { DateRange } from "@/components/app/DateRange";
import { StudentStatsTable } from "@/components/app/StudentStatsTable";

export const Route = createFileRoute("/_authenticated/grupos/$groupId")({
  head: () => ({
    meta: [
      { title: "Grupo — Pase" },
      { name: "description", content: "Alumnos, historial y estadísticas del grupo." },
      { property: "og:title", content: "Grupo — Pase" },
      { property: "og:description", content: "Alumnos, historial y estadísticas del grupo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: async ({ context, params }) => {
    const group = await context.queryClient.ensureQueryData(groupQuery(params.groupId));
    if (!group) throw notFound();
    context.queryClient.ensureQueryData(studentsQuery(params.groupId));
  },
  notFoundComponent: () => (
    <EmptyState title="Grupo no encontrado" action={<Link to="/grupos" className="text-primary underline">Volver a grupos</Link>} />
  ),
  component: GroupDetail,
});

function GroupDetail() {
  const { groupId } = Route.useParams();
  const { data: group } = useSuspenseQuery(groupQuery(groupId));
  const { data: students } = useSuspenseQuery(studentsQuery(groupId));
  if (!group) return null;

  return (
    <div>
      <Link to="/grupos" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Grupos
      </Link>
      <PageHeader
        eyebrow={group.grade || "Grupo"}
        title={group.name}
        description={`${students.length} alumnos registrados`}
        actions={
          <>
            <Button asChild>
              <Link to="/asistencia" search={{ grupo: groupId }}>
                <ClipboardCheck /> Pasar lista
              </Link>
            </Button>
            <Button asChild variant="highlight">
              <Link to="/participacion" search={{ grupo: groupId }}>
                <Star /> Participación
              </Link>
            </Button>
            <EditGroupDialog groupId={groupId} name={group.name} grade={group.grade} />
          </>
        }
      />

      <Tabs defaultValue="alumnos">
        <TabsList className="mb-6">
          <TabsTrigger value="alumnos">Alumnos</TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
          <TabsTrigger value="estadisticas">Estadísticas</TabsTrigger>
        </TabsList>
        <TabsContent value="alumnos">
          <StudentsTab groupId={groupId} students={students} />
        </TabsContent>
        <TabsContent value="historial">
          <HistoryTab groupId={groupId} students={students} />
        </TabsContent>
        <TabsContent value="estadisticas">
          <StatsTab groupId={groupId} students={students} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------------- Grupo: editar / eliminar ---------------- */

function EditGroupDialog({ groupId, name: n0, grade: g0 }: { groupId: string; name: string; grade: string }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(n0);
  const [grade, setGrade] = useState(g0);

  const save = useMutation({
    mutationFn: async () => {
      const parsed = groupSchema.parse({ name, grade });
      const { error } = await supabase.from("groups").update(parsed).eq("id", groupId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["groups"] });
      toast.success("Grupo actualizado");
      setOpen(false);
    },
    onError: (e) => toast.error(firstIssue(e) ?? errorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("groups").delete().eq("id", groupId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["groups"] });
      toast.success("Grupo eliminado");
      navigate({ to: "/grupos" });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Pencil /> Editar
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Editar grupo</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="eg-name">Nombre</Label>
              <Input id="eg-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="eg-grade">Semestre o grado</Label>
              <Input id="eg-grade" value={grade} onChange={(e) => setGrade(e.target.value)} />
            </div>
            <DialogFooter className="gap-2 sm:justify-between">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="ghost" className="text-destructive">
                    <Trash2 /> Eliminar grupo
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar este grupo?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Se borrarán sus alumnos, asistencias y participaciones. Esta acción no se puede deshacer.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => remove.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Eliminar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button type="submit" disabled={save.isPending}>
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ---------------- Alumnos ---------------- */

function StudentsTab({ groupId, students }: { groupId: string; students: Student[] }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [editing, setEditing] = useState<Student | null>(null);
  const [preview, setPreview] = useState<ImportedStudent[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["students", groupId] });
    qc.invalidateQueries({ queryKey: ["groups"] });
  };

  const add = useMutation({
    mutationFn: async () => {
      const parsed = studentSchema.parse({ full_name: name, student_code: code, email });
      const { error } = await supabase.from("students").insert({ ...parsed, group_id: groupId });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      setName("");
      setCode("");
      setEmail("");
      nameRef.current?.focus();
      toast.success("Alumno agregado");
    },
    onError: (e) => toast.error(firstIssue(e) ?? errorMessage(e)),
  });

  const importMany = useMutation({
    mutationFn: async (rows: ImportedStudent[]) => {
      const { error } = await supabase.from("students").insert(rows.map((r) => ({ ...r, group_id: groupId })));
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (n) => {
      invalidate();
      setPreview(null);
      toast.success(`${n} alumnos importados`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("students").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Alumno eliminado");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 2_000_000) return toast.error("El archivo es demasiado grande (máx. 2 MB)");
    const rows = parseStudentsCsv(await file.text());
    if (rows.length === 0) return toast.error("No encontramos alumnos en el archivo");
    if (rows.length > 500) return toast.error("Máximo 500 alumnos por archivo");
    setPreview(rows);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div>
        {students.length === 0 ? (
          <EmptyState
            icon={<UserPlus className="size-5" />}
            title="Este grupo no tiene alumnos"
            description="Agrégalos uno por uno o importa un archivo CSV con columnas nombre, matrícula y correo."
          />
        ) : (
          <div className="paper-card divide-y">
            {students.map((s, i) => (
              <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                <span className="w-6 text-right text-xs tabular-nums text-muted-foreground">{i + 1}</span>
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
                  {initials(s.full_name)}
                </span>
                <Link to="/alumnos/$studentId" params={{ studentId: s.id }} className="min-w-0 flex-1 hover:text-primary">
                  <p className="truncate font-medium">{s.full_name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[s.student_code, s.email].filter(Boolean).join(" · ") || "Sin datos adicionales"}
                  </p>
                </Link>
                <Button variant="ghost" size="icon" aria-label="Editar alumno" onClick={() => setEditing(s)}>
                  <Pencil />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Eliminar alumno" className="text-muted-foreground hover:text-destructive">
                      <Trash2 />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar a {s.full_name}?</AlertDialogTitle>
                      <AlertDialogDescription>También se borrarán sus asistencias y participaciones.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => remove.mutate(s.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Eliminar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        )}
      </div>

      <aside className="space-y-4">
        <form
          className="paper-card space-y-3 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            add.mutate();
          }}
        >
          <h3 className="text-lg font-semibold">Agregar alumno</h3>
          <div className="space-y-1.5">
            <Label htmlFor="s-name">Nombre completo</Label>
            <Input id="s-name" ref={nameRef} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-code">Matrícula (opcional)</Label>
            <Input id="s-code" value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-email">Correo (opcional)</Label>
            <Input id="s-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={add.isPending}>
            <UserPlus /> Agregar
          </Button>
        </form>

        <div className="paper-card space-y-3 p-5">
          <h3 className="text-lg font-semibold">Importar CSV</h3>
          <p className="text-sm text-muted-foreground">
            Columnas reconocidas: <strong>nombre</strong>, <strong>matrícula</strong>, <strong>correo</strong> (o nombres y apellidos).
          </p>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />
          <Button variant="outline" className="w-full" onClick={() => fileRef.current?.click()}>
            <Upload /> Elegir archivo
          </Button>
        </div>
      </aside>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Importar {preview?.length} alumnos</DialogTitle>
            <DialogDescription>Revisa la lista antes de guardar.</DialogDescription>
          </DialogHeader>
          <div className="max-h-72 divide-y overflow-y-auto rounded-lg border text-sm">
            {preview?.map((r, i) => (
              <div key={i} className="flex justify-between gap-3 px-3 py-2">
                <span className="font-medium">{r.full_name}</span>
                <span className="text-muted-foreground">{r.student_code}</span>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreview(null)}>
              Cancelar
            </Button>
            <Button onClick={() => preview && importMany.mutate(preview)} disabled={importMany.isPending}>
              Importar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editing && <EditStudentDialog student={editing} onClose={() => setEditing(null)} onSaved={invalidate} />}
    </div>
  );
}

function EditStudentDialog({ student, onClose, onSaved }: { student: Student; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(student.full_name);
  const [code, setCode] = useState(student.student_code);
  const [email, setEmail] = useState(student.email);
  const save = useMutation({
    mutationFn: async () => {
      const parsed = studentSchema.parse({ full_name: name, student_code: code, email });
      const { error } = await supabase.from("students").update(parsed).eq("id", student.id);
      if (error) throw error;
    },
    onSuccess: () => {
      onSaved();
      toast.success("Alumno actualizado");
      onClose();
    },
    onError: (e) => toast.error(firstIssue(e) ?? errorMessage(e)),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Editar alumno</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="es-name">Nombre completo</Label>
            <Input id="es-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="es-code">Matrícula</Label>
            <Input id="es-code" value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="es-email">Correo</Label>
            <Input id="es-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={save.isPending}>
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Historial ---------------- */

function HistoryTab({ groupId, students }: { groupId: string; students: Student[] }) {
  const qc = useQueryClient();
  const [from, setFrom] = useState(monthStartISO());
  const [to, setTo] = useState(todayISO());
  const att = useQuery(attendanceQuery({ groupId, from, to }));
  const par = useQuery(participationsQuery({ groupId, from, to }));
  const names = useMemo(() => new Map(students.map((s) => [s.id, s.full_name])), [students]);

  const days = useMemo(() => {
    const byDate = new Map<string, { presente: number; ausente: number; retardo: number; issues: { id: string; status: "ausente" | "retardo" }[] }>();
    for (const a of att.data ?? []) {
      if (!byDate.has(a.date)) byDate.set(a.date, { presente: 0, ausente: 0, retardo: 0, issues: [] });
      const d = byDate.get(a.date)!;
      d[a.status]++;
      if (a.status !== "presente") d.issues.push({ id: a.student_id, status: a.status });
    }
    return [...byDate.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [att.data]);

  const removePart = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("participations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["participations"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      toast.success("Participación eliminada");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <div className="space-y-6">
      <DateRange from={from} to={to} onChange={(f, t) => (setFrom(f), setTo(t))} />
      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h3 className="mb-3 text-xl font-semibold">Asistencias por día</h3>
          {att.isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : days.length === 0 ? (
            <p className="paper-card p-5 text-sm text-muted-foreground">Sin listas en este periodo.</p>
          ) : (
            <div className="space-y-3">
              {days.map(([date, d]) => (
                <div key={date} className="paper-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link to="/asistencia" search={{ grupo: groupId, fecha: date }} className="font-semibold capitalize hover:text-primary">
                      {formatLong(date)}
                    </Link>
                    <div className="flex gap-3 text-xs font-semibold tabular-nums">
                      <span className="text-present">{d.presente} P</span>
                      <span className="text-absent">{d.ausente} A</span>
                      <span className="text-late-foreground">{d.retardo} R</span>
                    </div>
                  </div>
                  {d.issues.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {d.issues.map((i) => (
                        <span key={i.id} className="inline-flex items-center gap-1.5 text-xs">
                          <StatusBadge status={i.status} />
                          <span className="text-muted-foreground">{names.get(i.id) ?? "—"}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
        <section>
          <h3 className="mb-3 text-xl font-semibold">Participaciones</h3>
          {par.isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : (par.data ?? []).length === 0 ? (
            <p className="paper-card p-5 text-sm text-muted-foreground">Sin participaciones en este periodo.</p>
          ) : (
            <div className="paper-card divide-y">
              {par.data!.map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-12 shrink-0 font-display text-lg font-semibold tabular-nums text-primary">
                    {p.points > 0 ? `+${p.points}` : p.points}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{names.get(p.student_id) ?? "—"}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {p.criterion_name} · {formatShort(p.date)}
                      {p.note && ` · ${p.note}`}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" aria-label="Eliminar participación" className="text-muted-foreground hover:text-destructive" onClick={() => removePart.mutate(p.id)}>
                    <Trash2 />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/* ---------------- Estadísticas ---------------- */

function StatsTab({ groupId, students }: { groupId: string; students: Student[] }) {
  const [from, setFrom] = useState(monthStartISO());
  const [to, setTo] = useState(todayISO());
  const att = useQuery(attendanceQuery({ groupId, from, to }));
  const par = useQuery(participationsQuery({ groupId, from, to }));
  const stats = useMemo(
    () => statsByStudent(students.map((s) => s.id), att.data ?? [], par.data ?? []),
    [students, att.data, par.data],
  );
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <DateRange from={from} to={to} onChange={(f, t) => (setFrom(f), setTo(t))} />
        <Button asChild variant="outline">
          <Link to="/reportes" search={{ grupo: groupId, desde: from, hasta: to }}>
            <FileDown /> Generar PDF
          </Link>
        </Button>
      </div>
      {students.length === 0 ? (
        <p className="paper-card p-5 text-sm text-muted-foreground">Agrega alumnos para ver estadísticas.</p>
      ) : (
        <StudentStatsTable students={students} stats={stats} />
      )}
    </div>
  );
}
