import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, ArrowRight, Sparkles, Shield, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PublicOnlyRoute } from "@/components/route-guards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logo from "@/assets/logo-full.png";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Connexion — Incub'Youth" },
      { name: "description", content: "Connecte-toi à ton espace Incub'Youth." },
    ],
  }),
  component: () => (
    <PublicOnlyRoute>
      <LoginPage />
    </PublicOnlyRoute>
  ),
});

function LoginPage() {
  const navigate = useNavigate();
  const emailRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordValid = password.length >= 8;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailValid || !passwordValid) return;
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        const m = error.message.toLowerCase();
        if (m.includes("invalid login")) {
          setError("Email ou mot de passe incorrect.");
        } else if (m.includes("email not confirmed")) {
          setError("Confirme ton email avant de te connecter.");
        } else if (m.includes("too many")) {
          setError("Trop de tentatives. Attends quelques minutes.");
        } else {
          setError("Une erreur est survenue. Réessaie.");
        }
        return;
      }
      navigate({ to: "/chat" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-slate-50">
      {/* Decorative gradient blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-gradient-to-br from-[#622599]/30 to-fuchsia-400/20 blur-3xl" />
        <div className="absolute -right-32 top-1/3 h-96 w-96 rounded-full bg-gradient-to-br from-amber-300/20 to-pink-400/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-gradient-to-br from-indigo-400/20 to-[#622599]/30 blur-3xl" />
      </div>

      <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl grid-cols-1 items-center gap-8 px-4 py-10 lg:grid-cols-2 lg:gap-16 lg:px-8">
        {/* Left brand panel */}
        <div className="hidden lg:block">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#4f1d7a] via-[#622599] to-[#8b3fc4] p-10 text-white shadow-2xl">
            <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-20 -left-10 h-72 w-72 rounded-full bg-fuchsia-300/20 blur-3xl" />

            <div className="relative space-y-10">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" />
                Propulsé par l'IA
              </div>

              <div>
                <img src={logo} alt="Incub'Youth" className="h-14 w-auto rounded-xl bg-white/95 p-2 shadow-lg" />
              </div>

              <div className="space-y-4">
                <h2 className="text-4xl font-bold leading-tight tracking-tight">
                  Bienvenue dans <br />
                  <span className="bg-gradient-to-r from-amber-200 to-pink-200 bg-clip-text text-transparent">
                    ton espace scout
                  </span>
                </h2>
                <p className="max-w-md text-base text-white/80">
                  Une assistance intelligente, conçue pour les EEDS du Sénégal.
                </p>
              </div>

              <div className="space-y-3 pt-4">
                {[
                  { icon: Zap, text: "Réponses instantanées 24h/24" },
                  { icon: Sparkles, text: "Réponses adaptées à tes thèmes" },
                  { icon: Shield, text: "Sécurisé et confidentiel" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-3 rounded-xl bg-white/10 p-3 backdrop-blur">
                    <div className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-white/20">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium text-white/95">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right form panel */}
        <div className="mx-auto w-full max-w-md">
          <div className="rounded-3xl border border-white/60 bg-white/80 p-8 shadow-xl backdrop-blur-xl sm:p-10">
            <div className="mb-8 space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#622599]/10 px-3 py-1 text-xs font-semibold text-[#622599]">
                Connexion
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Content de te revoir
              </h1>
              <p className="text-sm text-slate-500">
                Connecte-toi pour accéder à ton assistant Incub'Youth.
              </p>
            </div>

            {error && (
              <div className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Email
                </Label>
                <div className="group relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-[#622599]" />
                  <Input
                    ref={emailRef}
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ton@email.com"
                    className={`h-12 rounded-xl border-slate-200 bg-white pl-11 text-base shadow-sm transition focus-visible:border-[#622599] focus-visible:ring-2 focus-visible:ring-[#622599]/20 ${email && !emailValid ? "border-red-400" : ""}`}
                    required
                  />
                </div>
                {email && !emailValid && (
                  <p className="text-xs text-red-500">Adresse email invalide</p>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Mot de passe
                  </Label>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-medium text-[#622599] hover:underline"
                  >
                    Oublié ?
                  </Link>
                </div>
                <div className="group relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-[#622599]" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`h-12 rounded-xl border-slate-200 bg-white pl-11 pr-11 text-base shadow-sm transition focus-visible:border-[#622599] focus-visible:ring-2 focus-visible:ring-[#622599]/20 ${password && !passwordValid ? "border-red-400" : ""}`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    aria-label="Afficher le mot de passe"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {password && !passwordValid && (
                  <p className="text-xs text-red-500">Minimum 8 caractères</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading || !emailValid || !passwordValid}
                className="group h-12 w-full rounded-xl bg-gradient-to-r from-[#622599] to-[#8b3fc4] text-base font-semibold shadow-lg shadow-[#622599]/30 transition hover:shadow-xl hover:shadow-[#622599]/40 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connexion...
                  </>
                ) : (
                  <>
                    Se connecter
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs uppercase tracking-wide text-slate-400">Nouveau ici ?</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <Link
              to="/register"
              className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:border-[#622599] hover:text-[#622599]"
            >
              Créer un compte gratuit
            </Link>
          </div>

          <p className="mt-6 text-center text-xs text-slate-500">
            En te connectant, tu acceptes nos{" "}
            <Link to="/conditions-utilisation" className="font-medium text-[#622599] hover:underline">
              conditions d'utilisation
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
