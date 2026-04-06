"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";
  const authError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    authError === "auth_callback_error" ? "Error de autenticación. Inténtalo de nuevo." : null
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        if (authError.message.includes("Invalid login")) {
          setError("Email o contraseña incorrectos");
        } else if (authError.message.includes("Email not confirmed")) {
          setError("Confirma tu email antes de iniciar sesión");
        } else {
          setError(authError.message);
        }
        return;
      }

      if (data.user) {
        // Check if portal user exists
        const { data: portalUser } = await supabase
          .from("portal_usuarios")
          .select("rol_global")
          .eq("auth_user_id", data.user.id)
          .single();

        if (!portalUser) {
          setError("No tienes acceso al portal. Contacta con el administrador.");
          await supabase.auth.signOut();
          return;
        }

        // Update last access
        await supabase
          .from("portal_usuarios")
          .update({ ultimo_acceso: new Date().toISOString() })
          .eq("auth_user_id", data.user.id);

        // Redirect based on role
        if (portalUser.rol_global === "super_admin") {
          router.push("/admin/dashboard");
        } else {
          router.push(redirectTo === "/" ? "/portal/dashboard" : redirectTo);
        }
        router.refresh();
      }
    } catch (err) {
      setError("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Mobile logo */}
      <div className="lg:hidden flex items-center gap-3 mb-8">
        <img src="/logo.png" alt="SCILA AI" className="w-10 h-10" />
        <span className="text-xl font-bold">SCILA AI</span>
      </div>

      <h2 className="text-2xl font-bold mb-2">Iniciar sesión</h2>
      <p className="text-[var(--muted-foreground)] text-sm mb-8">
        Accede a tu panel de control de agentes IA
      </p>

      {error && (
        <div className="flex items-center gap-2 p-3 mb-6 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1.5">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field"
            placeholder="tu@email.com"
            required
            autoComplete="email"
            autoFocus
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium">Contraseña</label>
            <Link
              href="/forgot-password"
              className="text-xs text-brand-purple hover:text-brand-purple-light transition-colors"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field pr-10"
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Entrando...
            </>
          ) : (
            "Iniciar sesión"
          )}
        </button>
      </form>

      <p className="text-center text-sm text-[var(--muted-foreground)] mt-6">
        ¿No tienes cuenta?{" "}
        <Link href="/register" className="text-brand-purple hover:text-brand-purple-light font-medium transition-colors">
          Contacta con el administrador
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="animate-pulse text-center py-12">Cargando...</div>}>
      <LoginForm />
    </Suspense>
  );
}
