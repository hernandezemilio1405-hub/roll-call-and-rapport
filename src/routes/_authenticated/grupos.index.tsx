import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { errorMessage, groupsQuery } from "@/lib/db";
import { groupSchema } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState, PageHeader } from "@/components/app/common";

export const Route = createFileRoute("/_authenticated/grupos/")({
  head: () => ({
    meta: [
      { title: "Grupos — Pase" },
      { name: "description", content: "Crea y administra tus grupos y alumnos." },
      { property: "og:title", content: "Grupos — Pase" },
      { property: "og:description", content: "Crea y administra tus grupos y alumnos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(groupsQuery());
  },
  component: GroupsPage,
});

function GroupsPage() {
  const { data: groups } = useSuspenseQuery(groupsQuery());

  return (
    <div>
      <PageHeader
        eyebrow="Registro"
        title="Grupos"
        description="Cada grupo tiene su propia lista de alumnos, asistencias y participaciones."
        actions={<NewGroupDialog />}
      />
      {groups.length === 0 ? (
        <EmptyState
          icon={<Users className="size-5" />}
          title="Crea tu primer grupo"
          description="Por ejemplo: “Matemáticas 3°A” o “Física · 2do semestre”."
          action={<NewGroupDialog />}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <Link
              key={g.id}
              to="/grupos/$groupId"
              params={{ groupId: g.id }}
              className="paper-card ruled group relative overflow-hidden p-6 transition-transform hover:-translate-y-0.5"
            >
              <span className="absolute inset-y-0 left-0 w-1.5 bg-primary" aria-hidden />
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {g.grade || "Sin grado"}
              </p>
              <h3 className="mt-1 text-2xl font-semibold">{g.name}</h3>
              <p className="mt-6 text-sm text-muted-foreground">
                <span className="font-display text-xl font-semibold text-foreground">{g.student_count}</span>{" "}
                alumnos
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function NewGroupDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      const parsed = groupSchema.parse({ name, grade });
      const { error } = await supabase.from("groups").insert(parsed);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["groups"] });
      toast.success("Grupo creado");
      setOpen(false);
      setName("");
      setGrade("");
    },
    onError: (e) => toast.error(e instanceof z.ZodError ? e.issues[0]?.message ?? "Datos no válidos" : errorMessage(e)),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg">
          <Plus /> Nuevo grupo
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Nuevo grupo</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="g-name">Nombre</Label>
            <Input id="g-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Matemáticas A" autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="g-grade">Semestre o grado</Label>
            <Input id="g-grade" value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="3er semestre" />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={create.isPending}>
              Crear grupo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
