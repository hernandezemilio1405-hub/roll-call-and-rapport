import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ListChecks, Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { criteriaQuery, errorMessage, type Criterion } from "@/lib/db";
import { criterionSchema, firstIssue } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { EmptyState, PageHeader } from "@/components/app/common";

export const Route = createFileRoute("/_authenticated/criterios")({
  head: () => ({
    meta: [
      { title: "Criterios de participación — Pase" },
      { name: "description", content: "Define los criterios de participación y su valor en puntos." },
      { property: "og:title", content: "Criterios de participación — Pase" },
      { property: "og:description", content: "Define los criterios de participación y su valor en puntos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(criteriaQuery());
  },
  component: CriteriaPage,
});

const SUGGESTIONS = [
  { name: "Participación en clase", points: 1 },
  { name: "Entrega de tarea", points: 2 },
  { name: "Actividad en equipo", points: 3 },
  { name: "Exposición", points: 5 },
];

function CriteriaPage() {
  const qc = useQueryClient();
  const { data: criteria } = useSuspenseQuery(criteriaQuery());
  const [editing, setEditing] = useState<Criterion | "new" | null>(null);
  const invalidate = () => qc.invalidateQueries({ queryKey: ["criteria"] });

  const toggle = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("criteria").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e) => toast.error(errorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("criteria").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Criterio eliminado");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const quickAdd = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("criteria").insert(SUGGESTIONS.map((s) => ({ ...s, description: "" })));
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Criterios sugeridos agregados");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <div>
      <PageHeader
        eyebrow="Administración"
        title="Criterios de participación"
        description="Define qué cuenta como participación y cuántos puntos vale. Los registros anteriores conservan el valor con el que se dieron."
        actions={
          <Button size="lg" onClick={() => setEditing("new")}>
            <Plus /> Nuevo criterio
          </Button>
        }
      />

      {criteria.length === 0 ? (
        <EmptyState
          icon={<ListChecks className="size-5" />}
          title="Aún no tienes criterios"
          description="Crea los tuyos o comienza con algunos sugeridos que puedes editar después."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="highlight" onClick={() => quickAdd.mutate()} disabled={quickAdd.isPending}>
                Usar sugeridos
              </Button>
              <Button variant="outline" onClick={() => setEditing("new")}>
                Crear el mío
              </Button>
            </div>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {criteria.map((c) => (
            <div key={c.id} className={cn("paper-card flex items-start gap-4 p-5", !c.active && "opacity-60")}>
              <div
                className={cn(
                  "grid size-14 shrink-0 place-items-center rounded-xl font-display text-2xl font-bold tabular-nums",
                  c.points > 0 ? "bg-accent text-accent-foreground" : "bg-absent-soft text-absent",
                )}
              >
                {c.points > 0 ? `+${c.points}` : c.points}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-semibold">{c.name}</h3>
                {c.description && <p className="mt-0.5 text-sm text-muted-foreground">{c.description}</p>}
                <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <Switch checked={c.active} onCheckedChange={(v) => toggle.mutate({ id: c.id, active: v })} />
                  {c.active ? "Activo" : "Inactivo"}
                </label>
              </div>
              <div className="flex flex-col gap-1">
                <Button variant="ghost" size="icon" aria-label="Editar criterio" onClick={() => setEditing(c)}>
                  <Pencil />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Eliminar criterio" className="text-muted-foreground hover:text-destructive">
                      <Trash2 />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar “{c.name}”?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Las participaciones ya registradas se conservan. Si solo quieres dejar de usarlo, desactívalo.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => remove.mutate(c.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Eliminar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <CriterionDialog
          criterion={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={invalidate}
        />
      )}
    </div>
  );
}

function CriterionDialog({
  criterion,
  onClose,
  onSaved,
}: {
  criterion: Criterion | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(criterion?.name ?? "");
  const [description, setDescription] = useState(criterion?.description ?? "");
  const [points, setPoints] = useState(String(criterion?.points ?? 1));

  const save = useMutation({
    mutationFn: async () => {
      const parsed = criterionSchema.parse({ name, description, points });
      const { error } = criterion
        ? await supabase.from("criteria").update(parsed).eq("id", criterion.id)
        : await supabase.from("criteria").insert(parsed);
      if (error) throw error;
    },
    onSuccess: () => {
      onSaved();
      toast.success(criterion ? "Criterio actualizado" : "Criterio creado");
      onClose();
    },
    onError: (e) => toast.error(firstIssue(e) ?? errorMessage(e)),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{criterion ? "Editar criterio" : "Nuevo criterio"}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="c-name">Nombre</Label>
            <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Entrega de tarea" autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-points">Puntos</Label>
            <Input id="c-points" type="number" inputMode="numeric" min={-100} max={100} value={points} onChange={(e) => setPoints(e.target.value)} className="w-32" />
            <p className="text-xs text-muted-foreground">Usa valores negativos para descontar puntos.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-desc">Descripción (opcional)</Label>
            <Input id="c-desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} />
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
