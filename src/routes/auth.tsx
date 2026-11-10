import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import "@lovable.dev/cloud-auth-js/styles.css";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Logo } from "@/components/app/Logo";

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Iniciar sesión — Pase" },
      { name: "description", content: "Accede a tu cuaderno digital de asistencia y participación." },
      { property: "og:title", content: "Iniciar sesión — Pase" },
      { property: "og:description", content: "Accede a tu cuaderno digital de asistencia y participación." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const credsSchema = z.object({
  email: z.string().trim().email("Correo no válido").max(255),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(72),
});

function safeRedirect(r?: string) {
  if (!r) return "/panel";
  try {
    const url = new URL(r, window.location.origin);
    if (url.origin !== window.location.origin) return "/panel";
    const path = url.pathname + url.search;
    return path.startsWith("/auth") ? "/panel" : path;
  } catch {
    return "/panel";
  }
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" />
    </svg>
  );
}

function AuthPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sentConfirm, setSentConfirm] = useState(false);
  const [forgot, setForgot] = useState(false);

  useEffect(() => {
    if (redirect) sessionStorage.setItem("pase:redirect", safeRedirect(redirect));
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) goNext();
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) goNext();
    });
    return () => data.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function goNext() {
    const stored = sessionStorage.getItem("pase:redirect");
    sessionStorage.removeItem("pase:redirect");
    navigate({ to: safeRedirect(stored ?? redirect), replace: true });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = credsSchema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Datos no válidos");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword(parsed.data);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          ...parsed.data,
          options: { emailRedirectTo: window.location.origin + "/auth" },
        });
        if (error) throw error;
        if (!data.session) setSentConfirm(true);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      toast.error(
        msg.includes("Invalid login") ? "Correo o contraseña incorrectos" : msg || "No se pudo continuar",
      );
    } finally {
      setBusy(false);
    }
  }

  async function sendReset(e: React.FormEvent) {
    e.preventDefault();
    const parsed = z.string().trim().email().safeParse(email);
    if (!parsed.success) { toast.error("Escribe un correo válido"); return; }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Te enviamos un enlace para restablecer tu contraseña");
    setForgot(false);
  }

  async function oauth(provider: "google" | "lovable") {
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin + "/auth",
    });
    if (result.error) {
      toast.error("No se pudo iniciar sesión");
      return;
    }
    if (result.redirected) return;
    goNext();
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="chalk-surface hidden flex-col justify-between p-12 lg:flex">
        <Logo tone="chalk" />
        <div>
          <p className="font-display text-4xl leading-tight text-chalk-foreground">
            “Pasar lista ya no debería tomar más tiempo que decir buenos días.”
          </p>
          <p className="mt-6 text-sm text-chalk-foreground/70">
            Asistencia, participación y reportes de tus grupos en un solo cuaderno digital.
          </p>
        </div>
        <p className="text-xs text-chalk-foreground/50">Tus datos se guardan de forma privada.</p>
      </div>

      <div className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>

          {sentConfirm ? (
            <div className="paper-card p-6 text-center">
              <h1 className="text-2xl font-semibold">Revisa tu correo</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Enviamos un enlace de confirmación a <strong>{email}</strong>. Ábrelo para activar tu cuenta.
              </p>
              <Button variant="outline" className="mt-6" onClick={() => setSentConfirm(false)}>
                Volver
              </Button>
            </div>
          ) : forgot ? (
            <form onSubmit={sendReset} className="space-y-4">
              <h1 className="text-3xl font-semibold">Recuperar contraseña</h1>
              <p className="text-sm text-muted-foreground">Te enviaremos un enlace para crear una nueva.</p>
              <div className="space-y-2">
                <Label htmlFor="reset-email">Correo</Label>
                <Input id="reset-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={busy}>
                Enviar enlace
              </Button>
              <Button type="button" variant="link" className="w-full" onClick={() => setForgot(false)}>
                Volver a iniciar sesión
              </Button>
            </form>
          ) : (
            <>
              <h1 className="text-3xl font-semibold">
                {mode === "signin" ? "Bienvenido de vuelta" : "Crea tu cuenta"}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {mode === "signin" ? "Entra para pasar lista y registrar participaciones." : "Una cuenta por docente."}
              </p>

              <div className="mt-6 space-y-2.5">
                <button
                  type="button"
                  onClick={() => oauth("google")}
                  className="flex h-11 w-full items-center justify-center gap-2.5 google-button rounded-lg px-3 text-sm font-medium"
                >
                  <GoogleIcon />
                  Continuar con Google
                </button>
                <button
                  type="button"
                  className="lovable-auth-button w-full"
                  onClick={() => oauth("lovable")}
                >
                  Continue with Lovable
                </button>
              </div>

              <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" /> o con tu correo <span className="h-px flex-1 bg-border" />
              </div>

              <Tabs value={mode} onValueChange={(v) => setMode(v as "signin" | "signup")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Iniciar sesión</TabsTrigger>
                  <TabsTrigger value="signup">Registrarme</TabsTrigger>
                </TabsList>
                <TabsContent value={mode} forceMount>
                  <form onSubmit={submit} className="mt-4 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Correo</Label>
                      <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">Contraseña</Label>
                        {mode === "signin" && (
                          <button type="button" className="text-xs text-primary hover:underline" onClick={() => setForgot(true)}>
                            ¿La olvidaste?
                          </button>
                        )}
                      </div>
                      <Input
                        id="password"
                        type="password"
                        autoComplete={mode === "signin" ? "current-password" : "new-password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                    <Button type="submit" className="w-full" size="lg" disabled={busy}>
                      {mode === "signin" ? "Entrar" : "Crear cuenta"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
