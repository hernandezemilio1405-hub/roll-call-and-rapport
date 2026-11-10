import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, ClipboardCheck, FileDown, Star, Upload, Users } from "lucide-react";
import heroImg from "@/assets/hero-notebook.jpg";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/app/Logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pase — Control de asistencia y participación para docentes" },
      {
        name: "description",
        content:
          "Pasa lista en menos de un minuto, asigna puntos de participación y genera reportes PDF de tus grupos.",
      },
      { property: "og:title", content: "Pase — Asistencia y participación para docentes" },
      {
        property: "og:description",
        content: "Pasa lista en menos de un minuto, asigna puntos y genera reportes PDF.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: ClipboardCheck, title: "Lista en segundos", text: "Todos inician como presentes; solo toca a quien faltó o llegó tarde." },
  { icon: Star, title: "Puntos de participación", text: "Define tus criterios y asígnalos con un toque por alumno." },
  { icon: Users, title: "Grupos y alumnos", text: "Organiza por grado o semestre y registra alumnos a mano." },
  { icon: Upload, title: "Importa desde CSV", text: "Sube tu lista de alumnos desde una hoja de cálculo." },
  { icon: BarChart3, title: "Estadísticas claras", text: "Porcentaje de asistencia, faltas, retardos y puntos acumulados." },
  { icon: FileDown, title: "Reportes PDF", text: "Por alumno o por grupo, del periodo que elijas." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <section className="chalk-surface relative overflow-hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <Logo tone="chalk" />
          <Button asChild variant="chalk" size="sm">
            <Link to="/auth">Iniciar sesión</Link>
          </Button>
        </div>
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-8 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:pb-24 lg:pt-14">
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              Cuaderno digital del docente
            </p>
            <h1 className="text-4xl font-semibold leading-[1.05] text-chalk-foreground sm:text-6xl">
              Pasa lista y registra participaciones <span className="italic text-accent">sin perder la clase.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg text-chalk-foreground/75">
              Controla la asistencia de tus grupos en menos de un minuto, asigna puntos según tus propios criterios y genera reportes en PDF.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="highlight" size="xl">
                <Link to="/auth">Comenzar ahora</Link>
              </Button>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-3 rotate-2 rounded-3xl bg-accent/20" aria-hidden />
            <img
              src={heroImg}
              alt="Cuaderno de asistencia abierto sobre un escritorio verde"
              width={1280}
              height={960}
              className="relative rounded-2xl object-cover shadow-lift"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <h2 className="max-w-xl text-3xl font-semibold sm:text-4xl">
          Todo lo que necesitas para el <span className="highlight-mark">día a día</span> en el aula.
        </h2>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="paper-card p-6">
              <div className="grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground">
                <f.icon className="size-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t py-8 text-center text-xs text-muted-foreground">
        Pase · Funciona en celular, tableta y computadora.
      </footer>
    </div>
  );
}
