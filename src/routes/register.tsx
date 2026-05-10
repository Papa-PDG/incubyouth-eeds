import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, AlertCircle, CheckCircle2, Eye, EyeOff, Mail, Lock, User, Users, MapPin, ArrowRight, Sparkles, Shield, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PublicOnlyRoute } from "@/components/route-guards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import logo from "@/assets/logo-full.png";

const REGIONS = [
  "Dakar", "Saint-Louis", "Thiès", "Diourbel", "Louga", "Fatick",
  "Kaolack", "Kaffrine", "Tambacounda", "Kédougou", "Kolda", "Sédhiou",
  "Ziguinchor", "Matam",
];

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Créer un compte — Incub'Youth" },
      { name: "description", content: "Rejoins la communauté Incub'Youth des EEDS." },
    ],
  }),
  component: () => (
    <PublicOnlyRoute>
      <RegisterPage />
    </PublicOnlyRoute>
  ),
});

function passwordStrength(p: string): { score: number; label: string; color: string } {
  let s = 0;
  if (p.length >= 8) s++;
  if (/[A-Z]/.test(p)) s++;
  if (/[0-9]/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  if (s <= 1) return { score: 1, label: "Faible", color: "bg-red-500" };
  if (s === 2) return { score: 2, label: "Moyen", color: "bg-orange-500" };
  if (s === 3) return { score: 3, label: "Bon", color: "bg-yellow-500" };
  return { score: 4, label: "Fort", color: "bg-green-500" };
}

const inputClass =
  "h-12 rounded-xl border-slate-200 bg-white text-base shadow-sm transition focus-visible:border-[#622599] focus-visible:ring-2 focus-visible:ring-[#622599]/20";

function RegisterPage() {
  const navigate = useNavigate();
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [groupe, setGroupe] = useState("");
  const [region, setRegion] = useState("");
  const [accept, setAccept] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const pwdValid = password.length >= 8;
  const matches = password === confirm && confirm.length > 0;
  const strength = passwordStrength(password);
  const canSubmit =
    prenom && nom && emailValid && pwdValid && matches && accept && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
          data: { prenom, nom, groupe_scout: groupe || null, region: region || null },
        },
      });
      if (error) {
        const m = error.message.toLowerCase();
        if (m.includes("already registered") || m.includes("already been registered")) {
          setError("Un compte existe déjà avec cet email. Connecte-toi.");
        } else if (m.includes("password")) {
          setError("Le mot de passe doit contenir au moins 8 caractères.");
        } else {
          setError("Erreur lors de la création du compte. Réessaie.");
        }
        return;
      }
      // Déconnecte la session auto créée par signUp pour forcer la connexion manuelle
      await supabase.auth.signOut();
      setSuccess(true);
      toast.success("Compte créé ! Connecte-toi pour continuer.");
      setTimeout(() => navigate({ to: "/login" }), 1500);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden bg-slate-50 px-4">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#622599]/20 blur-3xl" />
          <div className="absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-emerald-300/20 blur-3xl" />
        </div>
        <div className="relative w-full max-w-md rounded-3xl border border-white/60 bg-white/80 p-10 text-center shadow-xl backdrop-blur-xl">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg">
            <CheckCircle2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Compte créé !</h1>
          <p className="mt-2 text-sm text-slate-500">
            Vérifie ta boîte mail pour confirmer ton compte avant de te connecter.
          </p>
          <p className="mt-3 text-xs text-slate-400">
            Redirection vers la connexion…
          </p>
          <Link
            to="/login"
            className="mt-6 inline-flex items-center gap-2 font-medium text-[#622599] hover:underline"
          >
            Aller à la connexion <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-slate-50">
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
                Rejoins la communauté
              </div>

              <img src={logo} alt="Incub'Youth" className="h-14 w-auto rounded-xl bg-white/95 p-2 shadow-lg" />

              <div className="space-y-4">
                <h2 className="text-4xl font-bold leading-tight tracking-tight">
                  Démarre ton aventure <br />
                  <span className="bg-gradient-to-r from-amber-200 to-pink-200 bg-clip-text text-transparent">
                    avec Incub'Youth
                  </span>
                </h2>
                <p className="max-w-md text-base text-white/80">
                  Crée ton compte gratuit et accède à un assistant intelligent pensé pour les EEDS du Sénégal.
                </p>
              </div>

              <div className="space-y-3 pt-4">
                {[
                  { icon: Zap, text: "Réponses instantanées 24h/24" },
                  { icon: Sparkles, text: "Préparation de camps assistée" },
                  { icon: Shield, text: "100 % gratuit et sécurisé" },
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
            <div className="mb-7 space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#622599]/10 px-3 py-1 text-xs font-semibold text-[#622599]">
                Inscription
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Créer un compte
              </h1>
              <p className="text-sm text-slate-500">
                Rejoins la communauté des scouts sénégalais en quelques secondes.
              </p>
            </div>

            {error && (
              <div className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="prenom" className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Prénom *
                  </Label>
                  <div className="group relative">
                    <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-[#622599]" />
                    <Input id="prenom" value={prenom} onChange={(e) => setPrenom(e.target.value)} className={`${inputClass} pl-11`} required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nom" className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Nom *
                  </Label>
                  <div className="group relative">
                    <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-[#622599]" />
                    <Input id="nom" value={nom} onChange={(e) => setNom(e.target.value)} className={`${inputClass} pl-11`} required />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Email *
                </Label>
                <div className="group relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-[#622599]" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ton@email.com"
                    className={`${inputClass} pl-11 ${email && !emailValid ? "border-red-400" : ""}`}
                    required
                  />
                </div>
                {email && !emailValid && <p className="text-xs text-red-500">Adresse email invalide</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Mot de passe *
                </Label>
                <div className="group relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-[#622599]" />
                  <Input
                    id="password"
                    type={showPwd ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`${inputClass} pl-11 pr-11 ${password && !pwdValid ? "border-red-400" : ""}`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {password && (
                  <div className="space-y-1 pt-1">
                    <div className="flex h-1.5 gap-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={`h-full flex-1 rounded-full ${i <= strength.score ? strength.color : "bg-slate-200"}`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-slate-500">Force : <span className="font-medium text-slate-700">{strength.label}</span></p>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm" className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Confirmer le mot de passe *
                </Label>
                <div className="group relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-[#622599]" />
                  <Input
                    id="confirm"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    className={`${inputClass} pl-11 ${confirm && !matches ? "border-red-400" : ""}`}
                    required
                  />
                </div>
                {confirm && !matches && (
                  <p className="text-xs text-red-500">Les mots de passe ne correspondent pas</p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="groupe" className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Groupe scout
                  </Label>
                  <div className="group relative">
                    <Users className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-[#622599]" />
                    <Input id="groupe" value={groupe} onChange={(e) => setGroupe(e.target.value)} className={`${inputClass} pl-11`} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="region" className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Région
                  </Label>
                  <div className="group relative">
                    <MapPin className="pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-[#622599]" />
                    <Select value={region} onValueChange={setRegion}>
                      <SelectTrigger id="region" className={`${inputClass} pl-11`}>
                        <SelectValue placeholder="Choisir" />
                      </SelectTrigger>
                      <SelectContent>
                        {REGIONS.map((r) => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
                <Checkbox
                  id="cgu"
                  checked={accept}
                  onCheckedChange={(c) => setAccept(c === true)}
                  className="mt-0.5 data-[state=checked]:border-[#622599] data-[state=checked]:bg-[#622599]"
                />
                <Label htmlFor="cgu" className="text-sm font-normal leading-snug text-slate-600">
                  J'accepte les{" "}
                  <Link to="/conditions-utilisation" className="font-medium text-[#622599] hover:underline">
                    conditions d'utilisation
                  </Link>
                </Label>
              </div>

              <Button
                type="submit"
                disabled={!canSubmit}
                className="group h-12 w-full rounded-xl bg-gradient-to-r from-[#622599] to-[#8b3fc4] text-base font-semibold shadow-lg shadow-[#622599]/30 transition hover:shadow-xl hover:shadow-[#622599]/40 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Création...
                  </>
                ) : (
                  <>
                    Créer mon compte
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              Déjà inscrit ?{" "}
              <Link to="/login" className="font-semibold text-[#622599] hover:underline">
                Se connecter →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
