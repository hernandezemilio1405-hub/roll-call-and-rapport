import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  ClipboardCheck,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  Star,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Logo } from "./Logo";

const NAV = [
  { to: "/panel", label: "Inicio", short: "Inicio", icon: LayoutDashboard },
  { to: "/asistencia", label: "Pasar lista", short: "Lista", icon: ClipboardCheck },
  { to: "/participacion", label: "Participación", short: "Puntos", icon: Star },
  { to: "/grupos", label: "Grupos y alumnos", short: "Grupos", icon: Users },
  { to: "/criterios", label: "Criterios", short: "Criterios", icon: ListChecks },
  { to: "/reportes", label: "Estadísticas y reportes", short: "Reportes", icon: BarChart3 },
] as const;

const MOBILE_TABS = NAV.filter((n) => n.to !== "/criterios");

export function AppShell() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background lg:flex">
      {/* Barra lateral (escritorio) */}
      <aside className="chalk-surface sticky top-0 hidden h-screen w-64 shrink-0 flex-col px-4 py-6 lg:flex">
        <Link to="/panel" className="px-3">
          <Logo tone="chalk" />
        </Link>
        <nav className="mt-10 flex flex-col gap-1">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              activeProps={{
                className: "bg-sidebar-primary! text-sidebar-primary-foreground! shadow-sm",
              }}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto px-1">
          <Button variant="chalk" className="w-full justify-start" onClick={signOut}>
            <LogOut /> Cerrar sesión
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra superior (móvil y tableta) */}
        <header className="chalk-surface sticky top-0 z-30 flex h-14 items-center justify-between px-4 lg:hidden">
          <Link to="/panel">
            <Logo tone="chalk" size="sm" />
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="chalk" size="icon" aria-label="Menú">
                <Menu />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem asChild>
                <Link to="/criterios">
                  <ListChecks /> Criterios
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut}>
                <LogOut /> Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:pt-10">
          <Outlet />
        </main>

        {/* Pestañas inferiores (móvil y tableta) */}
        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
          {MOBILE_TABS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground"
              activeProps={{ className: "text-primary!" }}
            >
              <item.icon className="size-5" />
              {item.short}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
